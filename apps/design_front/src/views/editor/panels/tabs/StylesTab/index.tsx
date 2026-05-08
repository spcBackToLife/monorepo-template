import { useState, useRef, useCallback } from 'react';
import { Empty } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { API_BASE, type AssetUploadResponse } from '@/api/client';
import { findNodeInScreens } from '@globallink/design-operations';
import type { CSSProperties } from '@globallink/design-schema';
import { NumericInput } from '../../../controls/NumericInput';
import { ColorPicker } from '../../../controls/ColorPicker';
import { BoxModelEditor } from '../../../controls/BoxModelEditor';

/**
 * Task 1.6.4-1.6.11 — Styles Tab
 * 8 collapsible sections: Layout, Size, Spacing, Position, Background, Border, Typography, Effects.
 */
const MIXED = '—';

function computeIntersectedStyles(
  screens: typeof editorStore.screens,
  nodeIds: string[],
  parentStateOverride?: string | null,
// TODO: 下游 BackgroundEditor/MaskSection 等组件的 styles prop 类型为 Record<string, string>，
// 需要统一改成 CSSProperties 后才能去掉此返回类型中的 Record。
): Record<string, string> {
  if (nodeIds.length <= 1) {
    const node = findNodeInScreens(screens, nodeIds[0]);
    if (!node) return {};
    
    // Determine the effective state: parent override takes precedence
    let effectiveState = node.activeState ?? 'default';
    if (parentStateOverride && parentStateOverride !== 'default') {
      effectiveState = parentStateOverride;
    }
    
    const stateEntry = effectiveState !== 'default' ? node.states.find((s) => s.name === effectiveState) : undefined;
    return { ...node.styles, ...(stateEntry?.styles ?? {}) } as Record<string, string>;
  }

  const allStyles = nodeIds.map((id) => {
    const n = findNodeInScreens(screens, id);
    if (!n) return {};
    const active = n.activeState ?? 'default';
    const se = active !== 'default' ? n.states.find((s) => s.name === active) : undefined;
    return { ...n.styles, ...(se?.styles ?? {}) } as Record<string, string>;
  });

  const allKeys = new Set(allStyles.flatMap((s) => Object.keys(s)));
  const result: Record<string, string> = {};
  for (const key of allKeys) {
    const values = allStyles.map((s) => String(s[key as keyof CSSProperties] ?? ''));
    const allSame = values.every((v) => v === values[0]);
    result[key] = allSame ? values[0] : MIXED;
  }
  return result;
}
/**
 * Helper function to determine which CSS properties have overrides
 * in the current effective state
 */
function computeOverriddenProperties(
  screens: typeof editorStore.screens,
  nodeId: string,
  effectiveState: string,
): Set<string> {
  const node = findNodeInScreens(screens, nodeId);
  if (!node) return new Set();

  const overridden = new Set<string>();

  // If editing a non-default state, mark properties in that state's styles
  if (effectiveState !== 'default') {
    const stateEntry = node.states?.find((s) => s.name === effectiveState);
    if (stateEntry?.styles) {
      Object.keys(stateEntry.styles).forEach((key) => {
        overridden.add(key);
      });
    }
  }

  return overridden;
}


