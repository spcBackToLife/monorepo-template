# 02 — 设计目标提取（Phase B 核心）

> 必读时机：执行 `D-X-design-goals` 任务时。
> 输入：positioning.md + theme.intent + interaction.state.view 字段清单。
> 输出：`design-goals.md` + `screen.meta.design.designGoals[]`。
>
> 任务目的：把"产品定位 / 页面价值 / 用户场景"翻译成 ≥3 个**具体可视判据**的设计目标。每个目标后续会派发 1 个 craft 任务,所以目标质量直接决定整屏视觉质量。
>
> ★ **最关键的一份方法论**——Phase B 写错,后续 Phase C/D/E/F 全错。

---

## 1. 5 步提取法

```
Step 1: 扫 positioning 三层 + theme.intent + interaction.state.view → 列候选目标 (≥ 5 个)
Step 2: 按 impactMode 分类 → 每类至多 1 个保留 → 收敛到 3-7 个
Step 3: 写每个目标的 5 字段 (statement / whyMatters / impactMode / successCriteria / priority)
Step 4: 验 statement 含动词+主体+视觉机制
Step 5: 验 successCriteria ≥ 3 条,全部可视
```

---

## 2. Step 1 — 扫候选目标

### 2.1 扫描清单

依次对照 positioning 三层 + theme + interaction,找候选目标：

| 来源 | 提示候选目标 |
|---|---|
| positioning.product.differentiation | mood-conveyance / brand-recognition |
| positioning.page.userBenefit | cta-clarity / hierarchy |
| positioning.page.visualTiming.zeroPointFiveSec | mood-conveyance / brand-recognition |
| positioning.page.visualTiming.fiveSec | hierarchy / cta-clarity |
| positioning.page.visualTiming.thirtySec | state-feedback |
| positioning.userScenario.psychOnEnter | mood-conveyance / trust-signal |
| positioning.userScenario.urgency=high | urgency / cta-clarity |
| theme.intent.aesthetics | decoration-storytelling |
| interaction.state.view 业务态字段 | state-feedback |
| 合规约束（如必勾协议）| trust-signal |
| globalConcerns（如锁定 / 错误）| state-feedback |

### 2.2 候选目标清单（先广后窄）

第一轮**故意写多**（≥5 个）：

```
登录页候选目标列表（举例）：
  C1: 让用户进屏 0.5 秒感受到校园温度       (mood-conveyance)
  C2: 让 SubmitBtn 成为首屏视觉主角        (cta-clarity)
  C3: 让协议勾选不像被强制                (trust-signal)
  C4: 让用户清晰区分验证码 / 密码登录模式   (hierarchy)
  C5: 让锁定态温和不冷漠                  (state-feedback)
  C6: 让 BrandLogo 传递品牌识别度          (brand-recognition)
  C7: 让验证码倒计时给用户安心感           (state-feedback)
  C8: 让错误提示不暴击                    (trust-signal / state-feedback)
```

---

## 3. Step 2 — 按 impactMode 分类收敛

### 3.1 impactMode 7 分类

| impactMode | 含义 | 典型视觉手段 |
|---|---|---|
| `mood-conveyance` | 传递氛围 / 情绪 | 屏底色温 / 装饰 / 留白节奏 |
| `cta-clarity` | 让主操作清晰 | 主色填充 + 大尺寸 + 周围弱化 |
| `trust-signal` | 传递信任 / 降焦虑 | 圆角柔和 + 错误色软化 + 微动效 |
| `hierarchy` | 信息层级清晰 | 字号梯度 + 字重对比 + 留白比例 |
| `state-feedback` | 状态切换可见 | visualState 多态视觉差异 ≥ 显著 |
| `brand-recognition` | 品牌识别度 | Logo / 品牌色 / 品牌字 / 主屏装饰呼应 |
| `decoration-storytelling` | 装饰承载情绪故事 | 装饰元素 ≥ 2 处呼应概念 mood |

### 3.2 收敛规则

```
每类至多 1 个目标 (避免同类目标互相稀释)
总数 3-7 个 (少于 3 抓不住主要矛盾,多于 7 没收敛)
P0 优先级目标 ≥ 1 个,且 P0 总数 ≤ 3 (P0 太多 = 没分主次)
```

### 3.3 取舍示例

