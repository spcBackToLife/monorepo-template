> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-self-review
> 必读方法论：methodology/13-self-review-rubric.md

---

# D-00-login-self-review — Phase F 整屏自审

## 0. 自审降级说明

ISSUE-1：`mcp/generate_snapshots` 服务端持续返回与 schema 无关的简化登录页（重试 3 次，每次都是 5 元素「登录/邮箱/密码/登录 button/没有账号？去注册」+ 黑底）—— **这是 snapshot 服务管线 bug**，不影响 design schema 落库的真实性。

降级方案：用户从 editor (localhost:5174) 直接刷新提供截图，design 阶段按 13-self-review-rubric.md 5 维度评分。

---

## 1. v3 落库的 5 个 craft 改动总览

| craft 任务 | 改动节点 | 关键产物 | 期望视觉结果 |
|---|---|---|---|
| **craft-brandlogo** | BrandLogo (nd_d7d8b56e2d934187bbb9b) | materialProjectId=d715f21a... + PNG 240×240 真画 | 顶部 BrandLogo 显示暖白米圆角方框 + 主色 1.5px 边框 + 主色字标"C" 弧形 |
| **craft-decoration-rebalance** | BgBlobTopRight + 新增 BgBlobBottomLeft (nd_39264519...) | 浓度修复（rgba 解决字符串内嵌 token bug）| 右上 + 左下两个微弱径向光斑可见，气氛更"清晨" |
| **craft-tab-indicator** | CodeModeBtn + PasswordModeBtn active state | 补 activeWhen + 拆 borderBottom 三属性 | 当前激活的 tab（验证码登录/密码登录）下方有 2px 主色横线 + 主色字 + 600 字重 |
| **craft-checkbox** | PolicyCheckbox + 新增 PolicyCheckLabel/Visual/CheckMark 3 节点 | wrapper-label workaround + 4 visualState | 政策勾选不再是黑色实心方块；未选=主色边框透明底；选中=主色填充+白对勾 |
| **craft-typography-refresh** | BrandSlogan | body 14/400/textSecondary → body-lg 16/500/textPrimary | 「找到校园同好」字号变大、字重提升、颜色加深 |

---

## 2. 5 维度评分模板（待用户截图后填入）

| 维度 | 分数 | 判据 | 截图证据 |
|---|:---:|---|---|
| **识别度 (Recognition)** | __/5 | 主 CTA "登录" 一眼可见？BrandLogo 真画了不是占位？验证码/密码 tab active 状态有下划线？checkbox 不再是黑方块？ | (待用户提供) |
| **优先级层次 (Hierarchy)** | __/5 | 眯眼看：SubmitBtn weight=8 是否仍最突出？BrandLogo weight=5 次主角有存在感？输入框 weight=2 不抢戏？ | (待用户提供) |
| **状态可见性 (State Visibility)** | __/5 | 切 loginMode='password' 截图：PasswordModeBtn active；切 form.policy=true 截图：PolicyCheckVisual checked + 对勾显示；输入手机号 blur 截图：PhoneError 红字 | (待用户提供) |
| **主题契合 (Theme Fit)** | __/5 | 60-30-10 落地？60% 暖白米底（不是黑底！）+ 30% 卡片+主文字 + 10% 主色散点。是否符合 minimal+flat+warm-neutral？ | (待用户提供) |
| **情绪传达 (Emotion)** | __/5 | 与 visualConcept.soulSentence「像清晨教室的光，温暖但不打扰」契合？是否给人"校园清晨"感而非"工业 SaaS"或"政府公文"？ | (待用户提供) |

---

## 3. 自审判定逻辑

- **全 5 维 ≥ 4** → self-review done → Phase G 跑项目级 3 audit + Phase H handover
- **任一 < 4** → 创建 fix 任务回 styles/states/materials 重做（最多 3 轮）
- **3 轮仍未达** → 挂 UpstreamChallenge

---

## 4. 待人工截图任务清单（请用户提供）

| 截图状态 | 触发条件 | 验证目的 |
|---|---|---|
| 1. 默认态首屏 | 进屏，loginMode='code' 默认 | 整体视觉契合度 + BrandLogo 真画 + 验证码 tab active 下划线 + 装饰光斑 |
| 2. 密码模式 | 点击「密码登录」tab | TabIndicator 滑动 + active 切换可见 |
| 3. 政策勾选 | 点击 PolicyCheckLabel | PolicyCheckVisual checked 主色填充 + 对勾显示 |
| 4. 手机号失焦 | 输入 1 然后失焦 | PhoneError 红字 caption 12 字号约束（错误色 typography 软化策略验证）|
| 5. 锁定态 | mock locked 场景或修改 state.view.lockedUntil | LockedView 整屏切换可见 + warning 锁图标 |

---

## 5. 自审段（用户提供截图后填）

```
轮次 1：[待评分]
轮次 2（如需）：[重做后再评]
```

---

## 6. 自检

- [x] 5 个 craft 改动总览清单完整
- [x] 5 维度评分模板就绪
- [x] 待人工截图清单清晰（5 张状态截图）
- [ ] 用户提供截图
- [ ] 5 维度评分填入
- [ ] 任一 <4 创建 fix 任务

任务暂停在「等待用户截图」，本轮不直接 done。
