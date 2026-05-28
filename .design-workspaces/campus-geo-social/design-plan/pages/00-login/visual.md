# 00-login · 登录页 · 视觉设计分析

> **层级**: L1 页面统筹
> **上游**: `interaction-design/pages/00-login.md`
> **全局约束**: `design-plan/design-system.md`
> **主题**: 青春治愈风（草莓粉/薄荷绿/奶油黄）

---

## 1. 情感与氛围目标

### 1.1 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | 首次打开 App 或退出重登——可能好奇（新用户）、惯性（老用户）、略焦急（忘记密码） |
| 目标感受 | **温暖、安全、年轻** — 让用户感到"这是属于我的校园社交空间" |
| 情绪曲线 | 进入（好奇/期待）→ 输入（专注/流畅）→ 成功跳转（愉悦/归属感） |
| 与主题风格的关系 | 加强"治愈暖色"氛围：大面积暖白底 + 粉色主按钮 + 柔和装饰。这是用户进入 App 的第一视觉印象，需充分传达品牌调性 |

### 1.2 品牌感要素

- **草莓粉主色 CTA**：全屏只有一个高饱和粉色按钮，截图即可辨认
- **Logo + Slogan**：品牌顶部区域占据视觉首焦
- **圆角药丸形输入框 + 按钮**：有机柔软感，区别于"方正严肃"的登录页
- **角落装饰**（粉色圆 + 薄荷叶）：低调但独特的品牌视觉签名

---

## 2. 视觉层级设计

### 2.1 空间深度

```
[最深层] ─── 暖白底色 #FFFAF6 + 顶部渐变氛围（z-0）
    ↑
[氛围层] ─── 粉色圆点(D-02) + 薄荷叶(D-03) 装饰（z-5, opacity 0.15-0.3）
    ↑
[内容层] ─── Logo + 表单卡 + 底部链接（z-10, 用户注意力）
    ↑
[强调层] ─── 登录按钮（z-20, 最高视觉权重）
    ↑
[覆盖层] ─── 错误 Modal / Toast（z-30, 按需出现）
```

| 层级 | 包含什么 | 视觉表现 | 与其他层的关系 |
|------|---------|---------|-------------|
| 最深层 | 页面底色 + 顶部粉色浅渐变 | `#FFFAF6` 底 + 上方 `linear-gradient(180deg, #FFE6EC 0%, #FFFAF6 40%)` | 为品牌区创造温暖氛围 |
| 氛围层 | D-02 粉色圆(右上)、D-03 薄荷叶(左下) | 低透明度（15-30%）、大尺寸但模糊边缘 | 营造"有机柔软"不干扰内容 |
| 内容层 | top-area(logo+slogan)、form-card、mode-toggle、footer | 白色卡片 + 清晰文字 | 是用户交互的主体 |
| 强调层 | submit-btn 登录按钮 | 满色 primary + shadow-sm + 圆角 full | 全页最强视觉吸引 |
| 覆盖层 | 错误 Modal/Toast（条件出现） | overlay 蒙层 + 白色弹窗 | 临时打断 |

### 2.2 视觉权重分配

| 元素 | 视觉权重(1-10) | 实现手段 | 为什么这个权重 |
|------|:-------------:|---------|-------------|
| submit-btn（登录按钮）| 10 | 满色主色 + shadow + full 圆角 + 最大宽度 | 核心 CTA，用户最终目标 |
| top-area（Logo+Slogan）| 7 | 64px logo + h2 标题 + 品牌色 | 品牌印象首焦 |
| form-card（表单区域）| 6 | 白色卡片 + 阴影 + 大圆角 | 交互主体但不抢按钮风头 |
| mode-toggle | 4 | 小胶囊切换器 + 主色指示 | 功能性，非视觉焦点 |
| footer（注册/忘记密码）| 3 | 文字链接 + primary 色 | 辅助入口，低调但可见 |
| 装饰元素(D-02/D-03) | 2 | 大尺寸但极低透明度 | 氛围感但绝不干扰 |

**总权重**: 10+7+6+4+3+2 = 32（接近上限30，因为登录页信息密度低，允许略高）
**主角**: submit-btn（唯一最高权重 CTA）

### 2.3 视觉流向

```
进入页面 → 视线首先落在 [Logo + Slogan]（顶部 1/4 区域，品牌认知）
         → 自然下移到 [form-card]（屏幕中心偏上，白色卡片吸引）
         → 在表单内从上到下：手机号 → 验证码/密码
         → 最终停在 [submit-btn]（卡片底部，全屏最强视觉元素）
         → 若需要：视线下探到 [footer] 辅助链接
```

### 2.4 组件视觉预算分配

| 组件 | 页面中的角色 | 视觉权重(1-10) | 允许的视觉手段 | 装饰密度上限 |
|------|:----------:|:-------------:|-------------|:-----------:|
| top-area | 主角-品牌 | 7 | Logo素材 + 大字号标题 + 顶部渐变映衬 | 少（Logo本身是素材） |
| form-card | 配角-交互 | 6 | 白色卡片 + 阴影 + 内部输入框聚焦动效 | 极少（功能为主） |
| submit-btn | 主角-CTA | 10 | 满色 + 阴影 + 动效(press/loading/success) | 中（按钮本身是焦点） |
| mode-toggle | 工具-切换 | 4 | 胶囊轨道 + 滑块 + 主色指示 | 极少 |
| footer | 工具-导航 | 3 | 文字链接色 | 无 |

