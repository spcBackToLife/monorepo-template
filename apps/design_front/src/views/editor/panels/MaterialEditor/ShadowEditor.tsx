/**
 * 阴影编辑器面板
 *
 * 可视化编辑 CSS box-shadow / text-shadow。
 * 增强：从选中元素的 boxShadow / textShadow 解析并初始化。
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, InputNumber, Switch, Input, Tooltip, App as AntdApp } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  shadowsToCSS,
  createBoxShadow,
  createTextShadow,
  parseBoxShadow,
  parseTextShadow,
  SHADOW_PRESETS,
} from '@globallink/material-operations';
import type { ShadowConfig } from '@globallink/material-operations';
import { editorStore } from '@/stores/editor';

interface ShadowEditorProps {
  currentBoxShadow?: string;
  currentTextShadow?: string;
  onApply?: (css: { boxShadow?: string; textShadow?: string }) => void;
}

/**
 * 从元素的 boxShadow / textShadow 解析出 ShadowConfig 列表
 */
function parseExistingShadows(boxShadow?: string, textShadow?: string): ShadowConfig[] | null {
  const result: ShadowConfig[] = [];

  if (boxShadow && boxShadow !== 'none') {
    try {
      const parsed = parseBoxShadow(boxShadow);
      result.push(...parsed);
    } catch {
      // fallback
    }
  }

  if (textShadow && textShadow !== 'none') {
    try {
      const parsed = parseTextShadow(textShadow);
      result.push(...parsed);
    } catch {
      // fallback
    }
  }

  return result.length > 0 ? result : null;
}

