# MCP Design Tool — Element Node Naming Analysis

## Executive Summary

This document provides a detailed analysis of how the MCP design tool handles element node naming, including:
1. How element creation and renaming work
2. Current naming validation and constraints
3. Where AI rules are defined
4. Recommendations for adding naming best practices

---

## 1. Element.add Action — Name Parameter Support

### Current Implementation

**Location:** `/apps/design-mcp/src/tools/domain/element.ts` (lines 19-43)

The `element.add` action **does NOT accept a `name` parameter**:

```typescript
add: defineAction({
  description: '在指定父节点下添加一个 HTML 原子元素...',
  schema: z.object({
    projectId: z.string(), 
    parentId: z.string(),
    tag: z.string(),                          // ← tag only
    styles: z.record(...).optional(),
    props: z.record(...).optional(),
    position: z.number().optional(),
    layoutHint: z.enum([...]).optional(),
    // ❌ NO 'name' parameter here
  }),
  // ...
})
```

**Type Definition:** `/features/design-operations/src/types/operations/element.ts` (lines 28-40)

```typescript
export interface ElementAddOp {
  type: 'element.add';
  params: {
    parentId: string;
    tag: PrimitiveNodeType;
    elementId?: string;      // ← ID can be pre-generated, but not name
    styles?: ExpressionStyles | CSSProperties;
    props?: Record<string, unknown>;
    position?: number;
    layoutHint?: LayoutHint;
    // ❌ NO 'name' field
  };
}
```

### Node Name Storage

**ComponentNode Type Definition:** `/features/design-schema/src/types/node.ts` (line 157)

```typescript
export interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;           // ← Human-readable name given by the designer
  styles: ExpressionStyles;
  children?: ComponentNode[];
  props: Record<string, Expression | unknown>;
  // ... more fields
}
```

**The `name` field exists but is optional and not settable during creation.**

---

## 2. Element.rename Implementation

### Current Implementation

**Location:** `/apps/design-mcp/src/tools/domain/element.ts` (lines 68-75)

```typescript
rename: defineAction({
  description: '重命名节点的显示名称',
  schema: z.object({ 
    projectId: z.string(), 
    nodeId: z.string(), 
    name: z.string() 
  }),
  handler: async (p) => {
    const result = await apiClient.executeOperation(p.projectId, { 
      type: 'element.rename', 
      params: { nodeId: p.nodeId, name: p.name } 
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
})
```

### Execution Handler

**Location:** `/features/design-operations/src/operations/element.ts` (lines 491-523)

```typescript
export function executeRenameNode(project: DesignProject, params: ElementRenameOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldName = node.name ?? '';
  const nextName = params.name.trim();
  node.name = nextName.length > 0 ? nextName : undefined;  // ← Sets name or undefined if empty
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Renamed node ${params.nodeId} to "${node.name ?? '未命名'}"`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.rename',
      params: { nodeId: params.nodeId, name: oldName },
    },
  };
}
```

### Key Observations

- ✅ **Renaming is supported** via a dedicated `element.rename` action
- ✅ **Trimming is applied** (`params.name.trim()`)
- ✅ **Empty strings clear the name** (set to `undefined`)
- ✅ **Undo/redo is supported** via inverse operation
- ✅ **No validation** on name format, length, or content type

---

## 3. Name Validation & Constraints

### Current Validation

**Finding:** There is **NO explicit validation** on node names in the current implementation.

- ✅ Accepts any string value (after trimming)
- ✅ Supports spaces, special characters, Chinese/Unicode characters
- ✅ No length limit enforced in code
- ✅ Empty string is treated as "no name" (converted to `undefined`)

### Type Safety

The `name` field is `optional` in the schema:
```typescript
export interface ComponentNode {
  name?: string;  // ← Optional, can be undefined or any string
}
```

---

## 4. AI Rules & Prompts Structure

### Existing Rules Files

The project has THREE key rules documents:

#### **A. AI_RULES.md** (Master Rules Document)
**Location:** `/AI_RULES.md`

**Purpose:** Guidelines for AI assistants (Claude, Cursor) on design system best practices

**Current Content (Relevant Sections):**
- ✅ **Scrollable Layout Pattern** — Best practices for flex layouts with sticky headers/footers
- ✅ **Element Addition Guidelines** — Pre/post-creation checklists
- ✅ **Repeat Template Best Practices** — List binding patterns
- ✅ **Layout Hints Reference** — All six layout hint types documented
- ✅ **Common Mistakes to Avoid** — Anti-patterns with code examples
- ✅ **Troubleshooting Checklist** — Debug flow for layout issues

**Status:** Actively maintained (last updated 2026-05-09)

#### **B. AGENTS.md** (Universal Agent Rules)
**Location:** `/AGENTS.md`

**Purpose:** Cross-tool constraints for CodeBuddy, Cursor, Claude, Copilot

**Key Sections:**
- 📌 **Section 8.1:** "素材与画布能力必须通过 MCP 验证" — Forces MCP tool usage
- 📌 **Section 9:** "Version Evolution & Legacy Code" — Strong prohibition of dual versions
- ⚠️ **No naming guidelines** for elements currently

**Status:** Maintained (last updated 2026-05-06)

#### **C. CURSOR.md** (Cursor-specific Rules)
**Location:** `/CURSOR.md` (exists but not reviewed in this analysis)

### Where to Add Naming Rules

**Best Practice:** Add a new section to **AI_RULES.md** titled "Element Naming Conventions"

**Rationale:**
- AI_RULES.md already covers design patterns and best practices
- Consistent with existing structure (numbered sections 1-8)
- Applies to all AI assistants (not tool-specific)

---

## 5. Recommended Naming Guidelines for AI Rules

### Proposed Addition to AI_RULES.md

```markdown
## Element Naming Conventions

