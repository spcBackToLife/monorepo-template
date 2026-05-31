> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-audit
> 对应 schema 字段：本任务做整组 set_global_overlays 落库（含前 3 任务全部产物）

# D-global-overlay-audit — 全局 overlays 跨屏视觉协调性 audit

## 1. 跨屏并存场景核对

| 场景 | overlay | 与登录页同时呈现？ | 协调性 |
|------|---------|:---:|:----:|
| 用户在登录页 + 网络断开 | global-offline-banner | ✅ 顶部 banner + 登录页主路径并存 | 见下文 §2 |
| 登录页本屏 session 过期 | global-session-expired Modal | ❌ 登录页正在登录，不会触发；其他屏触发后 nav.go 登录页 | N/A |
| 登录页 + offline + sessionExpired 同时？ | 两 overlay 都显示 | 罕见但合法（用户网络从离线恢复但 token 已过期）| 见下文 §3 |

## 2. OfflineBanner + 登录页主路径 视觉协调

OfflineBanner styles:
- `position: fixed top:0 zIndex:30`
- `paddingTop: calc(env(safe-area-inset-top) + spacing.sm)`
- 高度 ~52px（含 safe-area）
- `gray800` 深灰底 + `textInverse` 白字 + `warning` 圆点

登录页主路径影响：
- Root.paddingTop = `calc(env(safe-area-inset-top) + spacing.2xl)` = `safe-area + 48`
- banner 高度约 52px，会覆盖登录页顶部约 52px 区域
- ⚠️ banner 显示时，登录页 Brand 区可能被遮挡上半部分

**决策**：banner 显示时由前端运行时给 Root 加 `paddingTop` 补偿。本期 design 阶段不修改 Root.styles（因为 banner 显隐是动态的，靠 visibleWhen 驱动），方案：
- 选项 1：把 banner 改为 `sticky top:0` 而不是 fixed → 自然占位推下面内容（更优）
- 选项 2：保 fixed + executor 阶段加 padding 补偿（更复杂）

**采用方案 1**：banner styles 改 `position: sticky`（但 sticky 的 fixed 行为更可控；type=custom 渲染器一般是 fixed 就改 fixed）。修订：

```jsonc
OfflineBanner.styles = {
  position: "sticky",   // 改 sticky 让 banner 推下面内容自然占位
  ...
}
```

⚠️ 但 type="custom" 的 overlay 由 OverlayRenderer 决定挂载点——如果挂在 body 而非 screen 内，sticky 不起作用。这是 executor 阶段需要核对的事项；本任务在 md 中标记并保 fixed，由 executor 阶段决策。

**本任务最终决策（保 fixed）**：banner 用 `position:fixed top:0`，登录页 Brand 区被遮挡时用户可通过滚动或 banner 自动消失（网络恢复）解决。这是 OfflineBanner 跨屏并存的合理代价；不为它修改 Root.styles。

## 3. 同时显示三层（极端场景）

`offline + sessionExpired + 登录页 NormalFormView`：
- z=0 装饰 BgBlobTopRight
- z=1 HeaderArea
- z=2 FormCard / FooterLinks
- z=30 OfflineBanner（顶部条）
- z=overlay backdrop（modal 自带）+ SessionExpiredModal 居中卡片

视觉层叠：
1. 最底：BgBlobTopRight 装饰（已被遮罩盖住）
2. 中：登录页内容（被 modal backdrop 半透明黑覆盖）
3. 高：OfflineBanner（z=30 sticky/fixed top）
4. 最高：SessionExpiredModal backdrop + 卡片（居中）

⚠️ banner z=30 vs modal backdrop（rgba(0,0,0,0.5)）—— modal 在 OverlayRenderer 中会有更高 z（通常 50+），所以 banner 实际被 modal backdrop 遮住一部分。这是合理的（modal 阻断用户操作时，banner 也应该被遮罩弱化）。

## 4. 跨主题（dark scheme）协调

theme 已配 dark colorScheme overrides：
- gray800 → 在 dark 下变 `#D5D7DC`（变浅）—— banner 在 dark 主题下变成浅灰底深字 ⚠️
- 这会让 banner 在 dark 主题下变得不显眼

**修复决策**：把 banner backgroundColor 从 gray800 改为 hardcoded `#1F2333`（或 dark scheme 下的深色），但这违反 token 单一原则。

更好方案：dark scheme 下让 banner 仍保持深色——用 `gray100`（在 light 下是浅灰，在 dark 下变 `#1A1D26` 深色）—— 这反过来！

实际：
- light scheme: gray800 = #2F323A 深灰 ✅
- dark scheme:  gray800 = #D5D7DC 浅灰 ❌（变成"在暗色主题下浅灰底"）

**本期决策**：保 gray800 接受 dark scheme 下视觉略变（banner 在 dark 下底色变浅，但仍有对比度）。完美对齐需要 theme 加 `colors.bannerBg` 反色 token（dark 下保深色），但本期不退回 theme-generator 调整——记录为后续优化项。

## 5. 整组替换执行

本任务做最终一次 `meta/set_global_overlays` 整组替换，含：
- product 阶段已落字段（id/name/type/showWhen/backdrop/rootNode 节点结构 + meta.product）
- interaction 阶段已落字段（events on offlineRetryBtn / sessionReLoginBtn）
- design 阶段新落字段（rootNode + 各子节点 styles + states + meta.design.materialSpec for WifiOffIcon）

## ★ 沉淀到 schema 的结论

详见执行段（一次性整组替换 set_global_overlays），expectedArtifacts 验收：
- `arrayMin globalOverlays min:1` ✓
- `eachItem globalOverlays check:nonEmpty path:$.rootNode.styles` ✓
