# 11 - 协作与同步

> **根本问题：如何让人和 AI 实时协作编辑？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [01-中央画布](../01-canvas/README.md) — 远程操作到达后画布重渲染
> - [design-mcp](../../../03-tech/design-mcp.md) — MCP Server 架构
> - [event-sourcing](../../../03-tech/event-sourcing.md) — 操作日志 + 快照存储
> - [backend](../../../03-tech/backend.md) — WebSocket 网关 + REST API

---

## 一、第一性原理：协作系统解决什么根本问题？

### 1.1 本质推导

```
我们的编辑器有两个操作来源：

  来源 A: 人类设计师 → 在画布上拖拽、在面板中编辑
  来源 B: AI → 通过 Cursor/Claude Code 发出 MCP Tool Call

两个来源同时修改同一份 Schema → 必须解决：

  1. 同步问题 → AI 改了 Schema，前端画布怎么知道要刷新？
  2. 去重问题 → 人的操作上报后端，后端 WebSocket 推回来，前端不能重复执行
  3. 冲突问题 → 人和 AI 同时改同一个元素的同一个属性怎么办？
  4. 一致性问题 → 如何保证最终 Schema 对所有端一致？

当前阶段（1 人 + 1 AI）：这些问题有简化解法
远期（多人 + 多 AI）：需要 OT/CRDT 等完整协作方案
```

### 1.2 协作的演进路线

```
Phase 1 — 单人 + AI（当前目标）
  · 一个人类设计师 + Cursor/Claude Code 作为 AI 助手
  · 人和 AI 不会真正"同时"操作（人在说话时 AI 在执行，AI 执行时人在等待）
  · 冲突极少，简单的"后写入者胜出"即可
  · 核心需求：AI 操作后画布实时更新

Phase 2 — 单人 + 多 AI（近期）
  · 一个人同时使用多个 AI 工具（Cursor + Claude Code + 自建 AI 面板）
  · 多个 AI 可能并发操作 → 需要操作排序
  · 仍然只有一个人类用户 → 选中状态不冲突

Phase 3 — 多人 + 多 AI（远期）
  · 多个人类设计师同时编辑同一个页面
  · 需要：光标同步、选区冲突解决、OT/CRDT
  · 类似 Figma 的多人实时协作体验
```

### 1.3 设计原则

```
1. 本地优先 → 人的操作先本地执行（即时反馈），再异步持久化
2. 最终一致 → 所有端最终看到相同的 Schema（通过操作序号排序保证）
3. 静默同步 → AI 操作实时反映到画布，无需用户手动刷新
4. 可回溯 → 每个操作都记录来源（人/AI），可以精确撤销任何一方的操作
5. 渐进增强 → 先实现单人+AI，架构预留多人扩展能力
```

---

## 二、双通道架构

### 2.1 完整数据流

```
┌────────────────────────────────────────────────────────────────────┐
│                        双通道协作架构                               │
│                                                                    │
│  通道 A: 人类操作（前端直接）                                       │
│                                                                    │
│  设计师在画布/面板中操作                                            │
│       │                                                            │
│       ▼                                                            │
│  OperationExecutor.execute(op)                                     │
│       │                                                            │
│       ├──(1) MobX Store 更新 → 画布即时重渲染（< 16ms）            │
│       │                                                            │
│       └──(2) 进入异步持久化队列                                     │
│              │                                                     │
│              ▼  每 1.2s 批量 flush                                 │
│         POST /api/projects/:id/operations/batch                    │
│              │                                                     │
│              ▼                                                     │
│         design-api 写入 Operation Log                              │
│              │                                                     │
│              ├──(3) WebSocket 广播（包含操作指纹）                  │
│              │       │                                             │
│              │       ▼                                             │
│              │  前端收到 → 指纹匹配 → 跳过（回声去重）              │
│              │                                                     │
│              └──(4) 检查快照策略（每 100 次创建快照）               │
│                                                                    │
│  ──────────────────────────────────────────────────────────────── │
│                                                                    │
│  通道 B: AI 操作（通过 MCP）                                       │
│                                                                    │
│  Cursor/Claude Code 发出 MCP Tool Call                             │
│       │                                                            │
│       ▼                                                            │
│  MCP Server 接收 → 调用 design-api REST 接口                       │
│       │                                                            │
│       ▼                                                            │
│  POST /api/projects/:id/operations                                 │
│       │                                                            │
│       ▼                                                            │
│  design-api 执行操作                                               │
│       │                                                            │
│       ├──(1) 写入 Operation Log                                    │
│       │                                                            │
│       └──(2) WebSocket 广播                                        │
│              │                                                     │
│              ▼                                                     │
│         前端收到 → 指纹不匹配 → 应用操作 → 画布重渲染              │
│                                                                    │
│  两个通道共享：                                                     │
│  · 同一套 Operation 定义 (@globallink/design-operations)           │
│  · 同一个 Operation Log（统一的操作序列）                          │
│  · 同一个 WebSocket 连接（广播所有操作）                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 操作标识

```typescript
// 每个操作在提交时附加元数据
interface OperationEnvelope {
  id: string;                   // 操作唯一 ID (UUID)
  fingerprint: string;          // 操作指纹（用于回声去重）
  operation: Operation;         // 操作本体
  author: OperationAuthor;      // 操作来源
  clientTimestamp: number;      // 客户端时间戳
  seq?: number;                 // 服务端分配的序号（持久化后回填）
}

