/**
 * MaterialEditorCanvas — 素材编辑器完整画布
 *
 * 组合所有层：
 *   1. SVG 渲染（MaterialRenderer）
 *   2. 栅格叠加（CanvasGrid）
 *   3. 标尺（CanvasRuler）
 *   4. 选中/拖拽/缩放/旋转（SelectionOverlay）
 *   5. 对齐线（SmartGuides）
 *   6. ★ 绘图交互 — 用户使用工具在画布上拖拽创建图形 → me:addObject
 *   7. 画布居中 + 棋盘格背景
 *
 * 使用方式：
 *   <MaterialEditorProvider initialProject={project}>
 *     <MaterialEditorCanvas />
 *   </MaterialEditorProvider>
 */
import { useRef, useCallback, useState, useEffect, type WheelEvent } from 'react';
import { useMaterialEditor, type MaterialToolType } from './context/MaterialEditorContext';
import { generateObjectId, type MaterialObjectType } from '@globallink/material-operations';
import { MaterialRenderer } from './renderer/MaterialRenderer';
import { SelectionOverlay } from './overlay/SelectionOverlay';
import { SmartGuides } from './overlay/SmartGuides';
import { CanvasGrid } from './overlay/CanvasGrid';
import { CanvasRuler, RULER_SIZE } from './overlay/CanvasRuler';

interface MaterialEditorCanvasProps {
  /** 自定义 className（外部容器） */
  className?: string;
  /** 自定义 style（外部容器） */
  style?: React.CSSProperties;
  /** 是否显示栅格（默认 true） */
  showGrid?: boolean;
  /** 是否显示标尺（默认 true） */
  showRuler?: boolean;
  /** 是否显示图层面板（由 Modal 外部控制） */
  showLayers?: boolean;
}

/** 工具 → 对象类型映射（拖拽创建模式的工具） */
const TOOL_TO_OBJECT_TYPE: Partial<Record<MaterialToolType, MaterialObjectType>> = {
  rect: 'rect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  star: 'star',
  line: 'line',
  text: 'textbox',
  image: 'image',
};

/** 判断工具是否是拖拽创建模式的绘图工具 */
function isDrawingTool(tool: MaterialToolType): boolean {
  return tool in TOOL_TO_OBJECT_TYPE;
}

/** 判断工具是否是钢笔工具（点击式创建路径） */
function isPenTool(tool: MaterialToolType): boolean {
  return tool === 'path';
}

/** 判断工具是否是铅笔工具（自由绘制） */
function isPencilTool(tool: MaterialToolType): boolean {
  return tool === 'pencil';
}

// ===== 钢笔工具 — 锚点数据结构 =====

interface PenAnchor {
  /** 锚点坐标 */
  x: number;
  y: number;
  /** 入方向控制手柄（相对于锚点的偏移，用于 C 命令的 cp2） */
  handleIn?: { x: number; y: number };
  /** 出方向控制手柄（相对于锚点的偏移，用于 C 命令的 cp1） */
  handleOut?: { x: number; y: number };
}

/** 将锚点列表转为 SVG path d 属性 */
function anchorsToPathD(anchors: PenAnchor[], closed: boolean): string {
  if (anchors.length === 0) return '';
  const first = anchors[0]!;
  let d = `M ${first.x} ${first.y}`;

  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1]!;
    const curr = anchors[i]!;
    const hasCP1 = prev.handleOut && (prev.handleOut.x !== 0 || prev.handleOut.y !== 0);
    const hasCP2 = curr.handleIn && (curr.handleIn.x !== 0 || curr.handleIn.y !== 0);

    if (hasCP1 || hasCP2) {
      // 三次贝塞尔曲线
      const cp1x = prev.x + (prev.handleOut?.x ?? 0);
      const cp1y = prev.y + (prev.handleOut?.y ?? 0);
      const cp2x = curr.x + (curr.handleIn?.x ?? 0);
      const cp2y = curr.y + (curr.handleIn?.y ?? 0);
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    } else {
      // 直线段
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  if (closed) d += ' Z';
  return d;
}

