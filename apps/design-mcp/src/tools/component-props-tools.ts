import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Task 4.7.2 — Component Props MCP Tools
 *
 * Tools for managing component templates and props:
 * - get_template_props
 * - update_component_props
 * - list_element_props
 */

interface DesignProject {
  id: string;
  templates?: Array<{
    id: string;
    name: string;
    rootNode: unknown;
    propDefinitions: Record<string, {
      type: string;
      defaultValue?: unknown;
      description?: string;
    }>;
  }>;
}

export function registerComponentPropsTools(server: McpServer): void {
  server.registerTool(
    'get_template_props',
    {
      description:
        '获取指定组件模板的属性定义（propDefinitions）。返回每个属性的类型、默认值和描述。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        templateId: z.string().describe('模板 ID'),
      },
    },
    async ({ projectId, templateId }) => {
      const project = (await api.getProject(projectId)) as DesignProject;
      const template = project.templates?.find((t) => t.id === templateId);
      if (!template) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Template ${templateId} not found` }),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                templateId: template.id,
                name: template.name,
                propDefinitions: template.propDefinitions,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'update_component_props',
    {
      description:
        '更新指定节点的组件属性值。可一次更新多个属性。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        props: z.record(z.string(), z.unknown()).describe('属性键值对'),
      },
    },
    async ({ projectId, nodeId, props }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateComponentProps',
        params: { nodeId, props },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'list_element_props',
    {
      description:
        '列出指定元素类型的可用属性定义（来自 ElementPropRegistry）。返回每个属性的类型和描述。',
      inputSchema: {
        elementType: z
          .string()
          .describe(
            '元素类型（如 div, button, input, img, a 等）',
          ),
      },
    },
    async ({ elementType }) => {
      // Return known prop registries for common element types
      const registry: Record<string, Record<string, { type: string; description: string }>> = {
        div: {
          textContent: { type: 'string', description: '文本内容' },
        },
        button: {
          textContent: { type: 'string', description: '按钮文本' },
          disabled: { type: 'boolean', description: '是否禁用' },
        },
        input: {
          placeholder: { type: 'string', description: '占位符文本' },
          type: { type: 'string', description: '输入类型 (text/password/email/number)' },
          disabled: { type: 'boolean', description: '是否禁用' },
          value: { type: 'string', description: '默认值' },
        },
        textarea: {
          placeholder: { type: 'string', description: '占位符文本' },
          rows: { type: 'number', description: '行数' },
          disabled: { type: 'boolean', description: '是否禁用' },
        },
        img: {
          src: { type: 'string', description: '图片地址' },
          alt: { type: 'string', description: '替代文本' },
        },
        a: {
          href: { type: 'string', description: '链接地址' },
          target: { type: 'string', description: '打开方式 (_blank/_self)' },
          textContent: { type: 'string', description: '链接文本' },
        },
        select: {
          disabled: { type: 'boolean', description: '是否禁用' },
        },
        video: {
          src: { type: 'string', description: '视频地址' },
          autoplay: { type: 'boolean', description: '自动播放' },
          controls: { type: 'boolean', description: '显示控制栏' },
        },
      };

      const props = registry[elementType];
      if (!props) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                elementType,
                props: {},
                note: `No specific prop registry for "${elementType}". Common props like textContent, className are available for all elements.`,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ elementType, props }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'add_prop_definition',
    {
      description: '为组件模板添加属性定义',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        templateId: z.string().describe('模板 ID'),
        definition: z.record(z.string(), z.unknown()).describe('属性定义对象'),
      },
    },
    async ({ projectId, templateId, definition }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addPropDefinition',
        params: { templateId, definition },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_prop_definition',
    {
      description: '删除组件模板上的属性定义',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        templateId: z.string().describe('模板 ID'),
        propKey: z.string().describe('属性键名'),
      },
    },
    async ({ projectId, templateId, propKey }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removePropDefinition',
        params: { templateId, propKey },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
