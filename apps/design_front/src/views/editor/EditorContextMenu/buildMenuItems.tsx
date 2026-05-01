import type { MenuProps } from 'antd';
import { Modal } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { ApiError, getErrorMessage } from '@/api/client';
import { editorStore } from '@/stores/editor';
import { materialSlotApi, type MaterialSlotWithProject } from '@/api/materialProject';
import { findNodeInScreens } from '@globallink/design-operations';
import { getStyleCleanupAfterMaterialSlotRemove } from '@/views/editor/materialSlotStyleCleanup';
import { getElementProps } from '@globallink/design-schema';
import type { PrimitiveNodeType, ComponentNode } from '@globallink/design-schema';
import type { StyleOverrides } from '@/types/editor';

// ===== 素材应用目标 (Material Apply Target) =====

/** 素材可应用的目标描述 */
export interface MaterialApplyTarget {
  /** 唯一值，存入 slot.cssTarget。格式：CSS 属性名 或 props.xxx */
  value: string;
  /** 用户可读标签 */
  label: string;
  /** 菜单图标 */
  icon: string;
  /** 导出方式：svg → 写为 url("...svg")；png → 写为图片 URL */
  exportFormat: 'svg' | 'png';
}

/** 通用 CSS 属性目标（所有元素都有） */
const CSS_STYLE_TARGETS: MaterialApplyTarget[] = [
  { value: 'background-image', label: '背景', icon: '🎨', exportFormat: 'svg' },
  { value: 'border-image', label: '边框图', icon: '🔲', exportFormat: 'svg' },
  { value: 'mask-image', label: '遮罩', icon: '🎭', exportFormat: 'svg' },
  { value: '::before.background', label: '前装饰 (::before)', icon: '✨', exportFormat: 'svg' },
  { value: '::after.background', label: '后装饰 (::after)', icon: '💫', exportFormat: 'svg' },
];

/** 元素特有的 Prop 目标（根据 type 推断） */
const ELEMENT_PROP_TARGETS: Record<string, MaterialApplyTarget[]> = {
  img: [{ value: 'props.src', label: '图片源 (src)', icon: '🖼️', exportFormat: 'png' }],
};

/**
 * 根据节点获取所有可用的素材应用目标。
 *
 * 优先级：元素特有 Props > 通用 CSS 属性
 * - img → [props.src, background-image, mask-image, ...]
 * - div → [background-image, border-image, mask-image, ...]
 * - component:xxx → 从模板 propDefinitions 中提取 type=image 的 props + 通用 CSS
 */
export function getAvailableTargets(nodeOrType: ComponentNode | string): MaterialApplyTarget[] {
  const targets: MaterialApplyTarget[] = [];

  const node = typeof nodeOrType === 'string' ? undefined : nodeOrType;
  const nodeType = typeof nodeOrType === 'string' ? nodeOrType : nodeOrType.type;

  // 1. 元素特有的 Prop 目标
  if (nodeType.startsWith('component:')) {
    // 组件实例：通过 templateRef 找到模板，提取 type=image 的 propDefinitions
    const templateId = node?.templateRef?.templateId;
    if (templateId) {
      const template = editorStore.project?.componentAssets?.find(
        (t) => t.id === templateId,
      );
      if (template?.propDefinitions) {
        for (const pd of template.propDefinitions) {
          if (pd.type === 'image') {
            targets.push({
              value: `props.${pd.key}`,
              label: `${pd.label} (${pd.key})`,
              icon: '🖼️',
              exportFormat: 'png',
            });
          }
        }
      }
    }
  } else if (ELEMENT_PROP_TARGETS[nodeType]) {
    targets.push(...ELEMENT_PROP_TARGETS[nodeType]);
  } else {
    // 检查元素属性注册表中是否有 image 类型的 prop
    const propDefs = getElementProps(nodeType as PrimitiveNodeType);
    for (const p of propDefs) {
      if (p.type === 'image') {
        targets.push({
          value: `props.${p.key}`,
          label: `${p.label} (${p.key})`,
          icon: '🖼️',
          exportFormat: 'png',
        });
      }
    }
  }

  // 2. 通用 CSS 属性目标
  targets.push(...CSS_STYLE_TARGETS);

  return targets;
}

