import type { Operation } from '@globallink/design-operations';
import { io, type Socket } from 'socket.io-client';
import { EchoDeduplicator } from './EchoDeduplicator';
import { SaveStatusTracker } from './SaveStatusTracker';
import { offlineStore } from './OfflineStore';

/**
 * Synthetic undo operation dispatched when the server broadcasts an undo event.
 * This is NOT a real design-operations Operation — it is a SyncManager-internal
 * envelope used only to notify handlers about remote undo events.
 */
export interface UndoSyntheticOperation {
  type: 'undo';
  params: { undoneSeq: number };
}

export type OperationEnvelopePayload = {
  id: string;
  fingerprint: string;
  projectId: string;
  operation: Operation | UndoSyntheticOperation;
  seq: number;
  author: string;
  authorId?: string;
  timestamp: string;
};

/** Raw row shape returned by the HTTP polling endpoint */
interface OperationPollRow {
  id: string;
  project_id: string;
  seq: number;
  operation: Operation;
  fingerprint: string | null;
  author: string | null;
  author_id: string | null;
  created_at: string;
}

export type IncomingHandler = (envelope: OperationEnvelopePayload) => void;

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'http://127.0.0.1:3001';

/** Max reconnection attempts before falling back to HTTP polling */
const MAX_WS_RETRIES = 5;
/** Backoff delays: 1s → 2s → 4s → 8s → 16s */
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];
/** HTTP polling interval when WS is unavailable */
const POLL_INTERVAL = 5000;

let _fingerprintCounter = 0;

