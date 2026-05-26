import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

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

  /** PUT /api/projects/:id/theme — 更新项目主题配置（全量替换） */
  @Put(':id/theme')
  updateTheme(
    @Param('id') id: string,
    @Body() body: { themeConfig: unknown },
  ) {
    return this.projects.updateTheme(id, body.themeConfig);
  }
}
