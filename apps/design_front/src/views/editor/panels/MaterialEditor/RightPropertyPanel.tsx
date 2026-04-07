/**
 * 右侧属性面板 — 严格对照 README §4.2
 *
 * ── 图层属性 ──
 *   类型: 渐变 / 矩形 / 文字 / 图片 / ...
 *   （类型相关的属性编辑器）
 *
 * ── 通用属性 ──
 *   透明度: ━●━ 0.8
 *   混合: [normal▾]
 *
 * ── 变换 ──
 *   旋转: 0°
 *   缩放: 100%
 *   位移: X:0 Y:0
 *
 * 上下文切换：
 *   - 效果工具激活时，面板切换为对应的编辑器（渐变/填充/滤镜/蒙版）
 */
import { useState } from 'react';
import { InputNumber, Slider, Select, Button, Divider, ColorPicker, Switch } from 'antd';
import type { MaterialEditorCore, BlendMode } from '@globallink/material-editor';
import { BLEND_MODES, BLEND_MODE_LABELS, CANVAS_FILTER_RANGES } from '@globallink/material-editor';
import type { CanvasFilterConfig, CanvasFilterType } from '@globallink/material-editor';
import type { EffectToolType } from './LeftToolbar';
import { GradientEditor } from './GradientEditor';
import { FilterEditor } from './FilterEditor';
import { ShadowEditor } from './ShadowEditor';

/** 右侧面板模式 */
export type RightPanelMode =
  | 'object-props'   // 选中对象属性
  | 'gradient-edit'  // 渐变工具
  | 'fill-edit'      // 填充工具
  | 'filter-edit'    // 滤镜工具
  | 'mask-edit'      // 蒙版工具
  | 'shadow-edit'    // 阴影编辑
  | 'no-selection';  // 无选中

export interface SelectedObjectInfo {
  type: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  // 文字特有
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: string;
  // 矩形特有
  rx?: number;
  ry?: number;
  // 多边形特有
  sides?: number;
}

interface RightPropertyPanelProps {
  mode: RightPanelMode;
  selectedObject: SelectedObjectInfo | null;
  selectionCount: number;
  editorRef: React.RefObject<MaterialEditorCore | null>;
  blendMode: BlendMode;
  onBlendModeChange: (mode: BlendMode) => void;
  onPropertyChange: (updates: Record<string, unknown>) => void;
  // 效果工具数据
  currentBackground?: string;
  currentFilter?: string;
  currentBoxShadow?: string;
  currentTextShadow?: string;
}

/** 属性行 */
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[10px] text-gray-400 w-8 shrink-0 text-right">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/** 段落标题 */
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-3 first:mt-0">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-[10px] font-medium text-gray-500 px-1">{title}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

