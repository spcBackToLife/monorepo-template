/**
 * 动画资源编辑器 — React 组件
 *
 * Phase 6: 外部动画资源支持
 *   - Lottie / PAG / Rive / GIF 文件上传与预览
 *   - Lottie 参数编辑（颜色替换/文字替换/速度调节）
 *   - 播放控制（播放/暂停/停止/速度/循环）
 *   - 动画元数据展示
 *   - 代码导出
 *   - 应用动画到 Schema 节点
 *
 * 依赖：
 *   - lottie-web: Lottie 动画实时预览播放
 *   - libpag: PAG 动画实时预览播放
 *   - @rive-app/canvas: Rive 动画实时预览播放
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
  Tooltip,
  App as AntdApp,
  Collapse,
  Tag,
  Upload,
  Slider,
  Switch,
  ColorPicker,
  Empty,
  Spin,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  CopyOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  AnimationResourceManager,
  getAnimationTypeName,
  getAnimationTypeIcon,
  getAcceptedExtensions,
  hexToLottieColor,
  lottieColorToHex,
} from '@globallink/material-operations';
import type {
  AnimationFileInfo,
  LottieEditableInfo,
  ExternalAnimationConfig,
} from '@globallink/material-operations';
import type { AnimationItem } from 'lottie-web';
import { editorStore } from '@/stores/editor';
import type { DataPayload } from '@/types/editor';

// ---- 最小类型声明（动态导入的库无静态类型导出） ----

/** libpag PAGView 实例 — play/pause/stop/destroy */
interface PAGViewInstance {
  destroy(): void;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  setRepeatCount(count: number): void;
}

/** @rive-app/canvas Rive 实例 — play/pause/reset/cleanup */
interface RiveInstance {
  cleanup(): void;
  play(animationName?: string): void;
  pause(animationName?: string): void;
  reset(params?: { autoplay?: boolean }): void;
  resizeDrawingSurfaceToCanvas(): void;
}

// ===== 主组件：AnimationResourceEditor =====

