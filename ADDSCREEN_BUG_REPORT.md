# `addScreen` Operation Not Persisting - Complete Debug Analysis

## Executive Summary

**Root Cause**: The `executeAddScreen` function in `features/design-operations/src/operations/screen.ts` creates a new screen object but **fails to add it to the project's screens array** before returning the modified project.

**Impact**: All screen additions appear to succeed (return `{ success: true }`) but don't persist—they're logged in the database but never added to the design project state.

**Fix**: Add one line: `newProject.screens.push(newScreen);` at line 44 of `screen.ts`

---

## 1. The Bug in Detail

### Location
- **File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-operations/src/operations/screen.ts`
- **Function**: `executeAddScreen` (lines 15-57)
- **Issue**: Missing `newProject.screens.push(newScreen);`

### Current Code (Broken)
```typescript
export function executeAddScreen(
  project: DesignProject,
  params: AddScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const newScreen = {
    id: generateScreenId(),
    name: params.name,
    rootNode: {
      id: generateNodeId(),
      type: 'div' as const,
      styles: {
        display: 'flex',
        flexDirection: 'column' as string,
        width: '100%',
        minHeight: '100%',
      },
      children: [],
      props: {},
      states: [],
      activeState: 'default',
      events: [],
      locked: false,
      visible: true,
    },
    domainStates: [],
    dataSources: [],
  };
  newProject.updatedAt = new Date().toISOString();  // ← Screen never added!

  return {
    project: newProject,  // ← Returns unmodified project
    result: {
      success: true,  // ← But result says success
      description: `Added screen "${params.name}"`,
      affectedNodeIds: [newScreen.id],
    },
    inverse: {
      type: 'removeScreen',
      params: { screenId: newScreen.id },
    },
  };
}
```

### The Fix
Add this line after the `newScreen` object definition and before `newProject.updatedAt`:
```typescript
newProject.screens.push(newScreen);  // ← THE MISSING LINE
newProject.updatedAt = new Date().toISOString();
```

---

## 2. Why This Causes the Observed Symptoms

### Request Flow Diagram

```
MCP Tool: add_screen
    ↓
API Client POST /api/projects/{projectId}/operations
    ↓
Backend OperationsService.execute()
    ↓
ProjectsService.findOne()  [Current project state]
    ↓
OperationExecutor.execute(addScreenOp)
    ↓
executeAddScreen(project, params)
    ↓
    Returns: {
      project: {...screens: ["Screen1"]},  // Screen NOT added
      result: {success: true}
    }
    ↓
Service writes to design_operations table  [✓ Logged]
    ↓
Service updates design_projects.current_version  [✓ Version incremented]
    ↓
WebSocket broadcast
    ↓
