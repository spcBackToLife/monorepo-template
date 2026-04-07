/**
 * 图层面板 — 严格对照 README §4.2
 *
 * 位于画布区域下方（非右侧面板），可折叠。
 *
 * ┌───────────────────────────────────┐
 * │ 图层 1: 渐变层        👁 🔒 ▲ ▼  │
 * │ 图层 2: 图片层        👁 🔒 ▲ ▼  │
 * │ 图层 3: 图案纹理      👁 🔒 ▲ ▼  │
 * │ [+ 添加图层]                      │
 * └───────────────────────────────────┘
 */
import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
  PlusOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayerPanelProps {
  layers: LayerInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onToggleVisibility: (index: number) => void;
  onToggleLock: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (index: number) => void;
}

/** 图层类型图标映射 */
const TYPE_ICONS: Record<string, string> = {
  rect: '□',
  ellipse: '○',
  circle: '○',
  polygon: '⬡',
  line: '╱',
  path: '〰',
  textbox: 'T',
  image: '🖼',
  group: '📦',
};

export function LayerPanel({
  layers,
  selectedIndex,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDelete,
}: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // 图层列表从上到下显示（堆叠顺序：上面的图层在最前面）
  const reversedLayers = [...layers].reverse();

  return (
    <div className="border-t border-gray-200 bg-white flex-shrink-0">
      {/* 面板头部 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5">
          {collapsed ? (
            <DownOutlined className="text-[9px] text-gray-400" />
          ) : (
            <UpOutlined className="text-[9px] text-gray-400" />
          )}
          <span className="text-[11px] font-medium text-gray-600">
            图层
          </span>
          <span className="text-[10px] text-gray-400">
            ({layers.length})
          </span>
        </div>
      </div>

      {/* 图层列表 */}
      {!collapsed && (
        <div className="max-h-40 overflow-y-auto">
          {layers.length === 0 && (
            <div className="text-[10px] text-gray-400 py-3 text-center">
              暂无图形，使用工具绘制
            </div>
          )}

          {reversedLayers.map((layer, reversedIdx) => {
            const realIdx = layers.length - 1 - reversedIdx;
            const isSelected = realIdx === selectedIndex;

            return (
              <div
                key={layer.id}
                className={`
                  flex items-center gap-1 px-3 py-1 text-[10px] 
                  border-b border-gray-50 cursor-pointer
                  transition-colors
                  ${isSelected
                    ? 'bg-blue-50 border-l-2 border-l-blue-400'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                  }
                `}
                onClick={() => onSelect(realIdx)}
              >
                {/* 图标 */}
                <span className="w-4 text-center text-gray-400 shrink-0">
                  {TYPE_ICONS[layer.type] ?? '◆'}
                </span>

                {/* 名称 */}
                <span className="flex-1 truncate text-gray-700">
                  {layer.name}
                </span>

                {/* 操作按钮 */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <Tooltip title={layer.visible ? '隐藏' : '显示'}>
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(realIdx); }}
                    >
                      {layer.visible ? (
                        <EyeOutlined style={{ fontSize: 10 }} />
                      ) : (
                        <EyeInvisibleOutlined style={{ fontSize: 10 }} />
                      )}
                    </button>
                  </Tooltip>

                  <Tooltip title={layer.locked ? '解锁' : '锁定'}>
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); onToggleLock(realIdx); }}
                    >
                      {layer.locked ? (
                        <LockOutlined style={{ fontSize: 10 }} />
                      ) : (
                        <UnlockOutlined style={{ fontSize: 10 }} />
                      )}
                    </button>
                  </Tooltip>

                  <Tooltip title="上移">
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); onMoveUp(realIdx); }}
                    >
                      <ArrowUpOutlined style={{ fontSize: 9 }} />
                    </button>
                  </Tooltip>

                  <Tooltip title="下移">
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); onMoveDown(realIdx); }}
                    >
                      <ArrowDownOutlined style={{ fontSize: 9 }} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
