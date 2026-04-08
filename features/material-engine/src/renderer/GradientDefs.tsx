/**
 * GradientDefs — SVG <defs> 中的渐变定义
 *
 * 遍历 objects 列表，为每个使用渐变填充的对象生成对应的
 * <linearGradient> 或 <radialGradient>。
 */
import type { MaterialObject, GradientDef } from '@globallink/material-operations';
import { isGradientFill, getGradientId } from './svg-utils';

interface GradientDefsProps {
  objects: MaterialObject[];
}

export function GradientDefs({ objects }: GradientDefsProps) {
  const gradientObjects = objects.filter((o) => isGradientFill(o.fill));

  if (gradientObjects.length === 0) return null;

  return (
    <>
      {gradientObjects.map((obj) => {
        const grad = obj.fill as GradientDef;
        const id = getGradientId(obj.id);

        switch (grad.type) {
          case 'linear': {
            // 角度 → 起止坐标（SVG gradientUnits="objectBoundingBox"）
            const angle = grad.angle ?? 0;
            const rad = ((angle - 90) * Math.PI) / 180;
            const x1 = 0.5 - Math.cos(rad) * 0.5;
            const y1 = 0.5 - Math.sin(rad) * 0.5;
            const x2 = 0.5 + Math.cos(rad) * 0.5;
            const y2 = 0.5 + Math.sin(rad) * 0.5;

            return (
              <linearGradient
                key={id}
                id={id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                gradientUnits="objectBoundingBox"
              >
                {grad.stops.map((stop: { offset: number; color: string }, i: number) => (
                  <stop
                    key={i}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            );
          }

          case 'radial': {
            const cx = grad.cx ?? 0.5;
            const cy = grad.cy ?? 0.5;
            const r = grad.r ?? 0.5;

            return (
              <radialGradient
                key={id}
                id={id}
                cx={cx}
                cy={cy}
                r={r}
                gradientUnits="objectBoundingBox"
              >
                {grad.stops.map((stop: { offset: number; color: string }, i: number) => (
                  <stop
                    key={i}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </radialGradient>
            );
          }

          case 'conic':
            // SVG 不原生支持锥形渐变，用 CSS conic-gradient 在 foreignObject 中处理
            // 这里暂时回退为第一个 stop 的颜色
            return null;

          default:
            return null;
        }
      })}
    </>
  );
}
