export interface FeatureTemplateOptions {
  enable?: boolean;
}

export function helloFeatureTemplate(options: FeatureTemplateOptions = {}): string {
  const enabled = options.enable ?? true;
  return enabled ? 'feature-template-enabled' : 'feature-template-disabled';
}