/** 对象属性面板（默认模式） */
function ObjectPropsPanel({
  selectedObject,
  blendMode,
  onBlendModeChange,
  onPropertyChange,
}: {
  selectedObject: SelectedObjectInfo;
  blendMode: BlendMode;
  onBlendModeChange: (mode: BlendMode) => void;
  onPropertyChange: (updates: Record<string, unknown>) => void;
}) {
  const obj = selectedObject;

  const typeLabel: Record<string, string> = {
    rect: '矩形', ellipse: '椭圆', polygon: '多边形', line: '线段',
    path: '路径', textbox: '文字', image: '图片', group: '组', circle: '圆形',
    __frame_bg__: '参考框背景',
  };

  // 如果选中的是参考框背景，只显示填充色编辑器
  const isFrameBg = obj.type === '__frame_bg__';

  return (
    <>
      {/* 图层属性 */}
      <SectionTitle title={isFrameBg ? '参考框' : '图层属性'} />

      <PropRow label="类型">
        <span className="text-[11px] text-gray-700 font-medium">
          {typeLabel[obj.type] ?? obj.type}
        </span>
      </PropRow>

      {/* 填充色 — 参考框背景和普通对象都显示 */}
      <PropRow label="填充">
        <ColorPicker
          size="small"
          value={obj.fill ?? '#ffffff'}
          onChange={(_, hex) => onPropertyChange({ fill: hex })}
          showText
          format="hex"
        />
      </PropRow>

      {/* 参考框背景只显示填充色和透明度 */}
      {isFrameBg && (
        <>
          <PropRow label="透明">
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={obj.opacity ?? 1}
              onChange={(v) => onPropertyChange({ opacity: v })}
            />
          </PropRow>
          <div className="text-[10px] text-gray-400 mt-2 space-y-1">
            <p>参考框代表元素的实际区域，是画布最底层的元素。</p>
            <p>✅ 可修改填充色、透明度</p>
            <p>✅ 可与其他元素做布尔运算</p>
            <p>✅ 导出时只导出此区域的内容</p>
            <p>❌ 不可移动/缩放/删除</p>
          </div>
        </>
      )}

      {/* 以下属性仅普通对象显示 */}
      {!isFrameBg && (
        <>
          {/* 描边 */}
          <PropRow label="描边">
            <div className="flex items-center gap-1">
              <ColorPicker
                size="small"
                value={obj.stroke ?? '#000000'}
                onChange={(_, hex) => onPropertyChange({ stroke: hex })}
              />
              <InputNumber
                size="small"
                min={0}
                max={20}
                value={obj.strokeWidth ?? 0}
                onChange={(v) => v != null && onPropertyChange({ strokeWidth: v })}
                style={{ width: 52 }}
                suffix="px"
              />
            </div>
          </PropRow>

          {/* 矩形圆角 */}
          {obj.type === 'rect' && (
            <PropRow label="圆角">
              <InputNumber
                size="small"
                min={0}
                max={200}
                value={obj.rx ?? 0}
                onChange={(v) => v != null && onPropertyChange({ rx: v, ry: v })}
                style={{ width: '100%' }}
                suffix="px"
              />
            </PropRow>
          )}

          {/* 文字属性 */}
          {obj.type === 'textbox' && (
            <>
              <Divider className="my-1.5" />
              <PropRow label="字号">
                <InputNumber
                  size="small"
                  min={8}
                  max={200}
                  value={obj.fontSize ?? 24}
                  onChange={(v) => v != null && onPropertyChange({ fontSize: v })}
                  style={{ width: '100%' }}
                />
              </PropRow>
              <PropRow label="字体">
                <Select
                  size="small"
                  value={obj.fontFamily ?? 'Arial, sans-serif'}
                  onChange={(v) => onPropertyChange({ fontFamily: v })}
                  options={[
                    { value: 'Arial, sans-serif', label: 'Arial' },
                    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                    { value: 'Georgia, serif', label: 'Georgia' },
                    { value: 'PingFang SC, sans-serif', label: '苹方' },
                    { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
                  ]}
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={false}
                />
              </PropRow>
              <PropRow label="粗细">
                <Select
                  size="small"
                  value={String(obj.fontWeight ?? 'normal')}
                  onChange={(v) => onPropertyChange({ fontWeight: v })}
                  options={[
                    { value: 'normal', label: '常规' },
                    { value: 'bold', label: '粗体' },
                    { value: '100', label: '100' },
                    { value: '300', label: '300' },
                    { value: '500', label: '500' },
                    { value: '700', label: '700' },
                    { value: '900', label: '900' },
                  ]}
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={false}
                />
              </PropRow>
            </>
          )}

          {/* 通用属性 */}
          <SectionTitle title="通用属性" />

          <PropRow label="透明">
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={obj.opacity ?? 1}
              onChange={(v) => onPropertyChange({ opacity: v })}
            />
          </PropRow>

          <PropRow label="混合">
            <Select
              size="small"
              value={blendMode}
              onChange={onBlendModeChange}
              options={BLEND_MODES.map((m) => ({
                value: m,
                label: BLEND_MODE_LABELS[m],
              }))}
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
            />
          </PropRow>

          {/* 变换 */}
          <SectionTitle title="变换" />

          <PropRow label="旋转">
            <InputNumber
              size="small"
              min={-360}
              max={360}
              value={Math.round(obj.angle ?? 0)}
              onChange={(v) => v != null && onPropertyChange({ angle: v })}
              style={{ width: '100%' }}
              suffix="°"
            />
          </PropRow>

          <PropRow label="缩放">
            <div className="flex gap-1">
              <InputNumber
                size="small"
                min={1}
                max={500}
                value={Math.round((obj.scaleX ?? 1) * 100)}
                onChange={(v) => v != null && onPropertyChange({ scaleX: v / 100, scaleY: v / 100 })}
                style={{ flex: 1 }}
                suffix="%"
              />
            </div>
          </PropRow>

          <PropRow label="位移">
            <div className="flex gap-1">
              <InputNumber
                size="small"
                value={Math.round(obj.left ?? 0)}
                onChange={(v) => v != null && onPropertyChange({ left: v })}
                style={{ flex: 1 }}
                prefix={<span className="text-[9px] text-gray-300">X</span>}
              />
              <InputNumber
                size="small"
                value={Math.round(obj.top ?? 0)}
                onChange={(v) => v != null && onPropertyChange({ top: v })}
                style={{ flex: 1 }}
                prefix={<span className="text-[9px] text-gray-300">Y</span>}
              />
            </div>
          </PropRow>

          <PropRow label="尺寸">
            <div className="flex gap-1">
              <InputNumber
                size="small"
                min={1}
                value={Math.round(obj.width ?? 0)}
                onChange={(v) => v != null && onPropertyChange({ width: v })}
                style={{ flex: 1 }}
                prefix={<span className="text-[9px] text-gray-300">W</span>}
              />
              <InputNumber
                size="small"
                min={1}
                value={Math.round(obj.height ?? 0)}
                onChange={(v) => v != null && onPropertyChange({ height: v })}
                style={{ flex: 1 }}
                prefix={<span className="text-[9px] text-gray-300">H</span>}
              />
            </div>
          </PropRow>
        </>
      )}
    </>
  );
}

/** 无选中状态面板 */
function NoSelectionPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
      <span className="text-2xl mb-2">🎨</span>
      <span className="text-[11px]">选中画布上的对象</span>
      <span className="text-[10px]">查看和编辑属性</span>
    </div>
  );
}

