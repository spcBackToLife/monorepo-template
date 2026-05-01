/**
 * 素材画布 — 合并原 ~30 个 me_* 工具为 1 个
 *
 * 覆盖：Schema/信息、画布管理、对象 CRUD、样式、组操作、文字、
 *      撤销重做、高级绘图（弧线/清空）、CSS 计算工具、设计集成、服务端导出
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  sampleProfiledStrokeCircle,
  defaultVoiceHaloWidthStops,
  defaultVoiceHaloColorStops,
} from '@globallink/material-operations';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient as api, listMaterialSlotsByNode, ensureMaterialNodeBinding, updateMaterialProject } from '../../api-client.js';
import type { MaterialSlotRecordDto } from '../../api-client.js';
import type { CanvasObjectProps, CanvasSchema, GradientDefLike, ApiJsonResponse } from '../../types/canvas.js';

// ── 服务端渲染辅助函数 ──

/**
 * 将 group 递归展开为「画布绝对坐标」的扁平对象列表。
 * Schema 里子对象的 x/y 相对组原点；服务端 renderObject 不处理 group，此前整组会漏画。
 */
function expandMaterialGroupsForServerRender(
  objects: CanvasObjectProps[],
): CanvasObjectProps[] {
  const out: CanvasObjectProps[] = [];
  const walk = (list: CanvasObjectProps[], parentX: number, parentY: number) => {
    for (const raw of list) {
      const t = String(raw.type ?? '');
      if (t === 'group') {
        const gx = Number(raw.x ?? 0) + parentX;
        const gy = Number(raw.y ?? 0) + parentY;
        const kids = raw.children ?? [];
        walk(kids, gx, gy);
      } else {
        const o = { ...raw };
        o.x = Number(o.x ?? o.left ?? 0) + parentX;
        o.y = Number(o.y ?? o.top ?? 0) + parentY;
        if (o.left != null) o.left = Number(o.left) + parentX;
        if (o.top != null) o.top = Number(o.top) + parentY;
        out.push(o);
      }
    }
  };
  walk(objects, 0, 0);
  return out;
}

/**
 * 将 canvasJSON 中的对象渲染到 Canvas 2D context。
 *
 * 支持：rect、ellipse、circle、polygon、star、path、line、textbox、image、group
 * 兼容 fabric.js 序列化格式（left/top/width/height/fill/stroke/rx/ry 等）
 */
