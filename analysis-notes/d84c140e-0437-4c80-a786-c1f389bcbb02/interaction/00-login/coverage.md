> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-coverage
> 对应 schema 字段：—（覆盖核对的过程文档；若发现缺口则追加任务）
> 注：本 md 编写时间在 5 条漏译 patch + v2.6 NetworkPolicy 平台改造完成后，覆盖结果反映最新状态。

# Step I-M1-coverage: 00-login — 三轴覆盖核对

## 轴 1：rules → events / state / 衍生视图覆盖

遍历 product rules 6 条：

| rule | 对应实现 | ✓/❌ |
|------|---------|-----|
| **数据规则**：手机号 /^1[3-9]\d{9}$/ + 验证码 6 位 + 密码 6-20 位含字母数字 + view.loginMode/view.form.policy 默认值 | PhoneInput.blur + SubmitBtn.click 前置校验（双档 onBlur+onSubmit）→ state.set view.errors.phone/credential + PhoneError/CredentialError minimal-debug styles 行内显示；view.form 默认值已落 stateInit | ✓ |
| **业务规则**：登录成功写 globalView.session + 消费 nav.authRedirectTo；进屏 active 直跳 01-home | SubmitBtn.onSuccess（写 session 5 字段 + delay 500ms + logic.if authRedirectTo 消费 + nav.go）；Root.screenEnter（active 跳 01-home） | ✓ |
| **业务规则**：失败状态机 failureCount 累加 / ≥5 lockedUntil / 自动解锁 / 成功清零 | SubmitBtn.onError CREDENTIAL 累加 + 第5次写 lockedUntil；Root.screenEnter ui.startTimer onComplete 清零；onSuccess 清零 lockedUntil/failureCount | ✓ |
| **业务规则**：验证码倒计时 codeCountdown 0→60 + screenExit stopTimer | GetCodeBtn.onSuccess state.set 60 + ui.startTimer onTick -1；Root.screenExit ui.stopTimer codeCD | ✓ |
| **安全规则**：60s 冷却 + 当日≤10次 + 5 错锁 30min + 协议必勾 + 离线阻断 | codeCountdown 守卫；ds-send-code mock LIMIT_EXCEEDED 后端兜底（Toast）；lockedUntil 状态机；SubmitBtn 前置校验含 policy 守卫；condition 含 network online | ✓ |
| **边界 Case**：800ms 防抖 + screenExit cancel + maxLength 截断 | SubmitBtn condition !submitting；Root.screenExit effect.cancel × 2；PhoneInput.props.maxLength=11 + CredentialInput 动态 maxLength | ✓ |

## 轴 2：业务对象状态机覆盖

| 业务状态机字段 | 枚举值 | 对应视图节点 | visibleWhen | ✓/❌ |
|--------------|-------|-------------|------------|-----|
| 账号锁定状态机（lockedUntil 派生）| unlocked | NormalFormView(nd_legacy_wrap_217_fixed) | `!lockedUntil \|\| lockedUntil <= Date.now()` | ✓ |
| 同上 | locked | LockedView(nd_aa8a0633ce354664a8d1a) + 5 子节点 | `lockedUntil && lockedUntil > Date.now()` | ✓ |

注：登录页本身不承载传统业务对象状态机（如订单/任务）。账号锁定通过 view.lockedUntil 表达，本质是屏内派生状态机——已通过 challenge C-INT-00-login-001 accepted 后由 view-business 任务建 NormalFormView/LockedView 双子树覆盖。

## 轴 3：dataSource 三态覆盖

| dataSource | type | pending 视图 | empty 视图 | error 视图 | ✓/❌ |
|-----------|------|-------------|-----------|-----------|-----|
| ds-login | api（写入型）| SubmitBtn 内 SubmitSpinner（visibleWhen=submitting）+ 文字"登录中…" | n/a（写入型）| Toast 6 case（CREDENTIAL/LOCKED/LIMIT_EXCEEDED/**TIMEOUT**/NETWORK_ERROR/SERVER_ERROR + default）+ LockedView 接管 LOCKED 态；CREDENTIAL 含 shake | ✓ |
| ds-send-code | api（写入型）| GetCodeBtn 内 CodeSendSpinner（visibleWhen=effects.pending）+ 文字"发送中…" | n/a（写入型）| Toast 4 case（LIMIT_EXCEEDED/**TIMEOUT**/NETWORK_ERROR/SERVER_ERROR + default）| ✓ |
| ds-policy-text | static | n/a | n/a | n/a | n/a |

**v2.6 ★ TIMEOUT 独立 case 已配套补译**（见 patches/I-M1-patch-timeout-case.md）。

## NetworkPolicy 覆盖核对（v2.6 新增）

| ds | networkPolicy.timeout | retry | 一致性 |
|----|----------------------|-------|--------|
| ds-login | 15000ms | 0（关键认证流不重试）| ✓ 与 boundaries D-B1 + mock networkTimeout(delay=16000) 触发阈值一致 |
| ds-send-code | 10000ms | 0 | ✓ 与 boundaries D-B1 + mock networkTimeout(delay=11000) 触发阈值一致 |

## 缺口处理

✅ 三轴 + NetworkPolicy 覆盖核对全通过，无缺口。

5 条 v2.5-dam §5 漏译已通过 patch 任务全部闭环：
1. ✅ I-M1-patch-submit-prevalidate（D-E4(3)）
2. ✅ I-M1-patch-debug-styles（4 派生节点 minimal-debug styles）
3. ✅ I-M1-patch-policy-openurl（D-EV1 拆 4 子节点 + 双 ui.openUrl）
4. ✅ I-M1-patch-ds-login-timeout（D-DS6，借 v2.6 平台改造落 networkPolicy.timeout=15000）
5. ✅ I-M1-patch-ds-send-code-timeout（D-DS6'，落 networkPolicy.timeout=10000）

附加 v2.6 配套（不是漏译，是平台标准化）：
6. ✅ TIMEOUT 错误码独立 case（SubmitBtn + GetCodeBtn onError）

下一步 → I-M1-coverage 已 done；I-M1-integrity 已 done（含 v2.4 重构）。

---

## ★ 沉淀到 schema 的结论

```
✅ 三轴覆盖核对全通过 + NetworkPolicy 覆盖通过；无缺口。
本任务标 done。整个 interaction 阶段（含 5 条漏译 patch + v2.6 平台改造配套）闭环。
```
