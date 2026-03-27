import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';

/**
 * Immutable state holder for a DesignProject.
 *
 * Each update returns a new state reference while preserving the old one.
 * This enables undo/redo and efficient change detection.
 */
export class ProjectState {
  private _current: DesignProject;

  constructor(project: DesignProject) {
    // Take ownership of a deep clone to ensure immutability
    this._current = deepClone(project);
  }

  /** Get the current project state (readonly reference) */
  get current(): DesignProject {
    return this._current;
  }

  /** Replace the current state with a new project reference */
  set current(project: DesignProject) {
    this._current = project;
  }

  /** Create a snapshot of the current state */
  snapshot(): DesignProject {
    return deepClone(this._current);
  }
}
