# 装饰系统：illustration（插画系）

> 适用 visualConcept：活泼 / 故事 / 教育 / 儿童 / 营销 / 引导
>
> 形状基调匹配：圆角柔和（多）/ 有机曲线

---

## 1. 视觉特征

- **形态**：拟物 / 扁平插画 / 多元素组合
- **色彩**：多色（≥ 3 色，常含主色 + 辅色 + 装饰色）
- **细节**：丰富，但保持视觉重心
- **来源**：material-painter 画 SVG / PNG（不能纯 CSS）

---

## 2. 插画类型

| 类型 | 用途 | 例 |
|---|---|---|
| Hero 插画 | 引导 / 营销 / 空状态 | 校园场景插画 |
| Empty 插画 | 列表无数据 | 空盒子 + 文案 |
| Error 插画 | 错误页 | 断线信号 / 404 路标 |
| Onboarding 插画 | 引导步骤 | 操作示意 |
| 装饰插画 | 角落小图 | 树叶 / 云朵 / 星星 |

---

## 3. 调用 material-painter 画插画

```
Skill: material-painter
prompt:
  画一个 empty-state 插画：
  - referenceFrame: 200×200
  - kind: illustration
  - 风格：扁平 + 多色 + 主色 primary + 辅色 secondary + 装饰色 accent
  - 主体：空盒子 + 周围装饰小元素
  - materialSpec: [完整 jsonc]
  - 完成后 applyMaterialDesign 写入 nodeId
```

---

## 4. 插画规模约束

```
单屏插画数 ≤ 1（hero）+ 1（empty/error，不同时出现）
插画尺寸 ≥ 120×120px（< 80px 太小看不清细节）
插画色彩数 3-5 色（< 3 单调；> 5 视觉混乱）
```

---

## 5. 适用 / 不适用

| 场景 | 适用 | 不适用 |
|---|:---:|:---:|
| 引导页 / Onboarding | ✅ | — |
| Empty / Error 页 | ✅ | — |
| 营销活动页 | ✅ | — |
| 教育 / 儿童 app | ✅ | — |
| 登录 / 支付（trust）| — | ❌（视觉太重，破坏信任）|
| 数据看板 | — | ❌ |
| 极简风首页 | ⚠️（仅 empty / error 用，常态不用）| — |

---

## 6. 红线

- ❌ 插画用 CSS 实现（太复杂）→ 必须 material-painter 画 SVG / PNG
- ❌ 一屏多个插画（分散视觉）
- ❌ 插画色彩与主题 primary 冲突（如 primary 是蓝紫但插画主调是橙红）
- ❌ trust 场景（登录 / 支付 / 实名）用插画
- ❌ 插画过于细节（手机屏幕看不清）
- ❌ 同屏混用 illustration 与 geometric-line / soft-glow
