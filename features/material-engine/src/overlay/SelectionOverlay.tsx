/**
 * SelectionOverlay — 选中对象的交互覆盖层
 *
 * 类比设计编辑器的 EditorOverlay：
 *   - 选中框（蓝色矩形边框 + 8 个控制手柄）
 *   - hover 提示框（蓝色虚线）
 *   - 拖拽移动（含对齐吸附）
 *   - 缩放（手柄拖拽）
 *   - 旋转（角外手柄拖拽）
 *
 * 此组件覆盖在 MaterialRenderer 上方，独立于渲染层。
 */
import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { useMaterialEditor } from '../context/MaterialEditorContext';
import { getBoundingBox, type BoundingBox } from '../renderer/svg-utils';

interface SelectionOverlayProps {
  /** 自定义 className */
  className?: string;
  /** 拖拽状态变化回调（用于触发 SmartGuides） */
  onDraggingChange?: (dragging: boolean) => void;
}

/** 控制手柄位置 */
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 20;

/** 对齐吸附阈值 */
const SNAP_THRESHOLD = 5;

export function SelectionOverlay({ className, onDraggingChange }: SelectionOverlayProps) {
  const { state, execute, setSelected, getSelectedObjects } =
    useMaterialEditor();
  const { project, selectedIds, hoveredId, zoom } = state;

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

  // ===== 吸附计算 =====

  const calcSnap = useCallback(
    (
      selBounds: BoundingBox,
      dx: number,
      dy: number,
    ): { dx: number; dy: number } => {
      const otherObjects = project.objects.filter(
        (o) => !selectedIds.includes(o.id) && o.visible,
      );

      const selLeft = selBounds.x + dx;
      const selRight = selLeft + selBounds.width;
      const selCenterX = selLeft + selBounds.width / 2;
      const selTop = selBounds.y + dy;
      const selBottom = selTop + selBounds.height;
      const selCenterY = selTop + selBounds.height / 2;

      let snapDx = dx;
      let snapDy = dy;
      let foundX = false;
      let foundY = false;

      // 画布中心对齐（= 参考框中心）
      const canvasCX = canvasWidth / 2;
      const canvasCY = canvasHeight / 2;
      if (!foundX && Math.abs(selCenterX - canvasCX) < SNAP_THRESHOLD) {
        snapDx = dx + (canvasCX - selCenterX);
        foundX = true;
      }
      if (!foundY && Math.abs(selCenterY - canvasCY) < SNAP_THRESHOLD) {
        snapDy = dy + (canvasCY - selCenterY);
        foundY = true;
      }

      // 参考框边缘吸附
      const { referenceFrame } = project;
      if (referenceFrame?.enabled) {
        const frameX = (canvasWidth - referenceFrame.width) / 2;
        const frameY = (canvasHeight - referenceFrame.height) / 2;
        const frameR = frameX + referenceFrame.width;
        const frameB = frameY + referenceFrame.height;

        if (!foundX) {
          for (const [sv, fv] of [
            [selLeft, frameX], [selRight, frameX], [selLeft, frameR], [selRight, frameR],
          ] as [number, number][]) {
            if (Math.abs(sv - fv) < SNAP_THRESHOLD) {
              snapDx = dx + (fv - sv);
              foundX = true;
              break;
            }
          }
        }
        if (!foundY) {
          for (const [sv, fv] of [
            [selTop, frameY], [selBottom, frameY], [selTop, frameB], [selBottom, frameB],
          ] as [number, number][]) {
            if (Math.abs(sv - fv) < SNAP_THRESHOLD) {
              snapDy = dy + (fv - sv);
              foundY = true;
              break;
            }
          }
        }
      }

      for (const other of otherObjects) {
        if (foundX && foundY) break;
        const ob = getBoundingBox(other);
        const otherLeft = ob.x;
        const otherRight = ob.x + ob.width;
        const otherCenterX = ob.x + ob.width / 2;
        const otherTop = ob.y;
        const otherBottom = ob.y + ob.height;
        const otherCenterY = ob.y + ob.height / 2;

        if (!foundX) {
          for (const [sv, ov] of [
            [selLeft, otherLeft], [selLeft, otherRight], [selRight, otherLeft],
            [selRight, otherRight], [selCenterX, otherCenterX],
          ] as [number, number][]) {
            if (Math.abs(sv - ov) < SNAP_THRESHOLD) {
              snapDx = dx + (ov - sv);
              foundX = true;
              break;
            }
          }
        }
        if (!foundY) {
          for (const [sv, ov] of [
            [selTop, otherTop], [selTop, otherBottom], [selBottom, otherTop],
            [selBottom, otherBottom], [selCenterY, otherCenterY],
          ] as [number, number][]) {
            if (Math.abs(sv - ov) < SNAP_THRESHOLD) {
              snapDy = dy + (ov - sv);
              foundY = true;
              break;
            }
          }
        }
      }

      return { dx: snapDx, dy: snapDy };
    },
    [project.objects, project.referenceFrame, selectedIds, canvasWidth, canvasHeight],
  );

  // ===== 拖拽移动 =====

  const handleDragStart = useCallback(
    (e: MouseEvent) => {
      if (selectedObjects.length === 0) return;

      // 默认元素不可移动
      const defaultId = project.defaultElementId;
      if (defaultId && selectedObjects.every((o) => o.id === defaultId)) return;

      e.preventDefault();
      e.stopPropagation();

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const mouseX = (e.clientX - svgRect.left) / zoom;
      const mouseY = (e.clientY - svgRect.top) / zoom;

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
      onDraggingChange?.(true);

      const handleDragMove = (me: globalThis.MouseEvent) => {
        if (!dragStartRef.current || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const currentX = (me.clientX - rect.left) / zoom;
        const currentY = (me.clientY - rect.top) / zoom;

        let dx = currentX - dragStartRef.current.mouseX;
        let dy = currentY - dragStartRef.current.mouseY;

        // 吸附
        if (combinedBounds) {
          const snap = calcSnap(combinedBounds, dx, dy);
          dx = snap.dx;
          dy = snap.dy;
        }

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
        onDraggingChange?.(false);
        dragStartRef.current = null;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };

      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    },
    [selectedObjects, zoom, execute, combinedBounds, calcSnap, onDraggingChange],
  );

  // ===== 缩放手柄 =====

  const handleResizeStart = useCallback(
    (e: MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedObjects.length !== 1) return;
      const obj = selectedObjects[0]!;

      // 默认元素不可缩放
      if (obj.id === project.defaultElementId) return;

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

        // Shift 约束等比例
        if (me.shiftKey && startWidth > 0 && startHeight > 0) {
          const ratio = startWidth / startHeight;
          if (handle === 'e' || handle === 'w') {
            newHeight = newWidth / ratio;
          } else if (handle === 'n' || handle === 's') {
            newWidth = newHeight * ratio;
          } else {
            // 角手柄
            const avgScale = (newWidth / startWidth + newHeight / startHeight) / 2;
            newWidth = startWidth * avgScale;
            newHeight = startHeight * avgScale;
            if (handle.includes('w')) newX = startX + startWidth - newWidth;
            if (handle.includes('n')) newY = startY + startHeight - newHeight;
          }
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

  // ===== 旋转手柄 =====

  const handleRotateStart = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedObjects.length !== 1 || !combinedBounds) return;
      const obj = selectedObjects[0]!;

      // 默认元素不可旋转
      if (obj.id === project.defaultElementId) return;

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      // 对象中心
      const cx = combinedBounds.x + combinedBounds.width / 2;
      const cy = combinedBounds.y + combinedBounds.height / 2;

      const startRotation = obj.rotation;

      // 起始角度
      const startMouseX = (e.clientX - svgRect.left) / zoom;
      const startMouseY = (e.clientY - svgRect.top) / zoom;
      const startAngle = Math.atan2(startMouseY - cy, startMouseX - cx);

      const handleMove = (me: globalThis.MouseEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const currentX = (me.clientX - rect.left) / zoom;
        const currentY = (me.clientY - rect.top) / zoom;
        const currentAngle = Math.atan2(currentY - cy, currentX - cx);

        let rotation = startRotation + ((currentAngle - startAngle) * 180) / Math.PI;

        // Shift 约束 15° 步进
        if (me.shiftKey) {
          rotation = Math.round(rotation / 15) * 15;
        }

        // 归一化到 0-360
        rotation = ((rotation % 360) + 360) % 360;

        execute({
          type: 'me:updateObject',
          params: {
            objectId: obj.id,
            props: { rotation },
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
    [selectedObjects, combinedBounds, zoom, execute],
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
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
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
          {(() => {
            const isDefaultOnly = selectedObjects.length === 1 && selectedObjects[0]!.id === project.defaultElementId;
            const strokeColor = isDefaultOnly ? '#52c41a' : '#1677ff';
            return (
              <>
                <rect
                  x={combinedBounds.x}
                  y={combinedBounds.y}
                  width={combinedBounds.width}
                  height={combinedBounds.height}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={1.5 / zoom}
                  pointerEvents="stroke"
                  style={{
                    pointerEvents: 'all',
                    cursor: isDefaultOnly ? 'default' : dragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={handleDragStart}
                />

                {/* 默认元素标签提示 */}
                {isDefaultOnly && (
                  <text
                    x={combinedBounds.x + combinedBounds.width / 2}
                    y={combinedBounds.y - 8 / zoom}
                    fontSize={9 / zoom}
                    fill="#52c41a"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    pointerEvents="none"
                  >
                    组件默认框（不可移动/缩放）
                  </text>
                )}
              </>
            );
          })()}

          {/* 8 个缩放手柄（仅单选且非默认元素时显示） */}
          {selectedObjects.length === 1 &&
            selectedObjects[0]!.id !== project.defaultElementId &&
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

          {/* 旋转手柄（仅单选且非默认元素） */}
          {selectedObjects.length === 1 &&
            selectedObjects[0]!.id !== project.defaultElementId && (
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
              {/* 旋转圆 — 有交互 */}
              <circle
                cx={combinedBounds.x + combinedBounds.width / 2}
                cy={combinedBounds.y - ROTATE_OFFSET / zoom}
                r={4 / zoom}
                fill="#fff"
                stroke="#1677ff"
                strokeWidth={1.5 / zoom}
                style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                onMouseDown={handleRotateStart}
              />
            </g>
          )}

          {/* 选中信息标签（非默认元素） */}
          {selectedObjects.length === 1 && combinedBounds &&
            selectedObjects[0]!.id !== project.defaultElementId && (
            <text
              x={combinedBounds.x}
              y={combinedBounds.y - 6 / zoom}
              fontSize={10 / zoom}
              fill="#1677ff"
              fontFamily="monospace"
              pointerEvents="none"
            >
              {Math.round(combinedBounds.width)} × {Math.round(combinedBounds.height)}
              {selectedObjects[0]!.rotation !== 0 && ` ∠${Math.round(selectedObjects[0]!.rotation)}°`}
            </text>
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
