# 方法论 3：Atomic Design 组件分层

> 适用任务：`D-system-baseline`、`D-templates`、跨屏复用决策
> 这是**通用业务组件抽模板**的判定依据——避免每屏重写按钮、表单字段。

## 1. Atomic 三层

```
Atom（基础原子）
  例：input / button / link / checkbox / radio / icon-btn / tag / badge / avatar
  规格：完全来自 ThemeConfig（已统一）
  设计方式：不为每个实例独立深钻；direct $token: 引用即可
  抽模板：❌ 不抽（被 ThemeConfig 替代）

Molecule（业务分子）
  例：form-field（label+input+error）/ search-bar / mode-toggle / phone-input-with-code
       avatar-group / tag-list / icon-btn-with-tooltip
  规格：业务组合，第一次出现需要独立深钻设计意图
  设计方式：在第一个屏完成 ≥ 1 个实例的完整设计后，立刻 asset/save_as_template
  抽模板：✅ 抽（跨屏 ≥ 2 次出现）

Organism（业务有机体）
  例：form-card / app-bar / nav-tab-bar / hero-section / empty-state / permission-card
       order-card / message-bubble / story-cell
  规格：大业务组件，必须独立深钻视觉规格
  设计方式：单独一组分析；考虑可变 props（dark/light variant、size variant）
  抽模板：✅ 抽（跨屏 ≥ 2 次或被 productId 标为通用）
```

## 2. 跨屏复用判定流程

```
1. 对每个 Molecule / Organism 候选模板：
   ↓
2. 是否在 ≥ 2 个屏中出现？
   - 是 → 进入 3
   - 否（仅本屏出现一次）→ 不抽，直接写结构
   ↓
3. 是否同一个屏内出现 ≥ 2 次？
   - 是 → 必抽（避免重复维护）
   - 否 → 进入 4
   ↓
4. 是否是产品识别度组件（如 Logo / 主导航 / 品牌按钮）？
   - 是 → 抽（保证全局一致性）
   - 否 → 进入 5
   ↓
5. 是否需要 propDefinitions（变体属性）？
   - 是 → 抽并定义 prop schema
   - 否 → 抽但 propDefinitions=[]
```

## 3. 抽模板执行（asset/save_as_template + asset/instantiate）

第一个屏完成 PhoneInput 设计后：

```jsonc
asset/save_as_template {
  projectId,
  rootNodeId: "<PhoneInput 实例的 id>",
  templateName: "PhoneInput",
  kind: "molecule",            // atom | molecule | organism
  category: "form",
  description: "手机号输入框，带验证状态视觉反馈",
  propDefinitions: [
    { name: "value",       type: "string",   description: "受控值" },
    { name: "onChange",    type: "event",    description: "输入回调" },
    { name: "error",       type: "string",   description: "错误信息（非空时显示红框+红字）" },
    { name: "placeholder", type: "string",   default: "请输入手机号" }
  ]
}
→ 写入 project.componentAssets[]
```

后续屏 instantiate：

```jsonc
asset/instantiate {
  projectId,
  templateId: "tpl_phoneInput",
  parentId: "<目标父节点>",
  propValues: { value: "{{state.view.form.phone}}", error: "{{state.view.errors.phone}}" }
}
→ 创建实例节点（默认引用模板，模板更新后实例自动同步）
```

## 4. 设计系统基线（D-system-baseline）

每个项目首次进入 design 阶段时，**先做一次 Atom 规格统一审核**：

```
1. theme/get → 拉 ThemeConfig
2. 列出本项目用到的 Atom 类型（按钮 / 输入框 / 链接 / Tag / Avatar / Switch / Checkbox / Radio / Icon-btn）
3. 对每种 Atom：
   - default styles 是否齐？（width / height / padding / fontSize / color / bg / border / radius / shadow / transition）
   - variant 设计：primary / secondary / tertiary / danger（按钮类）
                  default / success / error / warning（输入类）
   - state 矩阵：default / hover / pressed / focus / disabled / loading（按钮 6 态）
                default / focus / error / disabled / readonly（输入 5 态）
4. 在 md 中给出每种 Atom 的"标准规格表"，写入 design/system/baseline.md
5. 后续 D-X-styles 任务直接抄基线规格——不允许每屏重定义
```

## 5. 模板更新与同步

模板被改后，所有 detached=false 的实例自动同步：

```
asset/update_template { templateId, patch: { rootNode: 新结构 } }
  → 所有引用此模板的实例（detached=false）自动更新
  
asset/sync_instance { instanceId }
  → 强制把已 detach 的实例重新同步回模板（详见 MCP）

asset/detach_instance { instanceId }
  → 把实例从模板"独立出来"，后续模板更新不影响（用于一次性定制）
```

**红线**：
- ❌ 改模板 + 部分实例已 detach 但忘记 sync → 视觉撕裂
- ✅ 在 D-audit 时全量检查 detached 实例是否需要重新同步

## 6. 何时不抽模板

- 🚫 **极简单的样式封装**（仅 1-2 个 styles 属性）→ 直接 token 引用即可
- 🚫 **一次性的特殊节点**（如启动屏的 Hero 插画）→ 不抽
- 🚫 **结构差异大的"看起来相似"组件**（如登录卡片 vs 注册卡片虽都叫 FormCard 但布局不同）→ 各自定义，不强制抽

## 7. 模板的层级抽法

```
LoginPage
└── FormCard  ← 可抽 organism 模板（含完整布局 + 题目 + 字段 + 按钮的占位）
    ├── FormTitle  ← 不必抽（每屏标题不同）
    ├── PhoneInput ← 抽 molecule 模板（含 label + input + error）
    ├── ...
    └── SubmitBtn ← Atom 由 ThemeConfig 接管，不抽
```

## 8. md 落地（D-system-baseline / D-templates）

```markdown
## 设计系统基线（D-system-baseline）

### Atom 规格表
[按钮 / 输入框 / 链接 / Tag 等每种的 default + variants + states 标准]

### 跨屏复用判定
| 候选 | 出现次数 | 决策 | templateId |
|------|---------|------|-----------|
| PhoneInput | 4 屏 | ✅ 抽 molecule | tpl_phoneInput |
| FormCard | 3 屏 | ✅ 抽 organism | tpl_formCard |
| BrandLogo | 6 屏 | ✅ 抽 molecule | tpl_brandLogo |
| LoginCardBg | 1 屏 | ❌ 不抽 | - |

### 模板抽取顺序（先 Atom → Molecule → Organism）
1. PhoneInput（在 00-login 屏完成后立刻抽）
2. FormCard（在 00-login 屏完成后立刻抽）
3. ...
```

## 9. 红线

- ❌ 单页项目硬要抽模板 → D-templates 必须 skipped + notes "单页无跨屏复用"
- ❌ 模板抽得太碎（每个 Atom 都抽）→ 失去 ThemeConfig token 统一作用
- ❌ 模板抽得太大（整个屏抽成一个 template）→ 失去复用粒度
- ❌ 模板的 propDefinitions 定义不全 → 跨屏使用时无法变体
- ❌ 改模板后没在 D-audit 时检查 detached 实例 → 视觉撕裂
