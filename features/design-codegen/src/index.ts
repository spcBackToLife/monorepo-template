import { DESIGN_SCHEMA_VERSION } from '@globallink/design-schema';

/** Phase 5 将在此实现代码生成插件与调度。 */
export function getCodegenSchemaVersion(): string {
  return DESIGN_SCHEMA_VERSION;
}
