# 07-color-strategy.md — 色彩策略选择方法论

> 本文件教 AI 如何根据 **设计目标（goals）** 和 **主题（theme）** 推导色彩策略，避免"永远是蓝色"的模板化问题。

---

## 一、色彩策略推导流程

### 1.1 输入：从 goals 提取色彩需求

读各 goal 的 `successCriteria`，提取关键词：

| 关键词 | 色彩策略 | 示例 |
|--------|----------|------|
| warm, cozy, campus, healing | **暖调** | 蓝紫 `#A776FF`, 暖橙 `#FF9F43` |
| cold, tech, pro, efficient | **冷调** | 冷蓝 `#5B6CFF`, 青绿 `#00D2D3` |
| minimal, clean, professional | **中性调** | 灰蓝 `#6C7A89`, 米白 `#F8F9FA` |
| vibrant, energetic, young | **高饱和** | 亮紫 `#A776FF`, 亮橙 `#FF6B6B` |
| trust, stability, finance | **深色调** | 深蓝 `#2C3E50`, 深紫 `#6C5CE7` |

### 1.2 检查 theme tokens 是否满足需求

读 `theme/get` 获取当前主题的 tokens：

```typescript
// 示例：theme tokens
{
  colors: {
    primary: "#5B6CFF",    // 冷蓝
    secondary: "#A776FF",  // 蓝紫（偏暖）
    success: "#52C41A",
    warning: "#FAAD14",
    error: "#FF4D4F"
  }
}
```

**判断**：
- ✅ theme tokens 符合 goal 色彩需求 → 直接用 `$token:colors.primary` 等
- ❌ theme tokens 不符合 → **自定义色**（写入 `styles` 直接量）

### 1.3 自定义色的选择规则

#### 规则 1：从 goal mood 推导色相（Hue）

使用 HSL 色彩空间（更符合人类感知）：

| mood | 色相范围 | 示例 |
|------|----------|------|
| warm（暖） | 0-60（红→黄）或 270-360（紫红→红） | 橙 `#FF9F43` (H=25), 紫 `#A776FF` (H=290) |
| cold（冷） | 180-270（青→蓝） | 青 `#00D2D3` (H=180), 蓝 `#5B6CFF` (H=230) |
| neutral（中性） | 0-360 低饱和 | 灰蓝 `#6C7A89` (H=200, S=10%) |

#### 规则 2：控制饱和度（Saturation）和亮度（Lightness）

| 用途 | 饱和度 | 亮度 | 示例 |
|------|--------|------|------|
| 主色（primary） | 70-100% | 50-70% | `#5B6CFF` (S=100%, L=50%) |
| 辅色（secondary） | 50-80% | 60-80% | `#A776FF` (S=60%, L=70%) |
| 背景装饰 | 30-60% | 70-90% | `rgba(167,118,255,0.2)` |
| 文字 | 0% | 0-30% | `#1A1A22` (L=10%) |

#### 规则 3：多 goal 色彩协调（60-30-10 规则）

- **60% 主色**：来自 theme tokens 或 goal-0 主导色
- **30% 辅色**：来自其他 goals 的协调色
- **10% 强调色**：高饱和、高对比度（用于 CTA / 重要提示）

示例（G1 mood + G2 visual-hierarchy）：
```
G1 (mood-conveyance) → 暖调蓝紫 #A776FF (60%)
G2 (visual-hierarchy) → 冷蓝 #5B6CFF (30%)
G3 (accessibility) → 强调色 #52C41A (10%, 仅用于成功状态)
```

### 1.4 输出：色彩策略文档

写入 `analysis-notes/<projectId>/design/color-strategy.md`：

```markdown
# 色彩策略

## 主色（60%）
- 来源：G1 mood-conveyance (warmth + campus)
- 色值：#A776FF (H=290, S=60%, L=70%)
- 用途：背景装饰、图标、辅助文字

## 辅色（30%）
- 来源：theme tokens (minimal + flat)
- 色值：#5B6CFF (H=230, S=100%, L=50%)
- 用途：主按钮、链接、重要标题

## 强调色（10%）
- 来源：G3 accessibility (success state)
- 色值：#52C41A (H=120, S=70%, L=50%)
- 用途：成功提示、完成状态

## 自定义色清单
| 用途 | 色值 | 来源 |
|------|------|------|
| 背景光晕 | rgba(167,118,255,0.2) | G1 mood |
| 卡片边框 | rgba(91,108,255,0.1) | G2 visual-hierarchy |
```

---

## 二、常见错误

### 错误 1：永远用 `$token:colors.primary`

❌ **错误**：
```typescript
// 所有装饰都用 primary（蓝色）
styles: {
  background: "radial-gradient(circle, $token:colors.primary, transparent)"
}
```

✅ **正确**：
```typescript
// 根据 goal 选色
// G1 mood → 暖调 → 自定义色 #A776FF
styles: {
  background: "radial-gradient(circle, rgba(167,118,255,0.2), transparent)"
}
```

### 错误 2：自定义色没有规律（随机选色）

❌ **错误**：
```typescript
// 随机选色，没有逻辑
const color1 = "#FF0000";  // 红
const color2 = "#00FF00";  // 绿
```

✅ **正确**：
```typescript
// 从 goal mood 推导色相
// G1 mood = warm → 色相 0-60 或 270-360
const primaryColor = "#A776FF";  // H=290（暖紫）
const secondaryColor = "#FF9F43"; // H=25（暖橙）
```

### 错误 3：装饰色与主色没有协调（色彩冲突）

❌ **错误**：
```typescript
// 主色蓝色，装饰色红色（冲突）
primary: "#5B6CFF",  // 冷蓝
decoration: "#FF0000"  // 红（冲突）
```

✅ **正确**：
```typescript
// 主色蓝色，装饰色同色相不同饱和度/亮度
primary: "#5B6CFF",  // 冷蓝
decoration: "rgba(91,108,255,0.2)"  // 同色相，低饱和度
```

---

## 三、与 decoration-system.md 的协作

`06-decoration-system.md` 负责**装饰位置/形状**，本文件负责**装饰色彩**。

协作流程：
1. `06-decoration-system.md` → 选定装饰族（soft-glow / corner-accent / illustration）
2. `07-color-strategy.md` → 为选定装饰族选色
3. 执行：用 `material-painter` 绘制装饰素材（按选定色彩）

示例（G1 mood-conveyance）：
```
1. 装饰族：soft-glow（背景氛围类）
2. 色彩策略：G1 mood = warm → 暖调蓝紫 #A776FF
3. 执行：用 material-painter 画 radial-gradient PNG（色值 #A776FF，透明度 20%）
```

---

## 四、检查清单

执行色彩策略前，必须回答：

- [ ] 各 goal 的 `successCriteria` 是否包含色彩关键词（warm/cold/vibrant/...）？
- [ ] theme tokens 是否满足色彩需求？如不满足，自定义色的色相是否从 goal mood 推导？
- [ ] 多 goal 色彩是否协调（60-30-10 规则）？
- [ ] 装饰色的饱和度/亮度是否适合用途（背景装饰 → 低饱和/高亮度）？
- [ ] 是否写入 `color-strategy.md` 供后续审查？

---

> 最后更新：2026-06-06
> 维护者：@pikun
