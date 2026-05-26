import type { Screen } from './screen';
import type { Viewport } from './viewport';
import type { ComponentTemplate } from './template';
import type { GlobalStateInit } from './state';
import type { ThemeConfig } from './theme';

/** Top-level design project — aggregates all screens, viewports, and assets（v2） */
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
  /** 项目级全局 state（替换 v1 environmentStates） */
  globalStateInit?: GlobalStateInit;
  /** 主题风格配置（项目级唯一） */
  themeConfig?: ThemeConfig;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}
