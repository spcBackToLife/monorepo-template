/**
 * 沿路径「外观场」— 圆模板上的可变线宽 + 弧上色标。
 * 与 {@link design_docs/03-tech/editor/17-appearance-field-along-path.md} 一致；
 * 前端 ObjectRenderer 与 MCP 导出共用本模块，避免分叉。
 */

export interface ProfiledWidthStop {
  t: number;
  width: number;
}

export interface ProfiledColorStop {
  t: number;
  color: string;
}

export interface ProfiledCircleSampleParams {
  /** 对象局部宽度（包围盒） */
  width: number;
  /** 对象局部高度 */
  height: number;
  /** 12 点方向总缺口角度（度），≥0 */
  gapDegrees: number;
  /** 采样段数，越大越平滑 */
  segments: number;
  /** 沿可见弧 t∈[0,1] 的线宽锚点，t 沿弧从一端经底部到另一端 */
  widthStops: ProfiledWidthStop[];
  /** 沿同一参数 t 的色标 */
  colorStops: ProfiledColorStop[];
  /**
   * 缺口两侧「收笔」羽化角度（度），线宽乘 smoothstep 衰减，避免硬切断口。
   * 不传时按 gap 自动估算（约 gap 的 30%～40%，且不超过缺口一半）。
   */
  gapFeatherDegrees?: number;
}

export interface ProfiledStrokeLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  stroke: string;
}

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/** Kenney smoothstep for 0≤t≤1 — reserved for future profile curves */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Perlin/Kenney smootherstep — 缺口处线宽衰减更丝滑 */
function smootherstep01(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function sortStops<T extends { t: number }>(stops: T[]): T[] {
  return [...stops].sort((a, b) => a.t - b.t);
}

/** 分段线性插值标量场（t ∈ [0,1]） */
export function interpolateWidthStops(t: number, stops: ProfiledWidthStop[]): number {
  const sorted = sortStops(stops.length ? stops : [{ t: 0, width: 2 }, { t: 1, width: 2 }]);
  const tt = clamp01(t);
  if (tt <= sorted[0]!.t) return sorted[0]!.width;
  const last = sorted[sorted.length - 1]!;
  if (tt >= last.t) return last.width;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (tt >= a.t && tt <= b.t) {
      const span = b.t - a.t;
      const u = span === 0 ? 0 : (tt - a.t) / span;
      return a.width + u * (b.width - a.width);
    }
  }
  return last.width;
}

function parseHexColor(s: string): [number, number, number] | null {
  const m = s.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** 分段线性插值色标（t ∈ [0,1]），仅支持 #RRGGBB */
export function interpolateColorStops(t: number, stops: ProfiledColorStop[]): string {
  const sorted = sortStops(stops.length ? stops : [{ t: 0, color: '#ffffff' }, { t: 1, color: '#ffffff' }]);
  const tt = clamp01(t);
  if (tt <= sorted[0]!.t) return sorted[0]!.color;
  const last = sorted[sorted.length - 1]!;
  if (tt >= last.t) return last.color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (tt >= a.t && tt <= b.t) {
      const span = b.t - a.t;
      const u = span === 0 ? 0 : (tt - a.t) / span;
      const ca = parseHexColor(a.color);
      const cb = parseHexColor(b.color);
      if (!ca || !cb) return a.color;
      return rgbToHex(
        ca[0] + u * (cb[0] - ca[0]),
        ca[1] + u * (cb[1] - ca[1]),
        ca[2] + u * (cb[2] - ca[2]),
      );
    }
  }
  return last.color;
}

/** 由角度反推沿主弧的 t∈[0,1]（主弧端点 a0、a0+span 外的羽化区钳到 0/1） */
function tFromAngle(ang: number, a0: number, span: number): number {
  if (ang <= a0) return 0;
  if (ang >= a0 + span) return 1;
  return (ang - a0) / span;
}

/**
 * 缺口两侧包络：在 (a0−feather…a0) 与 (a0+span…a0+span+feather) 内 0→1 与 1→0 的 smoothstep，
 * 主弧内恒为 1。
 */
function gapEndEnvelope(ang: number, a0: number, span: number, featherRad: number): number {
  if (featherRad <= 0) return 1;
  if (ang < a0) return smootherstep01((ang - (a0 - featherRad)) / featherRad);
  if (ang > a0 + span) return smootherstep01((a0 + span + featherRad - ang) / featherRad);
  return 1;
}

/**
 * 沿主弧参数 u：在接近缺口两端（u→0 与 u→1）再乘一层平滑衰减，使「越来越细」延续到开口，
 * 与 widthStops 里「底部粗」共同作用；u=0.5（底部）保持 1。
 */
