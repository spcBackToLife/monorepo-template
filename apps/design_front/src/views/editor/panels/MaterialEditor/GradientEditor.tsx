/**
 * 渐变编辑器面板
 *
 * 可视化编辑 CSS 渐变：线性/径向/锥形渐变 + 多色标 + 角度调节。
 * 直接输出 CSS 属性值，应用到 Schema.styles。
 *
 * 增强：
 *   - 自动从选中元素的 background 解析并初始化渐变
 *   - 素材编辑器内：可将渐变写入选中图形的 SVG fill（GradientDef），而非页面 background
 *   - 色标支持自定义 rgba 颜色
 *   - 渐变方向拨盘（角度可视化调节）
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Slider, Select, Button, InputNumber, Input, Tooltip, App as AntdApp } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  gradientToCSS,
  parseGradientCSS,
  GRADIENT_PRESETS,
} from '@globallink/material-operations';
import type {
  GradientLayerConfig,
  ColorStop,
  GradientType,
  GradientDef,
} from '@globallink/material-operations';
import { editorStore } from '@/stores/editor';

/** 素材画布：把渐变应用到选中对象的 fill */
export interface MaterialGradientFillTarget {
  selectedIds: string[];
  /** 当前图层 fill（纯色字符串 / GradientDef / null） */
  initialFill: string | GradientDef | null | undefined;
  onApply: (def: GradientDef) => void;
}

interface GradientEditorProps {
  /** 当前节点的 background/backgroundImage 值，用于自动初始化 */
  currentBackground?: string;
  /** 应用渐变到选中节点后的回调 */
  onApply?: (css: string) => void;
  /** 若在素材编辑器中传入，则「应用」写入素材对象 SVG 渐变填充 */
  materialGradientFill?: MaterialGradientFillTarget;
}

/**
 * 尝试从 CSS background 值解析出渐变配置
 */
function tryParseExistingGradient(bg?: string): GradientLayerConfig | null {
  if (!bg) return null;
  // 直接匹配渐变函数
  const match = bg.match(/((?:linear|radial|conic)-gradient\([^)]+(?:\([^)]*\))*[^)]*\))/);
  if (match) {
    return parseGradientCSS(match[1]);
  }
  return null;
}

/** GradientLayerConfig（CSS 工具）→ 素材 schema 的 GradientDef（SVG defs） */
function layerConfigToGradientDef(cfg: GradientLayerConfig): GradientDef {
  const stops = cfg.colorStops.map((s) => ({ color: s.color, offset: s.position }));
  if (cfg.gradientType === 'linear') {
    return { type: 'linear', angle: cfg.angle ?? 135, stops };
  }
  if (cfg.gradientType === 'radial') {
    return {
      type: 'radial',
      stops,
      cx: cfg.centerX ?? 0.5,
      cy: cfg.centerY ?? 0.5,
      r: cfg.radiusX ?? cfg.radiusY ?? 0.5,
    };
  }
  // 锥形：SVG 渲染暂不支持，按线性近似写入
  return { type: 'linear', angle: cfg.angle ?? 135, stops };
}

function gradientDefToLayerConfig(def: GradientDef): GradientLayerConfig {
  const colorStops = def.stops.map((s) => ({ color: s.color, position: s.offset }));
  if (def.type === 'linear') {
    return {
      type: 'gradient',
      gradientType: 'linear',
      angle: def.angle ?? 135,
      colorStops,
      centerX: 0.5,
      centerY: 0.5,
    };
  }
  if (def.type === 'radial') {
    const r = def.r ?? 0.5;
    return {
      type: 'gradient',
      gradientType: 'radial',
      angle: 0,
      colorStops,
      centerX: def.cx ?? 0.5,
      centerY: def.cy ?? 0.5,
      radiusX: r,
      radiusY: r,
    };
  }
  return {
    type: 'gradient',
    gradientType: 'conic',
    angle: def.angle ?? 0,
    colorStops,
    centerX: def.cx ?? 0.5,
    centerY: def.cy ?? 0.5,
  };
}

