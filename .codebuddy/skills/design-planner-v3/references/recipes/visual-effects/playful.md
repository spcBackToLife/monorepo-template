# 视觉效果配方：活泼感 (Playful)

> 适用：年轻 / 教育 / 社交 / 娱乐场景，整屏视觉策略
>
> **核心**：多色对比 + 大圆角 + 装饰丰富 + spring 动效。整屏视觉策略级配方，与 trust 互斥。

---

## 1. 视觉目标

让用户立即感受到"轻松、年轻、有趣"——通过整屏 5 维（色 / 字 / 形 / 饰 / 律）齐发力。

不是 visualState 范畴的"切换效果"，而是**整屏视觉策略**。与 `recipes/theme-element-dict/playful.md` 配套。

---

## 2. 视觉准则（5 条）

### 2.1 多色对比
- primary + secondary + accent ≥ 3 色
- 60-30-10 放宽到 50-30-20（accent 占比更高）
- 装饰用多色组合

### 2.2 大圆角
- card ≥ 20px / button ≥ 16px / input ≥ 12px
- 头像 / 按钮 pill 形（borderRadius: full）

### 2.3 装饰丰富
- 装饰系统：illustration（首选）/ soft-glow 多色光斑
- 密度：中等到丰富（2-4 处）
- 偶尔粒子 / 装饰 emoji

### 2.4 字号张大 + 字重对比
- display 32-40px / h2 24-28
- 字重 400 vs 700 强对比
- 字距 0.02em 微张

### 2.5 spring 动效
- hover：transform translateY + scale(1.02)
- pressed：scale(0.98)
- 状态切换：cubic-bezier(0.34, 1.56, 0.64, 1) spring easing

---

## 3. CSS 配方示例

```jsonc
// CTA button（活泼版）
{
  backgroundImage: "linear-gradient(135deg, $token:colors.primary 0%, $token:colors.secondary 100%)",
  // ↑ 活泼场景允许渐变（trust 不允许）
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.xl",                    // 16-20
  height: "52px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "700",
  letterSpacing: "0.03em",
  boxShadow: "$token:shadows.md",
  transition: "all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"  // spring
}
// hover: transform translateY(-2px) scale(1.02) + boxShadow lg
// pressed: transform translateY(0) scale(0.98) + boxShadow sm
// focus: 4px 彩色光晕（primaryLight 4px）

// 装饰：多色光斑
[
  { kind: 'decoration', color: primaryLight, position: '右上' },
  { kind: 'decoration', color: secondaryLight, position: '左下' },
  { kind: 'decoration', color: accentLight, position: 'hero 背后' }
]
```

---

## 4. 与 trust 的对比

| 维度 | trust | playful |
|---|---|---|
| 色 | 单色蓝紫 | 多色（≥3）|
| CTA 填充 | 纯色 | 可渐变 |
| 圆角 | 中等（12）| 大（≥16）|
| 装饰 | 极少（≤1）| 丰富（≥2）|
| 动效 | ease-out 平稳 | spring 弹动 |
| 字距 | 0.02em | 0.03em |
| 字重 | 600 | 700 |

---

## 5. 适用 / 不适用

| 场景 | 适用 |
|---|:---:|
| 教育 / 儿童 app | ✅ |
| 社交 / 短视频 | ✅ |
| 游戏 / 娱乐 | ✅ |
| 营销活动页 | ✅ |
| 登录 / 支付 / 实名 | ❌ |
| 后台管理 / 数据 | ❌ |

---

## 6. 红线

- ❌ playful 用在 trust 场景（登录 / 支付）→ 信任度降低
- ❌ 单色（与活泼矛盾）
- ❌ 直角（与圆润矛盾）
- ❌ 0 装饰（活泼不能空）
- ❌ ease-in-out 动效（缺 spring 弹力）
