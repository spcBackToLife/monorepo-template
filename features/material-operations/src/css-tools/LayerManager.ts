/**
 * 图层管理器 — 纯数据操作，不依赖 Fabric.js
 */

import type { MaterialLayer, LayerType, LayerConfig, BlendMode } from './types';

let _layerIdCounter = 0;

export function generateLayerId(): string { return `layer_${Date.now()}_${++_layerIdCounter}`; }

const LAYER_TYPE_NAMES: Record<LayerType, string> = {
  solid: '纯色', gradient: '渐变', image: '图片', pattern: '图案', shape: '图形', svg: 'SVG', text: '文字', group: '图层组',
};

export function createLayer(type: LayerType, config: LayerConfig, options?: { name?: string; opacity?: number; blendMode?: BlendMode; order?: number; }): MaterialLayer {
  return {
    id: generateLayerId(), name: options?.name ?? `${LAYER_TYPE_NAMES[type]} ${_layerIdCounter}`,
    type, visible: true, locked: false, opacity: options?.opacity ?? 1,
    blendMode: options?.blendMode ?? 'normal', order: options?.order ?? 0, config,
  };
}

export class LayerManager {
  private layers: MaterialLayer[] = [];
  private listeners: Set<() => void> = new Set();

  constructor(initialLayers?: MaterialLayer[]) { if (initialLayers) this.layers = [...initialLayers]; }

  getLayers(): MaterialLayer[] { return [...this.layers].sort((a, b) => a.order - b.order); }
  getLayer(id: string): MaterialLayer | undefined { return this.layers.find((l) => l.id === id); }

  addLayer(layer: MaterialLayer): void {
    const maxOrder = this.layers.reduce((max, l) => Math.max(max, l.order), -1);
    layer.order = maxOrder + 1;
    this.layers.push(layer);
    this.notify();
  }

  removeLayer(id: string): MaterialLayer | undefined {
    const idx = this.layers.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    const [removed] = this.layers.splice(idx, 1);
    this.reindex(); this.notify();
    return removed;
  }

  updateLayer(id: string, updates: Partial<Omit<MaterialLayer, 'id'>>): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer, updates); this.notify();
  }

  updateLayerConfig(id: string, configUpdates: Partial<LayerConfig>): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.config = { ...layer.config, ...configUpdates } as LayerConfig; this.notify();
  }

  moveLayer(id: string, newOrder: number): void {
    const sorted = this.getLayers();
    const fromIdx = sorted.findIndex((l) => l.id === id);
    if (fromIdx === -1) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(newOrder, 0, moved);
    sorted.forEach((l, i) => { l.order = i; });
    this.layers = sorted; this.notify();
  }

  moveLayerUp(id: string): void { const sorted = this.getLayers(); const idx = sorted.findIndex((l) => l.id === id); if (idx <= 0) return; this.moveLayer(id, idx - 1); }
  moveLayerDown(id: string): void { const sorted = this.getLayers(); const idx = sorted.findIndex((l) => l.id === id); if (idx === -1 || idx >= sorted.length - 1) return; this.moveLayer(id, idx + 1); }
  toggleVisibility(id: string): void { const layer = this.layers.find((l) => l.id === id); if (!layer) return; layer.visible = !layer.visible; this.notify(); }
  toggleLock(id: string): void { const layer = this.layers.find((l) => l.id === id); if (!layer) return; layer.locked = !layer.locked; this.notify(); }
  renameLayer(id: string, name: string): void { const layer = this.layers.find((l) => l.id === id); if (!layer) return; layer.name = name; this.notify(); }
  clear(): void { this.layers = []; this.notify(); }
  setLayers(layers: MaterialLayer[]): void { this.layers = [...layers]; this.notify(); }
  get count(): number { return this.layers.length; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  private notify(): void { for (const listener of this.listeners) listener(); }
  private reindex(): void { const sorted = this.getLayers(); sorted.forEach((l, i) => { l.order = i; }); this.layers = sorted; }
  toJSON(): MaterialLayer[] { return this.getLayers(); }
  static fromJSON(json: MaterialLayer[]): LayerManager { return new LayerManager(json); }
}
