import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MaterialEditorService } from './material-editor.service';
import type { MaterialOperation } from '@globallink/material-operations';

/**
 * 素材编辑器 API — v2 操作系统
 *
 * 与 OperationsController（设计编辑器）完全同构。
 *
 * 路由设计：
 *   POST /api/projects/:projectId/materials/:materialId/operations        单条操作
 *   POST /api/projects/:projectId/materials/:materialId/operations/batch  批量操作
 *   GET  /api/projects/:projectId/materials/:materialId/operations        增量拉取
 *   POST /api/projects/:projectId/materials/:materialId/operations/undo   撤销
 *   POST /api/projects/:projectId/materials/:materialId/operations/redo   重做
 *   GET  /api/projects/:projectId/materials/:materialId/schema            完整 Schema
 *
 *   GET  /api/material-editor/presets                                     预设查询
 *   GET  /api/material-editor/capabilities                                能力清单
 *
 * 旧端点（兼容期间保留，逐步废弃）：
 *   POST /api/projects/:projectId/material-editor/:action                 旧 action 广播
 *   GET  /api/projects/:projectId/material-editor/project                 旧工程数据
 */
@Controller()
export class MaterialEditorController {
  constructor(private readonly service: MaterialEditorService) {}

  // ===================================================================
  // v2 操作系统端点（与 OperationsController 同构）
  // ===================================================================

  /**
   * 执行单条素材操作
   */
  @Post('api/projects/:projectId/materials/:materialId/operations')
  async execute(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body: {
      operation: MaterialOperation;
      author?: string;
      fingerprint?: string;
      authorId?: string;
    },
  ) {
    return this.service.execute(
      projectId,
      materialId,
      body.operation,
      body.author,
      body.fingerprint,
      body.authorId,
    );
  }

  /**
   * 批量执行操作（事务）
   */
  @Post('api/projects/:projectId/materials/:materialId/operations/batch')
  async executeBatch(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body: {
      operations: MaterialOperation[];
      author?: string;
      fingerprints?: string[];
      authorId?: string;
    },
  ) {
    return this.service.executeBatch(
      projectId,
      materialId,
      body.operations,
      body.author,
      body.fingerprints,
      body.authorId,
    );
  }

  /**
   * 增量拉取操作日志（断线重连用）
   */
  @Get('api/projects/:projectId/materials/:materialId/operations')
  async findSince(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Query('since') since?: string,
  ) {
    const sinceSeq = since ? parseInt(since, 10) : 0;
    return this.service.findSince(projectId, materialId, sinceSeq);
  }

  /**
   * 撤销最后一条操作
   */
  @Post('api/projects/:projectId/materials/:materialId/operations/undo')
  async undo(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body?: { author?: string },
  ) {
    return this.service.undo(projectId, materialId, body?.author);
  }

  /**
   * 重做
   */
  @Post('api/projects/:projectId/materials/:materialId/operations/redo')
  async redo(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body?: { author?: string },
  ) {
    return this.service.redo(projectId, materialId, body?.author);
  }

  /**
   * 获取完整 Schema
   */
  @Get('api/projects/:projectId/materials/:materialId/schema')
  async getSchema(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.service.getSchema(projectId, materialId);
  }

  // ===================================================================
  // 预设与能力清单（只读，无需 materialId）
  // ===================================================================

  @Get('api/material-editor/presets')
  getPresets(@Query('type') type?: string) {
    return this.service.getPresets(type);
  }

  @Get('api/material-editor/capabilities')
  getCapabilities() {
    return this.service.getCapabilities();
  }
}
