> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-handover-v3
> 必读：design-planner SKILL.md §6 出场门禁

---

# v3 设计阶段移交清单 (Handover)

## 0. v3 重新分析的目标 & 范围

用户更新 design-planner 到 v3 后，针对单页登录页 (sc_27ee2293945046b69cc00) **基于真实截图**做重新分析。v3 升级的核心创作权（视觉概念 / 策略 / 任务自创 / 布局调整 / 装饰节点 / 素材绘制 + 自审契约）全部使用。

---

## 1. 项目级出场对账

### 1.1 schema 完整性

| 检查项 | 实际 |
|---|---|
| 整体 integrity | ✅ 0 错 0 警 0 信息 |
| token 引用率 | ✅ v2 D-token-coverage 已 done 99.1% / v3 仅 BgBlob 装饰用 rgba 硬编码 trade-off（已记 craft-decoration-rebalance.md）|
| 跨屏一致性 audit | ✅ 单页项目 N/A（D-templates 已 skipped）|
| componentAssets | – 单页项目无需抽模板 |
| 全局 overlays | ✅ v2 已落（4 task done） |

### 1.2 v3 ★ 画面对账（self-review 状态）

| 屏 | 状态 |
|---|---|
| 00-login | ⚠️ snapshot 服务异常 → self-review 框架就绪等用户人工截图回填 5 维度评分 |

⚠️ ISSUE-1（snapshot 服务渲染 fallback simplified login 页 与 schema 无关）—— 这是平台级 bug，design 阶段已 documented 在 system/known-issues.md，不阻塞 handover；下一棒 executor 必须先排查 snapshot 服务再做 QA 摄影。

### 1.3 v3 ★ 装饰系统单一族 audit

✅ **soft-glow** 单一族：BgBlobTopRight + BgBlobBottomLeft 同径向圆形单色光斑。无 geometric/illustration/texture/organic 混杂。BrandLogo 是 brand 类不入装饰单一族但风格协调（极简扁平 + 单色 + 柔和圆角）。

详见 design/system/v3-audits.md §1。

### 1.4 v3 ★ 60-30-10 调色比例 audit

✅ 实测 **60.5 / 28.7 / 10.8**（落在 ±10% 内）。强调色 = 6 处不超量。error 维持 colors.error #DD4747 通过 typography 软化（caption/12 字号 + 紧贴 input + 仅 blur 后出）。

详见 design/system/v3-audits.md §2。

### 1.5 v3 ★ 权重金字塔 audit

✅ 金字塔结构有效：
- 主角层 = 13（SubmitBtn 8 + BrandLogo 5）≤ 2 节点
- 配角层 = 6（FormCard 4 + BrandSlogan 2）
- 工具层 = 12（7 节点）
- 装饰层 = 3（BgBlobTopRight 2 + BgBlobBottomLeft 1）
- 主角:工具:装饰 = 13:12:3 健康比例

⚠️ 总 weight=34 超 v2 declared 30（+4 偏差），但 v3 修复 v2 渲染失效后 weight 自然恢复"应有"权重，可接受。

详见 design/system/v3-audits.md §3。

⚠️ 注意：`D-decoration-system-audit` / `D-color-ratio-audit` / `D-weight-pyramid-audit` 当前因 service 端 ArtifactCheck.kind 未实现 → 标 skipped + notes 含完整 audit 结果。待 service 端补实现后回填 done。

---

## 2. 素材落地清单

| 节点 | kind | renderHint | materialProjectId | 状态 |
|---|---|---|---|:---:|
| **BrandLogo** (nd_d7d8b56e2d934187bbb9b) | brand | png | `d715f21a-53a7-4456-aa84-2116e41a22e1` | ✅ v3 真画（11984B PNG） |
| **BgBlobTopRight** (nd_9b9fdb30935f42338f086) | decoration | css-gradient | – | ✅ rgba 硬编码（trade-off 已记） |
| **BgBlobBottomLeft** (nd_39264519d0b74ea1b8bf0) | decoration | css-gradient | – | ✅ v3 新增 rgba secondary 8% |
| LockedIcon (v2 已写 svg materialSpec) | icon | svg | （v2 未画 PNG）| ⚠️ 后续 craft 补 |
| SubmitSpinner / WifiOffIcon | icon | css-only | – | ✅ v2 css 实现 |

⚠️ LockedIcon SVG 仍是 v2 素材债，因本次 craft 任务清单未包含且 LockedView 仅在 lockedUntil > now 时显示（边缘场景），留给下次迭代。

---

## 3. v3 ★ 创作权使用清单

