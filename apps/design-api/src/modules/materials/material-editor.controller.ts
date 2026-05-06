import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MaterialEditorService } from './material-editor.service';

/**
 * 素材编辑器 API
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
 */
@Controller()
export class MaterialEditorController {
  constructor(private readonly service: MaterialEditorService) {}

  // ===================================================================
  // 操作系统端点（与 OperationsController 同构）
  // ===================================================================

  /**
   * 执行单条素材操作
   *
   * 兼容两种 body 形状：
   *   1. 标准：{ operation: { type, params }, author?, fingerprint?, authorId? }
   *   2. 简写：{ type, params, author?, fingerprint?, authorId? }（脚本/MCP 易写错时容错）
   *
   * 注意：本控制器仅做"形状归一"，不做类型校验。
   * 候选 operation 以 unknown 传入 service，由 service 用 isMaterialOperationLike 守卫
   * 做结构性校验，再交给 Executor 做联合成员的语义校验。
   */
  @Post('api/projects/:projectId/materials/:materialId/operations')
  async execute(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body: {
      operation?: unknown;
      author?: string;
      fingerprint?: string;
      authorId?: string;
      // 简写形式的可能字段（不强约束，由 service 守卫识别）
      type?: unknown;
      params?: unknown;
    },
  ) {
    // 标准形状优先；简写形状回退：把顶层 { type, params } 当作 operation
    const candidate: unknown =
      body.operation ??
      (typeof body.type === 'string' ? { type: body.type, params: body.params } : undefined);

    return this.service.execute(
      projectId,
      materialId,
      candidate,
      body.author,
      body.fingerprint,
      body.authorId,
    );
  }

  /**
   * 批量执行操作（事务）
   *
   * operations 以 unknown[] 接收，由 service 守卫做结构性校验。
   */
  @Post('api/projects/:projectId/materials/:materialId/operations/batch')
  async executeBatch(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() body: {
      operations: unknown[];
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

  /**
   * 将「组件默认框」持久化为与 referenceFrame 对齐（写入一条 me:updateObject）。
   * 用于修复历史坏数据；读路径已在 rebuildSchema 中 reconcile，本接口把对齐写入操作日志。
   */
  @Post('api/projects/:projectId/materials/:materialId/schema/repair-default-frame')
  async repairDefaultFrame(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.service.repairDefaultElementFrame(projectId, materialId);
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
