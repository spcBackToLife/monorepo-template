import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  health() {
    return { status: 'ok' as const };
  }

  @Get('health/db')
  async dbHealth() {
    const db = await this.database.check();
    if (!db.ok) {
      throw new ServiceUnavailableException({
        status: 'error' as const,
        database: { connected: false, error: db.error },
      });
    }
    return {
      status: 'ok' as const,
      database: { connected: true, version: db.version },
    };
  }
}
