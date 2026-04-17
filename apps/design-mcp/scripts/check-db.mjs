import pg from 'pg';
const { Client } = pg;
const DB = 'postgresql://root:pk139482@127.0.0.1:5432/design_db';
const PID = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const TPL_ID = 'tp_7906124320a44999830af';

async function main() {
  const client = new Client(DB);
  await client.connect();

  const action = process.argv[2] || 'check';
  
  if (action === 'snapshot') {
    // Step 1: Create snapshot
    const ver = await client.query('SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1', [PID]);
    console.log(`Before: current_version=${ver.rows[0].current_version}, latest_snapshot=${ver.rows[0].latest_snapshot}`);
    
    const projRes = await fetch(`http://127.0.0.1:3001/api/projects/${PID}`);
    if (!projRes.ok) throw new Error(`API ${projRes.status}`);
    const schema = await projRes.json();

    await client.query(
      'INSERT INTO design_snapshots (project_id, version, schema) VALUES ($1, $2, $3)',
      [PID, ver.rows[0].current_version, JSON.stringify(schema)]
    );
    await client.query('UPDATE design_projects SET latest_snapshot = $1 WHERE id = $2', [ver.rows[0].current_version, PID]);

    const after = await client.query('SELECT latest_snapshot FROM design_projects WHERE id = $1', [PID]);
    console.log(`✅ Snapshot created at version ${after.rows[0].latest_snapshot}`);

  } else if (action === 'cleanup-unset') {
    // Step 3: Clean backgroundImage: "unset" from template states
    const res = await client.query("SELECT schema FROM component_assets WHERE id = $1", [TPL_ID]);
    if (!res.rows.length) { console.log('Template not found'); return; }
    
    const schema = res.rows[0].schema;
    let changed = false;
    
    for (const state of (schema.states || [])) {
      if (state.styles && state.styles.backgroundImage === 'unset') {
        delete state.styles.backgroundImage;
        changed = true;
        console.log(`  Removed backgroundImage=unset from state "${state.name}"`);
      }
    }
    
    if (changed) {
      await client.query("UPDATE component_assets SET schema = $1 WHERE id = $2", [JSON.stringify(schema), TPL_ID]);
      console.log('✅ Template updated');
    } else {
      console.log('No unset found');
    }

  } else {
    // Default: check status
    const ver = await client.query('SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1', [PID]);
    console.log(`Status: version=${ver.rows[0].current_version}, snapshot=${ver.rows[0].latest_snapshot}`);
    
    const tpl = await client.query("SELECT schema FROM component_assets WHERE id = $1", [TPL_ID]);
    if (tpl.rows.length) {
      for (const s of (tpl.rows[0].schema?.states || [])) {
        const bi = s.styles?.backgroundImage;
        if (bi) console.log(`  state "${s.name}": backgroundImage=${bi}`);
      }
    }
  }

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