---

## 3. 视觉手段清单

### 3.1 色彩运用

| 色彩手段 | 具体描述 | 面积/位置 | 营造的感受 | Token引用 |
|---------|---------|---------|-----------|----------|
| 暖白底色 | `#FFFAF6` 全屏 | 100% 页面底 | 温暖不刺眼 | background |
| 顶部氛围渐变 | `linear-gradient(180deg, #FFE6EC 0%, #FFFAF6 40%)` | 页面上方 40% | 治愈粉调入场 | primaryLight → background |
| 主色 CTA | `#FF6F91` 满色填充 | 登录按钮 | 明确行动号召 | primary |
| 主色焦点 | `#FF6F91` 2px border | 输入框 focus | 品牌一致聚焦 | borderFocus |

### 3.2 光影效果

| 光影手段 | 具体描述 | 应用对象 | 营造的感受 | 参数 |
|---------|---------|---------|-----------|------|
| 卡片轻阴影 | 主色调粉色双层阴影 | form-card | 浮起但不沉重 | shadow-sm token |
| 按钮阴影 | 略强阴影 + press 时降级 | submit-btn | 可点击/可按下 | shadow-sm → none(press) |
| 输入框 focus ring | 主色扩散光环 | input focus 态 | 清晰反馈 | `0 0 0 3px rgba(255,111,145,0.1)` |

### 3.3 装饰元素

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 |
|------|:----:|------|------|:----------:|------|------|
| D-02 pink-circle | 有机/几何 | 右上角，溢出页面边缘 | 80×80px | `#FF6F91` at 15% | 静止 | 品牌色签名 + 打破矩形单调 |
| D-03 mint-leaf | 有机 | 左下角，form-card 下方 | 60×40px | `#6FE2A8` at 20% | 静止 | 辅色点缀 + 有机柔软感 |

> **装饰密度**: 仅 2 个装饰元素（少量），符合登录页"简洁专注"定位。装饰放在边角不干扰核心交互。

### 3.4 质感与肌理

| 质感手段 | 应用区域 | 参数 | 营造的感受 |
|---------|---------|------|-----------|
| 无毛玻璃 | — | — | 登录页简洁不需要模糊层 |
| 无纹理 | — | — | 纯色策略（decorationRules.background.strategy=solid） |

### 3.5 图标与图形

| 图标/图形 | 在哪里 | 功能 | 风格要求 | 尺寸 |
|----------|--------|------|---------|------|
| B-01 brand-logo | top-area 中心 | 品牌识别 | 彩色品牌 Logo（草莓粉+薄荷绿调） | 64×64px |
| I-01 eye-open | password-input 右侧 | 显示密码 | outline 2px / round cap / textSecondary 色 | 20×20px |
| I-02 eye-closed | password-input 右侧 | 隐藏密码 | 同 I-01 一族，加斜线 | 20×20px |
| I-04 checkmark-success | submit-btn 内（success态）| 成功反馈 | outline 2px / round / success 色 `#3FCC93` | 20×20px |

### 3.6 动效设计

| 动效 | 触发条件 | 视觉效果 | 参数 |
|------|---------|---------|------|
| 输入框 label 上浮 | focus | placeholder 上浮 -8px + 缩小 0.85 | 200ms ease-out |
| mode-toggle 滑块 | click | thumb 平移到另侧 | 200ms spring |
| submit-btn press | touchstart | scale(0.97) + shadow 降级 | fast 200ms spring |
| submit-btn loading | API 请求中 | 文字→spinner 淡入 | 200ms |
| submit-btn success | API 200 | spinner→✓ + bg→`#3FCC93` + scale(1.05→1) | 300ms spring |
| form shake | error:credential | 整个 form-card X轴 ±4px ×3 | 300ms |
| 表单切换 | mode-toggle click | 当前输入框组 fadeOut + 新组 fadeIn | 200ms ease-out |

---

## 4. 实现分类

### 4.1 逐项分类结果

| # | 视觉元素 | 分类 | 输出目标 | 理由 |
|---|---------|:----:|---------|------|
| 1 | 暖白底色 + 顶部渐变 | CSS | _page 样式 | linear-gradient 足够 |
| 2 | 卡片阴影 | CSS | form-card 样式 | box-shadow token |
| 3 | 输入框 border/focus ring | CSS | input 样式 | border + box-shadow |
| 4 | 按钮满色 + 圆角 | CSS | submit-btn 样式 | background + border-radius |
| 5 | B-01 brand-logo | 素材 | materials/B-01-brand-logo.md | 品牌图形需精心绘制 |
| 6 | I-01 eye-open | 素材 | materials/I-01-eye-open.md | outline icon 需 canvas 绘制 |
| 7 | I-02 eye-closed | 素材 | materials/I-02-eye-closed.md | 同上 |
| 8 | I-04 checkmark-success | 素材 | materials/I-04-checkmark-success.md | 需精确笔触 |
| 9 | D-02 pink-circle | 素材 | materials/D-02-pink-circle.md | 可能有渐变/模糊边缘 |
| 10 | D-03 mint-leaf | 素材 | materials/D-03-mint-leaf.md | 有机叶形需 path |
| 11 | label 上浮动效 | CSS | input 样式（transition） | transform + opacity |
| 12 | mode-toggle 滑动 | CSS | mode-toggle 样式 | transform: translateX |
| 13 | submit-btn press/success | CSS+动效 | submit-btn 状态规格 | 多态 transition |
| 14 | form shake | CSS | form-card animation | @keyframes shake |

