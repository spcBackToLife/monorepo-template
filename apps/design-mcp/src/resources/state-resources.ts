import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Resources（v2）：
 *   - state://screen/{projectId}/{screenId}  屏幕的 stateInit（view 变量 + data 初值）
 *   - state://project/{projectId}            项目级 stateInit.view（所有屏幕共享 view 变量）
 *
 * 取代 v1 的 domainstates:// 与 environmentstates://（v1 概念已删除）。
 */
export function registerStateResources(server: McpServer): void {
  // 屏幕级 stateInit
  server.resource(
    'state/screen/{projectId}/{screenId}',
    'state://screen/{projectId}/{screenId}',
    {
      description: '指定屏幕的 stateInit（v2：view 变量定义 + data 初始值）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const screenId = segments[2] ?? '';
      const project = await api.getProject(projectId);
      const screen = project.screens.find((s) => s.id === screenId);
      const content = screen
        ? {
            screenId: screen.id,
            screenName: screen.name,
            stateInit: screen.stateInit ?? { view: {}, data: {} },
          }
        : { error: `Screen ${screenId} not found` };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    },
  );

  // 项目级 globalStateInit.view（全局共享 view 变量）
  server.resource(
    'state/project/{projectId}',
    'state://project/{projectId}',
    {
      description: '项目级 globalStateInit.view（所有屏幕共享的 view 变量；不含 data，data 是屏幕级）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const project = await api.getProject(projectId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              { projectId, globalState: project.globalStateInit ?? { view: {} } },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
