import { observer } from 'mobx-react-lite';
import { Select } from 'antd';
import type { ViewVariableDef } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

/**
 * 画布顶部上下文条（v2）—— 快速查看/切换：
 *   - api 数据源激活的 mock 场景
 *   - 屏幕级 view 变量（带 enum 的）预览值
 *   - 项目级（global）view 变量（带 enum 的）预览值
 *
 * v1 已移除：
 *   - 数据源 phase / scenarios（v2 改为 endpoint+mock 共存，phase 概念消除）
 *   - domainStates / environmentStates（v2 统一到 stateInit.view / globalStateInit.view）
 */
export const CanvasContextBar = observer(function CanvasContextBar() {
  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  if (!screen || editorStore.previewMode) return null;

  const dataSources = screen.dataSources ?? [];
  const apiWithMock = dataSources.filter(
    (ds): ds is Extract<typeof ds, { type: 'api' }> =>
      ds.type === 'api' && (ds.mock?.scenarios.length ?? 0) > 0,
  );

  const screenViewVars: ViewVariableDef[] = Object.values(screen.stateInit?.view ?? {}).filter(
    (v): v is ViewVariableDef => Array.isArray(v.enum) && v.enum.length > 0,
  );
  const globalViewVars: ViewVariableDef[] = Object.values(project?.globalStateInit?.view ?? {}).filter(
    (v): v is ViewVariableDef => Array.isArray(v.enum) && v.enum.length > 0,
  );

  const hasAny =
    apiWithMock.length > 0 || screenViewVars.length > 0 || globalViewVars.length > 0;
  if (!hasAny) return null;

  /** 是否处于"非默认"状态（用于切换上下文条颜色提示） */
  const nonDefault = (() => {
    if (apiWithMock.some((ds) => {
      const def = ds.mock?.scenarios[0]?.id;
      return ds.mock?.activeScenarioId && def && ds.mock.activeScenarioId !== def;
    })) return true;
    const all: ViewVariableDef[] = [...screenViewVars, ...globalViewVars];
    return all.some((vv) => vv.previewValue !== undefined && vv.previewValue !== vv.defaultValue);
  })();

  const handleScreenViewPreview = (name: string, value: unknown) => {
    editorStore.execute({
      type: 'screenState.setViewPreview',
      params: { screenId: screen.id, name, previewValue: value },
    });
  };

  const handleGlobalViewPreview = (name: string, value: unknown) => {
    editorStore.execute({
      type: 'globalState.setViewPreview',
      params: { name, previewValue: value },
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-2 py-1.5 text-[10px] border-b border-gray-200 ${
        nonDefault ? 'bg-indigo-50/90 text-indigo-900' : 'bg-gray-50/95 text-gray-700'
      }`}
      style={{
        // 钉在画布顶部，浮于 transform 层之上 —— Frame 平移到画布上方时不会被覆盖。
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <span className="font-semibold text-gray-500 shrink-0">上下文</span>

      {apiWithMock.map((ds) => (
        <span
          key={ds.id}
          className="inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 border border-gray-200"
        >
          <span className="text-gray-500 truncate max-w-[72px]" title={ds.name}>
            {ds.name}
          </span>
          <Select
            size="small"
            variant="borderless"
            className="min-w-[80px]"
            value={ds.mock?.activeScenarioId || undefined}
            placeholder="场景"
            onChange={(scenarioId) =>
              editorStore.execute({
                type: 'dataSource.switchMockScenario',
                params: {
                  screenId: screen.id,
                  dataSourceId: ds.id,
                  scenarioId: scenarioId ?? '',
                },
              })
            }
            options={(ds.mock?.scenarios ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </span>
      ))}

      {screenViewVars.map((vv) => (
        <span key={vv.name} className="inline-flex items-center gap-1">
          <span className="text-gray-500">{vv.label || vv.name}</span>
          <Select
            size="small"
            className="w-[100px]"
            value={(vv.previewValue ?? vv.defaultValue) as string | number | boolean}
            onChange={(v) => handleScreenViewPreview(vv.name, v)}
            options={(vv.enum ?? []).map((opt) => ({
              value: opt.value as string | number | boolean,
              label: opt.label,
            }))}
          />
        </span>
      ))}

      {globalViewVars.map((vv) => (
        <span key={`global-${vv.name}`} className="inline-flex items-center gap-1">
          <span className="text-gray-500">⌐ {vv.label || vv.name}</span>
          <Select
            size="small"
            className="w-[100px]"
            value={(vv.previewValue ?? vv.defaultValue) as string | number | boolean}
            onChange={(v) => handleGlobalViewPreview(vv.name, v)}
            options={(vv.enum ?? []).map((opt) => ({
              value: opt.value as string | number | boolean,
              label: opt.label,
            }))}
          />
        </span>
      ))}
    </div>
  );
});