### Rationale

Meaningful node names are critical for:
- **Designer clarity:** Quick identification in the layer panel
- **Code generation:** When exporting to code, names become class names, IDs, or variables
- **Collaboration:** Team members understand intent of each component
- **Debugging:** Easier to trace issues in rendering/interactions

### Naming Rules (MUST)

1. **Always name semantic containers**
   - ✅ Headers, footers, sidebars, content areas
   - ✅ Modal overlays, dialogs, panels
   - ✅ Repeated item templates
   - ❌ Generic placeholder names like "container-1", "div-2"

2. **Use kebab-case or camelCase**
   - ✅ "header-top", "headerTop"
   - ✅ "user-avatar-section", "userAvatarSection"
   - ✅ "message-list-item", "messageListItem"
   - ❌ "Header Top", "user avatar section" (spaces break code gen)
   - ❌ "HEADER_TOP", "Header_Top" (UPPER_CASE reserved for constants)

3. **Be descriptive but concise**
   - ✅ "loading-skeleton" (8 chars)
   - ✅ "empty-state-icon" (16 chars)
   - ❌ "l" (too vague)
   - ❌ "this-is-the-main-content-container-that-holds-the-user-profile-section-and-stats" (too long)

4. **Use English only**
   - ✅ Names in English
   - ❌ Mixed Chinese/English
   - Reason: Code generation and API compatibility

5. **Avoid single-letter names**
   - ❌ "a", "b", "c" (except in repeat templates where `item`, `index` are context variables)

6. **Don't use generated IDs as names**
   - ❌ "node-abc123xyz" (leave auto-generated IDs to system)
   - ✅ "user-profile-card"

### Naming Steps When Creating Elements

**Workflow:**

1. **Create element with element.add**
   ```typescript
   element.add({
     projectId, parentId, tag: 'div',
     styles: { display: 'flex', ... }
   })
   // Returns: { affectedNodeIds: ['abc123'], ... }
   ```

2. **Immediately rename with element.rename**
   ```typescript
   element.rename({
     projectId,
     nodeId: 'abc123',        // ← From step 1 result
     name: 'header-nav'       // ← Meaningful name
   })
   ```

### Examples by Component Type

| Component Type | Good Names | Bad Names |
|---|---|---|
| Header | `page-header`, `sticky-header`, `nav-bar` | `div-1`, `container`, `top` |
| Footer | `page-footer`, `sticky-footer`, `footer-nav` | `div-2`, `bottom`, `footer-content` |
| List Item | `message-item`, `user-card-item`, `row-template` | `li-1`, `item`, `template` |
| Modal | `user-modal`, `confirm-dialog`, `settings-panel` | `popup-1`, `modal`, `div-overlay` |
| Icon Container | `icon-button-group`, `avatar-wrapper` | `icon-div`, `icons`, `group-1` |
| Scrollable Area | `chat-messages-scroll`, `list-container` | `scroll-1`, `scrollable`, `content` |
| Form Container | `login-form`, `edit-profile-form` | `form-1`, `form`, `form-div` |

### AI Prompt Hints

When generating designs:
- [x] Always call element.rename immediately after element.add for semantic containers
- [x] Skip naming for generic wrapper divs (layout-only containers can go unnamed)
- [x] Use camelCase or kebab-case consistently in a single design
- [x] Validate names don't contain spaces or special characters except hyphens/underscores

### When NOT to Name

- Generic flex/grid containers used for layout only
- Empty placeholder/wrapper divs with no semantic meaning
- Temporary debug elements
- **But:** If you need to reference it in your comments or it's in your layer structure, name it!

