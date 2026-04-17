/**
 * 一键清理画布 → 重新绘制干净素材 → 导出 PNG → 应用到节点
 * 用法: DESIGN_API_URL=http://127.0.0.1:3001 node scripts/redraw-clean.mjs
 */
import { createCanvas } from 'canvas';

const BASE_URL = process.env.DESIGN_API_URL ?? 'http://127.0.0.1:3001';
const PROJECT_ID = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const MATERIAL_ID = '18bd6add-2e11-47d8-9a7e-fed343c0b02c';
const NODE_ID = 'nd_365a4ae0903d4d9780fa7';
const SCALE = 2;

async function req(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const t = await r.text();
  if (!r.ok) throw new Error(`${opts.method||'GET'} ${url} → ${r.status}: ${t}`);
  return JSON.parse(t);
}

// ── Step 1: 清空画布（保留默认框） ──
console.log('🧹 Step 1: 清空画布...');
const schema = await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/schema`);
const defId = schema.defaultElementId;
const objs = (schema.objects || []).filter(o => o.id !== defId);
if (objs.length > 0) {
  const ops = objs.map(o => ({ type: 'me:removeObject', params: { objectId: o.id } }));
  await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/operations/batch`, {
    method: 'POST', body: JSON.stringify({ operations: ops, author: 'cleanup' }),
  });
  console.log(`   删除了 ${objs.length} 个对象`);
}
// 重新获取确认
const afterClear = await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/schema`);
console.log(`   剩余对象: ${afterClear.objects.length}`);

// ── Step 2: 获取画布坐标信息（⚠️ add_object 需要前端画布坐标！） ──
console.log('\n📍 Step 2: 获取画布坐标信息...');
const canvasInfo = await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/schema`);
const bw = canvasInfo.canvasWidth; // 280
const bh = canvasInfo.canvasHeight; // 56
// 前端画布坐标：参考框居中于大画布中，add_object 的 x/y 是这个坐标系
const P = 400; // padding
const fw = Math.max(1200, bw + P * 2); // frontend canvas width
const fh = Math.max(900, bh + P * 2);  // frontend canvas height
const rfx = (fw - bw) / 2; // referenceFrameX — 参考框左上角的前端画布 X
const rfy = (fh - bh) / 2; // referenceFrameY — 参考框左上角的前端画布 Y
console.log(`   后端画布: ${bw}×${bh}, 前端画布: ${fw}×${fh}`);
console.log(`   参考框位置: (${rfx}, ${rfy}) ← add_object 的 x/y 基准`);

// ── Step 3: 添加干净的 5 个元素（用前端画布坐标） ──
console.log('\n🎨 Step 3: 绘制干净素材...');

const newObjects = [
  // 1. 渐变背景（圆角矩形）— 填满参考框
  {
    type: 'rect', name: 'bg-gradient',
    x: rfx, y: rfy, width: bw, height: bh, rx: 16, ry: 16,
    fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    opacity: 1,
  },
  // 2. 顶部光晕
  {
    type: 'ellipse', name: 'glow-top',
    x: rfx + 80, y: rfy + 6, width: 120, height: 20,
    fill: 'rgba(255,255,255,0.3)', opacity: 0.8,
  },
  // 3. 底部光晕
  {
    type: 'ellipse', name: 'glow-bottom',
    x: rfx + 60, y: rfy + 36, width: 160, height: 30,
    fill: 'rgba(118,75,162,0.25)', opacity: 0.7,
  },
  // 4. 星形装饰
  {
    type: 'star', name: 'sparkle-left',
    x: rfx + 24, y: rfy + 12, width: 10, height: 10,
    fill: 'rgba(255,255,255,0.7)', points: 5, innerRatio: 0.4,
  },
  // 5. 文字标签
  {
    type: 'textbox', name: 'btn-label',
    x: rfx + 40, y: rfy + 14, width: 200, height: 28,
    text: '点击开始', fill: '#ffffff',
    fontSize: 18, fontWeight: '700', fontFamily: '-apple-system, sans-serif',
    textAlign: 'center',
  },
];