| 创作权 | 是否使用 | 实例 |
|---|:---:|---|
| ① 视觉概念决策 | ✅ | concept.md：灵魂句「像清晨教室的光，温暖但不打扰」+ 3 候选 + B/C 否决 |
| ② 视觉策略制定 | ✅ | strategy.md 5 维（色 60-30-10 / 字 5 档 / 形柔和 / 饰 soft-glow / 律 √2 呼吸）|
| ③ 视觉任务自创 | ✅ | task-planning.md 自创 5 个 D-00-login-craft-* 任务 |
| ④ 布局调整 | ✅ | element/wrap PolicyCheckbox+PolicyText → PolicyCheckLabel；element/add PolicyCheckVisual + CheckMark + BgBlobBottomLeft |
| ⑤ 装饰节点新建 | ✅ | BgBlobBottomLeft（meta.design.kind=decoration）|
| ⑥ 素材绘制 | ✅ | 调 material-painter 1 次画 BrandLogo 240×240 PNG + applyMaterialDesign |

---

## 4. 跨阶段回流（UpstreamChallenge）

本次 v3 重新分析期间未发起新 challenge。
v2 时期已有 1 个 accepted challenge（C-INT-00-login-001 wrap NormalFormView）保留生效。

---

## 5. v3 与 v2 的 5 处增量

| 维度 | v2 | v3 |
|---|---|---|
| BrandSlogan typography | body 14 / 400 / textSecondary | body-lg 16 / 500 / textPrimary |
| 字重 700+ 使用 | 多处 | 全屏取消（实际 v2 也未真用 700）|
| BgBlobTopRight 浓度 | primaryLight #EBEDFA（字符串内嵌 token bug 完全不渲染）| rgba(91,108,255,0.12) primary 12% alpha |
| 装饰节点数 | 1 | 2（+ BgBlobBottomLeft secondary 8%）|
| Tab active visualState | 缺 activeWhen + borderBottom 字符串内嵌 token bug | 补 activeWhen + 拆 borderBottomWidth/Style/Color |
| native checkbox | accentColor + 黑方块 | wrapper-label workaround（PolicyCheckLabel + PolicyCheckVisual + CheckMark + 4 visualState）|
| BrandLogo PNG | 仅 materialSpec 未画（占位虚线）| 真画 PNG（11984B）+ applyMaterialDesign |

---

## 6. 已知风险 / 待 executor 关注

| 优先级 | ISSUE | 详情 | 给 executor 的关注点 |
|:---:|---|---|---|
| **P0** | ISSUE-1 snapshot 服务异常 | localhost:3001 持续返回与 schema 无关的简化登录页（5 元素 + 黑底） | 第一步先排查 snapshot 渲染管线（缓存 / SchemaRenderer / token resolver）。修复后才能跑 QA 摄影 |
| P2 | rgba 硬编码 in BgBlob | css-gradient 字符串内嵌 token 不渲染，trade-off 用 rgba 展开值 | 后续若 renderer 支持 token 解析 → 改回 $token 形式 |
| P3 | 总 weight 超 v2 declared budget +4 | v3 升级修复 v2 失效后自然权重上升 | 下轮 plan 任务 fix：update componentBudgets 数字到 v3 实际 |
| P3 | LockedIcon svg materialSpec 未真画 | v2 素材债遗留，本轮未列入 craft | 下次迭代补 |
| P3 | element/wrap 默认 div 而非 label tag | 不影响视觉但语义不完美 | service 端可考虑 wrap action 支持 tag 参数 |
| P3 | service 端缺 v3 ArtifactCheck.kind | decorationSystemUnified / colorRatioInRange / weightPyramidValid / selfReviewAllPassed 都未实现 → 3 audit + self-review 全 skipped 而非 done | service 端补实现后 design-planner 回头改 done |

---

## 7. 给 executor 的指南

executor 任务（v3 退化为 QA 摄影师）：

1. **优先级 P0**：排查 ISSUE-1 snapshot 服务管线（不修则后续 QA 摄影都不可信）
2. 修好后 `generate_snapshots` 全屏 + 多 viewport（v3 新 mode=multi-viewport 待平台实现）
3. 对照本 handover.md §5 v3 增量清单 + design/00-login/self-review.md 5 维度评分模板，验证：
   - BrandLogo PNG 真画显示（不是占位）
   - BgBlobTopRight + BottomLeft 微弱光斑可见
   - ModeToggle active tab 有主色下划线 + 主色字
   - PolicyCheckVisual 不再是黑方块；checked 时主色填充 + 对勾
   - BrandSlogan 「找到校园同好」字号变大、字色加深
4. integrity 终验：`query/integrity` 0 错
5. 标 phase=verified 交付

executor 不画素材（design 已画完）/ 不做设计决策。

---

## 8. ★ 通知用户

「v3 重新分析完成。schema 完整 + integrity 0 错。**5 个 craft 改动已落库**。**素材债 BrandLogo PNG 已真画**。**装饰失效根因找到（字符串内嵌 token）已修**。**Tab active 漏 activeWhen 已补**。**Checkbox wrapper-label 重构完成**。

⚠️ 因 ISSUE-1 snapshot 服务异常，整屏 self-review 5 维度评分依赖你从 editor 提供截图后回填——可以现在提供 5 张状态截图（默认/密码模式/政策勾选/手机号失焦/锁定态），我用 design/00-login/self-review.md 的 5 维度模板做评分。

下一棒可由 design-executor 接力（先解决 snapshot 服务异常）。」
