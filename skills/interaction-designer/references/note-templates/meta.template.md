> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-meta
> 对应 schema 字段：每个交互节点 meta.interaction + 屏级 meta.interaction（最终汇总）

# Step I-meta: <屏名> — meta.interaction 叙事落库

> 在所有 events / 衍生视图任务做完后做。把"为什么这么交互"的叙事沉淀到节点级 meta（B 类信息，渲染契约不读）。

## 推理过程

### 1. 节点级叙事清单

> 列出所有写过 events 的节点，给每个补 meta.interaction（summary + states + flows）。

| 节点 name | summary（1-2 句）| states | flows |
|----------|-----------------|--------|-------|
| ModeToggle | click 切换验证码/密码 mode | ["code-mode","password-mode"] | { mainFlow: "click→state.set→表单淡入淡出" } |
| PhoneInput | 受控双向绑定 + onChange 校验 | ["empty","valid","invalid"] | { validation: "onChange→state.set errors.phone" } |
| SubmitBtn | 登录提交主流程（核心）| ["disabled","enabled","loading","success","error"] | { mainFlow: "click→guard→effect.fetch→onSuccess/onError", errorRecovery: "shake+Toast→focus credential" } |
| ... | | | |

### 2. 屏级 meta.interaction 汇总

> 所有 5 个分析任务（statemachine / operations / loading / errors / boundaries）的产物在前面已落到 screen.meta.interaction 各字段。本任务**只做最终核对**，不重复落。

核对清单：

- [ ] summary 写完
- [ ] states 写完
- [ ] operations 7 列齐
- [ ] loadingStrategy 5 场景齐
- [ ] errorHandling 6 类齐
- [ ] boundaries 7 类齐

### 3. 候选方案与否决

- 候选 A：节点级 meta 也写 effects 段 → 否决：effects 是设计阶段的视觉效果，interaction 阶段只写交互职责
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 每个交互节点 meta/set_node
meta/set_node {
  projectId, nodeId: <ModeToggle-id>,
  patch: {
    interaction: {
      summary: "click 切换验证码/密码 mode；切换时清空 errors",
      states: ["code-mode","password-mode"],
      flows: {
        mainFlow: "click→state.set view.loginMode→对应表单淡入淡出 200ms",
        boundary: "切换时保留手机号，仅清空错误"
      }
    }
  }
}

meta/set_node {
  projectId, nodeId: <SubmitBtn-id>,
  patch: {
    interaction: {
      summary: "登录提交主流程（核心）：guard + effect.fetch + onSuccess 跳转 / onError 累加失败 + 锁定",
      states: ["disabled","enabled","loading","success","error"],
      flows: {
        mainFlow: "click→guard(canSubmit && !submitting && !locked)→effect.fetch(ds-login)→onSuccess(写 session+nav.go) / onError(累加 failureCount→logic.if 锁定/shake)",
        errorRecovery: "shake + Toast + focus credential",
        lockEscalation: "failureCount>=5→state.set view.lockedUntil→locked Sheet 自动 showWhen"
      }
    }
  }
}

// ... 其他节点

// 2) 屏级最终标记 phase（如本屏所有任务 done 且 integrity 通过，由 I-X-integrity 任务做；本任务一般不打 phase）
```
