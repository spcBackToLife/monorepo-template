/**
 * CSS 滤镜编辑器面板
 *
 * 通过滑块可视化调节 CSS filter 属性。
 * 增强：从选中元素的 filter 解析并初始化。
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Slider, Switch, Button, Tooltip, App as AntdApp } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  UndoOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  filtersToCSS,
  createFilter,
  parseFilterCSS,
  FILTER_RANGES,
  FILTER_LABELS,
} from '@globallink/material-operations';
import type { FilterConfig, CSSFilterType } from '@globallink/material-operations';
import { editorStore } from '@/stores/editor';

interface FilterEditorProps {
  currentFilter?: string;
  onApply?: (css: string) => void;
}

const ALL_FILTER_TYPES: CSSFilterType[] = [
  'blur',
  'brightness',
  'contrast',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
];

/**
 * 从 CSS filter 字符串解析出 FilterConfig 列表
 */
function parseExistingFilters(filter?: string): FilterConfig[] | null {
  if (!filter || filter === 'none') return null;
  try {
    const parsed = parseFilterCSS(filter);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function FilterEditor({ currentFilter, onApply }: FilterEditorProps) {
  const { message } = AntdApp.useApp();
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const initializedRef = useRef(false);

  // 自动从选中元素解析并初始化
  useEffect(() => {
    if (initializedRef.current) return;
    const parsed = parseExistingFilters(currentFilter);
    if (parsed) {
      setFilters(parsed);
      initializedRef.current = true;
    }
  }, [currentFilter]);

  // 手动同步
  const syncFromElement = useCallback(() => {
    const parsed = parseExistingFilters(currentFilter);
    if (parsed) {
      setFilters(parsed);
      message.success('已同步元素滤镜');
    } else {
      message.info('当前元素没有滤镜');
    }
  }, [currentFilter, message]);

  // CSS 输出
  const cssValue = useMemo(() => filtersToCSS(filters), [filters]);

  const addFilter = useCallback((type: CSSFilterType) => {
    // 不重复添加同类型
    if (filters.some((f) => f.type === type)) return;
    setFilters((prev) => [...prev, createFilter(type)]);
  }, [filters]);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFilter = useCallback((index: number, updates: Partial<FilterConfig>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  }, []);

  const resetAll = useCallback(() => {
    setFilters([]);
  }, []);

  const applyToElement = useCallback(() => {
    const nodeId = editorStore.selectedNodeIds[0];
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    const value = cssValue || 'none';
    editorStore.execute({
      type: 'style.update',
      params: { nodeId, styles: { filter: value } },
    });

    onApply?.(value);
    message.success('滤镜已应用');
  }, [cssValue, onApply, message]);

  const copyCSS = useCallback(async () => {
    await navigator.clipboard.writeText(`filter: ${cssValue || 'none'};`);
    message.success('CSS 已复制');
  }, [cssValue, message]);

  // 未添加的滤镜类型
  const availableTypes = ALL_FILTER_TYPES.filter(
    (type) => !filters.some((f) => f.type === type),
  );

  return (
    <div className="space-y-3">
      {/* 预览图 */}
      <div
        className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center"
        style={{ height: 80, filter: cssValue || undefined }}
      >
        <span className="text-white text-lg font-bold drop-shadow-md">预览</span>
      </div>

      {/* 滤镜列表 */}
      <div className="space-y-2">
        {filters.map((filter, idx) => {
          const range = FILTER_RANGES[filter.type];
          const numValue = parseFloat(filter.value) || 0;

          return (
            <div key={filter.type} className="flex items-center gap-1.5">
              <Switch
                size="small"
                checked={filter.enabled}
                onChange={(v) => updateFilter(idx, { enabled: v })}
              />
              <span className="text-[10px] text-gray-600 w-12 shrink-0 truncate" title={FILTER_LABELS[filter.type]}>
                {FILTER_LABELS[filter.type]}
              </span>
              <Slider
                min={range.min}
                max={range.max}
                step={range.step}
                value={numValue}
                onChange={(v) => updateFilter(idx, { value: String(v) })}
                style={{ flex: 1 }}
                disabled={!filter.enabled}
              />
              <span className="text-[10px] text-gray-400 w-10 text-right">
                {numValue}{range.unit}
              </span>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFilter(idx)}
              />
            </div>
          );
        })}

        {filters.length === 0 && (
          <div className="text-[10px] text-gray-400 py-2 text-center">暂无滤镜，从下方选择添加</div>
        )}
      </div>

      {/* 添加滤镜 */}
      {availableTypes.length > 0 && (
        <div>
          <span className="text-[11px] text-gray-500 mb-1 block">添加滤镜</span>
          <div className="flex flex-wrap gap-1">
            {availableTypes.map((type) => (
              <Button
                key={type}
                size="small"
                onClick={() => addFilter(type)}
                icon={<PlusOutlined />}
              >
                {FILTER_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={applyToElement}
          disabled={!editorStore.selectedNodeIds[0]}
        >
          应用到元素
        </Button>
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => void copyCSS()}
        >
          复制 CSS
        </Button>
        <Button
          size="small"
          icon={<UndoOutlined />}
          onClick={resetAll}
          disabled={filters.length === 0}
        >
          重置
        </Button>
        {currentFilter && currentFilter !== 'none' && (
          <Tooltip title="从当前元素同步滤镜">
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={syncFromElement}
            >
              同步
            </Button>
          </Tooltip>
        )}
      </div>

      {/* CSS 预览 */}
      {cssValue && (
        <div className="bg-gray-50 rounded p-2">
          <code className="text-[10px] text-gray-600 break-all leading-relaxed">
            filter: {cssValue};
          </code>
        </div>
      )}
    </div>
  );
}
