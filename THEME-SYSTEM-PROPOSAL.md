# 主题风格系统重构方案 v1（Schema-First, 企业级）

> 状态：草案
> 触发：2026-05-30 用 theme-generator 技能跑校园社交-登录页时发现 schema/技能/MCP/渲染端四方对"主题模型"的认知严重不一致；问题不是个别 bug，而是**模型半迁导致的双版本并存**。本文按 AGENTS.md 第 3 章「第一性原理」+ 第 9 章「无双版本」红线收口。
> 范围：design-schema / design-engine / design-codegen / design-mcp / theme-generator 技能 / STAGE-CONTRACT / 编辑器 UI

---

## 0. TL;DR

| 项 | 状态 | 重构后 |
|----|-----|--------|
| 模型 | schema 是「多主题 + 内嵌明暗」二维（V0）；技能/STAGE-CONTRACT 是「单主题 + 多变体」一维（V2）；MCP 写顶层（落空区） | **统一到 V0 升级版（V1.0）：保留 ThemeDefinition + 内嵌 ColorScheme 二维，但补齐 base+overrides 求值 + 风格规格上抬到主题级** |
| 真理之源 | resolveTokens 走 `themes[active].colorSchemes[active].overrides → themes[active].tokens` | **不变** —— 渲染端是唯一不动的部分 |
| MCP | 写顶层 `themeConfig.tokens / intent / decorationRules`，但渲染端不读 | **全部改为写 `themes[active].*`**；新增 8 个 action 拼齐 6 大维度增量写入；废弃顶层错位字段 |
| 技能 | 假设单层（顶层 tokens）；缺主题/明暗双轴心智模型 | 7 任务保持，**统一改为写 `themes[active].tokens` 等**；新增 T0「主题脚手架」 + T6 改为「ColorScheme 派生」 |
| 文档 | STAGE-CONTRACT §2 + 各方法论 md 全按 V2 写 | 重写 STAGE-CONTRACT §2 + 所有方法论按 V1.0 落地 |
| 编辑器 UI | 已有 switchTheme + switchColorScheme | **不动**（已正确） |
| codegen | dark variables.less 硬编码 Antd 默认值 | **改为读 themeConfig.themes[active] 动态生成** |

---

## 1. 第一性原理：主题系统到底要解决什么

把"主题"这个词拆开看，它在企业级产品里至少承载 5 类正交需求：

| 需求 | 例子 | 数学形态 |
|------|------|---------|
| **N1 品牌定义** | 主色 / 品牌字体 / Logo 调性 | 1 套 token 集 |
| **N2 明暗适配** | iOS 系统暗黑 / 用户偏好 | 在同一品牌下切换 token 子集 |
| **N3 节日/营销切换** | 春节红 / 黑色星期五 / 618 | 完整切换为另一套品牌相近但视觉差异显著的 token 集 |
| **N4 多品牌系统** | 蚂蚁同时维护 Ant Design / Ant Design Pro / Antd Mobile 三套 | 应用级，每个项目挂一个，跨项目可复用 |
| **N5 可访问性增强** | 高对比 / 色弱 / 大字号 | 在任一主题下叠加 token override |

**关键洞察**：**N1+N3 是「主题」（完全不同的风格）；N2+N5 是「变体」（同一风格的明暗/可访问性变种）**。两者维度独立，正交。

```
ThemeConfig
└─ themes[]
   ├─ "default"（品牌默认 = N1）
   │   ├─ colorSchemes: ["light","dark","high-contrast"]   ← N2 + N5
   │   └─ activeColorSchemeId
   ├─ "spring-festival"（春节红 = N3）
   │   ├─ colorSchemes: ["light","dark"]
   │   └─ activeColorSchemeId
   └─ "black-friday"（营销 = N3）
       └─ ...
```

**这正是 `features/design-schema/types/theme.ts` 现在的结构**——结构本身没错，只是没贯彻到下游。

而**技能层假设的"V2 一维 themes[]"是 N1+N2 退化合并**，丢掉了 N3+N5。**企业级场景不可接受**——任何一个稍大的项目都会面临节日切换。

> 结论：**模型选 V0 不动，把所有偏离 V0 的代码改回来**。

---

## 2. 现状全景（4 方对账）

### 2.1 schema 真理之源（V0）

