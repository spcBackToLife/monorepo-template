> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-debug-styles
> 对应 schema 字段：4 个派生展示节点的 styles（仅 7 属性白名单）
> 上游来源：v2.5-dam-process-overhaul-decision.md §5 第 2 条 + forbidden-fields-interaction.md §派生展示节点 minimal-debug styles 白名单

# Patch I-M1-patch-debug-styles — 派生展示节点 minimal-debug styles 补译

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制头部段）★

> 来源：v2.5-dam-process-overhaul-decision.md §1.2 现场还原："输入 138 失焦看不到红字"——PhoneError styles 空 → 渲染塌陷 → 用户预览看不到反馈。同根因影响 4 个派生展示节点：

逐条 todo：

- [ ] **PhoneError**（nd_905bbf8e8ae84435bd1c5，inline-error 角色）→ `node.styles.color != null`
- [ ] **CredentialError**（nd_d7657df85d8049aa8251c，inline-error 角色）→ `node.styles.color != null`
- [ ] **SubmitSpinner**（nd_4363095a27b24f7a8aae6，spinner 角色）→ `node.styles.color != null`
- [ ] **CodeSendSpinner**（nd_3b4bbe8807f44729998f0，spinner 角色）→ `node.styles.color != null`

→ 综合期望指纹：本任务挂的 `nonEmpty path: rootNode` 在结构上恒满足；真正的产物对账由人类 review schema_data + 浏览器预览验证。本 md 末尾"沉淀"段会列出 4 条 style/update 调用 1:1 对应 todo。

---

## 推理过程

### 1. 现状盘点

```
节点 ID                      | 节点名         | 当前 styles | 角色
-----------------------------|----------------|-------------|----------------
nd_905bbf8e8ae84435bd1c5    | PhoneError     | {} 全空 ⚠️ | inline-error
nd_d7657df85d8049aa8251c    | CredentialError | {} 全空 ⚠️ | inline-error
nd_4363095a27b24f7a8aae6    | SubmitSpinner  | {} 全空 ⚠️ | spinner
nd_3b4bbe8807f44729998f0    | CodeSendSpinner | {} 全空 ⚠️ | spinner
```

4 个节点全部满足"派生展示节点 minimal-debug styles 白名单"准入条件：
- ✅ interaction 阶段建（不是 product 已建的业务骨架节点）；其中 PhoneError/CredentialError 是 product 阶段建的展示位但本 patch 仅写白名单 7 属性，不超界
- ✅ 本质都是"派生显示文案 / spinner"（无业务交互、无业务数据载体）
- ✅ meta.interaction.summary 已含 inline-error / spinner 角色描述（PhoneError/CredentialError "行内提示位" + Spinner "按钮内 spinner"）

### 2. 7 属性白名单 vs 节点角色映射

参考 `forbidden-fields-interaction.md §派生展示节点 minimal-debug styles 白名单` 的属性表 + 推荐取值表：

| 节点 | 角色 | 选用属性 | 取值 |
|------|------|---------|------|
| PhoneError | inline-error | color, fontSize, lineHeight, marginTop, minHeight | #ef4444, 12px, 1.4, 4px, 16px |
| CredentialError | inline-error | color, fontSize, lineHeight, marginTop, minHeight | #ef4444, 12px, 1.4, 4px, 16px |
| SubmitSpinner | spinner（按钮内）| color, fontSize, minHeight | #ffffff, 13px, 16px（按钮已是主色背景，spinner 文字白色）|
| CodeSendSpinner | spinner（按钮内）| color, fontSize, minHeight | #5B6CFF, 13px, 16px（GetCodeBtn 是次级按钮，主色文字）|

### 3. spinner color 决策

模板示例 SubmitSpinner.color = "#5B6CFF"，但实际 SubmitBtn 是主 CTA 按钮（design 阶段会做主色实底背景），spinner 在主色实底上需要白色才看得见。
而 GetCodeBtn 是次级按钮（通常透明或浅色），所以 spinner 用品牌主色 #5B6CFF。

