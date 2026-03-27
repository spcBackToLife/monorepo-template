import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      service: '@globallink/design-api',
      framework: 'NestJS',
      docs: 'POST /auth/register, POST /auth/login, GET /auth/me, GET /health, GET /health/db',
    };
  }
}
