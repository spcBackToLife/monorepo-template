/**
 * CSS 动画编辑器 — React 组件
 *
 * Phase 5: CSS 动画编辑器 UI
 *   - 实时动画预览区域
 *   - 动画属性配置（名称/持续时间/延迟/次数/方向/填充模式）
 *   - 缓动曲线可视化编辑（SVG 贝塞尔曲线 + 拖拽控制点）
 *   - 时间轴面板（关键帧可视化 + 添加/删除/编辑）
 *   - 关键帧属性编辑器
 *   - 预置动画模板选择
 *   - 生成 @keyframes CSS 代码
 *   - 应用动画到 Schema 节点
 */
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Tooltip,
  App as AntdApp,
  Collapse,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  CopyOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import {
  CSSAnimationEditorManager,
  bezierCurvePoints,
  parseTimingFunction,
  bezierToCSS,
  ANIMATABLE_CSS_PROPERTIES,
  TRANSFORM_PRESETS,
} from '@globallink/material-operations';
import type {
  CSSAnimationConfig,
  CSSKeyframe,
  AnimationPreset,
  BezierControlPoints,
} from '@globallink/material-operations';
import { editorStore } from '@/stores/editor';

// ===== 预览尺寸 =====
const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 120;

// ===== 贝塞尔曲线编辑器尺寸 =====
const BEZIER_SIZE = 160;
const BEZIER_PAD = 24;

