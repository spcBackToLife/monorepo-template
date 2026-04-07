import { observer } from 'mobx-react-lite';
import { editorStore, type LeftPanelView } from '@/stores/editor';
import { PageView } from './PageView';
import { ElementView } from './ElementView';
import { DataView } from './DataView';
import { MaterialEditorPanel } from '../MaterialEditor';

const VIEWS: { key: LeftPanelView; label: string; icon: string }[] = [
  { key: 'pages', label: '页面', icon: '📄' },
  { key: 'elements', label: '元素', icon: '🌳' },
  { key: 'data', label: '数据', icon: '📊' },
  { key: 'materials', label: '素材', icon: '🎨' },
];

/**
 * Phase 4：左侧产品导航器 — 页面 / 元素 / 数据 / 素材 四视图
 */
export const LeftPanel = observer(function LeftPanel() {
  const view = editorStore.leftPanelView;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="flex-shrink-0 flex border-b border-gray-200 bg-gray-50/80">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            title={v.label}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              view === v.key
                ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => editorStore.setLeftPanelView(v.key)}
          >
            <span className="mr-0.5" aria-hidden>
              {v.icon}
            </span>
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'pages' && <PageView />}
        {view === 'elements' && <ElementView />}
        {view === 'data' && <DataView />}
        {view === 'materials' && (
          <div className="h-full overflow-y-auto">
            <MaterialEditorPanel />
          </div>
        )}
      </div>
    </div>
  );
});
