import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { OperationsGateway } from './operations.gateway';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [OperationsController],
  providers: [OperationsService, OperationsGateway],
  exports: [OperationsService, OperationsGateway],
})
export class OperationsModule {}
