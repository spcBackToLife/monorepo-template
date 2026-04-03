import { apiJson } from './client';

export interface SnapshotGenerateResponse {
  jobId: string;
  status: string;
}

export interface SnapshotJobResult {
  screenId: string;
  viewportId?: string;
  url: string;
  width: number;
  height: number;
}

export interface SnapshotJobResponse {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: { screenIds: string[]; viewportIds?: string[]; format: string };
  results: SnapshotJobResult[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export function postGenerateSnapshots(
  projectId: string,
  body: { screenIds: string[]; viewportIds?: string[]; format?: 'png' | 'jpeg' | 'webp' },
): Promise<SnapshotGenerateResponse> {
  return apiJson<SnapshotGenerateResponse>(`/projects/${projectId}/snapshots/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSnapshotJob(projectId: string, jobId: string): Promise<SnapshotJobResponse> {
  return apiJson<SnapshotJobResponse>(`/projects/${projectId}/snapshots/jobs/${jobId}`);
}