async function renderObject(
  /** node-canvas 2D 上下文（与 DOM CanvasRenderingContext2D 类型名相同但结构不同） */
  ctx: import('canvas').CanvasRenderingContext2D,
  obj: CanvasObjectProps,
  _canvasW: number,
  _canvasH: number,
): Promise<void> {
  const type = (obj.type as string) ?? '';
  const left = Number(obj.left??obj.x??0);
  const top = Number(obj.top??obj.y??0);
  const width = Number(obj.width??obj.w??0);
  const height = Number(obj.height??obj.h??0);
  // fill 既可能是字符串（纯色 / CSS 渐变），也可能是 GradientDef 对象（与前端 GradientEditor / GradientDefs.tsx 同构）
  const fill = obj.fill as unknown;
  const stroke = obj.stroke as string|undefined;
  const strokeWidth = Number(obj.strokeWidth??(stroke?1:0));
  const opacity = Number(obj.opacity??1);
  const rotationDeg = Number(obj.rotation ?? obj.angle ?? 0);
  const originX = String(obj.originX??'left');
  const originY = String(obj.originY??'top');
  const scaleX = Number(obj.scaleX??1);
  const scaleY = Number(obj.scaleY??1);

  if(opacity===0) return; // 完全透明，跳过
  if(obj.visible===false) return;

  ctx.save();
  ctx.globalAlpha=opacity;

  // 与 MaterialRenderer / svg-utils.getTransform 一致：
  // translate(x,y) → rotate(rotation, width*scaleX/2, height*scaleY/2) → scale(scaleX, scaleY)
  // 形状在局部坐标 (0,0)-(width,height) 绘制，对应 SVG 里 <rect x="0" y="0" .../> 包在 <g transform="..."> 中。
  let tx = left, ty = top;
  if(originX==='center') tx-=width/2;
  else if(originX==='right') tx-=width;
  if(originY==='center') ty-=height/2;
  else if(originY==='bottom') ty-=height;

  ctx.translate(tx, ty);
  if (rotationDeg % 360 !== 0) {
    const rcx = (width * scaleX) / 2;
    const rcy = (height * scaleY) / 2;
    ctx.translate(rcx, rcy);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.translate(-rcx, -rcy);
  }
  ctx.scale(scaleX, scaleY);

  const ox = 0;
  const oy = 0;

  // 填充色处理（支持纯色 / CSS 渐变字符串 / 结构化 GradientDef 对象）— 局部坐标系内解析
  if(fill != null && fill !== 'null' && fill !== 'none' && fill !== 'transparent'){
    const resolved = resolveFill(ctx, fill, width, height, ox, oy);
    if (resolved != null) ctx.fillStyle = resolved;
  }
  if(stroke && stroke!=='null' && stroke!=='none') ctx.strokeStyle = stroke;
  if(strokeWidth>0) ctx.lineWidth = strokeWidth;

  switch(type){
    case 'rect':{
      const rx = Number(obj.rx??obj.cornerRadius??0);
      const ry = Number(obj.ry??obj.cornerRadiusRadius??rx);
      if(rx>0||ry>0) roundRect(ctx,ox,oy,width,height,rx,ry);
      else ctx.fillRect(ox,oy,width,height);
      if(strokeWidth>0){ ctx.beginPath(); if(rx>0||ry>0) roundRectPath(ctx,ox,oy,width,height,rx,ry); else ctx.rect(ox,oy,width,height); ctx.stroke(); }
      break;
    }
    case 'ellipse':
    case 'circle':
      ctx.beginPath();
      ctx.ellipse(ox+width/2,oy+height/2,width/2,height/2,0,0,Math.PI*2);
      ctx.fill();
      if(strokeWidth>0) ctx.stroke();
      break;
    case 'polygon':{
      const points=(obj.points as Array<{x:number;y:number}>)??[];
      if(points.length>=3){
        ctx.beginPath();
        // polygon 在 fabric 中是相对坐标
        for(let i=0;i<points.length;i++){
          const pt=points[i]!;
          const baseW = Number(obj._width ?? width);
          const baseH = Number(obj._height ?? height);
          const px=ox+pt.x*(width/baseW);
          const py=oy+pt.y*(height/baseH);
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();if(strokeWidth>0)ctx.stroke();
      }
      break;
    }
    case 'star':{
      const pts=Number(obj.points ?? 5);
      drawStar(ctx,ox+width/2,oy+height/2,pts,Number(obj.innerRadius??width*0.35)/2,Number(obj.outerRadius??width*0.5)/2);
      ctx.fill();if(strokeWidth>0)ctx.stroke();
      break;
    }
    case 'path':{
      // 素材 Schema 使用 pathData（与 ObjectRenderer 一致）；旧数据可能用 path
      const pd=String(obj.pathData ?? obj.path ?? '');
      renderSVGPath(ctx,pd,ox,oy,width,height);
      const hasFill =
        fill &&
        fill !== 'null' &&
        fill !== 'none' &&
        fill !== 'transparent';
      if(hasFill) ctx.fill();
      if(strokeWidth>0 && stroke && stroke!=='null' && stroke!=='none') ctx.stroke();
      break;
    }
    case 'line':{
      const x1=Number(obj.x1??0),y1=Number(obj.y1??0),x2=Number(obj.x2??width),y2=Number(obj.y2??height);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      break;
    }
    case 'profiledStroke':{
      const lines=sampleProfiledStrokeCircle({
        width:Number(obj.width??0),
        height:Number(obj.height??0),
        gapDegrees:Number(obj.profiledGapDegrees??16),
        gapFeatherDegrees:obj.profiledGapFeatherDegrees as number|undefined,
        segments:Number(obj.profiledSampleSegments??128),
        widthStops:(obj.profiledWidthStops as {t:number;width:number}[])??[],
        colorStops:(obj.profiledColorStops as {t:number;color:string}[])??[],
      });
      const cap=String(obj.profiledLineCap??'round')==='butt'?'butt':'round';
      ctx.lineCap=cap as CanvasLineCap;
      for(const ln of lines){
        ctx.beginPath();
        ctx.strokeStyle=ln.stroke;
        ctx.lineWidth=ln.strokeWidth;
        ctx.moveTo(ox+ln.x1,oy+ln.y1);
        ctx.lineTo(ox+ln.x2,oy+ln.y2);
        ctx.stroke();
      }
      break;
    }
    case 'textbox':
    case 'text':
    case 'i-text':{
      const text=(obj.text as string)??'';
      // scale 已由 ctx.scale(scaleX, scaleY) 应用，勿再乘 scaleX
      const fontSize=Number(obj.fontSize??16);
      const fontFamily=(obj.fontFamily as string)??'-apple-system, sans-serif';
      const fontWeight=String(obj.fontWeight??'normal');
      const textAlign=(obj.textAlign as string)??'left';
      ctx.font=`${fontWeight} ${fontSize}px ${fontFamily}`;
      // fill 为 unknown：仅字符串或未定义时用字色；渐变/结构化 fill 已由上方 resolveFill 写入 ctx.fillStyle
      if (typeof fill === 'string') {
        ctx.fillStyle =
          fill && fill !== 'null' && fill !== 'none' && fill !== 'transparent' ? fill : '#000000';
      } else if (fill == null) {
        ctx.fillStyle = '#000000';
      }
      ctx.textAlign=textAlign as CanvasTextAlign;
      const tx=textAlign==='center'?ox+width/2:textAlign==='right'?ox+width:ox;
      const lines=text.split('\n');
      const lineH=fontSize*1.4;
      for(let li=0;li<lines.length;li++){
        ctx.fillText(lines[li]!,tx,oy+fontSize+li*lineH);
      }
      break;
    }
    case 'image':{
      // 图片需要异步加载 src
      const src=obj.src as string|undefined;
      if(src){
        try{
          const imgMod=await import('canvas');
          const img=new imgMod.Image();
          await new Promise<void>((resolve,reject)=>{
            img.onload=()=>resolve();
            img.onerror=reject;
            img.src=src;
          });
          ctx.drawImage(img, ox, oy, width, height);
        }catch{/* skip broken images */}
      }
      break;
    }
    default:
      // fallback: 绘制矩形
      if(fill&&fill!=='null'&&fill!=='none'){ctx.fillRect(ox,oy,width,height);}
      break;
  }

  ctx.restore();
}

/** Type guard: check if value is a GradientDef-like structure */
function isGradientDefObject(v: unknown): v is GradientDefLike {
  return !!v
    && typeof v === 'object'
    && 'type' in (v as object)
    && Array.isArray((v as { stops?: unknown }).stops);
}

/**
 * 解析填充色为 cairo Canvas 可用的 fillStyle。
 *
 * 支持：
 *   - 纯色字符串（hex / rgb / rgba / named color）
 *   - CSS `linear-gradient(<deg>deg, <stops>)` 字符串
 *   - 结构化 `GradientDef` 对象（linear / radial），与前端 SVG 渲染器 `GradientDefs.tsx`
 *     一致使用 `objectBoundingBox` 等价的几何（渐变线就在对象包围盒内一边到另一边）。
 *
 * 返回 null 表示「无法解析」，调用方应跳过 fillStyle 赋值。
 */
function resolveFill(
  ctx: import('canvas').CanvasRenderingContext2D,
  fill: unknown,
  w: number,
  h: number,
  x: number,
  y: number,
): string | ReturnType<import('canvas').CanvasRenderingContext2D['createLinearGradient']> | null {
  if (fill == null) return '#000000';

  // 结构化 GradientDef 对象（MCP set_fill / 前端 GradientEditor 写入此格式）
  if (isGradientDefObject(fill)) {
    return resolveGradientDef(ctx, fill, w, h, x, y);
  }

  if (typeof fill !== 'string') return null;
  if (!fill) return '#000000';

  // CSS linear-gradient 字符串（兼容历史用法）
  const lgMatch = fill.match(/linear-gradient\s*\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\s*\)/i);
  if (lgMatch) {
    const deg = parseFloat(lgMatch[1]!) % 360;
    const stopsStr = lgMatch[2]!;
    const stops = parseColorStops(stopsStr).map((s) => ({ color: s.color, offset: s.pos }));
    return resolveGradientDef(ctx, { type: 'linear', angle: deg, stops }, w, h, x, y);
  }
  return fill;
}

/**
 * 把结构化 GradientDef 转为 cairo CanvasGradient。
 *
 * 几何与前端 `GradientDefs.tsx`（`gradientUnits="objectBoundingBox"`）保持一致：
 *   - linear：角度 → 单位向量在 [0,1]² 包围盒内的两端点 → 缩放到对象局部坐标
 *   - radial：cx/cy/r 都是 [0,1] 比例；半径乘以 max(w, h)（与 SVG `objectBoundingBox` 的对角线
 *     标准略有差异，但视觉上对常见用例足够接近）
 */
