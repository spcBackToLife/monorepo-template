import { makeAutoObservable } from 'mobx';

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'offline';

export class SaveStatusTracker {
  status: SaveStatus = 'saved';
  onStatusChange?: (status: SaveStatus) => void;

  constructor() {
    makeAutoObservable(this);
  }

  markSaving(): void {
    this.status = 'saving';
    this.onStatusChange?.(this.status);
  }

  markSaved(): void {
    this.status = 'saved';
    this.onStatusChange?.(this.status);
  }

  markFailed(): void {
    this.status = 'failed';
    this.onStatusChange?.(this.status);
  }

  markOffline(): void {
    this.status = 'offline';
    this.onStatusChange?.(this.status);
  }
}
