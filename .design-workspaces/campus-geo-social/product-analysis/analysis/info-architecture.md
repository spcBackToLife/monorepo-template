# 信息架构（Information Architecture）

> 本文档定义产品的页面清单、导航模式、跨页面流转关系，是后续 design-registry 骨架与 interaction-designer 的输入。
> 与 12 个模块文档的关系：每个页面对应 1 个或多个模块的具体落地页。

---

## 一、导航总览

### 全局导航（底部 Tab Bar，4 项）

| Tab | 名称 | 默认页面 | 对应模块 |
|:---:|------|---------|---------|
| 1 | 探索 | `01-home-map` 首页地图 | M1 |
| 2 | 捞 | `02-fishing-cast` 开网 | M2 |
| 3 | 消息 | `06-conversation-list` 消息列表 | M6 |
| 4 | 我的 | `10-profile-self` 我的主页 | M10 |

### 全局浮动按钮

- 主页地图右下角 `+` 浮动按钮 → 发布选择 sheet（动态 / 胶囊）

### 顶部一级入口

- 主页地图顶部：左上 校园切换按钮（M4）/ 右上 通知中心（M8）/ 中央 搜索（M12）

---

## 二、页面完整清单（按模块归类）

> 命名规则：`<两位数字模块ID>-<英文短名>`。两位数字保持 ID 排序稳定，便于 design-executor 按顺序处理。

### 系统层 / 0x 启动认证

| 页面 ID | 页面名 | 主要模块 | 类型 |
|---------|--------|---------|------|
| `00-splash` | 启动页 | M5 | 系统 |
| `00-onboarding` | 新用户引导 | M5 | 系统 |
| `00-login` | 登录页 | M5 | 业务 |
| `00-register` | 注册页 | M5 | 业务 |
| `00-forgot-password` | 忘记密码 | M5 | 业务 |
| `00-auth-school-select` | 选择学校 | M5 | 业务 |
| `00-auth-id-card` | 上传学生证（OCR） | M5 | 业务 |
| `00-auth-xuexin` | 学信网授权 | M5 | 业务 |
| `00-auth-face` | 人脸核身 | M5 | 业务 |
| `00-auth-status` | 认证状态等待 | M5 | 业务 |
| `00-profile-init` | 完善基础资料 | M5/M10 | 业务 |

### 1x 位置动态（M1）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `01-home-map` | 首页地图（默认主页） | 业务 |
| `01-home-feed` | 首页 Feed 列表模式 | 业务 |
| `01-moment-detail` | 动态详情 | 业务 |
| `01-publish-entry` | 发布入口选择（动态/胶囊） | 业务 |
| `01-publish-edit` | 编辑动态（媒体+文字+地点） | 业务 |
| `01-publish-pick-location` | 选择地点 | 业务 |
| `01-publish-visibility` | 设置可见性（公开/给好友/胶囊跳转） | 业务 |
| `01-publish-target-friends` | 选择投递好友（仅 friend_drop） | 业务 |
| `01-comments` | 评论列表（一般在详情底部弹起） | 业务 |

### 2x 捞网交友（M2）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `02-fishing-cast` | 开网（选择网类型） | 业务 |
| `02-fishing-result` | 撒网结果（卡片浏览） | 业务 |
| `02-greet-compose` | 招呼输入（破冰话术） | 业务 |
| `02-greets-received` | 收到的招呼列表 | 业务 |
| `02-greets-sent` | 发出的招呼列表 | 业务 |
| `02-fishing-collections` | 我的捞捕收藏 | 业务 |

### 3x 时空胶囊（M3）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `03-capsule-bury` | 埋胶囊（编辑） | 业务 |
| `03-capsule-list` | 我的胶囊（列表 + 地图） | 业务 |
| `03-capsule-riddle` | 解锁谜题答题 | 业务 |
| `03-capsule-open` | 开启胶囊（仪式动画 + 内容） | 业务 |

### 4x 跨校漫游（M4）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `04-campus-switch` | 校园选择/切换 | 业务 |
| `04-campus-plaza` | 校园广场（外校 Feed） | 业务 |
| `04-campus-detail` | 校园介绍页 | 业务 |

### 5x 用户认证管理（M5 高级）

实际归属在 11x 设置中（账号管理子项），不重复列。

### 6x 关系链（M6）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `06-conversation-list` | 消息列表（Tab 主页） | 业务 |
| `06-conversation` | 1v1 聊天页 | 业务 |
| `06-friends-list` | 好友列表 | 业务 |
| `06-friend-requests` | 好友请求 | 业务 |
| `06-add-friend` | 加好友（验证留言） | 业务 |

### 7x 经济（M7）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `07-wallet` | 钱包（双账本+背包） | 业务 |
| `07-tasks` | 任务中心 | 业务 |
| `07-shop` | 道具商店 | 业务 |
| `07-recharge` | 充值套餐 | 业务 |
| `07-recharge-result` | 充值结果 | 业务 |
| `07-coin-history` | 积分流水 | 业务 |
| `07-gem-history` | 钻石流水 | 业务 |

### 8x 通知（M8）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `08-notification-center` | 通知中心 | 业务 |

### 9x 安全审核（M9）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `09-report` | 举报页 | 业务 |
| `09-appeal` | 申诉页 | 业务 |
| `09-community-guidelines` | 社区公约 | 系统 |

### 10x 个人主页（M10）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `10-profile-self` | 我的主页（Tab） | 业务 |
| `10-profile-other` | 他人主页 | 业务 |
| `10-profile-edit` | 编辑资料 | 业务 |
| `10-footprints` | 我的足迹地图 | 业务 |

