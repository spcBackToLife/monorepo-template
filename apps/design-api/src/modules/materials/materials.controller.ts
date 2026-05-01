import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialsService } from './materials.service';

/**
 * 素材文件管理 API
 *
 * POST   /api/projects/:projectId/materials/upload       上传素材
 * GET    /api/projects/:projectId/materials               获取素材列表
 * GET    /api/projects/:projectId/materials/:id           获取素材详情
 * PUT    /api/projects/:projectId/materials/:id/meta      更新素材元数据
 * POST   /api/projects/:projectId/materials/:id/resize    服务端图片缩放
 * POST   /api/projects/:projectId/materials/:id/crop      服务端图片裁切
 * POST   /api/projects/:projectId/materials/:id/convert   格式转换
 * DELETE /api/projects/:projectId/materials/:id           删除素材
 */
@Controller('api/projects/:projectId/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    return this.materialsService.upload(projectId, file);
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.materialsService.findAll(projectId, { category, search });
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const material = await this.materialsService.findOne(projectId, id);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  @Put(':id/meta')
  async updateMeta(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      originalName?: string;
      category?: 'image' | 'icon' | 'animation' | 'video' | 'other';
      tags?: string[];
    },
  ) {
    return this.materialsService.updateMeta(projectId, id, body);
  }

  @Post(':id/resize')
  async resize(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    },
  ) {
    if (!body.width && !body.height) {
      throw new BadRequestException('width 或 height 至少需要提供一个');
    }
    return this.materialsService.resize(projectId, id, body);
  }

  @Post(':id/crop')
  async crop(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
  ) {
    if (body.width == null || body.height == null || body.left == null || body.top == null) {
      throw new BadRequestException('left, top, width, height 均为必填');
    }
    return this.materialsService.crop(projectId, id, body);
  }

  @Post(':id/convert')
  async convert(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      format: 'png' | 'jpeg' | 'webp' | 'avif';
      quality?: number;
    },
  ) {
    if (!body.format) {
      throw new BadRequestException('format 为必填');
    }
    const validFormats = ['png', 'jpeg', 'webp', 'avif'];
    if (!validFormats.includes(body.format)) {
      throw new BadRequestException(`不支持的目标格式: ${body.format}。支持: ${validFormats.join(', ')}`);
    }
    return this.materialsService.convert(projectId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.materialsService.remove(projectId, id);
  }
}
