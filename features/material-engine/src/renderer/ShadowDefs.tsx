/**
 * ShadowDefs — SVG <defs> 中的阴影 filter 定义
 *
 * 为每个带 shadow 属性的对象生成 <filter> 节点。
 */
import type { MaterialObject } from '@globallink/material-operations';
import { hasShadow, getShadowFilterId } from './svg-utils';

interface ShadowDefsProps {
  objects: MaterialObject[];
}

/** 解析颜色字符串获取 r/g/b/a */
function parseColor(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  // 简单支持 rgba() 和 hex
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/,
  );
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]) / 255,
      g: Number(rgbaMatch[2]) / 255,
      b: Number(rgbaMatch[3]) / 255,
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }

  // Hex → fallback
  return { r: 0, g: 0, b: 0, a: 0.3 };
}

export function ShadowDefs({ objects }: ShadowDefsProps) {
  const shadowObjects = objects.filter(hasShadow);
  if (shadowObjects.length === 0) return null;

  return (
    <>
      {shadowObjects.map((obj) => {
        const shadow = obj.shadow!;
        const id = getShadowFilterId(obj.id);
        const { r, g, b, a } = parseColor(shadow.color);

        return (
          <filter
            key={id}
            id={id}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx={shadow.offsetX}
              dy={shadow.offsetY}
              stdDeviation={shadow.blur / 2}
              floodColor={`rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`}
              floodOpacity={a}
            />
          </filter>
        );
      })}
    </>
  );
}