```ts
ThemeConfig {
  themes: ThemeDefinition[]      // ★ 多主题
  activeThemeId
  customized
}
ThemeDefinition {                // ★ 一套完整风格
  id, name, description, createdAt, updatedAt
  intent: StyleIntent             // ← 风格意图属于主题级
  tokens: DesignTokenSet          // ← base tokens 属于主题级
  decorationRules                 // ← 装饰规则属于主题级
  iconSpec, stateSpec             // ← 图标/状态属于主题级
  colorSchemes: ColorScheme[]     // ★ 内嵌明暗
  activeColorSchemeId
}
ColorScheme {
  id, name, label,
  overrides: TokenOverrides       // ← 仅写差异
}
```

### 2.2 渲染端 resolveTokens.ts

走查找链：
```
ref="$token:primary"
→ themes.find(id===activeThemeId)
  → colorSchemes.find(id===activeColorSchemeId).overrides.colors.primary
    若无 → themes.tokens.colors.primary.value
```
**100% 按 V0 来，无偏差**。

### 2.3 MCP `theme/*` 工具

| Action | 实际写入路径 | 渲染端读取路径 | 结果 |
|--------|------------|---------------|------|
| `update_tokens` | `themeConfig.tokens.colors`（顶层）| `themes[active].tokens.colors` | **写入丢失** |
| `set_intent` | `themeConfig.intent`（顶层）| `themes[active].intent` | 写入丢失 |
| `set_decoration` | `themeConfig.decorationRules`（顶层）| `themes[active].decorationRules` | 写入丢失 |
| `update` | 替换整个 themeConfig 顶层 | 同上 | 高风险，会清空 themes[] 数组 |
| `switch_variant` | 改 `activeThemeId` | 正确 | ✓ |
| `check` / `get` | 读顶层 | 正确 | ✓ |

**所有写 action 都打错位置**——4/6 是错的。

### 2.4 技能 + STAGE-CONTRACT（V2 假想）

- T1 写 `themeConfig.intent` → 错
- T2 写 `themeConfig.tokens.colors` → 错
- T3 写 `themeConfig.tokens.{typo,spacing,radii,shadows,durations,easings}` → 错
- T4 写 `themeConfig.decorationRules` → 错
- T5 写 `themeConfig.iconSpec / stateSpec` → 错
- T6 写 `themeConfig.themes[]`，定义为「单主题多变体（颠倒了 themes 和 colorSchemes 的语义）」 → 严重偏离 V0

R-THEME-* 7 条红线全部针对顶层字段——**对账目标错了**。

### 2.5 codegen

- `pipeline.ts` 里 `generateDarkThemeVariables()` 是**纯硬编码字符串**，不读 themeConfig
- `css-normalizer.ts` 把 `$token:xxx` 翻译成 `var(--xxx)` 正确，但 **variables.less 内容假设是 Antd 默认值**
- 后果：codegen 出来的产物**永远是 Antd 蓝**，即使设计稿用了 #5B6CFF

### 2.6 编辑器 UI

`apps/design_front/src/stores/editor/index.ts` 已有：
- `switchTheme(themeId)` ✓
- `switchColorScheme(schemeId)` ✓
- `persistThemeConfig()` ✓

**编辑器层 100% 按 V0**，不需要动。

---

## 3. 目标模型 V1.0（V0 升级版）

> 不重新发明，**V0 结构正确**，只做"补齐 + 收口 + 验证规则升级"。

### 3.1 ThemeConfig 字段全集（带 R-THEME 红线锚定）

```jsonc
ThemeConfig {
  schemaVersion: "1.0",                    // ★ 新增：迁移用
  themes: ThemeDefinition[],               // ≥ 1 套
  activeThemeId: string,                   // 必须命中某 themes[].id
  customized: boolean                       // R-THEME-01
}

ThemeDefinition {
  id, name, description, createdAt, updatedAt,
  intent: StyleIntent,                     // 风格意图（≤30 字 summary + 7 维度）
  tokens: DesignTokenSet,                  // base tokens（亮模式作 base）
  decorationRules: DecorationRules,        // 装饰规则（R-THEME-07.a）
  iconSpec: IconSpec,                       // 图标规格（R-THEME-07.b）
  stateSpec: ComponentStateSpec,            // 状态规格（R-THEME-07.c）
  colorSchemes: ColorScheme[],              // 至少 2 套（R-THEME-06：light + dark）
  activeColorSchemeId: string
}

ColorScheme {
  id, name, label,
  overrides: TokenOverrides                 // 仅差异，深合并
}
```

### 3.2 红线升级（替换 STAGE-CONTRACT §2.7）