function arcOpenEndEase(u: number, gapDeg: number): number {
  if (gapDeg <= 0) return 1;
  const d = Math.min(u, 1 - u);
  const w = 0.13;
  return smootherstep01(d / w);
}

/**
 * 在对象局部坐标 (0,0)-(width,height) 内，对「圆模板 + 顶部缺口」采样为若干短线段，
 * 供 SVG `<line>` 或 Canvas 逐段 stroke 使用。
 *
 * 当 gapDegrees>0 时，在缺口两侧各延伸一小段角度并乘 **线宽包络**，使端点逐渐变细，
 * 避免「突然断口」；与 MCP / 前端共用同一实现。
 */
export function sampleProfiledStrokeCircle(p: ProfiledCircleSampleParams): ProfiledStrokeLineSegment[] {
  const wBox = Math.max(1, p.width);
  const hBox = Math.max(1, p.height);
  const cx = wBox / 2;
  const cy = hBox / 2;
  const maxW = Math.max(
    0.5,
    ...p.widthStops.map((s) => s.width),
    2,
  );
  const R = Math.min(wBox, hBox) / 2 - maxW / 2 - 0.5;
  if (R <= 1) return [];

  const gapDeg = Math.max(0, Math.min(350, p.gapDegrees));
  const gap = (gapDeg * Math.PI) / 180;
  const span = 2 * Math.PI - gap;
  /** 从「顶端缺口一侧」起，顺时针增加 u：u=0.5 到底部 */
  const a0 = -Math.PI / 2 + gap / 2;

  let featherDeg = p.gapFeatherDegrees ?? 0;
  if (gapDeg > 0) {
    if (featherDeg <= 0) {
      featherDeg = Math.min(11, Math.max(2.8, gapDeg * 0.34));
    }
    // 两侧羽化总角度必须严格小于缺口，避免在缺口中轴相交
    const maxFeather = (gapDeg * 0.48) / 2;
    featherDeg = Math.min(featherDeg, maxFeather);
  } else {
    featherDeg = 0;
  }
  const featherRad = (featherDeg * Math.PI) / 180;

  const angleLo = a0 - featherRad;
  const angleHi = a0 + span + featherRad;
  const angleRange = angleHi - angleLo;

  const n = Math.max(8, Math.min(256, Math.floor(p.segments)));

  const out: ProfiledStrokeLineSegment[] = [];
  for (let i = 0; i < n; i++) {
    const f0 = i / n;
    const f1 = (i + 1) / n;
    const ang0 = angleLo + f0 * angleRange;
    const ang1 = angleLo + f1 * angleRange;
    const x1 = cx + R * Math.cos(ang0);
    const y1 = cy + R * Math.sin(ang0);
    const x2 = cx + R * Math.cos(ang1);
    const y2 = cy + R * Math.sin(ang1);

    const angMid = (ang0 + ang1) / 2;
    const tMid = tFromAngle(angMid, a0, span);
    const envMid = gapEndEnvelope(angMid, a0, span, featherRad);

    const t0 = tFromAngle(ang0, a0, span);
    const t1 = tFromAngle(ang1, a0, span);
    const wBase = (interpolateWidthStops(t0, p.widthStops) + interpolateWidthStops(t1, p.widthStops)) / 2;
    const arcEase = arcOpenEndEase(tMid, gapDeg);
    const wm = wBase * envMid * arcEase;
    const cm = interpolateColorStops(tMid, p.colorStops);
    if (wm < 0.035) continue;
    out.push({
      x1,
      y1,
      x2,
      y2,
      strokeWidth: Math.max(0.35, wm),
      stroke: cm,
    });
  }
  return out;
}

/** 默认语音光晕式：底部粗、近缺口两端极细；数值偏细以贴近产品参考 */
export function defaultVoiceHaloWidthStops(): ProfiledWidthStop[] {
  return [
    { t: 0, width: 0.55 },
    { t: 0.38, width: 0.88 },
    { t: 0.5, width: 1.45 },
    { t: 0.62, width: 0.88 },
    { t: 1, width: 0.48 },
  ];
}

export function defaultVoiceHaloColorStops(): ProfiledColorStop[] {
  return [
    { t: 0, color: '#a78bfa' },
    { t: 0.22, color: '#22d3ee' },
    { t: 0.45, color: '#f472b6' },
    { t: 0.72, color: '#fb923c' },
    { t: 1, color: '#818cf8' },
  ];
}
