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
import type { Operation } from '@globallink/design-operations';
import { OperationsService } from './operations.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class OperationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OperationsGateway.name);

  @WebSocketServer()
  server: Server;

  /** Track which projectId each socket is subscribed to */
  private subscriptions = new Map<string, string>(); // socketId → projectId

  /** Lazy-injected to break circular dependency with OperationsService */
  @Inject(forwardRef(() => OperationsService))
  private readonly operationsService: OperationsService;

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.subscriptions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Client subscribes to a project's operation stream */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const { projectId } = data;
    // Leave any previous project room
    const prev = this.subscriptions.get(client.id);
    if (prev) {
      void client.leave(`project:${prev}`);
    }
    // Join new project room
    void client.join(`project:${projectId}`);
    this.subscriptions.set(client.id, projectId);
    this.logger.log(`Client ${client.id} subscribed to project ${projectId}`);
    return { status: 'ok', projectId };
  }

  /** Client unsubscribes from a project */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    const projectId = this.subscriptions.get(client.id);
    if (projectId) {
      void client.leave(`project:${projectId}`);
      this.subscriptions.delete(client.id);
    }
    return { status: 'ok' };
  }

  /** Client sends handshake with lastSeq for reconnection replay */
  @SubscribeMessage('handshake')
  async handleHandshake(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lastSeq: number },
  ) {
    const projectId = this.subscriptions.get(client.id);
    if (!projectId) {
      return { status: 'error', message: 'Not subscribed to any project' };
    }

    const lastSeq = data.lastSeq ?? 0;
    this.logger.log(
      `Client ${client.id} handshake: replaying from seq > ${lastSeq} for project ${projectId}`,
    );

    try {
      const missedOps = await this.operationsService.findSince(
        projectId,
        lastSeq,
      );

      for (const row of missedOps) {
        client.emit('operation', {
          id: row.id,
          fingerprint: row.fingerprint ?? '',
          projectId,
          operation: row.operation,
          seq: row.seq,
          author: row.author ?? 'user',
          authorId: row.author_id ?? undefined,
          timestamp: row.created_at.toISOString(),
        });
      }

      return { status: 'ok', replayed: missedOps.length };
    } catch (err) {
      this.logger.error(`Handshake replay failed: ${err}`);
      return { status: 'error', message: 'Replay failed' };
    }
  }

  /**
   * Broadcast an operation envelope to all clients subscribed to a project.
   * Called by OperationsService after successful execution.
   */
  broadcast(
    projectId: string,
    operation: Operation,
    seq: number,
    author?: string,
    fingerprint?: string,
  ) {
    this.server.to(`project:${projectId}`).emit('operation', {
      id: '', // Server-side ID not needed for broadcast
      fingerprint: fingerprint ?? '',
      projectId,
      operation,
      seq,
      author: author ?? 'user',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast an undo event to all clients subscribed to a project.
   */
  broadcastUndo(projectId: string, seq: number, undoneSeq: number) {
    this.server.to(`project:${projectId}`).emit('undo', {
      projectId,
      seq,
      undoneSeq,
      timestamp: new Date().toISOString(),
    });
  }
}
