import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface SnapshotJobConfig {
  screenIds: string[];
  viewportIds?: string[];
  format: 'png' | 'jpeg' | 'webp';
}

interface SnapshotResult {
  screenId: string;
  viewportId?: string;
  url: string;
  width: number;
  height: number;
}

export interface SnapshotJob {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: SnapshotJobConfig;
  results: SnapshotResult[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * Task 4.6.3 — Snapshots Service
 *
 * In-memory job management for screenshot generation.
 * For MVP: jobs are marked as completed immediately with placeholder URLs.
 * Future: integrate Puppeteer or similar for real screenshot capture.
 */
@Injectable()
export class SnapshotsService {
  private jobs = new Map<string, SnapshotJob>();

  /** Create a new snapshot generation job */
  createJob(
    projectId: string,
    config: SnapshotJobConfig,
  ): { jobId: string; status: string } {
    const jobId = randomUUID();

    // For MVP: generate placeholder results immediately
    const results: SnapshotResult[] = config.screenIds.map((screenId) => ({
      screenId,
      viewportId: config.viewportIds?.[0],
      url: `placeholder://snapshots/${projectId}/${screenId}.${config.format}`,
      width: 375,
      height: 812,
    }));

    const job: SnapshotJob = {
      jobId,
      projectId,
      status: 'completed',
      config,
      results,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);

    return { jobId, status: job.status };
  }

  /** Get a job by ID */
  getJob(projectId: string, jobId: string): SnapshotJob {
    const job = this.jobs.get(jobId);
    if (!job || job.projectId !== projectId) {
      throw new NotFoundException(`Snapshot job ${jobId} not found`);
    }
    return job;
  }
}
