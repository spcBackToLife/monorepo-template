import { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { editorStore } from '@/stores/editor';

interface ViewportPreset {
  name: string;
  width: number;
  height: number;
  platform: 'mobile' | 'tablet' | 'pc';
}

const VIEWPORT_PRESETS: ViewportPreset[] = [
  { name: 'iPhone 15 Pro', width: 393, height: 852, platform: 'mobile' },
  { name: 'iPhone SE', width: 375, height: 667, platform: 'mobile' },
  { name: 'Pixel 8', width: 412, height: 924, platform: 'mobile' },
  { name: 'iPad Air', width: 820, height: 1180, platform: 'tablet' },
  { name: 'Desktop', width: 1440, height: 900, platform: 'pc' },
];

const selectCls =
  'h-6 px-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white outline-none max-w-[140px]';

/**
 * Preview Bar — Phase 8：领域态 / 环境态 / 数据源阶段与场景 / 溢出折叠。
 */
function MockScenarioSwitcher({
  apiEndpoints,
  onSwitch,
}: {
  apiEndpoints: Array<{
    definition: { id: string; name: string; method: string; path: string };
    scenarios: Array<{ id: string; name: string; statusCode: number }>;
    activeScenarioId: string;
  }>;
  onSwitch: (endpointId: string, scenarioId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className="px-2 py-0.5 rounded bg-purple-700 border border-purple-500 text-[10px] text-white hover:bg-purple-600"
        onClick={() => setOpen((o) => !o)}
      >
        接口场景 ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[240px] max-w-[90vw] p-2 rounded-md border border-gray-600 bg-gray-800 shadow-xl flex flex-col gap-2">
          <div className="text-[10px] text-gray-400 font-medium">接口 Mock 场景切换</div>
          {apiEndpoints.map((ep) => (
            <div key={ep.definition.id} className="flex flex-col gap-0.5">
              <div className="text-[10px] text-purple-300 font-mono">
                {ep.definition.method} {ep.definition.path}
                <span className="text-gray-500 ml-1 font-sans">{ep.definition.name}</span>
              </div>
              {ep.scenarios.map((sc) => (
                <label
                  key={sc.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`mock-${ep.definition.id}`}
                    checked={ep.activeScenarioId === sc.id}
                    onChange={() => onSwitch(ep.definition.id, sc.id)}
                    className="w-3 h-3"
                  />
                  <span>{sc.name}</span>
                  <span className={`font-mono ${sc.statusCode < 400 ? 'text-green-400' : 'text-red-400'}`}>
                    {sc.statusCode}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PreviewBar = observer(function PreviewBar() {
  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  const domainStates = screen?.domainStates ?? [];
  const envStates = project?.environmentStates ?? [];
  const dataSources = screen?.dataSources ?? [];
  const viewport = editorStore.currentViewport;
  const [dataSetFlash, setDataSetFlash] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleExit = () => {
    editorStore.setPreviewMode(false);
  };

  const handleBack = () => {
    editorStore.previewNavigateBack();
  };

  const handleDomainChange = (variableName: string, value: string) => {
    editorStore.setCurrentGlobalState(variableName, value);
  };

  const handleEnvChange = (variableName: string, value: string) => {
    editorStore.setCurrentGlobalState(variableName, value);
  };

  const handleScenarioSwitch = (dataSourceId: string, scenarioId: string) => {
    if (!screen) return;
    runInAction(() => {
      const ds = screen.dataSources?.find((d) => d.id === dataSourceId);
      if (ds) ds.activeScenarioId = scenarioId;
    });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setDataSetFlash(true);
    flashTimerRef.current = setTimeout(() => {
      setDataSetFlash(false);
    }, 420);
  };

  const handlePhaseSwitch = (dataSourceId: string, phase: string) => {
    if (!screen) return;
    runInAction(() => {
      const ds = screen.dataSources?.find((d) => d.id === dataSourceId);
      if (ds) ds.activePhase = phase;
    });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setDataSetFlash(true);
    flashTimerRef.current = setTimeout(() => {
      setDataSetFlash(false);
    }, 320);
  };

  const handleViewportSwitch = useCallback(
    (presetName: string) => {
      const preset = VIEWPORT_PRESETS.find((p) => p.name === presetName);
      if (!preset) return;
      runInAction(() => {
        const p = editorStore.project;
        if (p) {
          p.currentViewport = {
            name: preset.name,
            width: preset.width,
            height: preset.height,
            platform: preset.platform,
          };
        }
      });
    },
    [],
  );

  const toggleDeviceFrame = useCallback(() => {
    runInAction(() => {
      editorStore.previewShowDeviceFrame = !editorStore.previewShowDeviceFrame;
    });
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!moreOpen) return;
      const el = moreRef.current;
      if (el && !el.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const apiEndpoints = (screen?.apiEndpoints ?? []) as Array<{
    definition: { id: string; name: string; method: string; path: string };
    scenarios: Array<{ id: string; name: string; statusCode: number }>;
    activeScenarioId: string;
  }>;

  const handleMockScenarioSwitch = (endpointId: string, scenarioId: string) => {
    if (!screen) return;
    runInAction(() => {
      const ep = (screen as any).apiEndpoints?.find(
        (e: any) => e.definition.id === endpointId,
      );
      if (ep) ep.activeScenarioId = scenarioId;
    });
  };

  const primaryDomain = domainStates.slice(0, 2);
  const extraDomain = domainStates.slice(2);
  const primaryEnv = envStates.slice(0, 1);
  const extraEnv = envStates.slice(1);
  const primaryDs = dataSources.slice(0, 1);
  const extraDs = dataSources.slice(1);

  const renderDomainSelect = (gs: (typeof domainStates)[number]) => (
    <div key={gs.name} className="flex items-center gap-1 shrink-0">
      <span className="text-gray-400 text-[10px] whitespace-nowrap">{gs.label || gs.name}:</span>
      <select
        className={selectCls}
        value={editorStore.currentGlobalStates[gs.name] ?? gs.defaultValue}
        onChange={(e) => handleDomainChange(gs.name, e.target.value)}
      >
        {gs.values.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderEnvSelect = (ev: (typeof envStates)[number]) => (
    <div key={ev.name} className="flex items-center gap-1 shrink-0">
      <span className="text-emerald-400/90 text-[10px] whitespace-nowrap">{ev.label || ev.name}:</span>
      <select
        className={selectCls}
        value={editorStore.currentGlobalStates[ev.name] ?? ev.defaultValue}
        onChange={(e) => handleEnvChange(ev.name, e.target.value)}
      >
        {ev.values.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderDataSourceBlock = (ds: (typeof dataSources)[number], compact: boolean) => (
    <div
      key={ds.id}
      className={`flex flex-wrap items-center gap-1 shrink-0 ${compact ? '' : 'border-l border-gray-700 pl-2'}`}
    >
      <span className="text-cyan-400/90 text-[10px] whitespace-nowrap">{ds.name}</span>
      {ds.lifecycle === 'api' && ds.phases.length > 0 && (
        <select
          className={selectCls}
          value={ds.activePhase}
          onChange={(e) => handlePhaseSwitch(ds.id, e.target.value)}
          title="数据源阶段"
        >
          {ds.phases.map((p) => (
            <option key={p.name} value={p.name}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      {ds.scenarios.length > 0 && (
        <select
          className={selectCls}
          value={ds.activeScenarioId}
          onChange={(e) => handleScenarioSwitch(ds.id, e.target.value)}
          title="数据场景"
        >
          {ds.scenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const hasMoreContent =
    extraDomain.length > 0 || extraEnv.length > 0 || extraDs.length > 0;

  return (
    <div className="flex flex-col gap-1 min-h-10 px-3 py-1.5 bg-gray-900 text-white text-xs select-none border-b border-gray-800">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs font-medium transition-colors shrink-0"
          onClick={handleExit}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H3m0 0l6-6m-6 6l6 6" />
          </svg>
          退出预览
        </button>

        <button
          type="button"
          disabled={!editorStore.previewCanGoBack}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors shrink-0 ${
            editorStore.previewCanGoBack
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          onClick={handleBack}
          title={editorStore.previewCanGoBack ? '返回上一预览页面' : '无历史页面'}
        >
          ← 返回
        </button>

        <div className="flex-1 min-w-[120px] text-center">
          <span className="text-gray-400">预览:</span>
          <span className="ml-1 font-medium">{screen?.name ?? '未知页面'}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-gray-400 text-[10px]">设备:</span>
          <select
            className={selectCls}
            value={viewport?.name ?? ''}
            onChange={(e) => handleViewportSwitch(e.target.value)}
          >
            {VIEWPORT_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.width}×{p.height})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors shrink-0 ${
            editorStore.previewShowDeviceFrame
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          onClick={toggleDeviceFrame}
          title={editorStore.previewShowDeviceFrame ? '关闭设备框' : '显示设备框'}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="9" y1="19" x2="15" y2="19" />
          </svg>
          外壳
        </button>

        <div
          className={`flex flex-wrap items-center gap-2 justify-end transition-shadow duration-300 ${
            dataSetFlash ? 'ring-2 ring-cyan-400/60 rounded-sm px-0.5' : ''
          }`}
        >
          {primaryDomain.map(renderDomainSelect)}
          {primaryEnv.map(renderEnvSelect)}
          {primaryDs.map((ds) => renderDataSourceBlock(ds, true))}

          {apiEndpoints.length > 0 && (
            <MockScenarioSwitcher
              apiEndpoints={apiEndpoints}
              onSwitch={handleMockScenarioSwitch}
            />
          )}

          {hasMoreContent && (
            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-gray-800 border border-gray-600 text-[10px] text-gray-200 hover:bg-gray-700"
                onClick={() => setMoreOpen((o) => !o)}
              >
                更多 ▾
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] max-w-[90vw] p-2 rounded-md border border-gray-600 bg-gray-800 shadow-xl flex flex-col gap-2">
                  {extraDomain.map(renderDomainSelect)}
                  {extraEnv.map(renderEnvSelect)}
                  {extraDs.map((ds) => renderDataSourceBlock(ds, false))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
