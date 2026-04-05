# Template Persistence Fix - Complete Solution

## Problem Statement
"Template tp_d0372fe2ff524591a9ebc not found" error when trying to use (instantiate) a component template immediately after saving it. The template persists on page refresh but is immediately unavailable after save.

## Root Cause
Template IDs were generated **non-deterministically** at runtime, causing divergence between client and server:

1. **Client-side execution** (saveAsTemplate):
   - Generates template ID: "tp_abc123"
   - Adds template with this ID to local project state
   - Sends operation to server WITH NO TEMPLATE ID in params

2. **Server-side validation**:
   - Receives operation without template ID
   - During validation: calls executeSaveAsTemplate() which generates "tp_xyz789" (DIFFERENT!)
   - Validation passes (just checks node exists)
   - Operation inserted into DB (still no template ID in params)

3. **Later replay/use**:
   - Each time the operation is replayed, a NEW template ID is generated
   - Client and server are always out of sync on template IDs

4. **Client tries to instantiate**:
   - Uses template ID "tp_abc123" (from local execution)
   - Server only knows "tp_xyz789" (from server-side generation)
   - Returns 400 error: "Template tp_xyz789 not found"

## Solution

### 1. Update Operation Type (features/design-operations/src/types.ts)
Added optional `templateId` field to `SaveAsTemplateOp` params:
```typescript
export interface SaveAsTemplateOp {
  type: 'saveAsTemplate';
  params: {
    nodeId: string;
    name: string;
    category: string;
    tags?: string[];
    description?: string;
    scope?: TemplateScope;
    templateId?: string;  // NEW: Pre-generated ID for consistency
  };
}
```

### 2. Server-Side Handler (features/design-operations/src/operations/asset.ts)
Modified `executeSaveAsTemplate` to use provided template ID:
```typescript
const template = schemaSaveAsTemplate(node, {
  name: params.name,
  category: params.category,
  templateId: params.templateId,  // NEW: Pass through provided ID
  tags: params.tags,
  description: params.description,
  scope: params.scope,
});
```

### 3. Schema Asset Function (features/design-schema/src/assets/index.ts)
Modified `saveAsTemplate` to accept and use template ID:
```typescript
export function saveAsTemplate(
  node: ComponentNode,
  options: {
    name: string;
    category: string;
    tags?: string[];
    description?: string;
    scope?: TemplateScope;
    templateId?: string;  // NEW: Accept optional ID
    thumbnail?: string;
  },
): ComponentTemplate {
  // ...
  return {
    id: options.templateId ?? generateTemplateId(),  // Use provided or generate
    name: options.name,
    // ...
  };
}
```

### 4. Client Component (apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx)
Modified to generate template ID upfront:
```typescript
const handleSave = async () => {
  if (!nodeId) return;
  try {
    // ... validation ...
    
    // Generate template ID upfront to ensure consistency
    const templateId = generateTemplateId();
    
    const result = editorStore.execute({
      type: 'saveAsTemplate',
      params: {
        nodeId,
        templateId,  // NEW: Include pre-generated ID
        name: values.name.trim(),
        category: values.category,
        description: values.description?.trim() || undefined,
        tags: parseTags(values.tags),
        scope: values.scope,
      },
    });
    // ...
  }
};
```

## How The Fix Works

1. **Client generates ID upfront**: `const templateId = generateTemplateId();`
2. **Operation includes ID in params**: `{ type: 'saveAsTemplate', params: { templateId, nodeId, name, ... } }`
3. **Server receives consistent ID**: Uses the same ID in the operation
4. **All replays use same ID**: Each execution uses `options.templateId` if provided
5. **Client and server aligned**: Both have the same template ID for lookups

## Verification

### Scenario: Save template immediately, then instantiate

**Before fix:**
1. Save template → template ID "tp_abc123" on client
2. Send to server → generates "tp_xyz789" on server
3. Instantiate immediately → error: "Template tp_abc123 not found" (server only has tp_xyz789)

**After fix:**
1. Generate ID upfront: "tp_abc123"
2. Save template → same ID on both client and server
3. Send to server → server uses provided ID "tp_abc123"
4. Instantiate immediately → success, both have "tp_abc123"
5. Page refresh → server replays operations with same ID "tp_abc123" ✓

## Files Modified

1. `features/design-operations/src/types.ts` - Added templateId field
2. `features/design-operations/src/operations/asset.ts` - Pass templateId through
3. `features/design-schema/src/assets/index.ts` - Accept and use templateId
4. `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx` - Generate ID upfront

## Additional Benefits

1. **Deterministic template IDs**: Same ID across all executions
2. **Operation-level consistency**: ID is part of the operation params, stored in DB
3. **Replay-safe**: Operations replay with the same template IDs
4. **Batch-safe**: [saveAsTemplate, instantiateTemplate] in same batch now works correctly
5. **Database audit trail**: Template ID is permanently stored with the operation
