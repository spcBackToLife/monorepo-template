import { useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { editorStore } from '@/stores/editor';

interface AiToastEntry {
  id: string;
  description: string;
  timestamp: number;
}

class AiToastStore {
  toasts: AiToastEntry[] = [];
  private counter = 0;

  constructor() {
    makeAutoObservable(this);
  }

  add(description: string): void {
    const id = `ai-toast-${++this.counter}`;
    if (this.toasts.length >= 3) {
      this.toasts = this.toasts.slice(-2);
    }
    this.toasts.push({ id, description, timestamp: Date.now() });
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  clear(): void {
    this.toasts = [];
  }
}

export const aiToastStore = new AiToastStore();

const AiToastCard = observer(function AiToastCard({
  toast,
  onDismiss,
  onUndo,
}: {
  toast: AiToastEntry;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm animate-slide-in-right min-w-[240px] max-w-[360px]">
      <span className="shrink-0">{'\ud83e\udd16'}</span>
      <span className="flex-1 truncate">AI {'\u4fee\u6539\u4e86'} {toast.description}</span>
      <button
        onClick={onUndo}
        className="shrink-0 px-2 py-0.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
      >
        {'\u64a4\u9500'}
      </button>
    </div>
  );
});

export const AiOperationToast = observer(function AiOperationToast() {
  const toasts = aiToastStore.toasts;

  const handleDismiss = useCallback((id: string) => {
    runInAction(() => aiToastStore.remove(id));
  }, []);

  const handleUndo = useCallback((id: string) => {
    runInAction(() => {
      aiToastStore.remove(id);
      editorStore.undo();
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <AiToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => handleDismiss(toast.id)}
          onUndo={() => handleUndo(toast.id)}
        />
      ))}
    </div>
  );
});
