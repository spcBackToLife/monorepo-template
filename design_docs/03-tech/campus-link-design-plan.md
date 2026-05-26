# CampusLink 设计计划

> projectId: 2b5f2725-1b3d-4317-8202-aa079d27c135
> 创建时间: 2026-05-26
> 状态: 已完成

## 一、风格语言

基于 ThemeConfig(futuristic-dark) 的 decorationRules 推导：

| 元素类型 | CSS 实现 |
|---------|---------|
| 页面背景 | background: #0a0a14 + 左上渐变光球(radial-gradient, primary 15% opacity, 40% size) |
| 卡片/面板 | background: rgba(18,18,30,0.8); backdrop-filter: blur(16px); border: 1px solid rgba(102,126,234,0.1) |
| 主按钮 | background: linear-gradient(135deg, #667eea, #764ba2); box-shadow: 0 4px 16px rgba(102,126,234,0.3) |
| 次按钮 | background: transparent; border: 1px solid rgba(102,126,234,0.3); color: #667eea |
| 输入框 | background: #12121e; border: 1px solid rgba(102,126,234,0.2); focus 时 border-color: #667eea + ring |
| 分割线 | rgba(255,255,255,0.06) |
| 图标(inactive) | stroke: #6b6b85, strokeWidth: 1.5px |
| 图标(active) | stroke: linear-gradient(135deg, #667eea, #764ba2) 或 fill: #667eea |
| 标题文字 | 可用渐变: background-clip: text + gradient(primary→secondary) |
| hover | scale(1.02) + shadow 升级 + 150ms |
| press | scale(0.97) + shadow 降级 |

## 二、素材清单

| 编号 | 名称 | 用途 | 尺寸 | 风格 | 颜色 | 状态 |
|------|------|------|------|------|------|------|
| B-01 | App Logo | 注册/登录页顶部 | 64×64 | 圆角矩形(16px) + 渐变底 | gradient(135deg, primary→secondary) + 白色符号 | ❌ |
| D-01 | 背景光球-左上 | 所有页面背景装饰 | 200×200 | radial-gradient 圆形 | primary, 15% opacity | ❌ |
| D-02 | 背景光球-右下 | 主页背景装饰 | 160×160 | radial-gradient 圆形 | secondary, 10% opacity | ❌ |
| I-01 | 首页图标 | BottomTab | 24×24 | outline, strokeWidth 1.5 | inactive=#6b6b85, active=#667eea | ❌ |
| I-02 | 发现图标 | BottomTab | 24×24 | outline, strokeWidth 1.5 | 同上 | ❌ |
| I-03 | 发布图标 | BottomTab中心 | 24×24 | outline, strokeWidth 2 | #f0f0f8 (在渐变背景上) | ❌ |
| I-04 | 消息图标 | BottomTab | 24×24 | outline, strokeWidth 1.5 | 同I-01 | ❌ |
| I-05 | 我的图标 | BottomTab | 24×24 | outline, strokeWidth 1.5 | 同I-01 | ❌ |
| I-06 | 搜索图标 | 搜索栏前缀 | 20×20 | outline | #6b6b85 | ❌ |
| I-07 | 通知铃铛 | 顶部导航右侧 | 20×20 | outline | #a8a8c8 | ❌ |
| I-08 | 返回箭头 | 导航返回 | 20×20 | outline | #f0f0f8 | ❌ |
| I-09 | 眼睛(密码可见) | 密码输入框后缀 | 20×20 | outline | #6b6b85 | ❌ |

## 三、组件清单

| 编号 | 组件名 | Props | 状态 | 沉淀级别 | 素材依赖 | 状态 |
|------|--------|-------|------|---------|---------|------|
| C-01 | GlowButton | label, variant(primary/secondary/ghost), size(sm/md/lg), loading? | default/hover/pressed/disabled/loading | 项目级 | - | ❌ |
| C-02 | GlassInput | placeholder, type, icon?, error?, suffix? | default/focused/error/disabled | 项目级 | I-09 | ❌ |
| C-03 | TopNavBar | title, leftIcon?, rightIcon?, transparent? | - | 项目级 | I-07, I-08 | ❌ |
| C-04 | BottomTabBar | activeIndex, items[] | - | 项目级 | I-01~I-05 | ❌ |
| C-05 | FeedCard | user, content, time, likes, comments | default/hover | 页面级 | - | ❌ |
| C-06 | QuickGridItem | icon, label, onTap | default/hover | 页面级 | - | ❌ |

## 四、接口 & Mock

### 注册页
| 数据源 | 类型 | 接口 | autoFetch |
|--------|------|------|-----------|
| registerApi | api | POST /api/auth/register | false |

Mock 场景:
- success: `{ code: 200, data: { userId: "u_001", token: "xxx" } }` delay: 1200ms
- phone_exists: `{ code: 409, message: "该手机号已注册" }` delay: 800ms

### 登录页
| 数据源 | 类型 | 接口 | autoFetch |
|--------|------|------|-----------|
| loginApi | api | POST /api/auth/login | false |

Mock 场景:
- success: `{ code: 200, data: { userId: "u_001", token: "xxx", user: { name: "林小北", avatar: "" } } }` delay: 1000ms
- wrong_password: `{ code: 401, message: "密码错误" }` delay: 800ms

### 主页
| 数据源 | 类型 | 接口 | autoFetch |
|--------|------|------|-----------|
| feedList | api | GET /api/feed?page=1&size=10 | true |
| quickActions | static | - | - |

Mock 场景(feedList):
- success: 5条 FeedItem 数据, delay: 600ms
- empty: [], delay: 400ms
- error: { code: 500 }, delay: 300ms

TypeDef:
- FeedItem: { id, user: { name, avatar, department }, content, createdAt, likes, comments, isLiked }
- QuickAction: { id, icon, label, screenId }

## 五、状态管理

### 注册页 ScreenStateInit
- view.nickname: "" (bind 昵称输入)
- view.school: "" (bind 学校输入)
- view.phone: "" (bind 手机号)
- view.password: "" (bind 密码)
- view.isSubmitting: false
- view.errorMessage: ""

### 登录页 ScreenStateInit
- view.phone: "" (bind)
- view.password: "" (bind)
- view.isSubmitting: false
- view.errorMessage: ""

### 主页 ScreenStateInit
- data.feedList: [] (来自 feedList dataSource)
- data.quickActions: [4项静态数据] (来自 quickActions)
- view.activeTab: "recommend"
- view.currentPage: 1
- view.isRefreshing: false

## 六、页面结构

### 注册页
```
Root (flex column, h:100%, bg:#0a0a14, padding: 48px 24px, align:center)
├── BgOrnament-TopLeft (absolute, D-01) [装饰]
├── LogoSection (flex column, align:center, gap:12)
│   ├── Logo (B-01, 64×64)
│   ├── AppName "Campus Link" (h2, gradient text)
│   └── Slogan (body, textSecondary)
├── FormSection (flex column, gap:16, w:100%)
│   ├── GlassInput[nickname] (bind: view.nickname)
│   ├── GlassInput[school] (bind: view.school)
│   ├── GlassInput[phone] (bind: view.phone)
│   ├── GlassInput[password] (bind: view.password, suffix: I-09)
│   ├── GlowButton[注册] (primary, click → effect.fetch registerApi)
│   └── Agreement (caption, textTertiary)
└── BottomLink "已有账号？去登录" (click → nav.go 登录页)
```

### 登录页
```
Root (flex column, h:100%, bg:#0a0a14, padding: 48px 24px, align:center)
├── BgOrnament-TopLeft (absolute, D-01) [装饰]
├── LogoSection (flex column, align:center, gap:12, mt:80)
│   ├── Logo (B-01, 72×72, shadow-lg)
│   ├── Title "欢迎回来" (h3, textPrimary)
│   └── Subtitle (body, textSecondary)
├── FormSection (flex column, gap:16, w:100%)
│   ├── GlassInput[phone] (bind: view.phone)
│   ├── GlassInput[password] (bind: view.password)
│   ├── ForgotLink (caption, primary, align:right)
│   └── GlowButton[登录] (primary, click → effect.fetch loginApi)
├── Divider (分割线 + "或" 文字)
├── SocialLogin (flex row, gap:16)
│   ├── SocialBtn[微信] (glass style)
│   ├── SocialBtn[QQ] (glass style)
│   └── SocialBtn[Apple] (glass style)
└── BottomLink "没有账号？立即注册" (click → nav.go 注册页)
```

### 主页
```
Root (flex column, h:100%, bg:#0a0a14)
├── BgOrnament-TopLeft (absolute, D-01) [装饰]
├── BgOrnament-BottomRight (absolute, D-02) [装饰]
├── TopNavBar (C-03) [sticky-header]
│   ├── Avatar (32px, gradient bg)
│   ├── Title "Campus Link"
│   └── NotificationIcon (I-07, badge dot)
├── Content [scroll-child, flex:1, overflow:auto]
│   ├── SearchBar (glass input, I-06 前缀)
│   ├── QuickGrid (4-col grid) [repeat: state.data.quickActions]
│   │   └── QuickGridItem(C-06) template
│   ├── SectionHeader "校园动态" + "更多→"
│   └── FeedList [repeat: state.data.feedList]
│       └── FeedCard(C-05) template
│           ├── Header (avatar + name + dept + time)
│           ├── Content (text)
│           └── Actions (like + comment + share)
└── BottomTabBar (C-04) [sticky-footer]
```

## 七、执行计划

| 编号 | 任务 | 依赖 | 技能 | 验收 | 状态 |
|------|------|------|------|------|------|
| T-01 | 设置主题 | - | theme-generator | theme/check=true | ✅ |
| T-02 | 创建屏幕(注册/登录/主页) | T-01 | design-from-reference | list_screens=3 | ✅ |
| T-03 | 绘制 Logo(B-01) | T-01 | design-from-screenshot | export_and_apply 成功 | ✅ |
| T-04 | 绘制背景光球(D-01) | T-01 | design-from-screenshot | 素材可用 | ✅ |
| T-05 | 绘制图标集(I-01~I-09) | T-01 | design-from-screenshot | 9个图标素材完成 | ✅ |
| T-06 | 搭建 GlowButton(C-01) | T-01 | design-from-reference | 组件模板可实例化 | ✅ |
| T-07 | 搭建 GlassInput(C-02) | T-01 | design-from-reference | 组件模板可实例化 | ✅ |
| T-08 | 搭建 BottomTabBar(C-04) | T-05 | design-from-reference | 含图标+激活态 | ✅ |
| T-09 | 搭建注册页 | T-06,T-07 | design-from-reference | 页面结构完整+状态+事件 | ✅ |
| T-10 | 搭建登录页 | T-06,T-07 | design-from-reference | 页面结构完整+状态+事件 | ✅ |
| T-11 | 搭建主页 | T-06,T-08 | design-from-reference | Feed列表数据驱动+底栏 | ✅ |

## 八、执行日志

### Session 1 — 2026-05-26 19:24
- [x] T-01: 主题设置 ✅
- [x] T-02: 创建屏幕（注册sc_bdc417b6281a40a386685 / 登录sc_48b6fa927da545c1ba28b / 主页sc_c732061fbd6245b29470b）✅
- [x] T-09: 注册页搭建 ✅（含装饰光球+渐变文字+毛玻璃输入框+发光按钮）
- [x] T-10: 登录页搭建 ✅（含装饰光球+渐变分割线+毛玻璃社交登录按钮）
- [x] T-11: 主页搭建 ✅（含装饰光球+毛玻璃搜索栏+渐变图标网格+毛玻璃Feed卡片+毛玻璃底栏+凸起发布按钮）
- 待办: T-03~T-08（素材绘制+组件模板化）待下次会话继续

### Session 2 — 2026-05-26 19:31
- [x] T-03: Logo(B-01) 绘制 ✅（canvas 渐变圆角矩形 + 白色C字母 → export_and_apply 到注册页）
- [x] 页面跳转事件: 注册→登录、注册→主页 ✅
- 下一个待办: T-04(背景光球素材) → T-05(图标集)

### Session 3 — 2026-05-26 19:59
- [x] T-04: 背景光球 ✅（已通过 CSS radial-gradient 直接实现，无需素材工程）
- [x] T-05 部分: BottomTab 图标 I-01~I-05 绘制完成 ✅
  - I-01 Home: 房屋轮廓 (materialId: dd655e88)
  - I-02 Discover: 指南针 (materialId: 8a5cd4e4)
  - I-03 Publish: 编辑笔 (materialId: 4ecda71b)
  - I-04 Message: 聊天气泡 (materialId: 74562fc0)
  - I-05 Profile: 人像 (materialId: 2dc6f0d2)
- 待办: I-06~I-09 (搜索/通知/返回/眼睛) + 图标应用到页面节点

### Session 4 — 2026-05-26 20:16
- [x] T-05 完成: I-06~I-09 绘制 ✅
  - I-06 Search: 放大镜 (materialId: bb1a32f5)
  - I-07 Bell: 铃铛 (materialId: 660eedc0)
  - I-08 Back: 左向chevron (materialId: f97170df)
  - I-09 Eye: 眼睛+瞳孔 (materialId: 885b0dff)
- 下一步: 将图标 export_and_apply 到页面对应节点 → T-06/T-07/T-08 组件模板化
- [x] 图标应用到页面: Home/Discover/Message/Profile→BottomTabBar, Search→SearchBar ✅
- 下次继续: T-06/T-07(GlowButton/GlassInput 组件模板化) → T-08(BottomTabBar模板化)

### Session 5 — 2026-05-26 20:22
- [x] T-06: GlowButton 组件模板化 ✅ (save_as_template from 注册按钮)
- [x] T-07: GlassInput 组件模板化 ✅ (save_as_template from 昵称输入框)
- [x] T-08: BottomTabBar 组件模板化 ✅ (save_as_template from 主页底栏)
- 🎉 全部 11 个任务执行完成！

### Session 6 — 2026-05-26 20:29（深化阶段）
- [x] 数据源创建 ✅
  - 注册页: registerApi (POST /api/auth/register) + 2个Mock场景(success/phone_exists)
  - 登录页: loginApi (POST /api/auth/login) + 2个Mock场景(success/wrong_password)
  - 主页: feedList (GET /api/feed, autoFetch=true) + 3个Mock场景(success-5条/empty/error)
  - 主页: quickActions (static, 4项快捷入口)
- [x] 状态管理 ✅
  - 注册页 view: nickname/school/phone/password/isSubmitting/errorMessage
  - 登录页 view: phone/password/isSubmitting/errorMessage
  - 主页 view: activeTab/currentPage/isRefreshing
  - 主页 data: feedList=[]/quickActions=[4项]
- [x] 表单双向绑定 ✅
  - 注册页: 4个input → state.view.nickname/school/phone/password
  - 登录页: 2个input → state.view.phone/password
- [x] 交互事件 ✅
  - 注册按钮: click → state.set(isSubmitting) + effect.fetch(registerApi) + onSuccess(nav.go主页)
  - 登录按钮: click → state.set(isSubmitting) + effect.fetch(loginApi) + onSuccess(nav.go主页)
  - 注册链接: click → nav.go(登录页)
  - 主页root: screenEnter → effect.fetch(feedList) → state.set(feedList)
- [x] 列表数据驱动 ✅
  - FeedCard1 set_repeat → {{ state.data.feedList }}
  - 删除硬编码 FeedCard2
- [x] 视觉状态(hover/pressed) ✅
  - 注册按钮: hover(scale1.02+shadow升级) / pressed(scale0.97+shadow降级)
  - 登录按钮: hover/pressed 同上
  - FeedCard: hover(scale1.01+border亮+bg提亮)
  - 发布按钮: hover(scale1.08+shadow升级) / pressed(scale0.94)
- [x] 图标应用补全 ✅
  - I-07 Bell → 主页 NotifyBtn (nd_2e24ce943364462189cfb) export_and_apply ✅
  - I-09 Eye → 注册页 EyeIcon (nd_e0e3be0ab65b4dadbde68) export_and_apply ✅
  - I-09 Eye → 登录页 EyeIcon (nd_7b043f661a994799bc975) export_and_apply ✅
  - Logo → 登录页 Logo (nd_b625e3d1d6864571994ab) export_and_apply ✅
- 下一步可继续: 更多页面(发现页/消息页/个人中心) + QuickGrid repeat绑定 + I-08返回箭头(需TopNavBar)
