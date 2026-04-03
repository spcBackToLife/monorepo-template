# 11-sync-system — 同步系统技术设计

> Technical design for the sync system.

---

## 1. 第一性原理 / First Principles

Sync system answers: **"How to ensure human and AI edits converge to the same state?"**

Both paths (user UI operations and AI MCP operations) must produce the same result regardless of timing. The system provides:
- **Echo deduplication** — prevent applying your own operations twice
- **Reconnection resilience** — no operations lost on network hiccups
- **Status visibility** — users always know the save state

---

## 2. 来自产品需求 / Product Requirements Traceability

| 产品文档 | 对应同步能力 |
|---------|------------|
| 11-collaboration | Real-time sync |
| 11-collaboration | Echo deduplication |
| 11-collaboration | Reconnection handling |
| 11-collaboration | Save status indicators |

---

## 3. OperationEnvelope 协议 / OperationEnvelope Protocol

```typescript
interface OperationEnvelope {
  id: string;           // UUID — unique identifier for this envelope
  fingerprint: string;  // Client-generated UUID for echo dedup
  operation: Operation; // The actual operation payload
  author: 'user' | 'ai';
  authorId?: string;    // User ID or AI session ID
  seq: number;          // Server-assigned monotonic sequence number
  timestamp: string;    // ISO 8601 timestamp
}
```

### Key Properties

| Property | Assigned By | Purpose |
|----------|------------|---------|
| `id` | Server | Persistent unique ID |
| `fingerprint` | Client | Echo deduplication |
| `seq` | Server | Ordering + reconnection replay |
| `author` | Client | UI differentiation (show AI toast) |

---

## 4. EchoDeduplicator 算法 / EchoDeduplicator Algorithm

```typescript
class EchoDeduplicator {
  private pendingFingerprints: Set<string>;

  /**
   * Mark an operation as outgoing (about to be sent to server).
   * Store fingerprint so we can recognize the echo when it comes back.
   */
  markOutgoing(fingerprint: string): void {
    this.pendingFingerprints.add(fingerprint);
  }

  /**
   * Check if an incoming WebSocket operation should be applied.
   * Returns false if fingerprint matches a pending outgoing op (echo).
   * Removes fingerprint from set after match (one-time dedup).
   */
  shouldApplyIncoming(envelope: OperationEnvelope): boolean {
    if (this.pendingFingerprints.has(envelope.fingerprint)) {
      this.pendingFingerprints.delete(envelope.fingerprint);
      return false; // This is an echo of our own operation — skip
    }
    return true; // This is from another client — apply
  }
}
```

### Flow Diagram

```
User executes operation
  │
  ├─ 1. Generate fingerprint (UUID)
  ├─ 2. Add fingerprint to pendingFingerprints
  ├─ 3. Apply operation locally (optimistic)
  ├─ 4. Send operation + fingerprint to API
  │
  ▼
API persists + assigns seq
  │
  ├─ 5. Broadcast OperationEnvelope via WebSocket (to ALL clients, including sender)
  │
  ▼
Client receives WebSocket message
  │
  ├─ 6. Check fingerprint against pendingFingerprints
  ├─ 7a. If match → SKIP (echo of own op) → remove from set
  └─ 7b. If no match → APPLY (operation from another client or AI)
```

---

## 5. 断线重连 / Disconnection & Reconnection

```typescript
class SyncManager {
  private ws: WebSocket;
  private lastSeq: number;       // Last received sequence number
  private retryCount: number;
  private retryDelay: number;    // Current retry delay in ms

  connect(): void {
    // Establish WebSocket connection
    // On success: perform handshake
  }

  onDisconnect(): void {
    // Start retry loop with exponential backoff
    // Update SaveStatus to 'offline'
  }

  onReconnect(): void {
    // Perform handshake with lastSeq
    // Server replays missed operations
    // Update SaveStatus to 'saved'
  }

  handshake(): void {
    // Send: { type: "handshake", lastSeq: this.lastSeq }
    // Receive: array of OperationEnvelopes with seq > lastSeq
    // Apply each through normal pipeline (with echo dedup)
  }
}
```

### Exponential Backoff Strategy

| Retry # | Delay | Cumulative Wait |
|---------|-------|----------------|
| 1 | 1s | 1s |
| 2 | 2s | 3s |
| 3 | 4s | 7s |
| 4 | 8s | 15s |
| 5 | 16s (max) | 31s |

After 5 retries: **fall back to polling** (`GET /api/projects/:projectId/operations?since=lastSeq` every 30s).

---

## 6. 保存状态指示器 / Save Status Indicator

```typescript
type SaveStatus = 'saved' | 'saving' | 'failed' | 'offline';
```

### Status Display

