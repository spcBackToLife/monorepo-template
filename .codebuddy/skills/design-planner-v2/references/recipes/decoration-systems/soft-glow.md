# 装饰系统：soft-glow（光斑系）

> 适用 visualConcept：暖白 / 极简 / 温度 / 治愈 / 信任 / 柔和 / 高端简约
>
> 形状基调匹配：圆角柔和

---

## 1. 视觉特征

- **形状**：圆形 / 椭圆 / 不规则圆润 blob
- **填充**：径向渐变（中心实色 → 边缘透明）
- **色调**：单色或近似色（不混杂多色）
- **透明度**：opacity 0.2-0.6（信任场景更低）
- **位置**：边缘溢出（top/bottom/left/right 负值）/ 卡片背后 / 主角斜后方

---

## 2. CSS 配方（拆字段写法，避开字符串内嵌 token）

```jsonc
// 基础光斑（单色径向）
{
  type: "div",
  name: "BgBlobTopRight",
  styles: {
    position: "absolute",
    top: "-40px",
    right: "-60px",
    width: "200px",
    height: "200px",
    backgroundColor: "$token:colors.primaryLight",   // ★ 单 token，不字符串嵌
    backgroundImage: "radial-gradient(circle, currentColor 0%, transparent 70%)",
    color: "$token:colors.primaryLight",             // currentColor 注入
    opacity: "0.4",                                  // 信任场景调到 0.3-0.4
    borderRadius: "9999px",
    pointerEvents: "none",
    zIndex: "0"
  },
  meta: { design: { kind: "decoration" } }
}
```

---

## 3. 多光斑组合

```
✅ 推荐：1-2 个光斑（节制）
  - 右上角溢出 + 左下角溢出（对角呼应）
  - 右上角 + FormCard 背后
  
❌ 禁止：3+ 光斑（变成"眼花"）

光斑大小：≥ 150px（< 100px 看不见）
光斑透明度：第 2 个光斑应 ≤ 第 1 个的 0.7（避免抢戏）
```

---

## 4. 光斑色规则

| visualConcept 主色调 | 光斑色 token |
|---|---|
| 暖白 + 蓝紫强调 | primaryLight（蓝紫淡） |
| 冷白 + 蓝强调 | primaryLight |
| 温暖 + 珊瑚强调 | primaryLight + secondary（双光斑近色）|
| 多色 / 活泼 | accent + secondary（双光斑对比近色族）|

**禁止**：光斑用纯 primary（太重）；光斑用 error / warning 等语义色（误导）。

---

## 5. 与其他装饰的隔离

soft-glow 装饰系统选定后：
- ✅ 仅用圆形 / 圆润 blob 装饰
- ❌ 不能加直线 / 网格 / 几何形状（混系统）
- ❌ 不能加插画 / 纹理 / 有机曲线
- 装饰节点 weight 总和 ≤ 4

---

## 6. 适用 / 不适用

| 场景 | 适用 | 不适用 |
|---|:---:|:---:|
| 登录 / 注册 | ✅（信任场景，opacity 调低）| — |
| 支付 | ⚠️（仅极淡 opacity 0.2）| — |
| Hero 引导页 | ✅ | — |
| 详情页 | ✅ | — |
| 数据看板 | — | ❌（应用 geometric-line）|
| Feed 列表 | ⚠️（信息密集时不用）| — |

---

## 7. 红线

- ❌ 光斑用字符串内嵌 token（`background: "...$token..."`）→ 渲染失败
- ❌ 光斑硬编码 #xxx → 必须 token 引用
- ❌ 光斑 ≥ 3 个（视觉爆炸）
- ❌ 光斑 opacity > 0.7（喧宾夺主）
- ❌ 同屏混用 soft-glow 与其他装饰系统
