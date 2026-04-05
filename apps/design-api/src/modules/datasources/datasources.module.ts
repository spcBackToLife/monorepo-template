import { Module } from '@nestjs/common';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesService } from './datasources.service';
import { ProjectsModule } from '../../projects/projects.module';
import { OperationsModule } from '../../operations/operations.module';

@Module({
  imports: [ProjectsModule, OperationsModule],
  controllers: [DatasourcesController],
  providers: [DatasourcesService],
  exports: [DatasourcesService],
})
export class DatasourcesModule {}