// 缓动预设
const EASING_OPTIONS = [
  { value: 'ease', label: '默认缓动' },
  { value: 'linear', label: '线性' },
  { value: 'ease-in', label: '缓入' },
  { value: 'ease-out', label: '缓出' },
  { value: 'ease-in-out', label: '缓入缓出' },
  { value: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', label: '弹性' },
  { value: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)', label: '弹跳' },
  { value: 'cubic-bezier(0, 1, 0.5, 1)', label: '快速' },
];

export function AnimationEditor() {
  const { message } = AntdApp.useApp();

  // 编辑器管理器
  const managerRef = useRef<CSSAnimationEditorManager | null>(null);

  // 动画配置状态
  const [config, setConfig] = useState<CSSAnimationConfig>({
    name: 'fadeIn',
    duration: '0.5s',
    timingFunction: 'ease-out',
    delay: '0s',
    iterationCount: 1,
    direction: 'normal',
    fillMode: 'both',
    keyframes: [
      { offset: 0, styles: { opacity: '0' } },
      { offset: 1, styles: { opacity: '1' } },
    ],
  });

  // UI 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKfIdx, setSelectedKfIdx] = useState<number>(0);
  const [generatedCSS, setGeneratedCSS] = useState('');
  const [showCode, setShowCode] = useState(false);

  // 初始化管理器
  useEffect(() => {
    const manager = new CSSAnimationEditorManager(config, {
      configChanged: (newConfig) => setConfig({ ...newConfig }),
    });
    managerRef.current = manager;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步 config 到管理器
  const syncToManager = useCallback(() => {
    managerRef.current?.setConfig(config);
  }, [config]);

  // 更新配置字段
  const updateField = useCallback(<K extends keyof CSSAnimationConfig>(key: K, value: CSSAnimationConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      managerRef.current?.setConfig(next);
      return next;
    });
  }, []);

  // ===== 关键帧操作 =====

  const addKeyframe = useCallback(() => {
    setConfig((prev) => {
      // 找一个空隙位置
      const offsets = prev.keyframes.map((kf) => kf.offset).sort((a, b) => a - b);
      let newOffset = 0.5;
      // 找最大间隔
      let maxGap = 0;
      for (let i = 0; i < offsets.length - 1; i++) {
        const gap = offsets[i + 1] - offsets[i];
        if (gap > maxGap) {
          maxGap = gap;
          newOffset = offsets[i] + gap / 2;
        }
      }
      if (offsets.length === 0) newOffset = 0;
      else if (offsets.length === 1) newOffset = offsets[0] < 0.5 ? 1 : 0;

      const newKf: CSSKeyframe = { offset: Math.round(newOffset * 100) / 100, styles: {} };
      const keyframes = [...prev.keyframes, newKf].sort((a, b) => a.offset - b.offset);
      const next = { ...prev, keyframes };
      managerRef.current?.setConfig(next);
      setSelectedKfIdx(keyframes.indexOf(newKf));
      return next;
    });
  }, []);

  const removeKeyframe = useCallback((idx: number) => {
    setConfig((prev) => {
      if (prev.keyframes.length <= 1) return prev;
      const keyframes = prev.keyframes.filter((_, i) => i !== idx);
      const next = { ...prev, keyframes };
      managerRef.current?.setConfig(next);
      setSelectedKfIdx(Math.min(selectedKfIdx, keyframes.length - 1));
      return next;
    });
  }, [selectedKfIdx]);

  const updateKeyframeOffset = useCallback((idx: number, offset: number) => {
    setConfig((prev) => {
      const keyframes = prev.keyframes.map((kf, i) =>
        i === idx ? { ...kf, offset: Math.max(0, Math.min(1, offset)) } : kf,
      );
      keyframes.sort((a, b) => a.offset - b.offset);
      const next = { ...prev, keyframes };
      managerRef.current?.setConfig(next);
      return next;
    });
  }, []);

  const updateKeyframeStyle = useCallback((idx: number, key: string, value: string) => {
    setConfig((prev) => {
      const keyframes = prev.keyframes.map((kf, i) =>
        i === idx ? { ...kf, styles: { ...kf.styles, [key]: value } } : kf,
      );
      const next = { ...prev, keyframes };
      managerRef.current?.setConfig(next);
      return next;
    });
  }, []);

  const removeKeyframeStyle = useCallback((idx: number, key: string) => {
    setConfig((prev) => {
      const keyframes = prev.keyframes.map((kf, i) => {
        if (i !== idx) return kf;
        const styles = { ...kf.styles };
        delete styles[key];
        return { ...kf, styles };
      });
      const next = { ...prev, keyframes };
      managerRef.current?.setConfig(next);
      return next;
    });
  }, []);

  const addPropertyToKeyframe = useCallback((idx: number, key: string) => {
    const prop = ANIMATABLE_CSS_PROPERTIES.find((p) => p.key === key);
    const defaultValue = idx === 0 ? (prop?.defaultFrom ?? '') : (prop?.defaultTo ?? '');
    updateKeyframeStyle(idx, key, defaultValue);
  }, [updateKeyframeStyle]);

  // ===== 缓动曲线 =====

  const bezierPoints = useMemo(() => {
    return parseTimingFunction(config.timingFunction);
  }, [config.timingFunction]);

  const handleBezierChange = useCallback((points: BezierControlPoints) => {
    const cssValue = bezierToCSS(points);
    updateField('timingFunction', cssValue);
  }, [updateField]);

  // ===== CSS 生成 =====

  const handleGenerateCSS = useCallback(() => {
    syncToManager();
    const result = managerRef.current?.generateFullCSS();
    if (result) {
      setGeneratedCSS(result);
      setShowCode(true);
    }
  }, [syncToManager]);

  const handleCopyCSS = useCallback(async () => {
    if (!generatedCSS) return;
    await navigator.clipboard.writeText(generatedCSS);
    message.success('CSS 代码已复制');
  }, [generatedCSS, message]);

  // ===== 预设 =====
  const presets = useMemo(() => CSSAnimationEditorManager.getPresets(), []);

  const handleLoadPreset = useCallback((preset: AnimationPreset) => {
    const newConfig = {
      ...preset.config,
      keyframes: preset.config.keyframes.map((kf) => ({ ...kf, styles: { ...kf.styles } })),
    };
    setConfig(newConfig);
    managerRef.current?.setConfig(newConfig);
    setSelectedKfIdx(0);
    setIsPlaying(false);
    message.success(`已加载预设: ${preset.name}`);
  }, [message]);

  // ===== 应用到选中元素 =====

  const handleApplyToNode = useCallback(() => {
    const nodeId = editorStore.selectedNodeIds[0];
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    syncToManager();
    const { animationShorthand } = managerRef.current?.generateCSS() ?? {};
    if (!animationShorthand) return;

    // 应用 animation 到选中节点的 styles
    editorStore.execute({
      type: 'updateStyle',
      params: {
        nodeId,
        styles: {
          animation: animationShorthand,
        },
      },
    });

    message.success('动画已应用到元素');
  }, [syncToManager, message]);

  // ===== 预览控制 =====

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 预览动画样式
  const previewAnimationStyle = useMemo((): React.CSSProperties => {
    if (!isPlaying) return {};
    syncToManager();
    const result = managerRef.current?.generateCSS();
    if (!result) return {};

    return {
      animationName: config.name,
      animationDuration: config.duration,
      animationTimingFunction: config.timingFunction,
      animationDelay: config.delay ?? '0s',
      animationIterationCount: config.iterationCount === 'infinite' ? 'infinite' : Number(config.iterationCount ?? 1),
      animationDirection: config.direction ?? 'normal',
      animationFillMode: config.fillMode ?? 'both',
    };
  }, [isPlaying, config, syncToManager]);

  // 生成 @keyframes style tag
  const keyframesStyleTag = useMemo(() => {
    if (!isPlaying) return '';
    syncToManager();
    const result = managerRef.current?.generateCSS();
    return result?.keyframesCSS ?? '';
  }, [isPlaying, config, syncToManager]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当前选中的关键帧
  const currentKf = config.keyframes[selectedKfIdx] ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 预览区域 */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-gray-600">实时预览</span>
          <div className="flex items-center gap-1">
            <Tooltip title={isPlaying ? '暂停' : '播放'}>
              <Button
                size="small"
                type={isPlaying ? 'primary' : 'default'}
                icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={handleTogglePlay}
              />
            </Tooltip>
          </div>
        </div>

        {/* 注入 @keyframes 到 style 标签 */}
        {isPlaying && keyframesStyleTag && (
          <style dangerouslySetInnerHTML={{ __html: keyframesStyleTag }} />
        )}

        <div
          className="bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, margin: '0 auto' }}
        >
          <div
            key={isPlaying ? 'playing' : 'paused'}
            className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white text-[10px] font-medium"
            style={previewAnimationStyle}
          >
            预览
          </div>
        </div>
      </div>

      {/* 主编辑区域 — 可滚动 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* 预设动画模板 */}
        <div>
          <span className="text-[10px] font-medium text-gray-500 block mb-1">预设动画模板</span>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Tag
                key={preset.nameEn}
                className="cursor-pointer hover:border-blue-400 transition-colors text-[10px]"
                color={config.name === preset.nameEn ? 'blue' : undefined}
                onClick={() => handleLoadPreset(preset)}
              >
                {preset.name}
              </Tag>
            ))}
          </div>
        </div>

        {/* 动画属性配置 */}
        <Collapse
          size="small"
          defaultActiveKey={['props', 'easing', 'timeline']}
          items={[
            {
              key: 'props',
              label: <span className="text-[11px] font-medium">动画属性</span>,
              children: (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">名称</span>
                    <Input
                      size="small"
                      value={config.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">持续</span>
                    <Input
                      size="small"
                      value={config.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      style={{ flex: 1 }}
                      placeholder="0.5s"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">延迟</span>
                    <Input
                      size="small"
                      value={config.delay ?? '0s'}
                      onChange={(e) => updateField('delay', e.target.value)}
                      style={{ flex: 1 }}
                      placeholder="0s"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">次数</span>
                    <Select
                      size="small"
                      value={String(config.iterationCount ?? 1)}
                      onChange={(v) => updateField('iterationCount', v === 'infinite' ? 'infinite' : Number(v))}
                      options={[
                        { value: '1', label: '1 次' },
                        { value: '2', label: '2 次' },
                        { value: '3', label: '3 次' },
                        { value: '5', label: '5 次' },
                        { value: 'infinite', label: '无限循环' },
                      ]}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">方向</span>
                    <Select
                      size="small"
                      value={config.direction ?? 'normal'}
                      onChange={(v) => updateField('direction', v as CSSAnimationConfig['direction'])}
                      options={[
                        { value: 'normal', label: '正向' },
                        { value: 'reverse', label: '反向' },
                        { value: 'alternate', label: '交替' },
                        { value: 'alternate-reverse', label: '反向交替' },
                      ]}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">填充</span>
                    <Select
                      size="small"
                      value={config.fillMode ?? 'none'}
                      onChange={(v) => updateField('fillMode', v as CSSAnimationConfig['fillMode'])}
                      options={[
                        { value: 'none', label: '无' },
                        { value: 'forwards', label: '保持结束' },
                        { value: 'backwards', label: '保持开始' },
                        { value: 'both', label: '前后保持' },
                      ]}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'easing',
              label: <span className="text-[11px] font-medium">缓动曲线</span>,
              children: (
                <div className="space-y-2">
                  {/* 预设选择 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 w-10 shrink-0">类型</span>
                    <Select
                      size="small"
                      value={config.timingFunction}
                      onChange={(v) => updateField('timingFunction', v)}
                      options={EASING_OPTIONS}
                      style={{ flex: 1 }}
                      popupMatchSelectWidth={false}
                    />
                  </div>

                  {/* 贝塞尔曲线可视化编辑器 */}
                  {bezierPoints && (
                    <BezierCurveEditor
                      points={bezierPoints}
                      onChange={handleBezierChange}
                    />
                  )}

                  {/* 显示 CSS 值 */}
                  <div className="text-[9px] text-gray-400 font-mono bg-gray-50 p-1 rounded">
                    {config.timingFunction}
                  </div>
                </div>
              ),
            },
            {
              key: 'timeline',
              label: <span className="text-[11px] font-medium">时间轴 · 关键帧</span>,
              children: (
                <div className="space-y-2">
                  {/* 时间轴可视化 */}
                  <TimelineBar
                    keyframes={config.keyframes}
                    selectedIdx={selectedKfIdx}
                    onSelect={setSelectedKfIdx}
                    onChangeOffset={updateKeyframeOffset}
                  />

                  {/* 关键帧列表 + 操作 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{config.keyframes.length} 个关键帧</span>
                    <Tooltip title="添加关键帧">
                      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addKeyframe}>
                        添加
                      </Button>
                    </Tooltip>
                  </div>

                  {/* 关键帧标签 */}
                  <div className="flex flex-wrap gap-1">
                    {config.keyframes.map((kf, idx) => (
                      <Tag
                        key={idx}
                        closable={config.keyframes.length > 1}
                        onClose={(e) => { e.preventDefault(); removeKeyframe(idx); }}
                        color={idx === selectedKfIdx ? 'blue' : undefined}
                        className="cursor-pointer text-[10px]"
                        onClick={() => setSelectedKfIdx(idx)}
                      >
                        {Math.round(kf.offset * 100)}%
                      </Tag>
                    ))}
                  </div>

                  {/* 选中关键帧编辑 */}
                  {currentKf && (
                    <KeyframeEditor
                      keyframe={currentKf}
                      index={selectedKfIdx}
                      onChangeOffset={(offset) => updateKeyframeOffset(selectedKfIdx, offset)}
                      onChangeStyle={(key, val) => updateKeyframeStyle(selectedKfIdx, key, val)}
                      onRemoveStyle={(key) => removeKeyframeStyle(selectedKfIdx, key)}
                      onAddProperty={(key) => addPropertyToKeyframe(selectedKfIdx, key)}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />

        {/* 操作按钮 */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={handleGenerateCSS}
          >
            生成 CSS
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleApplyToNode}
          >
            应用到元素
          </Button>
        </div>

        {/* CSS 代码输出 */}
        {showCode && generatedCSS && (
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-gray-500">生成的 CSS</span>
              <div className="flex gap-1">
                <Tooltip title="复制代码">
                  <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => void handleCopyCSS()} />
                </Tooltip>
                <Button size="small" type="text" onClick={() => setShowCode(false)}>
                  ✕
                </Button>
              </div>
            </div>
            <pre className="bg-gray-900 text-green-300 p-2 rounded text-[10px] overflow-x-auto whitespace-pre font-mono max-h-48 overflow-y-auto">
              {generatedCSS}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 子组件：贝塞尔曲线编辑器 =====

function BezierCurveEditor({
  points,
  onChange,
}: {
  points: BezierControlPoints;
  onChange: (p: BezierControlPoints) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const totalW = BEZIER_SIZE + BEZIER_PAD * 2;
  const totalH = BEZIER_SIZE + BEZIER_PAD * 2;

  // 坐标转换：逻辑坐标(0-1) → SVG像素
  const toSvgX = (v: number) => BEZIER_PAD + v * BEZIER_SIZE;
  const toSvgY = (v: number) => BEZIER_PAD + (1 - v) * BEZIER_SIZE; // Y轴翻转

  // SVG像素 → 逻辑坐标
  const fromSvg = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left - BEZIER_PAD) / BEZIER_SIZE));
    const y = Math.max(-0.5, Math.min(1.5, 1 - (clientY - rect.top - BEZIER_PAD) / BEZIER_SIZE));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  };

  // 曲线路径点
  const curvePoints = useMemo(() => bezierCurvePoints(points, 64), [points]);
  const pathD = useMemo(() => {
    const first = curvePoints[0];
    const rest = curvePoints.slice(1);
    return `M ${toSvgX(first.x)} ${toSvgY(first.y)} ` +
      rest.map((p) => `L ${toSvgX(p.x)} ${toSvgY(p.y)}`).join(' ');
  }, [curvePoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // 拖拽处理
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const pos = fromSvg(e.clientX, e.clientY);
      if (dragging === 'p1') {
        onChange({ ...points, x1: pos.x, y1: pos.y });
      } else {
        onChange({ ...points, x2: pos.x, y2: pos.y });
      }
    };

    const handleUp = () => setDragging(null);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, points, onChange]);

  return (
    <div className="flex justify-center">
      <svg
        ref={svgRef}
        width={totalW}
        height={totalH}
        className="bg-gray-50 rounded border border-gray-200 cursor-crosshair"
      >
        {/* 网格线 */}
        {[0.25, 0.5, 0.75].map((v) => (
          <g key={v}>
            <line
              x1={toSvgX(v)} y1={toSvgY(0)} x2={toSvgX(v)} y2={toSvgY(1)}
              stroke="#e5e7eb" strokeWidth={0.5}
            />
            <line
              x1={toSvgX(0)} y1={toSvgY(v)} x2={toSvgX(1)} y2={toSvgY(v)}
              stroke="#e5e7eb" strokeWidth={0.5}
            />
          </g>
        ))}

        {/* 对角线（linear参考线） */}
        <line
          x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(1)} y2={toSvgY(1)}
          stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 2"
        />

        {/* 曲线 */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} />

        {/* 控制点连线 */}
        <line
          x1={toSvgX(0)} y1={toSvgY(0)}
          x2={toSvgX(points.x1)} y2={toSvgY(points.y1)}
          stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2"
        />
        <line
          x1={toSvgX(1)} y1={toSvgY(1)}
          x2={toSvgX(points.x2)} y2={toSvgY(points.y2)}
          stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2"
        />

        {/* 端点 (0,0) 和 (1,1) */}
        <circle cx={toSvgX(0)} cy={toSvgY(0)} r={4} fill="#6b7280" />
        <circle cx={toSvgX(1)} cy={toSvgY(1)} r={4} fill="#6b7280" />

        {/* 控制点 P1 */}
        <circle
          cx={toSvgX(points.x1)}
          cy={toSvgY(points.y1)}
          r={6}
          fill="#3b82f6"
          stroke="white"
          strokeWidth={2}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => { e.preventDefault(); setDragging('p1'); }}
        />

        {/* 控制点 P2 */}
        <circle
          cx={toSvgX(points.x2)}
          cy={toSvgY(points.y2)}
          r={6}
          fill="#ef4444"
          stroke="white"
          strokeWidth={2}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => { e.preventDefault(); setDragging('p2'); }}
        />

        {/* 标签 */}
        <text x={toSvgX(points.x1) + 8} y={toSvgY(points.y1) - 4} fontSize={9} fill="#3b82f6">P1</text>
        <text x={toSvgX(points.x2) + 8} y={toSvgY(points.y2) - 4} fontSize={9} fill="#ef4444">P2</text>
      </svg>
    </div>
  );
}

// ===== 子组件：时间轴条 =====

function TimelineBar({
  keyframes,
  selectedIdx,
  onSelect,
  onChangeOffset,
}: {
  keyframes: CSSKeyframe[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onChangeOffset: (idx: number, offset: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // 拖拽关键帧
  useEffect(() => {
    if (dragIdx === null) return;

    const handleMove = (e: MouseEvent) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const offset = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChangeOffset(dragIdx, Math.round(offset * 100) / 100);
    };

    const handleUp = () => setDragIdx(null);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragIdx, onChangeOffset]);

  return (
    <div className="space-y-1">
      {/* 刻度 */}
      <div className="flex justify-between text-[8px] text-gray-300 px-0.5">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* 时间轴 */}
      <div
        ref={barRef}
        className="relative h-6 bg-gray-100 rounded border border-gray-200 cursor-crosshair"
      >
        {/* 进度底色 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded" />

        {/* 刻度线 */}
        {[0.25, 0.5, 0.75].map((v) => (
          <div
            key={v}
            className="absolute top-0 bottom-0 w-px bg-gray-200"
            style={{ left: `${v * 100}%` }}
          />
        ))}

        {/* 关键帧标记 */}
        {keyframes.map((kf, idx) => (
          <div
            key={idx}
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-sm rotate-45 cursor-grab border-2 transition-colors ${
              idx === selectedIdx
                ? 'bg-blue-500 border-blue-700 shadow-sm'
                : 'bg-white border-gray-400 hover:border-blue-400'
            }`}
            style={{ left: `${kf.offset * 100}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(idx);
              setDragIdx(idx);
            }}
            title={`${Math.round(kf.offset * 100)}%`}
          />
        ))}
      </div>
    </div>
  );
}

// ===== 子组件：关键帧属性编辑器 =====

function KeyframeEditor({
  keyframe,
  index,
  onChangeOffset,
  onChangeStyle,
  onRemoveStyle,
  onAddProperty,
}: {
  keyframe: CSSKeyframe;
  index: number;
  onChangeOffset: (offset: number) => void;
  onChangeStyle: (key: string, value: string) => void;
  onRemoveStyle: (key: string) => void;
  onAddProperty: (key: string) => void;
}) {
  const [addingProp, setAddingProp] = useState(false);

  const styleEntries = Object.entries(keyframe.styles);

  // 计算已使用的属性（排除已添加的）
  const availableProps = useMemo(() => {
    const usedKeys = new Set(Object.keys(keyframe.styles));
    return ANIMATABLE_CSS_PROPERTIES.filter((p) => !usedKeys.has(p.key));
  }, [keyframe.styles]);

  return (
    <div className="bg-gray-50 rounded p-2 space-y-1.5 border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-600">
          关键帧 #{index + 1} — {Math.round(keyframe.offset * 100)}%
        </span>
      </div>

      {/* offset 滑块 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400 w-10 shrink-0">位置</span>
        <InputNumber
          size="small"
          min={0}
          max={100}
          value={Math.round(keyframe.offset * 100)}
          onChange={(v) => v != null && onChangeOffset(v / 100)}
          suffix="%"
          style={{ flex: 1 }}
        />
      </div>

      {/* 样式属性列表 */}
      {styleEntries.map(([key, value]) => {
        const propDef = ANIMATABLE_CSS_PROPERTIES.find((p) => p.key === key);

        return (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 w-14 shrink-0 truncate" title={key}>
              {propDef?.label ?? key}
            </span>
            {key === 'transform' ? (
              <Select
                size="small"
                value={String(value)}
                onChange={(v) => onChangeStyle(key, v)}
                options={TRANSFORM_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                style={{ flex: 1 }}
                popupMatchSelectWidth={false}
                showSearch
              />
            ) : (
              <Input
                size="small"
                value={String(value)}
                onChange={(e) => onChangeStyle(key, e.target.value)}
                style={{ flex: 1 }}
              />
            )}
            <Tooltip title="删除属性">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onRemoveStyle(key)}
                className="shrink-0"
              />
            </Tooltip>
          </div>
        );
      })}

      {/* 添加属性 */}
      {addingProp ? (
        <div className="flex items-center gap-1">
          <Select
            size="small"
            placeholder="选择属性…"
            options={availableProps.map((p) => ({ value: p.key, label: p.label }))}
            onChange={(v) => {
              onAddProperty(v);
              setAddingProp(false);
            }}
            style={{ flex: 1 }}
            autoFocus
            open
            onBlur={() => setAddingProp(false)}
            popupMatchSelectWidth={false}
          />
        </div>
      ) : (
        <Button
          size="small"
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() => setAddingProp(true)}
          disabled={availableProps.length === 0}
        >
          添加 CSS 属性
        </Button>
      )}

      {styleEntries.length === 0 && (
        <div className="text-[9px] text-gray-400 text-center py-1">
          暂无属性，点击「添加 CSS 属性」
        </div>
      )}
    </div>
  );
}
