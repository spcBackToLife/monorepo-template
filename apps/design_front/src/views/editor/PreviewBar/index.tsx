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

/**
 * Preview Bar — top bar during preview mode.
 * W6-091：返回走导航栈；数据集切换短暂高亮。
 * W8-100：设备切换、设备框开关。
 */
export const PreviewBar = observer(function PreviewBar() {
  const screen = editorStore.activeScreen;
  const globalStates = screen?.globalStates ?? [];
  const dataSets = screen?.dataSets ?? [];
  const activeDataSetId = screen?.activeDataSetId;
  const viewport = editorStore.currentViewport;
  const [dataSetFlash, setDataSetFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleExit = () => {
    editorStore.setPreviewMode(false);
  };

  const handleBack = () => {
    editorStore.previewNavigateBack();
  };

  const handleGlobalStateChange = (variableName: string, value: string) => {
    editorStore.setCurrentGlobalState(variableName, value);
  };

  const handleDatasetSwitch = (dataSetId: string) => {
    if (!screen) return;
    runInAction(() => {
      if (screen) screen.activeDataSetId = dataSetId;
    });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setDataSetFlash(true);
    flashTimerRef.current = setTimeout(() => {
      setDataSetFlash(false);
    }, 420);
  };

  const handleViewportSwitch = useCallback(
    (presetName: string) => {
      const preset = VIEWPORT_PRESETS.find((p) => p.name === presetName);
      if (!preset) return;
      runInAction(() => {
        const project = editorStore.project;
        if (project) {
          project.currentViewport = {
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

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  return (
    <div className="flex items-center gap-3 h-10 px-4 bg-gray-900 text-white text-xs select-none">
      {/* Exit button */}
      <button
        type="button"
        className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs font-medium transition-colors"
        onClick={handleExit}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H3m0 0l6-6m-6 6l6 6" />
        </svg>
        退出预览
      </button>

      {/* Back button */}
      <button
        type="button"
        disabled={!editorStore.previewCanGoBack}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          editorStore.previewCanGoBack
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
        onClick={handleBack}
        title={editorStore.previewCanGoBack ? '返回上一预览页面' : '无历史页面'}
      >
        ← 返回
      </button>

      {/* Current page name */}
      <div className="flex-1 text-center">
        <span className="text-gray-400">预览:</span>
        <span className="ml-1 font-medium">{screen?.name ?? '未知页面'}</span>
      </div>

      {/* Viewport switcher (W8-100) */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-[10px]">设备:</span>
        <select
          className="h-6 px-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white outline-none"
          value={viewport?.name ?? ''}
          onChange={(e) => handleViewportSwitch(e.target.value)}
        >
          {VIEWPORT_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.width}x{p.height})
            </option>
          ))}
        </select>
      </div>

      {/* Device frame toggle (W8-100) */}
      <button
        type="button"
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
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

      {/* Global state dropdowns */}
      {globalStates.map((gs) => (
        <div key={gs.name} className="flex items-center gap-1">
          <span className="text-gray-400 text-[10px]">{gs.name}:</span>
          <select
            className="h-6 px-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white outline-none"
            value={editorStore.currentGlobalStates[gs.name] ?? gs.defaultValue}
            onChange={(e) => handleGlobalStateChange(gs.name, e.target.value)}
          >
            {gs.values.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      ))}

      {/* Dataset dropdown */}
      {dataSets.length > 0 && (
        <div
          className={`flex items-center gap-1 rounded px-0.5 py-0.5 transition-shadow duration-300 ${
            dataSetFlash ? 'ring-2 ring-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.35)]' : ''
          }`}
        >
          <span className="text-gray-400 text-[10px]">数据集:</span>
          <select
            className="h-6 px-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white outline-none"
            value={activeDataSetId ?? ''}
            onChange={(e) => handleDatasetSwitch(e.target.value)}
          >
            {dataSets.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
});
