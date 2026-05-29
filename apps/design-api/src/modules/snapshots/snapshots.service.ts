import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Frame / Viewport / Canvas 三层解耦后的截图模式。
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

export interface SnapshotResult {
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

/** 查找系统已安装的 Chrome/Chromium 路径 */
function findChromePath(): string | undefined {
  const candidates = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((p) => existsSync(p));
}

/**
 * Snapshots Service
 *
 * 使用 puppeteer-core + 系统 Chrome 对前端预览页面截图。
 * 截图文件存储在 snapshots/ 目录，通过静态文件服务提供 HTTP URL。
 * Chrome 不可用时降级返回前端预览页面 URL。
 */
@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);
  private jobs = new Map<string, SnapshotJob>();
  private readonly snapshotsDir = join(process.cwd(), 'snapshots');

  constructor() {
    if (!existsSync(this.snapshotsDir)) {
      mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  private getPreviewBaseUrl(): string {
    return process.env['PREVIEW_BASE_URL'] ?? 'http://localhost:5174';
  }

  private getApiBaseUrl(): string {
    return process.env['API_BASE_URL'] ?? 'http://localhost:3001';
  }

  /** 截图主入口 */
  async createJob(
    projectId: string,
    config: SnapshotJobConfig,
  ): Promise<{ jobId: string; status: string; mode: SnapshotMode; results: SnapshotResult[]; error?: string }> {
    if (config.mode === 'multi-viewport') {
      throw new NotFoundException('multi-viewport snapshot mode not yet implemented');
    }

    const jobId = randomUUID();
    const projectDir = join(this.snapshotsDir, projectId);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    // 查找 Chrome
    const chromePath = process.env['CHROME_PATH'] ?? findChromePath();
    if (!chromePath) {
      this.logger.warn('Chrome not found. Set CHROME_PATH env or install Chrome. Falling back to preview URLs.');
      return this.fallback(jobId, projectId, config, 'Chrome not found');
    }

    // 动态 import puppeteer-core
    let puppeteer: typeof import('puppeteer-core');
    try {
      puppeteer = await import('puppeteer-core');
    } catch {
      this.logger.warn('puppeteer-core not installed. Run: pnpm add puppeteer-core --filter design-api');
      return this.fallback(jobId, projectId, config, 'puppeteer-core not installed');
    }

    // 启动无头浏览器
    const browser = await puppeteer.default.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const results: SnapshotResult[] = [];

    try {
      for (const screenId of config.screenIds) {
        const page = await browser.newPage();
        const width = 375;
        const height = config.mode === 'frame' ? 1500 : 812;

        await page.setViewport({ width, height, deviceScaleFactor: 2 });

        const url = `${this.getPreviewBaseUrl()}/preview/${projectId}?screen=${screenId}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

        const filename = `${screenId}.${config.mode}.${config.format}`;
        const filepath = join(projectDir, filename);

        await page.screenshot({
          path: filepath,
          type: config.format === 'jpeg' ? 'jpeg' : 'png',
          fullPage: config.mode === 'frame',
        });
        await page.close();

        results.push({
          screenId,
          viewportId: config.viewportIds?.[0],
          mode: config.mode,
          url: `${this.getApiBaseUrl()}/snapshots/${projectId}/${filename}`,
          width,
          height,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Screenshot failed: ${msg}`);
      await browser.close();
      return this.fallback(jobId, projectId, config, msg);
    }

    await browser.close();

    const job: SnapshotJob = {
      jobId, projectId, status: 'completed', config, results,
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    return { jobId, status: 'completed', mode: config.mode, results };
  }

  /** 降级：返回前端预览页面 URL（可在浏览器中直接打开） */
  private fallback(
    jobId: string,
    projectId: string,
    config: SnapshotJobConfig,
    error: string,
  ): { jobId: string; status: string; mode: SnapshotMode; results: SnapshotResult[]; error: string } {
    const previewBase = this.getPreviewBaseUrl();
    const results: SnapshotResult[] = config.screenIds.map((screenId) => ({
      screenId,
      viewportId: config.viewportIds?.[0],
      mode: config.mode,
      url: `${previewBase}/preview/${projectId}?screen=${screenId}`,
      width: 375,
      height: config.mode === 'frame' ? 1500 : 812,
    }));

    const job: SnapshotJob = {
      jobId, projectId, status: 'completed', config, results,
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), error,
    };
    this.jobs.set(jobId, job);

    return { jobId, status: 'completed', mode: config.mode, results, error };
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