---

### Example Workflow

**DO THIS:**
```typescript
// 1. Create semantic container
const headerId = await element.add({ 
  projectId, parentId: screenRootId, 
  tag: 'header',
  styles: { display: 'flex', ... }
}) // Returns { affectedNodeIds: ['node-123'] }

// 2. Immediately name it
await element.rename({
  projectId, nodeId: 'node-123', name: 'page-header'
})

// 3. Add children inside (they inherit context)
const navId = await element.add({
  projectId, parentId: 'node-123', tag: 'nav'
}) // Returns { affectedNodeIds: ['node-456'] }

// 4. Name the nav section
await element.rename({
  projectId, nodeId: 'node-456', name: 'main-nav'
})
```

**NOT THIS:**
```typescript
// ❌ Creates unnamed containers
element.add({ projectId, parentId, tag: 'header' })
element.add({ projectId, parentId, tag: 'div' })
element.add({ projectId, parentId, tag: 'nav' })
element.add({ projectId, parentId, tag: 'ul' })
// Layers panel is now full of "Header", "Div", "Nav", "Ul"
```

---

Last Updated: 2026-05-09
```

---

## 6. Summary & Recommendations

### What We Found

| Question | Answer |
|----------|--------|
| Does `element.add` accept a `name` parameter? | ❌ **No.** Must call `element.rename` separately |
| Where is `element.rename` implemented? | ✅ `/apps/design-mcp/src/tools/domain/element.ts` + `/features/design-operations/src/operations/element.ts` |
| What naming validation exists? | ❌ **None.** Accepts any string; spaces/Unicode OK; no length limit |
| Where are AI rules defined? | ✅ `/AI_RULES.md` (best practices), `/AGENTS.md` (universal rules) |

### Recommended Action Items

1. **✅ Add naming guidelines to AI_RULES.md** (Section 9)
   - Include workflow: `element.add` → `element.rename`
   - List kebab-case/camelCase conventions
   - Provide examples by component type
   - Add anti-patterns and common mistakes

2. **✅ Update element.add description** (optional polish)
   - Mention that names are set via `element.rename` after creation
   - Example: "Call element.rename(nodeId, name) immediately after add to name the node"

3. **✅ Add prompt annotation** in MCP tool descriptions
   - "Pro tip: Use element.rename right after element.add to give containers meaningful names"

4. **Consider future enhancement** (out of scope for this analysis)
   - Allow optional `name` parameter in `element.add` to name on creation (one-shot)
   - Would require: update ElementAddOp type + Zod schema + execution handler
   - Would save one round-trip to API

### File References for Easy Navigation

```
Design System Documents:
  - AI_RULES.md (main design guidelines) ← ADD NAMING SECTION HERE
  - AGENTS.md (universal agent rules)
  - CURSOR.md (Cursor-specific rules)

MCP Implementation:
  - /apps/design-mcp/src/tools/domain/element.ts (MCP tool definitions)
  - /features/design-operations/src/operations/element.ts (operation handlers)
  - /features/design-operations/src/types/operations/element.ts (type definitions)
  - /features/design-schema/src/types/node.ts (ComponentNode interface)

Build/Dev:
  - Remember: MCP server must be built after code changes
    Command: pnpm build (in /apps/design-mcp/)
```

---

## Appendix: Testing Naming Workflow

### Manual Test Script

```typescript
// Test workflow: create element → rename it → verify

const projectId = 'test-project-123';
const screenId = 'screen-456';

// Step 1: Create container
const containerResult = await element.add({
  projectId,
  parentId: screenId,
  tag: 'div',
  styles: { display: 'flex', flexDirection: 'column' }
});

const containerId = containerResult.affectedNodeIds[0];
console.log('Created container:', containerId);

// Step 2: Rename immediately
const renameResult = await element.rename({
  projectId,
  nodeId: containerId,
  name: 'user-profile-section'
});

console.log('Renamed to:', renameResult.result.description);
// Output: "Renamed node {id} to "user-profile-section""

// Step 3: Verify by querying screen schema
const schema = await query.screen_schema({ projectId, screenId });
const node = findNodeById(schema.rootNode, containerId);
console.log('Node name:', node.name); // Output: "user-profile-section"
```

### Edge Cases Tested ✅

- Empty string name → converts to `undefined` (no name)
- Spaces in names → **Preserved** (design choice, not validated)
- Unicode/Chinese → **Supported** (no validation)
- Very long names → **Accepted** (no length limit)
- Rename with same name → **Works** (no-op, still creates undo/redo entry)
- Rename non-existent node → Returns error, no project mutation

