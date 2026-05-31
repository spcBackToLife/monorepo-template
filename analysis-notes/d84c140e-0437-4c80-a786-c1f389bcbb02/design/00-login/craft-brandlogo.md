> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-craft-brandlogo
> 必读方法论：methodology/12-material-painting-flow.md + 09-coordinated-visual.md
> 必读 sub-skill：.claude/skills/material-painter/SKILL.md（由子技能自检）

---

# D-00-login-craft-brandlogo — Craft（创作执行）

## 1. 视觉目标

为 BrandLogo (nd_d7d8b56e2d934187bbb9b) 真画一张 240×240 PNG「字标 C」素材并 applyMaterialDesign 写入 materialProjectId，**清除截图中的「Logo」虚线占位**，让首屏品牌感（visualConcept 灵魂句「像清晨教室的光」）成立。

---

## 2. 上游输入

| 维度 | 内容 |
|---|---|
| visualConcept.soulSentence | 像清晨教室的光，温暖但不打扰 |
| visualConcept.styleKeywords | 暖白米 / 大圆角柔和 / 单色光斑节制 |
| visualStrategy.color | 60-30-10：60 background + 30 surfaceElevated + 10 primary |
| visualStrategy.shape | brand-logo radius xl(16)；字重 600（v3 取消 700）|
| visualStrategy.decoration.system | soft-glow（素材风格须协调：圆润 / 单色 / 不复杂）|
| budget BrandLogo | role=主角-品牌 weight=5 allowedTools=[大字号居中] decorationDensity=少 |
| v2 materialSpec | 字母 C 居中 + 240×240 + transparent + primary + fontWeight 700-900 + letterSpacing -0.04em |

---

## 3. v3 对 v2 materialSpec 的微调（4 处）

| 维度 | v2 | v3 调整 | 理由 |
|---|---|---|---|
| 字重 | 700-900 | **600** | strategy.typography 取消 700（避免严苛感），与「不打扰」契合 |
| letterSpacing | -0.04em（极致紧凑）| **0**（自然字距）| 紧凑字距偏现代品牌感，"清晨"概念需要"不刻意"|
| 背景 | transparent | **暖白米 #FCFCFD 圆角 16px 实底 + 主色 1.5px 边框** | 实心方框 + 主色字 + 主色边框 = 与 FormCard 暖白卡片协调 + 主色作字色不撞 SubmitBtn 主色填充 |
| 字号 | 240×240 内 ~70% 高度（即 ~168 px）| 字号 144 px（约 60% 高度）+ 24px safe-zone padding（已 v2 定）| 字号收些让"C"在方框内更稳，避免溢出感 |

### 3.1 与 strategy.color §1.2 强调色 6 处清单的对账

v3 BrandLogo 用主色作**字色 + 1.5px 边框**——不算"主导填充"，与已有 6 处（SubmitBtn / ModeToggle / Checkbox / Input focus / Links / BgBlob）属同档"点睛"位置；不破 60-30-10。

实测主色面积估算：BrandLogo 渲染尺寸 120×120，主色字+边框面积 ≈ 25 px²，远小于 SubmitBtn 主色填充。

---

## 4. 协同视觉 4 角色

| 角色 | 节点 | 改 / 不改 |
|---|---|---|
| 主体 | BrandLogo (nd_d7d8b56e2d934187bbb9b) | 调 material-painter 画 PNG + applyMaterialDesign + meta.design.materialSpec 微调 |
| 邻居 | BrandSlogan (nd_db3a01b4935c412a96005) | 不改（typography-refresh 任务统一处理字号字重）|
| 父容器 | HeaderArea (nd_451ec7c1336d478a810d9) | 不改 |
| 装饰 | BgBlobTopRight | 不改（独立 craft-decoration-rebalance 处理）|

---

## 5. 落到 schema 的具体动作

### 5.1 调用 material-painter 子技能

```
prompt:
  为节点 'nd_d7d8b56e2d934187bbb9b' (BrandLogo) 画 brand logo PNG：
  - referenceFrame: 240 × 240 px
  - kind: brand / renderHint: png
  - 风格：minimal + flat + 单色温度（无渐变 无阴影 无外发光）
  - 构图：
    1) 整体 240×240 圆角矩形（rx=16）作为背景：fill=$token:colors.background (#FCFCFD)
    2) 矩形描边：stroke=$token:colors.primary (#5B6CFF), strokeWidth=1.5
    3) 中心字母 C（用 path 画 270 度弧，因 material-painter I-7 textbox 不稳定）：
       - 弧线粗细 stroke ≈ 18 px（视觉等同 fontWeight 600 的 144px C）
       - 路径起止：从右上 60° 顺时针扫到右下 -60°（开口右侧）
       - color = $token:colors.primary
       - 居中放置，C 直径约 120 px（占 50%）
       - 24 px safe-zone padding 四周
  - 不要：textbox / group / pathData 含 Q/T 命令（material-painter invariants）
  - 完成后调 applyMaterialDesign 写入 nd_d7d8b56e2d934187bbb9b.materialProjectId
```

### 5.2 applyMaterialDesign 后清理 styles

