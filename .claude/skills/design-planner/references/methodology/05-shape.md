# 方法论 5：形状语言 (Shape Strategy)（v3 新增）

> 适用任务：`D-X-strategy`、`D-X-craft-*`
>
> **核心**：全屏形状基调统一（圆角柔和 / 直角理性 / 有机曲线 / 几何切割任选 1）。**禁止混杂**。

---

## 1. 4 种形状基调

| 基调 | 关键词 | 圆角策略 | 适合 visualConcept |
|---|---|---|---|
| **圆角柔和** | 圆 / 软 / 温暖 | 卡 12-16 / 按钮 8-12 / input 6-8 | 暖白 / 极简 / 温暖治愈 |
| **直角理性** | 直 / 稳 / 专业 | 卡 0-4 / 按钮 0-2 / input 0-2 | 冷白 / 专业 / 数据工具 |
| **有机曲线** | 流 / 动 / 自由 | 卡 16-24 / 按钮 全圆角 / 自由曲线装饰 | 自然 / 创意 / 艺术 |
| **几何切割** | 锐 / 切 / 现代 | 卡 4-8 + 切角 / 多边形装饰 | 科技 / 潮流 / 体育 |

---

## 2. 圆角梯度（来自 theme.tokens.radius）

| token | px | 用途 |
|---|---|---|
| `radius.sm` | 4 | 小标签 / icon-button / chip |
| `radius.md` | 8 | input / 小按钮 |
| `radius.lg` | 12 | 主按钮 / 中型卡 |
| `radius.xl` | 16 | 大卡片 / FormCard / Hero |
| `radius.2xl` | 24 | 超大卡片 / Modal |
| `radius.full` | 9999 | 圆形 / Pill 标签 / Switch thumb |

---

## 3. 形状一致性约束

```
✅ 全屏统一一种基调：
  - 卡 16 / 按钮 8 / input 8 / 小标签 4 → 一致圆角递减族 ✅

❌ 混杂基调：
  - 卡 16（圆角柔和）+ 按钮 0（直角）+ Modal 4（直角）→ 形状混乱 ❌
  - 主 CTA 圆角 + secondary 直角 → 视觉割裂 ❌
```

---

## 4. 与装饰系统的形状一致

```
形状基调圆角柔和 → 装饰系统 soft-glow（光斑系，自带圆形）
形状基调直角理性 → 装饰系统 geometric-line（几何线条，直线为主）
形状基调有机曲线 → 装饰系统 organic-curve（有机曲线）
形状基调几何切割 → 装饰系统 geometric-line（几何形状切割）
```

详见 `recipes/decoration-systems/<system>.md`。

---

## 5. 与 visualConcept 联动

| visualConcept.styleKeywords[1] | 推荐形状基调 |
|---|---|
| 极简 / 柔和 / 温暖 | 圆角柔和 |
| 直角 / 理性 / 网格 | 直角理性 |
| 有机 / 自由 / 流动 | 有机曲线 |
| 锐角 / 切割 / 几何 | 几何切割 |

---

## 6. 自检（D-X-strategy 用）

- [ ] 形状基调单选 1 个
- [ ] 圆角梯度 token 化（不硬编码 px）
- [ ] 全屏圆角梯度递减一致（卡 > 按钮 > input > 小标签）
- [ ] 与装饰系统的形状一致
- [ ] 与 visualConcept 风格关键词契合

---

## 7. 红线

- ❌ 形状基调混杂（同屏圆角柔和 + 直角理性）→ 视觉混乱
- ❌ 主 CTA 与 secondary 圆角不一致（除非 secondary 是 ghost text 不需要 border）
- ❌ 圆角硬编码（如 `borderRadius: '8px'`）→ 必须 token 引用
- ❌ 形状基调与 visualConcept 冲突（如 visualConcept "极简温暖" 选直角理性）
