/**
 * 左侧工具栏 — 严格对照 README §4.2
 *
 * 上半区：绘图工具
 *   [▲] 选择  [□] 矩形  [○] 椭圆  [◐] 沿圆场  [△] 多边  [╱] 线段
 *   [✒] 钢笔  [★] 星形  [T] 文字  [✏] 铅笔  [🖼] 图片
 *
 * 分隔线
 *
 * 下半区：效果工具
 *   [🔲] 渐变  [🎨] 填充  [📐] 蒙版  [✨] 滤镜
 */
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import type { MaterialToolType } from '@globallink/material-engine';

/** 效果工具类型 */
export type EffectToolType = 'gradient' | 'fill' | 'mask' | 'filter' | 'shadow';

/** 当前活跃工具（可能是绘图工具或效果工具） */
export type ActiveTool = MaterialToolType | EffectToolType;

interface LeftToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
}

// ===== SVG 图标组件 =====

/** 选择工具 (箭头光标) */
const IconSelect = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 1L3 12L6.5 8.5L10 14L12 13L8.5 7L13 7L3 1Z" fill="currentColor"/>
  </svg>
);

/** 矩形 */
const IconRect = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

/** 椭圆 */
const IconEllipse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="8" cy="8" rx="6" ry="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

/** 沿圆外观场（缺口环 + 弧上宽/色场） */
const IconProfiledRing = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 8 2.5 A 5.5 5.5 0 1 1 3.5 11"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" opacity="0.35" />
  </svg>
);

/** 多边形 (三角形) */
const IconPolygon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
  </svg>
);

/** 线段 */
const IconLine = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/** 钢笔工具 (贝塞尔曲线) — 经典钢笔尖图标 */
const IconPen = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C8 1 4 7 4 10C4 12.2 5.8 14 8 14C10.2 14 12 12.2 12 10C12 7 8 1 8 1Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    <path d="M4.5 10H11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 10V14" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

/** 星形 */
const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5L9.8 6.1L14.5 6.4L10.9 9.5L12 14.1L8 11.5L4 14.1L5.1 9.5L1.5 6.4L6.2 6.1L8 1.5Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
  </svg>
);

/** 文字 */
const IconText = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3H13V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 3V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 13H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/** 铅笔工具 (自由绘制) — 铅笔形状 */
const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 1.5L14.5 4.5L5.5 13.5H2.5V10.5L11.5 1.5Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    <path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

/** 图片 */
const IconImage = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
    <path d="M2 11L5.5 7.5L8 10L10.5 7L14 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/** 渐变 */
const IconGradient = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <rect x="2" y="2" width="4" height="12" fill="currentColor" opacity="0.7"/>
    <rect x="6" y="2" width="4" height="12" fill="currentColor" opacity="0.35"/>
    <rect x="10" y="2" width="4" height="12" fill="currentColor" opacity="0.1"/>
  </svg>
);

/** 填充 (油漆桶) */
const IconFill = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 9.5L6 5L2.5 8.5C2.5 8.5 4.5 13 7.5 13C9 13 10.5 11.5 10.5 9.5Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    <path d="M6 5L10 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M13 10C13 10 14.5 11.5 14.5 12.5C14.5 13.3 13.8 14 13 14C12.2 14 11.5 13.3 11.5 12.5C11.5 11.5 13 10 13 10Z" fill="currentColor"/>
  </svg>
);

/** 蒙版 */
const IconMask = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6.5" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <circle cx="9.5" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeDasharray="2 2"/>
  </svg>
);

/** 滤镜 (魔法棒) */
const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 13.5L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 7L11.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="4" r="0.8" fill="currentColor"/>
    <circle cx="14" cy="3" r="0.6" fill="currentColor"/>
    <circle cx="13" cy="6" r="0.6" fill="currentColor"/>
    <circle cx="10" cy="3" r="0.5" fill="currentColor"/>
  </svg>
);

/** 绘图工具定义 */
const DRAWING_TOOLS: { key: MaterialToolType; icon: ReactNode; label: string; shortcut: string }[] = [
  { key: 'select', icon: <IconSelect />, label: '选择', shortcut: 'V' },
  { key: 'rect', icon: <IconRect />, label: '矩形', shortcut: 'R' },
  { key: 'ellipse', icon: <IconEllipse />, label: '椭圆', shortcut: 'O' },
  {
    key: 'profiledStroke',
    icon: <IconProfiledRing />,
    label: '沿圆外观场 — 拖出参考框，线宽与颜色沿弧变化（语音光圈等）',
    shortcut: 'A',
  },
  { key: 'polygon', icon: <IconPolygon />, label: '多边形', shortcut: 'P' },
  { key: 'line', icon: <IconLine />, label: '线段', shortcut: 'L' },
  { key: 'path', icon: <IconPen />, label: '钢笔 — 单击画直线，按住拖拽画曲线', shortcut: 'C' },
  { key: 'star', icon: <IconStar />, label: '星形', shortcut: 'S' },
  { key: 'text', icon: <IconText />, label: '文字', shortcut: 'T' },
  { key: 'pencil', icon: <IconPencil />, label: '铅笔（自由绘制）', shortcut: 'B' },
  { key: 'image', icon: <IconImage />, label: '图片', shortcut: 'I' },
];

/** 效果工具定义 */
const EFFECT_TOOLS: { key: EffectToolType; icon: ReactNode; label: string }[] = [
  { key: 'gradient', icon: <IconGradient />, label: '渐变' },
  { key: 'fill', icon: <IconFill />, label: '填充' },
  { key: 'mask', icon: <IconMask />, label: '蒙版' },
  { key: 'filter', icon: <IconFilter />, label: '滤镜' },
];

/** 工具按钮 */
function ToolButton({
  icon,
  label,
  shortcut,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  active: boolean;
  onClick: () => void;
}) {
  const tip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <Tooltip title={tip} placement="right" mouseEnterDelay={0.4}>
      <button
        type="button"
        className={`
          w-9 h-9 rounded-md text-sm flex items-center justify-center
          transition-all duration-150 select-none
          ${active
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }
        `}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export function LeftToolbar({ activeTool, onToolChange }: LeftToolbarProps) {
  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 bg-white border-r border-gray-200"
      style={{ width: 48, flexShrink: 0 }}
    >
      {/* 绘图工具组 */}
      {DRAWING_TOOLS.map((tool) => (
        <ToolButton
          key={tool.key}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          active={activeTool === tool.key}
          onClick={() => onToolChange(tool.key)}
        />
      ))}

      {/* 分隔线 */}
      <div className="w-7 h-px bg-gray-200 my-1.5" />

      {/* 效果工具组 */}
      {EFFECT_TOOLS.map((tool) => (
        <ToolButton
          key={tool.key}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.key}
          onClick={() => onToolChange(tool.key)}
        />
      ))}
    </div>
  );
}
