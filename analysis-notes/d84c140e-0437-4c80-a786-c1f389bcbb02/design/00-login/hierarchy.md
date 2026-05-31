> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-hierarchy
> 对应 schema 字段：screen.meta.design.layers + 每节点 styles.zIndex

# D-00-login-hierarchy — 视觉层级 4 层

## 1. 4 层视觉模型（本屏适配）

| 层 | zIndex | 包含什么 | 视觉特征 |
|----|:------:|---------|---------|
| 遮罩 | 30 | 项目级 globalOverlays（global-offline-banner / global-session-expired Modal）由 Root 之外注入，不在本屏 layers 内 | 临时阻断，由全局层负责 |
| 前景 | 3 | （本屏无）—— SubmitSpinner 在按钮内 z 不抬升；本屏决策不用 LoadingOverlay（决策 D1 决策于 interaction）；Toast 由全局 ui 通道挂 | — |
| 中景高 | 2 | FormCard / SubmitBtn / FooterLinks / LockedCard 视图 | 主内容承载 + CTA |
| 中景低 | 1 | HeaderArea / BrandLogo / BrandSlogan | 标题区 / 品牌识别 |
| 背景 | 0 | rootNode 底色（screen.backgroundColor）+ 装饰节点（D-decorations 任务追加，1-2 个） | 氛围 / 留白 |

**关键架构观察**：
- 本屏有 NormalFormView / LockedView **互斥子树**（visibleWhen 由 interaction 阶段写死；同一时刻只显示一个）→ 所以 FormCard 与 LockedCard 不会同屏并存，视觉层级各自独立
- SubmitSpinner 是按钮内子节点，**不抬高 z**——按钮自身 z=2，spinner 跟随按钮（visibleWhen=submitting，childrenVisibility 控制显隐），不需要 absolute / position
- 本屏决策不用 LoadingOverlay（按钮内 spinner + 表单 disabled 已足够）→ 前景层 z=3 实际为空槽，留给未来需要时

## 2. 视觉流向（用户视线路径）

### NormalFormView 状态（默认）

```
进入页面（safe-area-top + 32px）
   ↓
视线落在 BrandLogo（z=1，主角-品牌；居中位置 + 36px 大字号 → 第一眼识别）
   ↓
扫到 BrandSlogan（z=1，配角-品牌补充；caption 12px → 0.3 秒明白"这是个什么 App"）
   ↓
被 FormCard 的轻浮起阴影（shadow:sm）+ 卡片圆角承接式视觉引导到表单（z=2 跳到中景高）
   ↓
沿表单字段从上到下：PhoneField → ModeToggle → CredentialField → PolicyRow
   ↓
最终视线停在 SubmitBtn（z=2，主角-CTA 视觉权重最高 / 全宽 / primary 主色 / 12px 圆角药丸感）
   ↓
完成主路径后扫一下 FooterLinks（z=2，次级出口；caption + textSecondary 弱化避免抢戏）
```

### LockedView 状态（错误锁定后）

```
进入页面 → 第一眼是 LockedIcon（z=2 中景高，warning/error 色提示状态）
   ↓
读 LockedTitle（z=2，h4 字号"账号已锁定"）
   ↓
读 LockedCountdown（z=2，倒计时数字大字号 display 醒目）
   ↓
读 LockedHint（z=2，body 提示文案）
   ↓
最后看 LockedForgotLink（z=2，唯一出口"去重置密码"）
```

LockedView 不需要 z=1 的 HeaderArea——锁定态没必要展示品牌（用户已经在登录失败状态，不需要再被品牌"打招呼"），所以 HeaderArea 的 visibleWhen 由 interaction 阶段写死只在 NormalFormView 内。

## 3. 各层包含的节点（穷举）

### 前景（z=3）
- 无（本屏决策不用 LoadingOverlay；Toast / globalOverlays 由全局层处理）

### 中景高（z=2）—— 主内容承载 + CTA + 次级出口
- `FormCard` (nd_e60fb832933f4b86a6638) —— 表单容器
  - `PhoneField` 及内部 PhoneLabel / PhoneInput / PhoneError
  - `ModeToggle` 及内部 CodeModeBtn / PasswordModeBtn
  - `CredentialField` 及内部 CredentialLabel / CredentialInput / CredentialError / GetCodeBtn / PasswordToggleEye
  - `PolicyRow` 及内部 PolicyCheckbox / PolicyText
  - `SubmitBtn` 及内部 SubmitSpinner
- `FooterLinks` (nd_c04451d9d8f243489f1c1) 及内部 RegisterLink / ForgotLink
- `LockedView` (nd_aa8a0633ce354664a8d1a) 及内部 LockedIcon / LockedTitle / LockedCountdown / LockedHint / LockedForgotLink

