import { observer } from 'mobx-react-lite';
import { NewNodeTree } from '../NodeTree';

/** Phase 4：元素树视图 */
export const ElementView = observer(function ElementView() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        <NewNodeTree />
      </div>
    </div>
  );
});
