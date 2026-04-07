import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Material Editor MCP Tools
 *
 * 5 tools as specified in the design doc §10:
 * 1. search_materials — AI 搜索项目素材库
 * 2. upload_material — AI 上传素材到项目（通过 URL）
 * 3. set_element_gradient — AI 设置元素渐变
 * 4. add_css_animation — AI 添加 CSS 动画
 * 5. apply_filters — AI 应用滤镜效果
 */
export function registerMaterialTools(server: McpServer): void {
  // ===== 1. search_materials =====
  server.registerTool(
    'search_materials',
    {
      description:
        '搜索项目素材库中的素材资源。支持按分类和关键词过滤，返回匹配的素材列表（包含 URL、缩略图、分类、标签等信息）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        category: z
          .enum(['image', 'icon', 'animation', 'video', 'other'])
          .optional()
          .describe('按分类过滤：image(图片)、icon(图标/SVG)、animation(Lottie/PAG/Rive)、video(视频)、other(其他)'),
        search: z
          .string()
          .optional()
          .describe('关键词搜索（匹配文件名和标签）'),
      },
    },
    async ({ projectId, category, search }) => {
      const result = await api.searchMaterials(projectId, { category, search });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== 2. upload_material =====
  server.registerTool(
    'upload_material',
    {
      description:
        '将素材上传到项目的素材库。目前支持通过提供素材的 URL 地址来上传（MCP 环境下不支持直接文件上传，需通过 API 代理）。上传后可在素材库中检索和使用。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        url: z.string().describe('素材文件的 URL 地址（支持 HTTP/HTTPS）'),
        name: z.string().optional().describe('素材名称（不填则从 URL 推断）'),
        category: z
          .enum(['image', 'icon', 'animation', 'video', 'other'])
          .optional()
          .describe('素材分类（不填则根据 MIME 类型自动推断）'),
        tags: z.array(z.string()).optional().describe('标签列表'),
      },
    },
    async ({ projectId, url: materialUrl, name, category, tags }) => {
      try {
        // Fetch the file from URL
        const response = await fetch(materialUrl);
        if (!response.ok) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: `无法下载素材: HTTP ${response.status}` }),
              },
            ],
            isError: true,
          };
        }

        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        const buffer = Buffer.from(await response.arrayBuffer());

        // Extract filename from URL
        const urlPath = new URL(materialUrl).pathname;
        const originalName = name ?? urlPath.split('/').pop() ?? 'uploaded-material';

        // Use the materials upload API (multipart form data)
        const FormData = (await import('node-fetch')).default ? globalThis.FormData : globalThis.FormData;
        const formData = new FormData();
        const blob = new Blob([buffer], { type: contentType });
        formData.append('file', blob, originalName);

        const BASE_URL = process.env.DESIGN_API_URL ?? 'http://localhost:3001';
        const uploadRes = await fetch(`${BASE_URL}/api/projects/${projectId}/materials/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: `上传失败: ${errText}` }),
              },
            ],
            isError: true,
          };
        }

        const uploadResult = await uploadRes.json();

        // If tags or category override provided, update meta
        if (tags || category) {
          const materialId = (uploadResult as any).id;
          if (materialId) {
            await api.updateMaterialMeta(projectId, materialId, {
              ...(category ? { category } : {}),
              ...(tags ? { tags } : {}),
            });
          }
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(uploadResult, null, 2) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `上传素材失败: ${err instanceof Error ? err.message : String(err)}` }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ===== 3. set_element_gradient =====
  server.registerTool(
    'set_element_gradient',
    {
      description:
        '为元素设置 CSS 渐变背景。支持线性渐变（linear-gradient）、径向渐变（radial-gradient）和锥形渐变（conic-gradient）。使用 applyMaterialDesign 操作原子地应用到目标节点。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标元素节点 ID'),
        type: z
          .enum(['linear', 'radial', 'conic'])
          .describe('渐变类型：linear(线性)、radial(径向)、conic(锥形)'),
        angle: z
          .number()
          .optional()
          .describe('渐变角度（仅 linear 有效，默认 180，即从上到下）'),
        stops: z
          .array(
            z.object({
              color: z.string().describe('颜色值（CSS 格式：#hex、rgb()、rgba()、hsl()）'),
              position: z.number().optional().describe('色标位置百分比 0-100'),
            }),
          )
          .min(2)
          .describe('渐变色标列表（至少 2 个）'),
        shape: z
          .enum(['circle', 'ellipse'])
          .optional()
          .describe('径向渐变形状（仅 radial 有效）'),
      },
    },
    async ({ projectId, nodeId, type, angle, stops, shape }) => {
      // Build CSS gradient string
      const colorStops = stops
        .map((s) => `${s.color}${s.position !== undefined ? ` ${s.position}%` : ''}`)
        .join(', ');

      let background: string;
      switch (type) {
        case 'linear':
          background = `linear-gradient(${angle ?? 180}deg, ${colorStops})`;
          break;
        case 'radial':
          background = `radial-gradient(${shape ?? 'circle'}, ${colorStops})`;
          break;
        case 'conic':
          background = `conic-gradient(from ${angle ?? 0}deg, ${colorStops})`;
          break;
      }

      const result = await api.executeOperation(projectId, {
        type: 'applyMaterialDesign',
        params: {
          nodeId,
          styleUpdates: { background },
        },
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== 4. add_css_animation =====
  server.registerTool(
    'add_css_animation',
    {
      description:
        '为元素添加 CSS 动画效果。可以使用预设动画名称（如 fadeIn、slideInUp、bounceIn、pulse、shake 等），也可以自定义 animation 简写字符串。使用 applyMaterialDesign 操作原子地应用。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标元素节点 ID'),
        preset: z
          .enum([
            'fadeIn', 'fadeOut', 'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
            'bounceIn', 'pulse', 'shake', 'spin', 'swing', 'tada',
          ])
          .optional()
          .describe('预设动画名称（选择后自动生成完整 animation 值）'),
        animation: z
          .string()
          .optional()
          .describe('自定义 CSS animation 简写值（如 "fadeIn 0.5s ease-out forwards"）。如果提供了 preset 则此项被忽略'),
        duration: z
          .string()
          .optional()
          .describe('动画时长（如 "0.5s"、"300ms"），默认 "0.6s"'),
        timingFunction: z
          .string()
          .optional()
          .describe('缓动函数（如 "ease"、"ease-in-out"、"cubic-bezier(0.4,0,0.2,1)"），默认 "ease"'),
        iterationCount: z
          .string()
          .optional()
          .describe('播放次数（如 "1"、"infinite"），默认 "1"'),
        fillMode: z
          .enum(['none', 'forwards', 'backwards', 'both'])
          .optional()
          .describe('填充模式，默认 "both"'),
      },
    },
    async ({ projectId, nodeId, preset, animation: customAnimation, duration, timingFunction, iterationCount, fillMode }) => {
      let animationValue: string;

      if (preset) {
        const dur = duration ?? '0.6s';
        const easing = timingFunction ?? 'ease';
        const count = iterationCount ?? '1';
        const fill = fillMode ?? 'both';
        animationValue = `${preset} ${dur} ${easing} ${count} ${fill}`;
      } else if (customAnimation) {
        animationValue = customAnimation;
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: '请提供 preset（预设动画）或 animation（自定义动画值）之一' }),
            },
          ],
          isError: true,
        };
      }

      const result = await api.executeOperation(projectId, {
        type: 'applyMaterialDesign',
        params: {
          nodeId,
          styleUpdates: { animation: animationValue },
        },
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== 5. apply_filters =====
  server.registerTool(
    'apply_filters',
    {
      description:
        '为元素应用 CSS 滤镜效果。支持 blur、brightness、contrast、grayscale、hue-rotate、invert、opacity、saturate、sepia、drop-shadow 等滤镜。可以组合多个滤镜。使用 applyMaterialDesign 操作原子地应用。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标元素节点 ID'),
        blur: z.number().optional().describe('模糊程度（px），如 4'),
        brightness: z.number().optional().describe('亮度（0-2），1 为原始值'),
        contrast: z.number().optional().describe('对比度（0-2），1 为原始值'),
        grayscale: z.number().optional().describe('灰度（0-1），0 为无灰度，1 为完全灰度'),
        hueRotate: z.number().optional().describe('色相旋转角度（deg），如 90'),
        invert: z.number().optional().describe('反色（0-1），0 为正常，1 为完全反色'),
        opacity: z.number().optional().describe('透明度（0-1），1 为不透明'),
        saturate: z.number().optional().describe('饱和度（0-3），1 为原始值'),
        sepia: z.number().optional().describe('褐色调（0-1），0 为无褐色，1 为完全褐色调'),
        dropShadow: z
          .string()
          .optional()
          .describe('投影（CSS drop-shadow 值，如 "2px 4px 6px rgba(0,0,0,0.3)"）'),
        customFilter: z
          .string()
          .optional()
          .describe('完整的自定义 CSS filter 字符串（提供此项时忽略其他滤镜参数）'),
      },
    },
    async ({ projectId, nodeId, blur, brightness, contrast, grayscale, hueRotate, invert, opacity, saturate, sepia, dropShadow, customFilter }) => {
      let filterValue: string;

      if (customFilter) {
        filterValue = customFilter;
      } else {
        const parts: string[] = [];
        if (blur !== undefined) parts.push(`blur(${blur}px)`);
        if (brightness !== undefined) parts.push(`brightness(${brightness})`);
        if (contrast !== undefined) parts.push(`contrast(${contrast})`);
        if (grayscale !== undefined) parts.push(`grayscale(${grayscale})`);
        if (hueRotate !== undefined) parts.push(`hue-rotate(${hueRotate}deg)`);
        if (invert !== undefined) parts.push(`invert(${invert})`);
        if (opacity !== undefined) parts.push(`opacity(${opacity})`);
        if (saturate !== undefined) parts.push(`saturate(${saturate})`);
        if (sepia !== undefined) parts.push(`sepia(${sepia})`);
        if (dropShadow) parts.push(`drop-shadow(${dropShadow})`);

        if (parts.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: '请至少提供一个滤镜参数或 customFilter' }),
              },
            ],
            isError: true,
          };
        }

        filterValue = parts.join(' ');
      }

      const result = await api.executeOperation(projectId, {
        type: 'applyMaterialDesign',
        params: {
          nodeId,
          styleUpdates: { filter: filterValue },
        },
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
