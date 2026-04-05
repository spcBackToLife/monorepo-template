import type { Viewport } from '@globallink/design-schema';

/**
 * 程序化预览控制器（MCP / 自动化测试等）。
 * Phase 8：对齐数据源阶段、领域态、环境态。
 */
export interface PreviewControllerCallbacks {
  enterPreview: () => void;
  exitPreview: () => void;
  navigateTo: (screenId: string) => void;
  navigateBack: () => void;
  switchViewport: (viewport: Viewport) => void;
  /** 切换指定屏幕上某数据源的生命周期阶段 */
  switchDataSourcePhase: (screenId: string, dataSourceId: string, phase: string) => void;
  /** 切换数据源内的数据场景 */
  switchDataScenario: (screenId: string, dataSourceId: string, scenarioId: string) => void;
  /** 领域态预览值（与 resolve 使用的 globalStates 表一致） */
  setDomainState: (variableName: string, value: string) => void;
  /** 环境态预览值 */
  setEnvironmentState: (variableName: string, value: string) => void;
  toggleDeviceFrame: (show: boolean) => void;
}

export class PreviewController {
  constructor(private readonly callbacks: PreviewControllerCallbacks) {}

  enter(): void {
    this.callbacks.enterPreview();
  }

  exit(): void {
    this.callbacks.exitPreview();
  }

  navigateTo(screenId: string): void {
    this.callbacks.navigateTo(screenId);
  }

  back(): void {
    this.callbacks.navigateBack();
  }

  switchViewport(viewport: Viewport): void {
    this.callbacks.switchViewport(viewport);
  }

  switchDataSourcePhase(screenId: string, dataSourceId: string, phase: string): void {
    this.callbacks.switchDataSourcePhase(screenId, dataSourceId, phase);
  }

  switchDataScenario(screenId: string, dataSourceId: string, scenarioId: string): void {
    this.callbacks.switchDataScenario(screenId, dataSourceId, scenarioId);
  }

  setDomainState(variableName: string, value: string): void {
    this.callbacks.setDomainState(variableName, value);
  }

  setEnvironmentState(variableName: string, value: string): void {
    this.callbacks.setEnvironmentState(variableName, value);
  }

  showDeviceFrame(show: boolean): void {
    this.callbacks.toggleDeviceFrame(show);
  }
}
