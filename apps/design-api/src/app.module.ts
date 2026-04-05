import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { OperationsModule } from './operations/operations.module';
import { AssetsModule } from './assets/assets.module';
import { DatasourcesModule } from './modules/datasources/datasources.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    OperationsModule,
    AssetsModule,
    DatasourcesModule,
    FileUploadModule,
    SnapshotsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
