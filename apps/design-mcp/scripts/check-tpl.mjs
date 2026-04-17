import pg from 'pg';
const c = new pg.Client('postgresql://root:pk139482@127.0.0.1:5432/design_db');
await c.connect();

const PID = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';

const latest = await c.query(
  "SELECT version, schema FROM design_snapshots WHERE project_id = $1 ORDER BY version DESC LIMIT 1",
  [PID]
);

if (!latest.rows.length) { console.log('No snapshot found'); process.exit(1); }

const snap = latest.rows[0];
const schema = snap.schema;
let cleaned = 0;

for (const asset of (schema.componentAssets || [])) {
  for (const state of ((asset.schema || {}).states || [])) {
    if (state.styles && state.styles.backgroundImage === 'unset') {
      delete state.styles.backgroundImage;
      cleaned++;
      console.log(`  ✅ Removed unset from ${asset.name}.${state.name}`);
    }
  }
}

if (cleaned > 0) {
  await c.query(
    "UPDATE design_snapshots SET schema = $1 WHERE project_id = $2 AND version = $3",
    [JSON.stringify(schema), PID, snap.version]
  );
  console.log(`\n✅ Cleaned ${cleaned} unset values in snapshot v${snap.version}`);
} else {
  console.log('Nothing to clean');
}

// Verify
const verify = await c.query(
  "SELECT schema FROM design_snapshots WHERE project_id = $1 AND version = $2",
  [PID, snap.version]
);
let stillUnset = 0;
for (const a of (verify.rows[0].schema.componentAssets || [])) {
  for (const s of ((a.schema || {}).states || [])) {
    if (s.styles?.backgroundImage === 'unset') stillUnset++;
  }
}
console.log(`Verification: ${stillUnset} unset values remaining`);

await c.end();
