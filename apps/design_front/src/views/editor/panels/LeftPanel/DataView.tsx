import { observer } from 'mobx-react-lite';
import { DataTab } from '../tabs/DataTab';

/**
 * Phase 4：左侧「数据」视图 — 复用 DataTab 逻辑（数据源 / 环境变量 / 绑定说明）
 */
export const DataView = observer(function DataView() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <DataTab />
    </div>
  );
});
