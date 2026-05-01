import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Frame / Viewport / Canvas 三层解耦后的截图模式。
 * 详见 `design_docs/02-product/editor/01-canvas/frame-viewport-canvas-redesign.md`。
 *
 * - `viewport`：按 viewport 尺寸截首屏（向后兼容默认）
 * - `frame`：按 Frame 完整高度截，看长内容全貌
 * - `multi-viewport`：同 Screen 跨多个 viewport 并排截（P1，当前未实现）
 */
export type SnapshotMode = 'viewport' | 'frame' | 'multi-viewport';

interface SnapshotJobConfig {
  screenIds: string[];
  viewportIds?: string[];
  format: 'png' | 'jpeg' | 'webp';
  mode: SnapshotMode;
}

interface SnapshotResult {
  screenId: string;
  viewportId?: string;
  mode: SnapshotMode;
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
 *
 * 当前 placeholder 行为按 mode 返回不同尺寸，方便上层按约定测试；
 * 真实渲染能力到位后 placeholder 路径会被替换。
 */
@Injectable()
export class SnapshotsService {
  private jobs = new Map<string, SnapshotJob>();

  /** Create a new snapshot generation job */
  createJob(
    projectId: string,
    config: SnapshotJobConfig,
  ): { jobId: string; status: string; mode: SnapshotMode; note?: string } {
    if (config.mode === 'multi-viewport') {
      throw new NotFoundException(
        'multi-viewport snapshot mode not yet implemented (planned in P1)',
      );
    }
    const jobId = randomUUID();

    // Placeholder：viewport mode 给设备首屏尺寸；frame mode 给"长页面"占位高度
    // 让上层调用方能按 mode 区分预期产物，等真实渲染上线再替换。
    const placeholderHeight = config.mode === 'frame' ? 1500 : 812;

    const results: SnapshotResult[] = config.screenIds.map((screenId) => ({
      screenId,
      viewportId: config.viewportIds?.[0],
      mode: config.mode,
      url: `placeholder://snapshots/${projectId}/${screenId}.${config.mode}.${config.format}`,
      width: 375,
      height: placeholderHeight,
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

    return {
      jobId,
      status: job.status,
      mode: config.mode,
      note: 'Snapshot pipeline currently returns placeholder URLs; real rendering is planned. Mode is recorded so callers can verify intent.',
    };
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