```
候选 C1 + C8 都是 mood-conveyance / trust 偏向 → 合并为：
  G1 (P0): 让用户进屏 0.5 秒感受到校园温度,降低注册防备   (mood-conveyance)

候选 C5 + C7 都是 state-feedback → 合并为：
  G4 (P1): 让锁定态温和 + 倒计时安心,不像处罚通知       (state-feedback)

候选 C6 brand-recognition 单独保留,因为登录页是品牌门面 → P0
候选 C2 cta-clarity 单独保留,因为 CTA 是核心动作 → P0
候选 C3 trust-signal 单独保留,因为合规红线 → P1
候选 C4 hierarchy 暂时跳过,因为模式切换权重不如 CTA 主操作

最终：G1 G2 G3 G4 G5 共 5 个,P0=3 + P1=2 (合理)
```

---

## 4. Step 3 — 写 5 字段

### 4.1 每个目标的强制 5 字段

```jsonc
{
  id: "G1",                        // G1 / G2 / ...
  statement: string,               // 含动词+主体+视觉机制,≤ 80 字
  whyMatters: string,              // 为何对产品有价值,≤ 100 字
  impactMode: enum (7 类),
  successCriteria: string[],       // ≥ 3 条,全部可视判据
  priority: "P0" | "P1" | "P2",
  measureMethod?: string           // 可选,如何客观测量
}
```

### 4.2 statement 写作模板

```
模板：
  让 <主体> 在 <视觉机制 / 时机> 感受到 / 看到 / 区分到 <具体感觉 / 信号>,达成 <价值产出>

正例 1：
  "让用户进登录页 0.5 秒感受到清晨教室般的温度,降低注册防备"
  - 主体: 用户
  - 视觉机制 / 时机: 进屏 0.5 秒
  - 具体感觉: 清晨教室般的温度
  - 价值产出: 降低注册防备

正例 2：
  "让 SubmitBtn 成为首屏唯一主角,用户视线第二跳必落于此"
  - 主体: SubmitBtn (元素主角)
  - 视觉机制 / 时机: 首屏视线第二跳
  - 具体感觉: 唯一主角
  - 价值产出: 视线必落于此 → 推进 CTA

正例 3：
  "让协议勾选不像被强制,而像主动同意,降低注册流失"
  - 主体: 协议勾选 (复合控件)
  - 视觉机制: 勾选交互的视觉反馈
  - 具体感觉: 主动同意
  - 价值产出: 降低注册流失
```

### 4.3 statement 反例

```
❌ "让登录页有校园温度"
   缺动词 / 主体 / 视觉机制 / 具体感觉 / 价值产出

❌ "让用户感觉舒服"
   "舒服"无可视判据

❌ "让 UI 看起来现代化"
   "现代化"是设计 prior 表达,非产品价值

❌ "让 SubmitBtn 圆角 12px"
   这是 css 微调,不是设计目标
```

---

## 5. Step 4 — 写 successCriteria（最关键）

### 5.1 successCriteria 强制规则

- **≥ 3 条**：少于 3 条说明判据不全,Phase F 自审无法逐条核对
- **全部可视判据**：必须能从截图客观判断 pass / fail
- **禁止抽象描述**：禁用"主题契合度高 / 现代化 / 舒服 / 干净 / 协调"等

### 5.2 可视判据类型（按 impactMode）

#### mood-conveyance 可视判据

```
✅ "首屏视线热点(saliency map)落在 BrandLogo + 屏底偏暖区,而非 SubmitBtn 主色块"
✅ "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt"
✅ "出现 ≥ 2 个具象校园元素表征(色斑 / 插画 / 纹理)"
✅ "无任何冷峻 SaaS 信号:纯白底 / 直角元素 / 灰阶占比 > 40%"
```

#### cta-clarity 可视判据

```
✅ "SubmitBtn 与 GetCodeBtn 视觉权重差 ≥ 4 (按 weight 公式)"
✅ "SubmitBtn 字号 ≥ 16px,周围至少 16px 留白"
✅ "首屏 CTA 占比 (SubmitBtn 面积 / FormCard 面积) ≥ 25%"
✅ "SubmitBtn 在 default / hover / pressed / loading / disabled 5 态视觉差异均 ≥ 显著"
```

#### trust-signal 可视判据

```
✅ "checkbox 视觉为'圆润主色对勾',非'灰冷方框 / 黑色 native'"
✅ "未勾 → 勾选切换有'被点亮'微动效 (≥ 200ms transition)"
✅ "错误态文案非纯红 (#DD0000) 暴击,而是邻近暖色或弱化字号"
```

