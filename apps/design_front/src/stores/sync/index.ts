import { makeAutoObservable, runInAction } from 'mobx';
import type { Operation } from '@globallink/design-operations';
import { wsService } from '@/services/ws';
import { editorStore } from '@/stores/editor';

export class SyncStore {
  /** Whether WebSocket is connected */
  connected = false;
  /** Unsubscribe callback */
  private unsub: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** Start syncing for a project */
  startSync(projectId: string): void {
    this.stopSync();
    wsService.connect(projectId);

    this.unsub = wsService.onOperation((op: Operation) => {
      // Apply remote operation to local editor state (4B.17)
      runInAction(() => {
        editorStore.execute(op);
      });
    });

    runInAction(() => {
      this.connected = true;
    });
  }

  /** Stop syncing */
  stopSync(): void {
    this.unsub?.();
    this.unsub = null;
    wsService.disconnect();
    runInAction(() => {
      this.connected = false;
    });
  }
}

export const syncStore = new SyncStore();