⚠️ **z 写到容器（FormCard / LockedView / FooterLinks）即可**——子节点不显式写 zIndex，跟随父节点 stacking context；SubmitBtn 例外（它在容器内但视觉是 CTA 焦点，可加 boxShadow 让它"浮"出来，但 zIndex 不抬，靠 shadow + scale 视觉层次）

### 中景低（z=1）—— 标题区 / 品牌识别
- `HeaderArea` (nd_451ec7c1336d478a810d9) 及内部 BrandLogo / BrandSlogan

### 背景（z=0）—— 装饰 / 氛围
- `Root.styles.background` ← 通过 `screen.backgroundColor = "$token:colors.background"` 设置
- `NormalFormView` / `LockedView` 容器自身不需要装饰背景（透明）
- 装饰节点（D-decorations 任务追加，1-2 个）：
  - 候选：BgBlobTopRight（蓝紫渐变 blob，右上角溢出）
  - 候选：BgBlobBottomLeft（淡紫薄装饰，左下角溢出，可选）

### 遮罩（z=30）—— 由全局层负责
- `globalOverlays.global-offline-banner`（产品/交互阶段已建）
- `globalOverlays.global-session-expired-modal`（产品/交互阶段已建）

## 4. 候选层级方案对比

### 方案 A：HeaderArea(z=1) + FormCard(z=2) + 装饰(z=0) ★ 采用

- **视觉层次**：4 层分明，符合"主内容>品牌>装饰"的登录场景视觉优先级
- **优点**：
  - 表单优先（z=2）符合用户"我是来登录的"心智 → 视觉焦点不被品牌抢
  - 品牌不消失（z=1）保证识别度，但不喧宾夺主
  - 装饰在 z=0 角落溢出，营造氛围但不挤占内容
- **缺点**：品牌区被压低一档（接受——登录页本就是过路屏，品牌识别 0.5s 完成即可）

### 方案 B：BrandLogo(z=2) 与 FormCard(z=2) 同层

- **优点**：品牌强化，"我们是个有调性的 App"
- **缺点**：竞争视觉焦点；用户在"看品牌"和"填表单"之间分心 → 增加操作摩擦
- **否决**：与目标感受"简洁/友好/可信"中"简洁"冲突——同层=多焦点=不简洁

### 方案 C：全部 z=2 不分层

- **优点**：实现简单，无需 zIndex 管理
- **缺点**：缺视觉层次 → 用户视线无路径 → 装饰可能撞到内容
- **否决**：放弃了视觉设计师最重要的"层级"工具

→ **采用方案 A**，理由：
1. 视觉焦点清晰（表单>品牌>装饰）
2. 与情感目标"简洁/可信"契合（少干扰=简洁；克制=可信）
3. 给 D-decorations 任务在 z=0 留出空间，避免装饰反喧宾

## 5. 装饰位置规划（给 D-decorations 任务的指南）

```
            +—————————————————————+
            |  ◯ BgBlobTopRight    |  ← 角落溢出，z=0，部分裁切
            |    (蓝紫渐变 12% 透明) |
            |                      |
            |     [BrandLogo]      |  z=1 HeaderArea
            |     [BrandSlogan]    |  z=1
            |                      |
            |   ┌──────────────┐   |
            |   │ FormCard     │   |  z=2 中景高
            |   │  PhoneField  │   |
            |   │  ModeToggle  │   |
            |   │  CredField   │   |
            |   │  Policy      │   |
            |   │  SubmitBtn   │   |  z=2 主 CTA
            |   └──────────────┘   |
            |                      |
            |    [FooterLinks]     |  z=2
            |                      |
            |  ◢ BgBlobBottomLeft  |  ← 角落溢出，z=0（可选）
            |    (淡紫 6% 透明)     |
            +—————————————————————+
```

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  patch: {
    design: {
      layers: [
        { name: "前景",  zIndex: 3, elements: [] },
        { name: "中景",  zIndex: 2, elements: ["FormCard","FooterLinks","LockedView"] },
        { name: "中景",  zIndex: 1, elements: ["HeaderArea","BrandLogo","BrandSlogan"] },
        { name: "背景",  zIndex: 0, elements: ["BgBlobTopRight","BgBlobBottomLeft"] }
      ]
    }
  }
}
```

**装饰节点 elements 的 name 是 D-decorations 阶段会建的——本任务在此预声明，给 D-decorations 任务的输入提示**。如 D-decorations 决策只建 1 个装饰，layers 在 D-decorations 任务执行时同步收敛。

**自检**：
- ✅ 4 层归类完所有非装饰节点（HeaderArea/BrandLogo/BrandSlogan/FormCard/FooterLinks/LockedView）
- ✅ 装饰节点放 z=0
- ✅ 遮罩 z=30 由全局层负责（不在本屏 layers）
- ✅ 视觉流向描述了 NormalFormView + LockedView 两条
- ✅ 候选方案 ≥ 2 + 否决理由（B 抢焦点 / C 缺层次）
- ✅ 给 D-decorations 任务留下了具体位置指引