export function AnimationResourceEditor() {
  const { message } = AntdApp.useApp();

  // 管理器引用
  const managerRef = useRef<AnimationResourceManager | null>(null);

  // 状态
  const [fileInfo, setFileInfo] = useState<AnimationFileInfo | null>(null);
  const [lottieInfo, setLottieInfo] = useState<LottieEditableInfo | null>(null);
  const [config, setConfig] = useState<ExternalAnimationConfig>({
    type: 'lottie',
    src: '',
    autoplay: true,
    loop: true,
    speed: 1,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ html: string; js: string; dependencies: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Lottie 预览容器
  const lottieContainerRef = useRef<HTMLDivElement>(null);
  // lottie-web 实例
  const lottieAnimRef = useRef<AnimationItem | null>(null);
  // PAG canvas + 实例
  const pagCanvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<PAGViewInstance | null>(null);
  // Rive canvas + 实例
  const riveCanvasRef = useRef<HTMLCanvasElement>(null);
  const riveInstanceRef = useRef<RiveInstance | null>(null);

  // 初始化管理器
  useEffect(() => {
    const manager = new AnimationResourceManager(config, {
      loaded: (info) => {
        setFileInfo(info);
        setLoading(false);
      },
      lottieInfoParsed: (info) => {
        setLottieInfo(info);
      },
      stateChanged: (state) => {
        setIsPlaying(state === 'playing');
      },
      error: (msg) => {
        message.error(msg);
        setLoading(false);
      },
    });
    managerRef.current = manager;

    return () => {
      manager.destroy();
      destroyLottieInstance();
      destroyPagInstance();
      destroyRiveInstance();
    };
  }, []);

  // ===== Lottie 播放器管理 =====

  const destroyLottieInstance = useCallback(() => {
    if (lottieAnimRef.current) {
      try {
        lottieAnimRef.current?.destroy?.();
      } catch { /* ignore */ }
      lottieAnimRef.current = null;
    }
  }, []);

  /** 销毁 PAG 播放实例 */
  const destroyPagInstance = useCallback(() => {
    if (pagViewRef.current) {
      try {
        pagViewRef.current?.destroy?.();
      } catch { /* ignore */ }
      pagViewRef.current = null;
    }
  }, []);

  /** 销毁 Rive 播放实例 */
  const destroyRiveInstance = useCallback(() => {
    if (riveInstanceRef.current) {
      try {
        riveInstanceRef.current?.cleanup?.();
      } catch { /* ignore */ }
      riveInstanceRef.current = null;
    }
  }, []);

  /** 初始化 PAG 播放器 — 使用 libpag 真实渲染 */
  const initPagPlayer = useCallback(async (blobUrl: string) => {
    destroyPagInstance();
    const canvas = pagCanvasRef.current;
    if (!canvas) return;

    try {
      // 动态导入 libpag
      const pagModule = await import('libpag');
      const PAG = await pagModule.PAGInit();

      // 从 Blob URL 获取 ArrayBuffer
      const response = await fetch(blobUrl);
      const buffer = await response.arrayBuffer();
      const pagFile = await PAG.PAGFile.load(buffer);

      const pagView = await PAG.PAGView.init(pagFile, canvas);
      if (!pagView) {
        console.warn('PAGView.init returned null');
        return;
      }

      pagView.setRepeatCount(config.loop ? 0 : 1);
      pagViewRef.current = pagView;

      if (config.autoplay) {
        await pagView.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('libpag not available or init failed:', e);
    }
  }, [config.loop, config.autoplay, destroyPagInstance]);

  /** 初始化 Rive 播放器 — 使用 @rive-app/canvas 真实渲染 */
  const initRivePlayer = useCallback(async (blobUrl: string) => {
    destroyRiveInstance();
    const canvas = riveCanvasRef.current;
    if (!canvas) return;

    try {
      // 动态导入 @rive-app/canvas
      const riveModule = await import('@rive-app/canvas');
      const { Rive } = riveModule;

      // 从 Blob URL 获取实际二进制数据
      const response = await fetch(blobUrl);
      const buffer = await response.arrayBuffer();

      const rive = new Rive({
        buffer: buffer,
        canvas: canvas,
        autoplay: config.autoplay ?? true,
        onLoad: () => {
          rive.resizeDrawingSurfaceToCanvas();
          if (config.autoplay) {
            setIsPlaying(true);
          }
        },
        onLoadError: () => {
          console.warn('Rive load error');
        },
      });

      riveInstanceRef.current = rive;
    } catch (e) {
      console.warn('@rive-app/canvas not available or init failed:', e);
    }
  }, [config.autoplay, destroyRiveInstance]);

  const initLottiePlayer = useCallback(async (animData: DataPayload) => {
    destroyLottieInstance();

    const container = lottieContainerRef.current;
    if (!container) return;

    // 动态导入 lottie-web
    try {
      const lottieModule = await import('lottie-web');
      const lottie = lottieModule.default;

      container.innerHTML = '';
      const anim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: config.loop ?? true,
        autoplay: false,
        animationData: animData,
      });

      anim.setSpeed(config.speed ?? 1);
      lottieAnimRef.current = anim;

      if (config.autoplay) {
        anim.play();
        setIsPlaying(true);
      }
    } catch {
      // lottie-web 可能未安装，降级展示 JSON 信息
      console.warn('lottie-web not available, showing metadata only');
    }
  }, [config.loop, config.autoplay, config.speed, destroyLottieInstance]);

  // ===== 文件上传处理 =====

  const handleFileUpload = useCallback(async (file: File) => {
    const manager = managerRef.current;
    if (!manager) return;

    setLoading(true);
    setFileInfo(null);
    setLottieInfo(null);
    destroyLottieInstance();
    destroyPagInstance();
    destroyRiveInstance();

    const info = await manager.loadFromFile(file);
    if (!info) return;

    const newConfig = manager.getConfig();
    setConfig({ ...newConfig });

    // Lottie: 初始化 lottie-web 播放器
    if (info.type === 'lottie') {
      const lottieData = manager.getLottieData();
      if (lottieData) {
        await initLottiePlayer(lottieData);
      }
    }

    // PAG: 初始化 libpag 播放器
    if (info.type === 'pag' && newConfig.src) {
      // 需要短暂延迟等待 canvas ref 就绪
      setTimeout(() => void initPagPlayer(newConfig.src), 100);
    }

    // Rive: 初始化 @rive-app/canvas 播放器
    if (info.type === 'rive' && newConfig.src) {
      setTimeout(() => void initRivePlayer(newConfig.src), 100);
    }
  }, [destroyLottieInstance, destroyPagInstance, destroyRiveInstance, initLottiePlayer, initPagPlayer, initRivePlayer]);

  // ===== 播放控制 =====

  const handlePlay = useCallback(() => {
    if (lottieAnimRef.current) lottieAnimRef.current.play?.();
    if (pagViewRef.current) void pagViewRef.current.play?.();
    if (riveInstanceRef.current) riveInstanceRef.current.play?.();
    managerRef.current?.play();
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    if (lottieAnimRef.current) lottieAnimRef.current.pause?.();
    if (pagViewRef.current) pagViewRef.current.pause?.();
    if (riveInstanceRef.current) riveInstanceRef.current.pause?.();
    managerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    if (lottieAnimRef.current) lottieAnimRef.current.stop?.();
    if (pagViewRef.current) pagViewRef.current.stop?.();
    if (riveInstanceRef.current) riveInstanceRef.current.reset?.();
    managerRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setConfig((prev) => ({ ...prev, speed }));
    managerRef.current?.setSpeed(speed);

    if (lottieAnimRef.current) {
      lottieAnimRef.current.setSpeed?.(speed);
    }
  }, []);

  const handleLoopChange = useCallback((loop: boolean) => {
    setConfig((prev) => ({ ...prev, loop }));
    managerRef.current?.setLoop(loop);

    if (lottieAnimRef.current) {
      lottieAnimRef.current.loop = loop;
    }
  }, []);

  // ===== Lottie 文本替换 =====

  const handleTextReplace = useCallback(async (layerIndex: number, newText: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    const newData = manager.replaceLottieText(layerIndex, newText);
    if (newData) {
      // 重新初始化播放器
      await initLottiePlayer(newData);
      setLottieInfo(manager.getLottieEditableInfo());
      message.success('文本已更新');
    }
  }, [initLottiePlayer, message]);

  // ===== Lottie 颜色替换 =====

  const handleColorReplace = useCallback(async (path: string, newColorHex: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    const lottieColor = hexToLottieColor(newColorHex);
    const newData = manager.replaceLottieColor(path, lottieColor);
    if (newData) {
      await initLottiePlayer(newData);
      setLottieInfo(manager.getLottieEditableInfo());
      message.success('颜色已更新');
    }
  }, [initLottiePlayer, message]);

  // ===== 代码导出 =====

  const handleGenerateCode = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const code = manager.generateExportCode();
    setGeneratedCode(code);
    setShowCode(true);
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!generatedCode) return;
    const fullCode = `<!-- HTML -->\n${generatedCode.html}\n\n// JavaScript\n${generatedCode.js}`;
    await navigator.clipboard.writeText(fullCode);
    message.success('代码已复制');
  }, [generatedCode, message]);

  // ===== 应用到选中元素 =====

  const handleApplyToNode = useCallback(() => {
    const nodeId = editorStore.selectedNodeIds[0];
    if (!nodeId) {
      message.warning('请先选中一个元素');
      return;
    }

    const manager = managerRef.current;
    if (!manager || !fileInfo) {
      message.warning('请先导入一个动画文件');
      return;
    }

    const schemaProps = manager.generateSchemaProps();

    // 将 data-animation 属性写入选中节点
    editorStore.execute({
      type: 'updateComponentProps',
      params: {
        nodeId,
        props: schemaProps,
      },
    });

    // 对于 GIF，同时设置 src
    if (fileInfo.type === 'gif') {
      const currentConfig = manager.getConfig();
      editorStore.execute({
        type: 'updateComponentProps',
        params: {
          nodeId,
          props: { src: currentConfig.src },
        },
      });
    }

    message.success('动画已应用到元素');
  }, [fileInfo, message]);

  // ===== 清除当前动画 =====

  const handleClear = useCallback(() => {
    destroyLottieInstance();
    destroyPagInstance();
    destroyRiveInstance();
    managerRef.current?.destroy();
    setFileInfo(null);
    setLottieInfo(null);
    setConfig({
      type: 'lottie',
      src: '',
      autoplay: true,
      loop: true,
      speed: 1,
    });
    setIsPlaying(false);
    setShowCode(false);
    setGeneratedCode(null);
    // 重新初始化管理器
    managerRef.current = new AnimationResourceManager(
      { type: 'lottie', src: '', autoplay: true, loop: true, speed: 1 },
      {
        loaded: (info) => { setFileInfo(info); setLoading(false); },
        lottieInfoParsed: (info) => { setLottieInfo(info); },
        stateChanged: (state) => { setIsPlaying(state === 'playing'); },
        error: (msg) => { message.error(msg); setLoading(false); },
      },
    );
  }, [destroyLottieInstance, destroyPagInstance, destroyRiveInstance, message]);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 上传区域 / 预览区域 */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-3">
        {!fileInfo && !loading ? (
          /* 未加载 — 显示上传区域 */
          <Upload.Dragger
            showUploadList={false}
            accept={getAcceptedExtensions()}
            beforeUpload={(file) => {
              void handleFileUpload(file);
              return false;
            }}
            style={{ padding: '12px 0' }}
          >
            <div className="text-center">
              <UploadOutlined className="text-2xl text-gray-300 mb-2 block" />
              <p className="text-[11px] text-gray-500 mb-1">
                点击或拖拽上传动画文件
              </p>
              <p className="text-[9px] text-gray-300">
                支持 Lottie (.json) · PAG (.pag) · Rive (.riv) · GIF (.gif)
              </p>
            </div>
          </Upload.Dragger>
        ) : loading ? (
          /* 加载中 */
          <div className="flex items-center justify-center py-6">
            <Spin size="small" />
            <span className="ml-2 text-[11px] text-gray-400">加载动画文件…</span>
          </div>
        ) : (
          /* 已加载 — 显示预览 + 播放控制 */
          <div>
            {/* 文件信息栏 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{getAnimationTypeIcon(fileInfo!.type)}</span>
                <span className="text-[11px] font-medium text-gray-700 truncate max-w-[140px]" title={fileInfo!.fileName}>
                  {fileInfo!.fileName}
                </span>
                <Tag color="blue" className="text-[9px] leading-tight" style={{ margin: 0 }}>
                  {getAnimationTypeName(fileInfo!.type)}
                </Tag>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip title="更换文件">
                  <Upload
                    showUploadList={false}
                    accept={getAcceptedExtensions()}
                    beforeUpload={(file) => {
                      void handleFileUpload(file);
                      return false;
                    }}
                  >
                    <Button size="small" type="text" icon={<ReloadOutlined />} />
                  </Upload>
                </Tooltip>
                <Tooltip title="清除">
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={handleClear} />
                </Tooltip>
              </div>
            </div>

            {/* 预览区域 */}
            <div
              className="bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ height: 160, margin: '0 auto', position: 'relative' }}
            >
              {fileInfo!.type === 'lottie' ? (
                <div
                  ref={lottieContainerRef}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : fileInfo!.type === 'gif' ? (
                <img
                  src={config.src}
                  alt="GIF Preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : fileInfo!.type === 'pag' ? (
                <canvas
                  ref={pagCanvasRef}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : fileInfo!.type === 'rive' ? (
                <canvas
                  ref={riveCanvasRef}
                  width={320}
                  height={160}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : null}

              {/* 棋盘格背景 */}
              {!lottieAnimRef.current && fileInfo!.type !== 'gif' && (
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                />
              )}
            </div>

            {/* 播放控制栏 */}
            <div className="flex items-center justify-center gap-1 mt-2">
              <Tooltip title="播放">
                <Button
                  size="small"
                  type={isPlaying ? 'primary' : 'default'}
                  icon={<PlayCircleOutlined />}
                  onClick={handlePlay}
                  disabled={fileInfo!.type === 'gif'}
                />
              </Tooltip>
              <Tooltip title="暂停">
                <Button
                  size="small"
                  icon={<PauseOutlined />}
                  onClick={handlePause}
                  disabled={!isPlaying}
                />
              </Tooltip>
              <Tooltip title="停止">
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  disabled={fileInfo!.type === 'gif'}
                />
              </Tooltip>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <span className="text-[9px] text-gray-400">速度</span>
              <Slider
                min={0.1}
                max={3}
                step={0.1}
                value={config.speed ?? 1}
                onChange={handleSpeedChange}
                style={{ width: 60, margin: '0 4px' }}
                tooltip={{ formatter: (v) => `${v}x` }}
              />
              <span className="text-[10px] text-gray-500 w-6 text-center">{config.speed ?? 1}x</span>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <span className="text-[9px] text-gray-400">循环</span>
              <Switch
                size="small"
                checked={config.loop ?? true}
                onChange={handleLoopChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* 主编辑区域 — 可滚动 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {!fileInfo ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请上传一个动画文件开始编辑"
            style={{ margin: '24px 0' }}
          />
        ) : (
          <>
            {/* 动画元数据 */}
            <Collapse
              size="small"
              defaultActiveKey={['meta', 'lottie-edit']}
              items={[
                /* 元数据面板 */
                {
                  key: 'meta',
                  label: (
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      <InfoCircleOutlined /> 动画信息
                    </span>
                  ),
                  children: (
                    <div className="space-y-1">
                      <MetaRow label="格式" value={getAnimationTypeName(fileInfo.type)} />
                      <MetaRow label="文件名" value={fileInfo.fileName} />
                      <MetaRow label="文件大小" value={formatSize(fileInfo.fileSize)} />
                      {fileInfo.meta && (
                        <>
                          {fileInfo.meta.name && <MetaRow label="名称" value={fileInfo.meta.name} />}
                          {fileInfo.meta.version && <MetaRow label="版本" value={fileInfo.meta.version} />}
                          {fileInfo.meta.width != null && (
                            <MetaRow label="尺寸" value={`${fileInfo.meta.width} × ${fileInfo.meta.height} px`} />
                          )}
                          {fileInfo.meta.frameRate != null && (
                            <MetaRow label="帧率" value={`${fileInfo.meta.frameRate} fps`} />
                          )}
                          {fileInfo.meta.totalFrames != null && (
                            <MetaRow label="总帧数" value={String(fileInfo.meta.totalFrames)} />
                          )}
                          {fileInfo.meta.totalFrames != null && fileInfo.meta.frameRate != null && (
                            <MetaRow
                              label="时长"
                              value={`${(fileInfo.meta.totalFrames / fileInfo.meta.frameRate).toFixed(2)}s`}
                            />
                          )}
                          {fileInfo.meta.layers != null && (
                            <MetaRow label="图层数" value={String(fileInfo.meta.layers)} />
                          )}
                        </>
                      )}
                    </div>
                  ),
                },

                /* Lottie 编辑面板 */
                ...(fileInfo.type === 'lottie' && lottieInfo ? [{
                  key: 'lottie-edit',
                  label: (
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      <EditOutlined /> Lottie 参数编辑
                    </span>
                  ),
                  children: (
                    <div className="space-y-3">
                      {/* 文本替换 */}
                      {lottieInfo.texts.length > 0 && (
                        <div>
                          <span className="text-[10px] font-medium text-gray-500 block mb-1">
                            文字替换 ({lottieInfo.texts.length})
                          </span>
                          <div className="space-y-1.5">
                            {lottieInfo.texts.map((textItem, idx) => (
                              <LottieTextEditor
                                key={idx}
                                layerName={textItem.layerName}
                                text={textItem.text}
                                layerIndex={textItem.layerIndex}
                                onReplace={handleTextReplace}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 颜色替换 */}
                      {lottieInfo.colors.length > 0 && (
                        <div>
                          <span className="text-[10px] font-medium text-gray-500 block mb-1">
                            颜色替换 ({lottieInfo.colors.length})
                          </span>
                          <div className="space-y-1.5">
                            {lottieInfo.colors.map((colorItem, idx) => (
                              <LottieColorEditor
                                key={idx}
                                layerName={colorItem.layerName}
                                path={colorItem.path}
                                color={colorItem.color}
                                onReplace={handleColorReplace}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {lottieInfo.texts.length === 0 && lottieInfo.colors.length === 0 && (
                        <div className="text-[10px] text-gray-400 text-center py-2">
                          该 Lottie 文件没有可编辑的文本或颜色图层
                        </div>
                      )}
                    </div>
                  ),
                }] : []),

                /* 播放参数 */
                {
                  key: 'playback',
                  label: <span className="text-[11px] font-medium">播放参数</span>,
                  children: (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-12 shrink-0">自动播放</span>
                        <Switch
                          size="small"
                          checked={config.autoplay ?? true}
                          onChange={(v) => {
                            setConfig((prev) => ({ ...prev, autoplay: v }));
                            managerRef.current?.setAutoplay(v);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-12 shrink-0">循环播放</span>
                        <Switch
                          size="small"
                          checked={config.loop ?? true}
                          onChange={handleLoopChange}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-12 shrink-0">播放速度</span>
                        <InputNumber
                          size="small"
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={config.speed ?? 1}
                          onChange={(v) => v != null && handleSpeedChange(v)}
                          style={{ flex: 1 }}
                          suffix="x"
                        />
                      </div>
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
                onClick={handleGenerateCode}
              >
                生成代码
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

            {/* 代码输出 */}
            {showCode && generatedCode && (
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-500">导出代码</span>
                  <div className="flex gap-1">
                    <Tooltip title="复制代码">
                      <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => void handleCopyCode()} />
                    </Tooltip>
                    <Button size="small" type="text" onClick={() => setShowCode(false)}>
                      ✕
                    </Button>
                  </div>
                </div>

                {generatedCode.dependencies.length > 0 && (
                  <div className="text-[9px] text-gray-400 mb-1">
                    依赖: {generatedCode.dependencies.map((d) => (
                      <Tag key={d} className="text-[9px]" style={{ margin: '0 2px' }}>{d}</Tag>
                    ))}
                  </div>
                )}

                <pre className="bg-gray-900 text-green-300 p-2 rounded text-[10px] overflow-x-auto whitespace-pre font-mono max-h-48 overflow-y-auto">
                  {`<!-- HTML -->\n${generatedCode.html}\n\n// JavaScript\n${generatedCode.js}`}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== 子组件：元数据行 =====

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 w-12 shrink-0">{label}</span>
      <span className="text-[10px] text-gray-600 truncate" title={value}>{value}</span>
    </div>
  );
}

// ===== 子组件：Lottie 文本编辑器 =====

function LottieTextEditor({
  layerName,
  text,
  layerIndex,
  onReplace,
}: {
  layerName: string;
  text: string;
  layerIndex: number;
  onReplace: (layerIndex: number, newText: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState(text);

  const handleSave = useCallback(async () => {
    if (newText !== text) {
      await onReplace(layerIndex, newText);
    }
    setEditing(false);
  }, [newText, text, layerIndex, onReplace]);

  return (
    <div className="bg-white border border-gray-100 rounded p-1.5 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-400 truncate" title={layerName}>
          📝 {layerName}
        </span>
        {!editing && (
          <Tooltip title="编辑文字">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
              className="text-[10px]"
            />
          </Tooltip>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            size="small"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
            onPressEnter={() => void handleSave()}
          />
          <Button size="small" type="primary" onClick={() => void handleSave()}>
            保存
          </Button>
          <Button size="small" onClick={() => { setEditing(false); setNewText(text); }}>
            取消
          </Button>
        </div>
      ) : (
        <div className="text-[10px] text-gray-600 bg-gray-50 rounded px-1.5 py-0.5 truncate">
          {text}
        </div>
      )}
    </div>
  );
}

// ===== 子组件：Lottie 颜色编辑器 =====

function LottieColorEditor({
  layerName,
  path,
  color,
  onReplace,
}: {
  layerName: string;
  path: string;
  color: [number, number, number, number];
  onReplace: (path: string, newColorHex: string) => Promise<void>;
}) {
  const hexColor = useMemo(() => lottieColorToHex(color), [color]);

  const handleChange = useCallback((newColor: Color) => {
    const hex = newColor.toHexString();
    void onReplace(path, hex);
  }, [path, onReplace]);

  return (
    <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded p-1.5">
      <ColorPicker
        size="small"
        value={hexColor}
        onChange={handleChange}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-gray-400 truncate" title={layerName}>
          🎨 {layerName}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">{hexColor}</div>
      </div>
    </div>
  );
}
