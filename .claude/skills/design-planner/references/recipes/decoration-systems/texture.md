# 装饰系统：texture（纹理系）

> 适用 visualConcept：自然 / 复古 / 文艺 / 印刷 / 高端朴素
>
> 形状基调匹配：任意（纹理铺底）

---

## 1. 视觉特征

- **形态**：噪点 / 纸纹 / 颗粒 / 渐变深浅 / 木纹 / 织物纹
- **强度**：极弱（opacity 0.05-0.15）
- **范围**：整屏底纹 / 卡片纹理 / 角落区域

---

## 2. CSS 实现（轻量）

```jsonc
// 噪点底纹（CSS）
{
  type: "div",
  name: "NoiseOverlay",
  styles: {
    position: "absolute",
    inset: "0",
    backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"n\"><feTurbulence baseFrequency=\"0.9\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.5\"/></svg>')",
    opacity: "0.08",
    pointerEvents: "none",
    mixBlendMode: "multiply",
    zIndex: "0"
  },
  meta: { design: { kind: "decoration" } }
}
```

或调 material-painter 画 SVG noise 纹理 → 应用到节点。

---

## 3. 纹理强度规则

```
opacity 0.05-0.10：底纹（不影响阅读）
opacity 0.10-0.15：可感知（情绪强化）
opacity > 0.20：干扰内容 → ❌
```

---

## 4. 适用 / 不适用

| 场景 | 适用 | 不适用 |
|---|:---:|:---:|
| 文艺 / 阅读 app | ✅ | — |
| 高端 premium | ✅（极弱）| — |
| 复古 / 怀旧 | ✅ | — |
| 自然 / 户外 | ✅（木纹 / 织物）| — |
| 数据 / 工具 | — | ❌（干扰）|
| 极简 / 信任 | — | ❌（破坏纯粹）|
| 童趣 | — | ❌（应用 illustration）|

---

## 5. 红线

- ❌ 纹理 opacity > 0.2 → 干扰内容
- ❌ 纹理覆盖整屏 + 卡片同时（双重纹理）
- ❌ 纹理用强对比色（应配 textTertiary 或 borderLight）
- ❌ 同屏混用 texture 与其他装饰系统
