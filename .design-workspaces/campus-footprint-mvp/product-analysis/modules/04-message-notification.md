# 消息 & 通知体系 — 详细设计

---

## 一、用户故事

| # | 角色 | 故事 | 价值 |
|---|------|------|------|
| S1 | 被打招呼者 | 有人捞到我并打招呼，我想看看对方是谁 | 好奇、社交 |
| S2 | 打招呼者 | 对方回复了我，想继续聊天 | 社交闭环 |
| S3 | 动态发布者 | 有人点赞/评论了我的位置动态 | 成就感 |
| S4 | 定向接收者 | 走到某个位置时收到推送说有人给我留言 | 惊喜 |
| S5 | 用户 | 不想被太多通知打扰 | 控制感 |

---

## 二、消息类型划分

### 2.1 私信（一对一）

**进入方式**：
- 捞人打招呼 → 对方回复 → 自动建立对话
- 个人主页「发消息」（需双方互相关注或已有对话）

**消息格式**：
- 文字（≤500字）
- 图片（≤3张/条）
- 位置卡片（分享一个位置动态给对方）
- 表情包

**规则**：
- 陌生人首条消息只能通过「打招呼」发出
- 未互相关注：每天最多发3条消息给同一人（防骚扰）
- 互相关注后：无限制
- 消息已读状态：对方可见

### 2.2 系统通知

| 通知类型 | 触发条件 | 推送优先级 |
|---------|---------|-----------|
| 定向动态到达 | 走到有人给我留动态的位置 | 🔴 高（立即推送） |
| 被捞到+打招呼 | 有人在捞人时向我打招呼 | 🔴 高 |
| 打招呼被回复 | 对方回复了我的打招呼 | 🔴 高 |
| 动态被点赞 | 我的动态被人点赞 | 🟡 中（聚合推送） |
| 动态被评论 | 我的动态被人评论 | 🟡 中 |
| 定向已读回执 | 我的定向动态被目标用户查看 | 🟡 中 |
| 附近有新动态 | 10米内出现新的公开动态 | 🟢 低（静默/仅App内） |
| 系统公告 | 运营活动/版本更新 | 🟢 低 |

### 2.3 位置触发通知（特殊）

这是产品核心体验的一部分：

```
触发条件：用户GPS进入某条定向动态的10米范围 + 停留≥3秒
推送内容：「有人在这里给你留了一条悄悄话 💌」
点击行为：打开App → 直接展示该动态
推送方式：
├── iOS: APNs + 地理围栏触发
├── Android: FCM + Geofence API
└── 降级方案：App在后台时定期检测位置
```

---

## 三、推送策略

### 3.1 频率控制

| 规则 | 值 |
|------|------|
| 同类通知聚合 | 5分钟内多次点赞合并为「xx等N人赞了你」|
| 每小时推送上限 | 5条 |
| 免打扰时段 | 23:00-07:00（用户可自定义） |
| 位置触发例外 | 定向动态到达不受免打扰限制（用户选择接收） |

### 3.2 通知偏好设置

```
通知设置页：
├── 私信通知：开/关
├── 捞人通知：开/关
├── 动态互动通知：开/关
├── 位置触发通知：开/关（强烈建议开启）
├── 免打扰时段：开始时间-结束时间
└── 振动/声音：开/关
```

---

## 四、数据模型

```
Conversation（对话）
├── id: string
├── participants: string[] (两个user_id)
├── last_message_id: string?
├── last_message_at: timestamp?
├── created_at: timestamp
└── status: enum (ACTIVE | BLOCKED | DELETED)

Message（消息）
├── id: string
├── conversation_id: string (FK)
├── sender_id: string
├── type: enum (TEXT | IMAGE | LOCATION_CARD | EMOJI)
├── content: string | { urls } | { moment_id }
├── status: enum (SENT | DELIVERED | READ)
├── created_at: timestamp
└── read_at: timestamp?

Notification（通知）
├── id: string
├── user_id: string (接收者)
├── type: enum (上述通知类型)
├── title: string
├── body: string
├── payload: JSON (跳转参数)
├── is_read: boolean
├── created_at: timestamp
└── pushed_at: timestamp?

LocationTrigger（位置触发器）
├── id: string
├── moment_id: string (关联的定向动态)
├── target_user_id: string
├── location: { lat, lng }
├── radius: 10 (米)
├── time_window: { start?, end? }
├── status: enum (ACTIVE | TRIGGERED | EXPIRED)
├── triggered_at: timestamp?
└── created_at: timestamp
```

### 核心接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/conversations | 对话列表 |
| GET | /api/conversations/:id/messages | 消息列表（分页） |
| POST | /api/conversations/:id/messages | 发送消息 |
| PUT | /api/conversations/:id/read | 标记已读 |
| GET | /api/notifications | 通知列表 |
| PUT | /api/notifications/read-all | 全部已读 |
| PUT | /api/users/me/notification-prefs | 更新通知偏好 |

---

## 五、交互设计要点

- 消息Tab：顶部分段（私信 / 互动 / 系统），红点区分
- 私信列表：头像+昵称+最后一条消息预览+时间+未读数
- 位置触发通知：特殊样式推送卡片（金色边框+位置地图缩略图）
- 聊天页：气泡式，左对方右自己，支持长按复制/删除
- 陌生人首次对话：顶部提示「对方通过捞人向你打招呼」
- 空状态：「还没有消息，去捞人认识新朋友吧 🎣」

---

## 六、模块间依赖

```
消息 & 通知体系
├── 依赖：用户体系、位置动态（触发源）、捞人（打招呼源）
├── 被依赖：无（终端模块）
└── 关联：推送服务（APNs/FCM）、位置服务（围栏触发）
```
