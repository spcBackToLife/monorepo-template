/**
 * StaticDataSourceEditor — 静态数据源编辑器（v2）
 *
 * RFC §2.2：static 数据源只有 `initial` 字段，在屏幕进入时同步注入
 * `state.data[dataSource.name]`。
 *
 * UI：单个 JSON textarea + 格式化/复制按钮；debounce 提交。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntdApp } from 'antd';
import { observer } from 'mobx-react-lite';
import type { StaticDataSource } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { formatJsonBlock } from './helpers';

interface Props {
  screenId: string;
  dataSource: StaticDataSource;
}

export const StaticDataSourceEditor = observer(function StaticDataSourceEditor({
  screenId,
  dataSource,
}: Props) {
  const { message } = AntdApp.useApp();
  const [text, setText] = useState(() => formatJsonBlock(dataSource.initial));
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const focusedRef = useRef(false);

  const fingerprint = formatJsonBlock(dataSource.initial);
  useEffect(() => {
    if (focusedRef.current) return;
    setText(fingerprint);
    setError(null);
  }, [fingerprint]);

  const commit = useCallback(
    (value: unknown) => {
      editorStore.execute({
        type: 'dataSource.setStaticInitial',
        params: { screenId, dataSourceId: dataSource.id, initial: value },
      });
    },
    [screenId, dataSource.id],
  );

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim() === '') {
          setError(null);
          commit(undefined);
          return;
        }
        try {
          const parsed: unknown = JSON.parse(value);
          setError(null);
          commit(parsed);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }, 500);
    },
    [commit],
  );

  const formatNow = useCallback(() => {
    if (!text.trim()) return;
    try {
      const parsed: unknown = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      message.error('当前内容不是合法 JSON');
    }
  }, [text, message]);

  const refName = dataSource.name;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500">initial (JSON):</span>
        <button
          type="button"
          className="ml-auto h-5 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
          onClick={formatNow}
        >
          格式化
        </button>
      </div>
      <textarea
        className="w-full h-40 px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-400 resize-y font-mono bg-gray-50 leading-relaxed"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => { focusedRef.current = false; }}
        spellCheck={false}
        placeholder={'{\n  "key": "value"\n}'}
      />
      {error && (
        <div className="text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded">{error}</div>
      )}
      <div className="text-[10px] text-gray-400">
        画布表达式：{' '}
        <code className="text-purple-600 bg-purple-50 px-1 rounded font-mono">
          {`{{ state.data.${refName} }}`}
        </code>
      </div>
    </div>
  );
});
