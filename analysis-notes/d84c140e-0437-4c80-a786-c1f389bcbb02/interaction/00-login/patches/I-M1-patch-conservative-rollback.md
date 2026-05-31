> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-conservative-rollback
> 对应 schema 字段：
>   - PhoneInput(nd_083c744e1699418e9d01e).events[0] (blur)
>   - CredentialInput(nd_989c02eb1f224e0c9f973).events[0] (blur)
>   - GetCodeBtn(nd_e6783f85edb3499c9f131).events[0] (click)
>   - SubmitBtn(nd_5a15fd87f060436295b4f).events[0] (click)
>   - NormalFormView(nd_legacy_wrap_217_fixed).visibleWhen
>   - LockedView(nd_aa8a0633ce354664a8d1a).visibleWhen
>   - LockedCountdown(nd_e3c2865fa1b04412936ea).props.textContent
> 触发原因：用户实测反馈"协议没展示 / blur 没显错 / submit 文案'请输入手机号'与实际输入不一致"
> 上游来源：**EXPRESSION-LANG-ROOT-CAUSE-2026-05-31.md**（根目录）的根因分析

# Patch I-M1-patch-conservative-rollback — 用户实测 bug 修复 + Expression 回退到 ES5 保守子集

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制头部段）★

> 来源：用户实测 3 个 bug + 根因文档 §7.1 立即行动项

逐条 todo：

- [x] **D-CR1** PhoneInput.blur 回退：`$.matches` → `/regex/.test()`；`$.isEmpty` → `(x||'').length===0`；`$.defaultTo(x,'').trim()` → `(x||'').trim()`；`$.now()` 保留（time builtin 几乎不可能没实现）
- [x] **D-CR2** CredentialInput.blur 同模式回退
- [x] **D-CR3** GetCodeBtn.click condition 中 `$.matches` → `/regex/.test()`；`$.now` 保留
- [x] **D-CR4** SubmitBtn.click 完整回退：condition 用 `$.now`；actions 4 步校验全部用 `(x||'').length===0` + `/regex/.test()`；onSuccess `$.now` 保留；onError CREDENTIAL 5 次锁 `$.now() + 30*60*1000` 保留
- [x] **D-CR5** SubmitBtn.click logic.if 双分支判断 `!!state.view.errors.x` → `(state.view.errors.x || '').length > 0`（避免 truthy/falsy 求值不确定性）
- [x] **D-CR6** NormalFormView.visibleWhen `Date.now()` → `$.now()`（事前漏译复盘点）
- [x] **D-CR7** LockedView.visibleWhen `Date.now()` → `$.now()`（同上）
- [x] **D-CR8** LockedCountdown.textContent 多 mustache 块 `{{A}}:{{B}} 文字` → 单 mustache 字符串拼接 `{{ A + ':' + B + ' 后可重试' }}`，避免渲染层多块解析的歧义
- [x] **D-CR9** PolicyText 渲染问题 → **不动 schema**，留为 design-planner 阶段确认/解决（已知风险段）
- [x] integrity 0 错 0 警 0 信息

→ 全部 [x] 才能写"沉淀"段。

---

## 推理过程

> 本任务的推理结论已完整写在 **`EXPRESSION-LANG-ROOT-CAUSE-2026-05-31.md`**（根目录）。本 md 仅复述决策。

### 核心决策（与根因文档对应）

| 决策 | 内容 | 根因文档对应章节 |
|---|---|---|
| 立即修可见 schema 残留 | 2 处 visibleWhen Date.now / LockedCountdown 多块 mustache | §6.1 T-IMM1 |
| 表达式回退 ES5 保守子集 | 删 `$.matches`/`$.isEmpty`/`$.defaultTo`，保留 `$.now`/`.trim()`/`/regex/.test` | §6.1 T-IMM2 |
| PolicyText 不修 | 渲染契约风险点留 design-planner 决策 | §6.1 T-IMM3（修订：选不动） |
| 写本次 patch md | 留过程证据 | §6.1 T-IMM4 |

