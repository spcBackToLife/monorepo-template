/**
 * 素材编辑器模态浮层 — SVG 引擎版本
 *
 * 使用 @globallink/material-engine 的 SVG 渲染引擎，
 * 完全移除 Fabric.js 依赖。
 *
 * 架构：
 *   MaterialEditorProvider (Context + Executor)
 *   → LeftToolbar (工具选择)
 *   → MaterialEditorCanvas (SVG 渲染 + 交互)
 *   → RightPropertyPanel (属性编辑)
 *   → ExportBar (导出)
 */
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Tooltip, App as AntdApp, ConfigProvider } from 'antd';
import {
  CloseOutlined,
  DragOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  GroupOutlined,
  UngroupOutlined,
  MergeCellsOutlined,
  ScissorOutlined,
  BlockOutlined,
  GatewayOutlined,
  SplitCellsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import {
  MaterialEditorProvider,
  useMaterialEditor,
  MaterialEditorCanvas,
  LayerPanel,
  getOverlayBoundingBox,
  type MaterialToolType,
} from '@globallink/material-engine';
import {
  createMaterialProject,
  generateObjectId,
  normalizeMaterialEditorSchema,
  computeMaterialWorkspaceCanvasSize,
  type MaterialOperation,
  type MaterialProjectSchema,
  type BooleanOpType,
  type AlignmentType,
  type GradientDef,
} from '@globallink/material-operations';
import {
  materialEditorSync,
  type MaterialOperationEnvelope,
} from '@/services/MaterialEditorSyncManager';
import { materialProjectApi, materialSlotApi } from '@/api/materialProject';
import { API_BASE } from '@/api/client';
import { LeftToolbar } from './LeftToolbar';
import type { ActiveTool, EffectToolType } from './LeftToolbar';
import { RightPropertyPanel } from './RightPropertyPanel';
import type { RightPanelMode, SelectedObjectInfo } from './RightPropertyPanel';
import { ExportBar } from './ExportBar';

/** 面板尺寸常量 */
const MODAL_WIDTH = 1060;
const MODAL_HEIGHT = 720;

/** 默认画布尺寸 */
const DEFAULT_CANVAS_WIDTH = 600;
const DEFAULT_CANVAS_HEIGHT = 400;

/** 效果工具 → 右侧面板模式映射 */
const EFFECT_TO_PANEL: Record<EffectToolType, RightPanelMode> = {
  gradient: 'gradient-edit',
  fill: 'fill-edit',
  mask: 'mask-edit',
  filter: 'filter-edit',
  shadow: 'shadow-edit',
};

/** 是否为效果工具 */
function isEffectTool(tool: ActiveTool): tool is EffectToolType {
  return tool === 'gradient' || tool === 'fill' || tool === 'mask' || tool === 'filter' || tool === 'shadow';
}

/**
 * 获取目标节点的当前样式信息
 */
function useTargetNodeStyles(nodeId: string | null) {
  const screens = editorStore.screens;
  const node = nodeId ? findNodeInScreens(screens, nodeId) : null;

  return useMemo(() => {
    if (!node) return null;
    const styles = (node.styles ?? {}) as Record<string, unknown>;
    const w = styles.width;
    const h = styles.height;
    return {
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.name ?? node.id.slice(0, 8),
      background: String(styles.background || styles.backgroundImage || styles.backgroundColor || ''),
      boxShadow: String(styles.boxShadow || ''),
      textShadow: String(styles.textShadow || ''),
      filter: String(styles.filter || ''),
      width: w === undefined || w === null || w === '' ? '' : (typeof w === 'number' ? w : String(w)),
      height: h === undefined || h === null || h === '' ? '' : (typeof h === 'number' ? h : String(h)),
    };
  }, [node]);
}

/**
 * 解析元素尺寸为组件（参考框）尺寸。
 * 注意：这里返回的是组件的实际尺寸，不是画布尺寸。
 * 画布尺寸由 createMaterialProject 自动计算（比组件大）。
 */
function resolveComponentSize(
  widthStr?: string | number,
  heightStr?: string | number,
): { width: number; height: number } {
  /** 设计节点上的宽高是真实组件尺寸，须如实传入参考框（勿把 32 钳成 50） */
  const parseSize = (val: string | number | undefined, fallback: number): number => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'number') {
      return Number.isFinite(val) ? Math.max(1, Math.min(1200, Math.round(val))) : fallback;
    }
    const s = val.trim();
    if (!s || s === 'auto') return fallback;
    const pxMatch = s.match(/^(\d+(?:\.\d+)?)(px)?$/);
    if (pxMatch) return Math.max(1, Math.min(1200, Math.round(Number(pxMatch[1]))));
    const pctMatch = s.match(/^(\d+(?:\.\d+)?)%$/);
    if (pctMatch) return Math.max(1, Math.min(1200, Math.round((Number(pctMatch[1]) / 100) * 400)));
    return fallback;
  };

  return {
    width: parseSize(widthStr, DEFAULT_CANVAS_WIDTH),
    height: parseSize(heightStr, DEFAULT_CANVAS_HEIGHT),
  };
}

