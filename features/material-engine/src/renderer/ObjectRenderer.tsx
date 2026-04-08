/**
 * ObjectRenderer — 单个 MaterialObject → SVG 元素
 *
 * 根据对象 type 渲染对应的 SVG 基元：
 *   rect     → <rect>
 *   ellipse  → <ellipse>
 *   polygon  → <polygon>
 *   star     → <polygon>
 *   path     → <path>
 *   line     → <line>
 *   textbox  → <text> / <foreignObject>
 *   image    → <image>
 *   group    → <g> (递归)
 *
 * 每个对象用 <g transform="..."> 包裹以支持旋转/缩放/位移。
 */
import { memo, useCallback, type MouseEvent } from 'react';
import type { MaterialObject } from '@globallink/material-operations';
import {
  getTransform,
  getFillValue,
  getStrokeValue,
  getObjectStyle,
  getPolygonPoints,
  getStarPoints,
  hasShadow,
  getShadowFilterId,
} from './svg-utils';

interface ObjectRendererProps {
  object: MaterialObject;
  /** 是否被选中（用于外部交互提示，本组件不绘制选框） */
  isSelected?: boolean;
  /** 是否被 hover */
  isHovered?: boolean;
  /** 点击事件 */
  onMouseDown?: (e: MouseEvent, obj: MaterialObject) => void;
  /** hover 进入 */
  onMouseEnter?: (e: MouseEvent, obj: MaterialObject) => void;
  /** hover 离开 */
  onMouseLeave?: (e: MouseEvent, obj: MaterialObject) => void;
}

/** 渲染单个素材对象 */
export const ObjectRenderer = memo(function ObjectRenderer({
  object: obj,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: ObjectRendererProps) {
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (obj.locked) return;
      onMouseDown?.(e, obj);
    },
    [obj, onMouseDown],
  );

  const handleMouseEnter = useCallback(
    (e: MouseEvent) => onMouseEnter?.(e, obj),
    [obj, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => onMouseLeave?.(e, obj),
    [obj, onMouseLeave],
  );

  const transform = getTransform(obj);
  const fill = getFillValue(obj);
  const stroke = getStrokeValue(obj);
  const style = getObjectStyle(obj);
  const filter = hasShadow(obj)
    ? `url(#${getShadowFilterId(obj.id)})`
    : undefined;

  const commonGroupProps = {
    transform,
    style,
    filter,
    'data-object-id': obj.id,
    'data-object-type': obj.type,
    cursor: obj.locked ? 'default' : 'move',
    onMouseDown: handleMouseDown,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  const commonShapeProps = {
    fill,
    stroke,
    strokeWidth: obj.strokeWidth || undefined,
  };

  switch (obj.type) {
    case 'rect':
      return (
        <g {...commonGroupProps}>
          <rect
            x={0}
            y={0}
            width={obj.width}
            height={obj.height}
            rx={obj.rx ?? 0}
            ry={obj.ry ?? 0}
            {...commonShapeProps}
          />
        </g>
      );

    case 'ellipse':
      return (
        <g {...commonGroupProps}>
          <ellipse
            cx={obj.width / 2}
            cy={obj.height / 2}
            rx={obj.width / 2}
            ry={obj.height / 2}
            {...commonShapeProps}
          />
        </g>
      );

    case 'polygon': {
      const sides = obj.sides ?? 6;
      const points = getPolygonPoints(obj.width, obj.height, sides);
      return (
        <g {...commonGroupProps}>
          <polygon points={points} {...commonShapeProps} />
        </g>
      );
    }

    case 'star': {
      const numPoints = obj.points ?? 5;
      const innerRatio = obj.innerRatio ?? 0.4;
      const points = getStarPoints(
        obj.width,
        obj.height,
        numPoints,
        innerRatio,
      );
      return (
        <g {...commonGroupProps}>
          <polygon points={points} {...commonShapeProps} />
        </g>
      );
    }

    case 'path':
      return (
        <g {...commonGroupProps}>
          <path
            d={obj.pathData ?? ''}
            fillRule={obj.fillRule ?? undefined}
            {...commonShapeProps}
          />
        </g>
      );

    case 'line':
      return (
        <g {...commonGroupProps}>
          <line
            x1={obj.x1 ?? 0}
            y1={obj.y1 ?? 0}
            x2={obj.x2 ?? obj.width}
            y2={obj.y2 ?? 0}
            stroke={stroke === 'none' ? '#333' : stroke}
            strokeWidth={obj.strokeWidth || 2}
          />
        </g>
      );

    case 'textbox':
      return (
        <g {...commonGroupProps}>
          {/* 背景填充（可选） */}
          {fill !== 'none' && (
            <rect
              x={0}
              y={0}
              width={obj.width}
              height={obj.height}
              fill="transparent"
            />
          )}
          <foreignObject x={0} y={0} width={obj.width} height={obj.height}>
            <div
              // @ts-expect-error -- xmlns needed for foreignObject
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: '100%',
                height: '100%',
                color: typeof obj.fill === 'string' ? obj.fill : '#333',
                fontSize: obj.fontSize ?? 16,
                fontFamily: obj.fontFamily ?? 'sans-serif',
                fontWeight: obj.fontWeight ?? 'normal',
                textAlign: (obj.textAlign as React.CSSProperties['textAlign']) ?? 'left',
                lineHeight: obj.lineHeight ?? 1.4,
                letterSpacing: obj.letterSpacing,
                overflow: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {obj.text ?? ''}
            </div>
          </foreignObject>
        </g>
      );

    case 'image':
      return (
        <g {...commonGroupProps}>
          {obj.src ? (
            <image
              href={obj.src}
              x={0}
              y={0}
              width={obj.width}
              height={obj.height}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <rect
              x={0}
              y={0}
              width={obj.width}
              height={obj.height}
              fill="#f0f0f0"
              stroke="#ccc"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}
        </g>
      );

    case 'group':
      return (
        <g {...commonGroupProps}>
          {obj.children?.map((child: MaterialObject) => (
            <ObjectRenderer
              key={child.id}
              object={child}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            />
          ))}
        </g>
      );

    default:
      return null;
  }
});
