import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Operation } from '@globallink/design-operations';
import type { ComponentEvent } from '@globallink/design-schema';
import { generateNodeId } from '@globallink/design-schema';
import * as api from '../api-client.js';
import { makeToolError } from './helpers/toolResponse.js';

/** 与当前编辑器主色（Ant Design Primary）一致的默认主按钮样式体系 */
const PRIMARY_DEFAULT_STYLES = {
  backgroundColor: '#1677ff',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 15px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  lineHeight: '1.5715',
  minWidth: '88px',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  boxShadow: 'none',
  transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
};

const STATE_TRANSITION = { duration: 200, easing: 'ease', properties: ['background-color', 'box-shadow', 'transform'] };

/**
 * 高阶组件配方：一次 batch 插入主按钮 + hover / pressed / focus 视觉态 + 预览用事件
 * （使用 v2 op 名 element.add / visualState.add / event.add，actions 使用 v2 动词 node.setVisualState）。
 */
export function registerComponentRecipeTools(server: McpServer): void {
  server.registerTool(
    'create_primary_button',
    {
      description:
        '⚠️ 仅用于【从零创建】新的纯色主按钮。如果目标按钮已经存在（如已有素材按钮需要加状态），请用 visual_state 工具的 add/update/reset_style 操作。\n\n在指定父节点下创建「主按钮」: 默认/hover/pressed/focus 视觉状态（配色对齐编辑器 #1677ff 体系，纯色填充），并绑定 hover·focus·blur 的 node.setVisualState 便于画布预览。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        parentId: z.string().describe('父节点 ID（如 screen.rootNode）'),
        label: z.string().optional().describe('按钮文案，默认「按钮」'),
        variant: z
          .enum(['solid', 'outline'])
          .optional()
          .describe('solid=填充主色；outline=描边主色透明底'),
      },
    },
    async ({ projectId, parentId, label, variant }) => {
      try {
        const btnId = generateNodeId();
        const text = label ?? '按钮';
        const isOutline = variant === 'outline';

        const base = isOutline
          ? {
              ...PRIMARY_DEFAULT_STYLES,
              backgroundColor: 'transparent',
              color: '#1677ff',
              border: '1px solid #1677ff',
              boxShadow: 'none',
            }
          : { ...PRIMARY_DEFAULT_STYLES };

        const hoverStyles = isOutline
          ? {
              backgroundColor: 'rgba(22, 119, 255, 0.06)',
              color: '#4096ff',
              borderColor: '#4096ff',
            }
          : { backgroundColor: '#4096ff' };

        const pressedStyles = isOutline
          ? {
              backgroundColor: 'rgba(22, 119, 255, 0.15)',
              color: '#0958d9',
              borderColor: '#0958d9',
              transform: 'scale(0.98)',
            }
          : { backgroundColor: '#0958d9', transform: 'scale(0.98)' };

        const focusStyles = {
          boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px rgba(22, 119, 255, 0.24)',
        };

        const hoverIn: ComponentEvent = {
          trigger: 'hover',
          description: '悬停 → hover 态（mouseleave 由预览引擎还原为 default）',
          actions: [{ type: 'node.setVisualState', nodeId: btnId, state: 'hover' }],
        };
        const focusIn: ComponentEvent = {
          trigger: 'focus',
          description: '聚焦 → focus 态',
          actions: [{ type: 'node.setVisualState', nodeId: btnId, state: 'focus' }],
        };
        const blurOut: ComponentEvent = {
          trigger: 'blur',
          description: '失焦 → default',
          actions: [{ type: 'node.setVisualState', nodeId: btnId, state: 'default' }],
        };

        const operations: Operation[] = [
          {
            type: 'element.add',
            params: {
              parentId,
              tag: 'button',
              elementId: btnId,
              props: { textContent: text },
              styles: base,
            },
          },
          {
            type: 'visualState.add',
            params: {
              nodeId: btnId,
              stateName: 'hover',
              styles: hoverStyles,
              transition: STATE_TRANSITION,
            },
          },
          {
            type: 'visualState.add',
            params: {
              nodeId: btnId,
              stateName: 'pressed',
              styles: pressedStyles,
              transition: { duration: 120, easing: 'ease-out', properties: ['background-color', 'transform'] },
            },
          },
          {
            type: 'visualState.add',
            params: {
              nodeId: btnId,
              stateName: 'focus',
              styles: focusStyles,
              transition: STATE_TRANSITION,
            },
          },
          { type: 'event.add', params: { nodeId: btnId, event: hoverIn } },
          { type: 'event.add', params: { nodeId: btnId, event: focusIn } },
          { type: 'event.add', params: { nodeId: btnId, event: blurOut } },
        ];

        const result = await api.executeBatch(projectId, operations);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  nodeId: btnId,
                  message: '主按钮已创建：含 hover / pressed(CSS :active) / focus 视觉态与预览事件',
                  batchResult: result,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return makeToolError('create_primary_button', undefined, err);
      }
    },
  );
}