/** D.4: Canvas 增强滤镜面板（仅图片对象可用） */
function CanvasFilterPanel({
  editorRef,
}: {
  editorRef: React.RefObject<MaterialEditorCore | null>;
}) {
  const [filters, setFilters] = useState<CanvasFilterConfig[]>([
    { type: 'noise', intensity: 0, enabled: false },
    { type: 'pixelate', intensity: 1, enabled: false },
    { type: 'sharpen', intensity: 0, enabled: false },
    { type: 'emboss', intensity: 0, enabled: false },
  ]);

  const isImage = editorRef.current?.isSelectedImage() ?? false;

  const updateFilter = (type: CanvasFilterType, updates: Partial<CanvasFilterConfig>) => {
    setFilters((prev) =>
      prev.map((f) => (f.type === type ? { ...f, ...updates } : f)),
    );
  };

  const applyFilters = () => {
    editorRef.current?.applyCanvasFiltersToSelected(filters);
  };

  const FILTER_LABELS_MAP: Record<CanvasFilterType, string> = {
    noise: '噪点',
    pixelate: '像素化',
    sharpen: '锐化',
    emboss: '浮雕',
  };

  return (
    <>
      <SectionTitle title="Canvas 增强滤镜" />
      {!isImage && (
        <div className="text-[10px] text-gray-400 py-1">
          选中图片对象后可使用 Canvas 增强滤镜
        </div>
      )}
      <div className="space-y-1.5">
        {filters.map((filter) => {
          const range = CANVAS_FILTER_RANGES[filter.type];
          return (
            <div key={filter.type} className="flex items-center gap-1">
              <Switch
                size="small"
                checked={filter.enabled}
                onChange={(v) => updateFilter(filter.type, { enabled: v })}
                disabled={!isImage}
              />
              <span className="text-[10px] text-gray-600 w-8 shrink-0 truncate">
                {FILTER_LABELS_MAP[filter.type]}
              </span>
              <Slider
                min={range.min}
                max={range.max}
                step={range.step}
                value={filter.intensity}
                onChange={(v) => updateFilter(filter.type, { intensity: v })}
                style={{ flex: 1 }}
                disabled={!filter.enabled || !isImage}
              />
            </div>
          );
        })}
      </div>
      <Button
        size="small"
        block
        disabled={!isImage || !filters.some((f) => f.enabled)}
        onClick={applyFilters}
        className="mt-1.5"
      >
        应用增强滤镜
      </Button>
    </>
  );
}

