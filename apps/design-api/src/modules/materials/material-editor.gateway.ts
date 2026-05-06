import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { MaterialOperation } from '@globallink/material-operations';
import { MaterialEditorService } from './material-editor.service';

/**
 * 素材操作广播 envelope — WS 消息格式
 *
 * 前端收到后，用 MaterialOperationExecutor 重放操作更新本地 Schema，
 * 然后由 MaterialRenderer 重新渲染 SVG。
 */
export interface MaterialOperationEnvelope {
  /** 指纹（由发送端生成，用于 echo dedup） */
  fingerprint: string;
  /** 项目 ID */
  projectId: string;
  /** 素材工程 ID */
  materialId: string;
  /** 类型化操作对象 */
  operation: MaterialOperation;
  /** 操作序列号 */
  seq: number;
  /** 操作来源 */
  author: string;
  /** 时间戳 */
  timestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/material-editor',
})
export class MaterialEditorGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MaterialEditorGateway.name);

  @WebSocketServer()
  server: Server;

  /** Lazy-injected to break circular dependency with MaterialEditorService */
  @Inject(forwardRef(() => MaterialEditorService))
  private readonly editorService: MaterialEditorService;

  /** socketId → { projectId, materialId? } */
  private subscriptions = new Map<
    string,
    { projectId: string; materialId?: string }
  >();

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Material editor client connected: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.subscriptions.delete(client.id);
    this.logger.log(`Material editor client disconnected: ${client.id}`);
  }

  // ===================================================================
  // 客户端订阅/取消订阅
  // ===================================================================

  /**
   * 客户端订阅素材编辑器操作流
   *
   * 前端打开素材编辑器时调用：
   * socket.emit('me:subscribe', { projectId, materialId })
   */
  @SubscribeMessage('me:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; materialId?: string },
  ) {
    const { projectId, materialId } = data;

    // 离开之前的房间
    const prev = this.subscriptions.get(client.id);
    if (prev) {
      void client.leave(this.getRoomKey(prev.projectId, prev.materialId));
    }

    // 加入新房间
    const room = this.getRoomKey(projectId, materialId);
    void client.join(room);
    this.subscriptions.set(client.id, { projectId, materialId });

    this.logger.log(
      `Client ${client.id} subscribed to material editor: project=${projectId}, material=${materialId ?? 'all'}`,
    );

    return { status: 'ok', projectId, materialId };
  }

  /**
   * 客户端取消订阅
   */
  @SubscribeMessage('me:unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    const sub = this.subscriptions.get(client.id);
    if (sub) {
      void client.leave(this.getRoomKey(sub.projectId, sub.materialId));
      this.subscriptions.delete(client.id);
    }
    return { status: 'ok' };
  }

  // ===================================================================
  // 操作执行（前端 WS 操作也经后端 Executor 执行）
  // ===================================================================

  /**
   * 客户端通过 WS 发送素材操作
   *
   * 前端操作也经后端 Executor 执行+持久化+广播，
   * 与 MCP 的 REST 路径完全一致，保证单一数据真相来源。
   */
  @SubscribeMessage('me:operation')
  async handleOperation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      materialId: string;
      operation: unknown;
      fingerprint?: string;
    },
  ) {
    const sub = this.subscriptions.get(client.id);
    if (!sub) {
      return { status: 'error', message: 'Not subscribed' };
    }

    const materialId = data.materialId || sub.materialId;
    if (!materialId) {
      return { status: 'error', message: 'materialId is required' };
    }

    // operation 结构性校验由 service 守卫统一处理（避免重复实现）；
    // 这里只透传 unknown，service 内会抛 BadRequestException 由下面的 catch 接住。

    try {
      const { seq, result } = await this.editorService.execute(
        sub.projectId,
        materialId,
        data.operation,
        'user',
        data.fingerprint,
      );

      return { status: 'ok', seq, result };
    } catch (err) {
      this.logger.warn(`WS operation failed: ${err}`);
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 客户端批量操作
   */
  @SubscribeMessage('me:batch')
  async handleBatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      materialId: string;
      operations: unknown[];
      fingerprints?: string[];
    },
  ) {
    const sub = this.subscriptions.get(client.id);
    if (!sub) {
      return { status: 'error', message: 'Not subscribed' };
    }

    const materialId = data.materialId || sub.materialId;
    if (!materialId) {
      return { status: 'error', message: 'materialId is required' };
    }

    if (!Array.isArray(data.operations) || data.operations.length === 0) {
      return { status: 'error', message: 'operations 必须为非空数组' };
    }
    // 单项结构性校验由 service 守卫统一处理（避免重复实现）

    try {
      const result = await this.editorService.executeBatch(
        sub.projectId,
        materialId,
        data.operations,
        'user',
        data.fingerprints,
      );

      return { status: 'ok', ...result };
    } catch (err) {
      this.logger.warn(`WS batch failed: ${err}`);
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ===================================================================
  // 断线重连重放（与 design-api OperationsGateway.handleHandshake 同构）
  // ===================================================================

  /**
   * 客户端断线重连后，发送 lastSeq 获取遗漏的操作
   */
  @SubscribeMessage('me:handshake')
  async handleHandshake(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lastSeq: number },
  ) {
    const sub = this.subscriptions.get(client.id);
    if (!sub) {
      return { status: 'error', message: 'Not subscribed' };
    }

    if (!sub.materialId) {
      return { status: 'error', message: 'materialId is required for handshake' };
    }

    const lastSeq = data.lastSeq ?? 0;
    this.logger.log(
      `Client ${client.id} handshake: replaying from seq > ${lastSeq} for material ${sub.materialId}`,
    );

    try {
      const missedOps = await this.editorService.findSince(
        sub.projectId,
        sub.materialId,
        lastSeq,
      );

      for (const row of missedOps) {
        client.emit('me:operation', {
          fingerprint: row.fingerprint ?? '',
          projectId: sub.projectId,
          materialId: sub.materialId,
          operation: row.operation,
          seq: row.seq,
          author: row.author ?? 'user',
          timestamp: row.created_at.toISOString(),
        } satisfies MaterialOperationEnvelope);
      }

      return { status: 'ok', replayed: missedOps.length };
    } catch (err) {
      this.logger.error(`Handshake replay failed: ${err}`);
      return { status: 'error', message: 'Replay failed' };
    }
  }

  // ===================================================================
  // 服务端广播方法（由 MaterialEditorService 调用）
  // ===================================================================

  /**
   * 广播操作到所有订阅的前端客户端
   *
   * 与 OperationsGateway.broadcast() 同构。
   */
  broadcastOperation(
    projectId: string,
    materialId: string,
    operation: MaterialOperation,
    seq: number,
    author?: string,
    fingerprint?: string,
  ) {
    const envelope: MaterialOperationEnvelope = {
      fingerprint: fingerprint ?? '',
      projectId,
      materialId,
      operation,
      seq,
      author: author ?? 'user',
      timestamp: new Date().toISOString(),
    };

    // 广播到素材级房间
    const room = this.getRoomKey(projectId, materialId);
    this.server.to(room).emit('me:operation', envelope);

    // 也广播到项目级房间
    const projectRoom = this.getRoomKey(projectId);
    if (room !== projectRoom) {
      this.server.to(projectRoom).emit('me:operation', envelope);
    }

    this.logger.debug(
      `Broadcasted me:operation ${operation.type} to room ${room} (seq=${seq})`,
    );
  }

  /**
   * 广播 undo 事件
   */
  broadcastUndo(
    projectId: string,
    materialId: string,
    seq: number,
    undoneSeq: number,
  ) {
    const room = this.getRoomKey(projectId, materialId);
    this.server.to(room).emit('me:undo', {
      projectId,
      materialId,
      seq,
      undoneSeq,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取当前在线的素材编辑器客户端数
   */
  getActiveEditors(projectId: string): number {
    let count = 0;
    for (const [, sub] of this.subscriptions) {
      if (sub.projectId === projectId) count++;
    }
    return count;
  }

  private getRoomKey(projectId: string, materialId?: string): string {
    return materialId
      ? `me:${projectId}:${materialId}`
      : `me:${projectId}`;
  }
}
