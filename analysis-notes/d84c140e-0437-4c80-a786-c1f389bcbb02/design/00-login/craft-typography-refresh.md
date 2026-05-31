> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-craft-typography-refresh

---

# D-00-login-craft-typography-refresh — Craft（创作执行）

## 1. 视觉目标

完成 v3 strategy 5 维之"字"段的全屏对账：
- BrandSlogan 字号 + 字重 + 字色 升级（解决用户截图「找到校园同好」字太弱不像品牌句）
- 全屏 700 → 600 字重对账（v2 实际已大量用 600，无 700 需降）
- FooterLinks 软化对账（v2 已用 caption + textSecondary + 400，已达 v3 strategy）

## 2. v2 现状盘点 → v3 决策

| 节点 | v2 实测 | v3 strategy 期望 | 需改 |
|---|---|---|:---:|
| BrandSlogan | body 14 / 400 / textSecondary | body-lg 16 / 500 / textPrimary（品牌句应有存在感）| ✅ |
| LockedTitle | h2 28 / 600（v2 已写）| h2 28 / 600 | – 已达 |
| SubmitBtn | body-lg 16 / 600 | body-lg 16 / 600 | – 已达 |
| CodeModeBtn / PasswordModeBtn 默认态 | body 14 / 500 | body 14 / 500 | – 已达 |
| Tab active 态 | 600（v2 已写）| 600 | – 已达 |
| RegisterLink / ForgotLink | caption 12 / 400 / textSecondary | caption 12 / 400 / textTertiary（更软化）| ⚠️ 候选 |
| 字重 700 出现处 | 无 | 取消 700 | – 无需降 |

## 3. RegisterLink / ForgotLink 软化决策

候选 A：维持 textSecondary 0.80α（v2 已写）
候选 B：降到 textTertiary 0.45α（更软）

**选 A 不动**——理由：
- ForgotLink 是「找回密码」入口，textTertiary 0.45α 视觉上像是 disabled，会降低可发现性
- 截图中 FooterLinks 与 FormCard 之间确实有视觉断裂，但根因是**间距**（marginTop md=16 与 lg=24 之间），不是字色
- 间距已是 v2 spacing.md 16 → 不在 typography craft 范围内调

## 4. 落库清单

仅 1 节点 1 操作：
- BrandSlogan: fontSize body-lg / fontWeight 500 / color textPrimary

## 5. 自检

- [x] 全屏字重 v2 对账完毕（无 700 需降）
- [x] BrandSlogan 升级（body-lg 16 / 500 / textPrimary）
- [x] FooterLinks 软化论证否决（A 维持，理由：可发现性 + 根因是间距非字色）
- [x] 按 v3 strategy 5 维字号梯度（28/20/16/14/12）核对：登录页只用 28(LockedTitle) + 16(SubmitBtn/Input/BrandSlogan) + 14(label/Tab/PolicyText) + 12(error/footer) = 4 档（display 28 留给 LockedTitle，h4 20 不出现，其余 caption+body+body-lg）