### 11x 设置与隐私（M11）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `11-settings` | 设置主菜单 | 业务 |
| `11-account-security` | 账号与安全 | 业务 |
| `11-change-password` | 修改密码 | 业务 |
| `11-devices` | 设备管理 | 业务 |
| `11-privacy` | 隐私设置 | 业务 |
| `11-blocks` | 黑名单 | 业务 |
| `11-notification-prefs` | 通知设置 | 业务 |
| `11-feedback` | 意见反馈 | 业务 |
| `11-about` | 关于 | 系统 |
| `11-logout-account` | 注销账号 | 业务 |

### 12x 搜索（M12）

| 页面 ID | 页面名 | 类型 |
|---------|--------|------|
| `12-search` | 搜索页 | 业务 |

---

## 三、页面统计

- 总计 **57** 个页面
- 业务页 **51** 个（须 fromModules 关联）
- 系统页 **6** 个（splash/onboarding/about/community-guidelines + 部分认证页）

---

## 四、关键页面流转（高频场景）

### 流转 A：首次启动 → 完成认证

```
00-splash → 00-onboarding → 00-login OR 00-register
    → (注册分支) 00-register → 00-auth-school-select 
    → 00-auth-id-card → 00-auth-xuexin → 00-auth-face → 00-auth-status
    → 00-profile-init → 01-home-map（主页）
```

### 流转 B：发布动态完整链路

```
01-home-map → 01-publish-entry → 01-publish-edit
    → 01-publish-pick-location → 01-publish-edit
    → 01-publish-visibility 
        ├── 公开：直接发布 → 回到 01-home-map（动态卡片飞入）
        ├── 给好友：01-publish-target-friends → 发布
        └── 胶囊：跳转到 03-capsule-bury（独立流程）
```

### 流转 C：捞网认识新朋友 → 加好友

```
01-home-map → (Tab 切换) → 02-fishing-cast → 02-fishing-result（卡片）
    → 02-greet-compose → 发送招呼
    → 对方接受 → 自动建立临时会话
    → 06-conversation（聊天）
    → (聊天中)→ 06-add-friend → 对方同意 → 永久好友
```

### 流转 D：胶囊埋藏与解锁

```
[埋藏]
01-home-map → 01-publish-entry → 03-capsule-bury → 完成 → 10-profile-self（胶囊地图可见）

[解锁]
通知触发 → 08-notification-center → 03-capsule-riddle (若有谜题) 
    → 03-capsule-open (仪式)
    → 操作：保存/分享/重新封存
```

### 流转 E：跨校漫游

```
01-home-map → 顶部"校园切换" → 04-campus-switch
    → 选择目标 → 04-campus-detail OR 04-campus-plaza
    → 浏览动态 → 01-moment-detail（外校模式，互动置灰）
    → 退出 → 回到 01-home-map（自校）
```

### 流转 F：私聊场景

```
06-conversation-list → 06-conversation
    → 内部操作：发文字/图片/语音/动态卡片/地点卡片
    → 长按消息 → 撤回/复制/转发/举报
    → 举报 → 09-report
```

### 流转 G：充值与购买道具

```
02-fishing-cast → 道具不足 → 弹底部 sheet 引导 → 07-shop / 07-recharge
    → 07-recharge → 选择套餐 → 唤起支付 → 07-recharge-result
    → 自动返回 02-fishing-cast 重试
```

### 流转 H：被处罚 → 申诉

```
任意页面 → 触发处罚事件 → 08-notification-center 收到处罚通知
    → 11-settings → 申诉记录入口 OR 直接 09-appeal
    → 提交申诉 → 等待处理（48h SLA）→ 收到结果通知
```

---

## 五、Tab 切换的页面关联

| Tab | 主页 | 二级入口 | 三级深度 |
|:---:|------|---------|---------|
| 探索 | `01-home-map` | `01-home-feed` / `04-campus-switch` / `12-search` / `08-notification-center` / `01-publish-entry` | 详情 / 编辑 |
| 捞 | `02-fishing-cast` | `02-greets-received` / `02-greets-sent` / `02-fishing-collections` | `02-fishing-result` / `02-greet-compose` |
| 消息 | `06-conversation-list` | `06-friend-requests` / `06-friends-list` | `06-conversation` |
| 我的 | `10-profile-self` | `10-profile-edit` / `10-footprints` / `07-wallet` / `03-capsule-list` / `11-settings` | 各类深度 |

---

## 六、模态页面（无 Tab，全屏覆盖）

部分页面是模态形式（push 进入但不属于 Tab 栈）：

- `01-publish-edit`、`03-capsule-bury` 等发布类（防中途切 Tab 丢失草稿）
- `00-auth-face` 人脸核身（必须独占体验）
- `07-recharge` 充值（独占防误操作）
- `06-add-friend` 加好友验证留言

---

## 七、深链与回退规则

- 用户从 push 通知进入：直接打开对应页面，但保留 Tab 栈
- 用户从分享链接进入：进入对应页面，但顶部 Tab Bar 隐藏（标记"来自分享"）
- 杀进程后再次启动：默认回 Tab 1 探索
- 多页跳转后回退：使用堆栈式回退（iOS 风格左滑/Android 系统返回）

---

## 八、为 design-registry 服务的总览

```
design-registry/
├── _index.json                      → 项目级（含 navigation 和 modules 登记）
└── pages/
    ├── _index.json                  → 57 个页面的清单
    ├── 00-splash/_page.json
    ├── 00-onboarding/_page.json
    ├── ...（每个页面一个目录 + _page.json）
    └── 12-search/_page.json
```

每个 `_page.json` 的 `product` 层来源：

- `summary` → 上方表中"页面名"扩展为一句话定位
- `ref` → 指向 `product-analysis/modules/Mxx-*.md#相关章节`
- `rules` → 从对应模块的 Step C 业务规则中提取关键 3-5 条
- `fromModules` → 上方表中"主要模块"
