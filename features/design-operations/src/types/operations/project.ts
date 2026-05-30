/**
 * 项目级一等字段操作（DesignProject 顶层）。
 *
 * 这些字段是 A 类一等字段（渲染契约会读），**严禁**走 `meta.setProject`
 * （后者只能写 ProjectMeta 这种 B 类信息）。
 *
 * 相关 op 已分散在其他文件（如 globalStateInit.* / theme.* / screen.*）；
 * 本文件聚合 globalOverlays 这类没有专门 ops 文件的顶层字段。
 */

import type { OverlayNode } from '@globallink/design-schema';

/**
 * 整体替换项目级 globalOverlays（跨屏覆盖层节点骨架）。
 *
 * 写入 `DesignProject.globalOverlays`（顶层一等字段），不是 meta。
 * 设计上选用"整体替换"而非"局部 add/update"是因为 globalOverlays 数量极少
 * （通常 2~4 个），整体写入语义清晰，inverse 也直接（保旧值即可）。
 *
 * 后续如需细粒度 add/remove/update overlay，可再补 op，但当前 setAll 足够。
 */
export interface ProjectSetGlobalOverlaysOp {
  type: 'project.setGlobalOverlays';
  params: {
    /** 整组替换值；传 null 清空 */
    overlays: OverlayNode[] | null;
  };
}

export type ProjectOperation = ProjectSetGlobalOverlaysOp;
