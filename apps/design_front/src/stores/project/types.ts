import type { DesignProject } from '@globallink/design-schema';

/** Minimal project info for list display */
export interface ProjectSummary {
  id: string;
  name: string;
  platform: 'pc' | 'mobile';
  updatedAt: string;
  createdAt: string;
}

/** Params for creating a new project */
export interface CreateProjectParams {
  name: string;
  platform: 'pc' | 'mobile';
  viewportName: string;
}

/** Full project data returned by API */
export type ProjectDetail = DesignProject;