function resolveGradientDef(
  ctx: import('canvas').CanvasRenderingContext2D,
  def: GradientDefLike,
  w: number,
  h: number,
  x: number,
  y: number,
): ReturnType<import('canvas').CanvasRenderingContext2D['createLinearGradient']> | string {
  if (def.type === 'linear') {
    const angle = def.angle ?? 0;
    const rad = ((angle - 90) * Math.PI) / 180;
    const u1 = 0.5 - Math.cos(rad) * 0.5;
    const v1 = 0.5 - Math.sin(rad) * 0.5;
    const u2 = 0.5 + Math.cos(rad) * 0.5;
    const v2 = 0.5 + Math.sin(rad) * 0.5;
    const grad = ctx.createLinearGradient(x + w * u1, y + h * v1, x + w * u2, y + h * v2);
    for (const s of def.stops) grad.addColorStop(clamp01(s.offset), s.color);
    return grad;
  }
  if (def.type === 'radial') {
    const cx = x + w * (def.cx ?? 0.5);
    const cy = y + h * (def.cy ?? 0.5);
    const r = Math.max(w, h) * (def.r ?? 0.5);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const s of def.stops) grad.addColorStop(clamp01(s.offset), s.color);
    return grad;
  }
  // conic：cairo 无原生支持；回退为第一个色标的纯色（与前端一致：SVG 也不渲染 conic）
  return def.stops[0]?.color ?? '#000000';
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** 解析颜色停靠点 — 支持带/不带百分号，自动插值缺失位置 */
function parseColorStops(str:string):Array<{pos:number,color:string}>{
  const re=/([a-zA-Z]+\([^)]+\)|#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))\s*(\d+(?:\.\d+)?)?%?\s*/g;
  const result = [] as Array<{pos:number; color:string}>;
  let m;
  while((m=re.exec(str))!==null){
    result.push({pos: m[2]!==undefined ? parseFloat(m[2]!)/100 : -1, color: m[1]!});
  }
  if(result.length>0){
    for(let i=0;i<result.length;i++){
      if(result[i]!.pos<0) result[i]!.pos=i/Math.max(1,result.length-1);
    }
  }
  if(result.length===0) result.push({pos:0,color:str.trim()},{pos:1,color:str.trim()});
  return result;
}

/** 圆角矩形填充 */
function roundRect(ctx:import('canvas').CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rx:number,ry:number){
  ctx.beginPath();roundRectPath(ctx,x,y,w,h,rx,ry);ctx.fill();
}
function roundRectPath(ctx:import('canvas').CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rx:number,ry:number){
  ctx.moveTo(x+rx,y);
  ctx.arcTo(x+w,y,x+w,y+h,ry);
  ctx.arcTo(x+w,y+h,x,y+h,rx);
  ctx.arcTo(x,y+h,x,y,rx);
  ctx.arcTo(x,y,x+w,y,ry);
  ctx.closePath();
}

/** 星形 */
function drawStar(ctx:import('canvas').CanvasRenderingContext2D,cx:number,cy:number,points:number,innerR:number,outerR:number){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const r=i%2===0?outerR:innerR;
    const ang=(Math.PI*i)/points-Math.PI/2;
    if(i===0)ctx.moveTo(cx+r*Math.cos(ang),cy+r*Math.sin(ang));
    else ctx.lineTo(cx+r*Math.cos(ang),cy+r*Math.sin(ang));
  }
  ctx.closePath();
}

/** SVG path 渲染（支持 M/L/Q/C/Z 命令） */
function renderSVGPath(ctx:import('canvas').CanvasRenderingContext2D,pathData:string,ox:number,oy:number,_w?:number,_h?:number){
  const cmds=pathData.replace(/,/g,' ').split(/\s+/).filter(Boolean);
  ctx.beginPath();
  let cx=0,cy=0;
  let i=0;
  while(i<cmds.length){
    const c=cmds[i++]!;
    switch(c.toUpperCase()){
      case 'M':{const nx=parseFloat(cmds[i++]!),ny=parseFloat(cmds[i++]!);if(c==='M'){cx=nx;cy=ny;}else{cx+=nx;cy+=ny;}ctx.moveTo(ox+cx,oy+cy);break;}
      case 'L':{const nx=parseFloat(cmds[i++]!),ny=parseFloat(cmds[i++]!);if(c==='L'){cx=nx;cy=ny;}else{cx+=nx;cy+=ny;}ctx.lineTo(ox+cx,oy+cy);break;}
      case 'Q':{const x1=parseFloat(cmds[i++]!),y1=parseFloat(cmds[i++]!),x2=parseFloat(cmds[i++]!),y2=parseFloat(cmds[i++]!);if(c==='Q'){cx=x2;cy=y2;}else{cx+=x2;cy+=y2;}ctx.quadraticCurveTo(ox+x1,oy+y1,ox+cx,oy+cy);break;}
      case 'C':{const x1=parseFloat(cmds[i++]!),y1=parseFloat(cmds[i++]!),x2=parseFloat(cmds[i++]!),y2=parseFloat(cmds[i++]!),x3=parseFloat(cmds[i++]!),y3=parseFloat(cmds[i++]!);if(c==='C'){cx=x3;cy=y3;}else{cx+=x3;cy+=y3;}ctx.bezierCurveTo(ox+x1,oy+y1,ox+x2,oy+y2,ox+cx,oy+cy);break;}
      case 'Z':case 'z':ctx.closePath();break;
      default:break;
    }
  }
}

