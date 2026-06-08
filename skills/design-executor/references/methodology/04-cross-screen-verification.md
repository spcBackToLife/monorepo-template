# 方法论 4：跨屏一致性核对（Cross-Screen Verification）

> 适用任务：`E-cross-screen-snapshot`、`E-global-snapshot`
> 与 D-audit 的区别：D-audit 在 design 阶段做"规格层面"对照（schema 字段对比）；executor 阶段做"执行层面"对照（截图渲染对比）。

## 1. 与 D-audit 的分工

```
D-audit（design 阶段）：
  - 对照 schema 字段
  - 维度：通用组件 styles / 视觉密度 / 主题契合 / 模板覆盖 / 全局 overlays 规格
  - 产出：发现不一致 → 用 batch_update 修
  
E-cross-screen-snapshot（executor 阶段）：
  - 对照实际截图
  - 维度：截图视觉一致性（同种组件实际渲染 / palette 实际呈现 / 装饰风格实际效果）
  - 产出：发现不一致 → 路由到对应阶段（多数是 design 微调）
```

## 2. 核对维度

### 维度 1：同种组件实际渲染对照

```
对每种通用组件（如所有按钮）：
  收集所有屏的截图（裁剪只看按钮区域）
  逐屏对照：
    □ 形状（圆角 / 高度）一致？
    □ 颜色（bg / text）一致？
    □ 阴影（深度 / 透明度）一致？
    □ hover 后的变化一致？（如能模拟）
```

**红线**：
- 同种组件在不同屏渲染差异明显 → D-audit 应该已经修了；如截图仍不一致 → 检查是不是 detached 实例没 sync

### 维度 2：palette 跨屏一致性

```
跨所有屏对照实际渲染色彩：
  □ primary 色出现在所有需要 primary 的地方 ✓
  □ 没有屏出现 palette 外的色（如登录页正常但首页突然有蓝色）
  □ 暗色背景和浅色背景的搭配在不同屏一致
```

### 维度 3：视觉密度跨屏均衡（实际感受）

```
按 D-audit 给的总权重对照实际截图：
  - 登录页 (28) 实际看起来"丰富"
  - 首页 (22) 实际看起来"有内容但不挤"
  - 设置页 (18) 实际看起来"简洁工具型"
  - 错误页 (12) 实际看起来"克制专注"

跨屏切换截图（模拟用户从 A 屏到 B 屏）：
  □ 视觉风格断层感小？
  □ 色调过渡自然？
  □ 没有突兀的"陌生屏"？
```

### 维度 4：装饰风格跨屏统一

```
对所有屏的装饰节点截图对照：
  □ 装饰类（如有机 + 光效）是否所有屏一致
  □ 装饰透明度等级是否一致
  □ 装饰位置策略是否一致（角落溢出 / 背景氛围 / 分割装饰）
```

### 维度 5：全局 overlays 跨屏并存验证

详见 §3。

## 3. 全局 overlays 跨屏并存（E-global-snapshot 关键）

global overlays 跨屏出现 → 必须验证在不同屏上的视觉协调性。

### 模拟场景

```
场景 1：登录页 + offline-banner 并存
  state/view_set_preview { variable: 'globalView.network.status', value: 'offline' }
  generate_snapshots { screenIds: ['00-login'] }
  核对：
    □ banner 在最顶部（不被 nav-bar 遮）
    □ banner 色调与登录页主调协调
    □ banner 不抢登录卡焦点
    □ banner 内容（icon + text + retry）清晰

场景 2：首页 + session-expired Modal 并存
  state/view_set_preview { variable: 'globalView.session.status', value: 'expired' }
  generate_snapshots { screenIds: ['01-home'] }
  核对：
    □ Modal backdrop 暗化首页内容（焦点转移）
    □ Modal 圆角 + 阴影与首页卡片风格一致
    □ Modal 位置居中
    □ Modal 内 CTA 按钮风格一致
    □ 出入动画顺畅

场景 3：error-boundary 在任意屏触发
  state/view_set_preview { variable: 'globalView.errorBoundary.crashed', value: true }
  generate_snapshots { screenIds: 选 2-3 个屏 }
  核对：
    □ 全屏遮罩在所有屏一致
    □ 重启按钮位置 / 风格一致
    □ 错误图示居中

[更多场景...]
```

## 4. 不一致项处理

```
对所有不一致项，按 issue-routing.md 路由：
  - 同种组件渲染差异 → design-planner（D-audit 应已修；现仍不一致检查 detached 实例）
  - 装饰透明度跨屏不一致 → design-planner（statyles 微调）
  - palette 外色出现 → design-planner（D-token-coverage 应已 95%；检查漏网）
  - 全局 overlay 在某屏遮挡内容（z-index 不够）→ design-planner（修 overlay z-index）
  - 全局 overlay 出入动画卡顿 → design-planner（调 duration / easing）
```

## 5. md 落地（E-cross-screen-snapshot）

```markdown
## 跨屏一致性核对（执行层面）

### 维度 1：同种组件实际渲染
[截图对照表 + 一致性核对]

### 维度 2：palette 跨屏一致
[token 在各屏出现统计 + 例外检查]

### 维度 3：视觉密度均衡
[各屏总权重 + 截图主观感受 + 切换断层]

### 维度 4：装饰风格统一
[装饰节点截图对照]

### 维度 5：全局 overlays 跨屏并存
[3+ 个并存场景的截图核对]

### 不一致项 + 路由
- ❌ XXX → 退回 design-planner / 自己修

### ★ 沉淀到 schema 的结论
- 标 project.meta.designSystem.crossScreenVerified = true
- 不一致项已退回对应 SKILL
```

## 6. 红线

- ❌ 不模拟全局 overlays 显示态就标 done → 漏验证
- ❌ 截图对照只看一屏不跨屏 → 失去"跨屏"意义
- ❌ 发现不一致不路由不退回 → 假完成
- ❌ "看起来差不多" → 不算核对，必须 5 维度逐项
