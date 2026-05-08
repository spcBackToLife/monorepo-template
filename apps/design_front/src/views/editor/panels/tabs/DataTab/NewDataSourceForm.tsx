/**
 * NewDataSourceForm — 新建数据源表单
 *
 * 选择 type（static / api）→ 填最少信息 → dataSource.add
 */

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { HttpMethod } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import {
  HTTP_METHODS,
  makeEmptyApiDataSource,
  makeEmptyStaticDataSource,
} from './helpers';

interface Props {
  screenId: string;
  existingNames: string[];
  onDone: () => void;
}

export const NewDataSourceForm = observer(function NewDataSourceForm({
  screenId,
  existingNames,
  onDone,
}: Props) {
  const [type, setType] = useState<'static' | 'api'>('static');
  const [name, setName] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('name 不能为空'); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      setError('name 只能含字母/数字/_，且不以数字开头（会成为 state.data 的 key）');
      return;
    }
    if (existingNames.includes(trimmed)) {
      setError('已有同名数据源');
      return;
    }
    if (type === 'api' && !path.trim()) {
      setError('api 数据源需要填 path');
      return;
    }

    const dataSource =
      type === 'static'
        ? makeEmptyStaticDataSource(trimmed)
        : makeEmptyApiDataSource(trimmed, method, path.trim());

    editorStore.execute({
      type: 'dataSource.add',
      params: { screenId, dataSource },
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-1 border border-blue-200 rounded p-2 bg-blue-50/30">
      <div className="text-[10px] font-medium text-blue-600">新建数据源</div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 shrink-0">类型:</span>
        <div className="flex rounded border border-gray-200 overflow-hidden text-[10px]">
          {(['static', 'api'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`px-2 h-5 ${
                type === t ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-gray-400 ml-1">
          {type === 'static' ? '注入 state.data[name]' : 'effect.fetch 触发'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 shrink-0">name:</span>
        <input
          type="text"
          className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          placeholder="例: chatList / userProfile"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {type === 'api' && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 w-12 shrink-0">endpoint:</span>
          <select
            className="h-5 px-1 border border-gray-200 rounded text-[10px] outline-none w-16 font-mono"
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
          >
            {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
            placeholder="/api/..."
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>
      )}

      {error && <div className="text-[10px] text-red-500">{error}</div>}

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="h-5 px-2 bg-blue-500 text-white rounded text-[10px] disabled:opacity-40"
          onClick={handleSubmit}
        >
          创建
        </button>
        <button
          type="button"
          className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]"
          onClick={onDone}
        >
          取消
        </button>
      </div>
    </div>
  );
});