| 红线 | 触发条件 | 改动 |
|------|---------|------|
| R-THEME-01 | `themeConfig.customized` 不为 true | 不变 |
| R-THEME-02 | 任一主题的 `tokens.colors` 缺必备 13 类语义色 | 改为遍历 themes[]，每个 ThemeDefinition 都查 |
| R-THEME-03 | textPrimary on bgPage 的 APCA Lc < 75 / textSecondary on bgCard < 60 | **对每个主题 × 每个 colorScheme 都验**（用 overrides 合并后的有效值）|
| R-THEME-04 | spacing 非 8 网格 | 遍历 themes[].tokens.spacing |
| R-THEME-05 | fontSize 偏离 modular scale 1.25 超 ±5% | 遍历 themes[].tokens.typography |
| R-THEME-06 | **任一主题的 `colorSchemes.length < 2`** | **改：变体在主题内部，不是 themes 顶层** |
| R-THEME-07 | 任一主题的 decorationRules / iconSpec / stateSpec 为空对象 | 遍历主题 |
| **R-THEME-08（新）** | activeThemeId 不命中 themes[].id 任一 / activeColorSchemeId 不命中 | 防止断链 |
| **R-THEME-09（新）** | `ColorScheme.overrides` 写了 base 没定义的 token | 避免无效 override |
| **R-THEME-10（新）** | 两个主题的 `tokens.colors` 必备语义色集合不一致 | 多主题字段对齐 |

### 3.3 命名收口（强制）

技能侧曾用 `bgPage / bgCard / bgElevated / borderDefault / borderStrong / divider`；schema V0 真实命名是 `background / surface / surfaceElevated / border / borderLight / borderFocus`。

**真理之源 = schema/types/theme.ts 的 `ColorTokenGroup` interface**。

**完整名册定下来**（V1.0 必备语义色，14 个）：

```
品牌色      primary, primaryHover, primaryActive, primaryLight
辅色        secondary, secondaryHover, secondaryActive
表面        background, surface, surfaceElevated, overlay
文字        textPrimary, textSecondary, textTertiary, textInverse
边框        border, borderLight, borderFocus
状态        success, warning, error, info
中性灰      gray100~gray900（可选但推荐）
```

**技能层别名映射表**（technical debt 兜底）：

```yaml
# 旧名 → 真理名
bgPage:        background
bgCard:        surface
bgElevated:    surfaceElevated
borderDefault: border
borderStrong:  borderFocus    # 或 borderLight，按上下文
divider:       borderLight
accent:        secondary       # 技能曾用 accent，统一回 secondary
```

技能内仍可用「认知友好」的别名讨论（md 推理时），但**落 schema 前必须映射到真理名**。这层映射在 MCP set_tokens action 里做（详见 §5）。

### 3.4 Token 引用规则（与现状一致，不动）

```
$token:primary                     → tokens.colors.primary.value
$token:spacing-md                  → tokens.spacing.md.value
$token:radius-lg                   → tokens.radius.lg.value
$token:shadow-sm                   → tokens.shadows.sm.value
$token:transition-fast             → tokens.transitions.fast.value
$token:font-body.fontSize          → tokens.typography.body.fontSize
```

注意 **schema 的 token value 是 `{value, description}` 形态**（嵌套），不是裸字符串。MCP 写入时**自动包装**（详见 §5）。

---

## 4. 流程视角：理想 7 任务怎么落到 V1.0

### 4.1 入场（Phase 0）

```
1. theme/check → customized?
2. theme/get  → 看 themes[] / activeThemeId 是什么
3. 决策：
   □ 全新生成（customized=false）→ 走"主题脚手架 → T1~T7"
   □ 局部微调（customized=true）→ 挑 T1~T6 对应任务
   □ 加新主题（如节日红）→ 复制现有主题、改 intent + tokens.colors，
                            其他维度继承
   □ 加新变体（如高对比）→ 走 T6 ColorScheme 派生
```

### 4.2 主题脚手架（新 T0）

> **本任务新增**，解决"对哪个主题写"的入口问题。

执行内容：
```
1. 询问用户：是建新主题还是改现有？
   - 默认场景：项目首次定制 → 改现有 "default" 主题
   - 节日营销 → 新建 themeId="spring-festival"
   - 多品牌 → 新建 themeId="brand-X"
2. 调用 theme/scaffold_theme（新增 MCP action）：
   - 拷贝当前 active 主题作为骨架
   - 命名新 themeId（kebab-case）
   - 设 activeThemeId 为新主题
3. 后续 T1~T6 全部默认写到 active 主题
```

