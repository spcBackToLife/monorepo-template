/**
 * DataSourceCard — 单个数据源卡片
 *
 * 顶部显示：类型徽章 + name + 展开/删除
 * 展开后分发到 StaticDataSourceEditor / ApiDataSourceEditor
 */

import { useState } from 'react';
import { Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import type { DataSource } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { isApiDataSource } from './helpers';
import { StaticDataSourceEditor } from './StaticEditor';
import { ApiDataSourceEditor } from './ApiEditor';

interface Props {
  screenId: string;
  dataSource: DataSource;
  expanded: boolean;
  onToggle: () => void;
}

export const DataSourceCard = observer(function DataSourceCard({
  screenId,
  dataSource,
  expanded,
  onToggle,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(dataSource.name);

  const handleRemove = () => {
    editorStore.execute({
      type: 'dataSource.remove',
      params: { screenId, dataSourceId: dataSource.id },
    });
  };

  const handleRename = () => {
    const next = nameDraft.trim();
    if (!next || next === dataSource.name) { setRenaming(false); return; }
    editorStore.execute({
      type: 'dataSource.update',
      params: { screenId, dataSourceId: dataSource.id, name: next },
    });
    setRenaming(false);
  };

  const typeColor = dataSource.type === 'api'
    ? 'text-blue-600 bg-blue-50'
    : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="border border-gray-200 rounded bg-white overflow-hidden">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${typeColor}`}>
          {dataSource.type}
        </span>

        {renaming ? (
          <input
            type="text"
            autoFocus
            className="flex-1 h-5 px-1 border border-blue-300 rounded text-[11px] outline-none font-mono"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setNameDraft(dataSource.name); setRenaming(false); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-[11px] font-mono text-gray-700 truncate"
            onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            title="双击重命名"
          >
            {dataSource.name}
          </span>
        )}

        {dataSource.type === 'api' && (
          <span className="text-[9px] text-gray-400 font-mono truncate max-w-[80px]">
            {dataSource.endpoint.method} {dataSource.endpoint.path}
          </span>
        )}

        <Popconfirm
          title="删除此数据源？"
          onConfirm={(e) => { e?.stopPropagation(); handleRemove(); }}
          onCancel={(e) => e?.stopPropagation()}
          okText="删除"
          cancelText="取消"
        >
          <button
            type="button"
            className="text-gray-300 hover:text-red-400 p-0.5"
            onClick={(e) => e.stopPropagation()}
            title="删除"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Popconfirm>

        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-2">
          {isApiDataSource(dataSource) ? (
            <ApiDataSourceEditor screenId={screenId} dataSource={dataSource} />
          ) : (
            <StaticDataSourceEditor screenId={screenId} dataSource={dataSource} />
          )}
        </div>
      )}
    </div>
  );
});
