import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialProjectsController } from './material-projects.controller';
import { MaterialProjectsService } from './material-projects.service';
import { MaterialEditorController } from './material-editor.controller';
import { MaterialEditorService } from './material-editor.service';
import { MaterialEditorGateway } from './material-editor.gateway';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(), // 使用内存存储，Service 层负责落盘
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  ],
  controllers: [MaterialsController, MaterialProjectsController, MaterialEditorController],
  providers: [
    MaterialsService,
    MaterialProjectsService,
    MaterialEditorService,
    MaterialEditorGateway,
    {
      provide: 'STORAGE_PROVIDER',
      useClass: LocalStorageProvider,
    },
  ],
  // DatabaseService 由 @Global() DatabaseModule 自动注入
  exports: [MaterialsService, MaterialProjectsService, MaterialEditorService, MaterialEditorGateway, 'STORAGE_PROVIDER'],
})
export class MaterialsModule {}