### 4.3 T1~T6 任务映射（不变骨架，改写入位置）

| 任务 | 写入路径（V1.0） | MCP Action |
|------|---------------|----------|
| T1-intent | `themes[active].intent` | `theme/set_theme_intent` |
| T2-colors | `themes[active].tokens.colors` | `theme/set_theme_tokens { kind:"colors" }` |
| T3-typo-spacing | `themes[active].tokens.{typography,spacing,radius,shadows,transitions}` | 同上 |
| T4-decoration | `themes[active].decorationRules` | `theme/set_theme_decoration` |
| T5-icon-state | `themes[active].iconSpec + stateSpec` | `theme/set_theme_icon_spec` + `set_theme_state_spec` |
| T6-variants | `themes[active].colorSchemes[]`（追加 dark / high-contrast） | `theme/add_color_scheme` + `update_color_scheme_overrides` |
| T7-handover | 自检：`theme/validate`（新 action） | 跑 R-THEME-01~10 |

### 4.4 切换主题 / 变体（运行时 + 编辑期）

**编辑期**：编辑器已实现 `switchTheme + switchColorScheme`，不动。

**运行时**：codegen 产物要支持两种模式：

```less
// 模式 A：CSS variables（推荐）
:root {
  --color-primary: #5B6CFF;
  /* base tokens */
}
[data-theme="default"][data-scheme="light"] {
  --color-primary: #5B6CFF;
}
[data-theme="default"][data-scheme="dark"] {
  --color-background: #0F1218;
  /* dark scheme overrides */
}
[data-theme="spring-festival"][data-scheme="light"] {
  --color-primary: #D4232D;
  /* 节日主题 */
}
```

```ts
// 用户切换
document.documentElement.dataset.theme = 'default';
document.documentElement.dataset.scheme = 'dark';
```

**模式 B（Less variables 编译期）**：保留兼容，仅用于 SSR/小程序等无 CSS 变量场景。

---

## 5. MCP 工具重设计（v2.0）

> 原则：**1 个 action 1 个职责**；写入位置**统一指向 `themes[active]` 内部**；**所有 token 自动包装为 `{value, description}` 形态**。

### 5.1 现有 action 修复

| 旧 Action | 状态 | 改动 |
|-----------|-----|------|
| `check` | 保留 | 不变 |
| `get` | 保留 | 不变 |
| `update` | **降级为危险操作**（仅迁移脚本用）；description 明确警告"会清空 themes[]"，正常流程禁用 | 加 `confirm:'I_KNOW_THIS_REPLACES_EVERYTHING'` 必填项 |
| `update_tokens` | **废弃**（写顶层无效）；保留兼容期 1 个 PR，handler 内部转发到 `set_theme_tokens` | 改写入路径 + 命名别名映射 |
| `set_intent` | **废弃**，转 `set_theme_intent` | 同上 |
| `set_decoration` | **废弃**，转 `set_theme_decoration` | 同上 |
| `switch_variant` | **重命名为 `switch_theme`** | 语义对齐 |

按 AGENTS.md §9 红线，废弃的 4 个 action **在同一 PR 内删除**——不允许双版本并存。

### 5.2 新增 action（10 个）

| Action | 写入位置 | 主要参数 |
|--------|--------|---------|
| `scaffold_theme` | 追加 themes[] | `{ projectId, themeId, name, copyFrom?:themeId, intent? }` |
| `delete_theme` | themes[].splice | `{ projectId, themeId }`（不能删 active） |
| `switch_theme` | `activeThemeId` | `{ projectId, themeId }` |
| `switch_color_scheme` | `themes[active].activeColorSchemeId` | `{ projectId, schemeId }` |
| `set_theme_intent` | `themes[active].intent` | `{ projectId, intent: {...} }`（深合并）|
| `set_theme_tokens` | `themes[active].tokens.<kind>` | `{ projectId, kind:'colors'/'spacing'/'radius'/'typography'/'shadows'/'transitions', values:{...} }`，深合并 + 自动包 `{value,description}` + 别名映射 |
| `set_theme_decoration` | `themes[active].decorationRules` | 同 set_decoration，写到主题内 |
| `set_theme_icon_spec` | `themes[active].iconSpec` | `{ projectId, iconSpec:{...} }` |
| `set_theme_state_spec` | `themes[active].stateSpec` | `{ projectId, stateSpec:{...} }` |
| `add_color_scheme` | `themes[active].colorSchemes.push` | `{ projectId, schemeId, label, overrides }` |
| `update_color_scheme_overrides` | `themes[active].colorSchemes.find().overrides` | `{ projectId, schemeId, overrides }` 深合并 |
| `validate` | 只读 | 跑 R-THEME-01~10，返回违规清单 |

