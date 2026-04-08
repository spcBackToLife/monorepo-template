import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/** Extract path segments from a resource URI */
function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Material Editor MCP Resources — 素材编辑器资源注册
 *
 * 提供 3 类 MCP Resource：
 *
 * 1. material-project://{projectId}/{materialId?}
 *    获取素材编辑器工程数据（画布状态、图层列表、工程文件等）
 *
 * 2. material-presets://all
 *    获取所有素材编辑器预设（渐变、动画、纹理、阴影）
 *
 * 3. material-capabilities://list
 *    获取素材编辑器能力清单（所有可用操作及其参数说明）
 */
export function registerMaterialResources(server: McpServer): void {
  // Resource: 素材编辑器工程数据
  server.resource(
    'material-project/{projectId}',
    'material-project://{projectId}',
    {
      description:
        '获取素材编辑器的工程数据：画布尺寸、参考框信息、图层列表、缩放级别、背景色等完整状态',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // material-project://{projectId} → segments = ["<projectId>"]
      // material-project://{projectId}/{materialId} → segments = ["<projectId>", "<materialId>"]
      const projectId = segments[0] ?? '';
      const materialId = segments[1];
      const project = await api.getMaterialEditorProject(projectId, materialId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    },
  );

  // Resource: 素材编辑器预设合集
  server.resource(
    'material-presets',
    'material-presets://all',
    {
      description:
        '获取素材编辑器的所有预设数据：渐变预设(gradients)、动画预设(animations)、纹理预设(textures)、阴影预设(shadows)。可用于 me_set_linear_gradient、me_generate_animation_css 等工具的参数。',
      mimeType: 'application/json',
    },
    async (uri) => {
      const presets = await api.getMaterialEditorPresets();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(presets, null, 2),
          },
        ],
      };
    },
  );

  // Resource: 素材编辑器能力清单
  server.resource(
    'material-capabilities',
    'material-capabilities://list',
    {
      description:
        '获取素材编辑器的完整能力清单：所有可用操作（action）名称、参数说明、返回值说明。帮助 AI 了解如何使用 me_* 系列工具。',
      mimeType: 'application/json',
    },
    async (uri) => {
      const capabilities = await api.getMaterialEditorCapabilities();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(capabilities, null, 2),
          },
        ],
      };
    },
  );
}
