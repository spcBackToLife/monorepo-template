# Design UI Monorepo - Issue Investigation Index

## 📋 Overview

This directory contains a comprehensive investigation of 3 critical issues in the design-ui-monorepo codebase. All issues have been analyzed with exact file locations, line numbers, and recommended fixes.

## 📁 Report Files

### 1. **ISSUE_INVESTIGATION_REPORT.md** (14 KB)
   **Comprehensive deep-dive analysis**
   - Full executive summary for all 3 issues
   - Detailed behavior analysis for each issue
   - Root cause locations with exact file paths and line numbers
   - Code snippets showing problematic code
   - Assessment of whether each is a bug or missing feature
   - Multiple recommended fix options for each issue
   - File structure summary

   **Best for**: Understanding the full context, planning implementation

### 2. **ISSUE_SUMMARY.txt** (8.5 KB)
   **Executive summary format**
   - Quick overview of all 3 issues
   - Location summary with line ranges
   - Current behavior explanation
   - Assessment (bug/missing feature) with severity
   - Recommended fix options
   - Complete file reference
   - Key findings section

   **Best for**: Quick reference, team communication, status updates

### 3. **QUICK_REFERENCE.md** (6.2 KB)
   **Practical debugging and implementation guide**
   - Comparison matrix of all 3 issues
   - Quick debug checklists for each issue
   - Code snippets for key problem areas
   - Files to modify for fixes
   - Architecture flow diagrams
   - Testing commands
   - Verification steps

   **Best for**: Debugging, implementing fixes, testing

---

## 🎯 Issue Quick Links

### Issue 1: Element/Add Default Styles Injection ✅ CONFIRMED BUG
- **Severity**: HIGH
- **Status**: Definitive bug identified
- **Files**: 
  - `features/design-schema/src/registry/primitives.ts` (Lines 26-40, 377-379)
  - `features/design-operations/src/operations/element.ts` (Lines 53-162, 186-248)
- **Quick Summary**: Divs get unwanted flex defaults (display:flex, flexDirection:column, flex:1, minHeight:40px, minWidth:40px) causing squished layouts
- **Root Cause**: Two default sources (registry + practical defaults) merged together
- **Fix Complexity**: LOW-MEDIUM

### Issue 2: Material Design Application Stretching Icons ✅ CONFIRMED BUG
- **Severity**: HIGH
- **Status**: Definitive bug identified
- **Files**:
  - `apps/design-mcp/src/tools/domain/canvas.ts` (export_and_apply handler)
  - `features/design-operations/src/operations/material.ts` (Lines 22-131)
- **Quick Summary**: 20x20 icons stretched to 48x48 containers, visually distorted
- **Root Cause**: `backgroundSize: 'contain'` causes scaling instead of sizing
- **Fix Complexity**: MEDIUM

### Issue 3: Preview Engine - visibleWhen + state.set ⚠️ NEEDS VERIFICATION
- **Severity**: CRITICAL (if real)
- **Status**: Architecture appears correct, likely user error
- **Files**:
  - `features/design-engine/src/preview/PreviewRenderer.tsx` (Lines 84-90, 181-185)
  - `features/design-engine/src/state/Store.ts` (Lines 17-68)
  - `features/design-engine/src/state/Dispatcher.ts` (Lines 84-90, 145-153)
  - `features/design-engine/src/styles/resolveProps.ts` (Lines 52-59)
- **Quick Summary**: Reactive UI not updating when state.set called
- **Root Cause**: Likely state path mismatch (state.data vs state.view)
- **Fix Complexity**: MEDIUM (if real bug exists)
- **Verification**: Create test case with correct state path

---

## 📊 Quick Comparison

| Aspect | Issue 1 | Issue 2 | Issue 3 |
|--------|---------|---------|---------|
| **Status** | ✅ BUG | ✅ BUG | ⚠️ VERIFY |
| **Severity** | HIGH | HIGH | CRITICAL |
| **Root Cause Found** | YES | YES | LIKELY USER ERROR |
| **Fix Complexity** | LOW-MED | MEDIUM | MEDIUM |
| **Architecture OK** | N/A | N/A | ✅ YES |

---

## 🔍 How to Use These Documents

