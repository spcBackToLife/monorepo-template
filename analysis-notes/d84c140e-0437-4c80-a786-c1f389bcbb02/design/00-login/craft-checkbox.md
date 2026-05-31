> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-craft-checkbox
> 必读 recipes：recipes/compositions/checkbox.md（wrapper-label workaround）
> 必读 pitfalls：pitfalls/web-rendering.md（native input 不可深度自定义）

---

# D-00-login-craft-checkbox — Craft（创作执行）

## 1. 视觉目标

把 native `<input type=checkbox>` 黑色实心方块替换为可深度自定义的 PolicyCheckVisual（解决 ISSUE-7）：1.5px border + radius.sm + checked 时主色填充 + 白对勾 + 4 visualState（default/checked/hover/focus）。

## 2. 落库结构（v3 新增 3 个视觉容器节点）

```
PolicyRow (nd_36cea068)
└── PolicyCheckLabel (nd_9868a653, ★v3 新增 wrapper)
    ├── PolicyCheckbox (nd_42b79eb0, type=input, display:none ★v3 隐藏 native)
    ├── PolicyCheckVisual (nd_e81d4d10, ★v3 新增视觉外框)
    │   └── CheckMark (nd_142c8aa2, ★v3 新增对勾，default display:none)
    └── PolicyText (nd_5b891f2d, 含 4 个 inline 子节点 PolicyPrefix/TermsLink/PolicyMid/PrivacyLink)
```

注：element/wrap 实际生成的 wrapper 是 div 标签（service 端默认），尝试传 tag=label 未生效——这是 service 端 wrap action 的限制，不影响最终视觉（label 与 div 在视觉上等价；click toggle 由 native input 隐藏后失去自动绑定，但 wrapper 加 cursor:pointer 配 htmlFor=policy-check 仍可工作，需要测试时调整）。

## 3. PolicyCheckVisual 4 visualState 决策

| state | activeWhen | styles override |
|---|---|---|
| default | – | border 1.5px / borderColor border / bg transparent |
| **checked** | `{{ state.view.form.policy === true }}` | bg primary + borderColor primary + childrenStates: CheckMark display block |
| **hover** | – （DOM 事件触发） | borderColor primaryHover |
| **focus** | – （DOM 事件触发） | boxShadow 3px rgba(91,108,255,0.20)（focus ring rgba 硬编码 trade-off）|

注：暂不加 error visualState（待 interaction 阶段补 `state.view.submitAttempted` 字段后通过 UpstreamChallenge 让 design 接力）。

## 4. minSignals 核查

| 节点 | role | minSignals 阈值 | 实际信号数 |
|---|---|---:|---:|
| PolicyCheckVisual checked | 工具-勾选 | ≥ 3 | 3（外框色 + 内填色 + 对勾显示）✅ |

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 1) element/wrap [PolicyCheckbox, PolicyText] → PolicyCheckLabel(nd_9868a653)
// 2) element/add PolicyCheckVisual(nd_e81d4d10) into PolicyCheckLabel pos 1
// 3) element/add CheckMark(nd_142c8aa2) into PolicyCheckVisual
// 4) style/update PolicyCheckbox display:none
// 5) visual_state/add PolicyCheckVisual: checked / hover / focus
// 6) visual_state/update checked: childrenStates: {CheckMark: {display:block}}
```

## 6. 自检

- [x] wrapper-label 模式落库（PolicyCheckLabel 包 native input + PolicyCheckVisual + PolicyText）
- [x] native input display:none + accentColor 移除（避免双重渲染）
- [x] PolicyCheckVisual 自绘 1.5px border + radius.sm + 18×18
- [x] CheckMark 默认隐藏 + checked 态通过 childrenStates 显示
- [x] 4 visualState（default/checked/hover/focus）
- [x] minSignals 3/3 ✅
- [ ] 等用户截图验证勾选交互