/** 根据 cssTarget 值获取用户可读标签 */
export function getCssTargetLabel(cssTarget: string): string {
  // 先从静态表中查
  const all = [...Object.values(ELEMENT_PROP_TARGETS).flat(), ...CSS_STYLE_TARGETS];
  const opt = all.find((o) => o.value === cssTarget);
  if (opt) return `${opt.icon} ${opt.label}`;
  // 动态 props 目标（如组件的 props.avatarSrc）
  if (cssTarget.startsWith('props.')) {
    return `🖼️ ${cssTarget.replace('props.', '')}`;
  }
  return cssTarget;
}

/** 根据 cssTarget 值获取简短标签 */
function getCssTargetShortLabel(cssTarget: string): string {
  const all = [...Object.values(ELEMENT_PROP_TARGETS).flat(), ...CSS_STYLE_TARGETS];
  const opt = all.find((o) => o.value === cssTarget);
  if (opt) return opt.label;
  if (cssTarget.startsWith('props.')) {
    return cssTarget.replace('props.', '');
  }
  return cssTarget;
}

/** 根据 cssTarget 值获取导出格式 */
export function getExportFormat(cssTarget: string): 'svg' | 'png' {
  // props 目标一律导出 PNG
  if (cssTarget.startsWith('props.')) return 'png';
  const all = [...Object.values(ELEMENT_PROP_TARGETS).flat(), ...CSS_STYLE_TARGETS];
  const opt = all.find((o) => o.value === cssTarget);
  return opt?.exportFormat ?? 'svg';
}

// ===== 缓存 =====

/** 缓存已查询的槽位信息（避免每次打开菜单都查询） */
let _cachedSlotsNodeId: string | null = null;
let _cachedSlots: MaterialSlotWithProject[] = [];

/**
 * 预加载节点的素材槽位（在右键菜单打开前调用）
 *
 * 仅拉取 `node_material_slots`，**不在此做「槽位为空 → 按旧 target_node_id 自动建槽」**：
 * 否则用户删除所有槽位后，下一次预加载会再次为 `findAllByNode` 返回的每个素材工程批量 INSERT，
 * 表现为「删完刷新又冒出两条背景槽」。旧数据迁移请用一次性脚本或 MCP `material_slot` 显式创建。
 */
export async function preloadMaterialSlots(targetNodeId: string): Promise<void> {
  const projectId = editorStore.project?.id;
  if (!projectId) return;
  try {
    const slots = await materialSlotApi.findByNode(projectId, targetNodeId);
    _cachedSlots = slots;
    _cachedSlotsNodeId = targetNodeId;
  } catch {
    _cachedSlots = [];
    _cachedSlotsNodeId = targetNodeId;
  }
}

// ===== 菜单构建 =====

