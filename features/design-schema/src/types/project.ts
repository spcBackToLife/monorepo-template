import type { Screen, OverlayNode } from './screen';
import type { Viewport } from './viewport';
import type { ComponentTemplate } from './template';
import type { GlobalStateInit } from './state';
import type { ThemeConfig } from './theme';
import type { ProjectMeta } from './meta';

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
  /**
   * 项目级覆盖层（跨屏共享 UI，z-index 高于屏级 overlays）。
   *
   * 与 `Screen.overlays` 的区别：
   *   - 屏级：仅本屏渲染，随屏切换销毁（如登录页的锁定 Sheet）
   *   - 项目级：所有屏共享渲染、持续存在（如全局离线 banner / session 过期 modal）
   *
   * 二者用 `OverlayNode` 同一类型；通过挂载位置区分。
   *
   * 写入 op：`project.setGlobalOverlays`（整体替换）。⚠️ 不要走 `meta.setProject`——
   * meta 是 B 类信息（渲染不读），globalOverlays 是 A 类一等字段（渲染读）。
   */
  globalOverlays?: OverlayNode[];
  /** 主题风格配置（项目级唯一） */
  themeConfig?: ThemeConfig;
  /**
   * 项目级设计意图 / 溯源（B 类，渲染契约不读）。
   * 取代旧 design-registry _index.json。详见 SCHEMA-FIRST-REFACTOR.md §4。
   */
  meta?: ProjectMeta;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}
