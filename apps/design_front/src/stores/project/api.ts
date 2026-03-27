import type { DesignProject } from '@globallink/design-schema';
import { apiJson } from '@/api/client';
import { authStore } from '@/stores/auth';
import type { ProjectSummary, CreateProjectParams } from './types';

function token() {
  return authStore.token;
}

export const projectApi = {
  async list(): Promise<ProjectSummary[]> {
    return apiJson<ProjectSummary[]>('/projects', { token: token() });
  },

  async get(id: string): Promise<DesignProject> {
    return apiJson<DesignProject>(`/projects/${id}`, { token: token() });
  },

  async create(params: CreateProjectParams): Promise<DesignProject> {
    return apiJson<DesignProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(params),
      token: token(),
    });
  },

  async remove(id: string): Promise<void> {
    await apiJson(`/projects/${id}`, {
      method: 'DELETE',
      token: token(),
    });
  },
};
