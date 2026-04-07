import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialProjectsController } from './material-projects.controller';
import { MaterialProjectsService } from './material-projects.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(), // 使用内存存储，Service 层负责落盘
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  ],
  controllers: [MaterialsController, MaterialProjectsController],
  providers: [
    MaterialsService,
    MaterialProjectsService,
    {
      provide: 'STORAGE_PROVIDER',
      useClass: LocalStorageProvider,
    },
  ],
  exports: [MaterialsService, MaterialProjectsService, 'STORAGE_PROVIDER'],
})
export class MaterialsModule {}
