# AI Rules — Design System Guidelines

This document guides AI assistants (Claude, Cursor Code) in following design system best practices when operating this design tool via MCP.

## Table of Contents

1. [Scrollable Layout Pattern](#scrollable-layout-pattern)
2. [Element Addition Guidelines](#element-addition-guidelines)
3. [Repeat Template Best Practices](#repeat-template-best-practices)
4. [Layout Hints Reference](#layout-hints-reference)
5. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Scrollable Layout Pattern

### "Top Fixed + Middle Scrollable + Bottom Fixed" Pattern

This is the most common responsive layout pattern. Implement it as follows:

#### 1. Container Setup
```
Container div
├── display: flex
├── flex-direction: column
├── height: 100% (or 100vh for full viewport)
└── width: 100%
```

#### 2. Header (Sticky Top)
```
Header div
├── layoutHint: "sticky-header" (auto-applies position:sticky/top:0)
├── height: auto (content-based)
├── width: 100%
├── zIndex: 10
└── props: { textContent: "Header content" }
```

#### 3. Middle Content (Scrollable)
```
Content Container div
├── flex: 1 (fills available space)
├── layoutHint: "fill-parent"
├── overflow: auto (enables scrolling)
├── display: flex / block (depending on children layout)
└── children: list items with layoutHint: "scroll-child"
```

#### 4. Footer (Sticky Bottom)
```
Footer div
├── layoutHint: "sticky-footer" (auto-applies position:sticky/bottom:0)
├── height: auto (content-based)
├── width: 100%
├── zIndex: 10
└── props: { textContent: "Footer content" }
```

#### Complete Example
```javascript
// 1. Create container
element.add({
  projectId, parentId, tag: 'div',
  styles: { display: 'flex', flexDirection: 'column', height: '100%' }
})

// 2. Create header
element.add({
  projectId, parentId: containerId, tag: 'header',
  layoutHint: 'sticky-header',
  props: { textContent: 'Header' }
})

// 3. Create content area
element.add({
  projectId, parentId: containerId, tag: 'div',
  layoutHint: 'fill-parent',
  styles: { overflow: 'auto' }
})

// 4. Create footer
element.add({
  projectId, parentId: containerId, tag: 'footer',
  layoutHint: 'sticky-footer',
  props: { textContent: 'Footer' }
})
```

---

## Element Addition Guidelines

### Pre-Creation Checklist

Before adding elements, verify:

1. **Parent exists** — The parent container should already be created
2. **Parent is flex** — If using flex-based layouts, parent must have `display: flex`
3. **Height constraint** — If parent is not full viewport, set explicit height or `flex: 1` on parent
4. **Overflow handling** — For scrollable areas, set `overflow: auto` on parent

### Post-Creation Cleanup

After creating elements, always verify:

1. ✅ **Check flex hierarchy** — Ensure flex parents and flex children are correct
2. ✅ **Verify dimensions** — All containers should have width/height constraints
3. ✅ **Test overflow** — Scrollable areas need `overflow: auto` or `overflow-y: auto`
4. ✅ **Validate text rendering** — Text elements use `props.textContent` or `props.children` (NOT just tree children)
5. ✅ **Inspect layout hints** — Check that layoutHint is applied correctly to sticky/scrollable elements

### Text Content Handling (IMPORTANT)

**✗ WRONG:**
```javascript
// Putting text only in children, leaving props empty
element.add({ parentId, tag: 'button', children: ['Click me'] })
```

**✓ CORRECT:**
```javascript
// Using props.textContent for leaf text elements
element.add({ 
  parentId, tag: 'button',
  props: { textContent: 'Click me' }
})
```

**Why?** The rendering contract requires text to be in `props.textContent` or `props.children` (as expression strings), not in the tree children array. The tree children array is reserved for DOM child elements.

---

## Repeat Template Best Practices

### Overview

The `element.setRepeat()` operation creates list-rendered elements using a template:

```javascript
element.set_repeat({
  projectId, nodeId: containerId,
  repeat: {
    expression: '{{ state.data.messages }}',  // Must return an array
    template: {                                // Component structure for each item
      id: 'item-xxx',
      type: 'div',
      children: [
        // Each item's structure
      ]
    }
  }
})
```

### Template Structure Rules

1. **Template is a ComponentNode** — It's a complete node tree, not just styles
2. **Root node represents one item** — The template root is cloned for each array element
3. **Props access item/index/parent** — Within template, use `{{ item.field }}` or `{{ index }}`
4. **Children and template coexist** — Container node can have static children (empty states) AND a repeat template

### Example: Message List

```javascript
// Setup container
element.add({
  projectId, parentId,
  tag: 'div',
  styles: { display: 'flex', flexDirection: 'column', gap: '8px' },
  layoutHint: 'fill-parent'
})

// Create repeat template
element.set_repeat({
  projectId,
  nodeId: containerId,
  repeat: {
    expression: '{{ state.data.messages }}',
    template: {
      id: 'msg-item',
      type: 'div',
      children: [
        {
          id: 'msg-avatar',
          type: 'img',
          props: { src: '{{ item.avatar }}' },
          styles: { width: '40px', height: '40px', borderRadius: '50%' }
        },
        {
          id: 'msg-content',
          type: 'p',
          props: { textContent: '{{ item.text }}' },
          styles: { flex: 1, margin: '0' }
        }
      ]
    }
  }
})
```

### Template Expression Access

Within template expressions, you have access to:
- `item` — current array element
- `index` — current element index (0-based)
- `parent` — parent context (useful for accessing sibling data)

Example:
```javascript
// Show item number
props: { textContent: '{{ index + 1 }}. {{ item.name }}' }

// Conditional styling
styles: { 
  backgroundColor: '{{ item.active ? "#fff3cd" : "#fff" }}' 
}
```

### Common Mistakes

❌ **Mistake:** Putting template structure inside container's children
```javascript
// WRONG - template goes in the repeat object, not children
element.add({ tag: 'div' })
element.add({ parentId, tag: 'div', props: { textContent: '{{ item.name }}' } })
```

✅ **Correct:** Using element.set_repeat with proper template
```javascript
element.add({ tag: 'ul', layouts: 'fill-parent' })
element.set_repeat({
  nodeId: ulId,
  repeat: {
    expression: '{{ state.data.items }}',
    template: { type: 'li', ... }
  }
})
```

---

## Layout Hints Reference

### `scroll-child`
**Use when:** Child element inside a scrollable flex container

**Applies:** 
- `flex: 1, flexShrink: 0` (if parent is flex)
- `height: auto` (if parent is not flex)

**Example:**
```javascript
// Setup: flex container with overflow
element.add({
  parentId, tag: 'div',
  styles: { display: 'flex', flexDirection: 'column', overflow: 'auto', height: '400px' }
})

// Add children with scroll-child hint
element.add({
  parentId: flexContainerId, tag: 'div',
  layoutHint: 'scroll-child'
})
```

### `auto-size`
**Use when:** Element should size based on content (no explicit dimensions)

**Applies:** `{}` (no defaults, content-driven sizing)

**Example:**
```javascript
element.add({
  parentId, tag: 'span',
  layoutHint: 'auto-size',
  props: { textContent: 'Variable width text' }
})
```

### `fixed-height`
**Use when:** Element has fixed height but full width

**Applies:** `{ width: '100%', height: 'auto' }`

**Example:**
```javascript
element.add({
  parentId, tag: 'div',
  layoutHint: 'fixed-height',
  styles: { height: '100px', backgroundColor: '#f0f0f0' }
})
```

### `fill-parent`
**Use when:** Element should fill all available parent space

**Applies:** `{ flex: 1 }`

**Example:**
```javascript
element.add({
  parentId, tag: 'div',
  layoutHint: 'fill-parent',
  styles: { backgroundColor: '#f9f9f9' }
})
```

### `sticky-header`
**Use when:** Element should stick to top while scrolling

**Applies:** 
```javascript
{
  position: 'sticky',
  top: 0,
  height: 'auto',
  width: '100%',
  zIndex: 10
}
```

**Example:**
```javascript
element.add({
  parentId, tag: 'header',
  layoutHint: 'sticky-header',
  props: { textContent: 'Always Visible Header' }
})
```

### `sticky-footer`
**Use when:** Element should stick to bottom while scrolling

**Applies:**
```javascript
{
  position: 'sticky',
  bottom: 0,
  height: 'auto',
  width: '100%',
  zIndex: 10
}
```

**Example:**
```javascript
element.add({
  parentId, tag: 'footer',
  layoutHint: 'sticky-footer',
  props: { textContent: 'Always Visible Footer' }
})
```

---

## Common Mistakes to Avoid

### 1. Text in Tree Children vs Props

❌ **WRONG:**
```javascript
element.add({
  parentId, tag: 'p',
  children: ['Hello World']  // Wrong location
})
```

✅ **CORRECT:**
```javascript
element.add({
  parentId, tag: 'p',
  props: { textContent: 'Hello World' }
})
```

### 2. Forgetting Height Constraints

❌ **WRONG:**
```javascript
// Container has no height, flex child won't grow
element.add({
  parentId, tag: 'div',
  styles: { display: 'flex', flexDirection: 'column' }
})
element.add({
  parentId: flexId, tag: 'div',
  layoutHint: 'fill-parent'  // Won't fill anything
})
```

✅ **CORRECT:**
```javascript
// Container has explicit height
element.add({
  parentId, tag: 'div',
  styles: { 
    display: 'flex', 
    flexDirection: 'column',
    height: '100%'  // Important!
  }
})
element.add({
  parentId: flexId, tag: 'div',
  layoutHint: 'fill-parent'  // Now fills the 100% height
})
```

### 3. Missing Overflow for Scrollable

❌ **WRONG:**
```javascript
// Content overflows but won't scroll
element.add({
  parentId, tag: 'div',
  layoutHint: 'fill-parent'
  // Missing: overflow: 'auto'
})
```

✅ **CORRECT:**
```javascript
// Content scrolls properly
element.add({
  parentId, tag: 'div',
  layoutHint: 'fill-parent',
  styles: { overflow: 'auto' }  // Enable scrolling
})
```

### 4. Repeat Template Structure

❌ **WRONG:**
```javascript
// Setting repeat to just an expression string
element.set_repeat({
  nodeId, 
  repeat: '{{ state.data.items }}'  // Wrong format
})
```

✅ **CORRECT:**
```javascript
// Setting repeat with proper structure
element.set_repeat({
  nodeId,
  repeat: {
    expression: '{{ state.data.items }}',
    template: { /* complete ComponentNode */ }
  }
})
```

### 5. Sticky Without Container Height

❌ **WRONG:**
```javascript
// Sticky positioning won't work without scroll container
element.add({
  tag: 'div',
  styles: { display: 'flex', flexDirection: 'column' }
})
element.add({
  parentId: flexId, tag: 'header',
  layoutHint: 'sticky-header'  // Won't stick, no scroll container
})
```

✅ **CORRECT:**
```javascript
// Proper sticky setup
element.add({
  tag: 'div',
  styles: { 
    display: 'flex', 
    flexDirection: 'column',
    height: '100vh'  // Full viewport height
  }
})
element.add({
  parentId: flexId, tag: 'header',
  layoutHint: 'sticky-header'  // Now sticks to top
})
element.add({
  parentId: flexId, tag: 'div',
  layoutHint: 'fill-parent',
  styles: { overflow: 'auto' }  // Scrollable middle
})
```

---

## Troubleshooting Checklist

When a layout doesn't work as expected:

1. ✅ **Verify parent display type**
   ```javascript
   style.update({ nodeId: parentId, styles: { display: 'flex' } })
   ```

2. ✅ **Check height constraints**
   - Parent must have explicit `height` or `flex` value
   - Grandparent must have height for parent `flex: 1` to work

3. ✅ **Verify overflow settings**
   - Scrollable containers need `overflow: auto` or `overflow-y: auto`
   - Check `max-height` doesn't conflict

4. ✅ **Confirm layoutHint application**
   - `sticky-header` needs parent with explicit height
   - `fill-parent` needs flex parent
   - `scroll-child` needs `overflow: auto` on parent

5. ✅ **Test in actual browser**
   - Canvas preview might not show all responsive behaviors
   - Actual rendering may differ from editor

---

## When to Ask for Clarification

If you encounter any of these situations, ask the user:

1. **Ambiguous layout intent** — "Should this be sticky top or just fill available space?"
2. **Missing container parent** — "There's no flex container. Should I create one first?"
3. **Conflicting styles** — "Element has both `position: absolute` and `flex: 1`. Which behavior do you want?"
4. **Unclear data source** — "What data should this repeat list render? (state.data.items, etc.)"
5. **Responsive vs fixed** — "Should this layout adapt to different screen sizes (responsive) or stay fixed?"

---

## Element Naming Conventions

### Why Naming Matters

节点命名直接影响代码生成质量。codegen 引擎用 `node.name` 作为组件名、CSS class 名、handler 函数名的来源。**没有 name 的节点会产生无意义的代码标识符**（如 `handle3af1ecClick`、`components/68486350Item/`）。

### MUST: 创建容器节点后立即命名

每次调用 `element.add` 创建有语义的容器节点后，**必须紧跟** `element.rename` 设置符合规范的名称。

```
// 正确流程
element.add({ projectId, parentId, tag: 'div', ... })
→ 返回 { affectedNodeIds: ['nd_abc123'] }

element.rename({ projectId, nodeId: 'nd_abc123', name: 'ChatHeader' })
```

### 命名规范（MUST）

| 规则 | 正确示例 | 错误示例 |
|---|---|---|
| **PascalCase**（推荐，与组件名一致） | `ChatHeader`, `MessageList`, `SendButton` | `chat-header`, `chat_header` |
| **英文**，不用中文 | `UserAvatar` | `用户头像` |
| **无空格** | `InputBar` | `Input Bar` |
| **无特殊字符**（仅字母数字） | `FeatureGrid` | `feature-grid!`, `#header` |
| **语义化**，描述这个节点"是什么" | `MessageBubble` | `Div1`, `Container2` |
| **简洁**，2-4 个单词 | `NavBackButton` | `TheMainNavigationBackButtonContainer` |

### 必须命名的节点类型

| 场景 | 必须命名 | 可跳过 |
|---|---|---|
| 页面级容器（header/footer/content） | ✅ 必须 | |
| 有交互事件的元素 | ✅ 必须 | |
| repeat 列表容器 | ✅ 必须 | |
| repeat template 根节点 | ✅ 必须 | |
| 有 bind 的表单元素 | ✅ 必须 | |
| 纯布局 wrapper（无语义） | | ✅ 可跳过 |
| 叶子文本节点 | | ✅ 可跳过 |
| 纯装饰性图标 | | ✅ 可跳过 |

### 命名示例

```
Screen: "Chat - AI Conversation"
├── ChatPage (rootNode)
│   ├── ChatHeader
│   │   ├── BackButton
│   │   ├── PageTitle
│   │   └── MoreButton
│   ├── MessageList (repeat 容器)
│   │   └── MessageItem (repeat template)
│   │       ├── Avatar
│   │       └── Bubble
│   │           └── (p 文本节点 - 可不命名)
│   └── InputBar
│       ├── MessageInput (有 bind)
│       ├── SendButton (有事件)
│       ├── VoiceButton
│       └── ImageButton
```

### 不命名会导致什么

codegen 引擎在节点没有 name 时会用 node ID 的后几位作为标识符，产出：
- `components/68486350Item/index.tsx` — 无法理解的文件名
- `handleEe0ec9Click` — 无法理解的函数名
- `styles.nd3af1ec` — 无法理解的 CSS class 名

---

Last Updated: 2026-05-09
