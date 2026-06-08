# 视觉策略（Phase D 输出）

> 屏幕：00-login（sc_27ee2293945046b69cc00）
> 设计目标：G1 mood-conveyance + G2 cta-clarity + G3 trust-signal + G4 brand-recognition + G5 state-feedback

---

## 1. visualStrategy（写入 meta.design.visualStrategy）

```jsonc
{
  "decorationSystem": "soft-glow(primary 15% + secondary 10%, 对角配重, 无混杂)",
  "colorStrategy": "60% 暖白底 + 30% 灰阶文字 + 10% 蓝紫点缀",
  "weightStrategy": "BrandLogo(3%) → FormCard(60%) → SubmitBtn(25%) 三跳视觉动线",
  "materialStrategy": "BrandLogo 真画（soft-glow 圆形光斑 + 校园元素）+ SubmitSpinner 真画（柔和 spinner）",
  "stateStrategy": "5 态视觉差异 ≥ 3%（default/hover/pressed/loading/disabled），transition ≥ 200ms"
}
```

---

## 2. weightPyramid（写入 meta.design.weightPyramid）

```jsonc
[
  { "nodeId": "nd_bf53a2e2e0547b19d2f", "role": "brand", "weight": 0.03 },
  { "nodeId": "nd_7a0f9b8e4e943b8b9a1", "role": "form-card", "weight": 0.60 },
  { "nodeId": "nd_d7d8b56e2d934187bb9b", "role": "primary-cta", "weight": 0.25 },
  { "nodeId": "nd_8b4253353f804cc89e56", "role": "secondary-cta", "weight": 0.07 },
  { "nodeId": "nd_9c6e4a7f1d2b5e8c0a3", "role": "trust-signal", "weight": 0.05 }
]
```

---

## 3. 跨目标统筹结论

### 3.1 共享装饰系统（soft-glow）

| 共享目标 | 共享元素 | 装饰系统策略 |
|---|---|---|
| G1 mood-conveyance + G4 brand-recognition | BrandLogo + DecoGlow1/DecoGlow2 | soft-glow（圆形光斑，径向渐变，温暖治愈） |
| G1 mood-conveyance + G5 state-feedback | LockedView + DecoGlow1/DecoGlow2 | soft-glow（柔和线条，非冷峻） |

### 3.2 共享主色（#5B6CFF）

| 共享目标 | 共享元素 | 主色使用策略 |
|---|---|---|
| G2 cta-clarity + G3 trust-signal | SubmitBtn + PolicyCheckVisual | SubmitBtn 主色填充（主角），PolicyCheckVisual 主色对勾（点缀） |
| G4 brand-recognition + G5 state-feedback | BrandLogo + LockedIcon | BrandLogo 主色描边/强调点，LockedIcon 主色线条（柔和） |

### 3.3 执行顺序（避免重复调用 MCP）

1. **第一批**：装饰光斑（G1）+ BrandLogo 素材（G4）→ 共享 soft-glow 策略，一次读完 `decoration-systems/soft-glow.md`
2. **第二批**：SubmitBtn + GetCodeBtn 样式（G2）→ 共享主色 #5B6CFF，一次写完样式
3. **第三批**：PolicyCheckVisual + Error 样式（G3）→ 共享主色对勾 + error 色，一次写完
4. **第四批**：LoginModeTab + LockedView + Countdown（G5）→ 共享状态切换逻辑，一次写完

---

## 4. ★ 沉淀到 schema 的结论

### 4.1 写入 `meta.design.visualStrategy`

调用 `meta/set_screen`，patch:

```jsonc
{
  "design": {
    "visualStrategy": {
      "decorationSystem": "soft-glow(primary 15% + secondary 10%, 对角配重, 无混杂)",
      "colorStrategy": "60% 暖白底 + 30% 灰阶文字 + 10% 蓝紫点缀",
      "weightStrategy": "BrandLogo(3%) → FormCard(60%) → SubmitBtn(25%) 三跳视觉动线",
      "materialStrategy": "BrandLogo 真画（soft-glow 圆形光斑 + 校园元素）+ SubmitSpinner 真画（柔和 spinner）",
      "stateStrategy": "5 态视觉差异 ≥ 3%（default/hover/pressed/loading/disabled），transition ≥ 200ms"
    }
  }
}
```

### 4.2 写入 `meta.design.weightPyramid`

调用 `meta/set_screen`，patch:

```jsonc
{
  "design": {
    "weightPyramid": [
      { "nodeId": "nd_bf53a2e2e0547b19d2f", "role": "brand", "weight": 0.03 },
      { "nodeId": "nd_7a0f9b8e4e943b8b9a1", "role": "form-card", "weight": 0.60 },
      { "nodeId": "nd_d7d8b56e2d934187bb9b", "role": "primary-cta", "weight": 0.25 },
      { "nodeId": "nd_8b4253353f804cc89e56", "role": "secondary-cta", "weight": 0.07 },
      { "nodeId": "nd_9c6e4a7f1d2b5e8c0a3", "role": "trust-signal", "weight": 0.05 }
    ]
  }
}
```

### 4.3 下一步（Phase E）

调用 `meta/add_plan_tasks`，派发 4 批 craft 任务：

1. **Craft-1**（G1+G4）：画装饰光斑 + BrandLogo 素材（调 material-painter，先读 `decoration-systems/soft-glow.md`）
2. **Craft-2**（G2）：改 SubmitBtn + GetCodeBtn 样式（调 style/update）
3. **Craft-3**（G3）：加 PolicyCheckVisual + Error 样式（调 element/add + style/update）
4. **Craft-4**（G5）：加 LoginModeTab + LockedView + Countdown（调 element/add + state/view_add）

---

## 5. 禁止写入 schema 的内容（红线）

- ❌ **不写** `design.designGoals`（推理文本，只写 md）
- ❌ **不写** `design.whyMatters`（推理文本，只写 md）
- ❌ **不写** `design.measureMethod`（推理文本，只写 md）
- ✅ **只写** `design.visualStrategy`（策略结论）+ `design.weightPyramid`（权重金字塔）+ `design.handover`（移交信息）

---