### 5.3 一个核心 action 的样板：`set_theme_tokens`

```ts
set_theme_tokens: defineAction({
  description: '增量更新当前激活主题的 tokens（深合并；自动包 {value,description}；别名映射）',
  schema: z.object({
    projectId: z.string(),
    kind: z.enum(['colors','spacing','radius','typography','shadows','transitions']),
    values: z.record(z.string(), z.unknown()),       // {primary:"#5B6CFF"} 或 {primary:{value,description}}
    themeId: z.string().optional(),                  // 不传 = active
  }),
  handler: async (p) => {
    const cfg = await apiClient.getTheme(p.projectId);
    const themeId = p.themeId ?? cfg.activeThemeId;
    const theme = cfg.themes.find(t => t.id === themeId);
    if (!theme) throw new Error(`Theme ${themeId} not found`);

    const tokens = theme.tokens ??= {};
    const group = tokens[p.kind] ??= {};

    // 别名映射 + 包装
    for (const [rawKey, rawVal] of Object.entries(p.values)) {
      const key = COLOR_NAME_ALIAS[rawKey] ?? rawKey;     // bgPage→background
      const val = wrapToken(p.kind, rawVal);              // "#5B6CFF" → {value:"#5B6CFF"}
      group[key] = deepMerge(group[key], val);
    }
    cfg.customized = true;
    return apiClient.updateTheme(p.projectId, cfg);
  }
})
```

### 5.4 工具描述加防错提示

每个 set_theme_* 描述里强制写：
```
⚠️ 这个 action 写到当前 active 主题内部。要先 theme/scaffold_theme 创建主题再写。
⚠️ 多主题场景（如节日营销）请显式传 themeId 参数；不传 = 写到 active 主题。
```

---

## 6. schema-package 改动

### 6.1 类型层（features/design-schema/src/types/theme.ts）

最小改动，**只加不删**（V0 字段全保留）：

```diff
 export interface ThemeConfig {
+  /** schema 版本，用于迁移识别。当前 "1.0" */
+  schemaVersion?: string;
   themes: ThemeDefinition[];
   activeThemeId: string;
   customized: boolean;
 }
```

新增 `defaults/createDefaultTheme.ts`：
```ts
export function createDefaultTheme(opts: { id?: string; brightness?: 'light'|'dark' }): ThemeDefinition
export function createDefaultColorScheme(opts: { id: 'light'|'dark'|'high-contrast' }): ColorScheme
export function createEmptyThemeConfig(): ThemeConfig
```

**这是技能 T0 的工具支撑**——AI 不必凭印象构造 24+ token，调脚手架 API 拿到完整骨架。

### 6.2 验证层（新增 `features/design-schema/src/validation/theme.ts`）

```ts
export function validateThemeConfig(cfg: ThemeConfig): ThemeValidationReport
// 返回 { errors:[], warnings:[] }；包含 R-THEME-01~10 所有规则
export function calculateAPCA(fg: string, bg: string): number   // 真 APCA-W3 实现
```

把红线对账逻辑从技能 md 里搬到代码里，**任何调用方都能调，技能 + integrity checker + 编辑器面板都用**。

### 6.3 PlanTaskStage 加 `'theme'`

```diff
- stage: 'product' | 'interaction' | 'design' | 'executor';
+ stage: 'product' | 'theme' | 'interaction' | 'design' | 'executor';
```

同步 zod schema（apps/design-mcp/src/tools/domain/meta.ts L119）。

---

## 7. codegen 改动

### 7.1 真·主题感知的 variables.less 生成

替换 `generateDarkThemeVariables()` 硬编码，改为：

