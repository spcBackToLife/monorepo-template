/**
 * Canvas 增强滤镜
 *
 * Phase 4: 图层合成与特效
 * 实现无法直接映射到 CSS filter 的 Canvas 级别滤镜：
 *   - 噪点 (noise)
 *   - 像素化 (pixelate)
 *   - 锐化 (sharpen)
 *   - 浮雕 (emboss)
 *
 * 这些滤镜通过对图像像素数据进行操作实现，
 * 导出时需要先渲染为图片（不能直接映射到 CSS）。
 */

/** Canvas 增强滤镜类型 */
export type CanvasFilterType = 'noise' | 'pixelate' | 'sharpen' | 'emboss';

/** Canvas 滤镜配置 */
export interface CanvasFilterConfig {
  type: CanvasFilterType;
  enabled: boolean;
  /** 各滤镜的强度参数 */
  intensity: number;
}

/** 滤镜参数范围 */
export const CANVAS_FILTER_RANGES: Record<
  CanvasFilterType,
  { min: number; max: number; step: number; default: number; label: string }
> = {
  noise: { min: 0, max: 100, step: 1, default: 20, label: '噪点' },
  pixelate: { min: 1, max: 40, step: 1, default: 8, label: '像素化' },
  sharpen: { min: 0, max: 10, step: 0.1, default: 1, label: '锐化' },
  emboss: { min: 0, max: 10, step: 0.1, default: 2, label: '浮雕' },
};

/**
 * 对 ImageData 应用噪点滤镜
 * @param imageData — 原始像素数据
 * @param intensity — 噪点强度 (0-100)
 */
export function applyNoise(imageData: ImageData, intensity: number): ImageData {
  const data = imageData.data;
  const amount = intensity * 2.55; // 映射到 0-255 范围

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + noise);         // R
    data[i + 1] = clamp(data[i + 1] + noise); // G
    data[i + 2] = clamp(data[i + 2] + noise); // B
    // Alpha 不变
  }

  return imageData;
}

/**
 * 对 ImageData 应用像素化滤镜
 * @param imageData — 原始像素数据
 * @param blockSize — 像素块大小 (1-40)
 */
export function applyPixelate(imageData: ImageData, blockSize: number): ImageData {
  const { width, height, data } = imageData;
  const size = Math.max(1, Math.round(blockSize));

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      // 采样块中心颜色
      const cx = Math.min(x + Math.floor(size / 2), width - 1);
      const cy = Math.min(y + Math.floor(size / 2), height - 1);
      const idx = (cy * width + cx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // 填充整个块
      for (let dy = 0; dy < size && y + dy < height; dy++) {
        for (let dx = 0; dx < size && x + dx < width; dx++) {
          const pi = ((y + dy) * width + (x + dx)) * 4;
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = b;
          data[pi + 3] = a;
        }
      }
    }
  }

  return imageData;
}

/**
 * 对 ImageData 应用锐化滤镜（拉普拉斯锐化卷积核）
 * @param imageData — 原始像素数据
 * @param intensity — 锐化强度 (0-10)
 */
export function applySharpen(imageData: ImageData, intensity: number): ImageData {
  const { width, height } = imageData;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  // 锐化卷积核（基于拉普拉斯算子）
  const factor = Math.max(0, intensity);
  const kernel = [
    0, -factor, 0,
    -factor, 1 + 4 * factor, -factor,
    0, -factor, 0,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const si = ((y + ky) * width + (x + kx)) * 4 + c;
            val += src[si] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const di = (y * width + x) * 4 + c;
        dst[di] = clamp(val);
      }
    }
  }

  return imageData;
}

/**
 * 对 ImageData 应用浮雕滤镜
 * @param imageData — 原始像素数据
 * @param intensity — 浮雕强度 (0-10)
 */
export function applyEmboss(imageData: ImageData, intensity: number): ImageData {
  const { width, height } = imageData;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  const factor = Math.max(0.1, intensity);

  // 浮雕卷积核
  const kernel = [
    -factor, -factor, 0,
    -factor, 1, factor,
    0, factor, factor,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 128; // 偏移值，使输出不会太暗
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const si = ((y + ky) * width + (x + kx)) * 4 + c;
            val += src[si] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const di = (y * width + x) * 4 + c;
        dst[di] = clamp(val);
      }
    }
  }

  return imageData;
}

/**
 * 对 Canvas 元素应用一组 Canvas 滤镜
 */
export function applyCanvasFilters(
  canvas: HTMLCanvasElement,
  filters: CanvasFilterConfig[],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const enabledFilters = filters.filter((f) => f.enabled);
  if (enabledFilters.length === 0) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (const filter of enabledFilters) {
    switch (filter.type) {
      case 'noise':
        applyNoise(imageData, filter.intensity);
        break;
      case 'pixelate':
        applyPixelate(imageData, filter.intensity);
        break;
      case 'sharpen':
        applySharpen(imageData, filter.intensity);
        break;
      case 'emboss':
        applyEmboss(imageData, filter.intensity);
        break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 创建默认 Canvas 滤镜配置
 */
export function createCanvasFilter(type: CanvasFilterType): CanvasFilterConfig {
  return {
    type,
    enabled: true,
    intensity: CANVAS_FILTER_RANGES[type].default,
  };
}

/** 数值钳位到 0-255 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
