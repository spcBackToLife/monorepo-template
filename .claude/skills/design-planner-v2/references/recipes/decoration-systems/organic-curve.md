# 装饰系统：organic-curve（有机曲线系）

> 适用 visualConcept：流动 / 自由 / 自然 / 创意 / 艺术 / 生活方式
>
> 形状基调匹配：有机曲线 / 大圆角

---

## 1. 视觉特征

- **形态**：自由曲线 / 流体形状 / Blob / 不规则圆润
- **填充**：单色或渐变（避免硬边）
- **色调**：暖色 / 自然色 / 渐变
- **位置**：背景大 blob / 卡片背后 / 流动分割

---

## 2. CSS 实现 / SVG 实现

```jsonc
// 大型 blob 背景（SVG，调 material-painter 画）
// 设计阶段调子技能：
{
  type: "div",
  name: "OrganicBlobBg",
  meta: { design: { kind: "decoration" } },
  // styles 由 material-painter 应用 → backgroundImage: url('blob.svg')
}

// 简单实现：CSS clip-path（手写曲线点）
{
  styles: {
    width: "300px",
    height: "300px",
    backgroundColor: "$token:colors.primaryLight",
    clipPath: "path('M150,50 Q250,100 230,200 T100,250 Q50,150 150,50 Z')",   // 手绘曲线
    opacity: "0.3"
  }
}
```

---

## 3. blob 形状特征

```
✅ 推荐：
  - 大尺寸（≥ 200×200）
  - 不规则但圆润（无锐角）
  - 单色填充 + 透明度
  - 1-2 个（多了视觉混乱）

❌ 禁止：
  - 锐角 / 直边
  - 多色拼接 blob（变成插画）
```

---

## 4. 适用 / 不适用

| 场景 | 适用 | 不适用 |
|---|:---:|:---:|
| 创意 / 艺术 app | ✅ | — |
| 生活方式 / 美食 | ✅ | — |
| 自然 / 户外 | ✅（结合 texture）| — |
| 引导 / 营销页 | ✅ | — |
| trust 场景 | ⚠️（仅极淡）| — |
| 数据 / 工具 | — | ❌ |
| 极简纯粹 | — | ❌（应用 soft-glow 圆形）|

---

## 5. 红线

- ❌ blob 形状有锐角 / 硬边 → 不"有机"
- ❌ blob ≥ 3 个 → 视觉混乱
- ❌ blob 多色 → 变成插画范畴
- ❌ blob opacity > 0.6 → 喧宾夺主
- ❌ 同屏混用 organic-curve 与 geometric-line
