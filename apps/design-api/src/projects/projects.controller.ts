import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  validateThemeConfig,
  type ThemeOp,
} from '@globallink/design-schema';
import {
  // ★ EXPR-C-3 R-EXPR-01：integrity 在原 design-schema 校验之上叠加表达式 lint
  checkProjectIntegrityWithLint as checkProjectIntegrity,
  checkScreenIntegrityWithLint as checkScreenIntegrity,
} from '@globallink/design-expression';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get()
  findAll() {
    return this.projects.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  /** 导出完整 DesignProject JSON（含所有 Screen 完整 schema），供 codegen CLI 使用 */
  @Get(':id/export')
  export(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }

  // ===== Theme API =====

  /** GET /api/projects/:id/theme — 获取项目主题配置 */
  @Get(':id/theme')
  getTheme(@Param('id') id: string) {
    return this.projects.getTheme(id);
  }

  /** PUT /api/projects/:id/theme — 全量替换主题配置（仅迁移脚本/导入场景用）*/
  @Put(':id/theme')
  updateTheme(
    @Param('id') id: string,
    @Body() body: { themeConfig: unknown },
  ) {
    return this.projects.updateTheme(id, body.themeConfig);
  }

  /**
   * POST /api/projects/:id/theme/op — 应用单个主题操作（推荐前端使用）
   *
   * 与 MCP theme/* 工具调用同源（共用 schema 包的 applyThemeOp reducer），
   * 保证"无论从哪个入口改主题，最终落库结构一致"。
   */
  @Post(':id/theme/op')
  async applyThemeOp(
    @Param('id') id: string,
    @Body() body: { op: ThemeOp },
  ) {
    return this.projects.applyThemeOp(id, body.op);
  }

  /** POST /api/projects/:id/theme/validate — 跑 R-THEME-01~10 红线 */
  @Post(':id/theme/validate')
  async validateTheme(@Param('id') id: string) {
    const cfg = await this.projects.getTheme(id);
    return validateThemeConfig(cfg as never);
  }

  // ===== Integrity API (Schema-First 完成度对账) =====

  /**
   * GET /api/projects/:id/integrity
   * 校验项目设计完成度（events 覆盖、status 一致性、阶段一致性等）。
   * ?screenId=xxx 可指定单屏。
   */
  @Get(':id/integrity')
  async integrity(
    @Param('id') id: string,
    @Query('screenId') screenId?: string,
  ) {
    const project = await this.projects.findOne(id);
    if (screenId) {
      const screen = project.screens.find((s) => s.id === screenId);
      if (!screen) {
        return { issues: [], counts: { error: 0, warning: 0, info: 0 }, error: `Screen ${screenId} not found` };
      }
      return checkScreenIntegrity(screen);
    }
    return checkProjectIntegrity(project);
  }
}
