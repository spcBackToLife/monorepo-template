/**
 * SmartGuides — 对齐线
 *
 * 在拖拽对象时，自动检测与其他对象的对齐关系并显示辅助线。
 * 支持：
 *   - 左/右/上/下边缘对齐
 *   - 中心对齐
 *   - 等间距提示
 */
import { useMemo } from 'react';
import type { MaterialObject } from '@globallink/material-operations';
import { useMaterialEditor } from '../context/MaterialEditorContext';
import { getBoundingBox, type BoundingBox } from '../renderer/svg-utils';

interface SmartGuidesProps {
  /** 是否启用（拖拽时启用） */
  enabled?: boolean;
}

/** 对齐吸附阈值（像素） */
const SNAP_THRESHOLD = 5;

interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export function SmartGuides({ enabled = false }: SmartGuidesProps) {
  const { state } = useMaterialEditor();
  const { project, selectedIds, zoom, panX, panY } = state;

  const guides = useMemo((): GuideLine[] => {
    if (!enabled || selectedIds.length === 0) return [];

    const selectedObjects = project.objects.filter((o: MaterialObject) =>
      selectedIds.includes(o.id),
    );
    const otherObjects = project.objects.filter(
      (o: MaterialObject) => !selectedIds.includes(o.id) && o.visible,
    );

    if (selectedObjects.length === 0 || otherObjects.length === 0) return [];

    // 获取选中对象的组合包围盒
    const selectedBounds = selectedObjects.map(getBoundingBox);
    const selMinX = Math.min(...selectedBounds.map((b: BoundingBox) => b.x));
    const selMinY = Math.min(...selectedBounds.map((b: BoundingBox) => b.y));
    const selMaxX = Math.max(...selectedBounds.map((b: BoundingBox) => b.x + b.width));
    const selMaxY = Math.max(...selectedBounds.map((b: BoundingBox) => b.y + b.height));
    const selCenterX = (selMinX + selMaxX) / 2;
    const selCenterY = (selMinY + selMaxY) / 2;

    // 关键位置
    const selPoints = {
      left: selMinX,
      right: selMaxX,
      centerX: selCenterX,
      top: selMinY,
      bottom: selMaxY,
      centerY: selCenterY,
    };

    const lines: GuideLine[] = [];
    const { canvasWidth, canvasHeight } = project;

    for (const other of otherObjects) {
      const ob = getBoundingBox(other);
      const otherPoints = {
        left: ob.x,
        right: ob.x + ob.width,
        centerX: ob.x + ob.width / 2,
        top: ob.y,
        bottom: ob.y + ob.height,
        centerY: ob.y + ob.height / 2,
      };

      // 垂直线（X 轴对齐）
      const xPairs: [number, number][] = [
        [selPoints.left, otherPoints.left],
        [selPoints.left, otherPoints.right],
        [selPoints.right, otherPoints.left],
        [selPoints.right, otherPoints.right],
        [selPoints.centerX, otherPoints.centerX],
      ];

      for (const [selVal, otherVal] of xPairs) {
        if (Math.abs(selVal - otherVal) < SNAP_THRESHOLD) {
          lines.push({
            type: 'vertical',
            position: otherVal,
            start: 0,
            end: canvasHeight,
          });
        }
      }

      // 水平线（Y 轴对齐）
      const yPairs: [number, number][] = [
        [selPoints.top, otherPoints.top],
        [selPoints.top, otherPoints.bottom],
        [selPoints.bottom, otherPoints.top],
        [selPoints.bottom, otherPoints.bottom],
        [selPoints.centerY, otherPoints.centerY],
      ];

      for (const [selVal, otherVal] of yPairs) {
        if (Math.abs(selVal - otherVal) < SNAP_THRESHOLD) {
          lines.push({
            type: 'horizontal',
            position: otherVal,
            start: 0,
            end: canvasWidth,
          });
        }
      }
    }

    // 画布中心对齐
    if (Math.abs(selCenterX - canvasWidth / 2) < SNAP_THRESHOLD) {
      lines.push({
        type: 'vertical',
        position: canvasWidth / 2,
        start: 0,
        end: canvasHeight,
      });
    }
    if (Math.abs(selCenterY - canvasHeight / 2) < SNAP_THRESHOLD) {
      lines.push({
        type: 'horizontal',
        position: canvasHeight / 2,
        start: 0,
        end: canvasWidth,
      });
    }

    // 去重
    const seen = new Set<string>();
    return lines.filter((line) => {
      const key = `${line.type}:${Math.round(line.position)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [enabled, selectedIds, project]);

  if (guides.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: project.canvasWidth * zoom,
        height: project.canvasHeight * zoom,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox={`${-panX / zoom} ${-panY / zoom} ${project.canvasWidth} ${project.canvasHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {guides.map((line, i) =>
        line.type === 'vertical' ? (
          <line
            key={`v-${i}`}
            x1={line.position}
            y1={line.start}
            x2={line.position}
            y2={line.end}
            stroke="#ff4d4f"
            strokeWidth={0.5 / zoom}
            strokeDasharray={`${3 / zoom} ${2 / zoom}`}
          />
        ) : (
          <line
            key={`h-${i}`}
            x1={line.start}
            y1={line.position}
            x2={line.end}
            y2={line.position}
            stroke="#ff4d4f"
            strokeWidth={0.5 / zoom}
            strokeDasharray={`${3 / zoom} ${2 / zoom}`}
          />
        ),
      )}
    </svg>
  );
}