export function registerCanvasTools(server: McpServer): void {
  registerDomainTool(server, 'canvas', '素材画布核心操作集：Schema查询/画布管理/对象CRUD/样式/组/文字/撤销重做/高级绘图/CSS工具/设计集成', {

    // ── Schema & Info ──
    get_schema: defineAction({
      description: '获取素材工程完整 Schema。理解画布状态的首要工具。',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => ({ content: [{ type:'text', text: JSON.stringify(await api.getMaterialSchema(p.projectId, p.materialId), null, 2) }] }),
    }),
    get_canvas_info: defineAction({
      description:
        '获取画布坐标信息摘要。操作画布前建议调用。\n\n' +
        '⭐ 坐标系（统一画布绝对坐标）：\n' +
        '  - canvasWidth × canvasHeight = 画布尺寸\n' +
        '  - referenceFrameX/Y = 参考框左上角在画布中的位置（画布绝对坐标）\n' +
        '  - add_object / update_object / draw_arcs 等的 x/y 直接使用画布绝对坐标，无隐式转换\n' +
        '  - 要在参考框内绘制：x ≥ referenceFrameX, y ≥ referenceFrameY',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => {
        const s = await api.getMaterialSchema(p.projectId, p.materialId) as CanvasSchema;
        const bw = s.canvasWidth ?? 600, bh = s.canvasHeight ?? 400;
        const rf = s.referenceFrame;
        const rw = rf?.width??bw, rh = rf?.height??bh;

        // 参考框居中偏移（与后端 createMaterialProject 一致）
        const rfx = Math.round((bw - rw) / 2);
        const rfy = Math.round((bh - rh) / 2);

        return { content: [{ type:'text', text: JSON.stringify({
          canvasWidth: bw, canvasHeight: bh,
          referenceFrameWidth:rw, referenceFrameHeight:rh,
          referenceFrameEnabled:rf?.enabled??true,
          referenceFrameX:rfx, referenceFrameY:rfy,
          backgroundColor:s.backgroundColor??'#ffffff',
          objectCount:(s.objects??[]).length,
          defaultElementId:s.defaultElementId??null,
        }, null, 2) }] };
      },
    }),

    // ── Canvas Management ──
    set_background_color: defineAction({
      description: '设置画布背景色',
      schema: z.object({ projectId:z.string(), materialId:z.string(), color:z.string() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setBackgroundColor',params:{color:p.color}}),null,2)}] }),
    }),
    resize_canvas: defineAction({
      description: '调整画布尺寸',
      schema: z.object({ projectId:z.string(), materialId:z.string(), width:z.number().positive(), height:z.number().positive() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:resizeCanvas',params:{width:p.width,height:p.height}}),null,2)}] }),
    }),
    resize_reference_frame: defineAction({
      description: '调整参考框尺寸',
      schema: z.object({ projectId:z.string(), materialId:z.string(), width:z.number().positive(), height:z.number().positive(), enabled:z.boolean().optional() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:resizeReferenceFrame',params:{width:p.width,height:p.height,enabled:p.enabled}}),null,2)}] }),
    }),

    // ── Object CRUD ──
    add_object: defineAction({
      description: [
        '在画布上添加对象(rect/ellipse/polygon/star/path/line/textbox/image)。通用工具：传 type 与几何/样式字段即可，不包含任何固定图案说明。',
        '',
        '坐标：x/y 为**画布绝对坐标**，存什么就是什么，无隐式转换。',
        '操作前应先 `get_canvas_info` 获取 referenceFrameX/Y，再计算目标位置（如要在参考框内绘制：x = referenceFrameX + localX）。',
        '',
        '常用字段：rect 用 width/height/rx/ry/fill；line 用 x1/y1/x2/y2；path 用 pathData；image 用 src。',
        '推荐 stroke 色: #1a3ab4 #32c896 #333333 #d4389a',
      ].join('\n'),
      schema: z.object({
        projectId:z.string(),materialId:z.string(),
        type:z.enum(['rect','ellipse','polygon','star','path','line','textbox','image','profiledStroke']),
        name:z.string().optional(),x:z.number().optional(),y:z.number().optional(),
        width:z.number().optional(),height:z.number().optional(),
        fill:z.string().optional(),stroke:z.string().optional(),strokeWidth:z.number().optional(),
        opacity:z.number().optional(),rotation:z.number().optional(),
        rx:z.number().optional(),ry:z.number().optional(),
        sides:z.number().optional(),points:z.number().optional(),innerRatio:z.number().optional(),
        pathData:z.string().optional(),
        text:z.string().optional(),fontSize:z.number().optional(),fontFamily:z.string().optional(),
        fontWeight:z.union([z.string(),z.number()]).optional(),textAlign:z.enum(['left','center','right']).optional(),
        src:z.string().optional(),
        profiledKind: z.literal('circle').optional(),
        profiledGapDegrees: z.number().optional(),
        profiledGapFeatherDegrees: z.number().optional(),
        profiledSampleSegments: z.number().optional(),
        profiledWidthStops: z.array(z.object({ t: z.number(), width: z.number() })).optional(),
        profiledColorStops: z.array(z.object({ t: z.number(), color: z.string() })).optional(),
        profiledLineCap: z.enum(['round', 'butt']).optional(),
      }),
      handler: async (raw) => {
        const rp = raw as CanvasObjectProps & { projectId: string; materialId: string };
        const projectId = String(rp.projectId ?? '');
        const materialId = String(rp.materialId ?? '');
        const opRest = Object.fromEntries(
          Object.entries(rp).filter(([k]) => k !== 'projectId' && k !== 'materialId'),
        );
        const op = opRest as Partial<CanvasObjectProps>;

        // ★ 方案 A：存什么就是什么，无隐式坐标转换
        // 调用者负责传入画布绝对坐标（可通过 get_canvas_info 获取 referenceFrameX/Y）
        const apiResult = await api.executeMaterialOperation(projectId,materialId,{type:'me:addObject',params:{object:op}});

        const apiExtra =
          typeof apiResult === 'object' && apiResult !== null && !Array.isArray(apiResult)
            ? (apiResult as ApiJsonResponse)
            : {};
        return {
          content:[{
            type:'text',
            text:JSON.stringify({
              ...apiExtra,
              _stored:{ x: op.x, y: op.y, width: op.width, height: op.height },
              _note: '坐标为画布绝对坐标，存什么就是什么',
            },null,2),
          }],
        };
      },
    }),
    add_profiled_stroke: defineAction({
      description: [
        '添加「沿圆的可变线宽 + 弧上色标」对象（type=profiledStroke）。',
        '采样算法与前端 ObjectRenderer、本工具 export_and_apply 共用 `@globallink/material-operations` 的 `sampleProfiledStrokeCircle`。',
        'x/y/width/height 为**画布绝对坐标**，存什么就是什么，无隐式转换。',
      ].join('\n'),
      schema: z.object({
        projectId: z.string(),
        materialId: z.string(),
        name: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        gapDegrees: z.number().optional(),
        gapFeatherDegrees: z.number().optional(),
        sampleSegments: z.number().optional(),
        widthStops: z.array(z.object({ t: z.number(), width: z.number() })).optional(),
        colorStops: z.array(z.object({ t: z.number(), color: z.string() })).optional(),
        lineCap: z.enum(['round', 'butt']).optional(),
      }),
      handler: async (raw) => {
        const rp = raw as CanvasObjectProps & { projectId: string; materialId: string; gapDegrees?: number; gapFeatherDegrees?: number; sampleSegments?: number; widthStops?: Array<{ t: number; width: number }>; colorStops?: Array<{ t: number; color: string }>; lineCap?: string };
        const projectId = String(rp.projectId ?? '');
        const materialId = String(rp.materialId ?? '');

        // ★ 方案 A：存什么就是什么，无隐式坐标转换
        const object: CanvasObjectProps = {
          type: 'profiledStroke',
          name: (rp.name as string) ?? '渐变光环',
          x: Number(rp.x ?? 0),
          y: Number(rp.y ?? 0),
          width: Number(rp.width ?? 220),
          height: Number(rp.height ?? 220),
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          fill: null,
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          blendMode: 'normal',
          visible: true,
          locked: false,
          profiledKind: 'circle',
          profiledGapDegrees: rp.gapDegrees ?? 16,
          profiledGapFeatherDegrees: rp.gapFeatherDegrees as number | undefined,
          profiledSampleSegments: rp.sampleSegments ?? 128,
          profiledWidthStops: rp.widthStops ?? defaultVoiceHaloWidthStops(),
          profiledColorStops: rp.colorStops ?? defaultVoiceHaloColorStops(),
          profiledLineCap: rp.lineCap ?? 'round',
        };

        const apiResult = await api.executeMaterialOperation(projectId, materialId, {
          type: 'me:addObject',
          params: { object },
        });

        const apiExtra =
          typeof apiResult === 'object' && apiResult !== null && !Array.isArray(apiResult)
            ? (apiResult as ApiJsonResponse)
            : {};
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                ...apiExtra,
                _stored: { x: object.x, y: object.y, width: object.width, height: object.height },
              }, null, 2),
            },
          ],
        };
      },
    }),
    remove_object: defineAction({
      description: '删除指定对象',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:removeObject',params:{objectId:p.objectId}}),null,2)}] }),
    }),
    update_object: defineAction({
      description: [
        '更新对象属性（位置/尺寸/填充/描边等）。',
        '',
        '✅ x/y/left/top 为**画布绝对坐标**，存什么就是什么，无隐式转换。',
        '⚠️ 如需在参考框内移动，先通过 get_canvas_info 获取 referenceFrameX/Y 再计算目标位置。',
      ].join('\n'),
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),updates:z.record(z.string(),z.unknown()) }),
      handler: async (p)=>{
        // ★ 方案 A：存什么就是什么，无隐式坐标转换
        const apiResult = await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:updateObject',params:{objectId:p.objectId,props:p.updates}});
        const apiExtra =
          typeof apiResult === 'object' && apiResult !== null && !Array.isArray(apiResult)
            ? (apiResult as ApiJsonResponse)
            : {};
        return { content:[{type:'text',text:JSON.stringify({...apiExtra, _note:'坐标为画布绝对坐标'},null,2)}] };
      },
    }),
    duplicate_object: defineAction({
      description: '复制对象并偏移放置',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),offsetX:z.number().optional(),offsetY:z.number().optional() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:duplicateObject',params:{objectId:p.objectId,offsetX:p.offsetX,offsetY:p.offsetY}}),null,2)}] }),
    }),
    reorder_object: defineAction({
      description: '调整对象图层位置',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),newIndex:z.number() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:reorderObject',params:{objectId:p.objectId,newIndex:p.newIndex}}),null,2)}] }),
    }),
    set_visibility: defineAction({
      description: '设置对象可见性',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),visible:z.boolean() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setVisibility',params:{objectId:p.objectId,visible:p.visible}}),null,2)}] }),
    }),
    set_lock: defineAction({
      description: '设置对象锁定',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),locked:z.boolean() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setLock',params:{objectId:p.objectId,locked:p.locked}}),null,2)}] }),
    }),
    rename_object: defineAction({
      description: '重命名对象',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),name:z.string() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:renameObject',params:{objectId:p.objectId,name:p.name}}),null,2)}] }),
    }),

    // ── Style ──
    set_fill: defineAction({
      description:
        '设置填充色。支持三种写法（按推荐顺序）：\n' +
        '  1) 结构化渐变对象 GradientDef：{type:"linear"|"radial", angle?, stops:[{color,offset}], cx?, cy?, r?}\n' +
        '     —— 与前端「素材编辑器 → 渐变编辑器 → 应用到选中图层」写入的格式 100% 一致，\n' +
        '     前端 SVG 渲染器（GradientDefs.tsx）和后端 cairo 导出（resolveGradientDef）共用同一几何，\n' +
        '     是「画布所见 = 导出 PNG = 设计稿展示」的唯一保证。\n' +
        '  2) 纯色字符串：#hex / rgb() / rgba() / 颜色关键字\n' +
        '  3) CSS 渐变字符串 "linear-gradient(135deg, #f472b6, #fb923c)"（兼容历史用法，\n' +
        '     角度公式与 (1) 一致）\n' +
        '传 null 表示清空填充。',
      schema: z.object({
        projectId: z.string(),
        materialId: z.string(),
        objectId: z.string(),
        fill: z.union([
          z.string(),
          z.null(),
          z.object({
            type: z.enum(['linear', 'radial', 'conic']),
            angle: z.number().optional(),
            stops: z.array(z.object({ color: z.string(), offset: z.number().min(0).max(1) })).min(1),
            cx: z.number().optional(),
            cy: z.number().optional(),
            r: z.number().optional(),
          }),
        ]),
      }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setFill',params:{objectId:p.objectId,fill:p.fill}}),null,2)}] }),
    }),
    set_stroke: defineAction({
      description: '设置描边颜色和宽度',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),color:z.string().optional(),width:z.number().optional() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setStroke',params:{objectId:p.objectId,color:p.color,width:p.width}}),null,2)}] }),
    }),
    set_opacity: defineAction({
      description: '设置透明度(0~1)',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),opacity:z.number().min(0).max(1) }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setOpacity',params:{objectId:p.objectId,opacity:p.opacity}}),null,2)}] }),
    }),
    set_shadow: defineAction({
      description: '设置或移除阴影(传null移除)',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        shadow:z.object({color:z.string().optional(),blur:z.number().optional(),offsetX:z.number().optional(),offsetY:z.number().optional()}).nullable().optional()
      }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setShadow',params:{objectId:p.objectId,shadow:p.shadow}}),null,2)}] }),
    }),
    set_blend_mode: defineAction({
      description: '设置混合模式（16种CSS blend-mode）',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        mode:z.enum(['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'])
      }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setBlendMode',params:{objectId:p.objectId,blendMode:p.mode}}),null,2)}] }),
    }),

    // ── Group ──
    group_objects: defineAction({
      description: '将多个对象编为一组',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectIds:z.array(z.string()).min(2),groupName:z.string().optional() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:groupObjects',params:{objectIds:p.objectIds,groupName:p.groupName}}),null,2)}] }),
    }),
    ungroup_objects: defineAction({
      description: '解散组',
      schema: z.object({ projectId:z.string(),materialId:z.string(),groupId:z.string() }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:ungroupObjects',params:{groupId:p.groupId}}),null,2)}] }),
    }),

    // ── Text ──
    update_text: defineAction({
      description: '更新文字对象的文本和字体属性',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        text:z.string().optional(),fontSize:z.number().optional(),fontFamily:z.string().optional(),
        fontWeight:z.union([z.string(),z.number()]).optional(),textAlign:z.enum(['left','center','right']).optional(),
        lineHeight:z.number().optional(),underline:z.boolean().optional(),fontStyle:z.enum(['normal','italic']).optional(),
      }),
      handler: async (raw) => {
        const { projectId, materialId, objectId, ...rest } = raw as {
          projectId: string;
          materialId: string;
          objectId: string;
          [key: string]: unknown;
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await api.executeMaterialOperation(projectId, materialId, {
                  type: 'me:updateText',
                  params: { objectId, ...rest },
                }),
                null,
                2,
              ),
            },
          ],
        };
      },
    }),

    // ── Undo/Redo ──
    undo: defineAction({ description:'撤销最近一次画布操作', schema:z.object({projectId:z.string(),materialId:z.string()}),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.materialUndo(p.projectId,p.materialId),null,2)}] }) }),
    redo: defineAction({ description:'重做撤销的操作', schema:z.object({projectId:z.string(),materialId:z.string()}),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.materialRedo(p.projectId,p.materialId),null,2)}] }) }),

    // ── Advanced Drawing ──
    draw_arcs: defineAction({
      description: '在参考框内绘制发散弧线装饰效果。自动读取画布信息计算参考框位置，使用画布绝对坐标存储。',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),
        count:z.number().min(2).max(30).optional(),
        origin:z.enum(['top-left','top-right','bottom-left','bottom-right']).optional(),
        colorStart:z.string().optional(),colorEnd:z.string().optional(),
        strokeWidth:z.number().optional(),opacity:z.number().min(0).max(1).optional(),
      }),
      handler: async (params) => {
        const {projectId,materialId,count,origin,colorStart,colorEnd,strokeWidth:sw,opacity}=params as {
          projectId:string;materialId:string;count?:number;origin?:'top-left'|'top-right'|'bottom-left'|'bottom-right';
          colorStart?:string;colorEnd?:string;strokeWidth?:number;opacity?:number;
        };
        const s=await api.getMaterialSchema(projectId,materialId) as CanvasSchema;
        const bw=s.canvasWidth??600,bh=s.canvasHeight??400;
        const rf=s.referenceFrame;
        const W=rf?.width??bw,H=rf?.height??bh;
        // 计算参考框在画布中的位置 → 直接作为对象 x/y（画布绝对坐标）
        const fx=(bw-W)/2,fy=(bh-H)/2;
        const N=count??12,o=origin??'top-left',c1=colorStart??'#1a3ab4',c2=colorEnd??'#32c896',swd=sw??1.5,a=opacity??0.85;
        const h2rgb=(h:string)=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
        const r1=h2rgb(c1),r2=h2rgb(c2);
        const ops:unknown[]=[];
        for(let i=0;i<N;i++){
          const t=N>1?i/(N-1):0;
          const cr=`rgba(${Math.round(r1[0]!+(r2[0]!-r1[0]!)*t)},${Math.round(r1[1]!+(r2[1]!-r1[1]!)*t)},${Math.round(r1[2]!+(r2[2]!-r1[2]!)*t)},${a})`;
          const sp=0.3+0.7*t;
          let pd = '';
          switch(o){
            case'top-left':pd=`M 0 0 Q ${(W*(0.1+t*0.35)).toFixed(1)} ${(H*sp).toFixed(1)} ${(W*sp).toFixed(1)} ${(H*(0.05+t*0.9)).toFixed(1)}`;break;
            case'top-right':pd=`M ${W} 0 Q ${(W*(0.9-t*0.35)).toFixed(1)} ${(H*sp).toFixed(1)} ${(W*(1-sp)).toFixed(1)} ${(H*(0.05+t*0.9)).toFixed(1)}`;break;
            case'bottom-left':pd=`M 0 ${H} Q ${(W*(0.1+t*0.35)).toFixed(1)} ${(H*(1-sp)).toFixed(1)} ${(W*sp).toFixed(1)} ${(H*(0.95-t*0.9)).toFixed(1)}`;break;
            case'bottom-right':pd=`M ${W} ${H} Q ${(W*(0.9-t*0.35)).toFixed(1)} ${(H*(1-sp)).toFixed(1)} ${(W*(1-sp)).toFixed(1)} ${(H*(0.95-t*0.9)).toFixed(1)}`;break;
            default:break;
          }
          ops.push({type:'me:addObject',params:{object:{type:'path',name:`arc-${String(i+1).padStart(2,'0')}`,x:fx,y:fy,width:W,height:H,fill:null,stroke:cr,strokeWidth:swd,pathData:pd}}});
        }
        const result=await api.executeMaterialBatch(projectId,materialId,ops);
        return { content:[{type:'text',text:JSON.stringify({success:true,message:`绘制了${N}条弧线`,result},null,2)}] };
      },
    }),
    clear_objects: defineAction({
      description: '清除画布上所有对象（保留默认框/参考框）。includeDefault=true则连默认框也删。',
      schema: z.object({ projectId:z.string(),materialId:z.string(),includeDefault:z.boolean().optional() }),
      handler: async (p)=>{
        const s=await api.getMaterialSchema(p.projectId,p.materialId) as CanvasSchema;
        const objs=s.objects??[];
        const defId=s.defaultElementId;
        const toDel=objs.filter(o=>p.includeDefault||o.id!==defId);
        if(toDel.length===0)return{content:[{type:'text',text:JSON.stringify({success:true,message:'已是空的'})}]};
        const ops=toDel.map(o=>({type:'me:removeObject'as const,params:{objectId:o.id}}));
        const result=await api.executeMaterialBatch(p.projectId,p.materialId,ops);
        return{content:[{type:'text',text:JSON.stringify({success:true,deletedCount:toDel.length,result},null,2)}]};
      },
    }),

    // ── CSS Tools (pure computation) ──
    generate_gradient_css: defineAction({
      description: '生成CSS渐变代码(linear/radial/conic)，纯计算无需画布',
      schema: z.object({
        type:z.enum(['linear','radial','conic']),colorStops:z.array(z.object({color:z.string(),position:z.number().min(0).max(1)})).min(2),
        angle:z.number().optional(),centerX:z.number().optional(),centerY:z.number().optional(),shape:z.enum(['circle','ellipse']).optional()
      }),
      handler: (args) => {
        const { type, colorStops, angle, centerX, centerY, shape } = args as {
          type: 'linear' | 'radial' | 'conic';
          colorStops: { color: string; position: number }[];
          angle?: number;
          centerX?: number;
          centerY?: number;
          shape?: 'circle' | 'ellipse';
        };
        const stops=colorStops.map((s)=>`${s.color} ${Math.round(s.position*100)}%`).join(', ');
        let css = '';
        switch(type){case'linear':css=`linear-gradient(${angle??180}deg,${stops})`;break;
          case'radial':css=`radial-gradient(${shape??'circle'} at ${Math.round((centerX??0.5)*100)}% ${Math.round((centerY??0.5)*100)}%,${stops})`;break;
          case'conic':css=`conic-gradient(from ${angle??0}deg at ${Math.round((centerX??0.5)*100)}% ${Math.round((centerY??0.5)*100)}%,${stops})`;break;}
        return{content:[{type:'text',text:JSON.stringify({css,property:'background',value:css},null,2)}]};
      },
    }),
    generate_shadow_css: defineAction({
      description: '生成CSS阴影代码(box-shadow/text-shadow)',
      schema: z.object({shadows:z.array(z.object({type:z.enum(['box-shadow','text-shadow']),x:z.number(),y:z.number(),blur:z.number(),spread:z.number().optional(),color:z.string(),inset:z.boolean().optional()})).min(1)}),
      handler: (args) => {
        const { shadows } = args as {
          shadows: Array<{
            type: 'box-shadow' | 'text-shadow';
            x: number;
            y: number;
            blur: number;
            spread?: number;
            color: string;
            inset?: boolean;
          }>;
        };
        const bp:string[]=[],tp:string[]=[];
        for(const s of shadows){if(s.type==='box-shadow')bp.push([s.inset?'inset':'',`${s.x}px`,`${s.y}px`,`${s.blur}px`,s.spread!=null?`${s.spread}px`:'',s.color].filter(Boolean).join(' '));else tp.push(`${s.x}px ${s.y}px ${s.blur}px ${s.color}`);}
        const r:Record<string,string>={};if(bp.length)r.boxShadow=bp.join(', ');if(tp.length)r.textShadow=tp.join(', ');
        return{content:[{type:'text',text:JSON.stringify(r,null,2)}]};
      },
    }),
    generate_filter_css: defineAction({
      description: '生成CSS filter代码，支持所有原生滤镜组合',
      schema: z.object({blur:z.number().optional(),brightness:z.number().optional(),contrast:z.number().optional(),grayscale:z.number().optional(),hueRotate:z.number().optional(),invert:z.number().optional(),opacity:z.number().optional(),saturate:z.number().optional(),sepia:z.number().optional(),dropShadow:z.string().optional()}),
      handler: (f) => {
        const fr = f as ApiJsonResponse;
        const parts:string[]=[];
        const map:Record<string,string>={blur:'blur(px)',brightness:'brightness',contrast:'contrast',grayscale:'grayscale',hueRotate:'hue-rotate(deg)',invert:'invert',opacity:'opacity',saturate:'saturate',sepia:'sepia'};
        Object.entries(map).forEach(([k,v])=>{if(fr[k]!==undefined)parts.push(`${v.replace('(px)','')}( ${String(fr[k])})`);});
        if(fr.dropShadow)parts.push(`drop-shadow(${String(fr.dropShadow)})`);
        return{content:[{type:'text',text:JSON.stringify({property:'filter',value:parts.join(' ')||'none'},null,2)}]};
      },
    }),
    generate_animation_css: defineAction({
      description: '生成CSS动画代码(@keyframes+animation简写)，支持预设或自定义关键帧',
      schema: z.object({
        name:z.string().optional(),duration:z.string().optional(),timingFunction:z.string().optional(),delay:z.string().optional(),
        iterationCount:z.union([z.string(),z.number()]).optional(),direction:z.enum(['normal','reverse','alternate','alternate-reverse']).optional(),
        fillMode:z.enum(['none','forwards','backwards','both']).optional(),
        keyframes:z.array(z.object({offset:z.number().min(0).max(1),styles:z.record(z.string(),z.union([z.string(),z.number()]))})).optional(),
        preset:z.enum(['fadeIn','fadeOut','slideInUp','slideInDown','slideInLeft','slideInRight','bounceIn','pulse','shake','spin','swing','tada']).optional(),
      }),
      handler: (args) => {
        const { name, duration, timingFunction, delay, iterationCount, direction, fillMode, keyframes, preset } = args as {
          name?: string;
          duration?: string;
          timingFunction?: string;
          delay?: string;
          iterationCount?: string | number;
          direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
          fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
          keyframes?: { offset: number; styles: Record<string, string | number> }[];
          preset?: string;
        };
        if(preset){return{content:[{type:'text',text:JSON.stringify({property:'animation',value:`${preset} ${duration??'0.6s'} ${timingFunction??'ease'} ${iterationCount??'1'} ${fillMode??'both'}`},null,2)}]}}
        const an=name??'customAnimation';const kfs=keyframes??[{offset:0,styles:{opacity:'0'}},{offset:1,styles:{opacity:'1'}}];
        const kr=kfs.map((kf: { offset: number; styles: Record<string, string | number> })=>{const l=kf.offset===0?'from':kf.offset===1?'to':`${Math.round(kf.offset*100)}%`;const ps=Object.entries(kf.styles).map(([k,v])=>`    ${k.replace(/[A-Z]/g,(m:string)=>`-${m.toLowerCase()}`)}: ${v};`).join('\n');return`  ${l}{\n${ps}\n}`}).join('\n');
        const kcss=`@keyframes ${an}\n{\n${kr}\n}`;
        const sh=[an,duration??'0.3s',timingFunction??'ease',delay??'0s',String(iterationCount??1),direction??'normal',fillMode??'none'].join(' ');
        return{content:[{type:'text',text:JSON.stringify({keyframesCSS:kcss,animation:sh},null,2)}]};
      },
    }),
    list_presets: defineAction({
      description: '列出素材编辑器所有预设（渐变、阴影等）',
      schema: z.object({ type:z.enum(['gradients','shadows','all']).optional() }),
      handler: async (_p)=>({ content:[{type:'text',text:JSON.stringify(await api.getMaterialEditorPresets(),null,2)}] }),
    }),

    // ── Design Integration ──
    apply_material_design: defineAction({
      description: '将素材编辑器的CSS属性集合应用到设计Schema的目标节点（素材编辑器↔设计编辑器的桥梁）',
      schema: z.object({ projectId:z.string(),nodeId:z.string(),styleUpdates:z.record(z.string(),z.union([z.string(),z.number()])) }),
      handler: async (p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeOperation(p.projectId,{type:'applyMaterialDesign',params:{nodeId:p.nodeId,styleUpdates:p.styleUpdates}}),null,2)}] }),
    }),

    // ── Server-side Export & Apply (MCP 独有能力) ──
    /**
     * 服务端渲染素材画布为 PNG → 上传到 design-api → 自动设置 exportedMaterialId
     *
     * 这是 MCP Server 独有的能力：不需要前端 fabric.js 渲染，
     * 直接在 Node.js 侧用 canvas 包将 canvasJSON 渲染成图片。
     */
    export_and_apply: defineAction({
      description: [
        '服务端导出素材为 PNG 并应用到设计节点（MCP 独有能力）。',
        '',
        '完整流程：get_schema → 按参考框裁剪渲染 → PNG → 上传 → applyMaterialDesign → **写入 node_material_slots 槽位** → 更新素材工程 targetNodeId',
        '',
        '⚠️ 绑定约定（沉淀到 MCP，与前端「设计素材… / 添加素材」一致）：',
        '- **槽位 `cssTarget` 与写入样式一致**：槽为 `background-image` 则写节点背景；槽为 `border-image` 则写 `borderImage` 及配套 border（与前端 ExportBar 一致）。**禁止**在本 action 内偷偷改槽位的 `cssTarget`；改库表只做显式 migration / `material_slot` update。',
        '- 仅 `execute_operations_batch` 里手写 `applyMaterialDesign` 而不建槽位 → 右键「设计素材…」可能打不开或行为异常；**请优先用本 action**，或手动调 `material-slots` API。',
        '- 导出 PNG 的尺寸 = **referenceFrame 宽×高**（不是整张大画布），与参考框内所见一致；`apply` 的样式字段随槽位分支而定。',
        '',
        '⚠️ 其他要点：',
        '- getMaterialSchema 用 /materials/{id}/schema；正确操作类型是 applyMaterialDesign（与 ExportBar 一致），不是 updateStyle',
        '- nodeId 必传，否则只导出不应用',
        '',
        '**透明 / 导出注意**：PNG 保留 alpha；JPEG 无透明。导出前画布背景建议 transparent，避免默认大框不透明白底导致 PNG 整块发白。',
        '',
        '**与编辑器不一致时的表现**：此前服务端渲染未读 `pathData`（只读 `path`）、未展开 `group` 子对象、未读 `rotation`（只读 `angle`），会导致 MCP 导出「空白/缺一块」，而你在前端点「应用」走 SVG 序列化则正常。',
      ].join('\n'),
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        materialId: z.string().describe('素材工程 ID（即 materialProjectId）'),
        nodeId: z.string().describe('目标节点 ID（必须传，用于 applyMaterialDesign）'),
        format: z.enum(['png','jpeg']).optional().describe('默认 png'),
        quality: z.number().min(0).max(100).optional().describe('jpeg 质量，默认 92'),
        scale: z.number().min(0.5).max(4).optional().describe('缩放倍数，默认 2x 高清'),
      }),
      handler: async (p)=>{
        const { projectId, materialId, nodeId, format = 'png', quality = 92, scale: scaleIn = 2 } = p as ApiJsonResponse & {
          projectId: string;
          materialId: string;
          nodeId: string;
          format?: 'png' | 'jpeg';
          quality?: number;
          scale?: number;
        };
        const scale = Number(scaleIn);

        // 1. 获取素材 Schema（⚠️ 必须用 /materials/{id}/schema 端点）
        const schema = await api.getMaterialSchema(projectId,materialId) as CanvasSchema;
        const cw = schema.canvasWidth??600;
        const ch = schema.canvasHeight??400;
        const bg = schema.backgroundColor??'#ffffff';
        const objects = schema.objects ?? [];

        if(objects.length===0){
          return{content:[{type:'text',text:JSON.stringify({error:'画布对象数为 0，无法导出空素材',hint:'请先在画布上添加对象再调用此工具',schemaKeys:Object.keys(schema)},null,2)}]};
        }

        // 2. 动态加载 canvas 包
        let createCanvas: typeof import('canvas').createCanvas;
        try{
          const mod = await import('canvas');
          createCanvas = mod.createCanvas;
        }catch(e){
          return{content:[{type:'text',text:JSON.stringify({error:`canvas 模块不可用: ${(e as Error).message}`,hint:'运行 pnpm rebuild canvas 后重试'},null,2)}]};
        }

        // 3. 计算坐标偏移（前端画布坐标 → 后端局部坐标）
        //    schema 中对象的 x/y 是前端大画布坐标，需要减去 referenceFrame 偏移才能正确渲染到 cw×ch 画布上
        const rf = schema.referenceFrame;
        const rw = rf?.width ?? cw;
        const rh = rf?.height ?? ch;
        // ★ 使用实际画布尺寸计算参考框偏移（反向：存储坐标→局部坐标）
        const rfx = (cw - rw) / 2;
        const rfy = (ch - rh) / 2;

        // 导出像素尺寸 = **参考框**（与参考框裁剪一致）；应用到节点时的 background-size 见下方 styleUpdates
        const w = Math.round(rw * scale);
        const h = Math.round(rh * scale);
        const cv = createCanvas(w,h);
        const ctx = cv.getContext('2d');
        if (!ctx) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: '无法获取 canvas 2d 上下文' }, null, 2) }] };
        }
        ctx.scale(scale, scale);

        if(bg && bg !== 'transparent'){
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, rw, rh);
        }

        // 🔒 将每个对象从「前端画布坐标」转换为「参考框内局部坐标」后再渲染到 rw×rh 画布
        const flatObjects = expandMaterialGroupsForServerRender(objects);
        for(const rawObj of flatObjects){
          // 浅拷贝，避免修改原 schema 对象
          const obj = { ...rawObj };
          if(obj.x != null) obj.x = Number(obj.x) - rfx;
          if(obj.y != null) obj.y = Number(obj.y) - rfy;
          // fabric.js 也可能用 left/top 字段
          if(obj.left != null) obj.left = Number(obj.left) - rfx;
          if(obj.top != null) obj.top = Number(obj.top) - rfy;
          await renderObject(ctx, obj, rw, rh);
        }

        // 4. 导出 Buffer
        const buf = format==='png'
          ? cv.toBuffer('image/png')
          : cv.toBuffer('image/jpeg',{quality});

        // 5. 上传到 export 端点
        const uploadResult = await api.uploadExportedMaterial(projectId,materialId,buf,
          `material-export.${format}`) as ApiJsonResponse;
        const imgUrl = uploadResult?.url as string|undefined;
        if(!imgUrl){
          return{content:[{type:'text',text:JSON.stringify({error:'上传成功但未返回 url',uploadResult},null,2)}]};
        }

        // 6. 按槽位 cssTarget 写样式（与前端 ExportBar 一致）；不改槽 metadata
        let slots: MaterialSlotRecordDto[] = [];
        try {
          slots = await listMaterialSlotsByNode(projectId, nodeId);
        } catch {
          slots = [];
        }
        const slotForMaterial = slots.find((s) => s.materialProjectId === materialId);
        const applyCssTarget = slotForMaterial?.cssTarget ?? 'background-image';

        // ★ 智能检测 backgroundColor：优先用画布背景色，其次检测首个大尺寸底形填充色
        let detectedBgColor = (bg && bg !== 'transparent') ? bg : null;
        if (!detectedBgColor && objects.length > 0) {
          // 找到尺寸最大且可见的 rect/ellipse 作为"底形"，取其 fill 作为 backgroundColor
          let maxArea = 0;
          for (const obj of objects) {
            if (!obj.visible && obj.visible !== undefined) continue;
            const t = (obj.type as string) ?? '';
            if (t !== 'rect' && t !== 'ellipse') continue;
            const ow = Number(obj.width ?? obj.r ?? 0);
            const oh = Number(obj.height ?? obj.ry ?? 0);
            if (ow * oh > maxArea) {
              maxArea = ow * oh;
              const fill = obj.fill as string | null | undefined;
              if (fill && typeof fill === 'string' && !fill.startsWith('url(') && !fill.includes('gradient')) {
                detectedBgColor = fill;
              }
            }
          }
        }

        const applyResult = await api.executeOperation(projectId, {
          type: 'applyMaterialDesign',
          params:
            applyCssTarget === 'border-image'
              ? {
                  nodeId,
                  clearStyleKeys: ['border'],
                  styleUpdates: {
                    borderImage: `url("${imgUrl}")`,
                    borderWidth: 3,
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    borderImageSlice: 1,
                    borderImageRepeat: 'stretch',
                    boxSizing: 'border-box',
                  },
                  materialProjectId: materialId,
                }
              : {
                  nodeId,
                  clearStyleKeys: ['backgroundColor', 'boxShadow', 'background'],
                  styleUpdates: {
                    // ⚠️ 不再写入 backgroundColor！backgroundColor 由用户通过右侧面板控制。
                    // 素材 PNG/SVG 应该是透明底的，让用户设置的 backgroundColor 能透出来。
                    // 如果之前写了 backgroundColor（旧行为），用 clearStyleKeys 清除它
                    backgroundImage: `url("${imgUrl}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'no-repeat',
                    border: 'none',
                    borderWidth: 0,
                    boxSizing: 'border-box',
                    backgroundClip: 'border-box',
                    backgroundOrigin: 'border-box',
                    // ✅ 移除硬编码 boxShadow：光晕等效果应由调用者按需添加，不应在此写死
                  },
                  materialProjectId: materialId,
                },
        });

        let slotBinding: { ok: boolean; action?: string; slotId?: string; error?: string } = { ok: false };
        try {
          slotBinding = await ensureMaterialNodeBinding(projectId, nodeId, materialId, {
            preferredCssTarget: applyCssTarget,
          });
        } catch (e) {
          slotBinding = { ok: false, error: (e as Error).message };
        }

        try{
          await updateMaterialProject(projectId, materialId, { targetNodeId: nodeId });
        }catch{
          // 非致命：部分环境可能无写权限
        }

        const result = {
          success: true,
          message: `✅ 素材已导出 (${format}, ${w}×${h} ref ${rw}×${rh}, ${buf.length}B) 并应用到节点 ${nodeId}（${applyCssTarget}）`,
          imageUrl: imgUrl,
          assetId: uploadResult.assetId,
          operationApplied: 'applyMaterialDesign' as string,
          applyCssTarget,
          applyResult,
          slotBinding,
        };
        return { content: [{ type:'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
