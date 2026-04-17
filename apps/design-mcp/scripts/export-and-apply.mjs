/**
 * 独立脚本：服务端导出素材为 PNG → 上传 → 设置 exportedMaterialId 到节点
 * 用法: DESIGN_API_URL=http://127.0.0.1:3001 node scripts/export-and-apply.mjs
 */
import { createCanvas } from 'canvas';

const BASE_URL = process.env.DESIGN_API_URL ?? 'http://127.0.0.1:3001';
const PROJECT_ID = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const MATERIAL_ID = '18bd6add-2e11-47d8-9a7e-fed343c0b02c';
const NODE_ID = 'nd_365a4ae0903d4d9780fa7';
const SCALE = 2;

// ── 1. 获取素材 Schema（用 /materials/{id}/schema 端点，不是 /material-projects） ──
console.log('📥 获取素材 Schema (/materials/schema)...');
const schemaRes = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/materials/${MATERIAL_ID}/schema`);
const schema = await schemaRes.json();
if (!schemaRes.ok) { console.error('Schema 获取失败:', schema); process.exit(1); }

const cw = schema.canvasWidth ?? 600;
const ch = schema.canvasHeight ?? 400;
const bg = schema.backgroundColor ?? '#ffffff';
const objects = schema.objects ?? [];
console.log(`   画布: ${cw}×${ch}, 对象数: ${objects.length}, 背景: ${bg}`);
if (objects.length === 0) {
  console.error('⚠️ 对象数为 0！检查 API 返回结构。keys:', Object.keys(schema));
}

// ── 2. 渲染辅助函数 ──

function parseColorStops(str) {
  // 支持两种格式:
  // "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" — 带位置
  // "linear-gradient(135deg, #667eea, #764ba2, #f093fb)" — 不带位置
  const result = [];
  const parts = str.split(/[\s,]+/).filter(Boolean);
  let i = 0;
  while (i < parts.length) {
    const part = parts[i].trim();
    if (!part || part.startsWith('linear-gradient') || part.endsWith('deg)')) { i++; continue; }
    // 检查是否是颜色（#xxx 或 rgba/rgb/hsl）
    const isColor = /^#[0-9a-fA-F]{3,8}$|^rgba?\(|^hsla?\(/i.test(part)
      || /^(black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|transparent)$/i.test(part);
    if (isColor) {
      const nextPart = (parts[i + 1] || '').trim();
      let pos;
      if (/^\d+(\.\d+)?%?$/.test(nextPart)) {
        pos = parseFloat(nextPart.replace('%', '')) / 100;
        i += 2;
      } else {
        pos = null; // 稍后插值
        i++;
      }
      result.push({ color: part, pos });
    } else {
      i++;
    }
  }
  // 缺失位置按比例插值
  const withPos = result.filter(r => r.pos !== null);
  const withoutPos = result.filter(r => r.pos === null);
  if (withPos.length > 0 && withoutPos.length > 0) {
    let prevIdx = 0;
    for (const wp of withoutPos) {
      while (prevIdx < withPos.length - 1 && result.indexOf(wp) > result.indexOf(withPos[prevIdx])) prevIdx++;
      const nextIdx = Math.min(prevIdx + 1, withPos.length - 1);
      const pStart = withPos[prevIdx]?.pos ?? 0;
      const pEnd = withPos[nextIdx] ?? withPos[withPos.length - 1];
      wp.pos = pStart;
    }
  } else if (result.length > 0 && withPos.length === 0) {
    result.forEach((r, idx) => { r.pos = idx / Math.max(result.length - 1, 1); });
  }
  return result.sort((a, b) => a.pos - b.pos);
}

function resolveFill(ctx, fillStr, w, h, x, y) {
  if (!fillStr || fillStr === 'transparent' || fillStr === 'none') return false;
  if (fillStr.startsWith('linear-gradient(')) {
    const inner = fillStr.slice('linear-gradient('.length).replace(/\)$/, '');
    const tokens = inner.split(',').map(s => s.trim());
    // 解析角度
    let angleDeg = 180; // 默认 to bottom
    const firstToken = tokens[0];
    if (/^\d+deg$/.test(firstToken)) angleDeg = parseFloat(firstToken);

    const rad = (angleDeg - 90) * Math.PI / 180;
    const cx = x + w / 2, cy = y + h / 2;
    const len = Math.abs(Math.cos(rad)) * w + Math.abs(Math.sin(rad)) * h;
    const x0 = cx - Math.cos(rad) * len / 2;
    const y0 = cy - Math.sin(rad) * len / 2;
    const x1 = cx + Math.cos(rad) * len / 2;
    const y1 = cy + Math.sin(rad) * len / 2;

    const stopsRaw = parseColorStops(inner);
    if (stopsRaw.length === 0) return false;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stopsRaw) grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
    ctx.fillStyle = grad;
    return true;
  }
  // 纯色
  ctx.fillStyle = fillStr;
  return true;
}

function roundRectPath(ctx, x, y, w, h, rx, ry) {
  rx = Math.min(rx, w / 2), ry = Math.min(ry, h / 2);
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + w - rx, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
  ctx.lineTo(x + w, y + h - ry);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
  ctx.lineTo(x + rx, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - ry);
  ctx.lineTo(x, y + ry);
  ctx.quadraticCurveTo(x, y, x + rx, y);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, points, outerR, innerR) {
  const step = Math.PI / points;
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + i * step;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  ctx.closePath();
}

async function renderObject(ctx, obj) {
  const type = obj.type ?? '';
  const left = Number(obj.left ?? obj.x ?? 0);
  const top = Number(obj.top ?? obj.y ?? 0);
  const width = Number(obj.width ?? obj.w ?? 0);
  const height = Number(obj.height ?? obj.h ?? 0);
  const opacity = Number(obj.opacity ?? 1);
  if (opacity === 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  switch (type) {
    case 'rect': {
      const rx = Number(obj.rx ?? 0), ry = Number(obj.ry ?? 0);
      roundRectPath(ctx, left, top, width, height, rx, ry);
      if (!resolveFill(ctx, obj.fill, width, height, left, top)) break;
      ctx.fill();
      if (obj.stroke) {
        ctx.strokeStyle = obj.stroke;
        ctx.lineWidth = Number(obj.strokeWidth ?? 1);
        ctx.stroke();
      }
      break;
    }
    case 'ellipse':
    case 'circle': {
      ctx.beginPath();
      ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      if (!resolveFill(ctx, obj.fill, width, height, left, top)) break;
      ctx.fill();
      break;
    }
    case 'star': {
      const pts = obj.points ?? 5;
      const oR = Number(obj.outerRadius ?? Math.min(width, height) / 2);
      const iR = Number(obj.innerRadius ?? oR * (Number(obj.innerRatio ?? 0.4)));
      const ox = obj.originX === 'center' ? left : left + width / 2;
      const oy = obj.originY === 'center' ? top : top + height / 2;
      ctx.beginPath();
      drawStar(ctx, ox, oy, pts, oR, iR);
      if (obj.fill) { ctx.fillStyle = obj.fill; ctx.fill(); }
      break;
    }
    case 'textbox':
    case 'text':
    case 'label': {
      const text = obj.text ?? '';
      if (!text) break;
      const fontSize = Number(obj.fontSize ?? 16);
      ctx.font = `${obj.fontWeight ?? 'normal'} ${fontSize}px ${(obj.fontFamily ?? 'sans-serif').split(',')[0]}`;
      ctx.fillStyle = obj.fill ?? '#000000';
      ctx.textAlign = obj.textAlign ?? 'center';
      ctx.textBaseline = 'middle';
      const tx = obj.originX === 'center' ? left + width / 2 : left;
      const ty = obj.originY === 'center' ? top + height / 2 : top + height / 2;
      ctx.fillText(text, tx, ty);
      break;
    }
    default:
      console.log(`   ⚠️ 跳过不支持的类型: ${type}`);
  }
  ctx.restore();
}

// ── 3. 创建 Canvas 并渲染 ──
console.log('🎨 渲染 Canvas...');
const w = Math.round(cw * SCALE);
const h = Math.round(ch * SCALE);
const cv = createCanvas(w, h);
const ctx = cv.getContext('2d');
ctx.scale(SCALE, SCALE);

if (bg && bg !== 'transparent') {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
}

let rendered = 0;
for (const obj of objects) {
  await renderObject(ctx, obj);
  rendered++;
}
console.log(`   已渲染 ${rendered}/${objects.length} 个对象`);

// ── 4. 导出 PNG ──
const buf = cv.toBuffer('image/png');
console.log(`📸 导出 PNG: ${buf.length} bytes (${w}×${h})`);

// ── 5. 上传到 design-api ──
console.log('📤 上传到 export 端点...');
const uploadUrl = `${BASE_URL}/api/projects/${PROJECT_ID}/material-projects/${MATERIAL_ID}/export`;
const form = new FormData();
form.append('file', new Blob([buf], { type: 'image/png' }), 'material-export.png');
const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
const uploadResult = await uploadRes.json();
console.log(`   上传结果: ${uploadRes.status}`, JSON.stringify(uploadResult).slice(0, 200));
if (!uploadRes.ok) { console.error('上传失败'); process.exit(1); }

// ── 6. 更新节点：使用 applyMaterialDesign 操作（和前端 ExportBar 一致） ──
console.log(`🎯 应用素材到节点 ${NODE_ID}...`);
const imgUrl = uploadResult.url; // 如 /uploads/materials/xxx.png
if (!imgUrl) {
  console.error('❌ upload 返回没有 url 字段:', uploadResult);
  process.exit(1);
}

// 用 applyMaterialDesign 操作（前端 ExportBar 用的就是这个）
const ops = [
  {
    type: 'applyMaterialDesign',
    params: {
      nodeId: NODE_ID,
      styleUpdates: {
        backgroundImage: `url("${imgUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
      },
      materialProjectId: MATERIAL_ID,
    },
  },
];

const updateRes = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/operations/batch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ operations: ops, author: 'export-apply-script' }),
});
const updateText = await updateRes.text();
console.log(`   applyMaterialDesign: ${updateRes.status}`, updateText.slice(0, 500));

if (updateRes.ok) {
  console.log('\n✅ 完成！素材已作为 backgroundImage 应用到节点');
  console.log(`   图片URL: ${imgUrl}`);
} else {
  console.error('\n❌ 节点更新失败');
  process.exit(1);
}
