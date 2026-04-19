/**
 * 素材画布 — 合并原 ~30 个 me_* 工具为 1 个
 *
 * 覆盖：Schema/信息、画布管理、对象 CRUD、样式、组操作、文字、
 *      撤销重做、高级绘图（弧线/清空）、CSS 计算工具、设计集成、服务端导出
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import * as api from '../../api-client.js';

// ── 服务端渲染辅助函数 ──

/**
 * 将 group 递归展开为「画布绝对坐标」的扁平对象列表。
 * Schema 里子对象的 x/y 相对组原点；服务端 renderObject 不处理 group，此前整组会漏画。
 */
function expandMaterialGroupsForServerRender(
  objects: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const walk = (list: Array<Record<string, unknown>>, parentX: number, parentY: number) => {
    for (const raw of list) {
      const t = String(raw.type ?? '');
      if (t === 'group') {
        const gx = Number(raw.x ?? 0) + parentX;
        const gy = Number(raw.y ?? 0) + parentY;
        const kids = (raw.children as Array<Record<string, unknown>> | undefined) ?? [];
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
  ctx: CanvasRenderingContext2D,
  obj: Record<string, unknown>,
  _canvasW: number,
  _canvasH: number,
): Promise<void> {
  const type = (obj.type as string) ?? '';
  const left = Number(obj.left??obj.x??0);
  const top = Number(obj.top??obj.y??0);
  const width = Number(obj.width??obj.w??0);
  const height = Number(obj.height??obj.h??0);
  const fill = obj.fill as string|undefined;
  const stroke = obj.stroke as string|undefined;
  const strokeWidth = Number(obj.strokeWidth??(stroke?1:0));
  const opacity = Number(obj.opacity??1);
  const angleDeg = Number(obj.angle ?? obj.rotation ?? 0);
  const angle = (angleDeg * Math.PI) / 180;
  const originX = String(obj.originX??'left');
  const originY = String(obj.originY??'top');
  const scaleX = Number(obj.scaleX??1);
  const scaleY = Number(obj.scaleY??1);

  if(opacity===0) return; // 完全透明，跳过
  if(obj.visible===false) return;

  ctx.save();
  ctx.globalAlpha=opacity;

  // 计算实际绘制起点（考虑 originX/Y）
  let ox = left, oy = top;
  if(originX==='center') ox-=width/2;
  else if(originX==='right') ox-=width;
  if(originY==='center') oy-=height/2;
  else if(originY==='bottom') oy-=height;

  // 应用变换（旋转 + 缩放）
  const cx = ox+width*scaleX/2, cy=oy+height*scaleY/2;
  ctx.translate(cx,cy);
  ctx.rotate(angle);
  ctx.scale(scaleX,scaleY);
  ctx.translate(-cx+ox+width/2,-cy+oy+height/2);

  // 填充色处理（支持渐变）
  if(fill && fill!=='null' && fill!=='none' && fill!=='transparent'){
    ctx.fillStyle = resolveFill(ctx,fill,width,height,ox,oy);
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
          const p=points[i]!;
          const px=ox+p.x*(width/(obj._width??width));
          const py=oy+p.y*(height/(obj._height??height));
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();if(strokeWidth>0)ctx.stroke();
      }
      break;
    }
    case 'star':{
      const pts=obj.points as number??5;
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
    case 'textbox':
    case 'text':
    case 'i-text':{
      const text=(obj.text as string)??'';
      const fontSize=Number(obj.fontSize??16)*scaleX;
      const fontFamily=(obj.fontFamily as string)??'-apple-system, sans-serif';
      const fontWeight=String(obj.fontWeight??'normal');
      const textAlign=(obj.textAlign as string)??'left';
      ctx.font=`${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle=fill??'#000000';
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
          ctx.drawImage(img,ox,oy,width,height);
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

/** 解析填充色：支持纯色 / CSS linear-gradient / rgba */
function resolveFill(ctx:CanvasRenderingContext2D,fill:string,w:number,h:number,x:number,y:string|number):string|CanvasGradient|CanvasPattern{
  if(!fill)return '#000000';
  // 检查是否为线性渐变
  const lgMatch=fill.match(/linear-gradient\s*\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\s*\)/i);
  if(lgMatch){
    const deg=parseFloat(lgMatch[1]!)%360;
    const stopsStr=lgMatch[2]!;
    // 计算渐变线端点
    const rad=((deg-90)*Math.PI)/180;
    const cx=x+w/2,cy=Number(y)+h/2,len=Math.sqrt(w*w+h*h)/2;
    const grad=ctx.createLinearGradient(cx-Math.cos(rad)*len,cy-Math.sin(rad)*len,cx+Math.cos(rad)*len,cy+Math.sin(rad)*len);
    parseColorStops(stopsStr).forEach(s=>grad.addColorStop(s.pos,s.color));
    return grad;
  }
  return fill;
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
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rx:number,ry:number){
  ctx.beginPath();roundRectPath(ctx,x,y,w,h,rx,ry);ctx.fill();
}
function roundRectPath(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rx:number,ry:number){
  ctx.moveTo(x+rx,y);
  ctx.arcTo(x+w,y,x+w,y+h,ry);
  ctx.arcTo(x+w,y+h,x,y+h,rx);
  ctx.arcTo(x,y+h,x,y,rx);
  ctx.arcTo(x,y,x+w,y,ry);
  ctx.closePath();
}

/** 星形 */
function drawStar(ctx:CanvasRenderingContext2D,cx:number,cy:number,points:number,innerR:number,outerR:number){
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
function renderSVGPath(ctx:CanvasRenderingContext2D,pathData:string,ox:number,oy:number,_w?:number,_h?:number){
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
    get_schema: {
      description: '获取素材工程完整 Schema。理解画布状态的首要工具。',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => ({ content: [{ type:'text', text: JSON.stringify(await api.getMaterialSchema(p.projectId, p.materialId), null, 2) }] }),
    },
    get_canvas_info: {
      description: '获取画布坐标信息摘要（referenceFrameX/Y 用于 add_object 的 x/y）。操作画布前必须调用。',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => {
        const s = await api.getMaterialSchema(p.projectId, p.materialId) as Record<string, unknown>;
        const bw = (s.canvasWidth as number)??600, bh = (s.canvasHeight as number)??400;
        const rf = s.referenceFrame as {enabled?:boolean;width?:number;height?:number}|undefined;
        const rw = rf?.width??bw, rh = rf?.height??bh;
        const P=400; const fw=Math.max(1200,rw+P*2); const fh=Math.max(900,rh+P*2);
        return { content: [{ type:'text', text: JSON.stringify({
          backendCanvasWidth:bw, backendCanvasHeight:bh,
          frontendCanvasWidth:fw, frontendCanvasHeight:fh,
          referenceFrameWidth:rw, referenceFrameHeight:rh,
          referenceFrameEnabled:rf?.enabled??true,
          referenceFrameX:(fw-rw)/2, referenceFrameY:(fh-rh)/2,
          backgroundColor:s.backgroundColor??'#ffffff',
          objectCount:((s.objects as unknown[])??[]).length,
          defaultElementId:s.defaultElementId??null,
        }, null, 2) }] };
      },
    },

    // ── Canvas Management ──
    set_background_color: {
      description: '设置画布背景色',
      schema: z.object({ projectId:z.string(), materialId:z.string(), color:z.string() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setBackgroundColor',params:{color:p.color}}),null,2)}] }),
    },
    resize_canvas: {
      description: '调整画布尺寸',
      schema: z.object({ projectId:z.string(), materialId:z.string(), width:z.number().positive(), height:z.number().positive() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:resizeCanvas',params:{width:p.width,height:p.height}}),null,2)}] }),
    },
    resize_reference_frame: {
      description: '调整参考框尺寸',
      schema: z.object({ projectId:z.string(), materialId:z.string(), width:z.number().positive(), height:z.number().positive(), enabled:z.boolean().optional() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:resizeReferenceFrame',params:{width:p.width,height:p.height,enabled:p.enabled}}),null,2)}] }),
    },

    // ── Object CRUD ──
    add_object: {
      description: [
        '在画布上添加对象(rect/ellipse/polygon/star/path/line/textbox/image)。',
        '',
        '✅ x/y 是参考框内的**局部坐标**（0 ~ canvasWidth, 0 ~ canvasHeight），MCP 内部会自动转换为前端画布坐标。',
        '例如：参考框 280×56，要在左上角放矩形 → x=0, y=0；居中 → x=140, y=28',
        'pathData 同样使用局部坐标。',
        '',
        '推荐 stroke 色: #1a3ab4 #32c896 #333333 #d4389a',
      ].join('\n'),
      schema: z.object({
        projectId:z.string(),materialId:z.string(),
        type:z.enum(['rect','ellipse','polygon','star','path','line','textbox','image']),
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
      }),
      handler: async({projectId,materialId,...op})=>{
        // ⚠️ 坐标转换：局部坐标 → 前端画布坐标（API 要求前端画布坐标）
        const schema = await api.getMaterialSchema(projectId,materialId) as Record<string,unknown>;
        const bw = (schema.canvasWidth as number)??600;
        const bh = (schema.canvasHeight as number)??400;
        const rf = schema.referenceFrame as {width?:number;height?:number}|undefined;
        const rw = rf?.width??bw, rh = rf?.height??bh;
        const P = 400;
        const fw = Math.max(1200,rw + P*2), fh = Math.max(900,rh + P*2);
        const rfx = (fw - rw)/2, rfy = (fh - rh)/2;

        // 记录原始局部坐标（用于校验）
        const localX = op.x ?? 0;
        const localY = op.y ?? 0;
        const localW = op.width ?? 0;
        const localH = op.height ?? 0;

        const adjustedOp = { ...op };
        if(adjustedOp.x != null) adjustedOp.x = Number(adjustedOp.x) + rfx;
        if(adjustedOp.y != null) adjustedOp.y = Number(adjustedOp.y) + rfy;

        const apiResult = await api.executeMaterialOperation(projectId,materialId,{type:'me:addObject',params:{object:adjustedOp}});

        // ── 位置校验：对象是否在参考框内 ──
        const objRight = localX + localW;
        const objBottom = localY + localH;
        let inBounds = true;
        let boundsError: string | undefined;

        if(localX < 0 || localY < 0 || objRight > rw || objBottom > rh){
          inBounds = false;
          const issues:string[] = [];
          if(localX < 0) issues.push(`左边界溢出：x=${localX} < 0`);
          if(localY < 0) issues.push(`上边界溢出：y=${localY} < 0`);
          if(objRight > rw) issues.push(`右边界溢出：x+width=${objRight} > 参考框宽${rw}`);
          if(objBottom > rh) issues.push(`下边界溢出：y+height=${objBottom} > 参考框高${rh}`);
          boundsError = `对象超出参考框(${rw}×${rh})！${issues.join('；')}。建议调整 x/y/width/height 使其在 [0,0] ~ [${rw},${rh}] 范围内。`;
        }

        return {
          content:[{
            type:'text',
            text:JSON.stringify({
              ...apiResult,
              inBounds,
              ...(boundsError ? { error: boundsError } : {}),
              _position:{
                local:{x:localX, y:localY, width:localW, height:localH},
                referenceFrame:{ width:rw, height:rh },
                converted:{x:adjustedOp.x, y:adjustedOp.y},
              },
            },null,2),
          }],
        };
      },
    },
    remove_object: {
      description: '删除指定对象',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:removeObject',params:{objectId:p.objectId}}),null,2)}] }),
    },
    update_object: {
      description: [
        '更新对象属性（位置/尺寸/填充/描边等）。',
        '',
        '✅ x/y/left/top 等坐标属性使用**局部坐标**（0 ~ canvasWidth, 0 ~ canvasHeight），MCP 内部自动转换。',
        '与 add_object 坐标规则一致：参考框内局部坐标 → 自动加偏移为前端画布坐标。',
      ].join('\n'),
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),updates:z.record(z.string(),z.unknown()) }),
      handler: async(p)=>{
        // ⚠️ 同样需要坐标转换
        const schema = await api.getMaterialSchema(p.projectId,p.materialId) as Record<string,unknown>;
        const bw = (schema.canvasWidth as number)??600;
        const bh = (schema.canvasHeight as number)??400;
        const rf = schema.referenceFrame as {width?:number;height?:number}|undefined;
        const rw = rf?.width??bw, rh = rf?.height??bh;
        const P = 400;
        const fw = Math.max(1200,rw + P*2), fh = Math.max(900,rh + P*2);
        const rfx = (fw - rw)/2, rfy = (fh - rh)/2;

        const adjustedUpdates = { ...p.updates };
        for(const key of ['x','y','left','top']){
          if(adjustedUpdates[key] != null) adjustedUpdates[key] = Number(adjustedUpdates[key]) + rfx;
        }
        // right/bottom 如果有的话也处理
        for(const key of ['right','bottom']){
          if(adjustedUpdates[key] != null) adjustedUpdates[key] = Number(adjustedUpdates[key]) + rfy;
        }

        const apiResult = await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:updateObject',params:{objectId:p.objectId,props:adjustedUpdates}});

        // ── 位置校验：如果更新包含坐标，检查是否在参考框内 ──
        let inBounds: boolean | undefined;
        let boundsError: string | undefined;
        const coordKeys = ['x','y','left','top'] as const;
        const hasCoordUpdate = coordKeys.some(k => p.updates[k] != null);
        if(hasCoordUpdate){
          // 尝试从更新值或已有对象推断位置（简化版：只检查传入的坐标）
          const ux = Number(p.updates.x ?? p.updates.left ?? 0);
          const uy = Number(p.updates.y ?? p.updates.top ?? 0);
          const uw = Number(p.updates.width ?? 0);
          const uh = Number(p.updates.height ?? 0);
          const or = ux + uw, ob = uy + uh;
          if(ux < 0 || uy < 0 || or > rw || ob > rh){
            inBounds = false;
            const issues:string[] = [];
            if(ux < 0) issues.push(`左边界溢出：x=${ux} < 0`);
            if(uy < 0) issues.push(`上边界溢出：y=${uy} < 0`);
            if(or > rw) issues.push(`右边界溢出：x+width=${or} > 参考框宽${rw}`);
            if(ob > uh && ob > rh) issues.push(`下边界溢出：y+height=${ob} > 参考框高${rh}`);
            boundsError = `对象超出参考框(${rw}×${rh})！${issues.join('；')}`;
          } else {
            inBounds = true;
          }
        }

        return {
          content:[{
            type:'text',
            text:JSON.stringify({
              ...apiResult,
              ...(inBounds !== undefined ? { inBounds } : {}),
              ...(boundsError ? { error: boundsError } : {}),
            },null,2),
          }],
        };
      },
    },
    duplicate_object: {
      description: '复制对象并偏移放置',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),offsetX:z.number().optional(),offsetY:z.number().optional() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:duplicateObject',params:{objectId:p.objectId,offsetX:p.offsetX,offsetY:p.offsetY}}),null,2)}] }),
    },
    reorder_object: {
      description: '调整对象图层位置',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),newIndex:z.number() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:reorderObject',params:{objectId:p.objectId,newIndex:p.newIndex}}),null,2)}] }),
    },
    set_visibility: {
      description: '设置对象可见性',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),visible:z.boolean() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setVisibility',params:{objectId:p.objectId,visible:p.visible}}),null,2)}] }),
    },
    set_lock: {
      description: '设置对象锁定',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),locked:z.boolean() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setLock',params:{objectId:p.objectId,locked:p.locked}}),null,2)}] }),
    },
    rename_object: {
      description: '重命名对象',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),name:z.string() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:renameObject',params:{objectId:p.objectId,name:p.name}}),null,2)}] }),
    },

    // ── Style ──
    set_fill: {
      description: '设置填充色（支持纯色/CSS渐变）',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),fill:z.string() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setFill',params:{objectId:p.objectId,fill:p.fill}}),null,2)}] }),
    },
    set_stroke: {
      description: '设置描边颜色和宽度',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),color:z.string().optional(),width:z.number().optional() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setStroke',params:{objectId:p.objectId,color:p.color,width:p.width}}),null,2)}] }),
    },
    set_opacity: {
      description: '设置透明度(0~1)',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectId:z.string(),opacity:z.number().min(0).max(1) }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setOpacity',params:{objectId:p.objectId,opacity:p.opacity}}),null,2)}] }),
    },
    set_shadow: {
      description: '设置或移除阴影(传null移除)',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        shadow:z.object({color:z.string().optional(),blur:z.number().optional(),offsetX:z.number().optional(),offsetY:z.number().optional()}).nullable().optional()
      }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setShadow',params:{objectId:p.objectId,shadow:p.shadow}}),null,2)}] }),
    },
    set_blend_mode: {
      description: '设置混合模式（16种CSS blend-mode）',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        mode:z.enum(['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'])
      }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:setBlendMode',params:{objectId:p.objectId,blendMode:p.mode}}),null,2)}] }),
    },

    // ── Group ──
    group_objects: {
      description: '将多个对象编为一组',
      schema: z.object({ projectId:z.string(),materialId:z.string(),objectIds:z.array(z.string()).min(2),groupName:z.string().optional() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:groupObjects',params:{objectIds:p.objectIds,groupName:p.groupName}}),null,2)}] }),
    },
    ungroup_objects: {
      description: '解散组',
      schema: z.object({ projectId:z.string(),materialId:z.string(),groupId:z.string() }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(p.projectId,p.materialId,{type:'me:ungroupObjects',params:{groupId:p.groupId}}),null,2)}] }),
    },

    // ── Text ──
    update_text: {
      description: '更新文字对象的文本和字体属性',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),objectId:z.string(),
        text:z.string().optional(),fontSize:z.number().optional(),fontFamily:z.string().optional(),
        fontWeight:z.union([z.string(),z.number()]).optional(),textAlign:z.enum(['left','center','right']).optional(),
        lineHeight:z.number().optional(),underline:z.boolean().optional(),fontStyle:z.enum(['normal','italic']).optional(),
      }),
      handler: async({projectId,materialId,objectId,...rest})=>({ content:[{type:'text',text:JSON.stringify(await api.executeMaterialOperation(projectId,materialId,{type:'me:updateText',params:{objectId,...rest}}),null,2)}] }),
    },

    // ── Undo/Redo ──
    undo: { description:'撤销最近一次画布操作', schema:z.object({projectId:z.string(),materialId:z.string()}),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.materialUndo(p.projectId,p.materialId),null,2)}] }) },
    redo: { description:'重做撤销的操作', schema:z.object({projectId:z.string(),materialId:z.string()}),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.materialRedo(p.projectId,p.materialId),null,2)}] }) },

    // ── Advanced Drawing ──
    draw_arcs: {
      description: '在参考框内绘制发散弧线装饰效果。自动计算坐标和颜色渐变。',
      schema: z.object({
        projectId:z.string(),materialId:z.string(),
        count:z.number().min(2).max(30).optional(),
        origin:z.enum(['top-left','top-right','bottom-left','bottom-right']).optional(),
        colorStart:z.string().optional(),colorEnd:z.string().optional(),
        strokeWidth:z.number().optional(),opacity:z.number().min(0).max(1).optional(),
      }),
      handler: async(params)=>{
        const {projectId,materialId,count,origin,colorStart,colorEnd,strokeWidth:sw,opacity}=params;
        const s=await api.getMaterialSchema(projectId,materialId) as Record<string,unknown>;
        const bw=(s.canvasWidth as number)??600,bh=(s.canvasHeight as number)??400;
        const rf=s.referenceFrame as {width?:number;height?:number}|undefined;
        const W=rf?.width??bw,H=rf?.height??bh;const P=400;
        const cw=Math.max(1200,W+P*2),ch=Math.max(900,H+P*2);
        const fx=(cw-W)/2,fy=(ch-H)/2;
        const N=count??12,o=origin??'top-left',c1=colorStart??'#1a3ab4',c2=colorEnd??'#32c896',swd=sw??1.5,a=opacity??0.85;
        const h2rgb=(h:string)=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
        const r1=h2rgb(c1),r2=h2rgb(c2);
        const ops:unknown[]=[];
        for(let i=0;i<N;i++){
          const t=N>1?i/(N-1):0;
          const cr=`rgba(${Math.round(r1[0]!+(r2[0]!-r1[0]!)*t)},${Math.round(r1[1]!+(r2[1]!-r1[1]!)*t)},${Math.round(r1[2]!+(r2[2]!-r1[2]!)*t)},${a})`;
          const sp=0.3+0.7*t;let pd:string;
          switch(o){
            case'top-left':pd=`M 0 0 Q ${(W*(0.1+t*0.35)).toFixed(1)} ${(H*sp).toFixed(1)} ${(W*sp).toFixed(1)} ${(H*(0.05+t*0.9)).toFixed(1)}`;break;
            case'top-right':pd=`M ${W} 0 Q ${(W*(0.9-t*0.35)).toFixed(1)} ${(H*sp).toFixed(1)} ${(W*(1-sp)).toFixed(1)} ${(H*(0.05+t*0.9)).toFixed(1)}`;break;
            case'bottom-left':pd=`M 0 ${H} Q ${(W*(0.1+t*0.35)).toFixed(1)} ${(H*(1-sp)).toFixed(1)} ${(W*sp).toFixed(1)} ${(H*(0.95-t*0.9)).toFixed(1)}`;break;
            case'bottom-right':pd=`M ${W} ${H} Q ${(W*(0.9-t*0.35)).toFixed(1)} ${(H*(1-sp)).toFixed(1)} ${(W*(1-sp)).toFixed(1)} ${(H*(0.95-t*0.9)).toFixed(1)}`;break;
          }
          ops.push({type:'me:addObject',params:{object:{type:'path',name:`arc-${String(i+1).padStart(2,'0')}`,x:fx,y:fy,width:W,height:H,fill:null,stroke:cr,strokeWidth:swd,pathData:pd}}});
        }
        const result=await api.executeMaterialBatch(projectId,materialId,ops);
        return { content:[{type:'text',text:JSON.stringify({success:true,message:`绘制了${N}条弧线`,result},null,2)}] };
      },
    },
    clear_objects: {
      description: '清除画布上所有对象（保留默认框/参考框）。includeDefault=true则连默认框也删。',
      schema: z.object({ projectId:z.string(),materialId:z.string(),includeDefault:z.boolean().optional() }),
      handler: async(p)=>{
        const s=await api.getMaterialSchema(p.projectId,p.materialId) as Record<string,unknown>;
        const objs=(s.objects as Array<{id:string}>)??[];
        const defId=s.defaultElementId as string|undefined;
        const toDel=objs.filter(o=>p.includeDefault||o.id!==defId);
        if(toDel.length===0)return{content:[{type:'text',text:JSON.stringify({success:true,message:'已是空的'})}]};
        const ops=toDel.map(o=>({type:'me:removeObject'as const,params:{objectId:o.id}}));
        const result=await api.executeMaterialBatch(p.projectId,p.materialId,ops);
        return{content:[{type:'text',text:JSON.stringify({success:true,deletedCount:toDel.length,result},null,2)}]};
      },
    },

    // ── CSS Tools (pure computation) ──
    generate_gradient_css: {
      description: '生成CSS渐变代码(linear/radial/conic)，纯计算无需画布',
      schema: z.object({
        type:z.enum(['linear','radial','conic']),colorStops:z.array(z.object({color:z.string(),position:z.number().min(0).max(1)})).min(2),
        angle:z.number().optional(),centerX:z.number().optional(),centerY:z.number().optional(),shape:z.enum(['circle','ellipse']).optional()
      }),
      handler:({type,colorStops,angle,centerX,centerY,shape})=>{
        const stops=colorStops.map(s=>`${s.color} ${Math.round(s.position*100)}%`).join(', ');let css:string;
        switch(type){case'linear':css=`linear-gradient(${angle??180}deg,${stops})`;break;
          case'radial':css=`radial-gradient(${shape??'circle'} at ${Math.round((centerX??0.5)*100)}% ${Math.round((centerY??0.5)*100)}%,${stops})`;break;
          case'conic':css=`conic-gradient(from ${angle??0}deg at ${Math.round((centerX??0.5)*100)}% ${Math.round((centerY??0.5)*100)}%,${stops})`;break;}
        return{content:[{type:'text',text:JSON.stringify({css,property:'background',value:css},null,2)}]};
      },
    },
    generate_shadow_css: {
      description: '生成CSS阴影代码(box-shadow/text-shadow)',
      schema: z.object({shadows:z.array(z.object({type:z.enum(['box-shadow','text-shadow']),x:z.number(),y:z.number(),blur:z.number(),spread:z.number().optional(),color:z.string(),inset:z.boolean().optional()})).min(1)}),
      handler:({shadows})=>{
        const bp:string[]=[],tp:string[]=[];
        for(const s of shadows){if(s.type==='box-shadow')bp.push([s.inset?'inset':'',`${s.x}px`,`${s.y}px`,`${s.blur}px`,s.spread!=null?`${s.spix}px`:'',s.color].filter(Boolean).join(' '));else tp.push(`${s.x}px ${s.y}px ${s.blur}px ${s.color}`);}
        const r:Record<string,string>={};if(bp.length)r.boxShadow=bp.join(', ');if(tp.length)r.textShadow=tp.join(', ');
        return{content:[{type:'text',text:JSON.stringify(r,null,2)}]};
      },
    },
    generate_filter_css: {
      description: '生成CSS filter代码，支持所有原生滤镜组合',
      schema: z.object({blur:z.number().optional(),brightness:z.number().optional(),contrast:z.number().optional(),grayscale:z.number().optional(),hueRotate:z.number().optional(),invert:z.number().optional(),opacity:z.number().optional(),saturate:z.number().optional(),sepia:z.number().optional(),dropShadow:z.string().optional()}),
      handler:(f)=>{
        const p:string[]=[];type K=keyof typeof f;
        const map:Record<K,string>={blur:'blur(px)',brightness:'brightness',contrast:'contrast',grayscale:'grayscale',hueRotate:'hue-rotate(deg)',invert:'invert',opacity:'opacity',saturate:'saturate',sepia:'sepia'};
        Object.entries(map).forEach(([k,v])=>{(f as never)[k]!==undefined&&p.push(`${v.replace('(px)','')}( ${(f as never)[k]})`)});
        if(f.dropShadow)p.push(`drop-shadow(${f.dropShadow})`);
        return{content:[{type:'text',text:JSON.stringify({property:'filter',value:p.join(' ')||'none'},null,2)}]};
      },
    },
    generate_animation_css: {
      description: '生成CSS动画代码(@keyframes+animation简写)，支持预设或自定义关键帧',
      schema: z.object({
        name:z.string().optional(),duration:z.string().optional(),timingFunction:z.string().optional(),delay:z.string().optional(),
        iterationCount:z.union([z.string(),z.number()]).optional(),direction:z.enum(['normal','reverse','alternate','alternate-reverse']).optional(),
        fillMode:z.enum(['none','forwards','backwards','both']).optional(),
        keyframes:z.array(z.object({offset:z.number().min(0).max(1),styles:z.record(z.string(),z.union([z.string(),z.number()]))})).optional(),
        preset:z.enum(['fadeIn','fadeOut','slideInUp','slideInDown','slideInLeft','slideInRight','bounceIn','pulse','shake','spin','swing','tada']).optional(),
      }),
      handler:({name,duration,timingFunction,delay,iterationCount,direction,fillMode,keyframes,preset})=>{
        if(preset){return{content:[{type:'text',text:JSON.stringify({property:'animation',value:`${preset} ${duration??'0.6s'} ${timingFunction??'ease'} ${iterationCount??'1'} ${fillMode??'both'}`},null,2)}]}}
        const an=name??'customAnimation';const kfs=keyframes??[{offset:0,styles:{opacity:'0'}},{offset:1,styles:{opacity:'1'}}];
        const kr=kfs.map(kf=>{const l=kf.offset===0?'from':kf.offset===1?'to':`${Math.round(kf.offset*100)}%`;const ps=Object.entries(kf.styles).map(([k,v])=>`    ${k.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}: ${v};`).join('\n');return`  ${l}{\n${ps}\n}`}).join('\n');
        const kcss=`@keyframes ${an}\n{\n${kr}\n}`;
        const sh=[an,duration??'0.3s',timingFunction??'ease',delay??'0s',String(iterationCount??1),direction??'normal',fillMode??'none'].join(' ');
        return{content:[{type:'text',text:JSON.stringify({keyframesCSS:kcss,animation:sh},null,2)}]};
      },
    },
    list_presets: {
      description: '列出素材编辑器所有预设（渐变、阴影等）',
      schema: z.object({ type:z.enum(['gradients','shadows','all']).optional() }),
      handler: async(_p)=>({ content:[{type:'text',text:JSON.stringify(await api.getMaterialEditorPresets(),null,2)}] }),
    },

    // ── Design Integration ──
    apply_material_design: {
      description: '将素材编辑器的CSS属性集合应用到设计Schema的目标节点（素材编辑器↔设计编辑器的桥梁）',
      schema: z.object({ projectId:z.string(),nodeId:z.string(),styleUpdates:z.record(z.string(),z.union([z.string(),z.number()])) }),
      handler: async(p)=>({ content:[{type:'text',text:JSON.stringify(await api.executeOperation(p.projectId,{type:'applyMaterialDesign',params:{nodeId:p.nodeId,styleUpdates:p.styleUpdates}}),null,2)}] }),
    },

    // ── Server-side Export & Apply (MCP 独有能力) ──
    /**
     * 服务端渲染素材画布为 PNG → 上传到 design-api → 自动设置 exportedMaterialId
     *
     * 这是 MCP Server 独有的能力：不需要前端 fabric.js 渲染，
     * 直接在 Node.js 侧用 canvas 包将 canvasJSON 渲染成图片。
     */
    export_and_apply: {
      description: [
        '服务端导出素材为 PNG 并应用到设计节点（MCP 独有能力）。',
        '',
        '完整流程：get_schema → 按参考框裁剪渲染 → PNG → 上传 → applyMaterialDesign → **写入 node_material_slots 槽位** → 更新素材工程 targetNodeId',
        '',
        '⚠️ 绑定约定（沉淀到 MCP，与前端「设计素材… / 添加素材」一致）：',
        '- **Schema 节点上的 materialProjectId + 背景样式** 只表示「画什么」；可编辑入口依赖 **素材槽位 API**：`POST /material-slots`（nodeId + materialProjectId + cssTarget=background-image）。',
        '- 仅 `execute_operations_batch` 里手写 `applyMaterialDesign` 而不建槽位 → 右键「设计素材…」可能打不开或行为异常；**请优先用本 action**，或手动调 `material-slots` API。',
        '- 导出 PNG 的尺寸 = **referenceFrame 宽×高**（不是整张大画布），避免 div 里 `contain` 把波形缩成一角。',
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
      handler: async(p)=>{
        const {projectId,materialId,nodeId,format='png',quality=92,scale=2}=p;

        // 1. 获取素材 Schema（⚠️ 必须用 /materials/{id}/schema 端点）
        const schema = await api.getMaterialSchema(projectId,materialId) as Record<string,unknown>;
        const cw = (schema.canvasWidth as number)??600;
        const ch = (schema.canvasHeight as number)??400;
        const bg = (schema.backgroundColor as string)??'#ffffff';
        const objects = (schema.objects as Array<Record<string,unknown>>) ?? [];

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
        const rf = schema.referenceFrame as {width?:number;height?:number}|undefined;
        const rw = rf?.width ?? cw;
        const rh = rf?.height ?? ch;
        const P = 400;
        const fw = Math.max(1200, rw + P*2);
        const fh = Math.max(900, rh + P*2);
        const rfx = (fw - rw) / 2;
        const rfy = (fh - rh) / 2;

        // 导出像素尺寸 = **参考框**（与 Schema 里承载 div 的宽高一致），避免整张大画布塞进小 div 后 `contain` 缩成一条
        const w = Math.round(rw * scale);
        const h = Math.round(rh * scale);
        const cv = createCanvas(w,h);
        const ctx = cv.getContext('2d');
        ctx.scale(scale,scale);

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
          `material-export.${format}`) as Record<string,unknown>;
        const imgUrl = uploadResult?.url as string|undefined;
        if(!imgUrl){
          return{content:[{type:'text',text:JSON.stringify({error:'上传成功但未返回 url',uploadResult},null,2)}]};
        }

        // 6. ⚠️ 关键：用 applyMaterialDesign 操作（和前端 ExportBar 一致）
        //    不是 updateStyle，也不是设置 exportedMaterialId
        const applyResult = await api.executeOperation(projectId,{
          type:'applyMaterialDesign',
          params:{
            nodeId,
            styleUpdates:{
              backgroundImage:`url("${imgUrl}")`,
              backgroundSize:'100% 100%',
              backgroundPosition:'center center',
              backgroundRepeat:'no-repeat',
              backgroundColor:'transparent',
            },
            materialProjectId:materialId,
          },
        });

        let slotBinding: { ok: boolean; action?: string; slotId?: string; error?: string } = { ok: false };
        try{
          slotBinding = await api.ensureMaterialNodeBinding(projectId, nodeId, materialId);
        }catch(e){
          slotBinding = { ok: false, error: (e as Error).message };
        }

        try{
          await api.updateMaterialProject(projectId, materialId, { targetNodeId: nodeId });
        }catch{
          // 非致命：部分环境可能无写权限
        }

        const result = {
          success:true,
          message:`✅ 素材已导出 (${format}, ${w}×${h} ref ${rw}×${rh}, ${buf.length}B) 并应用到节点 ${nodeId}`,
          imageUrl:imgUrl,
          assetId:(uploadResult as Record<string,unknown>).assetId,
          operationApplied:'applyMaterialDesign' as string,
          applyResult,
          slotBinding,
        };
        return { content: [{ type:'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
