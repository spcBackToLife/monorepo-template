/**
 * 图层管理器
 *
 * 管理素材编辑器的图层数据（增删改查、排序、可见性控制等），
 * 不依赖 Fabric.js，纯数据操作。
 */

import type {
  MaterialLayer,
  LayerType,
  LayerConfig,
  BlendMode,
} from '../types';

let _layerIdCounter = 0;

/** 生成图层 ID */
export function generateLayerId(): string {
  return `layer_${Date.now()}_${++_layerIdCounter}`;
}

/** 图层默认名称 */
const LAYER_TYPE_NAMES: Record<LayerType, string> = {
  solid: '纯色',
  gradient: '渐变',
  image: '图片',
  pattern: '图案',
  shape: '图形',
  svg: 'SVG',
  text: '文字',
  group: '图层组',
};

/** 创建新图层 */
export function createLayer(
  type: LayerType,
  config: LayerConfig,
  options?: {
    name?: string;
    opacity?: number;
    blendMode?: BlendMode;
    order?: number;
  },
): MaterialLayer {
  return {
    id: generateLayerId(),
    name: options?.name ?? `${LAYER_TYPE_NAMES[type]} ${_layerIdCounter}`,
    type,
    visible: true,
    locked: false,
    opacity: options?.opacity ?? 1,
    blendMode: options?.blendMode ?? 'normal',
    order: options?.order ?? 0,
    config,
  };
}

/** 图层管理器 — 管理图层列表的纯数据操作 */
export class LayerManager {
  private layers: MaterialLayer[] = [];
  private listeners: Set<() => void> = new Set();

  constructor(initialLayers?: MaterialLayer[]) {
    if (initialLayers) {
      this.layers = [...initialLayers];
    }
  }

  /** 获取所有图层（按 order 排序） */
  getLayers(): MaterialLayer[] {
    return [...this.layers].sort((a, b) => a.order - b.order);
  }

  /** 获取单个图层 */
  getLayer(id: string): MaterialLayer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  /** 添加图层 */
  addLayer(layer: MaterialLayer): void {
    // 设置 order 为当前最大值 + 1
    const maxOrder = this.layers.reduce((max, l) => Math.max(max, l.order), -1);
    layer.order = maxOrder + 1;
    this.layers.push(layer);
    this.notify();
  }

  /** 删除图层 */
  removeLayer(id: string): MaterialLayer | undefined {
    const idx = this.layers.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    const [removed] = this.layers.splice(idx, 1);
    this.reindex();
    this.notify();
    return removed;
  }

  /** 更新图层属性 */
  updateLayer(id: string, updates: Partial<Omit<MaterialLayer, 'id'>>): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer, updates);
    this.notify();
  }

  /** 更新图层配置 */
  updateLayerConfig(id: string, configUpdates: Partial<LayerConfig>): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.config = { ...layer.config, ...configUpdates } as LayerConfig;
    this.notify();
  }

  /** 移动图层到指定位置 */
  moveLayer(id: string, newOrder: number): void {
    const sorted = this.getLayers();
    const fromIdx = sorted.findIndex((l) => l.id === id);
    if (fromIdx === -1) return;

    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(newOrder, 0, moved);
    sorted.forEach((l, i) => { l.order = i; });
    this.layers = sorted;
    this.notify();
  }

  /** 图层上移 */
  moveLayerUp(id: string): void {
    const sorted = this.getLayers();
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    this.moveLayer(id, idx - 1);
  }

  /** 图层下移 */
  moveLayerDown(id: string): void {
    const sorted = this.getLayers();
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx === -1 || idx >= sorted.length - 1) return;
    this.moveLayer(id, idx + 1);
  }

  /** 切换可见性 */
  toggleVisibility(id: string): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.visible = !layer.visible;
    this.notify();
  }

  /** 切换锁定 */
  toggleLock(id: string): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.locked = !layer.locked;
    this.notify();
  }

  /** 设置图层名称 */
  renameLayer(id: string, name: string): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.name = name;
    this.notify();
  }

  /** 清空所有图层 */
  clear(): void {
    this.layers = [];
    this.notify();
  }

  /** 替换所有图层 */
  setLayers(layers: MaterialLayer[]): void {
    this.layers = [...layers];
    this.notify();
  }

  /** 图层数量 */
  get count(): number {
    return this.layers.length;
  }

  /** 订阅变更 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** 通知订阅者 */
  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** 重建 order 索引 */
  private reindex(): void {
    const sorted = this.getLayers();
    sorted.forEach((l, i) => { l.order = i; });
    this.layers = sorted;
  }

  /** 序列化 */
  toJSON(): MaterialLayer[] {
    return this.getLayers();
  }

  /** 反序列化 */
  static fromJSON(json: MaterialLayer[]): LayerManager {
    return new LayerManager(json);
  }
}
