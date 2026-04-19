import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://root:pk139482@127.0.0.1:5432/design_db' });

const projectId = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';

const { rows: snaps } = await pool.query(
  'SELECT id, version, schema FROM design_snapshots WHERE project_id = $1 ORDER BY version DESC LIMIT 1',
  [projectId]
);
if (!snaps.length) { console.log('No snapshot'); process.exit(1); }

const snap = snaps[0];
const schema = typeof snap.schema === 'string' ? JSON.parse(snap.schema) : snap.schema;

function findNode(node) {
  if (node.id === 'nd_365a4ae0903d4d9780fa7') return node;
  if (node.children) for (const c of node.children) { const r = findNode(c); if (r) return r; }
  return null;
}
const btnNode = findNode(schema.rootNode || schema);
if (!btnNode) { console.log('Node not found'); process.exit(1); }

btnNode.propDefinitions = [
  { key: 'text',          type: 'string',  defaultValue: '点击开始', description: '按钮显示文本' },
  { key: 'size',          type: 'enum',    defaultValue: 'medium',   options: ['small','medium','large'], description: '按钮尺寸' },
  { key: 'variant',       type: 'enum',    defaultValue: 'primary',  options: ['primary','secondary','ghost','danger'], description: '按钮风格变体' },
  { key: 'disabled',      type: 'boolean', defaultValue: false,      description: '是否禁用' },
  { key: 'loading',       type: 'boolean', defaultValue: false,      description: '是否加载中' },
  { key: 'borderRadius',  type: 'number',  defaultValue: 16,         description: '圆角大小(px)' },
  { key: 'fullWidth',     type: 'boolean', defaultValue: false,      description: '撑满父容器宽度' },
  { key: 'iconPosition',  type: 'enum',    defaultValue: 'left',     options: ['left','right','only'], description: '图标位置' },
];

await pool.query('UPDATE design_snapshots SET schema = $1 WHERE id = $2', [JSON.stringify(schema), snap.id]);
console.log(`✅ Added ${btnNode.propDefinitions.length} props to PrimaryButton template`);
for (const p of btnNode.propDefinitions) console.log(`   - ${p.key}: ${p.type}${p.options ? `[${p.options.join('|')}]` : ''} = ${p.defaultValue}`);
pool.end();