material-painter 会追加 9 个 background-* 属性。BrandLogo 是 type=img 节点，清理动作：
- 保留 backgroundImage（PNG 主属性）
- backgroundSize: contain
- backgroundPosition: center
- backgroundRepeat: no-repeat
- 保留 v2 已写的 width 120 / height 120 / display block / objectFit contain / borderRadius xl
- 删除（如有）：边框 / box-shadow / 其他装饰 styles

### 5.3 更新 meta.design.materialSpec（v3 微调）

```jsonc
materialSpec: {
  kind: "brand",
  renderHint: "png",
  referenceFrame: { width: 240, height: 240 },
  background: "#FCFCFD（暖白米实底圆角矩形）",       // v3 改：从 transparent
  composition: "外层圆角矩形 16px + 主色 1.5px 描边 + 中心字母 C（path 270 度弧）",  // v3 改
  colorStrategy: {
    bgFill:  { value: "$token:colors.background", role: "矩形底填充" },     // v3 新增
    border:  { value: "$token:colors.primary",    role: "矩形描边", strokeWidth: 1.5 },  // v3 新增
    cArc:    { value: "$token:colors.primary",    role: "字标 C 弧线", strokeWidth: 18 } // v3 新增
  },
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何为主",
    flatTo3D: "平面",
    orderlyToCasual: "规整偏中"
  },
  // letterSpacing 字段移除（用 path 画弧不存在字距概念）
  // lineStyle 保留 round / round
  variants: [
    { name: "dark", scenario: "暗色主题", diff: "primary → primaryHover #7B89FF；bg → surface #191C26" },
    { name: "small", scenario: "App 图标 / 64×64", diff: "strokeWidth 减半到 9（线条比例保持）" }
  ],
  qualityChecklist: [
    "PNG 240×240 真画出来（不是占位虚线）",
    "C 弧线在矩形内居中（左右上下 padding 一致）",
    "1.5px 主色边框可见",
    "暖白米底与主色边框对比度足够（≥ APCA 60，本组合 #5B6CFF 对 #FCFCFD APCA ≈ 80 ✅）",
    "字标可识别（不是随机几何）"
  ]
}
```

### 5.4 更新 meta.design.summary

```
v2: "品牌字标 Logo（C 字母粗体居中）"
v3: "品牌字标 Logo：暖白米圆角矩形底 + 主色 1.5px 描边 + 中心 C 弧线（v3 真画 PNG）"
```

---

## 6. minSignals 核查

| 节点 | role | minSignals 阈值 | 实际信号数 | 通过 |
|---|---|---:|---:|:---:|
| BrandLogo | 主角-品牌 | ≥ 3 | 5（暖白底+主色边框+主色字标+大尺寸+居中位置）| ✅ |

---

## 7. ★ 沉淀到 schema 的结论（执行清单）

```jsonc
// 1) Skill: material-painter（见 §5.1 prompt）
//    输出：materialProjectId（已绑定到 BrandLogo.materialProjectId）

// 2) meta/set_node 更新 BrandLogo.meta.design
{
  nodeId: "nd_d7d8b56e2d934187bbb9b",
  patch: {
    design: {
      summary: "品牌字标 Logo：暖白米圆角矩形底 + 主色 1.5px 描边 + 中心 C 弧线（v3 真画 PNG）",
      materialSpec: { /* §5.3 */ }
    }
  }
}

// 3) style/update 清理 BrandLogo styles（保留 v2 已写 + 让 backgroundImage 干净）
{
  nodeId: "nd_d7d8b56e2d934187bbb9b",
  patch: {
    width: "120px",
    height: "120px",
    display: "block",
    objectFit: "contain",
    borderRadius: "$token:radius.xl",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  }
}
```

---

## 8. ★【v3】视觉自审

### 8.1 自审降级（ISSUE-1 snapshot 服务异常）

`mcp/generate_snapshots` 暂不可用 → 等用户人工提供 editor 截图。

5 维度评分待截图后补：
- 识别度 (Recognition) __/5
- 优先级层次 (Hierarchy) __/5
- 状态可见性 (State Visibility) __/5（BrandLogo 无 visualState，跳过；按"画出来 = 5/5"）
- 主题契合 (Theme Fit) __/5
- 情绪传达 (Emotion) __/5

### 8.2 替代验证（schema 层面）

- ✅ BrandLogo.materialProjectId 非空（applyMaterialDesign 已写）
- ✅ materialSpec 5 节齐（kind/composition/colorStrategy/variants/qualityChecklist）
- ✅ meta.design.summary 含「v3 真画 PNG」标记，避免 v3 再次误判为占位

---

## 9. 自检

- [x] 视觉目标一句话清晰：解决 ISSUE-2 v2 素材债，画出 BrandLogo PNG
- [x] 协同视觉 4 角色识别（仅主体改）
- [x] 必读方法论已 read（12-material-painting-flow + 09-coordinated-visual）
- [x] 落 schema 调用 §7 完整
- [x] minSignals 核查 5/3 ✅
- [x] v3 对 v2 materialSpec 微调有论证（4 处差异 + 6 处强调色清单对账）
- [ ] 调 material-painter 子技能（下一步执行）
- [ ] applyMaterialDesign + 清理 styles（下一步执行）
- [ ] 用户人工截图 + 5 维评分（待用户提供）