```ts
function emitVariablesLess(themeConfig: ThemeConfig): string {
  const lines: string[] = ['// Auto-generated from themeConfig\n'];

  // Block 1: :root（默认主题的 base）
  const defaultTheme = themeConfig.themes.find(t => t.id === themeConfig.activeThemeId)!;
  lines.push(':root {');
  lines.push(...emitTokenVars(defaultTheme.tokens, ''));
  lines.push('}\n');

  // Block 2-N: 每个主题 × 每个 colorScheme 的 overrides
  for (const theme of themeConfig.themes) {
    for (const scheme of theme.colorSchemes) {
      lines.push(`[data-theme="${theme.id}"][data-scheme="${scheme.id}"] {`);
      lines.push(...emitTokenVars(theme.tokens, '', scheme.overrides));
      lines.push('}\n');
    }
  }
  return lines.join('\n');
}
```

### 7.2 删除 detectThemeFromSchema 启发式

`pipeline.ts` L457 那个"通过节点背景色推主题"的启发式 → 删除。真理之源是 `themeConfig.activeThemeId`，不是猜的。

---

## 8. 技能（theme-generator）改动

### 8.1 SKILL.md 心智模型升级

替换"V2 单主题多变体"为「**主题 × 色彩方案二维模型**」，配图：

```
ThemeConfig
└─ themes: [
     "default"  → tokens(base) + colorSchemes:[light, dark]
     "festival" → tokens(base) + colorSchemes:[light, dark]
   ]
```

明确：
- T1~T5 写「主题级」字段（intent / tokens / decorationRules / iconSpec / stateSpec）
- T6 写「色彩方案」（colorSchemes overrides）
- 默认情况只动 active 主题；多主题场景**显式拆任务**

### 8.2 7 任务的"沉淀到 schema"段全替换

所有 jsonc 调用样板从「写顶层 + 单层 themes[]」改为：

```jsonc
// MCP: theme/set_theme_tokens（写当前 active 主题）
{
  projectId: "...",
  kind: "colors",
  values: { primary: "#5B6CFF", secondary: "#F39B66", ... }
}
```

### 8.3 新增 T0「主题脚手架」任务

```
1. 决定要写到哪个 themeId（默认 active；新建则 scaffold_theme）
2. 拷贝/创建主题骨架
3. 把 active 切到目标主题
```

### 8.4 别名映射表入主存档

`.codebuddy/skills/theme-generator/references/schema-spec/token-naming.md`：

```yaml
# 推荐用真理名（schema 命名）。技能 md 推理时可用别名，落 schema 自动映射。
背景:
  ✓ background  (旧别名 bgPage)
  ✓ surface     (旧别名 bgCard)
  ✓ surfaceElevated (旧别名 bgElevated)
边框:
  ✓ border         (旧别名 borderDefault)
  ✓ borderLight    (旧别名 divider)
  ✓ borderFocus    (旧别名 borderStrong)
...
```

### 8.5 强制 read MCP inputSchema

SKILL.md §Phase 2 Step 5 加红线：

```
★ 落 schema 前必须 mcp_get_tool_description 一次，对照参数命名 + 包装形态。
  不允许凭模板示例直接调用。
```

---

## 9. STAGE-CONTRACT 改动

### 9.1 §2.theme-config 章节全重写

按 V1.0 字段全集（§3.1 本文档）替换。

### 9.2 R-THEME-* 红线升级

按本文档 §3.2 全替换。

### 9.3 跨阶段契约

新增：
> 所有下游阶段（interaction/design）调用 token 时，写 `$token:<真理名>`。设计技能内部 md 可用别名讨论，**落 schema 前 MCP 自动映射别名**。

---

## 10. 数据迁移

### 10.1 已有项目状态

跑过老 MCP 的项目（如今天的校园社交-登录页 d84c14...）：
- 顶层 `intent / decorationRules` 已写（错位）
- 顶层 `tokens = {}`（无内容）
- `themes[0] = "default"` 是 Antd 默认值，没有被 T2-T5 更新

### 10.2 迁移脚本（一次性，apps/design-api 或独立 CLI）

```ts
async function migrateProjectTheme(projectId: string) {
  const cfg = await getTheme(projectId);

  // 1. 把顶层错位的 intent / decorationRules 搬到 active 主题
  const active = cfg.themes.find(t => t.id === cfg.activeThemeId)!;
  if (cfg.intent)          active.intent = mergeIntent(active.intent, cfg.intent);
  if (cfg.decorationRules) active.decorationRules = mergeDecoration(active.decorationRules, cfg.decorationRules);
  if (cfg.iconSpec)        active.iconSpec = active.iconSpec ?? cfg.iconSpec;
  if (cfg.stateSpec)       active.stateSpec = active.stateSpec ?? cfg.stateSpec;

  // 2. 顶层 tokens 如非空，merge 到 active.tokens
  if (cfg.tokens && Object.keys(cfg.tokens).length > 0) {
    active.tokens = deepMerge(active.tokens, normalizeTokens(cfg.tokens));
  }

  // 3. 删除顶层错位字段（按 AGENTS.md §9）
  delete cfg.intent;
  delete cfg.tokens;
  delete cfg.decorationRules;
  delete cfg.iconSpec;
  delete cfg.stateSpec;

  // 4. 设 schemaVersion
  cfg.schemaVersion = '1.0';

  await updateTheme(projectId, cfg);
}
```

迁移在 **PR #2 的 deploy hook** 自动执行；执行后顶层错位字段**永久消失**——不留兼容期。

---

## 11. PR 拆分（落地路径）

按 AGENTS.md §7「一个 PR 一件事」拆：

| PR | 标题 | 内容 | 阻塞关系 |
|----|------|-----|---------|
| **#1** | `feat(meta): add 'theme' stage to PlanTaskStage` | features/design-schema + apps/design-mcp/meta.ts + STAGE-CONTRACT 同步 | 独立，立刻可发，**解锁主题技能 plan** |
| **#2** | `refactor(theme-mcp): rewrite theme tool, write into themes[active]` | apps/design-mcp/src/tools/domain/theme.ts 全重写：废弃 4 个旧 action + 新增 10 个；带 migrate script 自动执行；同时跑 `update`→`scaffold_theme` 自动重命名 | 独立 |
| **#3** | `feat(schema): add ThemeConfig.schemaVersion + defaults + validation` | features/design-schema：types.ts 加 schemaVersion；新增 defaults + validation 模块 | 独立，#2 可后置依赖 |
| **#4** | `feat(codegen): emit variables.less from themeConfig dynamically` | features/design-codegen：替换 generateDarkThemeVariables 硬编码；删除 detectThemeFromSchema | 独立 |
| **#5** | `docs(stage-contract): rewrite §2 theme-config to V1.0 model` | STAGE-CONTRACT.md §2 全重写；R-THEME-* 升级；token-naming.md 别名表 | 独立 |
| **#6** | `refactor(theme-skill): align T0~T7 to V1.0 model` | .codebuddy/skills/theme-generator 全套：SKILL.md / methodology / note-templates / examples | 依赖 #2 + #3 + #5 |

**最小可用路径**：先合 #1 + #2 + #3 + #5（4 个 PR）→ 技能 + MCP + schema + 文档 闭环。#4 codegen 可滞后；#6 技能详细化可滞后。

---

## 12. 完整能力清单（重构后系统能做什么）

| 能力 | 系统支持 | 触发方式 |
|------|---------|---------|
| **新项目首次定制主题** | ✓ | theme-generator 跑 T0~T7 |
| **局部微调主题**（"主色换紫"）| ✓ | theme-generator 局部模式，仅跑 T2 |
| **加营销主题**（春节红）| ✓ | T0 scaffold_theme + T1~T6 |
| **加可访问性变体**（高对比）| ✓ | T6 add_color_scheme |
| **运行时切换主题**（用户开关）| ✓ | 设 `data-theme` + `data-scheme` |
| **iOS/Android 跟随系统暗黑** | ✓ | 监听 prefers-color-scheme |
| **A/B 测试两套主题** | ✓ | 同时存两个 themeId，按用户 ID 路由 |
| **品牌资产输出**（Figma token 同步）| ✓ | 加 export action 转 Figma Token Studio JSON |
| **APCA 对比度自动校验** | ✓ | validateThemeConfig 内置 |
| **多项目主题复用** | 部分 ✓ | 同 themeConfig.themes[] 可手动拷贝；未来加全局主题库（v2.0） |
| **跨项目主题继承** | 未来 | v2.0：introduce ThemeTemplate library |

---

## 13. 不做什么（明确边界）

- ❌ 不动渲染端 `resolveTokens.ts`（V0 是对的）
- ❌ 不动编辑器 `switchTheme / switchColorScheme`（已正确）
- ❌ 不引入 Figma Token Studio 集成（v1.0 不做，v2.0 再加）
- ❌ 不做"全局主题库"（v1.0 项目独立维护，v2.0 再加）
- ❌ 不引入第三层 variant（主题 × 色彩方案 × XXX）——两维已够企业级
- ❌ 不保留 `bgPage / bgCard / borderDefault` 等别名为一等公民——只作 MCP 入口别名映射

---

## 14. 验收标准

按 AGENTS.md §3.4「Goal-Driven Execution」给硬指标：

### 14.1 功能验收

| # | 验收点 | 方法 |
|---|------|------|
| F1 | 校园社交-登录页跑 theme-generator T0~T7 全过 | `theme/validate` 返回 0 errors |
| F2 | 切换 active=default scheme=dark，画布所有 $token:* 变暗 | 视觉对比 |
| F3 | 新建 spring-festival 主题，主色 #D4232D，切换后画布主按钮变红 | 视觉对比 |
| F4 | codegen 跑出来的 variables.less 真实反映 themeConfig（不再是硬编码 Antd） | grep variables.less |
| F5 | 旧项目（顶层错位字段）迁移后字段全在 themes[active] 内 | 跑 migrate script + diff |

### 14.2 反例验收（防止双版本回潮）

| # | 反例 | 期望 |
|---|------|------|
| A1 | grep 全代码 `themeConfig.tokens.colors`（不含路径段是 themes[*].tokens） | 0 命中 |
| A2 | grep `themeConfig.intent` | 0 命中（迁移完都在 themes[*].intent）|
| A3 | grep `generateDarkThemeVariables\(` | 0 命中 |
| A4 | grep `detectThemeFromSchema` | 0 命中 |
| A5 | grep `mcp.theme.update_tokens` 在技能 md / STAGE-CONTRACT | 0 命中（已废弃）|

---

## 15. 时间预估 & 责任

| PR | 工作量 | 风险点 |
|----|------|--------|
| #1 | 30 分钟 | 极低（加一个枚举值）|
| #2 | 1 天 | 中（10 个新 action + migrate）|
| #3 | 0.5 天 | 低（纯增量）|
| #4 | 0.5 天 | 中（codegen 模板要测试）|
| #5 | 1 天 | 低（纯文档）|
| #6 | 1 天 | 中（7 任务模板 + 方法论 + example 重做）|

**总计 4 工日**——单人 1 周可完成（含测试 + review）。

---

## 16. 决策清单（需要用户拍板）

> 全面分析后剩 3 个真要用户拍板的点：

| 决策 | 选项 | 推荐 |
|------|-----|------|
| **D1 推进顺序** | A. 先暂停主题落地、4 PR 全合再回校园社交项目 / B. 先用 `theme/update` 全量绕开 bug 把校园社交跑完、PR 后台并行 | **A**（B 会留下需要迁移的脏数据）|
| **D2 旧 MCP action 兼容期** | A. PR #2 直接删 / B. 保留 1 周提示废弃 | **A**（AGENTS.md §9.2 红线，无双版本）|
| **D3 codegen 兼容老产物** | A. variables.less 双输出（CSS vars + Less vars）/ B. 仅 CSS vars | **B**（Less vars 用户少，CSS vars 100% 兼容）|

---

## 17. 与 AGENTS.md 红线对账

| 红线 | 本方案如何遵守 |
|------|--------------|
| §1 禁 any | MCP handler 用 zod schema 严格收敛，验证层用 ThemeConfig 强类型 |
| §3.1 第一性原理 | §1 已论证主题系统 5 类需求；选 V0 不是因为"代码先在"而是"模型对" |
| §3.2 禁猜测 | APCA 计算用 W3C 草案标准实现，不靠肉眼 |
| §4.2 单文件 ≤300 行 | MCP theme.ts 拆成 4 文件（actions/scaffold.ts / actions/tokens.ts / actions/scheme.ts / validation.ts）|
| §9.1 无双版本 | 旧 4 个 action 一次性删；旧顶层字段迁移脚本一次性清 |
| §9.2 禁防御性兼容 | 不保留"如果有顶层 tokens 就读"的兼容分支；迁移后顶层永远无 |
| §9.3 兼容判断清单 | API 升级有迁移脚本统一改完所有调用方，符合"一次性改完" |

---

**附：本方案不涉及但已识别的技术债**（独立 issue 跟进）：

1. `apps/design-mcp/src/tools/domain/theme.ts` 当前 191 行单文件 ≤ 300 行尚 ok，重构后会扩到 500+，应按 §4.2 拆
2. `apps/design_front/src/stores/editor/index.ts` `persistThemeConfig` 不走 operation 流程 → 操作历史无法 undo（与本主题方案无关，但影响主题切换可回溯性）
3. `theme/get` 没返回 ETag → 多人协作时主题修改会覆盖（concurrency 问题，v2.0 加锁）

—— 完