#### hierarchy 可视判据

```
✅ "信息层级金字塔 3-4 层,每层节点数比上层多 ≥ 1.5×"
✅ "主标题字号 / body 字号比 ≥ 1.4"
✅ "字重梯度跨 ≥ 200(如 400/600)"
```

#### state-feedback 可视判据

```
✅ "loginMode 切换 (code/password) 像素差 ≥ 3% (TabIndicator 移动可见)"
✅ "lockedUntil 触发后 LockedView 与 NormalView 像素差 ≥ 50%"
✅ "倒计时数字字号 ≥ 32px,等宽字体,不会因数字变化产生 layout shift"
```

#### brand-recognition 可视判据

```
✅ "BrandLogo 真画了,非占位虚线 / 文字 placeholder"
✅ "BrandLogo 在屏顶 safe-area 内,占首屏面积 ≥ 5%"
✅ "Logo 主色与 theme.primary 一致或形成有意识的对比"
```

#### decoration-storytelling 可视判据

```
✅ "≥ 2 处装饰呼应 mood 关键词 (如'校园清晨' → 教室窗格 / 笔记本 / 跑道 任选)"
✅ "装饰系统单一族 (soft-glow / illustration / texture / 任选 1)"
✅ "装饰透明度 ≥ 20% (避免接近不可见)"
```

### 5.3 forbiddenSignals（反例,可选但推荐）

每个目标可附 forbiddenSignals 列表——出现这些信号即视为 fail：

```
G1 mood-conveyance forbiddenSignals:
  - "屏底为 #FFFFFF 或与之差 ≤ 1pt"
  - "灰阶占比 > 40%"
  - "出现任何直角元素 (border-radius < 4px)"
  - "装饰元素 alpha < 20%"
```

---

## 6. Step 5 — 验收

每个 designGoal 写完,跑这个验收清单：

- [ ] statement 含动词 + 主体 + 视觉机制 + 具体感觉 + 价值产出
- [ ] statement ≤ 80 字
- [ ] whyMatters 说清"对产品有何价值",非空话
- [ ] impactMode ∈ 7 类枚举
- [ ] successCriteria ≥ 3 条
- [ ] successCriteria 每条都能从截图判断 pass / fail
- [ ] successCriteria 不含抽象描述
- [ ] priority ∈ {P0, P1, P2}
- [ ] (推荐) forbiddenSignals 列表给了反例

任一未通过 → 该 goal 不合格,重写或合并到其他 goal。

---

## 7. ★ 沉淀到 schema 的结论（必填）

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      designGoals: [
        {
          id: "G1",
          statement: "让用户进登录页 0.5 秒感受到清晨教室般的温度,降低注册防备",
          whyMatters: "用户带'略防备'情绪进入;视觉先安抚 = 注册转化的前置条件",
          impactMode: "mood-conveyance",
          successCriteria: [
            "首屏视线热点落在 BrandLogo + 屏底偏暖区,而非 SubmitBtn 主色块",
            "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt",
            "出现 ≥ 2 个具象校园元素表征(色斑 / 插画 / 纹理)",
            "无任何冷峻 SaaS 信号(纯白底 / 直角元素 / 灰阶占比 > 40%)"
          ],
          priority: "P0",
          measureMethod: "Bash 调 screenshot-screen.mjs + Read 截图,人工对照 4 条 successCriteria 逐条核对",
          forbiddenSignals: [
            "屏底 #FFFFFF 或与之差 ≤ 1pt",
            "灰阶占比 > 40%",
            "出现任何直角元素 (border-radius < 4px)"
          ]
        },
        // G2, G3, ... 共 ≥ 3 个
      ]
    }
  }
}
```

---

## 8. 数量与优先级红线

- ❌ designGoals < 3 → R-GOAL-COUNT 拒（抽不出 3 个目标 = 没真做提取）
- ❌ designGoals > 7 → R-GOAL-COUNT 拒（没收敛 = 没分主次）
- ❌ P0 = 0 → 必有至少 1 个 P0（否则没识别到核心冲突）
- ❌ P0 ≥ 4 → 重新审视,大概率没分主次

---

## 9. 一句话总结

> **设计目标 ≠ 字段值；设计目标 = "让用户在 X 时机感受到 Y,达成 Z 价值",并配 ≥ 3 条可视判据。后续 Phase C/D/E/F 都是为了让这些目标在像素层面真实达成。**
