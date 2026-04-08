/**
 * 右侧属性面板 — SVG 引擎版本
 *
 * 移除 Fabric.js 依赖，仅保留纯 CSS 属性编辑功能。
 * 上下文切换：效果工具激活时，面板切换为对应的编辑器（渐变/填充/滤镜/阴影）。
 */
import { useState } from 'react';
import { InputNumber, Slider, Select, Button, Divider, ColorPicker } from 'antd';
import type { EffectToolType } from './LeftToolbar';
import { GradientEditor } from './GradientEditor';
import { FilterEditor } from './FilterEditor';
import { ShadowEditor } from './ShadowEditor';
import { editorStore } from '@/stores/editor';

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

/** 混合模式列表（纯 CSS mix-blend-mode） */
const CSS_BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
] as const;

const BLEND_MODE_LABELS: Record<string, string> = {
  normal: '正常', multiply: '正片叠底', screen: '滤色', overlay: '叠加',
  darken: '变暗', lighten: '变亮', 'color-dodge': '颜色减淡',
  'color-burn': '颜色加深', 'hard-light': '强光', 'soft-light': '柔光',
  difference: '差值', exclusion: '排除', hue: '色相', saturation: '饱和度',
  color: '颜色', luminosity: '明度',
};

/** 对象属性面板（默认模式） */
function ObjectPropsPanel({
  selectedObject,
  onPropertyChange,
}: {
  selectedObject: SelectedObjectInfo;
  onPropertyChange: (updates: Record<string, unknown>) => void;
}) {
  const obj = selectedObject;
  const [blendMode, setBlendMode] = useState('normal');

  const typeLabel: Record<string, string> = {
    rect: '矩形', ellipse: '椭圆', polygon: '多边形', line: '线段',
    path: '路径', text: '文字', image: '图片', group: '组', circle: '圆形',
  };

  return (
    <>
      {/* 图层属性 */}
      <SectionTitle title="图层属性" />

      <PropRow label="类型">
        <span className="text-[11px] text-gray-700 font-medium">
          {typeLabel[obj.type] ?? obj.type}
        </span>
      </PropRow>

      {/* 填充色 */}
      <PropRow label="填充">
        <ColorPicker
          size="small"
          value={obj.fill ?? '#ffffff'}
          onChange={(_, hex) => onPropertyChange({ fill: hex })}
          showText
          format="hex"
        />
      </PropRow>

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
      {obj.type === 'text' && (
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
          onChange={(v) => {
            setBlendMode(v);
            onPropertyChange({ mixBlendMode: v });
          }}
          options={CSS_BLEND_MODES.map((m) => ({
            value: m,
            label: BLEND_MODE_LABELS[m] ?? m,
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

/** 填充工具面板 */
function FillPanel({
  selectedObject,
  onPropertyChange,
}: {
  selectedObject: SelectedObjectInfo | null;
  onPropertyChange: (updates: Record<string, unknown>) => void;
}) {
  return (
    <>
      <SectionTitle title="对象填充" />
      <div className="space-y-2">
        <PropRow label="填充色">
          <ColorPicker
            size="small"
            value={selectedObject?.fill ?? '#4A90D9'}
            onChange={(_, hex) => onPropertyChange({ fill: hex })}
            showText
            format="hex"
          />
        </PropRow>

        <PropRow label="描边色">
          <ColorPicker
            size="small"
            value={selectedObject?.stroke ?? '#333333'}
            onChange={(_, hex) => onPropertyChange({ stroke: hex })}
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
              if (v != null) onPropertyChange({ strokeWidth: v });
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
            ? '修改后立即应用到选中对象。'
            : '选中画布对象后可编辑填充属性。'
          }
        </div>
      </div>
    </>
  );
}

/** 蒙版面板（占位） */
function MaskPanel({ selectionCount }: { selectionCount: number }) {
  return (
    <>
      <SectionTitle title="蒙版操作" />
      <div className="space-y-2 text-[11px] text-gray-600">
        <p>选中两个对象：底层对象 + 蒙版形状，然后执行蒙版操作。</p>
        <Button size="small" block disabled={selectionCount !== 2}>
          🎭 应用蒙版
        </Button>
        <Button size="small" block>
          🚫 移除蒙版
        </Button>
      </div>
    </>
  );
}

export function RightPropertyPanel({
  mode,
  selectedObject,
  selectionCount,
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
          <GradientEditor currentBackground={currentBackground} />
        )}

        {mode === 'filter-edit' && (
          <>
            <FilterEditor currentFilter={currentFilter} />
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
          />
        )}

        {mode === 'mask-edit' && (
          <MaskPanel selectionCount={selectionCount} />
        )}

        {mode === 'object-props' && selectedObject && (
          <ObjectPropsPanel
            selectedObject={selectedObject}
            onPropertyChange={onPropertyChange}
          />
        )}

        {mode === 'no-selection' && <NoSelectionPanel />}
      </div>
    </div>
  );
}
