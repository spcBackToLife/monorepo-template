/**
 * @globallink/codegen-template-react
 *
 * React 功能模块化模板框架
 * - Folder/index.tsx + index.less 组织方式
 * - Vite + React 18 + TypeScript + Less
 * - react-router-dom v6
 * - Axios HTTP client
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');

export const templateMeta = {
  name: 'react-feature-modular',
  description: 'React 功能模块化，Folder/index.tsx + index.less 组织方式',
  adapter: 'react',
  frameworkYamlPath: resolve(packageRoot, 'framework.yaml'),
  scaffoldDir: resolve(packageRoot, 'scaffold'),
  patternsDir: resolve(packageRoot, 'patterns'),
  splittingDir: resolve(packageRoot, 'splitting'),
};
