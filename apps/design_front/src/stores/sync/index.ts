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
        const op = envelope.operation;

        // Skip synthetic undo operations — they don't go through the executor
        if (op.type === 'undo') return;

        editorStore.applyRemoteOperation(op);

        if (envelope.author === 'ai') {
          aiToastStore.add(op.type);
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
