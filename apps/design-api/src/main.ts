import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT') ?? '3001', 10);
  const host = config.get<string>('HOST') ?? '0.0.0.0';

  await app.listen(port, host);
  Logger.log(`Application listening on http://${host}:${port}`, 'Bootstrap');
}

void bootstrap();
