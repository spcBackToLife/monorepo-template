import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';

@Controller('api/assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  findAll(
    @Query('scope') scope?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.assets.findAll(scope, projectId);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assets.remove(id);
  }
}
