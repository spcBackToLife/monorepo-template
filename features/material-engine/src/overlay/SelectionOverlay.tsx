/**
 * SelectionOverlay — 选中对象的交互覆盖层
 *
 * 类比设计编辑器的 EditorOverlay：
 *   - 选中框（蓝色矩形边框 + 8 个控制手柄）
 *   - hover 提示框（灰色虚线）
 *   - 拖拽移动
 *   - 缩放（手柄拖拽）
 *   - 旋转（角外手柄）
 *
 * 此组件覆盖在 MaterialRenderer 上方，独立于渲染层。
 */
import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { useMaterialEditor } from '../context/MaterialEditorContext';
import { getBoundingBox, type BoundingBox } from '../renderer/svg-utils';

interface SelectionOverlayProps {
  /** 自定义 className */
  className?: string;
}

/** 控制手柄位置 */
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 20;

export function SelectionOverlay({ className }: SelectionOverlayProps) {
  const { state, execute, setSelected, getSelectedObjects } =
    useMaterialEditor();
  const { project, selectedIds, hoveredId, zoom, panX, panY } = state;

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    objectPositions: { id: string; x: number; y: number }[];
  } | null>(null);

  const { canvasWidth, canvasHeight } = project;

  // 获取选中对象的包围盒
  const selectedObjects = getSelectedObjects();
  const selectedBounds = selectedObjects.map((obj) => ({
    id: obj.id,
    bounds: getBoundingBox(obj),
  }));

  // 计算多选组合包围盒
  const combinedBounds = getCombinedBounds(selectedBounds.map((s) => s.bounds));

  // Hover 对象的包围盒
  const hoveredBounds =
    hoveredId && !selectedIds.includes(hoveredId)
      ? getBoundingBox(
          project.objects.find((o: { id: string }) => o.id === hoveredId) ?? project.objects[0]!,
        )
      : null;

  // ===== 拖拽移动 =====

  const handleDragStart = useCallback(
    (e: MouseEvent) => {
      if (selectedObjects.length === 0) return;
      e.preventDefault();
      e.stopPropagation();

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const mouseX = (e.clientX - svgRect.left) / zoom - panX / zoom;
      const mouseY = (e.clientY - svgRect.top) / zoom - panY / zoom;

      dragStartRef.current = {
        mouseX,
        mouseY,
        objectPositions: selectedObjects.map((obj) => ({
          id: obj.id,
          x: obj.x,
          y: obj.y,
        })),
      };
      setDragging(true);

      const handleDragMove = (me: globalThis.MouseEvent) => {
        if (!dragStartRef.current || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const currentX = (me.clientX - rect.left) / zoom - panX / zoom;
        const currentY = (me.clientY - rect.top) / zoom - panY / zoom;

        const dx = currentX - dragStartRef.current.mouseX;
        const dy = currentY - dragStartRef.current.mouseY;

        // 批量更新位置（仅视觉反馈，mouseUp 时才提交操作）
        for (const pos of dragStartRef.current.objectPositions) {
          execute({
            type: 'me:updateObject',
            params: {
              objectId: pos.id,
              props: {
                x: Math.round(pos.x + dx),
                y: Math.round(pos.y + dy),
              },
            },
          });
        }
      };

      const handleDragEnd = () => {
        setDragging(false);
        dragStartRef.current = null;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };

      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    },
    [selectedObjects, zoom, panX, panY, execute],
  );

  // ===== 缩放手柄 =====

  const handleResizeStart = useCallback(
    (e: MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedObjects.length !== 1) return;
      const obj = selectedObjects[0]!;

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const startMouseX = (e.clientX - svgRect.left) / zoom;
      const startMouseY = (e.clientY - svgRect.top) / zoom;
      const startWidth = obj.width * obj.scaleX;
      const startHeight = obj.height * obj.scaleY;
      const startX = obj.x;
      const startY = obj.y;

      const handleMove = (me: globalThis.MouseEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const currentX = (me.clientX - rect.left) / zoom;
        const currentY = (me.clientY - rect.top) / zoom;
        const dx = currentX - startMouseX;
        const dy = currentY - startMouseY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = startX;
        let newY = startY;

        // 根据手柄位置调整尺寸
        if (handle.includes('e')) newWidth = Math.max(1, startWidth + dx);
        if (handle.includes('w')) {
          newWidth = Math.max(1, startWidth - dx);
          newX = startX + dx;
        }
        if (handle.includes('s')) newHeight = Math.max(1, startHeight + dy);
        if (handle.includes('n')) {
          newHeight = Math.max(1, startHeight - dy);
          newY = startY + dy;
        }

        execute({
          type: 'me:updateObject',
          params: {
            objectId: obj.id,
            props: {
              x: Math.round(newX),
              y: Math.round(newY),
              width: Math.round(newWidth),
              height: Math.round(newHeight),
              scaleX: 1,
              scaleY: 1,
            },
          },
        });
      };

      const handleEnd = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
    },
    [selectedObjects, zoom, execute],
  );

  // ===== 渲染 =====

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth * zoom,
        height: canvasHeight * zoom,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox={`${-panX / zoom} ${-panY / zoom} ${canvasWidth} ${canvasHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hover 提示框 */}
      {hoveredBounds && (
        <rect
          x={hoveredBounds.x}
          y={hoveredBounds.y}
          width={hoveredBounds.width}
          height={hoveredBounds.height}
          fill="none"
          stroke="#1677ff"
          strokeWidth={1 / zoom}
          strokeDasharray={`${3 / zoom} ${2 / zoom}`}
          opacity={0.5}
          pointerEvents="none"
        />
      )}

      {/* 选中框 */}
      {combinedBounds && (
        <g>
          {/* 主选框 */}
          <rect
            x={combinedBounds.x}
            y={combinedBounds.y}
            width={combinedBounds.width}
            height={combinedBounds.height}
            fill="none"
            stroke="#1677ff"
            strokeWidth={1.5 / zoom}
            pointerEvents="stroke"
            style={{ pointerEvents: 'all', cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleDragStart}
          />

          {/* 8 个缩放手柄（仅单选时显示） */}
          {selectedObjects.length === 1 &&
            getHandlePositions(combinedBounds).map(({ pos, x, y, cursor }) => (
              <rect
                key={pos}
                x={x - HANDLE_SIZE / 2 / zoom}
                y={y - HANDLE_SIZE / 2 / zoom}
                width={HANDLE_SIZE / zoom}
                height={HANDLE_SIZE / zoom}
                fill="#fff"
                stroke="#1677ff"
                strokeWidth={1.5 / zoom}
                rx={1 / zoom}
                style={{ pointerEvents: 'all', cursor }}
                onMouseDown={(e) => handleResizeStart(e, pos)}
              />
            ))}

          {/* 旋转手柄（仅单选） */}
          {selectedObjects.length === 1 && (
            <g>
              {/* 连接线 */}
              <line
                x1={combinedBounds.x + combinedBounds.width / 2}
                y1={combinedBounds.y}
                x2={combinedBounds.x + combinedBounds.width / 2}
                y2={combinedBounds.y - ROTATE_OFFSET / zoom}
                stroke="#1677ff"
                strokeWidth={1 / zoom}
                pointerEvents="none"
              />
              {/* 旋转圆 */}
              <circle
                cx={combinedBounds.x + combinedBounds.width / 2}
                cy={combinedBounds.y - ROTATE_OFFSET / zoom}
                r={4 / zoom}
                fill="#fff"
                stroke="#1677ff"
                strokeWidth={1.5 / zoom}
                style={{ pointerEvents: 'all', cursor: 'crosshair' }}
              />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

// ===== 辅助函数 =====

function getCombinedBounds(
  bounds: BoundingBox[],
): BoundingBox | null {
  if (bounds.length === 0) return null;
  if (bounds.length === 1) return bounds[0]!;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
  };
}

function getHandlePositions(bounds: BoundingBox): {
  pos: HandlePosition;
  x: number;
  y: number;
  cursor: string;
}[] {
  const { x, y, width, height } = bounds;
  return [
    { pos: 'nw', x, y, cursor: 'nw-resize' },
    { pos: 'n', x: x + width / 2, y, cursor: 'n-resize' },
    { pos: 'ne', x: x + width, y, cursor: 'ne-resize' },
    { pos: 'e', x: x + width, y: y + height / 2, cursor: 'e-resize' },
    { pos: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
    { pos: 's', x: x + width / 2, y: y + height, cursor: 's-resize' },
    { pos: 'sw', x, y: y + height, cursor: 'sw-resize' },
    { pos: 'w', x, y: y + height / 2, cursor: 'w-resize' },
  ];
}