type OperationAuthor =
  | { type: "user"; userId: string; userName: string }
  | { type: "ai"; tool: "cursor" | "claude-code" | "mcp-client"; sessionId?: string };

// 指纹生成（用于去重）
function generateFingerprint(op: Operation): string {
  // 基于操作类型 + 参数 + 客户端时间戳生成哈希
  return hash(JSON.stringify({ type: op.type, params: op.params, ts: Date.now() }));
}
```

---

## 三、WebSocket 消息协议

### 3.1 连接建立

```
前端打开设计项目时：
  1. 加载项目 Schema（REST API）
  2. 建立 WebSocket 连接: ws://host/ws/projects/:projectId
  3. 发送握手消息 → 服务端确认 → 连接就绪

握手消息:
  → { type: "handshake", clientId: "xxx", lastSeq: 150 }
  ← { type: "handshake_ack", currentSeq: 152, missedOps: [...] }
     ↑ 如果客户端落后，服务端推送缺失的操作
```

### 3.2 消息类型

```typescript
// 客户端 → 服务端
type ClientMessage =
  | { type: "handshake"; clientId: string; lastSeq: number }
  | { type: "ping" }
  // 操作通过 REST API 提交，不走 WebSocket

// 服务端 → 客户端
type ServerMessage =
  | { type: "handshake_ack"; currentSeq: number; missedOps: OperationEnvelope[] }
  | { type: "operation"; envelope: OperationEnvelope }      // 有新操作
  | { type: "batch_operations"; envelopes: OperationEnvelope[] }  // 批量操作
  | { type: "pong" }
  | { type: "error"; code: string; message: string }
  // 远期扩展
  | { type: "cursor_move"; userId: string; position: { x: number; y: number } }
  | { type: "selection_change"; userId: string; nodeIds: string[] }
  | { type: "user_join"; userId: string; userName: string }
  | { type: "user_leave"; userId: string }
```

### 3.3 心跳保活

```
心跳策略:
  · 客户端每 30s 发送 ping
  · 服务端回复 pong
  · 如果 60s 内没收到 pong → 客户端判定连接断开 → 触发重连
  · 服务端如果 90s 内没收到 ping → 清除该客户端的会话
```

---

## 四、回声去重

### 4.1 问题描述

```
当人类设计师在前端操作时，数据流是这样的:

  1. 前端执行操作 → MobX Store 更新 → 画布渲染（本地已应用）
  2. 操作异步上报 → design-api 持久化 → WebSocket 广播
  3. 前端收到 WebSocket 消息 → 这就是自己刚提交的操作！

如果前端对步骤 3 的消息再执行一次 → 操作会被应用两次 → Schema 错误

解法: 回声去重 —— 用操作指纹识别"自己发出的操作"
```

### 4.2 去重算法

```typescript
class EchoDeduplicator {
  // 本地待确认的操作指纹集合
  private pendingFingerprints = new Set<string>();

  // 本地操作提交时记录指纹
  onLocalOperation(envelope: OperationEnvelope) {
    this.pendingFingerprints.add(envelope.fingerprint);
  }