### For Quick Understanding
1. Read **QUICK_REFERENCE.md** → Issue Comparison Matrix section
2. Find your issue in the matrix
3. Review the architecture diagram for that issue

### For Detailed Analysis
1. Start with **ISSUE_SUMMARY.txt** → ASSESSMENT sections
2. Reference **ISSUE_INVESTIGATION_REPORT.md** for detailed context
3. Use file paths and line numbers to navigate source code

### For Implementation
1. Read **QUICK_REFERENCE.md** → Files to Modify for Fixes
2. Review the recommended fix options in **ISSUE_INVESTIGATION_REPORT.md**
3. Use the debug checklist in **QUICK_REFERENCE.md** to verify your fix

### For Testing/Verification
1. Follow debug checklist in **QUICK_REFERENCE.md**
2. Use testing commands section for file discovery
3. Refer to architecture diagrams to understand expected behavior

---

## 🛠️ Implementation Roadmap

### Issue 1: Default Styles
**Recommended**: Option B (Remove from PRIMITIVES, best long-term)

Steps:
1. Remove `defaultStyles` from PRIMITIVES registry entries
2. Add `skipDefaults?: boolean` parameter to `element/add`
3. Update tests to verify no defaults applied
4. Document new behavior in API docs

### Issue 2: Icon Stretching
**Recommended**: Option B (backgroundSize: '20px 20px')

Steps:
1. Locate exact icon dimensions in material metadata
2. Change `backgroundSize: 'contain'` to `backgroundSize: '20px 20px'`
3. Add integration tests with various container sizes
4. Verify visual output in preview mode

### Issue 3: visibleWhen Reactivity
**First**: Verification required

Steps:
1. Create test case per verification steps
2. Run in preview mode with debug logging
3. If user error: Document state.set path usage
4. If bug found: Add logging to pinpoint issue

---

## 📌 Key Code Locations

### Default Styles (Issue 1)
```typescript
// primitives.ts - Line 26-40
div: {
  tag: 'div',
  defaultStyles: {
    display: 'flex',        // ← REMOVE
    flexDirection: 'column', // ← REMOVE
    minHeight: '40px',       // ← REMOVE
    minWidth: '40px',        // ← REMOVE
  }
}

// element.ts - Line 147-153
const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
const practicalDefaults = inferPracticalDefaults(tag, parent?.styles, layoutHint);
styles: { ...defaultStyles, ...practicalDefaults, ...(styles ?? {}) } // ← BOTH APPLIED
```

### Icon Stretching (Issue 2)
```typescript
// canvas.ts - export_and_apply
styleUpdates: {
  backgroundImage: `url("${imgUrl}")`,
  backgroundSize: 'contain',  // ← CHANGE TO: '20px 20px'
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
}
```

### Reactive State (Issue 3)
```typescript
// PreviewRenderer.tsx - Lines 86-90 (should work correctly)
useEffect(() => {
  const unsub = storeRef.current.subscribe(() => forceTick((n) => n + 1));
  return unsub;
}, []);
```

---

## 📞 Questions & Next Steps

### Issue 1 Questions
- Should we keep `inferPracticalDefaults()` or also remove it?
- What's the priority of this fix? (blocks many layouts)

### Issue 2 Questions
- Are there other CSS targets (border-image, etc.) with similar issues?
- Should icon dimensions be stored in material metadata?

### Issue 3 Questions
- Has this issue been verified with actual test case?
- What's the correct state path for loginMode? (data vs view)

---

## 📚 Related Documentation

- Design Schema: `features/design-schema/README.md`
- Design Operations: `features/design-operations/README.md`
- Design Engine: `features/design-engine/README.md`
- MCP Tools: `apps/design-mcp/README.md`

---

## 📝 Document Metadata

- **Created**: 2026-05-28
- **Investigation Duration**: Completed in current session
- **Investigator**: Claude Code Assistant
- **Status**: Complete - Ready for implementation
- **Last Updated**: 2026-05-28

---

## 🎓 Investigation Summary

All three issues have been thoroughly analyzed:

✅ **Issue 1**: Root cause identified, multiple fix options provided
✅ **Issue 2**: Root cause identified, clear fix options provided
⚠️ **Issue 3**: Architecture verified as correct, likely user error (needs verification)

All documentation is located in repository root for easy access and team collaboration.