export const StylesTab = observer(function StylesTab() {
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;
  const allSelectedIds = editorStore.selectedNodeIds;
  const parentStateOverride = editorStore.selectedNodeParentStateOverride;

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const nodeActiveState = node.activeState ?? 'default';
  // Effective state considers parent override
  const effectiveState = parentStateOverride && parentStateOverride !== 'default' ? parentStateOverride : nodeActiveState;
  const styles = computeIntersectedStyles(screens, allSelectedIds, parentStateOverride);
  const overriddenProps = computeOverriddenProperties(screens, nodeId, effectiveState);

  const handleChange = (key: string, value: string) => {
    const v = value || undefined;
    const ids = allSelectedIds.length > 1 ? allSelectedIds : [nodeId];
    for (const nid of ids) {
      if (effectiveState === 'default') {
        editorStore.execute({
          type: 'style.update',
          params: { nodeId: nid, styles: { [key]: v } },
        });
      } else {
        editorStore.execute({
          type: 'visualState.update',
          params: { nodeId: nid, stateName: effectiveState, styles: { [key]: v } },
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-0.5 p-2 text-xs">
      {allSelectedIds.length > 1 && (
        <div className="mb-1 px-2 py-1.5 rounded bg-blue-50 text-blue-800 text-[10px] border border-blue-200">
          已选中 <strong>{allSelectedIds.length}</strong> 个节点，显示交集样式（混合值显示 {MIXED}），修改将批量应用
        </div>
      )}
      {effectiveState !== 'default' && (
        <div className="mb-1 px-2 py-1.5 rounded bg-amber-50 text-amber-800 text-[10px] border border-amber-200">
          {parentStateOverride && parentStateOverride !== 'default' ? (
            <>
              正在编辑状态 <strong>{effectiveState}</strong> 的样式覆盖（从父容器状态继承）
            </>
          ) : (
            <>
              正在编辑状态 <strong>{effectiveState}</strong> 的样式覆盖（与「状态」Tab 中激活态一致）
            </>
          )}
        </div>
      )}
      {/* 1. Layout */}
      <CollapsibleSection title="布局" defaultOpen>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          <SelectField
            label="Display"
            isOverridden={overriddenProps.has('display')}
            value={styles.display ?? ''}
            options={['flex', 'block', 'inline-flex', 'inline', 'grid', 'none']}
            onChange={(v) => handleChange('display', v)}
          />
          <SelectField
            label="方向"
            isOverridden={overriddenProps.has('flexDirection')}
            value={styles.flexDirection ?? ''}
            options={['row', 'column', 'row-reverse', 'column-reverse']}
            onChange={(v) => handleChange('flexDirection', v)}
          />
          <SelectField
            label="主轴"
            isOverridden={overriddenProps.has('justifyContent')}
            value={styles.justifyContent ?? ''}
            options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']}
            onChange={(v) => handleChange('justifyContent', v)}
          />
          <SelectField
            label="交叉轴"
            isOverridden={overriddenProps.has('alignItems')}
            value={styles.alignItems ?? ''}
            options={['flex-start', 'center', 'flex-end', 'stretch', 'baseline']}
            onChange={(v) => handleChange('alignItems', v)}
          />
          <SelectField
            label="换行"
            isOverridden={overriddenProps.has('flexWrap')}
            value={styles.flexWrap ?? ''}
            options={['nowrap', 'wrap', 'wrap-reverse']}
            onChange={(v) => handleChange('flexWrap', v)}
          />
          <NumericInput
            label="Gap"
            isOverridden={overriddenProps.has('gap')}
            value={styles.gap ?? ''}
            onChange={(v) => handleChange('gap', v)}
            placeholder="0"
          />
          <SelectField
            label="Overflow"
            isOverridden={overriddenProps.has('overflow')}
            value={styles.overflow ?? ''}
            options={['visible', 'hidden', 'scroll', 'auto']}
            onChange={(v) => handleChange('overflow', v)}
          />
        </div>
      </CollapsibleSection>

      {/* 2. Size */}
      <CollapsibleSection title="尺寸" defaultOpen>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          <NumericInput label="W"
            isOverridden={overriddenProps.has('width')} value={styles.width ?? ''} onChange={(v) => handleChange('width', v)} placeholder="auto" />
          <NumericInput label="H"
            isOverridden={overriddenProps.has('height')} value={styles.height ?? ''} onChange={(v) => handleChange('height', v)} placeholder="auto" />
          <NumericInput label="minW"
            isOverridden={overriddenProps.has('minWidth')} value={styles.minWidth ?? ''} onChange={(v) => handleChange('minWidth', v)} placeholder="0" />
          <NumericInput label="maxW"
            isOverridden={overriddenProps.has('maxWidth')} value={styles.maxWidth ?? ''} onChange={(v) => handleChange('maxWidth', v)} placeholder="none" />
          <NumericInput label="minH"
            isOverridden={overriddenProps.has('minHeight')} value={styles.minHeight ?? ''} onChange={(v) => handleChange('minHeight', v)} placeholder="0" />
          <NumericInput label="maxH"
            isOverridden={overriddenProps.has('maxHeight')} value={styles.maxHeight ?? ''} onChange={(v) => handleChange('maxHeight', v)} placeholder="none" />
        </div>
      </CollapsibleSection>

      {/* 3. Spacing */}
      <CollapsibleSection title="间距" defaultOpen>
        <BoxModelEditor
          margin={{
            top: String(styles.marginTop ?? ''),
            right: String(styles.marginRight ?? ''),
            bottom: String(styles.marginBottom ?? ''),
            left: String(styles.marginLeft ?? ''),
          }}
          padding={{
            top: String(styles.paddingTop ?? ''),
            right: String(styles.paddingRight ?? ''),
            bottom: String(styles.paddingBottom ?? ''),
            left: String(styles.paddingLeft ?? ''),
          }}
          onMarginChange={handleChange}
          onPaddingChange={handleChange}
        />
      </CollapsibleSection>

      {/* 4. Position */}
      <CollapsibleSection title="定位">
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          <div className="col-span-2">
            <SelectField
              label="Position"
            isOverridden={overriddenProps.has('position')}
              value={styles.position ?? ''}
              options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
              onChange={(v) => handleChange('position', v)}
            />
          </div>
          <NumericInput label="Top"
            isOverridden={overriddenProps.has('top')} value={styles.top ?? ''} onChange={(v) => handleChange('top', v)} placeholder="auto" />
          <NumericInput label="Right"
            isOverridden={overriddenProps.has('right')} value={styles.right ?? ''} onChange={(v) => handleChange('right', v)} placeholder="auto" />
          <NumericInput label="Bottom"
            isOverridden={overriddenProps.has('bottom')} value={styles.bottom ?? ''} onChange={(v) => handleChange('bottom', v)} placeholder="auto" />
          <NumericInput label="Left"
            isOverridden={overriddenProps.has('left')} value={styles.left ?? ''} onChange={(v) => handleChange('left', v)} placeholder="auto" />
          <NumericInput label="z-index"
            isOverridden={overriddenProps.has('zIndex')} value={styles.zIndex ?? ''} onChange={(v) => handleChange('zIndex', v)} placeholder="auto" units={['']} />
        </div>
      </CollapsibleSection>

      {/* 5. Background */}
      <CollapsibleSection title="背景">
        <BackgroundEditor styles={styles} onChange={handleChange} />
      </CollapsibleSection>

      {/* 5b. Mask */}
      <MaskSection styles={styles} onChange={handleChange} nodeId={nodeId} />

      {/* 6. Border */}
      <CollapsibleSection title="边框">
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
            <NumericInput label="宽度"
            isOverridden={overriddenProps.has('borderWidth')} value={styles.borderWidth ?? ''} onChange={(v) => handleChange('borderWidth', v)} placeholder="0" />
            <SelectField
              label="样式"
            isOverridden={overriddenProps.has('borderStyle')}
              value={styles.borderStyle ?? ''}
              options={['none', 'solid', 'dashed', 'dotted', 'double']}
              onChange={(v) => handleChange('borderStyle', v)}
            />
          </div>
          <ColorPicker
            label="颜色"
            value={styles.borderColor ?? ''}
            isOverridden={overriddenProps.has("borderColor")}
            onChange={(v) => handleChange('borderColor', v)}
            showOpacity={false}
          />
          <NumericInput
            label="圆角"
            isOverridden={overriddenProps.has('borderRadius')}
            value={styles.borderRadius ?? ''}
            onChange={(v) => handleChange('borderRadius', v)}
            placeholder="0"
          />
        </div>
      </CollapsibleSection>

      {/* 7. Typography */}
      <CollapsibleSection title="文字">
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          <NumericInput label="字号"
            isOverridden={overriddenProps.has('fontSize')} value={styles.fontSize ?? ''} onChange={(v) => handleChange('fontSize', v)} placeholder="14" />
          <SelectField
            label="字重"
            isOverridden={overriddenProps.has('fontWeight')}
            value={styles.fontWeight ?? ''}
            options={['100', '200', '300', '400', '500', '600', '700', '800', '900']}
            onChange={(v) => handleChange('fontWeight', v)}
          />
          <NumericInput label="行高"
            isOverridden={overriddenProps.has('lineHeight')} value={styles.lineHeight ?? ''} onChange={(v) => handleChange('lineHeight', v)} placeholder="normal" />
          <NumericInput label="字距"
            isOverridden={overriddenProps.has('letterSpacing')} value={styles.letterSpacing ?? ''} onChange={(v) => handleChange('letterSpacing', v)} placeholder="normal" />
          <SelectField
            label="对齐"
            isOverridden={overriddenProps.has('textAlign')}
            value={styles.textAlign ?? ''}
            options={['left', 'center', 'right', 'justify']}
            onChange={(v) => handleChange('textAlign', v)}
          />
          <SelectField
            label="装饰"
            isOverridden={overriddenProps.has('textDecoration')}
            value={styles.textDecoration ?? ''}
            options={['none', 'underline', 'line-through', 'overline']}
            onChange={(v) => handleChange('textDecoration', v)}
          />
          <div className="col-span-2">
            <ColorPicker
              label="颜色"
              value={styles.color ?? ''}
              isOverridden={overriddenProps.has("color")}
              onChange={(v) => handleChange('color', v)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 8. Effects */}
      <CollapsibleSection title="效果">
        <div className="flex flex-col gap-1.5">
          <NumericInput
            label="透明"
            isOverridden={overriddenProps.has('opacity')}
            value={styles.opacity ?? ''}
            onChange={(v) => handleChange('opacity', v)}
            min={0}
            max={1}
            step={0.05}
            units={['']}
            placeholder="1"
          />
          <ShadowEditor value={styles.boxShadow ?? ''} onChange={(v) => handleChange('boxShadow', v)} />
          <FilterEditor value={styles.filter ?? ''} onChange={(v) => handleChange('filter', v)} />
          <SelectField
            label="Cursor"
            isOverridden={overriddenProps.has('cursor')}
            value={styles.cursor ?? ''}
            options={['default', 'pointer', 'move', 'text', 'not-allowed', 'grab']}
            onChange={(v) => handleChange('cursor', v)}
          />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500 w-8 text-right flex-shrink-0">变换</span>
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
              value={styles.transform ?? ''}
              placeholder="none"
              onChange={(e) => handleChange('transform', e.target.value)}
            />
          </div>
          <TransitionEditor value={styles.transition ?? ''} onChange={(v) => handleChange('transition', v)} />
        </div>
      </CollapsibleSection>

      {/* 9. Other styles (未被其他分区覆盖的属性) */}
      <OtherStylesSection styles={styles} onChange={handleChange} />
    </div>
  );
});

/* ── Collapsible Section ── */

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

/* ── Shadow Editor ── */

function parseShadow(raw: string) {
  if (!raw) return { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.1)', inset: false };
  const inset = raw.includes('inset');
  const nums = raw.replace('inset', '').trim().match(/-?\d+/g);
  const parts = nums?.map(Number) ?? [0, 2, 8, 0];
  const colorMatch = raw.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]+|\w+)$/);
  return { x: parts[0] ?? 0, y: parts[1] ?? 2, blur: parts[2] ?? 8, spread: parts[3] ?? 0, color: colorMatch?.[1] ?? 'rgba(0,0,0,0.1)', inset };
}

function shadowToString(s: { x: number; y: number; blur: number; spread: number; color: string; inset: boolean }) {
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
}

function ShadowEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const shadow = parseShadow(value);

  const update = (patch: Partial<typeof shadow>) => {
    onChange(shadowToString({ ...shadow, ...patch }));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 w-8 text-right flex-shrink-0">阴影</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
          value={value}
          placeholder="0 2px 8px rgba(0,0,0,0.1)"
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="text-gray-400 hover:text-blue-500 text-[10px] px-1" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '可视'}
        </button>
      </div>
      {expanded && (
        <div className="grid grid-cols-2 gap-y-1 gap-x-2 pl-10 text-[10px]">
          <NumericInput label="X" value={`${shadow.x}px`} onChange={(v) => update({ x: parseFloat(v) || 0 })} placeholder="0" />
          <NumericInput label="Y" value={`${shadow.y}px`} onChange={(v) => update({ y: parseFloat(v) || 0 })} placeholder="2" />
          <NumericInput label="模糊" value={`${shadow.blur}px`} onChange={(v) => update({ blur: Math.max(0, parseFloat(v) || 0) })} placeholder="8" min={0} />
          <NumericInput label="扩展" value={`${shadow.spread}px`} onChange={(v) => update({ spread: parseFloat(v) || 0 })} placeholder="0" />
          <div className="col-span-2">
            <ColorPicker label="颜色" value={shadow.color} onChange={(v) => update({ color: v })} />
          </div>
          <label className="col-span-2 flex items-center gap-1 text-gray-600">
            <input type="checkbox" checked={shadow.inset} onChange={(e) => update({ inset: e.target.checked })} />
            Inset
          </label>
        </div>
      )}
    </div>
  );
}