  // WebSocket 收到操作时判断是否为回声
  onRemoteOperation(envelope: OperationEnvelope): boolean {
    if (this.pendingFingerprints.has(envelope.fingerprint)) {
      // 是自己发出的操作 → 跳过，不重复执行
      this.pendingFingerprints.delete(envelope.fingerprint);
      // 但更新 seq 号（服务端分配的权威序号）
      return false; // 不需要应用
    }
    return true; // 来自其他端（AI/其他用户），需要应用
  }

  // 定期清理过老的指纹（防止内存泄漏）
  cleanup(maxAge: number = 30_000) {
    // 30s 前的指纹不可能再回来，清除
  }
}
```

### 4.3 完整的消息处理流程

```
WebSocket 收到 operation 消息:

  1. 提取 envelope.fingerprint
  2. deduplicator.onRemoteOperation(envelope)
     │
     ├── 返回 false（是回声）→ 跳过，仅记录 seq 号
     │
     └── 返回 true（是远程操作）
         │
         ├── 检查 seq 连续性
         │   · 期望 seq = lastSeq + 1
         │   · 如果有间隙（漏了几个 op）→ 请求补发
         │
         ├── 应用操作到 MobX Store
         │   · OperationExecutor.execute(envelope.operation)
         │   · 画布自动重渲染
         │
         ├── 更新 lastSeq
         │
         └── UI 反馈（可选）
             · 画布右下角短暂显示: "🤖 AI 修改了 div.header 的样式"
             · 1.5s 后自动消失
```

---

## 五、冲突处理

### 5.1 当前阶段：后写入者胜出 (Last Writer Wins)

```
当前阶段（单人+AI）冲突场景极少:
  · 人在操作时 AI 通常在等待指令
  · AI 在执行时人通常在等待结果

即使偶尔冲突（人和 AI 同时修改同一个元素）:
  → 操作按到达 design-api 的时间排序
  → 后到的覆盖先到的
  → 这就是 Last Writer Wins

为什么 LWW 在当前阶段可以接受:
  · 冲突频率极低（一个人 + 一个 AI 几乎不会真正并发）
  · 所有操作可撤销（Cmd+Z 回滚任何误操作）
  · 操作日志完整（可以精确定位和恢复）
```

### 5.2 冲突场景分析

```
场景 1: 不同元素（无冲突）
  人: updateStyle(nodeA, { color: "red" })
  AI: updateStyle(nodeB, { fontSize: "16px" })
  → 完全独立，按序执行即可

场景 2: 相同元素不同属性（弱冲突）
  人: updateStyle(nodeA, { color: "red" })
  AI: updateStyle(nodeA, { fontSize: "16px" })
  → 不冲突，两个属性各自生效

场景 3: 相同元素相同属性（强冲突）
  人: updateStyle(nodeA, { color: "red" })
  AI: updateStyle(nodeA, { color: "blue" })
  → LWW: 后到的覆盖先到的
  → 如果 AI 的后到 → color = "blue"
  → 人可以 Cmd+Z 撤销 AI 的操作

场景 4: 结构冲突
  人: removeElement(nodeA)
  AI: updateStyle(nodeA, { color: "red" })
  → nodeA 已被删除 → AI 的操作找不到目标 → 静默忽略 + 记录警告

处理策略:
  · 场景 1-2: 正常执行
  · 场景 3: LWW（接受，可撤销）
  · 场景 4: 目标不存在 → 忽略 + 警告
```

### 5.3 远期：操作转换 (OT) — 架构预留

```
多人协作阶段需要 OT (Operational Transformation) 或 CRDT:

OT 的核心思想:
  两个并发操作 opA 和 opB
  → transform(opA, opB) → opA' 和 opB'
  → 无论先执行 opA+opB' 还是 opB+opA'，最终状态一致

当前架构的 OT 友好性:
  · 操作是原子化的（Operation 粒度小）→ 适合 OT
  · 有全局序号 (seq) → 天然的因果序
  · Event Sourcing 存储 → 可以重放任何历史

OT 的实现时机: Phase 3（多人协作时）
当前不实现，但架构不阻碍未来添加。
```

---

## 六、异步持久化策略

### 6.1 批量 Flush 机制

```
前端操作的持久化不是实时逐条的，而是批量的:

