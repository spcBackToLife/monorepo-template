/**
 * MaterialEditorSyncManager — 素材编辑器实时同步管理器（v2 操作系统）
 *
 * 连接 design-api 的 `/ws/material-editor` 命名空间，
 * 接收来自 MCP 或其他客户端的类型化 MaterialOperation，
 * 在本地 Context 中执行操作触发 SVG 重渲染。
 *
 * v2 数据流：
 *   MCP/其他客户端 → REST/WS → MaterialEditorService.execute()
 *                  → WS 广播 me:operation
 *                  → 本 SyncManager 接收
 *                  → Context.dispatch(operation) 更新 Schema
 *                  → MaterialRenderer 自动重渲染 SVG
 */
import { io, type Socket } from 'socket.io-client';
import type { MaterialOperation } from '@globallink/material-operations';

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'http://127.0.0.1:3001';

/**
 * v2 操作信封 — WS 消息格式
 */
export interface MaterialOperationEnvelope {
  fingerprint: string;
  projectId: string;
  materialId: string;
  operation: MaterialOperation;
  seq: number;
  author: string;
  timestamp: string;
}

/**
 * v2 undo 事件
 */
export interface MaterialUndoEvent {
  projectId: string;
  materialId: string;
  seq: number;
  undoneSeq: number;
  timestamp: string;
}

type OperationHandler = (envelope: MaterialOperationEnvelope) => void;
type UndoHandler = (event: MaterialUndoEvent) => void;

export class MaterialEditorSyncManager {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private materialId: string | null = null;
  private connected = false;

  /** 最后收到的操作序列号（用于断线重连增量重放） */
  private lastSeq = 0;

  /** 外部操作处理回调 */
  private operationHandlers = new Set<OperationHandler>();
  private undoHandlers = new Set<UndoHandler>();

  /** 自己发出的操作指纹集合（用于 echo dedup） */
  private outgoingFingerprints = new Set<string>();

  // ===================================================================
  // 公开 API
  // ===================================================================

  /** 连接到素材编辑器 WebSocket 流 */
  connect(projectId: string, materialId?: string): void {
    this.disconnect();
    this.projectId = projectId;
    this.materialId = materialId ?? null;
    this.lastSeq = 0;
    this.openSocket();
  }

  /** 注册操作接收回调 */
  onOperation(handler: OperationHandler): () => void {
    this.operationHandlers.add(handler);
    return () => this.operationHandlers.delete(handler);
  }

  /** 注册 undo/redo 事件回调 */
  onUndo(handler: UndoHandler): () => void {
    this.undoHandlers.add(handler);
    return () => this.undoHandlers.delete(handler);
  }

  /**
   * 通过 WS 发送操作到后端执行
   *
   * v2 流程：前端操作也经后端 Executor 执行+持久化+广播，
   * 保证单一数据真相来源。
   */
  sendOperation(
    operation: MaterialOperation,
    fingerprint?: string,
  ): void {
    if (!this.socket?.connected || !this.materialId) return;
    const fp = fingerprint ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.markOutgoing(fp);
    this.socket.emit('me:operation', {
      materialId: this.materialId,
      operation,
      fingerprint: fp,
    });
  }

  /**
   * 通过 WS 批量发送操作
   */
  sendBatch(
    operations: MaterialOperation[],
    fingerprints?: string[],
  ): void {
    if (!this.socket?.connected || !this.materialId) return;
    const fps = operations.map((_, i) => {
      const fp = fingerprints?.[i] ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.markOutgoing(fp);
      return fp;
    });
    this.socket.emit('me:batch', {
      materialId: this.materialId,
      operations,
      fingerprints: fps,
    });
  }

  /**
   * 标记即将发出的操作指纹（echo dedup）
   */
  markOutgoing(fingerprint: string): void {
    this.outgoingFingerprints.add(fingerprint);
    setTimeout(() => this.outgoingFingerprints.delete(fingerprint), 30000);
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get currentMaterialId(): string | null {
    return this.materialId;
  }

  /** 断开连接并清理 */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
    this.materialId = null;
    this.connected = false;
    this.lastSeq = 0;
    this.outgoingFingerprints.clear();
  }

  // ===================================================================
  // 私有方法
  // ===================================================================

  private openSocket(): void {
    if (!this.projectId) return;

    this.socket = io(`${WS_BASE}/ws/material-editor`, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[MaterialEditorSync] Connected (v2 operations)');

      // 订阅素材编辑器操作流
      this.socket?.emit('me:subscribe', {
        projectId: this.projectId,
        materialId: this.materialId,
      });

      // 断线重连：请求增量重放
      if (this.lastSeq > 0) {
        console.log(`[MaterialEditorSync] Handshake: replaying from seq > ${this.lastSeq}`);
        this.socket?.emit('me:handshake', { lastSeq: this.lastSeq });
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[MaterialEditorSync] Disconnected');
    });

    // v2 操作事件
    this.socket.on('me:operation', (envelope: MaterialOperationEnvelope) => {
      this.handleOperation(envelope);
    });

    // v2 undo/redo 事件
    this.socket.on('me:undo', (event: MaterialUndoEvent) => {
      this.lastSeq = Math.max(this.lastSeq, event.seq);
      this.undoHandlers.forEach((h) => h(event));
    });

    this.socket.on('connect_error', (err: Error) => {
      console.warn('[MaterialEditorSync] Connection error:', err.message);
    });
  }

  private handleOperation(envelope: MaterialOperationEnvelope): void {
    if (!envelope?.operation) return;

    // Echo dedup — 跳过自己发出的操作
    if (
      envelope.fingerprint &&
      this.outgoingFingerprints.has(envelope.fingerprint)
    ) {
      this.outgoingFingerprints.delete(envelope.fingerprint);
      // 仍然更新 lastSeq
      this.lastSeq = Math.max(this.lastSeq, envelope.seq);
      return;
    }

    // 更新序列号
    this.lastSeq = Math.max(this.lastSeq, envelope.seq);

    // 通知外部处理器（Context.dispatch 将在此处执行）
    this.operationHandlers.forEach((h) => h(envelope));
  }
}

/** 全局单例 */
export const materialEditorSync = new MaterialEditorSyncManager();
