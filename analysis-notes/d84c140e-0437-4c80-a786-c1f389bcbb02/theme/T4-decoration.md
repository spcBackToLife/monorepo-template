> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T4-decoration
> 对应 schema 字段：project.themeConfig.decorationRules

# T4：装饰规则（aesthetics 映射）— 校园社交-登录页

## 1. 输入：T1 提取的 aesthetics 标签

- aesthetics：**`["minimal", "flat"]`**
- decoration：**`minimal`**

## 2. 单标签映射查表

> 详细映射见 `methodology/04-decoration-rules.md` §二。

### minimal

| 维度 | 取值 |
|------|------|
| background | `solid` |
| border | `none` 或 `subtle` |
| shadow | `soft` |
| motion | `minimal` |
| cornerStyle | `rounded` |
| iconStyle | `geometric` |

### flat

| 维度 | 取值 |
|------|------|
| background | `solid` |
| border | `subtle` |
| shadow | `none` |
| motion | `smooth` |
| cornerStyle | `rounded` |
| iconStyle | `geometric` |

## 3. 多标签叠加决策

| 维度 | minimal | flat | 最终 | 理由 |
|------|---------|------|------|------|
| background | solid | solid | **solid** | 两者一致；用户原话"避开浓郁渐变"硬性锁死 |
| border | none 或 subtle | subtle | **subtle** | 表单输入框必须有边框定义边界，否则用户找不到 tap target；minimal 的 none 不适用功能屏 |
| shadow | soft | none | **soft（已弱化）** | minimal 倾向 soft，flat 倾向 none；登录页表单卡片需要建立"卡片感"建立信任 → 选 soft，但 T3 配方已 50% 弱化（0.04 起步）|
| motion | minimal | smooth | **smooth** | minimal 偏静态；smooth 兼顾平滑感与克制；按钮 hover/focus 需要轻微反馈，纯 minimal 会显得"死板" |
| cornerStyle | rounded | rounded | **rounded** | 两者一致 + **用户原话"圆角输入框"锁死** + 排斥"卡通插画"排除 pill + 排斥"纯黑白极简"排除 sharp |
| iconStyle | geometric | geometric | **geometric** | 两者一致；minimal+flat 都几何感强；用户"极细几何装饰"原话命中 geometric |

## 4. decoration 密度调节（decoration=minimal）

> 详细规则见 `methodology/04-decoration-rules.md` §装饰密度调节。

| 维度 | 表格原值 | minimal 调节 | 最终 |
|------|---------|-------------|------|
| background | solid | 不变（已最简）| solid |
| shadow | soft | **全部降一档**（已在 T3 落地：0.04/0.06/0.10/0.14 弱化版）| soft 弱化 |
| glow | — | **不渲染** | 无 |

**T3 sanity check（密度一致性）**：
- T3 shadows 用了 `0 1px 3px rgba(0,0,0,0.04)` 弱化版 → ✓ 与 minimal 一致
- T3 radii 用了 rounded 阶梯（sm 4 / md 8 / lg 12 / xl 16）→ ✓ 与本任务 cornerStyle=rounded 一致
- T3 easings 包含 spring 但**主用 ease/easeOut** → ✓ 与本任务 motion=smooth 一致

## 5. 背景细节（background=solid，无渐变）

- 无渐变角度 / 起止色
- bgPage 用 token `#FCFCFD`（T2 已定）
- bgCard 用 token `#F6F7F9`（T2 已定）
- **登录页特化**：HeaderArea + FormCard + FooterLinks 均在 bgPage 上，不引入任何渐变背景

## 6. 替代方案与否决

| 替代方案 | 否决理由 |
|---------|---------|
| background=gradient（默认模板示例）| 用户原话"避开浓郁渐变"硬性禁用；即使柔和渐变也违反 minimal 克制 |
| shadow=none（flat 标准）| 表单卡片无阴影会"漂浮无依"，影响输入聚焦感；保留 soft 弱化版折中 |
| cornerStyle=pill | 用户排斥"卡通插画"+"校园温度"是温度不是萌；pill 偏组织/playful |
| cornerStyle=sharp | 用户原话"圆角输入框"直接禁用；且排斥"纯黑白极简"暗示不要 brutalist |
| iconStyle=organic | minimal+flat 风格双否决；登录页几何感更专业 |
| motion=spring | 偏可爱化，与"研究生应届，对设计审美敏感"用户群冲突 |
| motion=minimal（纯静态）| 现代移动 App 完全无微交互会显得"死板"，影响 perceived performance |

## 7. 关键假设与决策

- **假设 1**（shadow 取舍）：minimal 与 flat 在 shadow 维度冲突（soft vs none），选 soft 弱化版而非 none——理由是登录页表单卡片信任感建立需要
- **假设 2**（motion 取舍）：选 smooth（flat 优先）而非 minimal（极简优先）——理由是按钮 hover/focus 必须有反馈，纯静态影响可访问性
- **假设 3**（cornerStyle 锁死 rounded）：用户三重锁定（圆角输入框 / 避开纯黑白极简 / 避开卡通插画）→ 决策无歧义
- **假设 4**（iconStyle）：选 geometric 锁死，design-executor 出图必走几何派（不弧线柔化）

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/set_decoration（自动 customized=true）
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  decorationRules: {
    background: {
      strategy: "solid"
    },
    border: {
      strategy: "subtle",
      width:    "1px",
      color:    "$token:borderDefault"
    },
    shadow:     { strategy: "soft" },
    motion:     { strategy: "smooth", easing: "ease" },
    cornerStyle: "rounded",
    iconStyle:   "geometric"
  }
}
```

**回头一致性 check**（与 T3）：
- T3 radii 已按 rounded 阶梯（sm 4 / md 8 / lg 12 / xl 16）✓
- T3 shadows 已按 soft 弱化版（0.04 起步）✓
- T3 easings 包含 ease/easeOut 作 smooth 主用 ✓

**无需 update_tokens 回头修正**。