┌──────────────────────────────────────────┐
│  异步持久化队列                            │
│                                          │
│  op1 → op2 → op3 → op4                  │
│  │                                       │
│  │  1.2s 定时 flush                      │
│  ▼                                       │
│  POST /operations/batch { ops: [1,2,3,4] }│
│  │                                       │
│  ├── 成功 → 清除队列 → 服务端广播 WS     │
│  │                                       │
│  └── 失败 → 保留队列 → 3s 后重试         │
│             重试次数 < 5 → 继续重试       │
│             重试次数 ≥ 5 → 提示用户       │
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 触发矩阵

```
┌──────────────────────┬─────────────────────────────────────────┐
│  触发条件              │  行为                                   │
├──────────────────────┼─────────────────────────────────────────┤
│  定时窗口 (1.2s)     │  批量 flush 队列中所有操作              │
│  队列满 (>50 条)     │  立即 flush（不等定时窗口）             │
│  页面隐藏/关闭       │  立即 flush（navigator.sendBeacon 兜底）│
│  手动保存 (Cmd+S)    │  强制 flush + 等待确认 + 创建快照       │
│  关键操作 (导出/发布) │  强制 flush + 等待确认                  │
│  离线状态            │  入 IndexedDB 缓存 → 恢复后续传          │
└──────────────────────┴─────────────────────────────────────────┘
```

### 6.3 保存状态指示器

```
顶部工具栏右侧显示保存状态:

  ✅ 已保存           → 队列为空，所有操作已持久化
  🔄 保存中...        → 正在 flush
  ⚠️ 保存失败 [重试]  → flush 失败，提供手动重试按钮
  📵 离线 (12 条待同步) → 网络断开，操作缓存到本地

视觉规范:
  · 位置: 顶部工具栏最右侧
  · 正常状态 (✅): 灰色小字，不抢注意力
  · 保存中 (🔄): 灰色旋转图标
  · 失败 (⚠️): 橙色警告 + 可点击重试
  · 离线 (📵): 黄色标签 + 待同步数量
```

---

## 七、断线重连

### 7.1 重连策略

```
WebSocket 断开后的重连流程:

  检测到断开
       │
       ├── 1s 后第一次重连尝试
       │   失败 → 2s 后重试
       │   失败 → 4s 后重试
       │   失败 → 8s 后重试
       │   ...指数退避，最大间隔 30s
       │
       ▼
  重连成功
       │
       ├── 发送握手: { type: "handshake", lastSeq: 150 }
       │
       ▼
  服务端检查: 当前 seq = 158 → 客户端落后 8 条操作
       │
       ├── 回复: { missedOps: [op_151...op_158] }
       │
       ▼
  客户端依次应用缺失的操作 → Schema 追上最新版本 → 画布刷新
```

### 7.2 离线缓存（增强功能，Phase 3）

```
网络完全不可用时:

  1. 操作仍然本地执行（画布正常响应）
  2. 操作存入 IndexedDB 离线队列
  3. 顶部显示 📵 离线标签
  4. 网络恢复后:
     a. WebSocket 重连
     b. 获取缺失的远程操作
     c. 合并本地离线操作与远程操作
     d. 按时间戳排序提交到服务端
     e. 清除 IndexedDB 缓存

  冲突处理:
    离线期间如果 AI 也修改了 Schema → 可能有冲突
    → LWW 策略: 离线操作的时间戳通常更晚 → 离线操作覆盖
    → 如果结果不对 → 用户可以 Cmd+Z 撤销
```

---

## 八、AI 操作的实时反馈

### 8.1 AI 操作的可见性

```
当 AI（通过 MCP）执行操作时，前端需要让用户感知到"AI 在做什么":

视觉反馈 1: 画布实时变化
  · AI 修改样式 → 画布上对应元素立即更新
  · AI 添加元素 → 新元素在画布上出现
  · AI 删除元素 → 元素从画布上消失
  这是核心反馈——画布就是 AI 操作的"直播"

视觉反馈 2: 操作通知（Toast）
  · 画布右下角显示短暂的操作摘要:
    ┌──────────────────────────────┐
    │ 🤖 AI: 修改了 button.submit │
    │    的背景色为 #FF6B00       │
    └──────────────────────────────┘
  · 1.5s 后自动淡出
  · 连续多条 → 堆叠显示，最多 3 条

视觉反馈 3: 操作来源标记
  · 撤销/重做时 tooltip 显示操作来源:
    "撤销: AI 修改了 div.header 的样式"
    "撤销: 用户移动了 button.submit"
```

