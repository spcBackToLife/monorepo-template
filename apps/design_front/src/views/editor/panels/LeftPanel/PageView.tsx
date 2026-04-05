import { observer } from 'mobx-react-lite';
import { NewPageList } from '../PageList';

/**
 * Phase 4：页面列表视图（跳转关系增强可在 extractNavigations 接入后迭代）
 */
export const PageView = observer(function PageView() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-500 tracking-wide border-b border-gray-100">
        页面
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <NewPageList />
      </div>
    </div>
  );
});