/** D.5: 对象阴影编辑面板 */
function ObjectShadowPanel({
  editorRef,
}: {
  editorRef: React.RefObject<MaterialEditorCore | null>;
}) {
  const [hasShadow, setHasShadow] = useState(false);
  const [color, setColor] = useState('rgba(0,0,0,0.3)');
  const [blur, setBlur] = useState(10);
  const [offsetX, setOffsetX] = useState(4);
  const [offsetY, setOffsetY] = useState(4);

  // 从选中对象读取阴影
  const syncFromObject = () => {
    const shadow = editorRef.current?.getObjectShadow();
    if (shadow) {
      setHasShadow(true);
      setColor(shadow.color);
      setBlur(shadow.blur);
      setOffsetX(shadow.offsetX);
      setOffsetY(shadow.offsetY);
    } else {
      setHasShadow(false);
    }
  };

  const applyShadow = () => {
    if (!hasShadow) {
      editorRef.current?.setObjectShadow(null);
    } else {
      editorRef.current?.setObjectShadow({ color, blur, offsetX, offsetY });
    }
  };

  return (
    <>
      <SectionTitle title="对象阴影" />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">启用阴影</span>
          <Switch
            size="small"
            checked={hasShadow}
            onChange={(v) => {
              setHasShadow(v);
              if (!v) editorRef.current?.setObjectShadow(null);
            }}
          />
        </div>
        {hasShadow && (
          <>
            <PropRow label="颜色">
              <ColorPicker
                size="small"
                value={color}
                onChange={(_, hex) => setColor(hex)}
                showText
                format="hex"
              />
            </PropRow>
            <PropRow label="模糊">
              <Slider min={0} max={50} value={blur} onChange={setBlur} />
            </PropRow>
            <PropRow label="X偏移">
              <InputNumber size="small" value={offsetX} onChange={(v) => v != null && setOffsetX(v)} style={{ width: '100%' }} />
            </PropRow>
            <PropRow label="Y偏移">
              <InputNumber size="small" value={offsetY} onChange={(v) => v != null && setOffsetY(v)} style={{ width: '100%' }} />
            </PropRow>
            <Button size="small" block onClick={applyShadow}>
              应用阴影
            </Button>
          </>
        )}
        <Button size="small" type="link" className="text-[10px] px-0" onClick={syncFromObject}>
          从选中对象同步
        </Button>
      </div>
    </>
  );
}

/** 蒙版与布尔运算面板（增强 D.3） */
function MaskPanel({
  selectionCount,
  editorRef,
}: {
  selectionCount: number;
  editorRef: React.RefObject<MaterialEditorCore | null>;
}) {
  return (
    <>
      <SectionTitle title="蒙版操作" />
      <div className="space-y-2 text-[11px] text-gray-600">
        <p>选中两个对象：底层对象 + 蒙版形状，然后执行蒙版操作。</p>
        <Button
          size="small"
          block
          disabled={selectionCount !== 2}
          onClick={() => editorRef.current?.applyClipMask()}
        >
          🎭 应用蒙版
        </Button>
        <Button
          size="small"
          block
          onClick={() => editorRef.current?.removeClipMask()}
        >
          🚫 移除蒙版
        </Button>
      </div>

      {/* 布尔运算 — README §4.3 能力1 */}
      <SectionTitle title="布尔运算" />
      <div className="space-y-1.5">
        <Button
          size="small"
          block
          disabled={selectionCount !== 2}
          onClick={() => void editorRef.current?.performBooleanOp('union')}
        >
          ⊕ 合并 (Union)
        </Button>
        <Button
          size="small"
          block
          disabled={selectionCount !== 2}
          onClick={() => void editorRef.current?.performBooleanOp('subtract')}
        >
          ⊖ 减去 (Subtract)
        </Button>
        <Button
          size="small"
          block
          disabled={selectionCount !== 2}
          onClick={() => void editorRef.current?.performBooleanOp('intersect')}
        >
          ⊗ 相交 (Intersect)
        </Button>
        <Button
          size="small"
          block
          disabled={selectionCount !== 2}
          onClick={() => void editorRef.current?.performBooleanOp('exclude')}
        >
          ⊘ 排除 (Exclude)
        </Button>
        <p className="text-[10px] text-gray-400 mt-1">
          提示：选中两个对象后执行运算。结果将替换原始对象。
        </p>
      </div>
    </>
  );
}

