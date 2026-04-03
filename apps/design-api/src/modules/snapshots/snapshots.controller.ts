import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';

interface GenerateSnapshotsBody {
  screenIds: string[];
  viewportIds?: string[];
  format?: 'png' | 'jpeg' | 'webp';
}

/**
 * Task 4.6.2 — Snapshots Controller
 *
 * Endpoints for generating and retrieving screenshot snapshots.
 * For MVP, returns stub responses with placeholder URLs.
 */
@Controller('api/projects/:projectId/snapshots')
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  /** POST /api/projects/:projectId/snapshots/generate */
  @Post('generate')
  generate(
    @Param('projectId') projectId: string,
    @Body() body: GenerateSnapshotsBody,
  ) {
    return this.snapshots.createJob(projectId, {
      screenIds: body.screenIds,
      viewportIds: body.viewportIds,
      format: body.format ?? 'png',
    });
  }

  /** GET /api/projects/:projectId/snapshots/jobs/:jobId */
  @Get('jobs/:jobId')
  getJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.snapshots.getJob(projectId, jobId);
  }
}