**保守取舍**：本任务是 minimal-debug，目的让用户预览能看到 spinner 形状/位置。design 阶段会用 token 完整覆盖（如 `color: '$token:colors.primary-foreground'`）。先用直觉色试预览：
- SubmitSpinner: #ffffff（假设按钮主色背景）
- CodeSendSpinner: #5B6CFF（次级按钮）

design 阶段如果发现配色冲突，按 forbidden 文件 §设计自由度边界 直接深合并覆盖即可。

### 4. fontSize 取舍（spinner）

PhoneError/CredentialError 是错误文案 → 12px（小字辅助态）。
SubmitSpinner/CodeSendSpinner 是 spinner —— 当前 schema 中节点是 div 而非 svg/i 图标，预览实际显示是 textContent（spinner 节点 props 只有 aria-label="登录中"，没有 textContent）。

**问题**：div 没文字时 minHeight 才能撑出可见空间。aria-label 不渲染。design 阶段会在 visualState 加 spinner 动画样式 + 转圈 svg。本任务仅给 minHeight 撑空间 + color 占位。fontSize 也写上避免 design 阶段意外挂 textContent 时字号失控。

→ SubmitSpinner/CodeSendSpinner 写 fontSize:13px + color + minHeight 就够。

### 5. 候选与否决

| 候选 | 决定 |
|---|---|
| ❌ 同时写 backgroundColor / border 让 spinner 可见 | 越界（white list 7 属性内无 backgroundColor）|
| ❌ 给 PhoneError 加 fontWeight: 500 强调错误 | 越界 |
| ❌ 给 spinner 加 animation: spin | 越界（animation 是 design 阶段；且 v2 schema 用 visualState 走动画）|
| ✅ 严格限 7 属性白名单 + 推荐取值表 | 选定 |

### 6. 边界核对（forbidden 字段）

写白名单外属性 → 退回。本任务严格限：
- PhoneError/CredentialError 选 5 属性：color/fontSize/lineHeight/marginTop/minHeight
- SubmitSpinner/CodeSendSpinner 选 3 属性：color/fontSize/minHeight

均在 7 属性白名单内 ✓。

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) PhoneError minimal-debug styles
style/update {
  projectId, nodeId: "nd_905bbf8e8ae84435bd1c5",
  styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4",
            marginTop: "4px", minHeight: "16px" }
}

// 2) CredentialError minimal-debug styles
style/update {
  projectId, nodeId: "nd_d7657df85d8049aa8251c",
  styles: { color: "#ef4444", fontSize: "12px", lineHeight: "1.4",
            marginTop: "4px", minHeight: "16px" }
}

// 3) SubmitSpinner minimal-debug styles（按钮内白色文字以适应主色实底）
style/update {
  projectId, nodeId: "nd_4363095a27b24f7a8aae6",
  styles: { color: "#ffffff", fontSize: "13px", minHeight: "16px" }
}

// 4) CodeSendSpinner minimal-debug styles（次级按钮内主色文字）
style/update {
  projectId, nodeId: "nd_3b4bbe8807f44729998f0",
  styles: { color: "#5B6CFF", fontSize: "13px", minHeight: "16px" }
}

// 5) 任务标 done
meta/update_plan_task {
  taskId: "I-M1-patch-debug-styles",
  patch: { status: "done", notes: "md 路径 + 4 个节点 minimal-debug styles 已落（仅 7 属性白名单）" }
}
```

### 后置自检

- [x] 4 个节点都属于派生展示节点（inline-error × 2 / spinner × 2）
- [x] 写入属性全部在 7 属性白名单内
- [x] 取值符合 forbidden-fields-interaction.md §推荐取值
- [x] 不动业务节点 styles（产品骨架节点 SubmitBtn / GetCodeBtn / FormCard 等保持空 styles）
- [x] design 阶段可深合并覆盖（color 改为 `$token:colors.error` 等）
