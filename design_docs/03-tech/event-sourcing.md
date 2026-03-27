# 数据存储 — Event Sourcing + 周期快照

> 核心理念：操作日志就是版本历史，快照是加速恢复的缓存。

相关文档：[第一性原理 Q6](../01-vision/first-principles.md) | [后端架构](./backend.md) | [操作集合](./design-operations.md)

---

## 为什么选 Event Sourcing？

**系统天然就是 Operation-based 的：**

```
design-operations 的操作 = 编辑器的命令 = MCP 的 Tool Call = 版本管理的事件日志
                           四者合一！
```

同一个 Operation 对象，同时完成了：**执行、持久化、版本管理**三件事。不需要额外设计任何东西来做版本管理。

---

## 存储架构

```
┌──────────────────────────────────────────────────────────┐
│                   存储架构                                │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │  Snapshots 表    │    │  Operation Log 表            │  │
│  │                 │    │                             │  │
│  │  snap_001:      │    │  op_001: updateStyle(...)   │  │
│  │    Schema@V0    │    │  op_002: addElement(...)    │  │
│  │    (完整JSON)   │    │  op_003: moveElement(...)   │  │
│  │                 │    │  op_004: updateStyle(...)   │  │
│  │  snap_002:      │    │  op_005: ...               │  │
│  │    Schema@V100  │    │  ...                       │  │
│  │    (每100次快照) │    │  op_150: removeElement(...)│  │
│  └─────────────────┘    └─────────────────────────────┘  │
│                                                          │
│  恢复到 op_137 的状态:                                     │
│  1. 加载 snap_002 (V100 的快照)                            │
│  2. 重放 op_101 ~ op_137                                  │
│  3. 得到精确的 V137 状态                                   │
│  → 最多重放 100 次操作（快照间隔），性能完全可控              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 五大好处

| 好处 | 说明 |
|------|------|
| **增量存储** | 每次只存一条 Operation（~200 bytes），不存完整 Schema |
| **精确版本历史** | 可以回溯到任意一次操作，不是粗粒度的"保存点" |
| **天然支持 Undo/Redo** | 撤销 = 弹出最后一条 Op 并反向执行；重做 = 重新执行 |
| **天然支持协作（未来）** | 多人操作 = 多人的 Op 流合并（OT/CRDT 只需要处理冲突排序） |
| **天然的审计日志** | 谁在什么时候做了什么操作，一目了然；AI 的操作也完整记录 |

---

## 数据库设计

```sql
-- 项目表：只存元信息，不再存完整 Schema
CREATE TABLE design_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  platform         VARCHAR(20) NOT NULL,
  default_viewport JSONB NOT NULL,
  current_version  INTEGER DEFAULT 0,        -- 当前最新操作序号
  latest_snapshot  INTEGER DEFAULT 0,        -- 最新快照对应的序号
  thumbnail        TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- 操作日志表：每次操作一条记录（增量存储的核心）
CREATE TABLE design_operations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  seq           SERIAL,                       -- 操作序号
  operation     JSONB NOT NULL,               -- Operation JSON（~200 bytes）
  author        VARCHAR(255),                 -- "user:xxx" | "ai:cursor" | "ai:claude-code"
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, seq)
);
CREATE INDEX idx_ops_project_seq ON design_operations(project_id, seq);

-- 快照表：每 N 次操作创建一次（加速恢复）
CREATE TABLE design_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES design_projects(id),
  version       INTEGER NOT NULL,              -- 快照对应的操作序号
  schema        JSONB NOT NULL,                -- 完整 Schema（恢复基准）
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_snap_project ON design_snapshots(project_id, version);

-- 组件资产表
CREATE TABLE component_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  tags          TEXT[],
  scope         VARCHAR(20) NOT NULL,          -- 'project' | 'team' | 'global'
  project_id    UUID REFERENCES design_projects(id), -- scope=project 时关联
  schema        JSONB NOT NULL,                -- 组件 Schema 片段
  thumbnail     TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

---

## 加载与保存流程

```
打开设计稿:
1. 读取 design_projects → 获取 latest_snapshot 和 current_version
2. 读取最近的 snapshot → 得到基准 Schema
3. 读取 snapshot.version ~ current_version 之间的操作
4. 依次重放操作 → 得到最新 Schema
5. 渲染到画布

保存操作:
1. 用户/AI 执行一次操作
2. INSERT INTO design_operations
3. 更新 projects.current_version
4. 如果距离上次快照超过 N 次操作 → 创建新快照
```

---

## 快照策略

- 每 100 次操作自动创建一次快照
- 恢复时：加载最近快照 + 重放剩余操作（最多 100 次，毫秒级完成）
- 旧快照可定期清理（保留最近 N 个 + 关键里程碑）

---

## MCP + Event Sourcing 的协同

```
MCP Server 接收 AI Tool Call
       │
       ▼
Operation 对象（结构化）
       │
       ├─→ 1. OperationExecutor.execute() → 更新内存中的 Schema → 画布重新渲染
       │
       ├─→ 2. INSERT INTO design_operations → 持久化操作日志
       │
       └─→ 3. 操作历史可回溯 → undo/redo / 版本管理

同一个 Operation 对象，同时完成了：执行、持久化、版本管理 三件事
```
