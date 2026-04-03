import type { Viewport } from '@globallink/design-schema';

/**
 * W8-100：程序化预览控制器。
 * 用于 MCP / AI 自动化测试等场景，通过回调驱动宿主编辑器状态。
 */
export interface PreviewControllerCallbacks {
  enterPreview: () => void;
  exitPreview: () => void;
  navigateTo: (screenId: string) => void;
  navigateBack: () => void;
  switchViewport: (viewport: Viewport) => void;
  setGlobalState: (variableName: string, value: string) => void;
  switchDataSet: (screenId: string, dataSetId: string) => void;
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

  setGlobalState(variableName: string, value: string): void {
    this.callbacks.setGlobalState(variableName, value);
  }

  switchDataSet(screenId: string, dataSetId: string): void {
    this.callbacks.switchDataSet(screenId, dataSetId);
  }

  showDeviceFrame(show: boolean): void {
    this.callbacks.toggleDeviceFrame(show);
  }
}
