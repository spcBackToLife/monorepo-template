# AI Music App 设计规格书

## 项目信息
- **项目名称**: pk (AI Music App)
- **项目ID**: `833478e8-17c5-4f1f-b2d2-9ae17012cbcc`
- **视口**: iPhone SE 375x667
- **设计语言**: 深色主题 + 蓝紫粉渐变强调色 (#667eea → #ea62a6)

## 页面清单 & 跳转关系

```
Welcome (Onboarding)
    │  [Next/点击开始] → Home
    │  [Skip] → Home
    ▼
Home (Music AI Hub)
    │  [Tap to talk 圆圈] → Chat
    │  [底部导航: Home/创建/Library]
    ▼
Chat (AI Conversation)
    └── [返回箭头] → Home
```

---

## Page 1: Welcome - Onboarding
**Screen ID**: `sc_2a526961f84a401f8aa48` | **根节点**: `nd_e0584cd7494d4f81ad4c9`

### 布局结构（从底到顶）
| 组件 | 类型 | 样式要点 | 素材 |
|------|------|----------|------|
| **背景** | 全屏 div | 渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ea62a6 100%)` | 已有素材 PNG 可用 |
| **装饰椭圆** | div | 半透明白色椭圆，居中偏下，模拟光影 | CSS border-radius 50% |
| **星标图标** | div/img | 白色 ⭐ 图标，左上区域，约 24px | 已有星标素材 |
| **主标题** | h1 | "AI Music" 或类似，白色，粗体，28px，左对齐 | 文字 |
| **副标题/描述** | p | "Create music with AI"，白色 70% 不透明度，16px | 文字 |
| **"点击开始"按钮** | button/div | 大圆角胶囊形，白字/渐变背景，宽 ~200px，高 48px，带阴影 | 已有按钮素材 (0629d566) |
| **分页指示器** | div 行 | 3个小圆点，当前激活点为白色，其他半透明 | CSS dots |

### 交互事件
- 点击"开始"/"Next" → navigate to Home (`sc_3867ab8645d14c649abc2`)
- Skip 按钮 → navigate to Home (`sc_3867ab8645d14c649abc2`)

---

## Page 2: Home - Music AI Hub
**Screen ID**: `sc_3867ab8645d14c649abc2` | **根节点**: `nd_c8c8b01023cf42608e177`

### 布局结构（从上到下）

#### 区域 A: 顶部导航栏 (~56px 高)
| 组件 | 样式要点 |
|------|----------|
| 容器 | flex row, space-between, padding 0 16px, height 56px |
| 左侧: 用户头像 | 圆形 img, 36px, borderRadius 18px, pravatar.cc |
| 左侧: 用户名区 | flex column, "Welcome back"(12px, rgba(255,255,255,0.5)) + "Dimas Silebew"(16px, #fff bold) |
| 右侧: 菜单按钮 | 圆角方块 32px, bg rgba(255,255,255,0.08), ☰ 图标或文字 |

#### 区域 B: 主内容区 (flex: 1, 居中)
| 组件 | 样式要点 |
|------|----------|
| 外容器 | flex column, alignItems center, justifyContent center, gap 24px |
| **Tap to Talk 大圆** | 200x200, border-radius 100px, border 2px solid rgba(255,255,255,0.15) |
| | 背景 radial-gradient(圆心 #667eea 15% → transparent) |
| | box-shadow 发光效果 |
| | 内部垂直排列: "Hi, Dimas 👋"(14px, rgba(255,255,255,0.6)) |
| | "Tap to talk"(22px, #fff, bold) |
| | 声波条: flex row, gap 3px, 5个竖条, 高度各异(8~28px), width 3px, borderRadius 1.5px, bg #667eea |
| **功能卡片行** | flex row, gap 12px, width 100%, padding 0 20px |
| | 卡片1 "Generate Music": flex 1, rounded-rect 16px, bg rgba(102,126,234,0.08), icon+标题+描述 |
| | 卡片2 "My Creations": flex 1, rounded-rect 16px, bg rgba(234,102,166,0.08), icon+标题+描述 |

#### 区域 C: 底部导航栏 (~64px + safe-area)
| 组件 | 样式要点 |
|------|----------|
| 容器 | flex row, space-around, bg rgba(0,0,0,0.3), borderTop 1px solid rgba(255,255,255,0.06), height 64 |
| 导航项1: Home | flex column, 小图标+文字(激活态 #667eea) |
| 中央按钮 | 圆形 56px, bg #667eea, borderRadius 28px, 向上突出 margin-bottom 20px |
| 导航项3: Library | flex column, 小图标+文字(默认态 rgba(255,255,255,0.4)) |

### 交互事件
- Tap to Talk 圆圈 click → navigate to Chat (`sc_bc334cb7178a4905991e6`)
- Generate Music 卡片 click → navigate to Chat
- 中央按钮 click → navigate to Chat

---

## Page 3: Chat - AI Conversation
**Screen ID**: `sc_bc334cb7178a4905991e6` | **根节点**: `nd_717b03df939848f8a004d`

### 布局结构（从上到下）

#### 区域 A: 顶部导航栏 (~56px)
| 组件 | 样式要点 |
|------|----------|
| 容器 | flex row, align center, justify space-between, padding 0 16px, bg #1a1a24, borderBottom 1px solid rgba(255,255,255,0.06) |
| 返回箭头 | ← 图标/文字, color #fff, clickable |
| 标题 | "AI Assistant", 17px, #fff, bold |
| 占位符 | 保持标题居中 |

#### 区域 B: 消息列表区 (flex: 1)
| 组件 | 样式要点 |
|------|----------|
| 容器 | flex column, gap 16px, padding 16px, overflow-y auto |
| **快捷建议标签行** | flex row, gap 8px, flex-wrap |
| | 标签: pill 形状, padding 6px 14px, fontSize 12px, borderRadius 16px |
| | "Lo-fi beats" → bg rgba(102,126,234,0.12), color #667eea |
| | "Jazz piano" → bg rgba(234,102,166,0.12), color #ea62a6 |
| | "EDM drop" → bg rgba(86,204,153,0.12), color #56cc99 |
| **AI 消息气泡** | flex row, justify flex-start |
| | 头像(小圆) + 气泡(bg rgba(255,255,255,0.08), 圆角, max-width 75%) |
| | 文字 "Hi! I'm your AI music assistant..." |
| **用户消息气泡** | flex row, justify flex-end |
| | 气泡(bg #667eea, 圆角, max-width 75%) |
| | 文字 "Create a lo-fi beat for studying" |

#### 区域 C: 底部输入框区 (~68px)
| 组件 | 样式要点 |
|------|----------|
| 容器 | flex row, gap 12px, padding 12px 16px, bg #1a1a24, borderTop 1px solid rgba(255,255,255,0.06) |
| 输入框 | flex 1, height 44px, borderRadius 22px, bg rgba(255,255,255,0.06), paddingLeft 16px |
| 发送按钮 | 44x44px, borderRadius 22px, bg #667eea, ✉️ 图标 |

### 交互事件
- 返回箭头 click → navigate to Home (`sc_3867ab8645d14c649abc2`)
- 快捷标签 click → 填充输入框文字
- 发送按钮 click → 添加用户消息气泡 + AI 回复

---

## 颜色系统
| 用途 | 值 |
|------|-----|
| 主背景色 | #0d0d12 (深黑) |
| 次级背景 | #1a1a24 (深灰蓝) |
| 主强调色 | #667eea (靛蓝) |
| 次强调色 | #ea62a6 (粉红) |
| 成功色 | #56cc99 (青绿) |
| 文字主色 | #ffffff |
| 文字次级 | rgba(255,255,255,0.5) / rgba(255,255,255,0.45) |
| 边框/分割线 | rgba(255,255,255,0.06) |
| 卡片背景 | rgba(255,255,255,0.06) ~ rgba(255,255,255,0.08) |
| Welcome 渐变 | linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ea62a6 100%) |

## 现有素材资源
| 文件名 | 内容 |
|--------|------|
| 0629d566.png | "点击开始" 渐变按钮 (蓝紫粉渐变，含星标和椭圆装饰) |
| fd4e19d5.png | 星标+椭圆装饰图 (Welcome 页用) |
| d4a05ad9.png | 星标+椭圆装饰图 (变体) |
| f1145d00.png | 星标+椭圆+点击开始 (完整 Welcome 组合) |
| 14678b1c.png | 星标+椭圆+点击开始 (变体) |
| 9c3dd30c.png | 其他素材 |