export function ShadowEditor({ currentBoxShadow, currentTextShadow, onApply }: ShadowEditorProps) {
  const { message } = AntdApp.useApp();
  const [shadows, setShadows] = useState<ShadowConfig[]>([createBoxShadow()]);
  const initializedRef = useRef(false);

  // 自动从选中元素解析并初始化
  useEffect(() => {
    if (initializedRef.current) return;
    const parsed = parseExistingShadows(currentBoxShadow, currentTextShadow);
    if (parsed) {
      setShadows(parsed);
      initializedRef.current = true;
    }
  }, [currentBoxShadow, currentTextShadow]);

  // 手动同步
  const syncFromElement = useCallback(() => {
    const parsed = parseExistingShadows(currentBoxShadow, currentTextShadow);
    if (parsed) {
      setShadows(parsed);
      message.success('已同步元素阴影');
    } else {
      message.info('当前元素没有阴影');
    }
  }, [currentBoxShadow, currentTextShadow, message]);

  // CSS 输出
  const cssOutput = useMemo(() => shadowsToCSS(shadows), [shadows]);

  const addShadow = useCallback((type: 'box-shadow' | 'text-shadow') => {
    const newShadow = type === 'box-shadow' ? createBoxShadow() : createTextShadow();
    setShadows((prev) => [...prev, newShadow]);
  }, []);

  const removeShadow = useCallback((index: number) => {
    setShadows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateShadow = useCallback((index: number, updates: Partial<ShadowConfig>) => {
    setShadows((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    );
  }, []);

  const applyPreset = useCallback((presetKey: keyof typeof SHADOW_PRESETS) => {
    const preset = SHADOW_PRESETS[presetKey];
    setShadows([{
      type: 'box-shadow',
      ...preset,
      enabled: true,
      inset: 'inset' in preset ? (preset as Record<string, unknown>).inset as boolean : false,
    }]);
  }, []);

  const applyToElement = useCallback(() => {
    const nodeId = editorStore.selectedNodeIds[0];
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    const styles: Record<string, string> = {};
    if (cssOutput.boxShadow) styles.boxShadow = cssOutput.boxShadow;
    if (cssOutput.textShadow) styles.textShadow = cssOutput.textShadow;

    editorStore.execute({
      type: 'style.update',
      params: { nodeId, styles },
    });

    onApply?.(cssOutput);
    message.success('阴影已应用');
  }, [cssOutput, onApply, message]);

  const copyCSS = useCallback(async () => {
    const lines: string[] = [];
    if (cssOutput.boxShadow) lines.push(`box-shadow: ${cssOutput.boxShadow};`);
    if (cssOutput.textShadow) lines.push(`text-shadow: ${cssOutput.textShadow};`);
    await navigator.clipboard.writeText(lines.join('\n'));
    message.success('CSS 已复制');
  }, [cssOutput, message]);

  // 预览样式
  const previewStyle = useMemo(() => ({
    width: 80,
    height: 80,
    background: '#fff',
    borderRadius: 12,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    margin: '8px auto',
    ...(cssOutput.boxShadow ? { boxShadow: cssOutput.boxShadow } : {}),
    ...(cssOutput.textShadow ? { textShadow: cssOutput.textShadow } : {}),
  }), [cssOutput]);

  return (
    <div className="space-y-3">
      {/* 预览 */}
      <div className="flex justify-center bg-gray-50 rounded p-4">
        <div style={previewStyle}>
          <span className="text-gray-400 text-xs">Aa</span>
        </div>
      </div>

      {/* 预设 */}
      <div>
        <span className="text-[11px] text-gray-500 mb-1 block">预设</span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(SHADOW_PRESETS) as Array<keyof typeof SHADOW_PRESETS>).map((key) => (
            <Button key={key} size="small" onClick={() => applyPreset(key)}>
              {key}
            </Button>
          ))}
        </div>
      </div>

      {/* 阴影列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">阴影列表</span>
          <div className="flex gap-1">
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => addShadow('box-shadow')}>
              Box
            </Button>
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => addShadow('text-shadow')}>
              Text
            </Button>
          </div>
        </div>

        {shadows.map((shadow, idx) => (
          <div key={idx} className="border border-gray-100 rounded p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{shadow.type}</span>
              <div className="flex items-center gap-1">
                <Switch
                  size="small"
                  checked={shadow.enabled}
                  onChange={(v) => updateShadow(idx, { enabled: v })}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeShadow(idx)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 w-5">X</span>
                <InputNumber size="small" value={shadow.x} onChange={(v) => v != null && updateShadow(idx, { x: v })} style={{ flex: 1 }} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 w-5">Y</span>
                <InputNumber size="small" value={shadow.y} onChange={(v) => v != null && updateShadow(idx, { y: v })} style={{ flex: 1 }} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 w-5">模糊</span>
                <InputNumber size="small" min={0} value={shadow.blur} onChange={(v) => v != null && updateShadow(idx, { blur: v })} style={{ flex: 1 }} />
              </div>
              {shadow.type === 'box-shadow' && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 w-5">扩展</span>
                  <InputNumber size="small" value={shadow.spread ?? 0} onChange={(v) => v != null && updateShadow(idx, { spread: v })} style={{ flex: 1 }} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={shadow.color.startsWith('#') ? shadow.color : '#000000'}
                onChange={(e) => updateShadow(idx, { color: e.target.value })}
                className="w-5 h-5 rounded border border-gray-200 cursor-pointer p-0"
              />
              <Input
                size="small"
                value={shadow.color}
                onChange={(e) => updateShadow(idx, { color: e.target.value })}
                style={{ flex: 1, fontSize: 10 }}
                placeholder="#hex / rgba()"
              />
              {shadow.type === 'box-shadow' && (
                <label className="flex items-center gap-0.5 text-[10px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={shadow.inset ?? false}
                    onChange={(e) => updateShadow(idx, { inset: e.target.checked })}
                  />
                  内阴影
                </label>
              )}
            </div>
          </div>
        ))}

        {shadows.length === 0 && (
          <div className="text-[10px] text-gray-400 py-2 text-center">暂无阴影，点击上方按钮添加</div>
        )}
      </div>

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
        {(currentBoxShadow || currentTextShadow) && (
          <Tooltip title="从当前元素同步阴影">
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
      {(cssOutput.boxShadow || cssOutput.textShadow) && (
        <div className="bg-gray-50 rounded p-2 space-y-0.5">
          {cssOutput.boxShadow && (
            <code className="block text-[10px] text-gray-600 break-all leading-relaxed">
              box-shadow: {cssOutput.boxShadow};
            </code>
          )}
          {cssOutput.textShadow && (
            <code className="block text-[10px] text-gray-600 break-all leading-relaxed">
              text-shadow: {cssOutput.textShadow};
            </code>
          )}
        </div>
      )}
    </div>
  );
}
