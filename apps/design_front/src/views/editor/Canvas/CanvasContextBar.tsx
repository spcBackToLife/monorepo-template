import { observer } from 'mobx-react-lite';
import { Select } from 'antd';
import { editorStore } from '@/stores/editor';

/**
 * Phase 5：画布顶部上下文条 — 快速查看/切换数据源阶段、场景、领域态、环境态
 */
export const CanvasContextBar = observer(function CanvasContextBar() {
  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  if (!screen || editorStore.previewMode) return null;

  const domainVars = screen.domainStates ?? [];
  const envVars = project?.environmentStates ?? [];
  const dataSources = screen.dataSources ?? [];

  const hasAny =
    dataSources.length > 0 || domainVars.length > 0 || envVars.length > 0;
  if (!hasAny) return null;

  const nonDefault =
    dataSources.some((ds) => ds.activePhase !== 'loaded') ||
    domainVars.some((d) => editorStore.currentGlobalStates[d.name] !== d.defaultValue) ||
    envVars.some((e) => editorStore.currentGlobalStates[e.name] !== e.defaultValue);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-2 py-1.5 text-[10px] border-b border-gray-200 ${
        nonDefault ? 'bg-indigo-50/90 text-indigo-900' : 'bg-gray-50/95 text-gray-700'
      }`}
      style={{
        // 钉在画布顶部，浮于 transform 层之上 —— Frame 平移到画布上方时不会被覆盖。
        // 与右下角工具栏一样属于"画布悬浮 UI"层。
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <span className="font-semibold text-gray-500 shrink-0">上下文</span>
      {dataSources.map((ds) => {
        return (
          <span key={ds.id} className="inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 border border-gray-200">
            <span className="text-gray-500 truncate max-w-[72px]" title={ds.name}>
              {ds.name}
            </span>
            <Select
              size="small"
              variant="borderless"
              className="min-w-[72px]"
              value={ds.activePhase}
              onChange={(phase) =>
                editorStore.execute({
                  type: 'switchDataSourcePhase',
                  params: { screenId: screen.id, dataSourceId: ds.id, phase },
                })
              }
              options={ds.phases.map((p) => ({ value: p.name, label: p.label }))}
            />
            {ds.activePhase === 'loaded' && (
              <Select
                size="small"
                variant="borderless"
                className="min-w-[80px]"
                value={ds.activeScenarioId || undefined}
                placeholder="场景"
                onChange={(scenarioId) =>
                  editorStore.execute({
                    type: 'switchDataScenario',
                    params: { screenId: screen.id, dataSourceId: ds.id, scenarioId: scenarioId ?? '' },
                  })
                }
                options={ds.scenarios.map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          </span>
        );
      })}
      {domainVars.map((d) => (
        <span key={d.id} className="inline-flex items-center gap-1">
          <span className="text-gray-500">{d.label || d.name}</span>
          <Select
            size="small"
            className="w-[100px]"
            value={editorStore.currentGlobalStates[d.name] ?? d.defaultValue}
            onChange={(v) => editorStore.setCurrentGlobalState(d.name, v)}
            options={d.values.map((x) => ({ value: x.value, label: x.label }))}
          />
        </span>
      ))}
      {envVars.map((e) => (
        <span key={e.id} className="inline-flex items-center gap-1">
          <span className="text-gray-500">{e.label || e.name}</span>
          <Select
            size="small"
            className="w-[100px]"
            value={editorStore.currentGlobalStates[e.name] ?? e.defaultValue}
            onChange={(v) => editorStore.setCurrentGlobalState(e.name, v)}
            options={e.values.map((x) => ({ value: x.value, label: x.label }))}
          />
        </span>
      ))}
    </div>
  );
});
