# 方法论 6（v3）：装饰系统单一族 (Decoration Strategy)

> 适用任务：`D-X-strategy`、`D-X-decorations`、`D-X-craft-*`（涉及装饰）
>
> **核心**：v3 ★ 整屏装饰必须**单一系统**——5 大族中选 1 个。**禁止混杂**（如同屏既有 soft-glow 又有 illustration）。
>
> 与原 04-decoration-categories.md（保留）的关系：04 给"装饰元素 7 大类"分类目录；本方法论给"如何选 1 个系统并执行"。

---

## 1. 5 大装饰系统

| 系统 | 视觉特征 | 适合 visualConcept | 配方 |
|---|---|---|---|
| **soft-glow（光斑系）** | 圆形 / 径向渐变 / 模糊光晕 / 单色或近似色 | 暖白 / 极简 / 温度 / 治愈 | `recipes/decoration-systems/soft-glow.md` |
| **geometric-line（几何线条系）** | 直线 / 几何形 / 网格 / 等距重复 | 冷白 / 直角 / 理性 / 科技 | `recipes/decoration-systems/geometric-line.md` |
| **illustration（插画系）** | 拟物 / 扁平插画 / 多色 / 丰富细节 | 活泼 / 教育 / 儿童 / 故事 | `recipes/decoration-systems/illustration.md` |
| **texture（纹理系）** | 噪点 / 纸纹 / 颗粒 / 渐变深浅 | 自然 / 复古 / 文艺 / 印刷 | `recipes/decoration-systems/texture.md` |
| **organic-curve（有机曲线系）** | 自由曲线 / 流体形状 / Blob / 不规则 | 创意 / 艺术 / 自然 / 流动 | `recipes/decoration-systems/organic-curve.md` |

---

## 2. 装饰密度（与 theme.decorationRules + visualConcept 联动）

| 密度 | 装饰节点数 | 总 weight | 适合 |
|---|:---:|:---:|---|
| 极少 | 0-1 | ≤ 2 | trust 场景（登录 / 支付 / 实名）|
| 节制 | 1-2 | ≤ 4 | 表单 / 设置 / 列表 |
| 中等 | 2-3 | ≤ 6 | 首页 / 详情 / Feed |
| 丰富 | 3-5 | ≤ 8 | 营销 / 引导 / 故事页 |

---

## 3. 装饰节点 4 类（来自 schema-spec/decoration-nodes.md）

| 类 | 用途 | 例 |
|---|---|---|
| 背景氛围 | 整屏底色 / 大渐变 / 大纹理 | PageBgGradient |
| 角落溢出 | 屏幕边缘溢出的装饰 | BgBlobTopRight / CornerLeaf |
| 分割装饰 | 区块间的视觉间隔 | DividerLine / WaveSeparator |
| 品牌点缀 | 品牌符号 / 小图标 | BrandLeafBadge / DotPattern |

---

## 4. ❌ 禁止混杂

```
❌ 同屏既有 soft-glow（光斑）又有 illustration（插画）
❌ 同屏既有 geometric-line（几何）又有 organic-curve（有机）
❌ 装饰节点 A 用 soft-glow 风格，装饰节点 B 用 texture 风格

✅ 同屏所有装饰节点都用 soft-glow（如 BgBlobTopRight + 极淡渐变线 + 圆形 dot）
```

`D-decoration-system-audit` 项目级 audit 任务会扫所有装饰节点的视觉风格 → 不一致 → R-DECO-SYS-01。

---

## 5. 装饰系统的"选 1"决策

```
Step 1. read visualConcept.styleKeywords
Step 2. 按 §1 表对应到装饰系统候选 ≥ 2 个
Step 3. read recipes/decoration-systems/<候选>.md 看每个候选的具体落地方式
Step 4. 在 strategy.md 写选定 + 否决理由
Step 5. 在 schema 落 visualStrategy.decoration.system + rejectedSystems
```

---

## 6. 装饰节点的 renderHint（与素材绘制工作流联动）

每个装饰节点的 materialSpec 必须含 `renderHint`：

| renderHint | 实现方式 |
|---|---|
| `css-gradient` | 纯 CSS（如径向渐变光斑）→ design 阶段直接 styles 写完，无需调 material-painter |
| `svg` | SVG 矢量（线条 / 几何）→ design 调 material-painter 画 + applyMaterialDesign |
| `png` | PNG 位图（复杂插画 / 纹理）→ design 调 material-painter 画 + applyMaterialDesign |

---

## 7. 自检（D-X-strategy / D-X-decorations 用）

- [ ] 装饰系统单选 1 个
- [ ] 否决其他 4 系统给出理由
- [ ] 装饰密度 ∈ [极少, 节制, 中等, 丰富]，与 theme.decorationRules 一致
- [ ] 装饰节点数 ≤ 密度上限
- [ ] 所有装饰节点视觉风格统一（无混杂）
- [ ] 每个装饰节点有 renderHint（css-gradient / svg / png）
- [ ] css-gradient 装饰节点 styles 不用字符串内嵌 token（拆字段 + currentColor）

---

## 8. md 落地（在 D-X-strategy / D-X-decorations 任务中）

```markdown
## 装饰系统决策

### 系统选定
soft-glow（光斑系）

### 否决理由
- geometric-line：太理性，与「温度」概念冲突
- illustration：太重，登录页不需要插画
- texture：太复杂，与「极简」冲突
- organic-curve：太自由，与「极简 + 工具入口」冲突

### 装饰节点清单
| 节点 | 4 类 | renderHint | weight |
|---|---|---|:---:|
| BgBlobTopRight | 角落溢出 | css-gradient（纯 CSS）| 2 |
| FormCardTopGradient（可选）| 分割装饰 | css-gradient | 1 |

### ★ 沉淀到 schema
visualStrategy.decoration.system = "soft-glow"
visualStrategy.decoration.density = "节制"
visualStrategy.decoration.rejectedSystems = ["geometric-line", "illustration", "texture", "organic-curve"]
```

---

## 9. 红线

- ❌ 同屏装饰系统混杂 → R-DECO-SYS-01
- ❌ 装饰节点风格与系统不符（如选了 soft-glow 但加了直线装饰）
- ❌ 装饰节点 renderHint=css-gradient 但用字符串内嵌 token → 渲染失败
- ❌ 装饰节点不挂 `meta.design.kind = 'decoration'` → service 端拒
- ❌ 装饰密度超 theme.decorationRules 上限 → 视觉爆炸