const addOps = newObjects.map(obj => ({
  type: 'me:addObject', params: { object: obj },
}));
await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/operations/batch`, {
  method: 'POST', body: JSON.stringify({ operations: addOps, author: 'redraw' }),
});
console.log(`   添加了 ${newObjects.length} 个干净元素`);

// ── Step 3: 服务端渲染为 PNG ──
console.log('\n📸 Step 3: 渲染 PNG...');
function parseColorStops(str) {
  const result = [];
  const parts = str.split(/[\s,]+/).filter(Boolean);
  let i = 0;
  while (i < parts.length) {
    const part = parts[i].trim();
    if (!part || part.startsWith('linear-gradient') || part.endsWith('deg)')) { i++; continue; }
    const isColor = /^#[0-9a-fA-F]{3,8}$|^rgba?\(|^hsla?\(/i.test(part)
      || /^(black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|transparent)$/i.test(part);
    if (isColor) {
      const next = (parts[i + 1] || '').trim();
      let pos;
      if (/^\d+(\.\d+)?%?$/.test(next)) { pos = parseFloat(next.replace('%','')) / 100; i += 2; }
      else { pos = null; i++; }
      result.push({ color: part, pos });
    } else { i++; }
  }
  const withPos = result.filter(r => r.pos !== null);
  const withoutPos = result.filter(r => r.pos === null);
  if (withPos.length > 0 && withoutPos.length > 0) {
    let pi = 0; for (const wp of withoutPos) {
      while (pi < withPos.length - 1 && result.indexOf(wp) > result.indexOf(withPos[pi])) pi++;
      wp.pos = withPos[Math.min(pi, withPos.length - 1)]?.pos ?? 0;
    }
  } else if (result.length > 0 && withPos.length === 0) {
    result.forEach((r, idx) => { r.pos = idx / Math.max(result.length - 1, 1); });
  }
  return result.sort((a,b) => a.pos - b.pos);
}
function resolveFill(ctx, f, w, h, x, y) {
  if (!f || f === 'transparent' || f === 'none') return false;
  if (f.startsWith('linear-gradient(')) {
    const inner = f.slice('linear-gradient('.length).replace(/\)$/,'');
    const tokens = inner.split(',').map(s=>s.trim());
    let angleDeg = 180; if (/^\d+deg$/.test(tokens[0])) angleDeg = parseFloat(tokens[0]);
    const rad = (angleDeg - 90) * Math.PI / 180;
    const cx = x+w/2, cy=y+h/2, len = Math.abs(Math.cos(rad))*w + Math.abs(Math.sin(rad))*h;
    const grad = ctx.createLinearGradient(cx-Math.cos(rad)*len/2, cy-Math.sin(rad)*len/2, cx+Math.cos(rad)*len/2, cy+Math.sin(rad)*len/2);
    parseColorStops(inner).forEach(s => grad.addColorStop(Math.max(0,Math.min(1,s.pos)), s.color));
    ctx.fillStyle = grad; return true;
  }
  ctx.fillStyle = f; return true;
}
function rrPath(ctx,x,y,w,h,rx,ry){
  rx=Math.min(rx,w/2); ry=Math.min(ry,h/2);
  ctx.moveTo(x+rx,y); ctx.lineTo(x+w-rx,y); ctx.quadraticCurveTo(x+w,y,x+w,y+ry);
  ctx.lineTo(x+w,y+h-ry); ctx.quadraticCurveTo(x+w,y+h,x+w-rx,y+h);
  ctx.lineTo(x+rx,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-ry);
  ctx.lineTo(x,y+ry); ctx.quadraticCurveTo(x,y,x+rx,y); ctx.closePath();
}
function drawStar(ctx,cx,cy,p,oR,iR){
  const st=Math.PI/p; ctx.moveTo(cx,cy-oR);
  for(let i=0;i<p*2;i++){const r=i%2===0?oR:iR; const a=-Math.PI/2+i*st; ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  ctx.closePath();
}
function renderObj(ctx,obj){
  const t=obj.type??'', l=Number(obj.left??obj.x??0), tp=Number(obj.top??obj.y??0),
    w=Number(obj.width??0), h=Number(obj.height??0), op=Number(obj.opacity??1);
  if(op===0)return; ctx.save(); ctx.globalAlpha=op;
  switch(t){
    case 'rect':{rrPath(ctx,l,tp,w,h,Number(obj.rx??0),Number(obj.ry??0)); if(resolveFill(ctx,obj.fill,w,h,l,tp))ctx.fill(); break;}
    case 'ellipse':{ctx.beginPath();ctx.ellipse(l+w/2,tp+h/2,w/2,h/2,0,0,Math.PI*2);if(resolveFill(ctx,obj.fill,w,h,l,tp))ctx.fill();break;}
    case 'star':{
      const pts=obj.points??5, oR=Number(obj.outerRadius??Math.min(w,h)/2), iR=Number(obj.innerRadius??oR*(Number(obj.innerRatio??0.4)));
      const ox=(obj.originX==='center')?l:l+w/2, oy=(obj.originY==='center')?tp:tp+h/2;
      ctx.beginPath(); drawStar(ctx,ox,oy,pts,oR,iR); if(obj.fill){ctx.fillStyle=obj.fill;ctx.fill();}
      break;}
    case 'textbox':
    case 'text':{
      const txt=obj.text??''; if(!txt)break;
      ctx.font=`${obj.fontWeight??'normal'} ${obj.fontSize??16}px ${(obj.fontFamily??'sans-serif').split(',')[0]}`;
      ctx.fillStyle=obj.fill??'#000'; ctx.textAlign=obj.textAlign??'center'; ctx.textBaseline='middle';
      ctx.fillText(txt,(obj.originX==='center')?l+w/2:l,(obj.originY==='center')?tp+h/2:tp+h/2);
      break;}
  }
  ctx.restore();
}

// 获取最新的 schema（包含刚添加的对象）
const finalSchema = await req(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/schema`);
const bg = finalSchema.backgroundColor ?? '#667eea';
const allObjs = finalSchema.objects ?? [];
console.log(`   对象数: ${allObjs.length}, 背景: ${bg}`);

