# 方法论 3：色彩策略 (Color Strategy)（v3 新增）

> 适用任务：`D-X-strategy`、`D-X-craft-*`（涉及配色时）
>
> **核心**：60-30-10 配比 + token 池筛选 + 强调色出现位置受控。

---

## 1. 60-30-10 法则

```
60% 主导色（dominant）：占据视觉面积最大
  → 多数情况是 background（暖白 / 冷白 / 黑底等）
  
30% 次要色（secondary）：信息载体 + 卡片底色
  → surfaceElevated 卡片 + textPrimary 主文字
  
10% 强调色（accent）：CTA + 焦点
  → primary 出现在 ≤ 6 处关键位置
```

**违反 60-30-10**：强调色铺满 → 整页"刺眼"；强调色完全不出现 → 整页"灰扁"。

---

## 2. token 池筛选

`D-X-strategy` 时，从 `theme.tokens.colors` 中挑：

| 角色 | 候选 token |
|---|---|
| 60% 主导 | `background` / `surface` |
| 30% 次要 | `surfaceElevated` / `textPrimary` / `textSecondary` |
| 10% 强调 | `primary` / `primaryHover` / `primaryActive` / `primaryLight` |
| 错误语义 | `error` / `errorLight` |
| 成功语义 | `success` / `successLight` |
| 警告语义 | `warning` / `warningLight` |

**禁止**：自造色值、硬编码 #xxx。缺什么 token 走 UpstreamChallenge theme-generator。

---

## 3. 强调色出现位置（10% 用法清单）

10% 不是"涂满"，是"点睛"。强调色出现位置应 ≤ 6 处：

| 位置 | 是否用强调色 |
|---|:---:|
| 主 CTA backgroundColor | ✅ 必用 |
| Tab/Segment active 字色 + indicator | ✅ |
| Checkbox/Switch checked 填充 | ✅ |
| Input focus borderColor + 光晕 | ✅ |
| 装饰节点（极淡，opacity 0.3-0.6）| ✅（按装饰系统）|
| 链接默认色 | ⚠️ 可选（视主题决定）|
| 普通文字 | ❌ 不可（破坏 30%）|
| 边框 | ❌ 不可（除非 focus / selected） |
| 卡片底色 | ❌ 不可 |

---

## 4. 主题→色板映射（与 theme.intent 联动）

| theme.intent | 主导色调 | 强调色调 | 备注 |
|---|---|---|---|
| minimal | 中性灰白 | 黑 / 单色蓝紫 | 留白多，accent 节制 |
| warm | 暖白 / 米白 | 蓝紫（中性温度）/ 珊瑚 | 不要纯橙红（轻浮）|
| trustworthy | 冷白 | 蓝（不偏紫）| 不要暖色 |
| premium | 米白 / 黑 | 金 / 深蓝 | 高对比 |
| playful | 米白 / 多色 | 多色对比 | 60-30-10 可放宽到 50-30-20 |
| natural | 米白 / 暖黄 | 绿 / 棕 | 自然色调 |
| bold | 高饱和 | 强对比互补色 | 激发 |
| clean | 纯白 | 单色蓝 | 数据 / 信息工具 |

详见 `recipes/theme-element-dict/<intent>.md`。

---

## 5. 错误色不要纯红

| 主题 | 错误色 token 推荐 |
|---|---|
| trustworthy / minimal | `#E16A6A` 暖珊瑚红（不刺眼）|
| warm | `#F87171` 软红 |
| playful / bold | `#EF4444` 标准红（需要张力）|
| premium | `#DC2626` 深红 |

---

## 6. 暗色 / 高对比模式（如 theme 多 colorScheme）

如果 theme 有 colorSchemes（如 light / dark / high-contrast），strategy 阶段需指定本屏使用哪个 scheme + 各 scheme 下 60-30-10 仍成立。

---

## 7. 自检（D-X-strategy 用）

- [ ] 60-30-10 比例明确（写出 60% 是哪个 token、30% 是哪几个、10% 是哪个）
- [ ] 强调色位置清单 ≤ 6 处
- [ ] 错误 / 成功 / 警告语义色按主题选合适红 / 绿 / 黄
- [ ] 全部从 theme.tokens 挑选，无硬编码
- [ ] 与 theme.intent 在 §4 表中对应

---

## 8. 红线

- ❌ 自造色值 / 硬编码 #xxx → 走 UpstreamChallenge theme-generator
- ❌ 强调色铺满（出现 > 8 处或占面积 > 15%）→ 整屏刺眼
- ❌ 完全不出现强调色 → 整屏灰扁
- ❌ trustworthy / minimal 主题用暖橙 / 粉作 primary → 与气质冲突
- ❌ 错误用纯红 #FF0000（情绪太冲，绝大多数主题应避开）
- ❌ 装饰节点用 100% 不透明的 primary（应 primaryLight + opacity 0.4-0.6）
