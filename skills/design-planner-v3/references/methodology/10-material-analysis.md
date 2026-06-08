# 10 — 素材需求分析方法论

> 必读时机：Phase B（提炼设计目标）和 Phase C（目标→元素拆解）时。
> 任务目的：系统性分析"这个页面需要哪些素材？哪些元素可以结合素材？"
>
> 核心信念：**素材是设计目标的实现手段，不是事后补妆**。

---

## 1. 素材类型清单

| 素材类型 | 定义 | 典型应用场景 |
|---------|------|-------------|
| **Background（背景素材）** | 全屏/大块面背景装饰 | 登录页背景、Hero 区背景、分区分割 |
| **Icon（功能性图标）** | 导航/操作/状态图标 | BottomTab、按钮前缀图标、状态指示 |
| **Decoration（装饰性素材）** | 光晕/几何线条/渐变色块/波纹 | 氛围营造、视觉引导、分区标识 |
| **Texture（纹理素材）** | 噪点/纸纹/颗粒 | 增加质感、避免纯色平淡 |
| **Illustration（插画素材）** | 空状态/引导/品牌插画 | 空数据、Onboarding、错误页 |
| **Brand（品牌素材）** | Logo/品牌标识 | 品牌识别、关于页、Footer |

---

## 2. 素材需求分析 5 步法

### Step 1: 从设计目标推导素材需求

```
对每个 designGoal:
  1. 读 goal.statement → 提取关键词
  2. 问：这个目标需要什么视觉手段？
     - 需要"温度/氛围" → Background / Decoration
     - 需要"品牌识别" → Brand / Icon
     - 需要"功能引导" → Icon / Illustration
     - 需要"质感/高级感" → Texture / Decoration
  3. 记录：goalId → 需要的素材类型清单
```

### Step 2: 元素级素材结合分析

```
对每个节点问 5 个问题：
  1. 这个节点是"纯功能"还是"需要情感化"？
     - 纯功能（如 plain input）→ 不需要素材
     - 需要情感化（如 login button）→ 可以结合 Icon 素材

  2. 这个节点的视觉权重是否足够？
     - 权重不足 → 用 Decoration 素材增强
     - 权重过高 → 用 Texture 素材降低攻击性

  3. 这个节点是否可以作为"素材载体"？
     - 容器节点（有 border/backdropFilter）→ 内部创建 IconDiv 作为载体
     - 纯内容节点 → 直接作为载体

  4. 这个节点的状态变化是否需要不同素材？
     - hover/pressed/disabled → 可能需要不同 Icon 素材
     - success/error/loading → 可能需要 Illustration 素材

  5. 这个节点是否与其他节点形成"素材家族"？
     - BottomTab 5 个图标 → 必须同一风格（从 iconSpec 推导）
     - 列表项前缀图标 → 必须同一风格
```

### Step 3: 素材风格与整体设计语言对齐

```
素材风格必须从以下来源推导（零自由度）：
  1. theme.intent → 决定整体风格（minimal+flat / playful / luxury / ...）
  2. theme.decorationRules → 决定装饰手法（soft-glow / geometric-line / ...）
  3. theme.iconSpec → 决定图标风格（stroke / fill / linecap / linejoin / ...）
  4. visualStrategy.colorRatio → 决定素材色彩（60-30-10 分配）

禁止：
  - 凭感觉选风格
  - 一个页面混用多种素材风格
```

### 3.1 装饰系统策略对照表（必读）

选定装饰系统后，**必须读取对应的 `decoration-systems/*.md`** 获取详细设计策略：

| 装饰系统 | 对应文件 | 视觉特征 | 适用 mood |
|---------|---------|---------|---------|
| `soft-glow` | `decoration-systems/soft-glow.md` | 径向渐变 + blur | 温度 / 治愈 / 校园 / 安静 |
| `geometric-line` | `decoration-systems/geometric-line.md` | 直线 / 网格 / 几何 | 科技 / 工具 / 数据 / 严肃 |
| `illustration` | `decoration-systems/illustration.md` | 具象插画 | 活力 / 玩乐 / 教育 / 故事 |
| `texture` | `decoration-systems/texture.md` | 噪点 / 纸纹 / 颗粒 | 复古 / 自然 / 高级感 |
| `organic-curve` | `decoration-systems/organic-curve.md` | 自由曲线 / 泡泡 | 艺术 / 个性 / 治愈 |

⚠️ **强制**：`decorationSystem.family` 选定后，material brief 必须指定读取哪个 `decoration-systems/*.md`，painter 必须按该文件的策略设计素材。

### Step 4: 素材位置策略

| 位置 | 适合素材类型 | 注意事项 |
|------|-------------|---------|
| **背景层（z-index: 0）** | Background / Texture | 不能干扰内容可读性 |
| **内容层下方（z-index: 1）** | Decoration | 作为氛围烘托，低透明度 |
| **内容层（z-index: 2）** | Icon / Illustration | 必须清晰可辨 |
| **装饰层（z-index: 3）** | Brand / Decoration | 不能干扰交互 |
| **溢出边界** | Decoration | 利用参考框裁剪实现"无限延伸"效果 |

