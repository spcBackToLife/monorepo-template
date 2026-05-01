/**
 * 组件属性 — 合并原 5 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

const PROP_REGISTRY: Record<string, Record<string, { type:string; description:string }>> = {
  div:       { textContent: { type:'string', description:'文本内容' } },
  button:    { textContent: { type:'string', description:'按钮文本' }, disabled: { type:'boolean', description:'是否禁用' } },
  input:     { placeholder: { type:'string', description:'占位符' }, type: { type:'string', description:'输入类型' }, disabled: { type:'boolean', description:'是否禁用' }, value: { type:'string', description:'受控值' } },
  textarea:  { placeholder: { type:'string', description:'占位符' }, rows: { type:'number', description:'行数' }, disabled: { type:'boolean', description:'是否禁用' } },
  img:       { src: { type:'string', description:'图片地址' }, alt: { type:'string', description:'替代文本' } },
  a:         { href: { type:'string', description:'链接地址' }, target: { type:'string', description:'打开方式（如 _blank）' }, textContent: { type:'string', description:'链接文本' } },
  select:    { disabled: { type:'boolean', description:'是否禁用' } },
  video:     { src: { type:'string', description:'视频地址' }, autoplay: { type:'boolean', description:'是否自动播放' }, controls: { type:'boolean', description:'是否显示控件' } },
};

export function registerComponentPropsTools(server: McpServer): void {
  registerDomainTool(server, 'component_prop', '组件模板属性定义、实例属性更新、元素属性查询与定义 CRUD', {
    get_template_props: defineAction({
      description: '获取指定组件模板的属性定义（propDefinitions）',
      schema: z.object({ projectId: z.string(), templateId: z.string() }),
      handler: async (p) => {
        const proj = await apiClient.getProject(p.projectId);
        // 后端返回的 componentAssets 即模板列表
        const tpl = proj.componentAssets?.find((t) => t.id === p.templateId);
        if (!tpl) return { content: [{ type:'text', text: JSON.stringify({error:`not found`}) }] };
        return { content: [{ type:'text', text: JSON.stringify({ templateId:tpl.id, name:tpl.name, propDefinitions:tpl.propDefinitions }, null, 2) }] };
      },
    }),
    update_props: defineAction({
      description: '更新指定节点的组件属性值，可一次更新多个',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), props: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'updateComponentProps', params: { nodeId:p.nodeId, props:p.props } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    list_element_props: defineAction({
      description: '列出元素类型的可用属性（来自 ElementPropRegistry）',
      schema: z.object({ elementType: z.string().describe('如 div/button/input/img/a') }),
      handler: async (p) => {
        const reg = PROP_REGISTRY[p.elementType];
        if (!reg) return { content: [{ type:'text', text: JSON.stringify({ elementType: p.elementType, props:{}, note:`无特殊注册` }, null, 2) }] };
        return { content: [{ type:'text', text: JSON.stringify({ elementType: p.elementType, props: reg }, null, 2) }] };
      },
    }),
    add_prop_def: defineAction({
      description: '为组件模板添加属性定义',
      schema: z.object({ projectId: z.string(), templateId: z.string(), definition: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'addPropDefinition', params: { templateId: p.templateId, definition: p.definition } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove_prop_def: defineAction({
      description: '删除组件模板上的属性定义',
      schema: z.object({ projectId: z.string(), templateId: z.string(), propKey: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'removePropDefinition', params: { templateId: p.templateId, propKey: p.propKey } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