/** 填充工具面板（增强 D.2） */
function FillPanel({
  selectedObject,
  onPropertyChange,
  editorRef,
}: {
  selectedObject: SelectedObjectInfo | null;
  onPropertyChange: (updates: Record<string, unknown>) => void;
  editorRef: React.RefObject<MaterialEditorCore | null>;
}) {
  // 画布背景色状态 — 安全获取，防止 editorRef.current 尚未就绪
  const [canvasBgColor, setCanvasBgColor] = useState(() => {
    try {
      return editorRef.current?.getBackgroundColor?.() ?? '#ffffff';
    } catch {
      return '#ffffff';
    }
  });

  return (
    <>
      {/* 参考框背景色 — 设置的是参考框（元素框）内部的背景色 */}
      <SectionTitle title="参考框背景" />
      <div className="space-y-2">
        <PropRow label="背景色">
          <ColorPicker
            size="small"
            value={canvasBgColor}
            onChange={(_, hex) => {
              setCanvasBgColor(hex);
              editorRef.current?.setBackgroundColor?.(hex);
            }}
            showText
            format="hex"
          />
        </PropRow>
        <div className="text-[10px] text-gray-400">
          设置参考框（元素区域）的背景色。点击参考框也可选中它来修改属性。
        </div>
      </div>

      <SectionTitle title="对象填充" />
      <div className="space-y-2">
        <PropRow label="填充色">
          <ColorPicker
            size="small"
            value={selectedObject?.fill ?? '#4A90D9'}
            onChange={(_, hex) => {
              onPropertyChange({ fill: hex });
              editorRef.current?.setFillColor(hex);
            }}
            showText
            format="hex"
          />
        </PropRow>

        <PropRow label="描边色">
          <ColorPicker
            size="small"
            value={selectedObject?.stroke ?? '#333333'}
            onChange={(_, hex) => {
              onPropertyChange({ stroke: hex });
              editorRef.current?.setStrokeColor(hex);
            }}
            showText
            format="hex"
          />
        </PropRow>

        <PropRow label="描边宽">
          <InputNumber
            size="small"
            min={0}
            max={20}
            value={selectedObject?.strokeWidth ?? 1}
            onChange={(v) => {
              if (v != null) {
                onPropertyChange({ strokeWidth: v });
                editorRef.current?.setStrokeWidth(v);
              }
            }}
            style={{ width: '100%' }}
            suffix="px"
          />
        </PropRow>

        <PropRow label="透明度">
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={selectedObject?.opacity ?? 1}
            onChange={(v) => onPropertyChange({ opacity: v })}
          />
        </PropRow>

        <div className="text-[10px] text-gray-400">
          {selectedObject
            ? '修改后立即应用到选中对象，在画布上实时预览。'
            : '选中画布对象后可编辑填充属性。新绘制的图形也将使用此颜色。'
          }
        </div>
      </div>
    </>
  );
}

export function RightPropertyPanel({
  mode,
  selectedObject,
  selectionCount,
  editorRef,
  blendMode,
  onBlendModeChange,
  onPropertyChange,
  currentBackground,
  currentFilter,
  currentBoxShadow,
  currentTextShadow,
}: RightPropertyPanelProps) {
  return (
    <div
      className="flex flex-col bg-white border-l border-gray-200 overflow-y-auto"
      style={{ width: 220, flexShrink: 0 }}
    >
      <div className="px-3 py-2 flex-1 min-h-0 overflow-y-auto">
        {/* 根据模式切换内容 */}
        {mode === 'gradient-edit' && (
          <GradientEditor currentBackground={currentBackground} editorRef={editorRef} />
        )}

        {mode === 'filter-edit' && (
          <>
            <FilterEditor currentFilter={currentFilter} />
            <Divider className="my-2" />
            <CanvasFilterPanel editorRef={editorRef} />
            <Divider className="my-2" />
            <ShadowEditor
              currentBoxShadow={currentBoxShadow}
              currentTextShadow={currentTextShadow}
            />
          </>
        )}

        {mode === 'shadow-edit' && (
          <ShadowEditor
            currentBoxShadow={currentBoxShadow}
            currentTextShadow={currentTextShadow}
          />
        )}

        {mode === 'fill-edit' && (
          <FillPanel
            selectedObject={selectedObject}
            onPropertyChange={onPropertyChange}
            editorRef={editorRef}
          />
        )}

        {mode === 'mask-edit' && (
          <MaskPanel
            selectionCount={selectionCount}
            editorRef={editorRef}
          />
        )}

        {mode === 'object-props' && selectedObject && (
          <>
            <ObjectPropsPanel
              selectedObject={selectedObject}
              blendMode={blendMode}
              onBlendModeChange={onBlendModeChange}
              onPropertyChange={onPropertyChange}
            />
            <ObjectShadowPanel editorRef={editorRef} />
          </>
        )}

        {mode === 'no-selection' && <NoSelectionPanel />}
      </div>
    </div>
  );
}
