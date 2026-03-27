import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { Operation } from '@globallink/design-operations';

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

  /**
   * Broadcast an operation to all clients subscribed to a project.
   * Called by OperationsService after successful execution.
   */
  broadcast(
    projectId: string,
    operation: Operation,
    seq: number,
    author?: string,
  ) {
    this.server.to(`project:${projectId}`).emit('operation', {
      projectId,
      operation,
      seq,
      author,
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