### 8.2 AI 操作的撤销

```
AI 的操作与人的操作在 undo 栈中统一管理:

  操作历史（统一时间线）:
    #150 [用户] updateStyle(nodeA, { color: "red" })
    #151 [AI]   addElement(nodeB, div, {...})
    #152 [AI]   updateStyle(nodeB, { background: "#0D99FF" })
    #153 [用户] moveElement(nodeA, newParent)
    #154 [AI]   addEvent(nodeB, click, navigate)

  Cmd+Z:
    · 撤销 #154 → AI 的 addEvent 被撤销
    · 再次 Cmd+Z → 撤销 #153 → 用户的 moveElement 被撤销
    · 不区分来源 → 统一按时间线撤销

  远期可选: 选择性撤销
    · "只撤销 AI 的最近操作"（不影响用户自己的操作）
    · 需要按 author 过滤 undo 栈 → Phase 3
```

---

## 九、多人协作预留（远期 Phase 3）

### 9.1 光标同步

```
多人同时编辑时，每个人的鼠标位置需要实时同步:

  客户端每 100ms 发送: { type: "cursor_move", position: { x: 200, y: 300 } }
  其他客户端收到后:
    · 在画布上显示该用户的光标（带用户名标签和颜色）
    · 光标颜色由用户 ID 确定（蓝/绿/橙/紫 轮换）

  ┌──────────────────────────────────┐
  │                                  │
  │   [张三 🔵]                      │  ← 张三的光标 + 名字标签
  │      ↖                           │
  │                                  │
  │              ↖ [李四 🟢]          │  ← 李四的光标
  │                                  │
  └──────────────────────────────────┘
```

### 9.2 选区冲突

```
多人选中同一个元素:

  · 张三选中 nodeA → 蓝色边框
  · 李四也选中 nodeA → 绿色边框（叠加显示）
  · 两人都可以编辑该元素的属性
  · 冲突 → OT 处理（远期）

选区排他锁（可选策略）:
  · 张三选中 nodeA → nodeA 对李四显示"被张三编辑中"锁定图标
  · 李四可以看到 nodeA 的实时变化但不可编辑
  · 张三取消选中后锁释放
  · 过于严格 → 仅在 Phase 3 考虑
```

### 9.3 用户在线状态

```
WebSocket 连接管理:

  · 用户连接 → broadcast: { type: "user_join", userId, userName }
  · 用户断开 → broadcast: { type: "user_leave", userId }

  顶部工具栏右侧显示在线用户头像:
    [🔵张] [🟢李] [🟠AI]

  hover 头像 → 显示用户名 + 当前正在编辑的页面
```

---

## 十、与其他子系统的接口约定

### 10.1 协作系统 → 画布 (01-canvas)

```typescript
// 远程操作到达时画布的更新
// 不直接调用画布 API，而是通过 MobX Store:
// 1. 操作应用到 Store → 2. 画布自动响应式重渲染

// 远期：光标同步
interface RemoteCursorOverlay {
  updateCursor(userId: string, position: { x: number; y: number }): void;
  removeCursor(userId: string): void;
}
```

### 10.2 协作系统 → Operations

```typescript
// 所有操作通过 OperationExecutor 执行
// 协作系统的核心是 Operation 的传输和同步
// OperationExecutor 不关心操作来自本地还是远程

// 本地操作
executor.execute(op);  // 本地执行 + 加入持久化队列

// 远程操作（WebSocket 收到）
executor.applyRemote(op);  // 仅本地执行，不再上报
```

### 10.3 协作系统 → Event Sourcing

```typescript
// 协作系统依赖 Event Sourcing 提供:
// · 操作序号 (seq) → 排序依据
// · 操作日志 → 断线重连时补发缺失操作
// · 快照 → 新客户端加入时快速加载

// 接口已由 design-api 的 REST + WebSocket 提供
// 前端不直接操作数据库
```

