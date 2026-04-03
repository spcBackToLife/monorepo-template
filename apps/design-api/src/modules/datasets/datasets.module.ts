import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { FileUploadController } from './file-upload.controller';
import { ProjectsModule } from '../../projects/projects.module';
import { OperationsModule } from '../../operations/operations.module';

@Module({
  imports: [ProjectsModule, OperationsModule],
  controllers: [DatasetsController, FileUploadController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
