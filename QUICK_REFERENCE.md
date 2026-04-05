# 🚀 Quick Reference Guide

## 📌 What You Need to Know

### 1️⃣ Toast-Overlay Design Document
📄 **File:** `design_docs/04-roadmap/toast-overlay-design.md`

**TLDR:**
- Toast ≠ Canvas Component (don't draw it!)
- Toast = Event behavior action (put it in event chains)
- Benefits: No canvas clutter, natural conditional flow, clean code generation

**Designer UX Flow:**
```
Button → Click Event → Send Request
                       ├─ onSuccess → Show Toast "Login OK" → Navigate
                       └─ onFailure → Show Toast "Error" → Reset Form
```

---

### 2️⃣ API Request + Toast Navigation Document  
📄 **File:** `design_docs/04-roadmap/api-request-toast-navigation.md` (44KB)

**TLDR:**
- Request = Data node in event chain
- Requests defined at Screen level in Schema
- Preview uses Mock data (switch success/failure scenarios instantly)
- Toast messages support `{{response.message}}` dynamic binding

**Tech Requirements:**
1. Extend event chain editor to support nested branching in `apiRequest`
2. Add "Interaction Feedback Overview" panel to list all Toasts
3. Mock scenario switcher in preview toolbar

---

## 🏗️ Key Architecture Files

### Canvas & Editing
| File | Purpose | Size |
|------|---------|------|
| `apps/design_front/src/views/editor/Canvas/index.tsx` | Main canvas component | 26KB |
| `apps/design_front/src/views/editor/Canvas/useEditorCanvasOps.ts` | Canvas operations | 8KB |
| `apps/design_front/src/views/editor/Canvas/TextInlineEditor.tsx` | Text editing | 7KB |

### State Management
| File | Purpose | Size |
|------|---------|------|
| `apps/design_front/src/stores/editor/index.ts` | Editor state (MobX) | 38KB |
| `apps/design_front/src/views/editor/AiOperationToast/index.tsx` | Existing toast ref | < 1KB |

### Schema & Types
| Module | Purpose |
|--------|---------|
| `features/design-schema/` | Data structures |
| `features/design-engine/` | Canvas rendering |
| `features/design-operations/` | Undo/redo system |

---

## 🎯 Implementation Roadmap

### Phase A: Event Chain Nesting (3 days)
- [ ] A-1: `SubActionChainEditor` component
- [ ] A-2: Integrate into `InteractionsTab` for apiRequest
- [ ] A-3: Action config form reuse for showToast

### Phase B: Feedback Overview (2 days)
- [ ] B-1: `FeedbackOverviewPanel` component
- [ ] B-2: Integrate into DataView

### Phase C: Mock Scenario Switcher (1.5 days)
- [ ] C-1: `MockScenarioSwitcher` component
- [ ] C-2: Add to PreviewToolbar

### Phase D: Validation (0.5 days)
- [ ] Full e2e flow test

**Total: ~7 days**

---

## 🔑 Key Concepts

### Toast is NOT:
❌ A UI component drawn on canvas
❌ Something with a visual "show/hide" toggle  
❌ A node in the component tree

### Toast IS:
✅ An event action (like `navigate`)
✅ A behavioral declaration (goes in event chain)
✅ Time-based feedback (not layout-based)

### Event Chain Model
```typescript
// Flat (current):
Event → [Action1] → [Action2]

// Branching (needed):
Event → [ApiRequest]
          ├─ onSuccess: [Action1] → [Action2]
          └─ onFailure: [Action3]

// Only apiRequest branches; others stay flat
```

---

## 📂 Directory Structure

```
apps/design_front/
├── src/
│   ├── views/editor/
│   │   ├── Canvas/              ← Canvas rendering
│   │   ├── AiOperationToast/    ← Reference toast
│   │   ├── hooks/               ← useZoomPan, etc
│   │   ├── panels/              ← Property panels
│   │   └── utils/               ← Helpers
│   ├── stores/
│   │   ├── editor/              ← EditorStore (MobX)
│   │   ├── project/
│   │   └── ...
│   └── services/
```

---

## 💡 Design Philosophy

### Spatial vs Temporal
```
Layout Components (on canvas):
  "What is there?" + "Where is it?"
  → Button at (100, 200)
  → Image at (50, 150)

Interaction Feedback (in event chains):
  "When does it appear?" + "Why?"
  → Toast when request succeeds
  → Loading when request starts
  → Modal when user confirms action
```

### No Magic Numbers
Every Toast configuration is explicit:
- Where it appears: In the event chain (not floating in space)
- When it appears: Event chain position determines timing
- What it shows: Literal message or `{{expression}}`
- How long: System default (auto-dismiss)

---

## 🧪 Testing Checklist

- [ ] Create event with apiRequest → onSuccess Toast
- [ ] Preview with success Mock scenario → Toast shows
- [ ] Switch Mock to failure → Different Toast shows
- [ ] Verify Toast message binds `{{response.data}}`
- [ ] Check Feedback Overview lists all Toasts correctly
- [ ] Click "Locate" → Selects triggering element
- [ ] Click "Preview" → Shows Toast effect for 2 sec

---

## 📚 References

**Related Docs:**
- `design_docs/02-product/editor/09-interaction-binding/` - Event system
- `design_docs/02-product/editor/10-preview-mode/` - Preview engine
- `design_docs/03-tech/design-schema.md` - Schema types
- `design_docs/03-tech/design-operations.md` - Operation system

**Code Examples:**
- `AiOperationToast/index.tsx` - Toast + MobX pattern
- `Canvas/index.tsx` - Store integration