/* ── Background Editor (multi-layer) ── */

interface BgLayer {
  type: 'solid' | 'gradient' | 'image';
  value: string;
}

function parseBackgroundLayers(styles: Record<string, string>): BgLayer[] {
  const layers: BgLayer[] = [];
  if (styles.backgroundColor) {
    layers.push({ type: 'solid', value: styles.backgroundColor });
  }
  const bgImage = styles.backgroundImage ?? '';
  if (bgImage) {
    const parts = bgImage.split(/,(?![^(]*\))/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'none') continue;
      if (/^(linear|radial|conic)-gradient/.test(trimmed)) {
        layers.push({ type: 'gradient', value: trimmed });
      } else {
        layers.push({ type: 'image', value: trimmed });
      }
    }
  }
  return layers;
}

function layersToStyles(layers: BgLayer[]): { backgroundColor?: string; backgroundImage?: string } {
  const solids = layers.filter((l) => l.type === 'solid');
  const images = layers.filter((l) => l.type !== 'solid');
  return {
    backgroundColor: solids[solids.length - 1]?.value || undefined,
    backgroundImage: images.length > 0 ? images.map((l) => l.value).join(', ') : undefined,
  };
}

/** 背景图片输入：文本框 + 上传按钮 */
function BgImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const projectId = editorStore.project?.id;

  const upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/assets/upload`, {
      method: 'POST',
      body: fd,
    });
    const data: AssetUploadResponse = await res.json();
    if (!res.ok || !data.url) return;
    onChange(`url(${data.url})`);
  }, [projectId, onChange]);

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
        value={value}
        placeholder="url(/uploads/…)"
        onChange={(e) => onChange(e.target.value)}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e)} />
      <button
        type="button"
        className="flex-shrink-0 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded hover:bg-gray-50"
        disabled={!projectId}
        onClick={() => fileRef.current?.click()}
      >
        上传
      </button>
    </div>
  );
}

function BackgroundEditor({
  styles,
  onChange,
}: {
  styles: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [layers, setLayers] = useState<BgLayer[]>(() => parseBackgroundLayers(styles));

  const commit = (next: BgLayer[]) => {
    setLayers(next);
    const result = layersToStyles(next);
    onChange('backgroundColor', result.backgroundColor ?? '');
    onChange('backgroundImage', result.backgroundImage ?? '');
  };

  const addLayer = (type: 'solid' | 'gradient' | 'image') => {
    const defaults: Record<string, string> = {
      solid: '#ffffff',
      gradient: 'linear-gradient(180deg, #ffffff 0%, #000000 100%)',
      image: 'url()',
    };
    commit([...layers, { type, value: defaults[type] }]);
  };

  const removeLayer = (idx: number) => {
    commit(layers.filter((_, i) => i !== idx));
  };

  const updateLayer = (idx: number, value: string) => {
    const next = layers.map((l, i) => (i === idx ? { ...l, value } : l));
    commit(next);
  };

  const moveLayer = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  };

  const typeLabels: Record<string, string> = { solid: '纯色', gradient: '渐变', image: '图片' };

  return (
    <div className="flex flex-col gap-1.5">
      {layers.map((layer, idx) => (
        <div key={idx} className="border border-gray-100 rounded p-1.5 bg-gray-50/50">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-gray-500 font-medium">{typeLabels[layer.type]}</span>
            <span className="flex-1" />
            <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveLayer(idx, -1)} title="上移">↑</button>
            <button type="button" className="text-gray-400 hover:text-gray-600 text-[10px]" onClick={() => moveLayer(idx, 1)} title="下移">↓</button>
            <button type="button" className="text-gray-400 hover:text-red-500 text-[10px]" onClick={() => removeLayer(idx)} title="删除">×</button>
          </div>
          {layer.type === 'solid' ? (
            <ColorPicker label="颜色" value={layer.value} onChange={(v) => updateLayer(idx, v)} />
          ) : layer.type === 'image' ? (
            <BgImageInput value={layer.value} onChange={(v) => updateLayer(idx, v)} />
          ) : (
            <input
              type="text"
              className="w-full h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
              value={layer.value}
              placeholder={layer.type === 'gradient' ? 'linear-gradient(...)' : 'url(...)'}
              onChange={(e) => updateLayer(idx, e.target.value)}
            />
          )}
        </div>
      ))}

      {layers.length === 0 && (
        <div className="text-[10px] text-gray-400 py-1">暂无背景层</div>
      )}

      <div className="flex gap-1">
        <button type="button" className="flex-1 h-6 text-[10px] border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-500 transition-colors" onClick={() => addLayer('solid')}>+ 纯色</button>
        <button type="button" className="flex-1 h-6 text-[10px] border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-500 transition-colors" onClick={() => addLayer('gradient')}>+ 渐变</button>
        <button type="button" className="flex-1 h-6 text-[10px] border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-500 transition-colors" onClick={() => addLayer('image')}>+ 图片</button>
      </div>

      <SelectField
        label="填充"
        value={styles.backgroundSize ?? ''}
        options={['cover', 'contain', 'auto', '100% 100%']}
        onChange={(v) => onChange('backgroundSize', v)}
      />

      {/* 高级编辑入口 → 打开素材编辑器浮层弹窗 */}
      <button
        type="button"
        className="w-full h-6 mt-1 text-[10px] text-blue-500 border border-blue-200 rounded hover:bg-blue-50 hover:border-blue-400 transition-colors"
        onClick={() => editorStore.openMaterialEditor(null, 'gradient')}
      >
        🎨 高级编辑（渐变 / 阴影 / 滤镜 / 素材库）
      </button>
    </div>
  );
}

/* ── Other Styles Section ── */

/** 已在其他分区中展示的属性 key 集合 */
const KNOWN_STYLE_KEYS = new Set([
  // Layout
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap', 'overflow',
  // Size
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  // Spacing
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'margin',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'padding',
  // Position
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
  // Background
  'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition', 'background',
  // Mask (handled by MaskSection)
  'maskImage', 'WebkitMaskImage', 'maskSize', 'WebkitMaskSize', 'maskRepeat', 'WebkitMaskRepeat', 'maskPosition', 'WebkitMaskPosition',
  // Border
  'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
  // Typography
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration', 'color',
  // Effects
  'opacity', 'boxShadow', 'filter', 'cursor', 'transform', 'transition',
]);

function OtherStylesSection({
  styles,
  onChange,
}: {
  styles: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const otherEntries = Object.entries(styles).filter(
    ([key, value]) => value && value !== '' && !KNOWN_STYLE_KEYS.has(key),
  );

  if (otherEntries.length === 0) return null;

  return (
    <CollapsibleSection title={`其他 (${otherEntries.length})`}>
      <div className="flex flex-col gap-1">
        {otherEntries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <span className="text-purple-600 font-mono text-[10px] w-20 text-right flex-shrink-0 truncate" title={key}>{key}</span>
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
            />
            <button
              type="button"
              className="text-gray-300 hover:text-red-400 text-[10px] flex-shrink-0"
              onClick={() => onChange(key, '')}
              title="清除此属性"
            >×</button>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/* ── Mask Section ── */

function MaskSection({
  styles,
  onChange,
  nodeId,
}: {
  styles: Record<string, string>;
  onChange: (key: string, value: string) => void;
  nodeId: string;
}) {
  const maskValue = styles.maskImage || styles.WebkitMaskImage || '';
  const hasMask = !!maskValue;

  if (!hasMask) return null;

  const maskSize = styles.maskSize || styles.WebkitMaskSize || 'cover';
  const maskRepeat = styles.maskRepeat || styles.WebkitMaskRepeat || 'no-repeat';
  const maskPosition = styles.maskPosition || styles.WebkitMaskPosition || 'center';

  const handleRemoveMask = () => {
    onChange('maskImage', '');
    onChange('WebkitMaskImage', '');
    onChange('maskSize', '');
    onChange('WebkitMaskSize', '');
    onChange('maskRepeat', '');
    onChange('WebkitMaskRepeat', '');
    onChange('maskPosition', '');
    onChange('WebkitMaskPosition', '');
  };

  const handleEditMask = () => {
    editorStore.openMaterialEditor(nodeId, 'canvas', { cssTarget: 'mask-image' });
  };

  return (
    <CollapsibleSection title="遮罩" defaultOpen>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 w-8 text-right flex-shrink-0">图片</span>
          <input
            type="text"
            className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono truncate"
            value={maskValue}
            readOnly
            title={maskValue}
          />
          <button
            type="button"
            className="flex-shrink-0 px-1.5 py-0.5 text-[10px] text-red-500 border border-red-200 rounded hover:bg-red-50"
            onClick={handleRemoveMask}
            title="移除遮罩"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          <SelectField
            label="尺寸"
            value={maskSize}
            options={['cover', 'contain', 'auto', '100% 100%']}
            onChange={(v) => {
              onChange('maskSize', v);
              onChange('WebkitMaskSize', v);
            }}
          />
          <SelectField
            label="重复"
            value={maskRepeat}
            options={['no-repeat', 'repeat', 'repeat-x', 'repeat-y']}
            onChange={(v) => {
              onChange('maskRepeat', v);
              onChange('WebkitMaskRepeat', v);
            }}
          />
          <SelectField
            label="位置"
            value={maskPosition}
            options={['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right']}
            onChange={(v) => {
              onChange('maskPosition', v);
              onChange('WebkitMaskPosition', v);
            }}
          />
        </div>
        <button
          type="button"
          className="w-full h-6 text-[10px] text-purple-500 border border-purple-200 rounded hover:bg-purple-50 hover:border-purple-400 transition-colors"
          onClick={handleEditMask}
        >
          🎭 编辑遮罩素材
        </button>
      </div>
    </CollapsibleSection>
  );
}

/* ── Transition Editor ── */

const TRANSITION_PROPERTIES = ['all', 'opacity', 'transform', 'background-color', 'color', 'border', 'box-shadow', 'width', 'height'] as const;
const EASING_OPTIONS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.4, 0, 0.2, 1)'] as const;

function parseTransition(raw: string): { property: string; duration: string; easing: string } {
  if (!raw) return { property: 'all', duration: '0.2s', easing: 'ease' };
  const parts = raw.trim().split(/\s+/);
  return {
    property: parts[0] ?? 'all',
    duration: parts[1] ?? '0.2s',
    easing: parts.slice(2).join(' ') || 'ease',
  };
}

function TransitionEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseTransition(value);

  const commit = (prop: string, dur: string, eas: string) => {
    const v = `${prop} ${dur} ${eas}`.trim();
    onChange(v === 'all 0.2s ease' ? '' : v);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 w-8 text-right flex-shrink-0">过渡</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
          value={value}
          placeholder="all 0.2s ease"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="text-gray-400 hover:text-blue-500 text-[10px] flex-shrink-0"
          onClick={() => setExpanded(!expanded)}
          title="可视化编辑"
        >{expanded ? '▴' : '▾'}</button>
      </div>
      {expanded && (
        <div className="ml-9 flex flex-col gap-1 pl-2 border-l-2 border-blue-100">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-500 w-10 flex-shrink-0">属性</span>
            <select
              className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none"
              value={parsed.property}
              onChange={(e) => commit(e.target.value, parsed.duration, parsed.easing)}
            >
              {TRANSITION_PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-500 w-10 flex-shrink-0">时长</span>
            <input
              type="text"
              className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none font-mono"
              value={parsed.duration}
              placeholder="0.2s"
              onChange={(e) => commit(parsed.property, e.target.value, parsed.easing)}
            />
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-500 w-10 flex-shrink-0">缓动</span>
            <select
              className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none"
              value={parsed.easing}
              onChange={(e) => commit(parsed.property, parsed.duration, e.target.value)}
            >
              {EASING_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {['0.15s', '0.2s', '0.3s', '0.5s'].map((d) => (
              <button
                key={d}
                type="button"
                className={`h-5 px-1.5 text-[10px] rounded border ${
                  parsed.duration === d ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => commit(parsed.property, d, parsed.easing)}
              >{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Filter multi-layer Editor ── */

interface FilterItem {
  fn: string;
  value: string;
}

const FILTER_FNS = ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'] as const;

const FILTER_DEFAULTS: Record<string, string> = {
  blur: '2px',
  brightness: '1',
  contrast: '1',
  grayscale: '0',
  'hue-rotate': '0deg',
  invert: '0',
  saturate: '1',
  sepia: '0',
  'drop-shadow': '2px 4px 6px rgba(0,0,0,0.3)',
};

function parseFilters(raw: string): FilterItem[] {
  if (!raw || raw === 'none') return [];
  const re = /(\w[\w-]*)\(([^)]*)\)/g;
  const result: FilterItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result.push({ fn: m[1], value: m[2] });
  }
  return result;
}