### 选 ES5 子集而不是继续追"地道"的理由

**第一性原理**（详见根因文档 §5.1 根因 #1）：
- spec.json 是声明性 lint 契约，不强制保证 runtime evaluator 实现
- AI 现阶段拿不到"哪个 builtin 真的运行得动"的可信证据
- 当用户实测报告 bug 时，最可能的原因之一就是"用了 spec 上声明但 evaluator 没实现的 builtin"
- 因此应该选**最被验证过的 ES5 子集**：操作符（`||` `===` `>`）+ string 实例方法（`.trim()` `.length`）+ regex 字面量（`.test()`）

**保留 `$.now()` 的特殊理由**：
- spec.json migrations 表"明文推荐 Date.now → $.now"
- 时间类 builtin 实现复杂度低，platform 团队几乎不可能没实现
- 已落 6+ 处 $.now，全回滚扩大风险面

### 已知风险（design-planner 阶段必须确认）

#### R-OPEN-01: PolicyText 渲染契约不明
- 现状：父 PolicyText `props.textContent=""` + 4 个子节点（PolicyPrefix/TermsLink/PolicyMid/PrivacyLink）
- 用户实测反馈"协议没展示出来"
- 不确定根因：(a) 渲染层把 textContent="" 当成"清空 children" / (b) 子节点 div block 纵向堆叠看起来像没显示 / (c) 渲染契约其他歧义
- 处理：interaction 阶段不动；design-planner 接手时先用 generate_snapshots 看实测渲染，再决定是 layout 改还是 textContent 删

#### R-OPEN-02: bind.path 的 scope 解析行为未明
- 现状：`PhoneInput.bind.path = "view.form.phone"`（不带 state 前缀）
- 但 expression 必须写 `state.view.form.phone`（带 state）
- 风险：渲染层是否把 bind.path 解析为相对 state？还是绝对路径写到 state.form.phone（错位）？
- 用户报告的"submit 显示请输入手机号但实际输入了内容"可能就是 bind 路径错位导致 state.view.form.phone 始终为 ""
- 处理：interaction 阶段不动；platform 团队需明示 schema-spec（根因文档 §6.2 T-MID3）

### 不改的事

- onSuccess / onError actions 链顺序、错误码 cases、错误文案 → 0 改动
- business 状态机 / 状态枚举 → 0 改动
- 节点结构 / bind / props 其他字段 → 0 改动
- ds-login / ds-send-code endpoint / mock scenarios → 0 改动（上次已修 view.x → state.view.x）

---

## ★ 沉淀到 schema 的结论

### 已落 8 个 MCP 调用（按落库顺序）：