| Status | Icon | Label | Description |
|--------|------|-------|-------------|
| `saved` | ✅ | 已保存 | All operations persisted to server |
| `saving` | 🔄 | 保存中 | Operations in async queue, awaiting server confirmation |
| `failed` | ⚠️ | 失败 | Last save attempt failed — shows retry button |
| `offline` | 📵 | 离线 | WebSocket disconnected — reconnecting |

### State Transitions

```
saved ──[user edits]──→ saving ──[server confirms]──→ saved
                          │
                          ├──[server error]──→ failed ──[retry]──→ saving
                          │
                          └──[WS disconnect]──→ offline ──[reconnect]──→ saving
```

---

## 7. AI 操作 Toast 通知 / AI Operation Toast Notification

When receiving an AI-authored operation via WebSocket (`envelope.author === 'ai'`):

### Toast Content
```
🤖 AI 修改了 {node.name}
   {operation description}
   [Undo]
```

### Behavior
- **Auto-dismiss** after 3 seconds
- **Click toast body** → select the affected node on canvas
- **Click "Undo"** → undo the AI operation
- **Stack** — multiple AI operations stack vertically (max 3 visible)

### Implementation
```typescript
function handleAiOperation(envelope: OperationEnvelope): void {
  const node = getNodeById(envelope.operation.targetNodeId);
  showToast({
    icon: '🤖',
    title: `AI 修改了 ${node?.name ?? 'unknown'}`,
    description: describeOperation(envelope.operation),
    duration: 3000,
    onClick: () => selectNode(envelope.operation.targetNodeId),
    actions: [
      { label: 'Undo', onClick: () => undoOperation(envelope) }
    ]
  });
}
```

---

## 8. 离线 IndexedDB 缓存（远期 Phase 6）/ Offline Cache (Future)

### Design (for future implementation)

```typescript
class OfflineCache {
  private db: IDBDatabase;  // IndexedDB instance

  /**
   * Queue an operation for later replay when offline.
   */
  async queueOperation(envelope: Partial<OperationEnvelope>): Promise<void>;

  /**
   * Get all queued operations in order.
   */
  async getPendingOperations(): Promise<Partial<OperationEnvelope>[]>;

  /**
   * Replay queued operations on reconnection.
   */
  async replayOnReconnect(): Promise<void>;

  /**
   * Clear queue after successful replay.
   */
  async clearQueue(): Promise<void>;
}
```

### Conflict Resolution
- **Server wins (LWW — Last Writer Wins)**
- On replay: if server rejects an operation (conflict), discard the local op
- Show user notification: "Some offline changes could not be applied"

---

## 9. 影响的文件路径 / Affected File Paths

```
apps/design_front/src/
├── services/
│   ├── SyncManager.ts            ← 🆕 或扩展
│   ├── EchoDeduplicator.ts       ← 🆕
│   ├── SaveStatusTracker.ts      ← 🆕
│   └── OfflineCache.ts           ← 🆕 (Phase 6)
├── views/
│   └── editor/
│       ├── SaveStatusIndicator.tsx ← 🆕
│       └── AiOperationToast.tsx    ← 🆕

apps/design-api/src/
├── modules/
│   └── operations/
│       ├── operations.gateway.ts  ← 扩展 handshake + envelope
│       └── operations.service.ts  ← 扩展 seq assignment
```

---

## 10. 依赖关系 / Dependencies

- **依赖 (depends on):** 09-backend-extensions
- **被依赖 (depended by):** none

---

## 11. MVP vs 后期 / Phased Delivery

| Phase | Scope |
|-------|-------|
| **Phase 5** | OperationEnvelope, EchoDeduplicator, reconnection, save indicator, AI toast |
| **Phase 6** | IndexedDB offline cache |
| **Phase 7** | Multi-person OT/CRDT |

---

## 12. 核心技术决策 / Core Technical Decisions

### LWW vs OT/CRDT

**Decision:** LWW (Last Writer Wins) for Phase 1–5, OT/CRDT reserved for Phase 7.

Rationale: Single-user + AI is the primary use case. LWW is dramatically simpler and sufficient. True multi-person collaboration (Phase 7) will require OT or CRDT, but by then the operation model will be mature.

### Fingerprint-based vs Sequence-based Echo Dedup

**Decision:** Fingerprint-based (client-generated UUID).

Rationale: Simpler than sequence-based dedup. No need to track expected sequence numbers or handle gaps. Each operation carries its own identity. One-time match-and-remove is O(1).

### Server-assigned Sequence Numbers

**Decision:** Server assigns `seq` numbers (single source of truth).

Rationale: Monotonic counter on the server guarantees total ordering. Clients never need to negotiate ordering. Reconnection is simple: "give me everything after seq X."

### Exponential Backoff with Polling Fallback

**Decision:** Max 5 retries with exponential backoff, then fall back to HTTP polling.

Rationale: WebSocket reconnection should be fast for transient issues. For persistent network problems, polling is more reliable than continuous reconnection attempts. 30s polling interval is acceptable for degraded mode.