function serializeFilters(items: FilterItem[]): string {
  if (items.length === 0) return 'none';
  return items.map((f) => `${f.fn}(${f.value})`).join(' ');
}

function FilterEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<FilterItem[]>(() => parseFilters(value));

  const commit = (next: FilterItem[]) => {
    setItems(next);
    onChange(serializeFilters(next));
  };

  const addFilter = (fn: string) => {
    commit([...items, { fn, value: FILTER_DEFAULTS[fn] ?? '1' }]);
  };

  const removeFilter = (idx: number) => {
    commit(items.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, val: string) => {
    const next = items.map((f, i) => (i === idx ? { ...f, value: val } : f));
    commit(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-gray-500 font-medium">滤镜</div>

      {items.map((f, idx) => (
        <div key={`${f.fn}-${idx}`} className="flex items-center gap-1 text-xs group">
          <span className="text-purple-600 font-mono text-[10px] w-14 text-right flex-shrink-0">{f.fn}</span>
          <input
            type="text"
            className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
            value={f.value}
            onChange={(e) => updateFilter(idx, e.target.value)}
          />
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-[10px]"
            onClick={() => removeFilter(idx)}
          >×</button>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-[10px] text-gray-400 py-0.5">暂无滤镜</div>
      )}

      <select
        className="h-6 px-1 border border-dashed border-gray-200 rounded text-[10px] bg-white outline-none hover:border-blue-400"
        value=""
        onChange={(e) => {
          if (e.target.value) addFilter(e.target.value);
        }}
      >
        <option value="">+ 添加滤镜…</option>
        {FILTER_FNS.map((fn) => (
          <option key={fn} value={fn}>{fn}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Select Field ── */

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isOverridden?: boolean;
}

function SelectField({ label, value, options, onChange, isOverridden }: SelectFieldProps) {
  return (
    <div className="flex items-center gap-1 text-xs relative">
      <span className="text-gray-500 w-8 text-right flex-shrink-0">{label}</span>
      <select
        className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400 min-w-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {isOverridden && (
        <div
          className="absolute right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"
          title="此属性已在当前状态中被覆盖"
        />
      )}
    </div>
  );
}
