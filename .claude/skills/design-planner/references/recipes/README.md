# design-planner recipes/

配方库——告诉 AI **可以照抄什么**。methodology 告诉怎么想；recipes 给出"已经被验证好的现成模式"，AI 直接挑选 + 参数化即可。

## 4 类配方

### visual-effects/（视觉效果，7 份）

按"想达成什么感受"挑。

| 配方 | 核心 | 适用 |
|------|------|------|
| `floating.md` ★ | hover lift + shadow up | 卡片浮起 / 按钮升起 |
| `focus.md` ★ | focus ring + 周围弱化 | 输入控件 / 表单 |
| `trust.md` ★ | 沉稳蓝 + 单色 + 极少装饰 | 登录 / 支付 / 实名（互斥 playful）|
| `urgency.md` ★ | 警示色 + pulse + 倒计时大字 | 限时 / 错误警告 |
| `delight.md` ★ | spring scale + ripple + 自动消失 | 点赞 / 任务完成 / 解锁 |
| `playful.md` ★ | 多色 + 大圆角 + spring | 教育 / 社交 / 娱乐（互斥 trust）|
| `premium.md` ★ | 克制 + 大留白 + 单双色 | 金融 / VIP / Pro 订阅 |

### compositions/（业务复合控件，10 份）

按"要做什么控件"挑。每份给可直接复用的节点结构 + styles + visualStates + activeWhen。

| 配方 | 适用 |
|------|------|
| `checkbox.md` ★ | 自定义勾选框（label-button workaround）|
| `tab-segment.md` ★ | 横向选项 + active 强调 |
| `accordion-collapse.md` | 折叠手风琴 |
| `radio.md` | 自定义单选 |
| `select-combobox.md` | 自定义下拉 |
| `stepper.md` | 步骤指示器 |
| `pagination.md` | 分页器 |
| `switch-toggle.md` | 开关 toggle |
| `modal-drawer.md` | modal/drawer 浮层 |
| `toast-snackbar.md` | toast 反馈 |

### decoration-systems/（装饰系统，5 族）

★ **每屏只能选 1 族**——这是 v3 装饰系统单一族原则。

| 系统 | 视觉特征 | 适配主题 |
|------|---------|---------|
| `soft-glow.md` ★ | 柔光晕 / 多色光斑 / 中等密度 | warm / playful |
| `geometric-line.md` ★ | 几何细线 / 单色 / 极少密度 | minimal / trustworthy / premium |
| `illustration.md` ★ | 插画 / 多色 / 中等到丰富 | playful / warm |
| `texture.md` | 纹理（noise / 网格）/ 极弱 | premium / clean |
| `organic-curve.md` | 有机曲线 / 流体 | natural / warm |

### theme-element-dict/（主题词典，8 主题）

按 theme.intent.tone 挑 1 份。每份给 5 维（色 / 字 / 形 / 饰 / 律）的"默认值套餐"——在没特殊需求时直接套用。

| 主题 | 适用场景 |
|------|---------|
| `minimal.md` ★ | 极简 / 工具 / B 端 |
| `trustworthy.md` ★ | 登录 / 支付 / 实名 / 银行 |
| `warm.md` ★ | 内容 / 阅读 / 生活方式 |
| `playful.md` ★ | 教育 / 社交 / 短视频 / 娱乐 |
| `premium.md` ★ | 金融 / 投资 / VIP / Pro |
| `clean.md` | 数据 / Dashboard / 工具 |
| `bold.md` | 营销 / 节日 / 品牌强主张 |
| `natural.md` | 户外 / 健身 / 农产品 |

## 加载策略

- `D-X-strategy` Phase C → 按 theme.intent.tone 加载 1 份 `theme-element-dict/<tone>.md`
- `D-X-decorations` → 按选定族加载 1 份 `decoration-systems/<system>.md`
- `D-X-craft-*` → 按"想达成的感受"加载 1-2 份 `visual-effects/*.md`
- `D-X-craft-*` 涉及业务复合控件 → 加载 1 份 `compositions/<控件>.md`

不要全部加载——按需 read，避免 context 浪费。
