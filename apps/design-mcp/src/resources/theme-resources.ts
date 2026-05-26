import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Theme Resource：AI 在开始设计前读取此 Resource 了解项目主题约束。
 *
 * URI: theme://project/{projectId}
 */
export function registerThemeResources(server: McpServer): void {
  server.resource(
    'theme/project/{projectId}',
    'theme://project/{projectId}',
    {
      description: '获取项目的完整主题配置（ThemeConfig），包含 Design Token、风格意图、装饰规则、组件状态规范、主题变体。AI 设计时必须参考此配置使用 $token:xxx 引用。',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const theme = await api.getTheme(projectId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(theme ?? { error: '项目无主题配置' }, null, 2),
          },
        ],
      };
    },
  );
}
