# 装饰系统：geometric-line（几何线条系）

> 适用 visualConcept：冷白 / 直角 / 理性 / 科技 / 数据 / 工具 / 后台
>
> 形状基调匹配：直角理性 / 几何切割

---

## 1. 视觉特征

- **形状**：直线 / 三角形 / 矩形 / 多边形（六边 / 八边）/ 网格
- **填充**：线条（不填充）/ 单色描边
- **色调**：单色或双色（主色 + 灰）
- **位置**：网格底纹 / 线条分割 / 角落几何形 / 等距点阵

---

## 2. CSS 配方

```jsonc
// 角落几何线条（直线 + 折线）
{
  type: "div",
  name: "DecorationLineTopRight",
  styles: {
    position: "absolute",
    top: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    border: "1.5px solid $token:colors.borderLight",
    borderRight: "none",                              // 只显示三边
    borderBottom: "none",
    borderTopLeftRadius: "0",
    pointerEvents: "none",
    zIndex: "0"
  },
  meta: { design: { kind: "decoration" } }
}

// 网格底纹（CSS background）
{
  type: "div",
  name: "PageGridBg",
  styles: {
    position: "absolute",
    inset: "0",
    backgroundImage: "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
    "--grid-line": "$token:colors.borderLight",       // CSS variable 注入
    backgroundSize: "40px 40px",
    opacity: "0.3",
    pointerEvents: "none",
    zIndex: "0"
  }
}
```

---

## 3. 几何形

| 形状 | 用途 | 实现 |
|---|---|---|
| 直线 / 折线 | 角落装饰 / 分割 | `border` + 选择性边 |
| 三角形 | 锐利 / 方向 | `clip-path: polygon(...)` 或 SVG |
| 多边形（六边形）| 蜂窝 / 协作感 | SVG path |
| 网格 | 底纹 / 数据感 | `linear-gradient` 双向 |
| 等距点阵 | 律动感 | `radial-gradient` repeat |

---

## 4. 适用 / 不适用

| 场景 | 适用 | 不适用 |
|---|:---:|:---:|
| 数据看板 | ✅ | — |
| 后台管理 | ✅ | — |
| 科技产品落地页 | ✅ | — |
| 登录（trust）| ⚠️（需配冷白主题）| — |
| 童趣 / 教育 | — | ❌（应用 illustration）|
| 温暖治愈 | — | ❌（应用 soft-glow）|

---

## 5. 红线

- ❌ 线条颜色用纯 primary（太抢眼，应用 borderLight 或 textTertiary）
- ❌ 网格 opacity > 0.5（干扰内容阅读）
- ❌ 几何形太多 / 太密（视觉杂乱）
- ❌ 同屏混用 geometric-line 与 illustration / soft-glow
