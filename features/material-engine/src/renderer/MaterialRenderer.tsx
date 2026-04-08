/**
 * MaterialRenderer — 素材编辑器 SVG 渲染器（核心组件）
 *
 * 类比设计编辑器的 SchemaRenderer：
 *   Schema 节点树 → 递归遍历 → React DOM
 *
 * 素材编辑器版本：
 *   MaterialProjectSchema.objects[] → 遍历 → SVG 元素
 *
 * 渲染结构：
 *   <svg viewBox="0 0 canvasWidth canvasHeight">
 *     <defs>
 *       <GradientDefs />
 *       <ShadowDefs />
 *     </defs>
 *     <rect id="canvas-bg" ... />
 *     {referenceFrame && <rect id="ref-frame" ... />}
 *     {objects.map(obj => <ObjectRenderer />)}
 *   </svg>
 */
import { useCallback, type MouseEvent } from 'react';
import type { MaterialObject } from '@globallink/material-operations';
import { useMaterialEditor } from '../context/MaterialEditorContext';
import { ObjectRenderer } from './ObjectRenderer';
import { GradientDefs } from './GradientDefs';
import { ShadowDefs } from './ShadowDefs';

interface MaterialRendererProps {
  /** 自定义 className */
  className?: string;
  /** 自定义 style */
  style?: React.CSSProperties;
  /** SVG 画布点击空白区域的回调 */
  onCanvasClick?: (e: MouseEvent) => void;
}

export function MaterialRenderer({
  className,
  style,
  onCanvasClick,
}: MaterialRendererProps) {
  const { state, setSelected, setHovered } = useMaterialEditor();
  const { project, selectedIds, zoom, panX, panY } = state;

  // 点击对象 → 选中
  const handleObjectMouseDown = useCallback(
    (e: MouseEvent, obj: MaterialObject) => {
      e.stopPropagation();

      if (e.shiftKey || e.metaKey) {
        // 多选
        setSelected(
          selectedIds.includes(obj.id)
            ? selectedIds.filter((id) => id !== obj.id)
            : [...selectedIds, obj.id],
        );
      } else {
        setSelected([obj.id]);
      }
    },
    [selectedIds, setSelected],
  );

  // hover
  const handleObjectMouseEnter = useCallback(
    (_e: MouseEvent, obj: MaterialObject) => {
      setHovered(obj.id);
    },
    [setHovered],
  );

  const handleObjectMouseLeave = useCallback(
    () => {
      setHovered(null);
    },
    [setHovered],
  );

  // 点击空白区域 → 取消选中
  const handleCanvasMouseDown = useCallback(
    (e: MouseEvent) => {
      // 仅当直接点击 SVG 背景时
      if ((e.target as SVGElement).dataset.canvasBg === 'true') {
        setSelected([]);
        onCanvasClick?.(e);
      }
    },
    [setSelected, onCanvasClick],
  );

  const { canvasWidth, canvasHeight, backgroundColor, referenceFrame, objects } = project;

  // 收集所有对象（含 group 子对象）以提取渐变和阴影
  const allObjects = flattenObjects(objects);

  return (
    <svg
      className={className}
      style={{
        ...style,
        width: canvasWidth * zoom,
        height: canvasHeight * zoom,
        overflow: 'visible',
      }}
      viewBox={`${-panX / zoom} ${-panY / zoom} ${canvasWidth} ${canvasHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Definitions: 渐变 + 阴影 */}
      <defs>
        <GradientDefs objects={allObjects} />
        <ShadowDefs objects={allObjects} />
      </defs>

      {/* 画布背景 */}
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={backgroundColor}
        data-canvas-bg="true"
      />

      {/* 参考框 */}
      {referenceFrame.enabled && (
        <rect
          x={(canvasWidth - referenceFrame.width) / 2}
          y={(canvasHeight - referenceFrame.height) / 2}
          width={referenceFrame.width}
          height={referenceFrame.height}
          fill="none"
          stroke="#1677ff"
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          opacity={0.5}
          pointerEvents="none"
        />
      )}

      {/* 对象层（从底到顶） */}
      {objects.map((obj) => (
        <ObjectRenderer
          key={obj.id}
          object={obj}
          isSelected={selectedIds.includes(obj.id)}
          isHovered={state.hoveredId === obj.id}
          onMouseDown={handleObjectMouseDown}
          onMouseEnter={handleObjectMouseEnter}
          onMouseLeave={handleObjectMouseLeave}
        />
      ))}
    </svg>
  );
}

/** 递归扁平化所有对象（含 group 子对象） */
function flattenObjects(objects: MaterialObject[]): MaterialObject[] {
  const result: MaterialObject[] = [];
  for (const obj of objects) {
    result.push(obj);
    if (obj.children && obj.children.length > 0) {
      result.push(...flattenObjects(obj.children as MaterialObject[]));
    }
  }
  return result;
}
