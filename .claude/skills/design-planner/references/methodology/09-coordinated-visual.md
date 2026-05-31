# 方法论 9：协同视觉 (Coordinated Visual)（v3 新增）

> 适用任务：所有 `D-X-craft-*`、`D-X-states`
>
> **核心**：一个视觉效果不是单节点完成的——是**多元素合奏**。AI 容易在单节点维度想 styles，写不出"合奏"。本方法论强制要求识别"参与节点"列表。

---

## 1. 视觉效果 vs 单节点样式

```
单节点样式：
  SubmitBtn.styles.backgroundColor = primary
  SubmitBtn.states.hover.backgroundColor = primaryHover
  → 写完不算"做了视觉效果"

视觉效果（协同视觉）：
  「主 CTA 浮出感」= 多节点合奏：
    - 主体 SubmitBtn：transform translateY(-2px) + boxShadow 深一档 + bg 主色深一档
    - 父容器 FormCard：保持 padding（防跳动）
    - 邻居 PolicyRow：opacity 微降至 0.95（焦点收窄）
    - 装饰 BgBlob：不动
    - 共享 transition：所有变化 200ms ease-out
  → 写完才有"浮出感"
```

---

## 2. 协同视觉的 4 个角色

每个视觉效果都涉及 4 类节点角色：

| 角色 | 描述 | 改什么 |
|---|---|---|
| **主体 (subject)** | 视觉效果的承载者 | 主属性：transform / boxShadow / backgroundColor / scale |
| **邻居 (sibling)** | 主体的兄弟节点（同父级） | 微变化（opacity 0.95 / 弱化）创造焦点收窄 |
| **父容器 (container)** | 主体的父节点 | 通常**不变**（防止布局抖动）；偶尔加 padding 兼容 |
| **装饰 (decoration)** | 装饰节点 / 背景 | 通常**不动**；偶尔联动（如 hover 时装饰也微高亮）|

---

## 3. 协同视觉配方（必读 recipes/visual-effects/）

每个视觉效果都应该有对应配方文档：

| 配方名 | 灵魂 | 参与角色 |
|---|---|---|
| floating | 浮出感 | 主体（抬升）+ 邻居（微退）|
| focus | 聚焦感 | 主体（高亮）+ 全屏（dim 蒙层，可选）|
| trust | 信任感（整屏策略，非单 hover）| 整屏视觉准则 5 条 |
| urgency | 紧迫感 | 主体（脉动）+ 文字（倒计时）+ 色（warning）|
| delight | 愉悦感 | 主体（spring 弹动）+ 装饰（小粒子可选）|
| confidence | 自信感 | 主体（实色填充强对比）+ 邻居（保持秩序）|

执行 craft 任务时，read 对应配方 → 按"参与角色 + CSS + 对账信号"落 schema。

---

## 4. 协同视觉的"识别参与节点"流程

写 craft 任务 md 时按这 4 步：

```
Step 1. 我要做什么视觉效果？（如"主 CTA 浮出感"）
Step 2. read recipes/visual-effects/<效果名>.md
Step 3. 列参与节点 4 角色：
  - 主体 (subject): SubmitBtn (n9)
  - 邻居 (sibling): PolicyRow (n36)（微退）/ FooterLinks (n7)（不动）
  - 父容器 (container): FormCard (n4)（不动 padding）
  - 装饰 (decoration): BgBlob (n14)（不动）
Step 4. 落 schema：
  - 主体节点改 visualState（hover）的 styles
  - 邻居节点（如有）改自己 visualState（context-active）的 styles
  - 父容器无需改
  - 装饰无需改
  - 全部 transition 共享同一缓动
```

---

## 5. 多个协同视觉同屏的处理

一屏可能有多个协同视觉同时存在：

| 视觉效果 | 触发条件 | 主体 | 不冲突 |
|---|---|---|---|
| SubmitBtn 浮出感 | hover SubmitBtn | SubmitBtn | ✅ |
| PhoneInput 聚焦感 | focus PhoneInput | PhoneInput | ✅（焦点不重叠）|
| Toast 弹出 | submitting=true 失败 | Toast overlay | ✅（z-index 隔离）|
| 全屏 dim | submitting=true | overlay backdrop | ⚠️ 与 SubmitBtn hover 冲突 → submitting 时 disable hover |

**冲突处理原则**：同时只能有一处"焦点"——避免视觉散乱。

---

## 6. 自审重点

`query/visual_state_distinctness` 在协同视觉的多个参与节点上各跑一次：

- 主体 hover 态 distinct override ≥ 3
- 邻居 context-active 态 distinct override ≥ 1（如有）
- 共享 transition 时长一致（不同节点 transition duration 相差 > 50ms 视为"不协同"）

---

## 7. md 落地

```markdown
## 协同视觉：主 CTA 浮出感（参考 recipes/visual-effects/floating.md）

### 参与节点 4 角色
- 主体：SubmitBtn (n9)
- 邻居：PolicyRow (n36)（微退）
- 父容器：FormCard (n4)（不动）
- 装饰：BgBlob (n14)（不动）

### 落到 schema
- SubmitBtn.states.hover：transform translateY(-2px) + boxShadow lg + bg primaryHover
- SubmitBtn.states.pressed：transform translateY(0) + boxShadow sm + bg primaryActive
- PolicyRow.states.context-active：opacity 0.95（activeWhen: state.view.btnHover，需 interaction 提供该字段）
  ⚠️ interaction 没有 view.btnHover 字段 → 可降级：邻居不联动，仅主体浮出
- 共享 transition: 200ms ease-out

### 自审
- visual_state_distinctness SubmitBtn.hover ≥ 3 ✅
- transition 一致 ✅
```

---

## 8. 红线

- ❌ 写 craft 任务只改主体节点 styles，不识别邻居 / 装饰协同
- ❌ 同屏多个协同视觉冲突（如 hover 浮出 + 全屏 dim 同时）
- ❌ 共享 transition 时长不一致 → 视觉"打鼓不齐"
- ❌ 不 read 对应 recipes/visual-effects/<效果名>.md 直接凭印象写
