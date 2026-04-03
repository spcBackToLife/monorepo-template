import type { Operation } from '@globallink/design-operations';

const DB_NAME = 'design-editor-offline';
const DB_VERSION = 1;
const STORE_OPS = 'pendingOperations';
const STORE_SNAPSHOTS = 'projectSnapshots';

interface PendingOp {
  id: string;
  projectId: string;
  operation: Operation;
  fingerprint: string;
  timestamp: number;
}

interface ProjectSnapshot {
  projectId: string;
  data: unknown;
  lastSeq: number;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_OPS)) {
        const store = db.createObjectStore(STORE_OPS, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'projectId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class OfflineStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    try {
      this.db = await openDB();
    } catch {
      // IndexedDB not available
    }
  }

  async queueOperation(
    projectId: string,
    operation: Operation,
    fingerprint: string,
  ): Promise<void> {
    if (!this.db) return;
    const entry: PendingOp = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      operation,
      fingerprint,
      timestamp: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPS, 'readwrite');
      tx.objectStore(STORE_OPS).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingOperations(projectId: string): Promise<PendingOp[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPS, 'readonly');
      const index = tx.objectStore(STORE_OPS).index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPS, 'readwrite');
      tx.objectStore(STORE_OPS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearPendingOperations(projectId: string): Promise<void> {
    const ops = await this.getPendingOperations(projectId);
    if (!this.db || ops.length === 0) return;
    const tx = this.db.transaction(STORE_OPS, 'readwrite');
    const store = tx.objectStore(STORE_OPS);
    for (const op of ops) {
      store.delete(op.id);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveProjectSnapshot(projectId: string, data: unknown, lastSeq: number): Promise<void> {
    if (!this.db) return;
    const entry: ProjectSnapshot = {
      projectId,
      data,
      lastSeq,
      savedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProjectSnapshot(projectId: string): Promise<ProjectSnapshot | null> {
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SNAPSHOTS, 'readonly');
      const request = tx.objectStore(STORE_SNAPSHOTS).get(projectId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  get pendingCount(): Promise<number> {
    if (!this.db) return Promise.resolve(0);
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPS, 'readonly');
      const request = tx.objectStore(STORE_OPS).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStore = new OfflineStore();