/** 画布 / 节点树共用的右键菜单项（01-canvas §十、08-layer-tree MVP） */
export function buildEditorContextMenuItems(
  targetNodeId: string | null,
  _rootNodeId: string,
): MenuProps['items'] {
  if (!targetNodeId) {
    return [
      { key: 'paste', label: '粘贴' },
      { type: 'divider' },
      { key: 'zoom100', label: '缩放到 100%' },
      { key: 'fit', label: '适配画布（100% 且重置平移）' },
    ];
  }

  const isRoot = targetNodeId === _rootNodeId;

  // 构建素材子菜单 — 已有素材 + 添加新素材入口
  const slots = _cachedSlotsNodeId === targetNodeId ? _cachedSlots : [];

  // 根据节点类型动态获取可用目标
  const node = findNodeInScreens(editorStore.screens, targetNodeId);
  const availableTargets = getAvailableTargets(node ?? 'div');

  // 已有素材 → 子菜单：编辑 / 删除槽位（删除仅解绑 node_material_slots，不删素材工程）
  const existingItems: NonNullable<MenuProps['items']> = slots.map((slot) => ({
    key: `asset:slot:${slot.id}`,
    label: `${getCssTargetLabel(slot.cssTarget)} — ${slot.materialProjectName}${slot.isActive ? '' : '（未激活）'}`,
    children: [
      {
        key: `asset:edit:${slot.id}:${slot.materialProjectId}:${slot.cssTarget}`,
        label: '编辑…',
      },
      {
        key: `asset:remove:${slot.id}`,
        label: '删除素材槽',
        danger: true,
      },
    ],
  }));

  // 已占用的 cssTarget 集合 — 避免重复创建同类型
  const usedTargets = new Set(slots.map((s) => s.cssTarget));

  // "添加素材…" 子菜单 — 列出尚未占用的目标属性
  const addTargetItems: NonNullable<MenuProps['items']> = availableTargets
    .filter((opt) => !usedTargets.has(opt.value))
    .map((opt) => ({
      key: `asset:add:${opt.value}`,
      label: `${opt.icon} ${opt.label} (${opt.value})`,
    }));

  // 如果所有预设都已占用，提供自定义入口
  if (addTargetItems.length === 0) {
    addTargetItems.push({
      key: 'asset:add:custom',
      label: '+ 自定义 CSS 属性…',
    });
  }

  // 组装子菜单
  const children: NonNullable<MenuProps['items']> = [];

  if (existingItems.length > 0) {
    children.push(...existingItems);
    children.push({ type: 'divider' as const });
  }

  children.push({
    key: 'asset:add-group',
    label: '+ 添加素材…',
    children: addTargetItems,
  });

  const assetMenuItem: NonNullable<MenuProps['items']>[number] = {
    key: 'asset',
    label: '设计素材…',
    children,
  };

  return [
    { key: 'copy', label: '复制', extra: '⌘C' },
    { key: 'dup', label: '复制副本', disabled: isRoot, extra: '⌘D' },
    { key: 'del', label: '删除', danger: true, disabled: isRoot, extra: '⌫' },
    { type: 'divider' },
    { key: 'copyStyles', label: '复制样式', extra: '⌘⇧C' },
    {
      key: 'pasteStyles',
      label: '粘贴样式',
      disabled: !editorStore.styleClipboard,
      extra: '⌘⇧V',
    },
    { key: 'resetStyles', label: '重置样式' },
    { type: 'divider' },
    { key: 'wrap', label: '包裹为容器', disabled: isRoot },
    assetMenuItem,
  ];
}

// ===== 菜单点击处理 =====

