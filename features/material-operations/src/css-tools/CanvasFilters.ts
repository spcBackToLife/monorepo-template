/**
 * Canvas 增强滤镜 — 纯像素操作，不依赖 Fabric.js
 */

export type CanvasFilterType = 'noise' | 'pixelate' | 'sharpen' | 'emboss';

export interface CanvasFilterConfig {
  type: CanvasFilterType;
  enabled: boolean;
  intensity: number;
}

export const CANVAS_FILTER_RANGES: Record<CanvasFilterType, { min: number; max: number; step: number; default: number; label: string }> = {
  noise: { min: 0, max: 100, step: 1, default: 20, label: '噪点' },
  pixelate: { min: 1, max: 40, step: 1, default: 8, label: '像素化' },
  sharpen: { min: 0, max: 10, step: 0.1, default: 1, label: '锐化' },
  emboss: { min: 0, max: 10, step: 0.1, default: 2, label: '浮雕' },
};

export function applyNoise(imageData: ImageData, intensity: number): ImageData {
  const data = imageData.data;
  const amount = intensity * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + noise);
    data[i + 1] = clamp(data[i + 1] + noise);
    data[i + 2] = clamp(data[i + 2] + noise);
  }
  return imageData;
}

export function applyPixelate(imageData: ImageData, blockSize: number): ImageData {
  const { width, height, data } = imageData;
  const size = Math.max(1, Math.round(blockSize));
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const cx = Math.min(x + Math.floor(size / 2), width - 1);
      const cy = Math.min(y + Math.floor(size / 2), height - 1);
      const idx = (cy * width + cx) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      for (let dy = 0; dy < size && y + dy < height; dy++) {
        for (let dx = 0; dx < size && x + dx < width; dx++) {
          const pi = ((y + dy) * width + (x + dx)) * 4;
          data[pi] = r; data[pi + 1] = g; data[pi + 2] = b; data[pi + 3] = a;
        }
      }
    }
  }
  return imageData;
}

export function applySharpen(imageData: ImageData, intensity: number): ImageData {
  const { width, height } = imageData;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const factor = Math.max(0, intensity);
  const kernel = [0, -factor, 0, -factor, 1 + 4 * factor, -factor, 0, -factor, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            val += src[((y + ky) * width + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dst[(y * width + x) * 4 + c] = clamp(val);
      }
    }
  }
  return imageData;
}

export function applyEmboss(imageData: ImageData, intensity: number): ImageData {
  const { width, height } = imageData;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const factor = Math.max(0.1, intensity);
  const kernel = [-factor, -factor, 0, -factor, 1, factor, 0, factor, factor];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 128;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            val += src[((y + ky) * width + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dst[(y * width + x) * 4 + c] = clamp(val);
      }
    }
  }
  return imageData;
}

export function applyCanvasFilters(canvas: HTMLCanvasElement, filters: CanvasFilterConfig[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const enabledFilters = filters.filter((f) => f.enabled);
  if (enabledFilters.length === 0) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (const filter of enabledFilters) {
    switch (filter.type) {
      case 'noise': applyNoise(imageData, filter.intensity); break;
      case 'pixelate': applyPixelate(imageData, filter.intensity); break;
      case 'sharpen': applySharpen(imageData, filter.intensity); break;
      case 'emboss': applyEmboss(imageData, filter.intensity); break;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export function createCanvasFilter(type: CanvasFilterType): CanvasFilterConfig {
  return { type, enabled: true, intensity: CANVAS_FILTER_RANGES[type].default };
}

function clamp(value: number): number { return Math.max(0, Math.min(255, Math.round(value))); }