---

## 5. 素材需求清单

| 素材ID | 名称 | 类型 | 设计意图 | 尺寸 | 色彩方向 | 变体数 | 优先级 |
|--------|------|------|---------|------|---------|:------:|:------:|
| B-01 | brand-logo | Brand | 校园社交品牌标识，传达年轻治愈感 | 64×64 | 草莓粉为主+薄荷绿点缀 | 1 | P0 |
| I-01 | eye-open | Icon | 密码可见切换（开启态） | 20×20 | textSecondary | 1 | P0 |
| I-02 | eye-closed | Icon | 密码可见切换（关闭态） | 20×20 | textSecondary | 1 | P0 |
| I-04 | checkmark-success | Icon | 登录成功视觉确认 | 20×20 | success `#3FCC93` | 1 | P1 |
| D-02 | pink-circle | Decoration | 右上角品牌色氛围装饰 | 80×80 | primary `#FF6F91` at 15% | 1 | P2 |
| D-03 | mint-leaf | Decoration | 左下角辅色有机装饰 | 60×40 | secondary `#6FE2A8` at 20% | 1 | P2 |

---

## 6. 样式规格清单

| 元素 | 所在节点 | CSS属性 | 值 | 为什么 |
|------|---------|---------|------|--------|
| 页面背景 | _page (root) | background | `linear-gradient(180deg, #FFE6EC 0%, #FFFAF6 40%)` | 品牌氛围入场 |
| 页面底色 | _page (root) | background-color | `#FFFAF6` | 暖白底（渐变终点） |
| 表单卡片 | form-card | background | `#FFFFFF` | 白色表面 |
| 表单卡片 | form-card | border-radius | 16px (lg) | 大圆角柔和 |
| 表单卡片 | form-card | padding | 24px (lg) | 宽松内边距 |
| 表单卡片 | form-card | box-shadow | token shadow-sm | 轻浮起 |
| 输入框 | phone-input / code-input / password-input | height | 48px | 触摸友好 |
| 输入框 | 同上 | border | 1px solid #FFE0E8 | 淡粉默认边框 |
| 输入框 | 同上 | border-radius | 12px (md) | 友好现代 |
| 输入框 focus | 同上 :focus | border | 2px solid #FF6F91 | 主色聚焦 |
| 输入框 focus | 同上 :focus | box-shadow | `0 0 0 3px rgba(255,111,145,0.1)` | 光环反馈 |
| 登录按钮 | submit-btn | background | `#FF6F91` | 主色 CTA |
| 登录按钮 | submit-btn | color | `#FFFFFF` | 反色文字 |
| 登录按钮 | submit-btn | height | 48px | 与输入框等高 |
| 登录按钮 | submit-btn | border-radius | 9999px (full) | 药丸形CTA |
| 登录按钮 | submit-btn | box-shadow | token shadow-sm | 轻浮起 |
| 按钮 active | submit-btn :active | transform | scale(0.97) | press 反馈 |
| 按钮 active | submit-btn :active | box-shadow | none | 阴影降级 |
| 按钮 disabled | submit-btn [disabled] | opacity | 0.45 | 禁用态 |
| mode-toggle 轨道 | mode-toggle | background | `#F5EDE6` | 奶油浅底 |
| mode-toggle 轨道 | mode-toggle | border-radius | 9999px | 药丸形 |
| mode-toggle 指示 | mode-toggle .active | background | `#FF6F91` | 主色高亮当前 |
| 文字链接 | footer/register-link, forgot-link | color | `#FF6F91` | 主色链接 |
| 文字链接 | 同上 | font-size | 14px (body) | 辅助文字 |

---

## 7. 与全局风格的一致性检查

| 检查项 | 回答 |
|--------|------|
| 使用的色彩是否全部来自 Token？ | ✅ 是：全部引用 primary/primaryLight/background/border/textPrimary 等 Token |
| 装饰元素是否符合全局装饰配方？ | ✅ 是：moderate 密度 + solid 背景策略 + 仅角落装饰 |
| 光影风格是否一致？ | ✅ 是：使用粉色调双层阴影 token |
| 图标风格是否统一？ | ✅ 是：outline 2px / round cap / textSecondary 默认色 |
| 动效时长/缓动是否引用全局？ | ✅ 是：fast(200ms spring) / normal(300ms spring) |
| 装饰用量是否符合决策？ | ✅ 是：登录页=功能型页面，装饰少量(2个角落) |