const W = Math.round(bw*SCALE), H = Math.round(bh*SCALE);
const cv = createCanvas(W,H);
const ctx = cv.getContext('2d');
ctx.scale(SCALE,SCALE);
if(bg!=='transparent'){ctx.fillStyle=bg; ctx.fillRect(0,0,bw,bh);}

// ⚠️ schema 中的对象坐标是前端画布坐标，需要减去参考框偏移转为局部坐标
for(const o of allObjs){
  const localObj = { ...o };
  if(o.x != null) localObj.x = Number(o.x) - rfx;
  if(o.y != null) localObj.y = Number(o.y) - rfy;
  renderObj(ctx, localObj);
}

const buf = cv.toBuffer('image/png');
console.log(`   PNG: ${buf.length} bytes (${W}×${H})`);

// ── Step 4: 上传 ──
console.log('\n📤 Step 4: 上传...');
const form = new FormData();
form.append('file', new Blob([buf],{type:'image/png'}),'material-export.png');
const upRes = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/material-projects/${MATERIAL_ID}/export`, {method:'POST',body:form});
const upload = await upRes.json();
if(!upRes.ok){console.error('上传失败:',upload); process.exit(1);}
const imgUrl = upload.url;
console.log(`   URL: ${imgUrl}`);

// ── Step 5: applyMaterialDesign ──
console.log('\n🎯 Step 5: 应用到节点...');
await req(`${BASE_URL}/api/projects/${PROJECT_ID}/operations/batch`, {
  method:'POST', body: JSON.stringify({
    operations:[{
      type:'applyMaterialDesign', params:{
        nodeId:NODE_ID,
        styleUpdates:{ backgroundImage:`url("${imgUrl}")`, backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat', backgroundColor:'transparent' },
        materialProjectId:MATERIAL_ID,
      },
    }],
    author:'redraw-clean-script',
  }),
});

console.log('\n✅ 全部完成！画布干净了，素材已应用。刷新编辑器查看效果。');
