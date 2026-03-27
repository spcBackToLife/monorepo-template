import type { Operation } from '@globallink/design-operations';
import { io, type Socket } from 'socket.io-client';

export type WsMessageHandler = (op: Operation) => void;

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'http://127.0.0.1:3002';

type OperationEventPayload = {
  projectId: string;
  operation: Operation;
  seq: number;
  author?: string;
  timestamp: string;
};

/** Reconnecting Socket.IO wrapper for operation sync */
export class WsService {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private handlers: Set<WsMessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;

  /** Connect to a project's operation stream */
  connect(projectId: string): void {
    this.disconnect();
    this.projectId = projectId;
    this.open();
  }

  /** Subscribe to incoming operations */
  onOperation(handler: WsMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Disconnect and clean up */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
  }

  get connected(): boolean {
    return Boolean(this.socket?.connected);
  }

  private open(): void {
    if (!this.projectId) return;

    this.socket = io(`${WS_BASE}/ws`, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: false,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('subscribe', { projectId: this.projectId });
    });

    this.socket.on('operation', (payload: OperationEventPayload) => {
      if (!payload?.operation) return;
      this.handlers.forEach((h) => h(payload.operation));
    });

    this.socket.on('disconnect', () => {
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', () => {
      this.socket?.disconnect();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (!this.projectId) return;
    this.reconnectTimer = setTimeout(() => {
      this.open();
    }, this.reconnectDelay);
  }
}

export const wsService = new WsService();