---

## 十一、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| AI 连续发出 20 条操作 | 前端逐条应用 + 每条触发画布重渲染（requestAnimationFrame 节流）|
| AI 修改了正在编辑的元素 | 属性面板值更新；如果用户正在输入框中编辑 → 不打断输入（blur 时才提交）|
| AI 删除了用户选中的元素 | 自动清除选中状态 + 提示 "AI 删除了 xxx" |
| 网络断开 > 5 分钟 | 重连后补发缺失操作；如果缺失操作 > 1000 条 → 重新加载快照 |
| 两个 AI 同时操作 | LWW，按 design-api 收到的顺序排序 |
| WebSocket 连接被防火墙阻断 | 降级为轮询模式（每 3s 拉取最新操作）|
| 批量 flush 部分成功部分失败 | 失败的操作保留在队列中重试；成功的从队列移除 |
| 用户在离线时做了大量操作（>100）| 恢复网络后全部上传；如果与远程冲突 → LWW |
| 服务端重启 | 客户端 WebSocket 断开 → 自动重连 → 握手补发缺失操作 |
| 操作序号不连续（网络问题导致漏消息）| 检测到 seq 间隙 → REST 请求补发: GET /operations?since=lastSeq |

---

## 十二、MVP 与后期功能分界

### MVP（Phase 5，所有子系统完成后）

- [x] WebSocket 连接建立 + 握手协议 <!-- W7-011 -->
- [x] 消息协议: operation / batch_operations / handshake <!-- W7-011 -->
- [x] 心跳保活 (ping/pong, 30s 间隔) <!-- W7-011 Socket.IO 内置 ping/pong -->
- [x] 回声去重 (EchoDeduplicator) <!-- W7-012 -->
- [x] 远程操作实时应用到画布 <!-- W7-012 -->
- [x] 异步持久化队列 (1.2s 批量 flush) <!-- W7-013 -->
- [x] 保存状态指示器 (✅/🔄/⚠️) <!-- W7-014 SaveStatusIndicator -->
- [x] AI 操作通知 Toast <!-- W7-014 AiOperationToast -->
- [x] 断线自动重连 (指数退避) <!-- W7-013 SyncManager -->
- [x] 重连后补发缺失操作 <!-- W7-013 -->

### Phase 6（增强同步能力）

- [ ] 离线缓存 (IndexedDB)
- [ ] 离线操作合并与上传
- [ ] AI 操作来源标记（撤销时显示"AI: xxx"）
- [ ] 选择性撤销（只撤销 AI / 只撤销用户）
- [ ] 保存状态: 离线计数 (📵 12 条待同步)
- [ ] 操作序号间隙检测 + 自动补发
- [ ] 降级轮询模式（WebSocket 不可用时）

### Phase 7（多人协作，远期）

- [ ] 光标同步 (cursor_move 消息)
- [ ] 用户在线状态 (user_join / user_leave)
- [ ] 在线用户头像列表
- [ ] 选区冲突显示（多人选中同一元素）
- [ ] OT / CRDT 冲突解决
- [ ] 选区排他锁（可选）
- [ ] 协作历史回放（远期）

---

## 十三、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 操作传输通道？ | REST（上报）+ WebSocket（推送）| REST 可靠（有重试）；WebSocket 实时（低延迟推送） |
| 去重方案？ | 操作指纹 (fingerprint) | 简单高效；指纹碰撞概率忽略不计 |
| 冲突策略（当前）？ | Last Writer Wins (LWW) | 单人+AI 场景冲突极少；所有操作可撤销 |
| 持久化时机？ | 异步批量 (1.2s flush) | 不阻塞编辑操作；减少网络请求数量 |
| 离线支持？ | Phase 6 增强（IndexedDB）| MVP 先保证在线场景稳定；离线是增强 |
| 多人协作方案？ | Phase 7 OT/CRDT | 当前单人+AI 不需要；架构预留不阻碍 |
| AI 操作与人操作在 undo 栈中？ | 统一时间线 | 操作无差别对待，简化实现；选择性撤销是远期增强 |
| 断线重连策略？ | 指数退避 + 握手补发 | 标准方案；补发保证不丢操作 |
