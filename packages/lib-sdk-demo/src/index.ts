export enum SomeFeatureMode {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

export interface SomeFeatureConfig {
  mode: SomeFeatureMode;
}

export function getSomeFeatureLabel(config: SomeFeatureConfig): string {
  return config.mode === SomeFeatureMode.Enabled ? 'on' : 'off';
}