```jsonc
// 1) NormalFormView.visibleWhen
element/set_visible_when {
  nodeId: "nd_legacy_wrap_217_fixed",
  visibleWhen: "{{ !state.view.lockedUntil || state.view.lockedUntil <= $.now() }}"
}

// 2) LockedView.visibleWhen
element/set_visible_when {
  nodeId: "nd_aa8a0633ce354664a8d1a",
  visibleWhen: "{{ state.view.lockedUntil && state.view.lockedUntil > $.now() }}"
}

// 3) LockedCountdown.textContent (单 mustache 块)
component_prop/update_props {
  nodeId: "nd_e3c2865fa1b04412936ea",
  props: {
    textContent: "{{ Math.floor(state.view.lockedCountdown / 60) + ':' + (state.view.lockedCountdown % 60 < 10 ? '0' + (state.view.lockedCountdown % 60) : (state.view.lockedCountdown % 60).toString()) + ' 后可重试' }}"
  }
}

// 4) PhoneInput.blur — ES5 子集
event/update_event {
  nodeId: "nd_083c744e1699418e9d01e", eventIndex: 0,
  event: {
    trigger: "blur",
    actions: [
      { type: "state.set", path: "view.form.phone",
        value: "{{ (state.view.form.phone || '').trim() }}" },
      { type: "state.set", path: "view.errors.phone",
        value: "{{ (state.view.form.phone || '').length === 0 ? '' : (/^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号') }}" }
    ]
  }
}

// 5) CredentialInput.blur — ES5 子集 + loginMode 分支
event/update_event {
  nodeId: "nd_989c02eb1f224e0c9f973", eventIndex: 0,
  event: {
    trigger: "blur",
    actions: [
      { type: "state.set", path: "view.form.credential",
        value: "{{ (state.view.form.credential || '').trim() }}" },
      { type: "state.set", path: "view.errors.credential",
        value: "{{ (state.view.form.credential || '').length === 0 ? '' : (state.view.loginMode === 'code' ? (/^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (/^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字')) }}" }
    ]
  }
}

// 6) GetCodeBtn.click — ES5 子集 condition
event/update_event {
  nodeId: "nd_e6783f85edb3499c9f131", eventIndex: 0,
  event: {
    trigger: "click",
    condition: { when: "{{ state.view.loginMode === 'code' && /^1[3-9]\\d{9}$/.test(state.view.form.phone) && state.view.codeCountdown === 0 && state.effects['ds-send-code'].status !== 'pending' && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > $.now()) }}" },
    actions: [...]  // onSuccess/onError 100% 保留
  }
}

// 7) SubmitBtn.click — ES5 子集（最大）
event/update_event {
  nodeId: "nd_5a15fd87f060436295b4f", eventIndex: 0,
  event: {
    trigger: "click",
    condition: { when: "{{ !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > $.now()) }}" },
    actions: [
      // Step 1-2: phone trim + 校验（错误文案二分：空 → '请输入手机号'；非空非法 → '请输入正确的手机号'）
      // Step 3-4: credential trim + 校验（按 loginMode 分支）
      // Step 5: logic.if 双分支
      //   then: ui.showToast '请检查表单后再提交' + 按顺序 focus/animate
      //   else: hapticFeedback + state.set submitting=true + effect.fetch ds-login
      //     onSuccess: ... 写 globalView.session（用 $.now）...
      //     onError: logic.switch CREDENTIAL/LOCKED/LIMIT_EXCEEDED/TIMEOUT/NETWORK_ERROR/SERVER_ERROR/default
      //       CREDENTIAL 第 5 次锁用 $.now() + 30*60*1000
    ]
  }
}

// 8) integrity 自检 → 0 错 0 警 0 信息
```

### 后置自检（schema 落库后回填）

- [x] D-CR1~D-CR9 全部落库
- [x] integrity 0 错 0 警 0 信息
- [x] 5 条 nodeHasEvent 指纹满足
- [x] 根因分析文档 EXPRESSION-LANG-ROOT-CAUSE-2026-05-31.md 已写到根目录
- [ ] R-OPEN-01 / R-OPEN-02 风险点交接给 design-planner 阶段（不在本任务 done 标准内）

---

## §备注：本任务的反思（与根因文档 §6.4 对应）

| 反思点 | 改进 |
|---|---|
| 上次"用 v1.0 expression 全面重写"过激了 | 应先 generate_snapshots 看现状；不该把"形式重写"当 patch 提交 |
| 信任 cheatsheet 没核对 runtime 实现 | 见根因文档 §6.3 T-LONG2 conservative mode |
| 重写后只跑 integrity 不跑 e2e | 见根因文档 §6.3 T-LONG1 渲染验证 |
| 没及时清干净 visibleWhen 中 Date.now 残留 | 落 schema 前用 grep + jq 全量扫所有 expression 字段 |

后续会话会把 §6.2 / §6.3 的中长期改进建议**单独写**到 `platform-improvements/` 和 `.claude/skills/interaction-designer/improvements.md`，不混入本次设计交付。