### Step 5: 素材清单输出

```markdown
## 素材需求清单（Phase B 输出）

### G1: <goal-statement>

- **需要素材类型**: Background / Decoration
- **素材风格**: soft-glow（从 theme.decorationRules 推导）
- **素材位置**: 背景层 + 右上角溢出
- **素材色彩**: primary 10-20% 透明度（从 colorRatio 推导）
- **应用节点**: BgBlobTopRight / BgBlobBottomLeft

### G5: <goal-statement>

- **需要素材类型**: Brand (Logo)
- **素材风格**: stroke + fill（从 iconSpec 推导）
- **素材位置**: 内容层中心
- **素材色彩**: primary + inverse（从 colorRatio 推导）
- **应用节点**: BrandLogo
```

---

## 3. 素材与设计目标的映射矩阵

| designGoal 类型 | 推荐素材类型 | 不推荐素材类型 |
|----------------|-------------|---------------|
| **mood-warmth（温度）** | Background / Decoration (soft-glow) | Geometric-line（太冷） |
| **brand-recognition（品牌）** | Brand / Icon | Texture（干扰识别） |
| **hierarchy（层次）** | Decoration / Icon | Illustration（太重） |
| **trust（信任）** | Icon (stroke, 精致) | Texture（不够专业） |
| **engagement（参与）** | Illustration / Icon | Background（太静态） |
| **minimalism（极简）** | Icon (stroke, 细线) | Illustration（太复杂） |

---

## 4. 素材复杂度控制

```
素材复杂度必须与 theme.aesthetics 对齐：

theme.aesthetics = ["minimal", "flat"]
  → 素材复杂度: 低（1-3 个 path，无渐变/阴影）

theme.aesthetics = ["playful", "organic"]
  → 素材复杂度: 中（3-10 个 path，允许渐变/光晕）

theme.aesthetics = ["luxury", "textured"]
  → 素材复杂度: 高（10+ 个 path，允许纹理/噪点/多层叠加）
```

---

## 5. 素材复用策略

```
跨屏素材必须复用（DRY 原则）：

1. 识别"素材家族"：
   - BottomTab 5 个图标 → 同一 iconSpec
   - 空状态插画 → 同一 illustration 风格
   - 装饰光晕 → 同一 decorationRules

2. 复用方式：
   - 同一素材不同尺寸 → 创建多个 materialProject，但同一绘制逻辑
   - 同一风格不同内容 → 同一 iconSpec 不同 pathData

3. 禁止：
   - 同一页面混用不同素材风格
   - 同一"素材家族"内风格不一致
```

---

## 6. 反模式案例

### 反模式 1: 事后补素材

❌ 错误（Phase F 才想起来加素材）：
```
Phase B: 提炼 G1 mood-warmth
Phase C: 拆解 G1 → 改 Root 背景色
Phase F: 执行时发现"哎怎么没有氛围装饰？" → 临时加 CSS 渐变
```
后果：CSS 渐变与整体设计语言不一致，显得廉价。

✅ 正确（Phase B 就分析素材需求）：
```
Phase B:
  G1 mood-warmth → 需要 Background + Decoration 素材
  → 记录到 goalElementMap[G1].changes.materials

Phase C:
  G1 → Root (加 Background 素材) + BgBlobTopRight (加 Decoration 素材)

Phase F:
  → 调 material-painter 绘制精美素材
```

### 反模式 2: 素材风格混用

❌ 错误（一个页面混用多种素材风格）：
```
G1 mood-warmth → soft-glow 光晕
G5 brand-recognition → geometric-line 图标
→ 视觉语言不统一，显得杂乱
```

✅ 正确（单一素材风格）：
```
Phase D 跨目标统筹 → 选定单一装饰族（soft-glow）
→ G1 用 soft-glow, G5 也用 soft-glow（Logo 用柔和光晕衬托）
```

---

## 7. 自检（Phase B/C 必做）

- [ ] 每个 designGoal 都分析了"需要什么素材类型？"
- [ ] 每个节点都问了"是否可以结合素材？"
- [ ] 素材风格从 theme.intent/decorationRules/iconSpec 推导（零自由度）
- [ ] 素材位置策略已规划（背景层/内容层/装饰层）
- [ ] 素材复杂度与 theme.aesthetics 对齐
- [ ] 跨屏素材复用已识别（BottomTab/空状态/装饰族）

任一未通过 → 素材需求分析不完整，重做。

---

## 8. 一句话总结

> **素材需求分析 = Phase B/C 必做动作。从设计目标推导素材类型 → 元素级分析"哪些节点可以结合素材" → 素材风格从 theme 推导 → 输出素材清单 → Phase F 调 material-painter 绘制。**
