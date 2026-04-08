import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Material Editor MCP Tools — 素材编辑器完整操作集（v2 操作系统）
 *
 * v2 改造核心变化：
 *   - 所有画布操作走 executeMaterialOperation()，发送类型化 MaterialOperation
 *   - 后端是数据唯一真相来源（MCP 不再依赖前端在线）
 *   - 每个操作都需要 materialId（素材工程 ID）
 *
 * 按能力域分组：
 *
 * === 素材库管理 ===
 *   search_materials / upload_material / get_material / update_material_meta
 *
 * === 素材画布 · Schema 与信息 ===
 *   me_get_schema / me_get_canvas_info
 *
 * === 素材画布 · 画布管理 ===
 *   me_set_background_color / me_resize_canvas / me_resize_reference_frame
 *
 * === 素材画布 · 对象操作 ===
 *   me_add_object / me_remove_object / me_update_object / me_duplicate_object
 *   me_reorder_object / me_set_visibility / me_set_lock / me_rename_object
 *
 * === 素材画布 · 样式 ===
 *   me_set_fill / me_set_stroke / me_set_opacity / me_set_shadow / me_set_blend_mode
 *
 * === 素材画布 · 组操作 ===
 *   me_group_objects / me_ungroup_objects
 *
 * === 素材画布 · 文字 ===
 *   me_update_text
 *
 * === 素材画布 · 撤销/重做 ===
 *   me_undo / me_redo
 *
 * === CSS 工具（纯计算，无需画布） ===
 *   me_generate_gradient_css / me_generate_shadow_css / me_generate_filter_css
 *   me_generate_animation_css
 *
 * === 预设查询 ===
 *   me_list_presets
 *
 * === 设计 Schema 集成 ===
 *   me_apply_material_design
 */
