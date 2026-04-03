# W7 Issue 列表（协作 MVP + 画布性能）

> 对应总规划 **W7**（11 + 01 Phase3）；依赖 W6。

---

## 11 协作

| ID | 标题 | 状态 |
|----|------|------|
| W7-011 | WebSocket 握手、operation 帧、心跳 | done |
| W7-012 | 回声去重、远程 operation 应用顺序 | done |
| W7-013 | 重连补发、持久化队列对齐 | done |
| W7-014 | 保存指示、AI Toast、冲突提示文案 | done |

## 01 画布 Phase3

| ID | 标题 | 状态 |
|----|------|------|
| W7-021 | 大量节点：左栏树虚拟列表 + 画布 DOM 层性能基线 | done |
| W7-022 | 溢出检测与警告 | done |
| W7-023 | 锁定/隐藏与 operations 对齐 | done |
| W7-024 | 注释节点完整链路（若未与 W2 对齐则收口） | done |
| W7-025 | 画布 Schema 视口级 DOM 虚拟化（仅挂载可视节点，需与 hitTest 同方案） | done |

---

**维护**：与 `apps/design-api` `operations.gateway` / `SyncManager` 变更同步更新本表。

**协作项验收说明（与当前代码对齐，2026-03）**

| ID | 实现要点 |
|----|----------|
| **W7-011** | 前端 `socket.io-client` 连接 `/ws`；`subscribe` 进房间；`handshake` + `lastSeq` 触发服务端 `findSince` 补发；`operation` / `undo` 事件。传输层心跳由 Socket.IO 内置 ping/pong 维持，无单独业务级 ping 消息。 |
| **W7-012** | `EchoDeduplicator` 对本地回声的 `fingerprint` 跳过；其余入站 `editorStore.applyRemoteOperation`。顺序依赖服务端广播与握手重放顺序（按 seq 持久化）。 |
| **W7-013** | 重连后 `handshake`；`SyncManager` 指数退避重连 + `since` HTTP 轮询兜底；`editorStore` 待上报队列与 batch 持久化、`ackSeq` 对齐。 |
| **W7-014** | `SaveStatusIndicator` + `SaveStatusTracker`（已保存/保存中/失败/离线）；`AiOperationToast` + `author === 'ai'` 时提示。**多人编辑冲突合并提示文案 / OT** 未实现，仍以最后写入为准，属总纲 11 Phase7 范畴；本行标 done 指「保存态 + AI 反馈」已落地。 |
| **W7-021** | **左栏**：展平 + `@tanstack/react-virtual` + `measureElement` / `scrollToIndex`；**画布**：`SchemaRenderer` 根节点 `contain: layout`；`.editor-canvas-dom-layer` `translateZ(0)` 合成层（不裁剪节点、不改 hitTest）。 |
| **W7-025** | `buildSchemaLayoutMap` 从 Schema 推导与 `buildCoordinateMap` 同坐标系的包围盒；`mergeCoordinateMaps(dom, schema)` 供 `EditorOverlay`、绘制/溢出检测、`useEditorCanvasOperations` 缩放父解析与右键命中使用；`SchemaRenderer` 在设备框外扩 margin 外不挂载子树（`__listData` 子树禁用裁剪）。`editorStore.canvasVirtualizeOutsideDeviceFrame` 默认开启，可关。静态/流式布局无估计盒的节点不裁剪。 |
