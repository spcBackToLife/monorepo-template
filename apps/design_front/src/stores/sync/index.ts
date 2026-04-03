import { makeAutoObservable, runInAction } from 'mobx';
import { syncManager, type OperationEnvelopePayload } from '@/services/SyncManager';
import { editorStore } from '@/stores/editor';
import { aiToastStore } from '@/views/editor/AiOperationToast';

export class SyncStore {
  connected = false;
  private unsub: (() => void) | null = null;
  private pollConnectedTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  startSync(projectId: string): void {
    this.stopSync();
    syncManager.connect(projectId);

    this.unsub = syncManager.onEnvelope((envelope: OperationEnvelopePayload) => {
      runInAction(() => {
        editorStore.applyRemoteOperation(envelope.operation);

        if (envelope.author === 'ai') {
          const op = envelope.operation as { type?: string; params?: Record<string, unknown> };
          const description = op.type ?? 'unknown';
          aiToastStore.add(description);
        }
      });
    });

    this.pollConnectedTimer = setInterval(() => {
      const actual = syncManager.connected;
      if (actual !== this.connected) {
        runInAction(() => {
          this.connected = actual;
        });
      }
    }, 1000);

    runInAction(() => {
      this.connected = syncManager.connected;
    });
  }

  stopSync(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.pollConnectedTimer) {
      clearInterval(this.pollConnectedTimer);
      this.pollConnectedTimer = null;
    }
    syncManager.disconnect();
    runInAction(() => {
      this.connected = false;
    });
  }
}

export const syncStore = new SyncStore();
