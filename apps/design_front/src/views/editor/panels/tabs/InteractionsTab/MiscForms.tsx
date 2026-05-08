/**
 * Nav / Node / UI / Custom 类动词参数表单（v2）。
 */

import { type FormProps, type FormCtx, str, num, labelCls, inputCls, selectCls, rowCls } from './formCommon';

// ===== nav.go =====

export function NavGoForm({ action, update, screens }: FormCtx) {
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>页面:</span>
        <select
          className={selectCls}
          value={str(action, 'targetScreenId')}
          onChange={(e) => update('targetScreenId', e.target.value)}
        >
          <option value="">选择页面</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ===== nav.back（无参） =====

export function NavBackForm() {
  return (
    <div className="pl-4 text-[10px] text-gray-400 italic">无参数（返回上一页）</div>
  );
}

// ===== node.setVisualState =====

export function NodeSetVisualStateForm({ action, update, updateMany, allNodes }: FormCtx) {
  const targetId = str(action, 'nodeId');
  const targetNode = allNodes.find((n) => n.id === targetId);
  const availableStates = targetNode?.states ?? [];
  const autoRevert = num(action, 'autoRevertMs') ?? 0;

  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>目标:</span>
        <select
          className={selectCls}
          value={targetId}
          onChange={(e) =>
            updateMany?.({ nodeId: e.target.value || undefined, state: '' })
          }
        >
          <option value="">宿主节点（默认）</option>
          {allNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {'\u00A0\u00A0'.repeat(n.depth)}{n.name} ({n.type})
              {n.states.length > 0 ? ` [${n.states.length}态]` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className={rowCls}>
        <span className={labelCls}>视觉态:</span>
        {availableStates.length > 0 ? (
          <select
            className={selectCls}
            value={str(action, 'state')}
            onChange={(e) => update('state', e.target.value)}
          >
            <option value="">选择视觉态</option>
            <option value="default">default</option>
            {availableStates.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className={inputCls}
            placeholder="visualState 名"
            value={str(action, 'state')}
            onChange={(e) => update('state', e.target.value)}
          />
        )}
      </div>
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input
          type="checkbox"
          checked={autoRevert > 0}
          onChange={(e) => update('autoRevertMs', e.target.checked ? 3000 : undefined)}
        />
        自动回退
        {autoRevert > 0 && (
          <>
            <input
              type="number"
              min={500}
              className="w-16 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none"
              value={autoRevert}
              onChange={(e) => update('autoRevertMs', Number(e.target.value) || 3000)}
            />
            <span>ms</span>
          </>
        )}
      </label>
    </div>
  );
}

// ===== ui.showToast =====

export function UiShowToastForm({ action, update }: FormProps) {
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>类型:</span>
        <select
          className={selectCls}
          value={str(action, 'toastType') || 'info'}
          onChange={(e) => update('toastType', e.target.value)}
        >
          <option value="success">成功</option>
          <option value="error">错误</option>
          <option value="warning">警告</option>
          <option value="info">信息</option>
        </select>
      </div>
      <div className={rowCls}>
        <span className={labelCls}>内容:</span>
        <input
          type="text"
          className={inputCls}
          placeholder="支持 {{ state.view.errMsg }}"
          value={str(action, 'message')}
          onChange={(e) => update('message', e.target.value)}
        />
      </div>
      <div className={rowCls}>
        <span className={labelCls}>时长:</span>
        <input
          type="number"
          min={500}
          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs outline-none"
          placeholder="3000"
          value={num(action, 'duration') ?? ''}
          onChange={(e) =>
            update('duration', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
        <span className="text-[10px] text-gray-400">ms</span>
      </div>
      <div className={rowCls}>
        <span className={labelCls}>位置:</span>
        <select
          className={selectCls}
          value={str(action, 'position') || 'top-center'}
          onChange={(e) => update('position', e.target.value)}
        >
          <option value="top-center">顶部居中</option>
          <option value="bottom-center">底部居中</option>
          <option value="top-right">右上角</option>
        </select>
      </div>
    </div>
  );
}

// ===== ui.openUrl =====

export function UiOpenUrlForm({ action, update }: FormProps) {
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>URL:</span>
        <input
          type="text"
          className={inputCls}
          placeholder="https://... 或 {{ state.view.url }}"
          value={str(action, 'url')}
          onChange={(e) => update('url', e.target.value)}
        />
      </div>
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input
          type="checkbox"
          checked={action.openInNewTab !== false}
          onChange={(e) => update('openInNewTab', e.target.checked)}
        />
        新标签页打开
      </label>
    </div>
  );
}

// ===== ui.delay =====

export function UiDelayForm({ action, update }: FormProps) {
  return (
    <div className={`${rowCls} pl-4`}>
      <span className={labelCls}>时长:</span>
      <input
        type="number"
        min={1}
        className="w-20 h-6 px-1 border border-gray-200 rounded text-xs outline-none"
        placeholder="300"
        value={num(action, 'duration') ?? ''}
        onChange={(e) => update('duration', Number(e.target.value) || 300)}
      />
      <span className="text-[10px] text-gray-400">ms</span>
    </div>
  );
}

// ===== custom =====

export function CustomForm({ action, update }: FormProps) {
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>handler:</span>
        <input
          type="text"
          className={`${inputCls} font-mono`}
          placeholder="宿主侧注册的 handler 名"
          value={str(action, 'handler')}
          onChange={(e) => update('handler', e.target.value)}
        />
      </div>
      <div className={rowCls}>
        <span className={labelCls}>payload:</span>
        <input
          type="text"
          className={`${inputCls} font-mono`}
          placeholder='{"key":"value"} JSON'
          value={typeof action.payload === 'object' && action.payload !== null
            ? JSON.stringify(action.payload)
            : str(action, 'payload')}
          onChange={(e) => {
            try {
              update('payload', e.target.value ? JSON.parse(e.target.value) : undefined);
            } catch {
              update('payload', e.target.value);
            }
          }}
        />
      </div>
    </div>
  );
}
