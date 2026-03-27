import type { Screen } from './screen';
import type { Viewport } from './viewport';
import type { ComponentTemplate } from './template';

/** Top-level design project — aggregates all screens, viewports, and assets */
export interface DesignProject {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Target platform */
  platform: 'pc' | 'mobile';
  /** Initial viewport chosen at project creation */
  defaultViewport: Viewport;
  /** Currently active viewport for preview */
  currentViewport: Viewport;
  /** Quick-switch viewport presets */
  viewportPresets: Viewport[];
  /** All screens in the project */
  screens: Screen[];
  /** Project-level reusable component assets */
  componentAssets: ComponentTemplate[];
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}
