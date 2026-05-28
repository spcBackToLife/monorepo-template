# 校园地理社交 App 产品需求文档（PRD V1.0）

> **task-name**: campus-geo-social
> **平台**: 原生 App（iOS + Android），viewport 393×852
> **风格**: 青春治愈风（D6）
> **状态**: Phase 3 完成，待 stage-gate 通过后移交 interaction-designer

---

## 一、产品概述

### 1.1 一句话定位

> 「以地理位置为锚、以时间为轴、以游戏化交互为催化剂的校园社交 App」

详见 [`overview.md`](./overview.md#11-一句话定位)。

### 1.2 核心价值

四大差异化支柱（与微信/小红书/Soul 等区分）：
1. **位置 × 时间触发的内容可见性**（不是关注关系，而是"路过 + 时间窗口"）
2. **游戏化交友**（捞网机制 + 道具系统 + 不确定性）
3. **时空胶囊**（让校园生活留下可被未来重逢的印记）
4. **跨校漫游**（在中国全部高校之间观察、漫游，但只看广场不看具体人）

### 1.3 目标用户

详见 [`overview.md#二目标用户与核心场景`](./overview.md#二目标用户与核心场景)。

| 人群 | 占比预期 | 关键诉求 |
|------|---------|---------|
| 在校大学生（主） | 80% | 校园破冰、暧昧期惊喜、生活记录 |
| 已毕业校友 | 10% | 回忆杀、看母校近况 |
| 跨校观察者 | 7% | 远观其他校园氛围 |
| 新生预热 | 3% | 入学前了解未来学校 |

### 1.4 关键产品决策

详见 [`analysis/key-decisions.md`](./analysis/key-decisions.md)。

| 决策 | 选项 |
|------|------|
| D1 投递目标 | 必须已是好友 |
| D2 学生认证 | 强认证（学信网 + 学生证 + 人脸） |
| D3 经济模式 | 任务赚 + 付费补充 双账本 |
| D4 跨校边界 | 仅看广场聚合，不见具体人 |
| D5 胶囊解锁 | 仅发布者本人到达 |
| D6 视觉风格 | 青春治愈（明亮 + 手绘） |

---

## 二、功能模块详细设计

12 个模块按 P0/P1/P2 分层。每个模块都有独立详细文档（见 `modules/`）。

### 核心玩法层（P0，全部 MVP 必做）

| 模块 | 文档 | 一句话核心 |
|------|------|-----------|
| **M1 位置动态** | [`M1-location-moment.md`](./modules/M1-location-moment.md) | 在地点发图文/视频，按 GPS+时间窗口决定谁能看到 |
| **M2 捞网交友** | [`M2-fishing-net.md`](./modules/M2-fishing-net.md) | 在某地撒网，趣味性捞出附近活跃用户卡片 |
| **M3 时空胶囊** | [`M3-time-capsule.md`](./modules/M3-time-capsule.md) | 给未来的自己埋信，多年后回到此地解锁 |
| **M4 跨校漫游** | [`M4-cross-campus.md`](./modules/M4-cross-campus.md) | 切换观察其他校园，仅看公开广场 |

### 支撑层（P0）

| 模块 | 文档 | 一句话核心 |
|------|------|-----------|
| **M5 用户与认证** | [`M5-user-auth.md`](./modules/M5-user-auth.md) | 强认证（学信网 + 人脸）+ 完整账号生命周期 |
| **M6 关系链** | [`M6-social-graph.md`](./modules/M6-social-graph.md) | 好友 + 临时会话 + 1v1 私聊 |
| **M7 经济** | [`M7-economy.md`](./modules/M7-economy.md) | 双账本：积分(任务) + 钻石(付费)，道具体系 |
| **M8 通知** | [`M8-notification.md`](./modules/M8-notification.md) | 多通道触达 + 偏好控制 + 强制类保护 |
| **M9 安全审核** | [`M9-content-safety.md`](./modules/M9-content-safety.md) | 三层审核 + 举报申诉 + 隐私数据保护 |

### 完整性层（P1/P2）

| 模块 | 文档 | 一句话核心 |
|------|------|-----------|
| **M10 个人主页** | [`M10-profile.md`](./modules/M10-profile.md) | 整合所有"我的xx"出口 + 足迹墙 |
| **M11 设置隐私** | [`M11-settings-privacy.md`](./modules/M11-settings-privacy.md) | 隐私偏好 + 一键隐私模式 |
| **M12 搜索** | [`M12-search.md`](./modules/M12-search.md) | 用户/校园/地点搜索（MVP 弱化） |

---

## 三、信息架构与页面规划

详见 [`analysis/info-architecture.md`](./analysis/info-architecture.md)。

### 3.1 全局导航

底部 4 Tab：探索 / 捞 / 消息 / 我的

### 3.2 页面统计

- 总页面数：**57**
- 业务页：51（须 fromModules 关联）
- 系统页：6（splash/onboarding/about 等）

### 3.3 关键页面流转

8 个高频流转链路（注册→认证、发动态、捞人加友、胶囊埋解、跨校漫游、私聊、充值、申诉），详见 IA 文档第四章。

---

## 四、数据架构概要

### 4.1 核心实体（汇总）

| 实体 | 来源模块 | 说明 |
|------|---------|------|
| User / UserProfile | M5 | 主用户 + 资料 |
| Identity | M5 | 学籍认证（敏感数据，独立加密） |
| School / Campus | M5/M4 | 学校字典 + 校区边界 |
| Moment / MomentMedia / MomentVisit / MomentLike / MomentComment | M1 | 动态及附属 |
| Capsule | M3 | 胶囊（与 Moment 1:1 关联） |
| FishingNet / FishingCatch / GreetRequest | M2 | 捞网过程 |
| Friendship / FriendRequest / Conversation / Message | M6 | 关系链与消息 |
| Wallet / CoinTx / GemTx / Item / RechargeOrder / Task | M7 | 经济体系 |
| Notification / DeviceToken | M8 | 通知 |
| ContentReview / UserReport / UserPunishment / Appeal | M9 | 安全审核 |
| UserPrivacyPrefs / UserNotificationPrefs / UserAppPrefs | M11 | 用户偏好 |
| BlockRecord | M2/M6/M11 | 拉黑（多模块共用） |

### 4.2 接口数量预估

按模块统计：~80 个 RESTful 接口（不含 IM 长连接 / 三方支付回调 / OAuth 跳转 / OPA 审核内部接口）

### 4.3 实时通信

- **私聊** M6：长连接（WebSocket / 第三方 IM 服务）
- **位置触发** M1/M3：客户端 GPS 节流上报 + 服务端二次校验
- **通知** M8：APNs / FCM / 厂商推送通道

---

## 五、非功能需求

### 5.1 性能

- 首页冷启动 < 3s（4G 网络）
- 地图加载 + 动态点位渲染 < 2s
- 私聊消息送达延迟 < 1s（在线场景）
- 视频上传带宽自适应（高清/标清切换）

### 5.2 安全

- 全链路 HTTPS
- 敏感数据加密存储（AES-256），密钥分离
- 学信网/人脸数据 6 个月后清理原始照片，保留特征
- 内容审核 SLA：L0/L1 高风险 < 5 min，L2 < 1 hr

### 5.3 隐私（重中之重）

- 默认偏隐私（详见 M11 默认值）
- GPS 历史轨迹**不存储**
- 用户位置仅用于功能判定，不构成画像
- 隐私模式一键开启，全方位收紧

### 5.4 兼容性

- iOS 14+ / Android 9+（覆盖目标用户主流机型 ≥ 95%）
- 屏幕适配：iPhone SE 至 iPhone Pro Max 全系
- 弱网兜底：所有关键流程有离线缓存或重试

### 5.5 合规

- ICP 备案 + 增值电信许可（依赖虚拟币业务）
- 用户协议 / 隐私政策 / 社区公约（M9）
- 实名注册一证一号
- 违规内容存证 ≥ 6 个月

---

## 六、MVP 范围与里程碑

### 6.1 V1.0 范围（本期）

详见 `overview.md#四mvp-范围`。

最小可玩闭环：
```
注册 → 强认证 → 选主校园
→ 地图首页（看附近动态）
→ 发动态（公开/给好友/胶囊）
→ 开网捞人 → 打招呼 → 临时会话 → 加好友 → 永久私聊
→ 跨校切换看广场
→ 我的足迹/胶囊/钱包/设置
```

### 6.2 V1.x 规划（后续）

- 性别筛选（M2 V1.x）
- 时光戳道具（M3 V1.x）
- 群聊（M6 V1.x）
- 暗色模式（M11 V1.x）
- 海外/港澳台学生支持（M5 V1.x）
- 全网（非校园）广场（M4 V1.x）
- "全球"广场标志地点运营功能（M4 V1.x）

### 6.3 长期愿景

校园社交 → 校友社交 → 跨届校友联结网络

---

## 七、风险清单（汇总）

详见各模块的"风险标记"小节。

| 风险等级 | 来源 | 描述 | 主要缓解 |
|---------|------|------|---------|
| 🔴 高 | M5 | 强认证导致注册转化率低 | 游客试看 + 友好引导 + 备用人审 |
| 🔴 高 | M7/合规 | 虚拟币需 ICP 增值/网游许可 | 立项前牌照流程；虚拟道具包装 |
| 🔴 高 | M9 | 私聊监控引发隐私争议 | 仅关键词实时拦 + 举报后审 |
| 🔴 高 | M2 | 偏离定位 → 沦为陌生人速配 | MVP 不做性别筛选；卡片不主推颜值 |
| 🟡 中 | M1 | GPS 精度差 → 触发不准 | 默认 200m + 用户可调 |
| 🟡 中 | M3 | 长期休眠账号胶囊处理 | 注销前必须确认 + 封存模式 |
| 🟡 中 | M2 | 高活跃用户被骚扰 | 单日被招呼上限 + 系统降权 |
| 🟡 中 | M4 | 校园数据维护成本 | MVP 仅大陆全日制本/硕/博 |

---

## 八、附录

### 8.1 术语表

| 术语 | 含义 |
|------|------|
| 公开动态 | visibility=public 的 Moment，可见性按 GPS+时间窗口 |
| 投递 | visibility=friend_drop 的 Moment，定时定点给好友的小惊喜 |
| 胶囊 | visibility=capsule_self 的 Moment + Capsule 关联，仅本人多年后到达可解锁 |
| 撒网 / 开网 | M2 主行为：在某地点发起 FishingNet 事件 |
| 捞到 | 撒网后系统返回的 FishingCatch 记录 |
| 招呼 | GreetRequest，对捞到的人发起的破冰请求 |
| 临时会话 | 招呼通过后建立的 7 天有效期会话 |
| 主校园 | 用户当前归属的校园（与认证的学籍一致） |
| 漫游 | 切换到其他校园观察广场 |

### 8.2 阶段产物清单

```
.design-workspaces/campus-geo-social/
├── STATUS.md
├── product-analysis/
│   ├── overview.md                      ← Phase 1 全局框架
│   ├── analysis/
│   │   ├── key-decisions.md             ← 6 项关键决策
│   │   └── info-architecture.md         ← 信息架构
│   ├── modules/                         ← Phase 2 12 个模块
│   │   ├── M1-location-moment.md
│   │   ├── M2-fishing-net.md
│   │   ├── M3-time-capsule.md
│   │   ├── M4-cross-campus.md
│   │   ├── M5-user-auth.md
│   │   ├── M6-social-graph.md
│   │   ├── M7-economy.md
│   │   ├── M8-notification.md
│   │   ├── M9-content-safety.md
│   │   ├── M10-profile.md
│   │   ├── M11-settings-privacy.md
│   │   └── M12-search.md
│   └── PRD.md                           ← 本文档（Phase 3 汇总）
└── design-registry/                     ← Phase 3 骨架（下方创建）
    ├── _index.json
    └── pages/
        ├── _index.json
        └── <id>/_page.json × 57
```

### 8.3 下游技能衔接

| 当前产出 | 下游技能 | 消费方式 |
|---------|---------|---------|
| PRD + 模块 md + IA | interaction-designer | 为每页设计状态机/操作清单 |
| 数据模型概要 | data-model-designer（V1.x） | 细化为 schema |
| API 清单 | api-designer（V1.x） | 细化为接口定义 |
| D6 视觉风格基调 | theme-generator | 输出 design tokens |
| design-registry 骨架 | 全链路 | 唯一结构化数据源，逐层追加 |

---

> **下一步**：运行 stage-gate（product exit），通过后即可移交 interaction-designer。