/** Generate a unique fingerprint for outgoing operations */
function generateFingerprint(): string {
  _fingerprintCounter += 1;
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${_fingerprintCounter}`;
}

/**
 * SyncManager — orchestrates WebSocket connection, echo deduplication,
 * reconnection with exponential backoff, and HTTP polling fallback.
 */
export class SyncManager {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private handlers = new Set<IncomingHandler>();
  private deduplicator = new EchoDeduplicator();
  saveStatus = new SaveStatusTracker();

  /** Last known server sequence number */
  private lastSeq = 0;
  /** Current reconnection attempt count */
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** HTTP polling timer (fallback) */
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private apiBase: string;

  constructor(apiBase?: string) {
    this.apiBase = apiBase ?? (import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:3001/api');
  }

  // ------- Public API -------

  /** Connect to a project's operation stream */
  connect(projectId: string): void {
    this.disconnect();
    this.projectId = projectId;
    this.lastSeq = 0;
    this.retryCount = 0;
    void offlineStore.init();
    this.openSocket();
  }

  /** Subscribe to incoming operation envelopes */
  onEnvelope(handler: IncomingHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Wrap an outgoing operation in an envelope and mark for deduplication.
   * Returns the generated fingerprint so the caller can include it in the
   * HTTP persist request.
   */
  wrapOutgoing(_operation: Operation): { fingerprint: string } {
    const fingerprint = generateFingerprint();
    this.deduplicator.markOutgoing(fingerprint);
    if (!this.connected && this.projectId) {
      void offlineStore.queueOperation(this.projectId, _operation, fingerprint);
    }
    return { fingerprint };
  }

  /** Update lastSeq (called after receiving confirmed seq from server) */
  ackSeq(seq: number): void {
    if (seq > this.lastSeq) {
      this.lastSeq = seq;
    }
  }

  get connected(): boolean {
    return Boolean(this.socket?.connected);
  }

  get currentLastSeq(): number {
    return this.lastSeq;
  }

  /** Disconnect and clean up everything */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopPolling();
    this.deduplicator.clear();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
  }

  // ------- Socket lifecycle -------

  private openSocket(): void {
    if (!this.projectId) return;

    this.socket = io(`${WS_BASE}/ws`, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: false,
    });

    this.socket.on('connect', () => {
      this.retryCount = 0;
      this.stopPolling();
      this.saveStatus.markSaved();

      this.socket?.emit('subscribe', { projectId: this.projectId });

      if (this.lastSeq > 0) {
        this.socket?.emit('handshake', { lastSeq: this.lastSeq });
      }

      void this.flushOfflineQueue();
    });

    this.socket.on('operation', (payload: OperationEnvelopePayload) => {
      if (!payload?.operation) return;

      // Track seq
      if (payload.seq != null) {
        this.ackSeq(payload.seq);
      }

      // Echo deduplication
      if (payload.fingerprint && !this.deduplicator.shouldApplyIncoming(payload.fingerprint)) {
        return; // Our own echo, skip
      }

      // Dispatch to handlers
      this.handlers.forEach((h) => h(payload));
    });

    this.socket.on('undo', (payload: { projectId: string; seq: number; undoneSeq: number; timestamp: string }) => {
      if (payload.seq != null) {
        this.ackSeq(payload.seq);
      }
      // Undo is not a real Operation from design-operations; we create a
      // synthetic envelope so downstream handlers can react to remote undos.
      const undoOp: UndoSyntheticOperation = {
        type: 'undo',
        params: { undoneSeq: payload.undoneSeq },
      };
      this.handlers.forEach((h) =>
        h({
          id: `undo-${payload.seq}`,
          fingerprint: '',
          projectId: payload.projectId,
          operation: undoOp,
          seq: payload.seq,
          author: 'remote',
          timestamp: payload.timestamp,
        }),
      );
    });

    this.socket.on('disconnect', () => {
      this.saveStatus.markOffline();
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', () => {
      this.socket?.disconnect();
      this.saveStatus.markOffline();
      this.scheduleReconnect();
    });
  }

  // ------- Offline queue flush -------

  private async flushOfflineQueue(): Promise<void> {
    if (!this.projectId) return;
    const queued = await offlineStore.getPendingOperations(this.projectId);
    if (queued.length === 0) return;

    for (const entry of queued) {
      try {
        const url = `${this.apiBase}/projects/${entry.projectId}/operations`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: entry.operation,
            fingerprint: entry.fingerprint,
            author: 'user',
          }),
        });
        if (resp.ok) {
          await offlineStore.removePendingOperation(entry.id);
        }
      } catch {
        break;
      }
    }
  }

  // ------- Reconnection with exponential backoff -------

  private scheduleReconnect(): void {
    if (!this.projectId) return;
    this.clearReconnectTimer();

    if (this.retryCount >= MAX_WS_RETRIES) {
      // Fall back to HTTP polling
      this.startPolling();
      return;
    }

    const delay = BACKOFF_DELAYS[Math.min(this.retryCount, BACKOFF_DELAYS.length - 1)]!;
    this.retryCount += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ------- HTTP polling fallback -------

  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      void this.pollOperations();
    }, POLL_INTERVAL);
    // Also poll immediately
    void this.pollOperations();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollOperations(): Promise<void> {
    if (!this.projectId) return;
    try {
      const url = `${this.apiBase}/projects/${this.projectId}/operations?since=${this.lastSeq}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const rows: OperationPollRow[] = await resp.json();

      for (const row of rows) {
        const envelope: OperationEnvelopePayload = {
          id: row.id,
          fingerprint: row.fingerprint ?? '',
          projectId: row.project_id,
          operation: row.operation,
          seq: row.seq,
          author: row.author ?? 'user',
          authorId: row.author_id ?? undefined,
          timestamp: row.created_at,
        };

        if (row.seq > this.lastSeq) {
          this.lastSeq = row.seq;
        }

        if (envelope.fingerprint && !this.deduplicator.shouldApplyIncoming(envelope.fingerprint)) {
          continue;
        }

        this.handlers.forEach((h) => h(envelope));
      }

      // If polling succeeds, attempt to reconnect WS
      this.retryCount = 0;
      this.stopPolling();
      this.openSocket();
    } catch {
      // Polling failed, will retry on next interval
    }
  }
}

export const syncManager = new SyncManager();