/** 计算锚点列表的边界框 */
function anchorsBounds(anchors: PenAnchor[]): { x: number; y: number; width: number; height: number } {
  if (anchors.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const a of anchors) {
    minX = Math.min(minX, a.x);
    minY = Math.min(minY, a.y);
    maxX = Math.max(maxX, a.x);
    maxY = Math.max(maxY, a.y);
    // 也考虑控制手柄的范围
    if (a.handleIn) {
      minX = Math.min(minX, a.x + a.handleIn.x);
      minY = Math.min(minY, a.y + a.handleIn.y);
      maxX = Math.max(maxX, a.x + a.handleIn.x);
      maxY = Math.max(maxY, a.y + a.handleIn.y);
    }
    if (a.handleOut) {
      minX = Math.min(minX, a.x + a.handleOut.x);
      minY = Math.min(minY, a.y + a.handleOut.y);
      maxX = Math.max(maxX, a.x + a.handleOut.x);
      maxY = Math.max(maxY, a.y + a.handleOut.y);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 最小绘制尺寸（避免 0x0 对象） */
const MIN_DRAW_SIZE = 4;

/** 仅编辑器 UI：衬在 SVG 下方，便于查看纯白/透明图形；不写入 project、不参与导出逻辑。 */
const WORKBENCH_BACKDROP_KEY = 'material-engine-workbench-backdrop';

type WorkbenchBackdrop = 'default' | 'dark' | 'checker';

function loadWorkbenchBackdrop(): WorkbenchBackdrop {
  try {
    const v = sessionStorage.getItem(WORKBENCH_BACKDROP_KEY);
    if (v === 'dark' || v === 'checker') return v;
  } catch {
    /* ignore */
  }
  return 'default';
}

function saveWorkbenchBackdrop(v: WorkbenchBackdrop) {
  try {
    if (v === 'default') sessionStorage.removeItem(WORKBENCH_BACKDROP_KEY);
    else sessionStorage.setItem(WORKBENCH_BACKDROP_KEY, v);
  } catch {
    /* ignore */
  }
}

/** 绘图预览（拖拽过程中的临时矩形） */
interface DrawPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function MaterialEditorCanvas({
  className,
  style,
  showGrid = true,
  showRuler = true,
}: MaterialEditorCanvasProps) {
  const { state, execute, setZoom, setTool, setSelected } = useMaterialEditor();
  const { project, zoom, tool, selectedIds } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [drawPreview, setDrawPreview] = useState<DrawPreview | null>(null);
  const [workbenchBackdrop, setWorkbenchBackdropState] = useState<WorkbenchBackdrop>(loadWorkbenchBackdrop);

  const setWorkbenchBackdrop = useCallback((v: WorkbenchBackdrop) => {
    setWorkbenchBackdropState(v);
    saveWorkbenchBackdrop(v);
  }, []);

  // 用于保存 space 键按下前的工具
  const prevToolRef = useRef<MaterialToolType>('select');

  // ===== 钢笔工具状态 =====
  const [penAnchors, setPenAnchors] = useState<PenAnchor[]>([]);
  const [penDragging, setPenDragging] = useState(false);
  const [penMousePos, setPenMousePos] = useState<{ x: number; y: number } | null>(null);
  const penAnchorsRef = useRef<PenAnchor[]>([]);

  // ===== 铅笔工具状态（自由绘制） =====
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([]);
  const pencilDrawingRef = useRef(false);

  // 拖拽状态上报（连接 SmartGuides）
  const handleDraggingChange = useCallback((d: boolean) => {
    setIsDragging(d);
  }, []);

  // ===== 坐标转换：屏幕坐标 → SVG 画布坐标 =====

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const container = svgContainerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom],
  );

  // ===== 缩放（滚轮） =====

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(zoom + delta);
      }
      // 普通滚轮不拦截，让浏览器原生 overflow:auto 滚动
    },
    [zoom, setZoom],
  );

  // ===== 平移辅助 =====

  const startPan = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    const sx = e.clientX;
    const sy = e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;

    const handleMove = (me: MouseEvent) => {
      container.scrollLeft = startScrollLeft - (me.clientX - sx);
      container.scrollTop = startScrollTop - (me.clientY - sy);
    };
    const handleUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  // ===== 钢笔工具 — 完成路径 =====

  const finishPenPath = useCallback(
    (anchors: PenAnchor[], closed: boolean) => {
      if (anchors.length < 2) {
        setPenAnchors([]);
        penAnchorsRef.current = [];
        setPenMousePos(null);
        return;
      }

      const bounds = anchorsBounds(anchors);
      // 防止 0 尺寸
      const w = Math.max(1, bounds.width);
      const h = Math.max(1, bounds.height);

      // 归一化坐标到局部坐标系（减去 bounds 原点）
      const normalizedAnchors: PenAnchor[] = anchors.map((a) => ({
        x: a.x - bounds.x,
        y: a.y - bounds.y,
        handleIn: a.handleIn ? { ...a.handleIn } : undefined,
        handleOut: a.handleOut ? { ...a.handleOut } : undefined,
      }));

      const pathData = anchorsToPathD(normalizedAnchors, closed);
      const newId = generateObjectId();

      const result = execute({
        type: 'me:addObject',
        params: {
          object: {
            type: 'path' as const,
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(w),
            height: Math.round(h),
            fill: 'none',
            stroke: '#333333',
            strokeWidth: 2,
            pathData,
          },
          objectId: newId,
        },
      });

      if (result.success) {
        setSelected([newId]);
        setTool('select');
      }

      // 清理钢笔状态
      setPenAnchors([]);
      penAnchorsRef.current = [];
      setPenMousePos(null);
    },
    [execute, setSelected, setTool],
  );

  // ===== 铅笔工具 — 完成自由绘制路径 =====

  const finishPencilPath = useCallback(
    (points: { x: number; y: number }[]) => {
      if (points.length < 2) {
        setPencilPoints([]);
        return;
      }

      // 简化点集（Douglas-Peucker 简化或取每 N 个点）
      const simplified = simplifyPoints(points, 2);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of simplified) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      // 归一化
      const norm = simplified.map((p) => ({ x: p.x - minX, y: p.y - minY }));
      let pathData = `M ${norm[0]!.x} ${norm[0]!.y}`;
      for (let i = 1; i < norm.length; i++) {
        pathData += ` L ${norm[i]!.x} ${norm[i]!.y}`;
      }

      const newId = generateObjectId();
      const result = execute({
        type: 'me:addObject',
        params: {
          object: {
            type: 'path' as const,
            x: Math.round(minX),
            y: Math.round(minY),
            width: Math.round(w),
            height: Math.round(h),
            fill: 'none',
            stroke: '#333333',
            strokeWidth: 2,
            pathData,
          },
          objectId: newId,
        },
      });

      if (result.success) {
        setSelected([newId]);
        setTool('select');
      }

      setPencilPoints([]);
    },
    [execute, setSelected, setTool],
  );

  // ===== 创建对象 =====

  const createObject = useCallback(
    (
      currentTool: MaterialToolType,
      x: number,
      y: number,
      width: number,
      height: number,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ) => {
      const objType = TOOL_TO_OBJECT_TYPE[currentTool];
      if (!objType) return;

      const newId = generateObjectId();

      const baseProps: Record<string, unknown> = {
        type: objType,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(Math.max(1, width)),
        height: Math.round(Math.max(1, height)),
      };

      switch (objType) {
        case 'rect':
          baseProps.fill = '#4A90D9';
          baseProps.rx = 0;
          baseProps.ry = 0;
          break;
        case 'ellipse':
          baseProps.fill = '#4A90D9';
          break;
        case 'polygon':
          baseProps.fill = '#4A90D9';
          baseProps.sides = 6;
          break;
        case 'star':
          baseProps.fill = '#FFD700';
          baseProps.points = 5;
          baseProps.innerRatio = 0.4;
          break;
        case 'line':
          baseProps.fill = null;
          baseProps.stroke = '#333333';
          baseProps.strokeWidth = 2;
          baseProps.x1 = 0;
          baseProps.y1 = 0;
          baseProps.x2 = Math.round(endX - startX);
          baseProps.y2 = Math.round(endY - startY);
          baseProps.x = Math.round(Math.min(startX, endX));
          baseProps.y = Math.round(Math.min(startY, endY));
          baseProps.width = Math.round(Math.abs(endX - startX)) || 1;
          baseProps.height = Math.round(Math.abs(endY - startY)) || 1;
          break;
        case 'textbox':
          baseProps.fill = '#333333';
          baseProps.text = '双击编辑文字';
          baseProps.fontSize = 16;
          baseProps.fontFamily = 'sans-serif';
          baseProps.width = Math.max(120, Math.round(width));
          baseProps.height = Math.max(32, Math.round(height));
          break;
        case 'image':
          baseProps.fill = null;
          baseProps.src = '';
          baseProps.width = Math.max(100, Math.round(width));
          baseProps.height = Math.max(80, Math.round(height));
          break;
      }

      const result = execute({
        type: 'me:addObject',
        params: {
          object: baseProps as any,
          objectId: newId,
        },
      });

      if (result.success) {
        setSelected([newId]);
        setTool('select');
      }
    },
    [execute, setSelected, setTool],
  );

  // ===== 画布上的 mouseDown — 绘图或平移 =====

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // --- 中键平移 ---
      if (e.button === 1) {
        e.preventDefault();
        startPan(e);
        return;
      }

      if (e.button !== 0) return;

      // --- hand 工具平移 ---
      if (tool === 'hand') {
        e.preventDefault();
        startPan(e);
        return;
      }

      // --- 钢笔工具 — 点击式贝塞尔曲线创建 ---
      if (isPenTool(tool)) {
        e.preventDefault();
        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        if (
          canvasPos.x < 0 || canvasPos.y < 0 ||
          canvasPos.x > project.canvasWidth || canvasPos.y > project.canvasHeight
        ) {
          return;
        }

        // 检查是否双击（点击第一个锚点附近 → 闭合路径）
        const currentAnchors = penAnchorsRef.current;
        if (currentAnchors.length >= 2) {
          const first = currentAnchors[0]!;
          const dist = Math.hypot(canvasPos.x - first.x, canvasPos.y - first.y);
          if (dist < 8) {
            // 闭合路径
            finishPenPath(currentAnchors, true);
            return;
          }
        }

        // 添加新锚点
        const newAnchor: PenAnchor = { x: canvasPos.x, y: canvasPos.y };
        const updatedAnchors = [...currentAnchors, newAnchor];
        setPenAnchors(updatedAnchors);
        penAnchorsRef.current = updatedAnchors;
        setPenDragging(true);

        const anchorIndex = updatedAnchors.length - 1;
        const startX = canvasPos.x;
        const startY = canvasPos.y;

        // 拖拽创建控制手柄
        const handleMove = (me: MouseEvent) => {
          const pos = screenToCanvas(me.clientX, me.clientY);
          const dx = pos.x - startX;
          const dy = pos.y - startY;

          // 只有拖拽距离 > 3px 才生成贝塞尔曲线手柄
          if (Math.hypot(dx, dy) > 3) {
            const newAnchors = [...penAnchorsRef.current];
            const anchor = newAnchors[anchorIndex];
            if (anchor) {
              // handleOut 方向跟鼠标拖拽方向一致
              anchor.handleOut = { x: dx, y: dy };
              // handleIn 是反方向（对称手柄）
              anchor.handleIn = { x: -dx, y: -dy };
              penAnchorsRef.current = newAnchors;
              setPenAnchors(newAnchors);
            }
          }
        };

        const handleUp = () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);
          setPenDragging(false);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return;
      }

      // --- 铅笔工具 — 自由绘制 ---
      if (isPencilTool(tool)) {
        e.preventDefault();
        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        if (
          canvasPos.x < 0 || canvasPos.y < 0 ||
          canvasPos.x > project.canvasWidth || canvasPos.y > project.canvasHeight
        ) {
          return;
        }

        pencilDrawingRef.current = true;
        const pts = [canvasPos];
        setPencilPoints(pts);

        const handleMove = (me: MouseEvent) => {
          if (!pencilDrawingRef.current) return;
          const pos = screenToCanvas(me.clientX, me.clientY);
          pts.push(pos);
          setPencilPoints([...pts]);
        };

        const handleUp = () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);
          pencilDrawingRef.current = false;
          finishPencilPath(pts);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return;
      }

      // --- 拖拽创建模式的绘图工具 ---
      if (isDrawingTool(tool)) {
        e.preventDefault();
        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        if (
          canvasPos.x < 0 ||
          canvasPos.y < 0 ||
          canvasPos.x > project.canvasWidth ||
          canvasPos.y > project.canvasHeight
        ) {
          return;
        }

        const startX = canvasPos.x;
        const startY = canvasPos.y;

        setDrawPreview({ x: startX, y: startY, width: 0, height: 0 });

        const handleMove = (me: MouseEvent) => {
          const currentPos = screenToCanvas(me.clientX, me.clientY);
          const x = Math.min(startX, currentPos.x);
          const y = Math.min(startY, currentPos.y);
          const width = Math.abs(currentPos.x - startX);
          const height = Math.abs(currentPos.y - startY);

          if (me.shiftKey) {
            const size = Math.max(width, height);
            setDrawPreview({
              x: currentPos.x < startX ? startX - size : startX,
              y: currentPos.y < startY ? startY - size : startY,
              width: size,
              height: size,
            });
          } else {
            setDrawPreview({ x, y, width, height });
          }
        };

        const handleUp = (me: MouseEvent) => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);

          const endPos = screenToCanvas(me.clientX, me.clientY);
          let finalX = Math.min(startX, endPos.x);
          let finalY = Math.min(startY, endPos.y);
          let finalW = Math.abs(endPos.x - startX);
          let finalH = Math.abs(endPos.y - startY);

          if (me.shiftKey) {
            const size = Math.max(finalW, finalH);
            finalX = endPos.x < startX ? startX - size : startX;
            finalY = endPos.y < startY ? startY - size : startY;
            finalW = size;
            finalH = size;
          }

          if (finalW < MIN_DRAW_SIZE && finalH < MIN_DRAW_SIZE) {
            finalW = tool === 'line' ? 150 : 100;
            finalH = tool === 'line' ? 0 : 80;
            finalX = startX - finalW / 2;
            finalY = startY - finalH / 2;
          }

          setDrawPreview(null);
          createObject(tool, finalX, finalY, finalW, finalH, startX, startY, endPos.x, endPos.y);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return;
      }

      // --- select 工具：点击空白区域取消选中 ---
      if (tool === 'select') {
        const target = e.target as HTMLElement;
        if (
          target.dataset.canvasBg === 'true' ||
          target.dataset.checkerboard === 'true' ||
          target === containerRef.current
        ) {
          setSelected([]);
        }
      }
    },
    [tool, project.canvasWidth, project.canvasHeight, screenToCanvas, setSelected, startPan, createObject, finishPenPath, finishPencilPath],
  );

  // ===== 钢笔工具 — 鼠标移动跟踪（预览线段） =====

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPenTool(tool) && penAnchorsRef.current.length > 0 && !penDragging) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setPenMousePos(pos);
      }
    },
    [tool, penDragging, screenToCanvas],
  );

  // ===== 钢笔工具 — 双击完成（不闭合） =====

  const handleCanvasDblClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPenTool(tool) && penAnchorsRef.current.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        finishPenPath(penAnchorsRef.current, false);
      }
    },
    [tool, finishPenPath],
  );

  // ===== 键盘快捷键 =====

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Enter — 完成钢笔路径（不闭合）
      if (e.code === 'Enter' && isPenTool(tool) && penAnchorsRef.current.length >= 2) {
        e.preventDefault();
        finishPenPath(penAnchorsRef.current, false);
        return;
      }

      // Escape — 如果有钢笔路径正在绘制，完成它或取消
      if (e.code === 'Escape' && isPenTool(tool)) {
        e.preventDefault();
        if (penAnchorsRef.current.length >= 2) {
          finishPenPath(penAnchorsRef.current, false);
        } else {
          // 不够 2 个锚点，直接取消
          setPenAnchors([]);
          penAnchorsRef.current = [];
          setPenMousePos(null);
          setTool('select');
        }
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        prevToolRef.current = tool;
        setTool('hand');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setTool(prevToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, setTool, finishPenPath]);

  // ===== 切换工具时清理钢笔状态 =====
  useEffect(() => {
    if (!isPenTool(tool)) {
      if (penAnchorsRef.current.length >= 2) {
        finishPenPath(penAnchorsRef.current, false);
      } else {
        setPenAnchors([]);
        penAnchorsRef.current = [];
        setPenMousePos(null);
      }
    }
  }, [tool, finishPenPath]);

  // ===== 渲染 =====

  const canvasW = project.canvasWidth * zoom;
  const canvasH = project.canvasHeight * zoom;

  // 画布在容器中居中的 padding（标尺需要额外空间）
  const CANVAS_PADDING = 60;
  /** 标尺用 absolute 负偏移画在画布外，须在可滚动区内用 padding 留出空间，否则 overflow:auto 会裁掉左侧垂直标尺 */
  const rulerPad = showRuler ? RULER_SIZE : 0;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* 仅中间区域滚动；工作台控件挂在外层，不随画布滚动 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: '#e8e8e8',
          cursor: getCursor(tool, isPanning, isDragging),
        }}
        onWheel={handleWheel}
      >
        {/* 居中容器 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100%',
            minHeight: '100%',
            paddingTop: CANVAS_PADDING + rulerPad,
            paddingLeft: CANVAS_PADDING + rulerPad,
            paddingRight: CANVAS_PADDING,
            paddingBottom: CANVAS_PADDING,
          }}
        >
          {/* 画布外壳 — 投影 + 标尺 */}
          <div
            ref={svgContainerRef}
            style={{
              position: 'relative',
              width: canvasW,
              height: canvasH,
              flexShrink: 0,
              boxShadow: '0 2px 16px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
              borderRadius: 2,
              overflow: 'visible',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onDoubleClick={handleCanvasDblClick}
          >
            {/* 标尺 */}
            {showRuler && <CanvasRuler visible={showRuler} />}

            {/* SVG 渲染层 — 勿加 z-index，否则会盖住后面的网格/选中框；深色/棋盘格画在画布底 rect 上 */}
            <MaterialRenderer
              className="material-renderer-svg"
              workbenchBackdrop={workbenchBackdrop}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasW,
                height: canvasH,
              }}
            />

          {/* 栅格叠加层 */}
          {showGrid && <CanvasGrid showGrid={showGrid} />}

          {/* 交互覆盖层（选中框、拖拽、旋转） */}
          <SelectionOverlay onDraggingChange={handleDraggingChange} />

          {/* 对齐线 */}
          <SmartGuides enabled={isDragging} />

          {/* 绘图预览层 */}
          {drawPreview && drawPreview.width > 0 && drawPreview.height > 0 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasW,
                height: canvasH,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
              viewBox={`0 0 ${project.canvasWidth} ${project.canvasHeight}`}
            >
              <DrawPreviewShape
                tool={tool}
                x={drawPreview.x}
                y={drawPreview.y}
                width={drawPreview.width}
                height={drawPreview.height}
              />
            </svg>
          )}

          {/* 钢笔工具预览层 */}
          {penAnchors.length > 0 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasW,
                height: canvasH,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
              viewBox={`0 0 ${project.canvasWidth} ${project.canvasHeight}`}
            >
              <PenPreview
                anchors={penAnchors}
                mousePos={penMousePos}
                isDragging={penDragging}
              />
            </svg>
          )}

          {/* 铅笔工具预览层 */}
          {pencilPoints.length > 1 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasW,
                height: canvasH,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
              viewBox={`0 0 ${project.canvasWidth} ${project.canvasHeight}`}
            >
              <PencilPreview points={pencilPoints} />
            </svg>
          )}
          </div>
        </div>
      </div>

      {/* 工作台背景（仅预览）：纯白元素在默认灰底上不易分辨时可切深色/棋盘格 */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          fontSize: 12,
          color: '#333',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', userSelect: 'none' }}>工作台背景</span>
        <select
          aria-label="工作台背景"
          value={workbenchBackdrop}
          onChange={(e) => setWorkbenchBackdrop(e.target.value as WorkbenchBackdrop)}
          style={{
            fontSize: 12,
            maxWidth: 120,
            borderRadius: 4,
            border: '1px solid #ccc',
            padding: '2px 4px',
            background: '#fff',
          }}
        >
          <option value="default">默认（跟画布）</option>
          <option value="dark">深色衬底</option>
          <option value="checker">棋盘格</option>
        </select>
      </div>
    </div>
  );
}

