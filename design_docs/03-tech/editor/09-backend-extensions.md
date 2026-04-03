# 09-backend-extensions — 后端扩展技术设计

> Technical design for design-api extensions.

---

## 1. 第一性原理 / First Principles

Backend extensions answer: **"What new server capabilities does the editor need?"**

The editor's new features (datasets, assets, screenshots, collaboration) all require server-side support. This document defines the API surface for:
- File storage and asset management
- Screenshot generation
- Enhanced operation persistence with authorship tracking

---

## 2. 来自产品需求 / Product Requirements Traceability

| 产品文档 | 对应后端能力 |
|---------|------------|
| 05-data-driven | Dataset CRUD endpoints |
| 07-asset-management | File upload endpoint |
| 05-data-driven | Screenshot generation (snapshots) |
| 11-collaboration | Operation envelope persistence |

---

## 3. DataSet CRUD 端点 / DataSet CRUD Endpoints

```
POST   /api/projects/:projectId/screens/:screenId/datasets
GET    /api/projects/:projectId/screens/:screenId/datasets
PUT    /api/projects/:projectId/screens/:screenId/datasets/:datasetId
DELETE /api/projects/:projectId/screens/:screenId/datasets/:datasetId
POST   /api/projects/:projectId/screens/:screenId/datasets/:datasetId/activate
```

### Request / Response Shapes

**POST (create)**
```json
{
  "name": "Empty State",
  "data": { "users": [], "loading": false }
}
// → 201 { "id": "ds_xxx", "name": "...", "data": {...}, "isActive": false }
```

**GET (list)**
```json
// → 200 [{ "id": "ds_xxx", "name": "...", "isActive": true }, ...]
```

**PUT (update)**
```json
{
  "name": "Updated Name",
  "data": { "users": [{ "name": "Alice" }], "loading": false }
}
// → 200 { "id": "ds_xxx", "name": "...", "data": {...} }
```

**DELETE**
```json
// → 204 No Content
// Cannot delete the last dataset; returns 400
```

**POST activate**
```json
// → 200 { "id": "ds_xxx", "isActive": true }
// Deactivates the previously active dataset
```

---

## 4. Asset 文件上传端点 / Asset Upload Endpoint

```
POST /api/projects/:projectId/assets/upload
```

### Request
- **Content-Type**: `multipart/form-data`
- **Field**: `file` — the uploaded file

### Validation Rules

| File Type | Extensions | Max Size |
|-----------|-----------|----------|
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | 10 MB |
| SVG | `.svg` | 2 MB |
| Video | `.mp4`, `.webm` | 50 MB |
| Lottie | `.json` (validated for Lottie schema) | 5 MB |

### Storage Strategy
- **Development**: local filesystem (`./uploads/{projectId}/{assetId}.{ext}`)
- **Production**: S3-compatible object storage (MinIO / AWS S3)
- Abstracted behind `StorageProvider` interface

### Response
```json
{
  "id": "asset_abc123",
  "url": "asset://asset_abc123",
  "originalName": "hero-image.png",
  "mimeType": "image/png",
  "size": 245000,
  "thumbnailUrl": "asset://asset_abc123/thumb"
}
```

- Returns `asset://{assetId}` URL scheme (resolved at render time by the frontend)
- **Thumbnail generation**: automatic for images (128×128 cover crop)

---

## 5. 截图生成端点 / Screenshot Generation Endpoint

```
POST /api/projects/:projectId/snapshots/generate
```

### Request Body
```json
{
  "screenIds": ["screen_1", "screen_2"],
  "dataSetIds": ["ds_default", "ds_empty"],
  "globalStates": [
    { "theme": "light" },
    { "theme": "dark" }
  ],
  "viewportIds": ["mobile_375", "desktop_1440"]
}
```

Generates a **matrix** of screenshots: `screens × datasets × globalStates × viewports`.

### Async Job Flow

1. **POST** → returns immediately:
   ```json
   { "jobId": "job_xyz", "status": "pending", "totalCombinations": 16 }
   ```

2. **Worker** (Puppeteer headless browser):
   - Spins up headless Chrome
   - For each combination: set viewport → load schema → apply dataset → apply global state → render → screenshot
   - Stores each screenshot as an asset

3. **Status polling**:
   ```
   GET /api/projects/:projectId/snapshots/jobs/:jobId
   ```
   ```json
   {
     "jobId": "job_xyz",
     "status": "completed",       // "pending" | "running" | "completed" | "failed"
     "progress": { "done": 16, "total": 16 },
     "results": [
       { "screenId": "screen_1", "dataSetId": "ds_default", "viewportId": "mobile_375", "assetUrl": "asset://snap_001" }
     ]
   }
   ```

4. **Download**: `GET /api/projects/:projectId/snapshots/jobs/:jobId/download` → ZIP file

---

## 6. OperationEnvelope 扩展 / OperationEnvelope Extension

### Database Schema Changes

Operations table adds new columns:

| Column | Type | Description |
|--------|------|-------------|
| `fingerprint` | `UUID` | Client-generated UUID for echo deduplication |
| `author` | `ENUM('user', 'ai')` | Who created the operation |
| `authorId` | `VARCHAR(255)` | User ID or AI session ID |
| `seq` | `BIGINT` | Server-assigned per-project monotonic sequence number |

### Sequence Number Assignment
- Per-project monotonic counter
- Assigned atomically by the server on persist
- Used for reconnection replay (client sends `lastSeq`, server replays `seq > lastSeq`)

---

## 7. WebSocket 广播增强 / WebSocket Broadcast Enhancement

### Current Behavior
Broadcast raw `Operation` object to all connected clients.

### New Behavior
Broadcast full `OperationEnvelope`:

```typescript
// WebSocket message payload
{
  type: 'operation',
  payload: {
    id: string;
    fingerprint: string;
    operation: Operation;
    author: 'user' | 'ai';
    authorId?: string;
    seq: number;
    timestamp: string;
  }
}
```

### Reconnection Handshake

1. Client connects (or reconnects) and sends:
   ```json
   { "type": "handshake", "lastSeq": 42 }
   ```
2. Server replays all operations with `seq > 42` in order
3. Client applies missed operations through normal pipeline (with echo dedup)

---

## 8. 影响的文件路径 / Affected File Paths

```
apps/design-api/src/
├── modules/
│   ├── datasets/
│   │   ├── datasets.controller.ts    ← 🆕
│   │   ├── datasets.service.ts       ← 🆕
│   │   └── datasets.module.ts        ← 🆕
│   ├── assets/
│   │   ├── assets.controller.ts      ← 扩展 upload
│   │   └── assets.service.ts         ← 扩展 storage
│   ├── snapshots/
│   │   ├── snapshots.controller.ts   ← 🆕
│   │   ├── snapshots.service.ts      ← 🆕
│   │   └── snapshots.worker.ts       ← 🆕 Puppeteer worker
│   └── operations/
│       ├── operations.service.ts     ← 扩展 envelope
│       └── operations.gateway.ts     ← 扩展 WS broadcast
```

---

## 9. 依赖关系 / Dependencies

- **依赖 (depends on):** 01-schema-extensions
- **被依赖 (depended by):** 10-mcp-extensions, 11-sync-system

---

## 10. MVP vs 后期 / Phased Delivery

| Phase | Scope |
|-------|-------|
| **Phase 3** | DataSet CRUD, basic file upload |
| **Phase 4** | Screenshot generation (Puppeteer worker) |
| **Phase 5** | OperationEnvelope persistence + WebSocket enhancement |