export function registerMaterialTools(server: McpServer): void {

  // ╔══════════════════════════════════════════════╗
  // ║  素材库管理                                    ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'search_materials',
    {
      description:
        '搜索项目素材库中的素材资源。支持按分类和关键词过滤，返回匹配的素材列表（含 URL、缩略图、分类、标签等）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        category: z
          .enum(['image', 'icon', 'animation', 'video', 'other'])
          .optional()
          .describe('按分类过滤'),
        search: z.string().optional().describe('关键词搜索（匹配文件名和标签）'),
      },
    },
    async ({ projectId, category, search }) => {
      const result = await api.searchMaterials(projectId, { category, search });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'upload_material',
    {
      description:
        '将素材上传到项目素材库。通过提供素材 URL 地址上传，上传后可在素材库中检索和使用。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        url: z.string().describe('素材文件 URL（HTTP/HTTPS）'),
        name: z.string().optional().describe('素材名称'),
        category: z.enum(['image', 'icon', 'animation', 'video', 'other']).optional().describe('素材分类'),
        tags: z.array(z.string()).optional().describe('标签列表'),
      },
    },
    async ({ projectId, url: materialUrl, name, category, tags }) => {
      try {
        const response = await fetch(materialUrl);
        if (!response.ok) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `无法下载素材: HTTP ${response.status}` }) }], isError: true };
        }
        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        const buffer = Buffer.from(await response.arrayBuffer());
        const urlPath = new URL(materialUrl).pathname;
        const originalName = name ?? urlPath.split('/').pop() ?? 'uploaded-material';
        const formData = new FormData();
        const blob = new Blob([buffer], { type: contentType });
        formData.append('file', blob, originalName);
        const BASE_URL = process.env.DESIGN_API_URL ?? 'http://localhost:3001';
        const uploadRes = await fetch(`${BASE_URL}/api/projects/${projectId}/materials/upload`, { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `上传失败: ${errText}` }) }], isError: true };
        }
        const uploadResult = await uploadRes.json();
        if (tags || category) {
          const materialId = (uploadResult as Record<string, string>).id;
          if (materialId) {
            await api.updateMaterialMeta(projectId, materialId, { ...(category ? { category } : {}), ...(tags ? { tags } : {}) });
          }
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(uploadResult, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `上传失败: ${err instanceof Error ? err.message : String(err)}` }) }], isError: true };
      }
    },
  );

  server.registerTool(
    'get_material',
    {
      description: '获取素材的详细信息（URL、缩略图、元数据、标签等）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材 ID'),
      },
    },
    async ({ projectId, materialId }) => {
      const result = await api.getMaterial(projectId, materialId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'update_material_meta',
    {
      description: '更新素材的元数据（名称、分类、标签）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材 ID'),
        originalName: z.string().optional().describe('新名称'),
        category: z.string().optional().describe('新分类'),
        tags: z.array(z.string()).optional().describe('新标签列表'),
      },
    },
    async ({ projectId, materialId, originalName, category, tags }) => {
      const result = await api.updateMaterialMeta(projectId, materialId, { originalName, category, tags });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · Schema 与信息                       ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_get_schema',
    {
      description: '获取素材工程的完整 Schema（对象列表、画布设置、版本信息等）。这是理解画布当前状态的首要工具。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
      },
    },
    async ({ projectId, materialId }) => {
      const result = await api.getMaterialSchema(projectId, materialId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 画布管理                            ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_set_background_color',
    {
      description: '设置素材画布的背景色。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        color: z.string().describe('CSS 颜色值（如 #ffffff、rgba(0,0,0,0.5)、transparent）'),
      },
    },
    async ({ projectId, materialId, color }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setBackgroundColor',
        params: { color },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_resize_canvas',
    {
      description: '调整素材画布尺寸。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        width: z.number().positive().describe('新宽度（px）'),
        height: z.number().positive().describe('新高度（px）'),
      },
    },
    async ({ projectId, materialId, width, height }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:resizeCanvas',
        params: { width, height },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_resize_reference_frame',
    {
      description: '调整素材画布的参考框（裁切区域）尺寸。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        width: z.number().positive().describe('参考框宽度（px）'),
        height: z.number().positive().describe('参考框高度（px）'),
        enabled: z.boolean().optional().describe('是否启用参考框（默认 true）'),
      },
    },
    async ({ projectId, materialId, width, height, enabled }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:resizeReferenceFrame',
        params: { width, height, enabled },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 对象操作                            ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_add_object',
    {
      description:
        '在素材画布上添加对象：矩形(rect)、椭圆(ellipse)、多边形(polygon)、星形(star)、路径(path)、线段(line)、文字(textbox)、图片(image)。可指定位置、尺寸、填充、描边等属性。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        type: z.enum(['rect', 'ellipse', 'polygon', 'star', 'path', 'line', 'textbox', 'image']).describe('对象类型'),
        name: z.string().optional().describe('对象名称'),
        x: z.number().optional().describe('X 坐标'),
        y: z.number().optional().describe('Y 坐标'),
        width: z.number().optional().describe('宽度'),
        height: z.number().optional().describe('高度'),
        fill: z.string().optional().describe('填充颜色（CSS 格式）'),
        stroke: z.string().optional().describe('描边颜色'),
        strokeWidth: z.number().optional().describe('描边宽度'),
        opacity: z.number().optional().describe('透明度（0~1）'),
        rotation: z.number().optional().describe('旋转角度（度）'),
        // 形状特定属性
        rx: z.number().optional().describe('圆角 X（rect）'),
        ry: z.number().optional().describe('圆角 Y（rect）'),
        sides: z.number().optional().describe('边数（polygon，默认 6）'),
        points: z.number().optional().describe('角数（star，默认 5）'),
        innerRatio: z.number().optional().describe('内径比（star，0.1~0.9）'),
        pathData: z.string().optional().describe('SVG path d 属性字符串（path 类型必须）'),
        // 文字属性
        text: z.string().optional().describe('文字内容（textbox 类型）'),
        fontSize: z.number().optional().describe('字号'),
        fontFamily: z.string().optional().describe('字体'),
        fontWeight: z.union([z.string(), z.number()]).optional().describe('字重'),
        textAlign: z.enum(['left', 'center', 'right']).optional().describe('对齐方式'),
        // 图片属性
        src: z.string().optional().describe('图片 URL（image 类型必须）'),
      },
    },
    async ({ projectId, materialId, ...objectProps }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:addObject',
        params: { object: objectProps },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_remove_object',
    {
      description: '删除指定对象。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('要删除的对象 ID'),
      },
    },
    async ({ projectId, materialId, objectId }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:removeObject',
        params: { objectId },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_update_object',
    {
      description:
        '更新指定对象的属性（位置、尺寸、缩放、旋转、填充、描边等）。传入需要更新的属性键值对。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('目标对象 ID'),
        updates: z.record(z.string(), z.unknown()).describe('要更新的属性键值对，如 { "x": 100, "y": 50, "fill": "#ff0000", "rotation": 45 }'),
      },
    },
    async ({ projectId, materialId, objectId, updates }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:updateObject',
        params: { objectId, updates },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_duplicate_object',
    {
      description: '复制指定对象（含所有属性），偏移放置。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('要复制的对象 ID'),
        offsetX: z.number().optional().describe('X 偏移量（默认 20）'),
        offsetY: z.number().optional().describe('Y 偏移量（默认 20）'),
      },
    },
    async ({ projectId, materialId, objectId, offsetX, offsetY }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:duplicateObject',
        params: { objectId, offsetX, offsetY },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_reorder_object',
    {
      description: '调整对象在图层列表中的位置。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        newIndex: z.number().describe('新的图层索引（0 = 最底层）'),
      },
    },
    async ({ projectId, materialId, objectId, newIndex }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:reorderObject',
        params: { objectId, newIndex },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_visibility',
    {
      description: '设置对象的可见性。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        visible: z.boolean().describe('是否可见'),
      },
    },
    async ({ projectId, materialId, objectId, visible }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setVisibility',
        params: { objectId, visible },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_lock',
    {
      description: '设置对象的锁定状态（锁定后不可选中/移动）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        locked: z.boolean().describe('是否锁定'),
      },
    },
    async ({ projectId, materialId, objectId, locked }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setLock',
        params: { objectId, locked },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_rename_object',
    {
      description: '重命名指定对象。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        name: z.string().describe('新名称'),
      },
    },
    async ({ projectId, materialId, objectId, name }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:renameObject',
        params: { objectId, name },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 样式                                ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_set_fill',
    {
      description: '设置对象的填充颜色（支持纯色和渐变）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        fill: z.string().describe('CSS 颜色值'),
      },
    },
    async ({ projectId, materialId, objectId, fill }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setFill',
        params: { objectId, fill },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_stroke',
    {
      description: '设置对象的描边颜色和宽度。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        color: z.string().optional().describe('描边颜色'),
        width: z.number().optional().describe('描边宽度'),
      },
    },
    async ({ projectId, materialId, objectId, color, width }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setStroke',
        params: { objectId, color, width },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_opacity',
    {
      description: '设置对象的透明度。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        opacity: z.number().min(0).max(1).describe('透明度（0=完全透明, 1=不透明）'),
      },
    },
    async ({ projectId, materialId, objectId, opacity }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setOpacity',
        params: { objectId, opacity },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_shadow',
    {
      description: '为对象设置或移除阴影。传空对象 {} 移除阴影。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        shadow: z.object({
          color: z.string().optional().describe('阴影颜色（默认 rgba(0,0,0,0.3)）'),
          blur: z.number().optional().describe('模糊半径（默认 10）'),
          offsetX: z.number().optional().describe('X 偏移（默认 4）'),
          offsetY: z.number().optional().describe('Y 偏移（默认 4）'),
        }).nullable().describe('阴影配置，传 null 移除阴影'),
      },
    },
    async ({ projectId, materialId, objectId, shadow }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setShadow',
        params: { objectId, shadow },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_set_blend_mode',
    {
      description:
        '设置对象的混合模式。支持 16 种 CSS 混合模式。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('对象 ID'),
        mode: z.enum([
          'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
          'color-dodge', 'color-burn', 'hard-light', 'soft-light',
          'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
        ]).describe('混合模式'),
      },
    },
    async ({ projectId, materialId, objectId, mode }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:setBlendMode',
        params: { objectId, blendMode: mode },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 组操作                              ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_group_objects',
    {
      description: '将多个对象编为一组。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectIds: z.array(z.string()).min(2).describe('要编组的对象 ID 列表（至少 2 个）'),
        groupName: z.string().optional().describe('组名称'),
      },
    },
    async ({ projectId, materialId, objectIds, groupName }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:groupObjects',
        params: { objectIds, groupName },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_ungroup_objects',
    {
      description: '解散指定的组。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        groupId: z.string().describe('要解散的组 ID'),
      },
    },
    async ({ projectId, materialId, groupId }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:ungroupObjects',
        params: { groupId },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 文字操作                            ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_update_text',
    {
      description: '更新文字对象的内容和属性（字号、字体、字重、对齐等）。仅对 textbox 类型的对象有效。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        objectId: z.string().describe('文字对象 ID'),
        text: z.string().optional().describe('新文字内容'),
        fontSize: z.number().optional().describe('字号'),
        fontFamily: z.string().optional().describe('字体'),
        fontWeight: z.union([z.string(), z.number()]).optional().describe('字重'),
        textAlign: z.enum(['left', 'center', 'right']).optional().describe('对齐方式'),
        lineHeight: z.number().optional().describe('行高'),
        underline: z.boolean().optional().describe('下划线'),
        fontStyle: z.enum(['normal', 'italic']).optional().describe('字体样式'),
      },
    },
    async ({ projectId, materialId, objectId, ...textProps }) => {
      const result = await api.executeMaterialOperation(projectId, materialId, {
        type: 'me:updateText',
        params: { objectId, ...textProps },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材画布 · 撤销/重做                           ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_undo',
    {
      description: '素材编辑器撤销最近一次操作。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
      },
    },
    async ({ projectId, materialId }) => {
      const result = await api.materialUndo(projectId, materialId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_redo',
    {
      description: '素材编辑器重做撤销的操作。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
      },
    },
    async ({ projectId, materialId }) => {
      const result = await api.materialRedo(projectId, materialId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  CSS 工具（纯计算，无需画布）                    ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_generate_gradient_css',
    {
      description:
        '生成 CSS 渐变代码。支持线性(linear)、径向(radial)、锥形(conic)渐变。纯计算工具，不需要打开素材编辑器。',
      inputSchema: {
        type: z.enum(['linear', 'radial', 'conic']).describe('渐变类型'),
        colorStops: z.array(z.object({
          color: z.string().describe('颜色值'),
          position: z.number().min(0).max(1).describe('位置（0~1）'),
        })).min(2).describe('渐变色标'),
        angle: z.number().optional().describe('渐变角度（线性/锥形，度）'),
        centerX: z.number().optional().describe('中心 X（径向/锥形，0~1）'),
        centerY: z.number().optional().describe('中心 Y（径向/锥形，0~1）'),
        shape: z.enum(['circle', 'ellipse']).optional().describe('形状（仅径向）'),
      },
    },
    async ({ type, colorStops, angle, centerX, centerY, shape }) => {
      const stops = colorStops.map(s => `${s.color} ${Math.round(s.position * 100)}%`).join(', ');
      let css: string;
      switch (type) {
        case 'linear':
          css = `linear-gradient(${angle ?? 180}deg, ${stops})`;
          break;
        case 'radial':
          css = `radial-gradient(${shape ?? 'circle'} at ${Math.round((centerX ?? 0.5) * 100)}% ${Math.round((centerY ?? 0.5) * 100)}%, ${stops})`;
          break;
        case 'conic':
          css = `conic-gradient(from ${angle ?? 0}deg at ${Math.round((centerX ?? 0.5) * 100)}% ${Math.round((centerY ?? 0.5) * 100)}%, ${stops})`;
          break;
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ css, property: 'background', value: css }, null, 2) }] };
    },
  );

  server.registerTool(
    'me_generate_shadow_css',
    {
      description:
        '生成 CSS 阴影代码（box-shadow / text-shadow）。纯计算工具。',
      inputSchema: {
        shadows: z.array(z.object({
          type: z.enum(['box-shadow', 'text-shadow']).describe('阴影类型'),
          x: z.number().describe('X 偏移(px)'),
          y: z.number().describe('Y 偏移(px)'),
          blur: z.number().describe('模糊半径(px)'),
          spread: z.number().optional().describe('扩展半径(px)，仅 box-shadow'),
          color: z.string().describe('阴影颜色'),
          inset: z.boolean().optional().describe('内阴影，仅 box-shadow'),
        })).min(1).describe('阴影配置列表'),
      },
    },
    async ({ shadows }) => {
      const boxParts: string[] = [];
      const textParts: string[] = [];
      for (const s of shadows) {
        if (s.type === 'box-shadow') {
          const parts = [s.inset ? 'inset' : '', `${s.x}px`, `${s.y}px`, `${s.blur}px`, s.spread != null ? `${s.spread}px` : '', s.color].filter(Boolean).join(' ');
          boxParts.push(parts);
        } else {
          textParts.push(`${s.x}px ${s.y}px ${s.blur}px ${s.color}`);
        }
      }
      const result: Record<string, string> = {};
      if (boxParts.length) result.boxShadow = boxParts.join(', ');
      if (textParts.length) result.textShadow = textParts.join(', ');
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_generate_filter_css',
    {
      description:
        '生成 CSS filter 代码。支持所有 CSS 原生滤镜组合。纯计算工具。',
      inputSchema: {
        blur: z.number().optional().describe('模糊(px)'),
        brightness: z.number().optional().describe('亮度(0~3)'),
        contrast: z.number().optional().describe('对比度(0~3)'),
        grayscale: z.number().optional().describe('灰度(0~1)'),
        hueRotate: z.number().optional().describe('色相旋转(deg)'),
        invert: z.number().optional().describe('反色(0~1)'),
        opacity: z.number().optional().describe('透明度(0~1)'),
        saturate: z.number().optional().describe('饱和度(0~3)'),
        sepia: z.number().optional().describe('褐色调(0~1)'),
        dropShadow: z.string().optional().describe('投影值'),
      },
    },
    async (filters) => {
      const parts: string[] = [];
      if (filters.blur !== undefined) parts.push(`blur(${filters.blur}px)`);
      if (filters.brightness !== undefined) parts.push(`brightness(${filters.brightness})`);
      if (filters.contrast !== undefined) parts.push(`contrast(${filters.contrast})`);
      if (filters.grayscale !== undefined) parts.push(`grayscale(${filters.grayscale})`);
      if (filters.hueRotate !== undefined) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
      if (filters.invert !== undefined) parts.push(`invert(${filters.invert})`);
      if (filters.opacity !== undefined) parts.push(`opacity(${filters.opacity})`);
      if (filters.saturate !== undefined) parts.push(`saturate(${filters.saturate})`);
      if (filters.sepia !== undefined) parts.push(`sepia(${filters.sepia})`);
      if (filters.dropShadow) parts.push(`drop-shadow(${filters.dropShadow})`);
      const css = parts.join(' ') || 'none';
      return { content: [{ type: 'text' as const, text: JSON.stringify({ property: 'filter', value: css }, null, 2) }] };
    },
  );

  server.registerTool(
    'me_generate_animation_css',
    {
      description:
        '生成 CSS 动画代码（@keyframes + animation 简写）。支持预设或自定义关键帧。纯计算工具。',
      inputSchema: {
        name: z.string().optional().describe('动画名称（默认 customAnimation）'),
        duration: z.string().optional().describe('持续时间（如 "0.5s"）'),
        timingFunction: z.string().optional().describe('缓动函数'),
        delay: z.string().optional().describe('延迟'),
        iterationCount: z.union([z.string(), z.number()]).optional().describe('播放次数'),
        direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).optional().describe('方向'),
        fillMode: z.enum(['none', 'forwards', 'backwards', 'both']).optional().describe('填充模式'),
        keyframes: z.array(z.object({
          offset: z.number().min(0).max(1).describe('关键帧位置（0~1）'),
          styles: z.record(z.string(), z.union([z.string(), z.number()])).describe('CSS 属性'),
        })).optional().describe('自定义关键帧'),
        preset: z.enum([
          'fadeIn', 'fadeOut', 'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
          'bounceIn', 'pulse', 'shake', 'spin', 'swing', 'tada',
        ]).optional().describe('预设动画名称（使用预设时忽略 keyframes）'),
      },
    },
    async ({ name, duration, timingFunction, delay, iterationCount, direction, fillMode, keyframes, preset }) => {
      if (preset) {
        const dur = duration ?? '0.6s';
        const easing = timingFunction ?? 'ease';
        const count = iterationCount ?? '1';
        const fill = fillMode ?? 'both';
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              property: 'animation',
              value: `${preset} ${dur} ${easing} ${count} ${fill}`,
              note: `需要对应的 @keyframes ${preset} 定义`,
            }, null, 2),
          }],
        };
      }
      const animName = name ?? 'customAnimation';
      const kfs = keyframes ?? [
        { offset: 0, styles: { opacity: '0' } },
        { offset: 1, styles: { opacity: '1' } },
      ];
      const keyframeRules = kfs.map(kf => {
        const label = kf.offset === 0 ? 'from' : kf.offset === 1 ? 'to' : `${Math.round(kf.offset * 100)}%`;
        const props = Object.entries(kf.styles).map(([k, v]) => {
          const cssKey = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
          return `    ${cssKey}: ${v};`;
        }).join('\n');
        return `  ${label} {\n${props}\n  }`;
      }).join('\n');
      const keyframesCSS = `@keyframes ${animName} {\n${keyframeRules}\n}`;
      const shorthand = [
        animName,
        duration ?? '0.3s',
        timingFunction ?? 'ease',
        delay ?? '0s',
        String(iterationCount ?? 1),
        direction ?? 'normal',
        fillMode ?? 'none',
      ].join(' ');
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ keyframesCSS, animation: shorthand }, null, 2),
        }],
      };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  预设查询                                      ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_list_presets',
    {
      description: '列出素材编辑器的所有预设（渐变、阴影等）。',
      inputSchema: {
        type: z.enum(['gradients', 'shadows', 'all']).optional().describe('预设类型（默认 all）'),
      },
    },
    async ({ type: _type }) => {
      const result = await api.getMaterialEditorPresets();
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  设计 Schema 集成                               ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_apply_material_design',
    {
      description:
        '将素材编辑器的输出（CSS 属性集合）应用到设计 Schema 的目标节点。这是素材编辑器与设计编辑器的桥梁，一次性设置多个 CSS 属性。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标 Schema 节点 ID'),
        styleUpdates: z.record(z.string(), z.union([z.string(), z.number()])).describe(
          'CSS 属性键值对（如 { background: "linear-gradient(...)", filter: "blur(4px)", boxShadow: "..." }）',
        ),
      },
    },
    async ({ projectId, nodeId, styleUpdates }) => {
      const result = await api.executeOperation(projectId, {
        type: 'applyMaterialDesign',
        params: { nodeId, styleUpdates },
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
