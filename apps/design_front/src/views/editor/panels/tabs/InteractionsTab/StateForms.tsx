/**
 * State / Effect.cancel 类动词参数表单（v2）。
 * 表达式字段统一用 ExpressionEditor（D.4）。
 */

import { ExpressionEditor } from '@/views/editor/components/ExpressionEditor';
import { useExpressionScope } from '@/views/editor/components/ExpressionEditor/useExpressionScope';
import { type FormProps, type FormCtx, str, num, labelCls, selectCls, rowCls, inputCls } from './formCommon';

// ===== state.set / state.append / state.merge 共用模板 =====

function StatePathValueForm({ action, update, placeholder }: FormProps & { placeholder: string }) {
  const scope = useExpressionScope({ allowItem: true });
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>路径:</span>
        <input
          type="text"
          className={`${inputCls} font-mono`}
          placeholder="view.inputDraft 或 data.messages"
          value={str(action, 'path')}
          onChange={(e) => update('path', e.target.value)}
        />
      </div>
      <div className={rowCls}>
        <span className={labelCls}>值:</span>
        <ExpressionEditor
          value={str(action, 'value')}
          onChange={(next) => update('value', next)}
          scope={scope}
          mode="expression"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export function StateSetForm(p: FormProps) {
  return <StatePathValueForm {...p} placeholder='字面量或 {{ state.x + 1 }}' />;
}
export function StateAppendForm(p: FormProps) {
  return <StatePathValueForm {...p} placeholder="单个数组项（对象/字面量/表达式）" />;
}
export function StateMergeForm(p: FormProps) {
  return <StatePathValueForm {...p} placeholder='{ key: value } 浅合并' />;
}

// ===== state.remove =====

export function StateRemoveForm({ action, update }: FormProps) {
  const scope = useExpressionScope({ allowItem: true });
  const hasPredicate = typeof action.predicate === 'string' && (action.predicate as string).length > 0;
  return (
    <div className="flex flex-col gap-1 pl-4">
      <div className={rowCls}>
        <span className={labelCls}>路径:</span>
        <input
          type="text"
          className={`${inputCls} font-mono`}
          placeholder="data.messages"
          value={str(action, 'path')}
          onChange={(e) => update('path', e.target.value)}
        />
      </div>
      {!hasPredicate && (
        <div className={rowCls}>
          <span className={labelCls}>索引:</span>
          <input
            type="number"
            className={inputCls}
            placeholder="负数表示倒数（-1 = 最后一个）"
            value={num(action, 'index') ?? ''}
            onChange={(e) =>
              update('index', e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </div>
      )}
      <div className={rowCls}>
        <span className={labelCls}>谓词:</span>
        <ExpressionEditor
          value={str(action, 'predicate')}
          onChange={(next) => update('predicate', next || undefined)}
          scope={scope}
          mode="expression"
          placeholder='{{ item.id === state.view.activeId }}（含表达式则忽略 index）'
        />
      </div>
    </div>
  );
}

// ===== state.toggle =====

export function StateToggleForm({ action, update }: FormProps) {
  return (
    <div className={`${rowCls} pl-4`}>
      <span className={labelCls}>路径:</span>
      <input
        type="text"
        className={`${inputCls} font-mono`}
        placeholder="view.isOpen"
        value={str(action, 'path')}
        onChange={(e) => update('path', e.target.value)}
      />
    </div>
  );
}

// ===== effect.cancel =====

export function EffectCancelForm({ action, update, dataSources }: FormCtx) {
  return (
    <div className={`${rowCls} pl-4`}>
      <span className={labelCls}>数据源:</span>
      <select
        className={selectCls}
        value={str(action, 'dataSourceId')}
        onChange={(e) => update('dataSourceId', e.target.value || undefined)}
      >
        <option value="">全部进行中（不填）</option>
        {dataSources
          .filter((d) => d.type === 'api')
          .map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
      </select>
    </div>
  );
}
