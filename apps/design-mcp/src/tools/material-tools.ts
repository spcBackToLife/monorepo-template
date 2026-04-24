import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Material Editor MCP Tools — 素材编辑器完整操作集
 *
 * 所有画布操作走 executeMaterialOperation()，发送类型化 MaterialOperation。
 * 后端是数据唯一真相来源（MCP 不依赖前端在线）。
 * 每个操作都需要 materialId（素材工程 ID）。
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
 * === 素材画布 · 高级绘图 ===
 *   me_draw_arcs / me_clear_objects
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
  // ║  素材工程管理（创建/列表/查询/删除）            ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_create_project',
    {
      description:
        '创建一个素材编辑工程（持久化到后端数据库）。创建后返回 materialId，后续所有画布操作（me_add_object 等）都需要传入此 ID。' +
        '可选择关联一个设计 Schema 节点（targetNodeId），也可不关联作为独立素材工程。' +
        '创建成功后前端素材编辑器会自动连接 WebSocket 同步。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        name: z.string().describe('工程名称（如"按钮背景"、"卡片装饰"）'),
        targetNodeId: z.string().optional().describe('关联的设计 Schema 节点 ID（可选，关联后可将素材应用到该节点）'),
        canvasWidth: z.number().positive().optional().describe('画布宽度（px，默认 600）'),
        canvasHeight: z.number().positive().optional().describe('画布高度（px，默认 400）'),
        backgroundColor: z.string().optional().describe('画布背景色（默认 #ffffff）'),
        referenceFrameWidth: z.number().positive().optional().describe('参考框宽度（组件实际尺寸，默认等于画布宽度）'),
        referenceFrameHeight: z.number().positive().optional().describe('参考框高度（组件实际尺寸，默认等于画布高度）'),
        tags: z.array(z.string()).optional().describe('标签列表'),
      },
    },
    async ({ projectId, name, targetNodeId, canvasWidth, canvasHeight, backgroundColor, referenceFrameWidth, referenceFrameHeight, tags }) => {
      const result = await api.createMaterialProject(projectId, {
        name,
        targetNodeId,
        canvasWidth: canvasWidth ?? 600,
        canvasHeight: canvasHeight ?? 400,
        backgroundColor,
        referenceFrameWidth,
        referenceFrameHeight,
        tags,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_list_projects',
    {
      description:
        '列出项目下的所有素材工程（摘要信息：ID、名称、尺寸、缩略图等）。' +
        '可按关联节点或关键词过滤。用于查找现有素材工程的 materialId。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        targetNodeId: z.string().optional().describe('按关联节点过滤'),
        search: z.string().optional().describe('按名称关键词搜索'),
      },
    },
    async ({ projectId, targetNodeId, search }) => {
      const result = await api.listMaterialProjects(projectId, { targetNodeId, search });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_get_project',
    {
      description: '获取素材工程的详细信息（含画布 JSON、背景色、关联节点等）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialProjectId: z.string().describe('素材工程 ID'),
      },
    },
    async ({ projectId, materialProjectId }) => {
      const result = await api.getMaterialProject(projectId, materialProjectId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_find_project_by_node',
    {
      description:
        '按关联的设计 Schema 节点 ID 查找素材工程（返回最近一个，向后兼容）。\n' +
        '如果该节点有多个素材工程，请使用 me_find_slots_by_node 查看完整列表。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('设计 Schema 节点 ID'),
      },
    },
    async ({ projectId, nodeId }) => {
      const result = await api.findMaterialProjectByNode(projectId, nodeId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_find_all_projects_by_node',
    {
      description:
        '按关联的设计 Schema 节点 ID 查找所有素材工程（一对多）。\n' +
        '返回该节点关联的所有素材工程列表。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('设计 Schema 节点 ID'),
      },
    },
    async ({ projectId, nodeId }) => {
      const result = await api.findAllMaterialProjectsByNode(projectId, nodeId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ╔══════════════════════════════════════════════╗
  // ║  素材槽位管理（节点 ↔ 素材工程多对多关联）      ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_find_slots_by_node',
    {
      description:
        '查询节点的所有素材槽位（含素材工程摘要）。\n' +
        '每个槽位代表节点的一个素材用途（如 default=默认背景, hover=悬浮态, decoration=装饰层等）。\n' +
        '返回数组，每项包含 slotName、materialProjectId、cssTarget、isActive 等信息。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('设计 Schema 节点 ID'),
      },
    },
    async ({ projectId, nodeId }) => {
      const result = await api.findSlotsByNode(projectId, nodeId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_create_slot',
    {
      description:
        '为节点创建素材槽位 — 将素材工程绑定到节点的某个用途上。\n' +
        '同一节点的同名槽位不可重复（如已有 default 槽位，不能再创建 default）。\n\n' +
        '常用槽位名称：\n' +
        '  - default：默认背景素材\n' +
        '  - hover：悬浮态素材\n' +
        '  - active：激活态素材\n' +
        '  - decoration：装饰层\n' +
        '  - dark-theme：暗色主题\n' +
        '  - before / after：伪元素装饰',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('设计 Schema 节点 ID'),
        materialProjectId: z.string().describe('要绑定的素材工程 ID'),
        slotName: z.string().optional().describe('槽位名称（默认 "default"）'),
        sortOrder: z.number().optional().describe('排序序号（默认 0，越小越靠前）'),
        cssTarget: z.string().optional().describe('CSS 目标属性（默认 "background-image"）'),
        isActive: z.boolean().optional().describe('是否激活（默认 true）'),
      },
    },
    async ({ projectId, nodeId, materialProjectId, slotName, sortOrder, cssTarget, isActive }) => {
      const result = await api.createSlot(projectId, {
        nodeId,
        materialProjectId,
        slotName,
        sortOrder,
        cssTarget,
        isActive,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_update_slot',
    {
      description: '更新素材槽位的属性（名称、绑定的素材工程、排序、CSS 目标、激活状态）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        slotId: z.string().describe('槽位 ID'),
        slotName: z.string().optional().describe('新槽位名称'),
        materialProjectId: z.string().optional().describe('新绑定的素材工程 ID'),
        sortOrder: z.number().optional().describe('新排序序号'),
        cssTarget: z.string().optional().describe('新 CSS 目标属性'),
        isActive: z.boolean().optional().describe('是否激活'),
      },
    },
    async ({ projectId, slotId, ...data }) => {
      const result = await api.updateSlot(projectId, slotId, data);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'me_delete_slot',
    {
      description: '删除素材槽位（解除节点与素材工程的关联，不删除素材工程本身）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        slotId: z.string().describe('要删除的槽位 ID'),
      },
    },
    async ({ projectId, slotId }) => {
      await api.deleteSlot(projectId, slotId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: '槽位已删除' }) }] };
    },
  );

  server.registerTool(
    'me_delete_project',
    {
      description: '删除素材工程（不可恢复）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialProjectId: z.string().describe('要删除的素材工程 ID'),
      },
    },
    async ({ projectId, materialProjectId }) => {
      await api.deleteMaterialProject(projectId, materialProjectId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: '素材工程已删除' }) }] };
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

  server.registerTool(
    'me_get_canvas_info',
    {
      description:
        '获取素材工程的画布信息摘要，包括：\n' +
        '  - 后端画布尺寸（canvasWidth/canvasHeight — 即组件原始尺寸）\n' +
        '  - 前端画布尺寸（frontendCanvasWidth/frontendCanvasHeight — 前端自动放大后的尺寸）\n' +
        '  - 参考框（默认框）在前端画布中的精确坐标（referenceFrameX/Y）\n' +
        '  - 背景色、对象数量等\n\n' +
        '这是通过 MCP 操作画布前必须调用的工具。\n' +
        '返回的 referenceFrameX/Y 就是 me_add_object 中应该使用的 x/y 坐标，\n' +
        '这样对象就会出现在参考框内部。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
      },
    },
    async ({ projectId, materialId }) => {
      const schema = await api.getMaterialSchema(projectId, materialId) as Record<string, unknown>;
      const backendW = (schema.canvasWidth as number) ?? 600;
      const backendH = (schema.canvasHeight as number) ?? 400;
      const refFrame = schema.referenceFrame as { enabled?: boolean; width?: number; height?: number } | undefined;
      const refW = refFrame?.width ?? backendW;
      const refH = refFrame?.height ?? backendH;

      // 前端 createMaterialProject 的计算逻辑
      const CANVAS_MIN_PADDING = 400;
      const frontendW = Math.max(1200, refW + CANVAS_MIN_PADDING * 2);
      const frontendH = Math.max(900, refH + CANVAS_MIN_PADDING * 2);
      const frameX = (frontendW - refW) / 2;
      const frameY = (frontendH - refH) / 2;

      const objects = (schema.objects as unknown[]) ?? [];
      const info = {
        // 后端存储的画布尺寸（= 组件原始尺寸）
        backendCanvasWidth: backendW,
        backendCanvasHeight: backendH,
        // 前端自动放大后的画布尺寸
        frontendCanvasWidth: frontendW,
        frontendCanvasHeight: frontendH,
        // 参考框（默认框）尺寸
        referenceFrameWidth: refW,
        referenceFrameHeight: refH,
        referenceFrameEnabled: refFrame?.enabled ?? true,
        // ⭐ 关键：参考框在前端画布中的位置 — 用这个作为 me_add_object 的 x/y
        referenceFrameX: frameX,
        referenceFrameY: frameY,
        // 画布背景色
        backgroundColor: schema.backgroundColor ?? '#ffffff',
        // 对象统计
        objectCount: objects.length,
        defaultElementId: schema.defaultElementId ?? null,
        // 操作提示
        _hint: `在参考框内画对象时，设置 x=${frameX}, y=${frameY}, width=${refW}, height=${refH}。` +
               `pathData 中使用局部坐标 (0,0)~(${refW},${refH})。` +
               `注意背景色是 ${schema.backgroundColor ?? '#ffffff'}，请选择对比色作为 stroke。`,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
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
        '在素材画布上添加对象。支持类型：矩形(rect)、椭圆(ellipse)、多边形(polygon)、星形(star)、路径(path)、线段(line)、文字(textbox)、图片(image)、沿圆可变线宽描边(profiledStroke)。\n\n' +
        'profiledStroke 与 canvas 域 `add_profiled_stroke` 使用同一套 `@globallink/material-operations` 默认 stops；也可用本工具传入 profiledGapDegrees / profiledWidthStops 等完整覆盖。\n\n' +
        '⚠️ 坐标系说明：\n' +
        '  - x/y 是对象在前端画布坐标系中的位置（不是后端画布坐标）\n' +
        '  - 要让对象出现在参考框内，先调用 me_get_canvas_info 获取 referenceFrameX/Y，用它们作为 x/y\n' +
        '  - pathData 中的坐标是相对于对象 (x,y) 的局部坐标，范围 0~width / 0~height\n' +
        '  - SVG 坐标系：Y轴向下，(0,0)=左上角，(width,height)=右下角\n\n' +
        '⚠️ 颜色提示：\n' +
        '  - 默认背景色是 #ffffff（白色），请勿使用白色或浅色 stroke\n' +
        '  - 推荐 stroke 颜色：#1a3ab4(深蓝) #32c896(青绿) #333333(深灰) #d4389a(品红)',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        type: z
          .enum(['rect', 'ellipse', 'polygon', 'star', 'path', 'line', 'textbox', 'image', 'profiledStroke'])
          .describe('对象类型'),
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
        // profiledStroke — 与 material-operations schema / canvas.add_object 对齐
        profiledKind: z.literal('circle').optional().describe('模板种类（当前仅 circle）'),
        profiledGapDegrees: z.number().optional().describe('圆环缺口角度（度）'),
        profiledGapFeatherDegrees: z.number().optional().describe('缺口两侧线宽羽化角度（度），不传则自动'),
        profiledSampleSegments: z.number().optional().describe('采样分段数'),
        profiledWidthStops: z
          .array(z.object({ t: z.number(), width: z.number() }))
          .optional()
          .describe('线宽标：t∈[0,1] 沿弧参数'),
        profiledColorStops: z
          .array(z.object({ t: z.number(), color: z.string() }))
          .optional()
          .describe('颜色标：t∈[0,1] 沿弧参数'),
        profiledLineCap: z.enum(['round', 'butt']).optional().describe('线段端帽'),
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
        '更新指定对象的属性（位置、尺寸、缩放、旋转、填充、描边等）。传入需要更新的属性键值对。\n' +
        'profiledStroke 对象可更新：profiledGapDegrees、profiledGapFeatherDegrees、profiledSampleSegments、profiledWidthStops、profiledColorStops、profiledLineCap（与前端属性面板一致）。',
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
        params: { objectId, props: updates },
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
  // ║  素材画布 · 高级绘图（自动处理坐标/颜色）       ║
  // ╚══════════════════════════════════════════════╝

  server.registerTool(
    'me_draw_arcs',
    {
      description:
        '在参考框内绘制一组发散弧线（装饰性曲线效果）。自动处理坐标转换和颜色选择。\n\n' +
        '弧线从参考框的一个角落发散到对边，常用于制作 UI 装饰背景。\n' +
        '此工具自动计算参考框位置、路径坐标、颜色渐变，无需手动指定 x/y 或 pathData。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        count: z.number().min(2).max(30).optional().describe('弧线数量（默认 12）'),
        origin: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
          .describe('弧线起始角（默认 top-left，弧线从该角发散到对角方向）'),
        colorStart: z.string().optional().describe('起始颜色（CSS 格式，默认 #1a3ab4 深蓝）'),
        colorEnd: z.string().optional().describe('结束颜色（CSS 格式，默认 #32c896 青绿）'),
        strokeWidth: z.number().optional().describe('描边宽度（默认 1.5）'),
        opacity: z.number().min(0).max(1).optional().describe('透明度（默认 0.85）'),
      },
    },
    async ({ projectId, materialId, count, origin, colorStart, colorEnd, strokeWidth: sw, opacity }) => {
      // 1. 获取画布信息，计算参考框位置
      const schema = await api.getMaterialSchema(projectId, materialId) as Record<string, unknown>;
      const backendW = (schema.canvasWidth as number) ?? 600;
      const backendH = (schema.canvasHeight as number) ?? 400;
      const refFrame = schema.referenceFrame as { width?: number; height?: number } | undefined;
      const W = refFrame?.width ?? backendW;
      const H = refFrame?.height ?? backendH;

      const PADDING = 400;
      const cw = Math.max(1200, W + PADDING * 2);
      const ch = Math.max(900, H + PADDING * 2);
      const frameX = (cw - W) / 2;
      const frameY = (ch - H) / 2;

      const N = count ?? 12;
      const orig = origin ?? 'top-left';
      const c1 = colorStart ?? '#1a3ab4';
      const c2 = colorEnd ?? '#32c896';
      const sWidth = sw ?? 1.5;
      const alpha = opacity ?? 0.85;

      // 2. 解析颜色插值
      const parseHex = (hex: string) => {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };
      const rgb1 = parseHex(c1);
      const rgb2 = parseHex(c2);

      // 3. 生成弧线并批量添加
      const operations: unknown[] = [];
      for (let i = 0; i < N; i++) {
        const t = N > 1 ? i / (N - 1) : 0;
        const r = Math.round(rgb1[0]! + (rgb2[0]! - rgb1[0]!) * t);
        const g = Math.round(rgb1[1]! + (rgb2[1]! - rgb1[1]!) * t);
        const b = Math.round(rgb1[2]! + (rgb2[2]! - rgb1[2]!) * t);
        const color = `rgba(${r},${g},${b},${alpha})`;

        // 计算路径：根据起始角确定方向
        let pathData: string;
        const spread = 0.3 + 0.7 * t; // 弧线展开程度

        switch (orig) {
          case 'top-left':
            // 从左上角发散到右下方
            pathData = `M 0 0 Q ${(W * (0.1 + t * 0.35)).toFixed(1)} ${(H * spread).toFixed(1)} ${(W * spread).toFixed(1)} ${(H * (0.05 + t * 0.9)).toFixed(1)}`;
            break;
          case 'top-right':
            // 从右上角发散到左下方
            pathData = `M ${W} 0 Q ${(W * (0.9 - t * 0.35)).toFixed(1)} ${(H * spread).toFixed(1)} ${(W * (1 - spread)).toFixed(1)} ${(H * (0.05 + t * 0.9)).toFixed(1)}`;
            break;
          case 'bottom-left':
            // 从左下角发散到右上方
            pathData = `M 0 ${H} Q ${(W * (0.1 + t * 0.35)).toFixed(1)} ${(H * (1 - spread)).toFixed(1)} ${(W * spread).toFixed(1)} ${(H * (0.95 - t * 0.9)).toFixed(1)}`;
            break;
          case 'bottom-right':
            // 从右下角发散到左上方
            pathData = `M ${W} ${H} Q ${(W * (0.9 - t * 0.35)).toFixed(1)} ${(H * (1 - spread)).toFixed(1)} ${(W * (1 - spread)).toFixed(1)} ${(H * (0.95 - t * 0.9)).toFixed(1)}`;
            break;
        }

        operations.push({
          type: 'me:addObject',
          params: {
            object: {
              type: 'path',
              name: `arc-${String(i + 1).padStart(2, '0')}`,
              x: frameX,
              y: frameY,
              width: W,
              height: H,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              fill: null,
              stroke: color,
              strokeWidth: sWidth,
              opacity: 1,
              blendMode: 'normal',
              visible: true,
              locked: false,
              pathData,
            },
          },
        });
      }

      // 用批量接口一次性添加
      const result = await api.executeMaterialBatch(projectId, materialId, operations);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `已在参考框 (${frameX},${frameY}) 内绘制 ${N} 条弧线`,
            origin: orig,
            referenceFrame: { x: frameX, y: frameY, width: W, height: H },
            colorRange: `${c1} → ${c2}`,
            ...(result as Record<string, unknown>),
          }, null, 2),
        }],
      };
    },
  );

  server.registerTool(
    'me_clear_objects',
    {
      description:
        '清除素材工程中的所有对象（保留默认框/参考框）。\n' +
        '这是重置画布的安全方式，比逐个删除更高效。\n' +
        '如果设置 includeDefault=true 则连默认框也删除。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID'),
        includeDefault: z.boolean().optional().describe('是否同时删除默认框（默认 false）'),
      },
    },
    async ({ projectId, materialId, includeDefault }) => {
      // 获取当前所有对象
      const schema = await api.getMaterialSchema(projectId, materialId) as Record<string, unknown>;
      const objects = (schema.objects as Array<{ id: string; name?: string }>) ?? [];
      const defaultId = schema.defaultElementId as string | undefined;

      const toDelete = objects.filter(o => includeDefault || o.id !== defaultId);

      if (toDelete.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: '画布已经是空的', deletedCount: 0 }) }] };
      }

      // 使用批量操作一次性删除
      const operations = toDelete.map(o => ({
        type: 'me:removeObject',
        params: { objectId: o.id },
      }));

      const result = await api.executeMaterialBatch(projectId, materialId, operations);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `已删除 ${toDelete.length} 个对象`,
            deletedCount: toDelete.length,
            keptDefault: !includeDefault && defaultId ? true : false,
            ...(result as Record<string, unknown>),
          }, null, 2),
        }],
      };
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