[IN-MEMORY STATE IS WRONG]
```

### Why Immediate `list_screens` Shows Old Screens

When you call `list_screens` immediately after `addScreen`:

1. **MCP Tool** calls `api.getProject(projectId)` → `GET /api/projects/{projectId}`

2. **Backend Rebuilds State** in `ProjectsService.findOne()`:
   ```
   a. Load latest snapshot  [e.g., V0 with 1 screen: "登录页"]
   b. Query design_operations WHERE seq > snapshot.version
   c. For each operation since snapshot:
      - Execute it via OperationExecutor
   d. Return rebuilt project
   ```

3. **The Broken Replay**:
   - When replaying `addScreen` operation from the database
   - It calls `executeAddScreen()` which still has the bug
   - Screen is NOT added during replay
   - Project.screens remains `["登录页"]` only

4. **Result**: `list_screens` sees only original screens

---

## 3. Architecture: How State Flows Through the System

### A. MCP Side (design-mcp)

**File**: `apps/design-mcp/src/tools/misc.ts` (lines 165-183)
```typescript
server.registerTool('add_screen', {...}, async ({ projectId, name }) => {
  const result = await api.executeOperation(projectId, {
    type: 'addScreen',
    params: { name },
  });
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
```

**API Client**: `apps/design-mcp/src/api-client.ts` (lines 64-73)
```typescript
export async function executeOperation(
  projectId: string,
  operation: unknown,
  author?: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/operations`, {
    method: 'POST',
    body: { operation, author: author ?? 'ai:mcp' },
  });
}
```

### B. Backend Side (design-api)

**Controller**: `apps/design-api/src/operations/operations.controller.ts` (lines 17-23)
```typescript
@Post()
execute(
  @Param('projectId') projectId: string,
  @Body() body: { operation: Operation; author?: string; ... },
) {
  return this.operations.execute(projectId, body.operation, body.author, ...);
}
```

**Service**: `apps/design-api/src/operations/operations.service.ts` (lines 52-101)

```typescript
async execute(
  projectId: string,
  operation: Operation,
  author?: string,
  ...
): Promise<{ seq: number; result: OperationResult }> {
  const pool = this.db.getPool();

  // 1. Get current version from DB
  const projResult = await pool.query(
    `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1`,
    [projectId],
  );
  const { current_version } = projResult.rows[0]!;
  const newSeq = current_version + 1;

  // 2. Execute operation to validate
  const project = await this.projects.findOne(projectId);  // ← Rebuilds from snapshots
  const executor = new OperationExecutor(project);
  const result = executor.execute(operation);  // ← Calls the BUGGY executeAddScreen
  
  if (!result.success) {
    throw new BadRequestException(result.description || '操作执行失败');
  }

  // 3. Write to operations log (EVEN THOUGH SCREEN WASN'T ADDED)
  await pool.query(
    `INSERT INTO design_operations (project_id, seq, operation, ...)
     VALUES ($1, $2, $3, ...)`,
    [projectId, newSeq, JSON.stringify(operation), ...],
  );

  // 4. Update version
  await pool.query(
    `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
    [newSeq, projectId],
  );

  // 5. Broadcast
  this.gateway.broadcast(projectId, operation, newSeq, author, fingerprint);

  return { seq: newSeq, result };
}
```

**Key Issue**: The operation succeeds (result.success = true) even though the project state wasn't actually modified. The operation gets logged and the version gets incremented, but there's no actual screen in the project.

### C. Projects Service (Rebuild/Replay Logic)

**File**: `apps/design-api/src/projects/projects.service.ts` (lines 151-204)

```typescript
async findOne(id: string): Promise<DesignProject> {
  const pool = this.db.getPool();

  // 1. Get project metadata
  const projResult = await pool.query(
    `SELECT * FROM design_projects WHERE id = $1`,
    [id],
  );
  const projRow = projResult.rows[0];

  // 2. Get latest snapshot
  const snapResult = await pool.query(
    `SELECT * FROM design_snapshots
     WHERE project_id = $1
     ORDER BY version DESC LIMIT 1`,
    [id],
  );
  const snapshot = snapResult.rows[0];

  // 3. Get operations AFTER snapshot
  const opsResult = await pool.query(
    `SELECT * FROM design_operations
     WHERE project_id = $1 AND seq > $2
     ORDER BY seq ASC`,
    [id, snapshot.version],
  );

  // 4. Replay operations
  let project = snapshot.schema;  // Start with snapshot
  if (opsResult.rows.length > 0) {
    const executor = new OperationExecutor(project);
    for (const row of opsResult.rows) {
      executor.execute(row.operation);  // ← Calls buggy executeAddScreen for each addScreen op
    }
    project = executor.getProject();
  }

  return project;
}
```

**Replay Problem**: When replaying operations, the buggy `executeAddScreen` is called again. Since it doesn't add the screen to the project, the rebuilt state is wrong.

### D. Operation Executor (design-operations)

**File**: `features/design-operations/src/executor/index.ts` (lines 154-167)

```typescript
execute(op: Operation): OperationResult {
  const { project, result, inverse } = this.dispatch(this.state.current, op);

  if (result.success) {
    this.state.current = project;  // ← Updates internal state
    this.history.push({
      operation: op,
      inverse,
      timestamp: Date.now(),
    });
  }

  return result;  // ← Returns the result from the dispatch
}
```

This calls the specific operation handler (`executeAddScreen` for `addScreen` ops).

---

## 4. Comparison: Why Other Operations Work

### Working: `updateEvent`

**File**: `apps/design-api/src/operations/event.ts`

```typescript
export function executeUpdateEvent(...) {
  const newProject = deepClone(project);
  
  // Find the node
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {  // ← Iterates EXISTING screens
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node?.events) return { project, result: { success: false, ... } };

  // MODIFIES existing event in place
  Object.assign(node.events[params.eventIndex], event);
  newProject.updatedAt = new Date().toISOString();

  return { project: newProject, result: { success: true, ... } };
}
```

✅ Works because:
1. Assumes existing nodes/screens already in project
2. Modifies them in place
3. Returns modified project

### Broken: `addScreen`

```typescript
export function executeAddScreen(...) {
  const newProject = deepClone(project);
  
  const newScreen = { /* ... */ };
  newProject.updatedAt = new Date().toISOString();
  
  return { project: newProject, ... };  // ← newScreen never added!
}
```

❌ Fails because:
1. Creates new screen object
2. **Never adds it to newProject.screens**
3. Returns unmodified project
4. Screen is lost

---

## 5. Data Flow Visualization

### What Should Happen
```
addScreen("新页面")
    ↓
OperationExecutor.execute()
    ↓
executeAddScreen()
    ├─ Create newScreen
    ├─ Add to newProject.screens  ← MISSING!
    └─ Return modified project
    ↓
OperationsService.execute()
    ├─ Write to design_operations table
    ├─ Update current_version
    └─ Return success
    ↓
(Later) list_screens()
    ↓
ProjectsService.findOne()
    ├─ Load snapshot: screens = ["登录页"]
    ├─ Replay addScreen: screens = ["登录页", "新页面"]  ← Would work if fixed
    └─ Return updated project
    ↓
Screen appears in list!
```

### What Actually Happens
```
addScreen("新页面")
    ↓
OperationExecutor.execute()
    ↓
executeAddScreen()
    ├─ Create newScreen
    ├─ [MISSING: Add to newProject.screens]
    └─ Return UNMODIFIED project
    ↓
OperationsService.execute()
    ├─ Write to design_operations table  ← Operation is logged
    ├─ Update current_version  ← Version is incremented
    └─ Return success  ← But project wasn't changed!
    ↓
(Later) list_screens()
    ↓
ProjectsService.findOne()
    ├─ Load snapshot: screens = ["登录页"]
    ├─ Replay addScreen: screens = ["登录页"]  ← Still broken!
    └─ Return unmodified project
    ↓
Screen doesn't appear in list!
```

---

## 6. Why the Bug Persisted Unnoticed

1. **Operation Returns Success**: The result object says `success: true`, so callers think it worked
2. **Database Is Updated**: `design_operations` table has the operation logged, `current_version` is incremented
3. **WebSocket Broadcasting**: The operation is broadcast to clients, so UI might briefly flash or show the new screen
4. **Snapshot Caching**: If snapshots are frequent, the error might not be immediately obvious
5. **Replay Logic**: Only surfaces when rebuilding from snapshots + replay (which happens on page refresh)

---

## 7. Testing the Bug

### Reproduce
```bash
# 1. Add a screen
POST /api/projects/{projectId}/operations
{
  "operation": { "type": "addScreen", "params": { "name": "新页面" } },
  "author": "ai:mcp"
}
# Response: { "seq": 5, "result": { "success": true, "description": "Added screen..." } }

# 2. Immediately list screens
GET /api/projects/{projectId}
# Response: { "screens": [{"id": "sc_...", "name": "登录页"}] }
# The new "新页面" is MISSING!

# 3. Check database
SELECT * FROM design_operations WHERE project_id = '{projectId}' ORDER BY seq DESC LIMIT 1;
# Shows the addScreen operation WAS recorded

SELECT current_version FROM design_projects WHERE id = '{projectId}';
# Version WAS incremented
```

### Why Other Operations Still Work
- `updateEvent` modifies existing nodes in existing screens
- Since screens already exist, replay works fine
- The bug only affects operations that add NEW screens

---

## 8. Related Risks

Other operations that might have similar issues (add new top-level entities):
- None obvious in current codebase for screens
- But check any operations that:
  - Call `.push()` on collections
  - Create new first-class entities
  - Are not patching existing nodes

---

## 9. The Fix

### Corrected Code
```typescript
export function executeAddScreen(
  project: DesignProject,
  params: AddScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const newScreen = {
    id: generateScreenId(),
    name: params.name,
    rootNode: {
      id: generateNodeId(),
      type: 'div' as const,
      styles: {
        display: 'flex',
        flexDirection: 'column' as string,
        width: '100%',
        minHeight: '100%',
      },
      children: [],
      props: {},
      states: [],
      activeState: 'default',
      events: [],
      locked: false,
      visible: true,
    },
    domainStates: [],
    dataSources: [],
  };
  
  // ← ADD THIS LINE ←
  newProject.screens.push(newScreen);
  
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added screen "${params.name}"`,
      affectedNodeIds: [newScreen.id],
    },
    inverse: {
      type: 'removeScreen',
      params: { screenId: newScreen.id },
    },
  };
}
```

### Verification After Fix
1. Add a screen via `add_screen` → Returns success
2. Call `list_screens` → New screen appears
3. Multiple adds → All screens persist
4. Page refresh → Screens still present (replay works correctly)

---

## 10. Summary Table

| Aspect | Details |
|--------|---------|
| **Root Cause** | Missing `newProject.screens.push(newScreen)` in `executeAddScreen()` |
| **Location** | `/features/design-operations/src/operations/screen.ts:44` |
| **Severity** | Critical (breaks core functionality) |
| **Scope** | Only `addScreen` operation |
| **Fix** | Add 1 line of code |
| **Test** | add_screen → list_screens immediately |
| **Database** | Operation logged but never applied (only visible after replay bug) |
| **WebSocket** | Operation broadcast but project state never updated |
| **Workaround** | None (operation is fundamentally broken) |