export function handleEditorContextMenuClick(
  key: string,
  targetNodeId: string | null,
  rootNodeId: string,
  message: MessageInstance,
): void {
  if (!targetNodeId) {
    if (key === 'paste') {
      void editorStore.pasteFromClipboard().then((r) => {
        if (!r.success) message.error(r.description);
      });
      return;
    }
    if (key === 'zoom100') editorStore.setCanvasScale(1);
    if (key === 'fit') {
      editorStore.setCanvasScale(1);
      editorStore.setCanvasPan(0, 0);
    }
    return;
  }

  const isRoot = targetNodeId === rootNodeId;

  if (key === 'copy') {
    editorStore.copyNodeToClipboard(targetNodeId);
    return;
  }

  if (key === 'copyStyles') {
    editorStore.copyStyles(targetNodeId);
    return;
  }

  if (key === 'pasteStyles') {
    const selected = editorStore.selectedNodeIds;
    const ids = selected.includes(targetNodeId) ? undefined : [targetNodeId];
    editorStore.pasteStyles(ids);
    return;
  }

  if (key === 'resetStyles') {
    const selected = editorStore.selectedNodeIds;
    const ids = selected.includes(targetNodeId) ? undefined : [targetNodeId];
    editorStore.resetStyles(ids);
    return;
  }

  // ── 素材操作 ──

  if (key.startsWith('asset:remove:')) {
    const slotId = key.slice('asset:remove:'.length);
    const projectId = editorStore.project?.id;
    if (!projectId) {
      message.error('项目信息不存在');
      return;
    }
    Modal.confirm({
      title: '删除素材槽',
      content:
        '将移除该节点与此素材槽的绑定（不会删除素材工程本身），并同步清除该槽对应 CSS 通道上由素材应用写入的样式（含 background 简写中的首层 url）。在属性面板里仅改样式不会自动删槽。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const slotsBefore = await materialSlotApi.findByNode(projectId, targetNodeId);
          const slot = slotsBefore.find((s) => s.id === slotId);
          if (!slot) {
            message.warning('槽位已不存在');
            await preloadMaterialSlots(targetNodeId);
            return;
          }
          const node = findNodeInScreens(editorStore.screens, targetNodeId);
          const nodeStyles = { ...((node?.styles ?? {}) as StyleOverrides) };
          const deleted = await materialSlotApi.remove(projectId, slotId);

          const { resetProperties, updateStyles } = getStyleCleanupAfterMaterialSlotRemove(
            slot.cssTarget,
            nodeStyles,
          );
          if (resetProperties.length > 0) {
            editorStore.execute({
              type: 'resetStyle',
              params: { nodeId: targetNodeId, properties: resetProperties },
            });
          }
          if (updateStyles && Object.keys(updateStyles).length > 0) {
            editorStore.execute({
              type: 'updateStyle',
              params: { nodeId: targetNodeId, styles: updateStyles },
            });
          }

          message.success(
            `已删除素材槽（${deleted.cssTarget}），并已清理节点上对应样式`,
          );
          await preloadMaterialSlots(targetNodeId);
        } catch (e) {
          message.error(
            e instanceof ApiError ? getErrorMessage(e.body) : '删除素材槽失败',
          );
        }
      },
    });
    return;
  }

  // 编辑已有素材
  if (key.startsWith('asset:edit:')) {
    const parts = key.split(':');
    const materialProjectId = parts[3];
    const cssTarget = parts.slice(4).join(':'); // cssTarget 可能包含冒号如 ::before.background
    editorStore.openMaterialEditor(targetNodeId, undefined, { materialProjectId, cssTarget });
    return;
  }

  // 添加新素材（指定目标属性）
  if (key.startsWith('asset:add:')) {
    const cssTarget = key.replace('asset:add:', '');
    if (cssTarget === 'custom') {
      editorStore.openMaterialEditor(targetNodeId, undefined, {
        forceCreate: true,
        cssTarget: 'background-image',
      });
    } else {
      const label = getCssTargetShortLabel(cssTarget);
      editorStore.openMaterialEditor(targetNodeId, undefined, {
        forceCreate: true,
        cssTarget,
        slotName: label,
      });
    }
    return;
  }

  if (key === 'dup') {
    if (isRoot) return;
    const r = editorStore.execute({ type: 'duplicateElement', params: { elementId: targetNodeId } });
    if (r.success && r.affectedNodeIds[1]) {
      editorStore.select(r.affectedNodeIds[1]);
    } else if (!r.success) {
      message.error(r.description);
    }
    return;
  }

  if (key === 'del') {
    if (isRoot) return;
    editorStore.execute({ type: 'removeElement', params: { elementId: targetNodeId } });
    editorStore.select(null);
    return;
  }

  if (key === 'wrap') {
    if (isRoot) return;
    const r = editorStore.execute({
      type: 'wrapInContainer',
      params: {
        nodeIds: [targetNodeId],
        containerTag: 'div',
        containerStyles: { display: 'flex', flexDirection: 'column', position: 'relative' },
      },
    });
    if (!r.success) message.error(r.description);
  }
}
