import { makeAutoObservable, runInAction } from 'mobx';
import type { DesignProject } from '@globallink/design-schema';
import type { ProjectSummary, CreateProjectParams } from './types';
import { projectApi } from './api';

export class ProjectStore {
  /** All projects for the list page */
  projects: ProjectSummary[] = [];
  /** Currently loaded project (full detail) */
  currentProject: DesignProject | null = null;
  /** Loading state */
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** Fetch project list from API */
  async fetchProjects(): Promise<void> {
    this.loading = true;
    try {
      const list = await projectApi.list();
      runInAction(() => {
        this.projects = list;
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  /** Load a single project by ID */
  async loadProject(id: string): Promise<void> {
    this.loading = true;
    try {
      const project = await projectApi.get(id);
      runInAction(() => {
        this.currentProject = project;
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  /** Create a new project */
  async createProject(params: CreateProjectParams): Promise<string> {
    const created = await projectApi.create(params);
    runInAction(() => {
      this.projects.unshift({
        id: created.id,
        name: created.name,
        platform: created.platform,
        updatedAt: created.updatedAt,
        createdAt: created.createdAt,
      });
    });
    return created.id;
  }

  /** Delete a project */
  async deleteProject(id: string): Promise<void> {
    await projectApi.remove(id);
    runInAction(() => {
      this.projects = this.projects.filter((p) => p.id !== id);
      if (this.currentProject?.id === id) {
        this.currentProject = null;
      }
    });
  }

  /** Clear current project */
  clearCurrent(): void {
    this.currentProject = null;
  }
}

export const projectStore = new ProjectStore();
