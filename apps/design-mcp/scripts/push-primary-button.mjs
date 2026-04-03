/**
 * 一次性脚本：向指定项目根节点插入主按钮（与 component-recipes 一致）
 * 用法: DESIGN_API_URL=http://127.0.0.1:3002 node scripts/push-primary-button.mjs
 */
import { generateNodeId } from '@globallink/design-schema';

const BASE_URL = process.env.DESIGN_API_URL ?? 'http://127.0.0.1:3002';
const PROJECT_ID = process.env.PROJECT_ID ?? '461639cd-aba9-4059-9d91-b86ae57dc760';
const PARENT_ID = process.env.PARENT_ID ?? 'nd_817ca3add8d94599ad25a';
const LABEL = process.env.LABEL ?? '主按钮';

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
  textAlign: 'center',
  boxSizing: 'border-box',
  boxShadow: 'none',
  transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
};

const STATE_TRANSITION = {
  duration: 200,
  easing: 'ease',
  properties: ['background-color', 'box-shadow', 'transform'],
};

const btnId = generateNodeId();

const hoverStyles = { backgroundColor: '#4096ff' };
const pressedStyles = { backgroundColor: '#0958d9', transform: 'scale(0.98)' };
const focusStyles = {
  boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px rgba(22, 119, 255, 0.24)',
};

const operations = [
  {
    type: 'addElement',
    params: {
      parentId: PARENT_ID,
      tag: 'button',
      elementId: btnId,
      props: { text: LABEL },
      styles: {
        ...PRIMARY_DEFAULT_STYLES,
        position: 'absolute',
        left: '24px',
        top: '120px',
      },
    },
  },
  {
    type: 'addState',
    params: {
      nodeId: btnId,
      stateName: 'hover',
      styles: hoverStyles,
      transition: STATE_TRANSITION,
    },
  },
  {
    type: 'addState',
    params: {
      nodeId: btnId,
      stateName: 'pressed',
      styles: pressedStyles,
      transition: { duration: 120, easing: 'ease-out', properties: ['background-color', 'transform'] },
    },
  },
  {
    type: 'addState',
    params: {
      nodeId: btnId,
      stateName: 'focus',
      styles: focusStyles,
      transition: STATE_TRANSITION,
    },
  },
  {
    type: 'addEvent',
    params: {
      nodeId: btnId,
      event: {
        trigger: 'hover',
        description: '悬停 → hover',
        actions: [{ type: 'setState', targetId: btnId, state: 'hover' }],
      },
    },
  },
  {
    type: 'addEvent',
    params: {
      nodeId: btnId,
      event: {
        trigger: 'focus',
        description: '聚焦 → focus',
        actions: [{ type: 'setState', targetId: btnId, state: 'focus' }],
      },
    },
  },
  {
    type: 'addEvent',
    params: {
      nodeId: btnId,
      event: {
        trigger: 'blur',
        description: '失焦 → default',
        actions: [{ type: 'setState', targetId: btnId, state: 'default' }],
      },
    },
  },
];

const res = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/operations/batch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ operations, author: 'cursor:recipe' }),
});

const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
console.log(JSON.stringify({ ok: true, nodeId: btnId, label: LABEL }, null, 2));
