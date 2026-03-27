import type { Operation } from '@globallink/design-operations';

export type WsMessageHandler = (op: Operation) => void;

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://127.0.0.1:3001';

/** Reconnecting WebSocket wrapper for operation sync */
export class WsService {
  private ws: WebSocket | null = null;
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
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.projectId = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    if (!this.projectId) return;
    const url = `${WS_BASE}/operations?projectId=${this.projectId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const op = JSON.parse(event.data as string) as Operation;
        this.handlers.forEach((h) => h(op));
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (!this.projectId) return;
    this.reconnectTimer = setTimeout(() => {
      this.open();
    }, this.reconnectDelay);
  }
}

export const wsService = new WsService();
