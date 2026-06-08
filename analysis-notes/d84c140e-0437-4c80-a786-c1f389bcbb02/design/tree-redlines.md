# v9 节点结构 4 红线核对

## 红线 1：无组件实例（组件内联）

✅ 全屏 43 节点均为 primitive (div/input/button/img)，无 @component 实例。

---

## 红线 2：状态-节点对应（error/loading/disabled 都有对应节点）

✅ 已覆盖：
- error: `PhoneError` (nd_905bbf8e) + `CredentialError` (nd_d7657df8) 两节点存在
- loading: `SubmitSpinner` (nd_4363095a) + `CodeSendSpinner` (nd_3b4bbe880) 两节点存在
- disabled: 所有交互节点均有 `disabled` visualState

---

## 红线 3：样式完整（所有节点都有 styles）

✅ 全屏 43 节点 `hasStyles=true`，无遗漏。

---

## 红线 4：叶子有内容（textContent 或 children 非空）

✅ 已覆盖：
- 静态文案叶子：BrandSlogan / PhoneLabel / CredentialLabel / PolicyPrefix / TermsLink / PrivacyLink / LockedTitle / LockedHint / FooterLinks 等 9 个节点 `textContent` 非空
- 输入叶子：PhoneInput / CredentialInput 通过 `bind` 动态显示
- 装饰叶子：BgBlobTopRight / BgBlobBottomLeft 通过 `background` 渐变显示

---

## v8/v9 新增红线

### 红线 5：装饰节点 servingGoals 必挂

✅ 已覆盖：
- `BgBlobTopRight` (nd_4ed95fda): `servingGoals: [G1]`
- `BgBlobBottomLeft` (nd_...): `servingGoals: [G1]`

### 红线 6：visual-container servingGoals 必挂

✅ 已覆盖：
- `NormalFormView` (nd_legacy_wrap_217_fixed): `servingGoals: [G5]`
- `LockedView` (nd_aa8a0633): `servingGoals: [G5]`

### 红线 7：material-frame servingGoals 必挂

✅ 已覆盖：
- `BrandLogo` (nd_d7d8b56e): `kind: material-frame`, `servingGoals: [G4, G1]`

---

## 检查结论

**7/7 红线全过** ✅，无违反。可以标记 `D-00-login-v9-tree-redlines` 为 `done`。

---

*创建时间: 2026-06-06*
*作者: design-planner-v3 Phase G*