const DEFAULT_ICON_GRADIENT_STOPS: ColorStop[] = [
  { color: '#f472b6', position: 0 },
  { color: '#fb923c', position: 1 },
];

export function GradientEditor({
  currentBackground,
  onApply,
  materialGradientFill,
}: GradientEditorProps) {
  const { message } = AntdApp.useApp();
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(135);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { color: '#667eea', position: 0 },
    { color: '#764ba2', position: 1 },
  ]);
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);
  const initializedRef = useRef(false);
  const materialInitKeyRef = useRef('');

  // 页面节点：自动从 background 解析并初始化（素材模式不走此分支）
  useEffect(() => {
    if (materialGradientFill) return;
    if (initializedRef.current) return;
    const parsed = tryParseExistingGradient(currentBackground);
    if (parsed) {
      setGradientType(parsed.gradientType);
      setAngle(parsed.angle ?? 135);
      setColorStops(parsed.colorStops);
      if (parsed.centerX != null) setCenterX(parsed.centerX);
      if (parsed.centerY != null) setCenterY(parsed.centerY);
      initializedRef.current = true;
    }
  }, [currentBackground, materialGradientFill]);

  // 素材对象：随选中图层与 fill 同步编辑器状态
  useEffect(() => {
    if (!materialGradientFill) return;
    const { selectedIds, initialFill } = materialGradientFill;
    const key = `${selectedIds.join(',')}:${typeof initialFill === 'object' && initialFill != null ? JSON.stringify(initialFill) : String(initialFill ?? '')}`;
    if (materialInitKeyRef.current === key) return;
    materialInitKeyRef.current = key;

    if (initialFill && typeof initialFill === 'object' && 'stops' in initialFill) {
      const cfg = gradientDefToLayerConfig(initialFill as GradientDef);
      setGradientType(cfg.gradientType);
      setAngle(cfg.angle ?? 135);
      setColorStops([...cfg.colorStops]);
      setCenterX(cfg.centerX ?? 0.5);
      setCenterY(cfg.centerY ?? 0.5);
      return;
    }
    if (typeof initialFill === 'string' && /gradient/i.test(initialFill)) {
      const parsed = tryParseExistingGradient(initialFill);
      if (parsed) {
        setGradientType(parsed.gradientType);
        setAngle(parsed.angle ?? 135);
        setColorStops(parsed.colorStops);
        if (parsed.centerX != null) setCenterX(parsed.centerX);
        if (parsed.centerY != null) setCenterY(parsed.centerY);
        return;
      }
    }
    // 纯色或无填充：预置常见图标渐变，便于一键应用
    setGradientType('linear');
    setAngle(135);
    setColorStops(DEFAULT_ICON_GRADIENT_STOPS.map((s) => ({ ...s })));
    setCenterX(0.5);
    setCenterY(0.5);
  }, [materialGradientFill]);

  // 手动同步：页面节点 background
  const syncFromElement = useCallback(() => {
    const parsed = tryParseExistingGradient(currentBackground);
    if (parsed) {
      setGradientType(parsed.gradientType);
      setAngle(parsed.angle ?? 135);
      setColorStops(parsed.colorStops);
      if (parsed.centerX != null) setCenterX(parsed.centerX);
      if (parsed.centerY != null) setCenterY(parsed.centerY);
      message.success('已同步元素渐变');
    } else {
      message.info('当前元素没有渐变背景');
    }
  }, [currentBackground, message]);

  const syncFromMaterialFill = useCallback(() => {
    const init = materialGradientFill?.initialFill;
    if (!init) {
      message.info('当前图层无填充可同步');
      return;
    }
    if (typeof init === 'object' && 'stops' in init) {
      const cfg = gradientDefToLayerConfig(init as GradientDef);
      setGradientType(cfg.gradientType);
      setAngle(cfg.angle ?? 135);
      setColorStops([...cfg.colorStops]);
      setCenterX(cfg.centerX ?? 0.5);
      setCenterY(cfg.centerY ?? 0.5);
      message.success('已从图层填充同步');
      return;
    }
    if (typeof init === 'string' && /gradient/i.test(init)) {
      const parsed = tryParseExistingGradient(init);
      if (parsed) {
        setGradientType(parsed.gradientType);
        setAngle(parsed.angle ?? 135);
        setColorStops(parsed.colorStops);
        if (parsed.centerX != null) setCenterX(parsed.centerX);
        if (parsed.centerY != null) setCenterY(parsed.centerY);
        message.success('已从图层填充同步');
        return;
      }
    }
    message.info('当前为纯色或无渐变字符串，已切换为默认粉橙渐变模板');
    setGradientType('linear');
    setAngle(135);
    setColorStops(DEFAULT_ICON_GRADIENT_STOPS.map((s) => ({ ...s })));
  }, [materialGradientFill?.initialFill, message]);

  // 构建渐变配置
  const gradientConfig: GradientLayerConfig = useMemo(() => ({
    type: 'gradient',
    gradientType,
    angle,
    colorStops,
    centerX,
    centerY,
  }), [gradientType, angle, colorStops, centerX, centerY]);

  // CSS 输出
  const cssValue = useMemo(() => gradientToCSS(gradientConfig), [gradientConfig]);

  // 预览样式
  const previewStyle = useMemo(() => ({ background: cssValue }), [cssValue]);

  // 操作
  const addColorStop = useCallback(() => {
    const maxPos = Math.max(...colorStops.map((s) => s.position));
    const minPos = Math.min(...colorStops.map((s) => s.position));
    const newPos = (maxPos + minPos) / 2;
    setColorStops((prev) =>
      [...prev, { color: '#ffffff', position: newPos }].sort((a, b) => a.position - b.position),
    );
  }, [colorStops]);

  const removeColorStop = useCallback((index: number) => {
    if (colorStops.length <= 2) return;
    setColorStops((prev) => prev.filter((_, i) => i !== index));
  }, [colorStops.length]);

  const updateColorStop = useCallback((index: number, updates: Partial<ColorStop>) => {
    setColorStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    );
  }, []);

  const applyPreset = useCallback((preset: typeof GRADIENT_PRESETS[number]) => {
    const cfg = preset.config;
    setGradientType(cfg.gradientType);
    setAngle(cfg.angle ?? 135);
    setColorStops([...cfg.colorStops]);
    if (cfg.centerX != null) setCenterX(cfg.centerX);
    if (cfg.centerY != null) setCenterY(cfg.centerY);
  }, []);

  const applyToElement = useCallback(() => {
    if (materialGradientFill) {
      if (materialGradientFill.selectedIds.length === 0) {
        message.warning('请先在画布选中一个图形');
        return;
      }
      if (gradientType === 'conic') {
        message.warning('锥形渐变在 SVG 填充中暂不支持，将按线性渐变写入');
      }
      const def = layerConfigToGradientDef(gradientConfig);
      materialGradientFill.onApply(def);
      return;
    }

    const nodeId = editorStore.selectedNodeIds[0];
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    editorStore.execute({
      type: 'style.update',
      params: {
        nodeId,
        styles: { background: cssValue },
      },
    });

    onApply?.(cssValue);
    message.success('渐变已应用');
  }, [cssValue, onApply, message, materialGradientFill, gradientType, gradientConfig]);

  const copyCSS = useCallback(async () => {
    await navigator.clipboard.writeText(`background: ${cssValue};`);
    message.success('CSS 已复制');
  }, [cssValue, message]);

  return (
    <div className="space-y-3">
      {materialGradientFill && (
        <p className="text-[10px] text-gray-500 leading-snug m-0">
          正在编辑<strong>素材图层</strong>填充：点击下方「应用到选中图层」写入 SVG 渐变（非页面 background）。
        </p>
      )}
      {/* 预览区 */}
      <div
        style={{ ...previewStyle, height: 80, borderRadius: 8, border: '1px solid #e5e7eb' }}
      />

      {/* 渐变类型 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500 w-14 shrink-0">类型</span>
        <Select
          size="small"
          value={gradientType}
          onChange={(v) => setGradientType(v)}
          style={{ flex: 1 }}
          options={[
            { label: '线性', value: 'linear' },
            { label: '径向', value: 'radial' },
            { label: '锥形', value: 'conic' },
          ]}
        />
      </div>

      {/* 角度（线性 / 锥形） */}
      {(gradientType === 'linear' || gradientType === 'conic') && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 w-14 shrink-0">角度</span>
          <Slider
            min={0}
            max={360}
            value={angle}
            onChange={(v) => setAngle(v)}
            style={{ flex: 1 }}
          />
          <InputNumber
            size="small"
            min={0}
            max={360}
            value={angle}
            onChange={(v) => v != null && setAngle(v)}
            style={{ width: 64 }}
            suffix="°"
          />
        </div>
      )}

      {/* 中心点（径向 / 锥形） */}
      {(gradientType === 'radial' || gradientType === 'conic') && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 w-14 shrink-0">中心</span>
          <InputNumber
            size="small"
            min={0}
            max={100}
            value={Math.round(centerX * 100)}
            onChange={(v) => v != null && setCenterX(v / 100)}
            style={{ width: 60 }}
            suffix="%"
          />
          <InputNumber
            size="small"
            min={0}
            max={100}
            value={Math.round(centerY * 100)}
            onChange={(v) => v != null && setCenterY(v / 100)}
            style={{ width: 60 }}
            suffix="%"
          />
        </div>
      )}

      {/* 色标列表 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">色标</span>
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={addColorStop}
          >
            添加
          </Button>
        </div>

        {colorStops.map((stop, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="color"
              value={stop.color.startsWith('#') ? stop.color : '#000000'}
              onChange={(e) => updateColorStop(idx, { color: e.target.value })}
              className="w-6 h-6 rounded border border-gray-200 cursor-pointer p-0"
              style={{ backgroundColor: stop.color }}
            />
            <Input
              size="small"
              value={stop.color}
              onChange={(e) => updateColorStop(idx, { color: e.target.value })}
              style={{ flex: 1, fontSize: 11 }}
              placeholder="#hex / rgba()"
            />
            <InputNumber
              size="small"
              min={0}
              max={100}
              value={Math.round(stop.position * 100)}
              onChange={(v) => v != null && updateColorStop(idx, { position: v / 100 })}
              style={{ width: 56 }}
              suffix="%"
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={colorStops.length <= 2}
              onClick={() => removeColorStop(idx)}
            />
          </div>
        ))}
      </div>

      {/* 预设渐变模板 */}
      <div>
        <span className="text-[11px] text-gray-500 mb-1 block">预设</span>
        <div className="flex flex-wrap gap-1">
          {GRADIENT_PRESETS.map((preset) => (
            <Tooltip key={preset.nameEn} title={`${preset.name} (${preset.nameEn})`}>
              <button
                type="button"
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow"
                style={{ background: gradientToCSS(preset.config) }}
                onClick={() => applyPreset(preset)}
              />
            </Tooltip>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={applyToElement}
          disabled={
            materialGradientFill
              ? materialGradientFill.selectedIds.length === 0
              : !editorStore.selectedNodeIds[0]
          }
        >
          {materialGradientFill ? '应用到选中图层' : '应用到元素'}
        </Button>
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => void copyCSS()}
        >
          复制 CSS
        </Button>
        {(currentBackground || materialGradientFill?.initialFill) && (
          <Tooltip title={materialGradientFill ? '从当前图层填充同步' : '从当前元素同步渐变'}>
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={materialGradientFill ? syncFromMaterialFill : syncFromElement}
            >
              同步
            </Button>
          </Tooltip>
        )}
      </div>

      {/* CSS 预览 */}
      <div className="bg-gray-50 rounded p-2">
        <code className="text-[10px] text-gray-600 break-all leading-relaxed">
          background: {cssValue};
        </code>
      </div>
    </div>
  );
}