// ===== 绘图预览 SVG 形状 =====

function DrawPreviewShape({
  tool,
  x,
  y,
  width,
  height,
}: {
  tool: MaterialToolType;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const commonStyle = {
    fill: 'rgba(74, 144, 217, 0.15)',
    stroke: '#1677ff',
    strokeWidth: 1,
    strokeDasharray: '4 2',
  };

  switch (tool) {
    case 'rect':
      return <rect x={x} y={y} width={width} height={height} {...commonStyle} />;
    case 'ellipse':
      return (
        <ellipse
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          {...commonStyle}
        />
      );
    case 'polygon':
    case 'star':
      return <rect x={x} y={y} width={width} height={height} {...commonStyle} rx={2} />;
    case 'line':
      return (
        <line
          x1={x}
          y1={y}
          x2={x + width}
          y2={y + height}
          stroke="#1677ff"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      );
    case 'text':
      return (
        <g>
          <rect x={x} y={y} width={width} height={height} {...commonStyle} fill="rgba(51,51,51,0.05)" />
          <text x={x + 4} y={y + height / 2 + 4} fontSize={12} fill="#999" pointerEvents="none">
            文字区域
          </text>
        </g>
      );
    case 'image':
      return (
        <g>
          <rect x={x} y={y} width={width} height={height} {...commonStyle} fill="rgba(0,0,0,0.03)" />
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#999">
            🖼
          </text>
        </g>
      );
    default:
      return null;
  }
}

// ===== 钢笔工具预览 =====

function PenPreview({
  anchors,
  mousePos,
  isDragging,
}: {
  anchors: PenAnchor[];
  mousePos: { x: number; y: number } | null;
  isDragging: boolean;
}) {
  if (anchors.length === 0) return null;

  // 已确认的路径段
  const confirmedPath = anchorsToPathD(anchors, false);

  // 从最后一个锚点到鼠标位置的预览线
  const lastAnchor = anchors[anchors.length - 1]!;
  let previewLine: string | null = null;
  if (mousePos && !isDragging && anchors.length >= 1) {
    if (lastAnchor.handleOut && (lastAnchor.handleOut.x !== 0 || lastAnchor.handleOut.y !== 0)) {
      // 有控制手柄 → 预览贝塞尔曲线（从最后锚点到鼠标）
      const cp1x = lastAnchor.x + lastAnchor.handleOut.x;
      const cp1y = lastAnchor.y + lastAnchor.handleOut.y;
      previewLine = `M ${lastAnchor.x} ${lastAnchor.y} C ${cp1x} ${cp1y}, ${mousePos.x} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;
    } else {
      previewLine = `M ${lastAnchor.x} ${lastAnchor.y} L ${mousePos.x} ${mousePos.y}`;
    }
  }

  // 闭合提示（鼠标靠近第一个锚点时高亮）
  let closeHighlight = false;
  if (mousePos && anchors.length >= 2) {
    const first = anchors[0]!;
    const dist = Math.hypot(mousePos.x - first.x, mousePos.y - first.y);
    closeHighlight = dist < 8;
  }

  return (
    <g>
      {/* 已确认路径 */}
      <path
        d={confirmedPath}
        fill="none"
        stroke="#1677ff"
        strokeWidth={2}
      />

      {/* 预览线（虚线） */}
      {previewLine && (
        <path
          d={previewLine}
          fill="none"
          stroke="#1677ff"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}

      {/* 锚点 */}
      {anchors.map((a, i) => (
        <g key={i}>
          {/* 控制手柄线 */}
          {a.handleOut && (a.handleOut.x !== 0 || a.handleOut.y !== 0) && (
            <>
              <line
                x1={a.x}
                y1={a.y}
                x2={a.x + a.handleOut.x}
                y2={a.y + a.handleOut.y}
                stroke="#ff6600"
                strokeWidth={1}
                opacity={0.7}
              />
              <circle
                cx={a.x + a.handleOut.x}
                cy={a.y + a.handleOut.y}
                r={3}
                fill="#ff6600"
                opacity={0.8}
              />
            </>
          )}
          {a.handleIn && (a.handleIn.x !== 0 || a.handleIn.y !== 0) && (
            <>
              <line
                x1={a.x}
                y1={a.y}
                x2={a.x + a.handleIn.x}
                y2={a.y + a.handleIn.y}
                stroke="#ff6600"
                strokeWidth={1}
                opacity={0.7}
              />
              <circle
                cx={a.x + a.handleIn.x}
                cy={a.y + a.handleIn.y}
                r={3}
                fill="#ff6600"
                opacity={0.8}
              />
            </>
          )}
          {/* 锚点圆圈 */}
          <circle
            cx={a.x}
            cy={a.y}
            r={i === 0 && closeHighlight ? 6 : 4}
            fill={i === 0 ? '#fff' : '#1677ff'}
            stroke={i === 0 && closeHighlight ? '#ff3300' : '#1677ff'}
            strokeWidth={i === 0 && closeHighlight ? 2.5 : 2}
          />
        </g>
      ))}
    </g>
  );
}

// ===== 铅笔工具预览 =====

function PencilPreview({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return null;
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x} ${points[i]!.y}`;
  }
  return (
    <path
      d={d}
      fill="none"
      stroke="#1677ff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// ===== 点简化（Douglas-Peucker 简化版） =====

function simplifyPoints(
  pts: { x: number; y: number }[],
  tolerance: number,
): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;

  // 简单的采样简化：每隔 N 个点取一个
  const result: { x: number; y: number }[] = [pts[0]!];
  const step = Math.max(1, Math.floor(tolerance));
  for (let i = step; i < pts.length - 1; i += step) {
    result.push(pts[i]!);
  }
  result.push(pts[pts.length - 1]!);

  return result;
}

// ===== 光标 =====

function getCursor(
  tool: string,
  isPanning: boolean,
  isDragging: boolean,
): string {
  if (isPanning) return 'grabbing';
  if (isDragging) return 'move';

  switch (tool) {
    case 'hand':
      return 'grab';
    case 'rect':
    case 'ellipse':
    case 'polygon':
    case 'star':
    case 'line':
    case 'path':
    case 'pencil':
      return 'crosshair';
    case 'text':
      return 'text';
    case 'image':
      return 'crosshair';
    default:
      return 'default';
  }
}