/**
 * MaterialEditorModal — 素材编辑器浮层弹窗（入口）
 */
export const MaterialEditorModal = observer(function MaterialEditorModal() {
  const isOpen = editorStore.materialEditorOpen;
  const targetNodeId = editorStore.materialEditorTargetNodeId;

  if (!isOpen) return null;

  return createPortal(
    <MaterialEditorModalInner
      targetNodeId={targetNodeId}
      onClose={() => editorStore.closeMaterialEditor()}
    />,
    document.body,
  );
});

interface InnerProps {
  targetNodeId: string | null;
  onClose: () => void;
}

/**
 * MaterialEditorModalInner — 创建 SVG 引擎 Provider + 三栏布局
 *
 * MCP 集成：
 *   1. 挂载时自动创建/查找后端素材工程（materialProjectId）
 *   2. 连接 WS SyncManager 接收 MCP 远程操作
 *   3. 本地操作通过 onOperation/onBatch 回调同步到后端
 */
const MaterialEditorModalInner = observer(function MaterialEditorModalInner({
  targetNodeId,
  onClose,
}: InnerProps) {
  const selectedStyles = useTargetNodeStyles(targetNodeId);

  const componentSize = useMemo(
    () => resolveComponentSize(selectedStyles?.width, selectedStyles?.height),
    [selectedStyles?.width, selectedStyles?.height],
  );

  // 创建初始 Schema — 组件尺寸作为参考框，画布自动放大
  const [initialSchema] = useState<MaterialProjectSchema>(() =>
    createMaterialProject(
      'modal-canvas',
      editorStore.project?.id ?? 'default',
      '素材画布',
      componentSize.width,
      componentSize.height,
    ),
  );

  // 后端素材工程 ID（创建后赋值）
  const [materialProjectId, setMaterialProjectId] = useState<string | null>(null);
  const materialProjectIdRef = useRef<string | null>(null);
  /** 防止 useEffect 重复执行时并发创建多个工程 */
  const initializingRef = useRef(false);

  // 挂载时自动创建/查找后端素材工程 + 连接 WS
  useEffect(() => {
    const projectId = editorStore.project?.id;
    if (!projectId) return;
    // 防止并发初始化（React StrictMode / 依赖变化导致重复执行）
    if (initializingRef.current) return;
    initializingRef.current = true;

    let cancelled = false;

    // 从 store 中读取直接指定的 materialProjectId
    const directProjectId = editorStore.materialEditorProjectId;
    const slotName = editorStore.materialEditorSlotName;
    const forceCreate = editorStore.materialEditorForceCreate;
    const cssTarget = editorStore.materialEditorCssTarget;

    /**
     * 根据已有槽位列表自动生成不重复的槽位名。
     * 规则：default → material-2 → material-3 → ...
     */
    const generateSlotName = (existingSlots: { slotName: string }[]): string => {
      const names = new Set(existingSlots.map((s) => s.slotName));
      if (!names.has('default')) return 'default';
      let idx = 2;
      while (names.has(`material-${idx}`)) idx++;
      return `material-${idx}`;
    };

    (async () => {
      try {
        let mpId: string | null = null;

        // ── 强制新建模式：直接创建新工程 + 新槽位 ──
        if (forceCreate && targetNodeId && !cancelled) {
          // 先查现有槽位，用于生成不重复的名称
          const existingSlots = await materialSlotApi.findByNode(projectId, targetNodeId);
          const newSlotName = generateSlotName(existingSlots);
          const nodeName = selectedStyles?.nodeName ?? '素材';

          const { canvasWidth: cw, canvasHeight: ch } = computeMaterialWorkspaceCanvasSize(
            componentSize.width,
            componentSize.height,
          );
          const created = await materialProjectApi.create(projectId, {
            name: `${nodeName}-${newSlotName}`,
            targetNodeId: targetNodeId,
            canvasWidth: cw,
            canvasHeight: ch,
            canvasJSON: {},
            referenceFrameWidth: componentSize.width,
            referenceFrameHeight: componentSize.height,
          });
          mpId = created.id;

          // 创建新槽位关联
          if (!cancelled) {
            try {
              await materialSlotApi.create(projectId, {
                nodeId: targetNodeId,
                slotName: newSlotName,
                materialProjectId: mpId,
                cssTarget: cssTarget ?? 'background-image',
              });
            } catch {
              // 忽略
            }
          }
        }

        // ── 优先使用直接指定的素材工程 ID ──
        if (!mpId && directProjectId) {
          mpId = directProjectId;
        }

        // ── 查找节点的槽位 ──
        if (!mpId && targetNodeId && !cancelled) {
          const slots = await materialSlotApi.findByNode(projectId, targetNodeId);
          if (slots.length > 0 && !cancelled) {
            // 有槽位 → 用第一个活跃槽位的素材工程（或指定 slotName 的）
            const targetSlot = slotName
              ? slots.find((s) => s.slotName === slotName)
              : slots.find((s) => s.isActive) ?? slots[0];
            if (targetSlot) {
              mpId = targetSlot.materialProjectId;
            }
          }
        }

        // ── 向后兼容：如果槽位表为空，检查旧的 target_node_id 直接关联 ──
        if (!mpId && targetNodeId && !cancelled) {
          const existing = await materialProjectApi.findByNode(projectId, targetNodeId);
          if (existing && !cancelled) {
            mpId = existing.id;
            // 自动迁移：为旧关联创建默认槽位
            try {
              await materialSlotApi.create(projectId, {
                nodeId: targetNodeId,
                slotName: 'default',
                materialProjectId: existing.id,
                cssTarget: cssTarget ?? 'background-image',
              });
            } catch {
              // 槽位已存在，忽略
            }
          }
        }

        // ── 没有任何现有工程则创建新的 + 自动创建默认槽位 ──
        if (!mpId && !cancelled) {
          const nodeName = selectedStyles?.nodeName ?? '素材';
          const newSlotName = slotName ?? 'default';
          const { canvasWidth: cw2, canvasHeight: ch2 } = computeMaterialWorkspaceCanvasSize(
            componentSize.width,
            componentSize.height,
          );
          const created = await materialProjectApi.create(projectId, {
            name: `${nodeName}-${newSlotName}`,
            targetNodeId: targetNodeId ?? undefined,
            canvasWidth: cw2,
            canvasHeight: ch2,
            canvasJSON: {},
            referenceFrameWidth: componentSize.width,
            referenceFrameHeight: componentSize.height,
          });
          mpId = created.id;

          // 自动创建槽位关联
          if (targetNodeId && !cancelled) {
            try {
              await materialSlotApi.create(projectId, {
                nodeId: targetNodeId,
                slotName: newSlotName,
                materialProjectId: mpId,
                cssTarget: cssTarget ?? 'background-image',
              });
            } catch {
              // 槽位已存在，忽略
            }
          }
        }

        if (cancelled || !mpId) return;

        // 未从右键菜单传入 cssTarget 时，按「当前工程 id」在槽位表里反查，避免多槽位时误走 background 导出
        if (!cssTarget && targetNodeId && !cancelled) {
          try {
            const slotsAlign = await materialSlotApi.findByNode(projectId, targetNodeId);
            const slotForMp = slotsAlign.find((s) => s.materialProjectId === mpId);
            if (slotForMp?.cssTarget) {
              runInAction(() => {
                editorStore.materialEditorCssTarget = slotForMp.cssTarget;
              });
            }
          } catch {
            // ignore
          }
        }

        materialProjectIdRef.current = mpId;
        setMaterialProjectId(mpId);

        // 连接 WS 同步 — 传入 materialId
        materialEditorSync.connect(projectId, mpId);
        console.log(`[MaterialEditorModal] Connected to material project: ${mpId}`);
      } catch (err) {
        console.error('[MaterialEditorModal] Failed to create/find material project:', err);
      }
    })();

    return () => {
      cancelled = true;
      initializingRef.current = false;
      materialEditorSync.disconnect();
    };
  }, [targetNodeId, componentSize.width, componentSize.height, selectedStyles?.nodeName]);

  // 本地操作同步回调 — 发送到后端
  const handleOperation = useCallback((op: MaterialOperation, _result: unknown) => {
    if (materialProjectIdRef.current) {
      materialEditorSync.sendOperation(op);
    }
  }, []);

  const handleBatch = useCallback((ops: MaterialOperation[], _results: unknown[]) => {
    if (materialProjectIdRef.current) {
      materialEditorSync.sendBatch(ops);
    }
  }, []);

  const handleUndoRedo = useCallback((direction: 'undo' | 'redo', _result: unknown) => {
    const projectId = editorStore.project?.id;
    const mpId = materialProjectIdRef.current;
    if (!projectId || !mpId) return;

    fetch(`${API_BASE}/projects/${projectId}/materials/${mpId}/operations/${direction}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'user' }),
    }).catch((err) => {
      console.error(`[MaterialEditorModal] Failed to ${direction}:`, err);
    });
  }, []);

  return (
    <MaterialEditorProvider
      initialProject={initialSchema}
      onOperation={handleOperation}
      onBatch={handleBatch}
      onUndoRedo={handleUndoRedo}
    >
      <SyncBridge materialProjectId={materialProjectId} />
      <ModalContent
        targetNodeId={targetNodeId}
        onClose={onClose}
        selectedStyles={selectedStyles}
        componentSize={componentSize}
        materialProjectId={materialProjectId}
      />
    </MaterialEditorProvider>
  );
});

/**
 * SyncBridge — WS 同步桥接组件（必须在 MaterialEditorProvider 内部）
 *
 * 职责：
 *   1. 挂载时从后端加载完整 Schema，将后端对象合并到前端本地 Context
 *   2. 监听 WS 远程操作 → execute 到本地 Context → SVG 自动重渲染
 *   3. 监听 undo/redo 事件 → 重新加载 Schema
 *
 * 这是 MCP 远程操作实时反映到弹窗画布的关键。
 */
function SyncBridge({ materialProjectId }: { materialProjectId: string | null }) {
  const { execute, setProject } = useMaterialEditor();

  // 挂载时从后端加载已有对象，合并到前端本地 Context
  useEffect(() => {
    if (!materialProjectId) return;
    const projectId = editorStore.project?.id;
    if (!projectId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/projects/${projectId}/materials/${materialProjectId}/schema`,
        );
        if (!res.ok || cancelled) return;
        const backendSchema = await res.json() as MaterialProjectSchema;

        if (!cancelled) {
          // 必须用后端完整 Schema（含 defaultElementId / referenceFrame / 画布尺寸），
          // 勿再与本地 initialProject 拼接，否则会保留错误的 default_${modalId} 与错位参考框。
          const normalized = normalizeMaterialEditorSchema(backendSchema);
          setProject(normalized);
          console.log(
            `[SyncBridge] Loaded material schema v${normalized.version} (${normalized.objects?.length ?? 0} objects)`,
          );
        }
      } catch (err) {
        console.error('[SyncBridge] Failed to load backend schema:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [materialProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!materialProjectId) return;

    // 监听远程操作 → execute 到本地 Context
    const unsubOp = materialEditorSync.onOperation((envelope: MaterialOperationEnvelope) => {
      execute(envelope.operation);
    });

    // 监听 undo/redo 事件 → 重新加载 Schema
    const unsubUndo = materialEditorSync.onUndo(async (event) => {
      try {
        const projectId = editorStore.project?.id;
        if (!projectId || !event.materialId) return;
        const res = await fetch(
          `${API_BASE}/projects/${projectId}/materials/${event.materialId}/schema`,
        );
        if (res.ok) {
          const schema = await res.json() as MaterialProjectSchema;
          window.dispatchEvent(new CustomEvent('material-schema-reload', { detail: schema }));
        }
      } catch (err) {
        console.error('[SyncBridge] Failed to reload schema after undo:', err);
      }
    });

    return () => {
      unsubOp();
      unsubUndo();
    };
  }, [materialProjectId, execute]);

  return null;
}

interface ModalContentProps {
  targetNodeId: string | null;
  onClose: () => void;
  selectedStyles: ReturnType<typeof useTargetNodeStyles>;
  componentSize: { width: number; height: number };
  materialProjectId?: string | null;
}

/**
 * ModalContent — 使用 useMaterialEditor hook 的三栏内容
 */
function ModalContent({
  targetNodeId,
  onClose,
  selectedStyles,
  componentSize,
  materialProjectId,
}: ModalContentProps) {
  const { message } = AntdApp.useApp();
  const {
    state,
    execute,
    undo,
    redo,
    setTool,
    setZoom,
    getSelectedObjects,
  } = useMaterialEditor();

  const { tool: currentTool, zoom, canUndo, canRedo, selectedIds } = state;

  // ===== 工具状态 =====
  // 同步 engine Context 中的 tool 到本地 activeTool
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

  // 当引擎内部改变工具（如绘制完成后自动切回 select），同步到 activeTool
  useEffect(() => {
    if (currentTool !== activeTool && !isEffectTool(activeTool)) {
      setActiveTool(currentTool as ActiveTool);
    }
  }, [currentTool]);

  // ===== 选中对象 =====
  const selectedObject = useMemo<SelectedObjectInfo | null>(() => {
    if (selectedIds.length === 0) return null;
    const primaryId = selectedIds[0]!;
    const obj = state.project.objects.find((o) => o.id === primaryId);
    if (!obj) return null;
    const box = getOverlayBoundingBox(obj, state.project);
    const base = {
      type: obj.type ?? '',
      fill: typeof obj.fill === 'string' ? obj.fill : undefined,
      /** 原始 fill（含 GradientDef），供判断是否为渐变 */
      rawFill: obj.fill,
      stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      angle: obj.rotation,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      rx: obj.rx,
      ry: obj.ry,
    };
    if (obj.type === 'profiledStroke') {
      return {
        ...base,
        profiledGapDegrees: obj.profiledGapDegrees,
        profiledGapFeatherDegrees: obj.profiledGapFeatherDegrees,
        profiledSampleSegments: obj.profiledSampleSegments,
        profiledWidthStops: obj.profiledWidthStops,
        profiledColorStops: obj.profiledColorStops,
        profiledLineCap: obj.profiledLineCap,
      };
    }
    return base;
  }, [selectedIds, state.project]);

  // ===== 拖拽逻辑 =====
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 居中初始化
  useEffect(() => {
    if (pos.x < 0) {
      setPos({
        x: Math.max(0, (window.innerWidth - MODAL_WIDTH) / 2),
        y: Math.max(0, (window.innerHeight - MODAL_HEIGHT) / 2 - 20),
      });
    }
  }, [pos.x]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, .ant-select, .ant-slider, .ant-color-picker')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ===== 键盘快捷键 =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;

      // Escape 关闭
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
        return;
      }

      // 撤销 / 重做
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }

      // 删除（保护默认元素）
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        for (const id of selectedIds) {
          if (id === state.project.defaultElementId) continue;
          execute({ type: 'me:removeObject', params: { objectId: id } });
        }
      }

      // 复制
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        for (const id of selectedIds) {
          execute({ type: 'me:duplicateObject', params: { objectId: id, newObjectId: generateObjectId() } });
        }
      }

      // 工具快捷键
      if (!e.metaKey && !e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); setActiveTool('select'); break;
          case 'r': setTool('rect'); setActiveTool('rect'); break;
          case 'o': setTool('ellipse'); setActiveTool('ellipse'); break;
          case 'a': setTool('profiledStroke'); setActiveTool('profiledStroke'); break;
          case 'p': setTool('polygon'); setActiveTool('polygon'); break;
          case 'l': setTool('line'); setActiveTool('line'); break;
          case 'c': setTool('path'); setActiveTool('path'); break;
          case 's': setTool('star'); setActiveTool('star'); break;
          case 't': setTool('text'); setActiveTool('text'); break;
          case 'b': setTool('pencil'); setActiveTool('pencil'); break;
          case 'i': setTool('image'); setActiveTool('image'); break;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, undo, redo, execute, selectedIds, setTool]);

  // ===== 工具切换处理 =====
  const handleToolChange = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
    // 绘图工具和选择工具都需要同步到引擎
    if (!isEffectTool(tool)) {
      setTool(tool as MaterialToolType);
    }
  }, [setTool]);

  const handleApplyMaterialGradientFill = useCallback(
    (def: GradientDef) => {
      for (const id of selectedIds) {
        execute({ type: 'me:setFill', params: { objectId: id, fill: def } });
      }
      message.success('渐变已写入选中图层的填充');
    },
    [selectedIds, execute, message],
  );

  const materialGradientFillTarget = useMemo(() => {
    if (selectedIds.length === 0) return undefined;
    const obj = state.project.objects.find((o) => o.id === selectedIds[0]!);
    return {
      selectedIds,
      initialFill: obj?.fill,
      onApply: handleApplyMaterialGradientFill,
    };
  }, [selectedIds, state.project.objects, state.project.version, handleApplyMaterialGradientFill]);

  // ===== 属性变更 =====
  const handlePropertyChange = useCallback((updates: Record<string, unknown>) => {
    for (const id of selectedIds) {
      // 专有样式操作
      if (updates.fill !== undefined) {
        execute({
          type: 'me:setFill',
          params: { objectId: id, fill: updates.fill as string | GradientDef | null },
        });
      }
      if (updates.stroke !== undefined || updates.strokeWidth !== undefined) {
        execute({
          type: 'me:setStroke',
          params: {
            objectId: id,
            stroke: (updates.stroke as string) ?? selectedObject?.stroke ?? '#000000',
            strokeWidth: (updates.strokeWidth as number) ?? selectedObject?.strokeWidth ?? 1,
          },
        });
      }
      if (updates.opacity !== undefined) {
        execute({ type: 'me:setOpacity', params: { objectId: id, opacity: updates.opacity as number } });
      }

      // 变换属性 → 统一使用 me:updateObject
      const transformProps: Record<string, unknown> = {};
      if (updates.left !== undefined) transformProps.x = updates.left as number;
      if (updates.top !== undefined) transformProps.y = updates.top as number;
      if (updates.width !== undefined) transformProps.width = updates.width as number;
      if (updates.height !== undefined) transformProps.height = updates.height as number;
      if (updates.angle !== undefined) transformProps.rotation = updates.angle as number;

      if (Object.keys(transformProps).length > 0) {
        execute({
          type: 'me:updateObject',
          params: { objectId: id, props: transformProps },
        });
      }

      const styleProps: Record<string, unknown> = {};
      if (updates.rx !== undefined || updates.ry !== undefined) {
        const rx = (updates.rx ?? updates.ry) as number;
        const ry = (updates.ry ?? updates.rx) as number;
        styleProps.rx = rx;
        styleProps.ry = ry;
      }
      if (updates.mixBlendMode !== undefined) {
        styleProps.blendMode = updates.mixBlendMode as string;
      }
      if (Object.keys(styleProps).length > 0) {
        execute({
          type: 'me:updateObject',
          params: { objectId: id, props: styleProps },
        });
      }

      const profiledProps: Record<string, unknown> = {};
      if (updates.profiledGapDegrees !== undefined) {
        profiledProps.profiledGapDegrees = updates.profiledGapDegrees as number;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'profiledGapFeatherDegrees')) {
        profiledProps.profiledGapFeatherDegrees = updates.profiledGapFeatherDegrees as number | undefined;
      }
      if (updates.profiledSampleSegments !== undefined) {
        profiledProps.profiledSampleSegments = updates.profiledSampleSegments as number;
      }
      if (updates.profiledWidthStops !== undefined) {
        profiledProps.profiledWidthStops = updates.profiledWidthStops;
      }
      if (updates.profiledColorStops !== undefined) {
        profiledProps.profiledColorStops = updates.profiledColorStops;
      }
      if (updates.profiledLineCap !== undefined) {
        profiledProps.profiledLineCap = updates.profiledLineCap;
      }
      if (Object.keys(profiledProps).length > 0) {
        execute({
          type: 'me:updateObject',
          params: { objectId: id, props: profiledProps },
        });
      }
    }
  }, [selectedIds, execute, selectedObject]);

  // ===== 右侧面板模式计算 =====
  const rightPanelMode: RightPanelMode = useMemo(() => {
    if (isEffectTool(activeTool)) {
      return EFFECT_TO_PANEL[activeTool];
    }
    if (selectedObject) return 'object-props';
    return 'no-selection';
  }, [activeTool, selectedObject]);

  // ===== 查找目标节点 =====
  const node = targetNodeId ? findNodeInScreens(editorStore.screens, targetNodeId) : null;

  return (
    <>
      {/* 半透明遮罩 */}
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9990,
          background: 'rgba(0,0,0,0.18)',
        }}
        onClick={onClose}
      />

      {/* 浮层面板 — 统一三栏布局 */}
      <ConfigProvider theme={{ token: { zIndexPopupBase: 10000 } }}>
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            width: MODAL_WIDTH,
            height: MODAL_HEIGHT,
            zIndex: 9991,
            borderRadius: 12,
            /* 仅裁切圆角外溢出；子级画布区用 min-h-0 控制滚动，避免标尺负偏移被整块裁掉 */
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== 标题栏（可拖拽）===== */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 flex-shrink-0"
            style={{
              cursor: 'grab',
              background: 'linear-gradient(to bottom, #f8f9fa, #f1f3f5)',
              userSelect: 'none',
            }}
            onMouseDown={onDragStart}
          >
            <DragOutlined className="text-gray-400 text-xs" />
            <span className="font-medium text-sm text-gray-800">素材编辑器</span>
            {node && (
              <span className="text-[11px] text-gray-400 ml-1">
                — &lt;{node.type}&gt; {selectedStyles?.nodeName}
                {` (${componentSize.width}×${componentSize.height})`}
              </span>
            )}
            {!node && targetNodeId && (
              <span className="text-[11px] text-orange-400 ml-1">未找到目标节点</span>
            )}
            <span className="flex-1" />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            />
          </div>

          {/* ===== 三栏主体 ===== */}
          <div className="flex flex-1 min-h-0 min-w-0">
            {/* ① 左侧工具栏 (48px) */}
            <LeftToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
            />

            {/* ② 中间画布区 (flex) */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* SVG 画布 — 填满整个区域 */}
              <MaterialEditorCanvas
                className="flex-1 min-h-0"
                style={{ background: '#e8e8e8' }}
              />

              {/* 图层面板（可折叠） */}
              <LayerPanel />

              {/* 底部画布工具栏 */}
              <div className="flex items-center gap-1 px-2 py-1 bg-white border-t border-gray-200 flex-shrink-0">
                <Tooltip title="撤销 (⌘Z)">
                  <Button size="small" type="text" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
                </Tooltip>
                <Tooltip title="重做 (⌘⇧Z)">
                  <Button size="small" type="text" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
                </Tooltip>

                <div className="w-px h-4 bg-gray-200 mx-1" />

                <Tooltip title="删除">
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedIds.length === 0 || selectedIds.some((id) => id === state.project.defaultElementId)}
                    onClick={() => {
                      for (const id of selectedIds) {
                        if (id === state.project.defaultElementId) continue;
                        execute({ type: 'me:removeObject', params: { objectId: id } });
                      }
                    }}
                  />
                </Tooltip>
                <Tooltip title="复制">
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    disabled={selectedIds.length === 0}
                    onClick={() => {
                      for (const id of selectedIds) {
                        execute({ type: 'me:duplicateObject', params: { objectId: id, newObjectId: generateObjectId() } });
                      }
                    }}
                  />
                </Tooltip>

                {/* 对齐 — 选中 ≥2 个对象时显示 */}
                {selectedIds.length >= 2 && (
                  <>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <Tooltip title="左对齐">
                      <Button size="small" type="text" icon={<AlignLeftOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'left' } })}
                      />
                    </Tooltip>
                    <Tooltip title="水平居中对齐">
                      <Button size="small" type="text" icon={<AlignCenterOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'center' } })}
                      />
                    </Tooltip>
                    <Tooltip title="右对齐">
                      <Button size="small" type="text" icon={<AlignRightOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'right' } })}
                      />
                    </Tooltip>
                    <Tooltip title="顶部对齐">
                      <Button size="small" type="text" icon={<VerticalAlignTopOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'top' } })}
                      />
                    </Tooltip>
                    <Tooltip title="垂直居中对齐">
                      <Button size="small" type="text" icon={<VerticalAlignMiddleOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'middle' } })}
                      />
                    </Tooltip>
                    <Tooltip title="底部对齐">
                      <Button size="small" type="text" icon={<VerticalAlignBottomOutlined />}
                        onClick={() => execute({ type: 'me:alignObjects', params: { objectIds: selectedIds, alignment: 'bottom' } })}
                      />
                    </Tooltip>
                  </>
                )}

                {/* 分布 — 选中 ≥3 个对象时显示 */}
                {selectedIds.length >= 3 && (
                  <>
                    <Tooltip title="水平等距分布">
                      <Button size="small" type="text" icon={<ColumnWidthOutlined />}
                        onClick={() => execute({ type: 'me:distributeObjects', params: { objectIds: selectedIds, axis: 'horizontal' } })}
                      />
                    </Tooltip>
                    <Tooltip title="垂直等距分布">
                      <Button size="small" type="text" icon={<ColumnHeightOutlined />}
                        onClick={() => execute({ type: 'me:distributeObjects', params: { objectIds: selectedIds, axis: 'vertical' } })}
                      />
                    </Tooltip>
                  </>
                )}

                {/* 分组 — 选中 ≥2 个对象时显示 */}
                {selectedIds.length >= 2 && (
                  <>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <Tooltip title="编组">
                      <Button size="small" type="text" icon={<GroupOutlined />}
                        onClick={() => execute({ type: 'me:groupObjects', params: { objectIds: selectedIds } })}
                      />
                    </Tooltip>
                  </>
                )}

                {/* 取消分组 — 选中单个 group 时显示 */}
                {selectedIds.length === 1 && (() => {
                  const obj = getSelectedObjects()[0];
                  return obj?.type === 'group';
                })() && (
                  <Tooltip title="取消编组">
                    <Button size="small" type="text" icon={<UngroupOutlined />}
                      onClick={() => execute({ type: 'me:ungroupObjects', params: { groupId: selectedIds[0]! } })}
                    />
                  </Tooltip>
                )}

                {/* 布尔运算 — 选中 2 个对象时显示 */}
                {selectedIds.length === 2 && (
                  <>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <Tooltip title="合并（并集）">
                      <Button size="small" type="text" icon={<MergeCellsOutlined />}
                        onClick={() => execute({
                          type: 'me:booleanOp',
                          params: { targetId: selectedIds[0]!, toolId: selectedIds[1]!, opType: 'union' },
                        })}
                      />
                    </Tooltip>
                    <Tooltip title="减去（差集）">
                      <Button size="small" type="text" icon={<ScissorOutlined />}
                        onClick={() => execute({
                          type: 'me:booleanOp',
                          params: { targetId: selectedIds[0]!, toolId: selectedIds[1]!, opType: 'subtract' },
                        })}
                      />
                    </Tooltip>
                    <Tooltip title="相交（交集）">
                      <Button size="small" type="text" icon={<BlockOutlined />}
                        onClick={() => execute({
                          type: 'me:booleanOp',
                          params: { targetId: selectedIds[0]!, toolId: selectedIds[1]!, opType: 'intersect' },
                        })}
                      />
                    </Tooltip>
                    <Tooltip title="排除（对称差）">
                      <Button size="small" type="text" icon={<GatewayOutlined />}
                        onClick={() => execute({
                          type: 'me:booleanOp',
                          params: { targetId: selectedIds[0]!, toolId: selectedIds[1]!, opType: 'exclude' },
                        })}
                      />
                    </Tooltip>
                  </>
                )}

                <span className="flex-1" />

                {/* 缩放控制 */}
                <Tooltip title="缩小">
                  <Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} />
                </Tooltip>
                <span className="text-[10px] text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Tooltip title="放大">
                  <Button size="small" type="text" icon={<ZoomInOutlined />} onClick={() => setZoom(Math.min(5, zoom + 0.1))} />
                </Tooltip>
                <Tooltip title="重置缩放">
                  <Button size="small" type="text" icon={<ExpandOutlined />} onClick={() => setZoom(1)} />
                </Tooltip>
              </div>
            </div>

            {/* ③ 右侧属性面板 (220px) */}
            <RightPropertyPanel
              mode={rightPanelMode}
              selectedObject={selectedObject}
              selectionCount={selectedIds.length}
              onPropertyChange={handlePropertyChange}
              currentBackground={selectedStyles?.background}
              currentFilter={selectedStyles?.filter}
              currentBoxShadow={selectedStyles?.boxShadow}
              currentTextShadow={selectedStyles?.textShadow}
              materialGradientFill={materialGradientFillTarget}
            />
          </div>

          {/* ===== 底部导出栏 ===== */}
          <ExportBar
            targetNodeId={targetNodeId}
            onClose={onClose}
            materialProjectId={materialProjectId}
            cssTarget={editorStore.materialEditorCssTarget}
          />
        </div>
      </ConfigProvider>
    </>
  );
}
