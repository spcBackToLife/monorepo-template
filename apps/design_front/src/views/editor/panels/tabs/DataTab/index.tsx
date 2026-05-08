/**
 * DataTab — 数据源面板（v2 endpoint + mock 共存模型）
 *
 * 关联 RFC：design_docs/03-tech/state-action-expression-rfc.md §2.2
 * D.3 任务：
 *   - 删除 v1 的「JSON 编辑器 + 接口定义 + 预设模板 + 全局状态变量参考」结构
 *   - 每个数据源是一张卡片：type 徽章 + name + 展开编辑区
 *   - api 数据源同时编辑 endpoint 与 mock 场景（替代 v1 activePhase）
 *   - static 数据源只编辑 initial（屏幕启动时注入 state.data[name]）
 *   - 顶部全局开关：预览期 mock / http 切换（写入 editorStore.previewEffectEnv）
 *
 * 表达式规则：api 数据源结果由 EffectExecutor 写入
 *   `state.effects[dataSource.id].data`，data 字段按设计约定回落到
 *   `state.data[dataSource.name]`（dispatcher 的 onSuccess 链负责搬运）。
 *   编辑器这里只展示引用提示。
 */

import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Empty } from 'antd';
import { editorStore } from '@/stores/editor';
import { DataSourceCard } from './DataSourceCard';
import { NewDataSourceForm } from './NewDataSourceForm';

export const DataTab = observer(function DataTab() {
  const screen = editorStore.activeScreen;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const dataSources = screen?.dataSources ?? [];
  const existingNames = useMemo(() => dataSources.map((d) => d.name), [dataSources]);

  if (!screen) {
    return (
      <div className="p-3">
        <Empty description="暂无活动页面" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      {/* 顶部说明 */}
      <div className="px-1 pb-2 text-[10px] text-gray-500 leading-snug border-b border-gray-100">
        <div>
          数据源分两类：
          <strong className="text-emerald-700">static</strong> 注入到
          {' '}<code className="text-purple-600 bg-purple-50 px-0.5 rounded font-mono">{'state.data[name]'}</code>{' '}
          ；
          <strong className="text-blue-700">api</strong> 在交互中由
          {' '}<code className="text-purple-600 bg-purple-50 px-0.5 rounded font-mono">effect.fetch</code>{' '}
          触发。
        </div>
        <div className="mt-0.5">
          在画布表达式里用
          {' '}<code className="text-purple-600 bg-purple-50 px-0.5 rounded font-mono">{'{{ state.data.xxx }}'}</code>{' '}
          或
          {' '}<code className="text-purple-600 bg-purple-50 px-0.5 rounded font-mono">{'{{ state.effects.ID.data }}'}</code>{' '}
          引用。
        </div>
      </div>

      {/* 全局开关：预览期 mock / http */}
      <PreviewEnvSwitcher />

      {/* 数据源列表 */}
      <div className="flex flex-col gap-1.5">
        {dataSources.length === 0 && !adding && (
          <div className="text-[10px] text-gray-400 text-center py-2">
            还没有数据源，点击下方「+ 新建数据源」开始。
          </div>
        )}

        {dataSources.map((ds) => (
          <DataSourceCard
            key={ds.id}
            screenId={screen.id}
            dataSource={ds}
            expanded={expandedId === ds.id}
            onToggle={() => setExpandedId(expandedId === ds.id ? null : ds.id)}
          />
        ))}

        {adding ? (
          <NewDataSourceForm
            screenId={screen.id}
            existingNames={existingNames}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-[10px]"
            onClick={() => setAdding(true)}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建数据源
          </button>
        )}
      </div>
    </div>
  );
});

// ===== 预览期 effect.fetch 环境开关 =====

const PreviewEnvSwitcher = observer(function PreviewEnvSwitcher() {
  const env = editorStore.previewEffectEnv;
  return (
    <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded bg-gray-50">
      <span className="text-[10px] text-gray-600 font-medium">预览 fetch：</span>
      <div className="flex rounded border border-gray-200 overflow-hidden text-[10px]">
        <button
          type="button"
          className={`px-2 h-5 ${
            env === 'mock'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => editorStore.setPreviewEffectEnv('mock')}
          title="编辑器用数据源的 mock 场景"
        >
          mock
        </button>
        <button
          type="button"
          className={`px-2 h-5 ${
            env === 'http'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => editorStore.setPreviewEffectEnv('http')}
          title="调用真实 endpoint"
        >
          真实接口
        </button>
      </div>
      <span className="ml-auto text-[9px] text-gray-400">
        {env === 'mock' ? '走 MockDriver' : '走 HttpDriver'}
      </span>
    </div>
  );
});

export default DataTab;
