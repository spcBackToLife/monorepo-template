import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { OperationsService } from './operations.service';
import type { Operation } from '@globallink/design-operations';

@Controller('api/projects/:projectId/operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  /** POST /api/projects/:projectId/operations — 执行单条操作 */
  @Post()
  execute(
    @Param('projectId') projectId: string,
    @Body() body: { operation: Operation; author?: string; fingerprint?: string; authorId?: string },
  ) {
    return this.operations.execute(projectId, body.operation, body.author, body.fingerprint, body.authorId);
  }

  /** POST /api/projects/:projectId/operations/batch — 批量执行 */
  @Post('batch')
  executeBatch(
    @Param('projectId') projectId: string,
    @Body() body: { operations: Operation[]; author?: string; fingerprints?: string[]; authorId?: string },
  ) {
    return this.operations.executeBatch(
      projectId,
      body.operations,
      body.author,
      body.fingerprints,
      body.authorId,
    );
  }

  /** GET /api/projects/:projectId/operations?since=N — 增量拉取 */
  @Get()
  findSince(
    @Param('projectId') projectId: string,
    @Query('since') since?: string,
  ) {
    const sinceSeq = since ? parseInt(since, 10) : 0;
    return this.operations.findSince(projectId, sinceSeq);
  }

  /** POST /api/projects/:projectId/operations/undo — 撤销 */
  @Post('undo')
  undo(
    @Param('projectId') projectId: string,
    @Body() body?: { author?: string },
  ) {
    return this.operations.undo(projectId, body?.author);
  }

  /** POST /api/projects/:projectId/operations/redo — 重做 */
  @Post('redo')
  redo(
    @Param('projectId') projectId: string,
    @Body() body?: { author?: string },
  ) {
    return this.operations.redo(projectId, body?.author);
  }
}
