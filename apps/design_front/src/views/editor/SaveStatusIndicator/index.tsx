import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { syncManager } from '@/services/SyncManager';
import { offlineStore } from '@/services/OfflineStore';

const statusConfig = {
  saved: { icon: '\u2705', text: '\u5df2\u4fdd\u5b58', className: 'text-green-600' },
  saving: { icon: '\ud83d\udd04', text: '\u4fdd\u5b58\u4e2d', className: 'text-blue-500 animate-spin-slow' },
  failed: { icon: '\u26a0\ufe0f', text: '\u5931\u8d25', className: 'text-red-500' },
  offline: { icon: '\ud83d\udcf5', text: '\u79bb\u7ebf', className: 'text-gray-400' },
} as const;

export const SaveStatusIndicator = observer(function SaveStatusIndicator() {
  const status = syncManager.saveStatus.status;
  const config = statusConfig[status];
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (status !== 'offline') {
      setPendingCount(0);
      return;
    }
    const timer = setInterval(() => {
      void offlineStore.pendingCount.then((c) => setPendingCount(c));
    }, 3000);
    void offlineStore.pendingCount.then((c) => setPendingCount(c));
    return () => clearInterval(timer);
  }, [status]);

  const handleRetry = () => {
    // Trigger a manual save retry
    syncManager.saveStatus.markSaving();
    // The actual retry is handled by the editor store's flushPersistNow
    import('@/stores/editor').then(({ editorStore }) => {
      void editorStore.saveNow().then(({ status: saveResult }) => {
        if (saveResult === 'saved' || saveResult === 'noop') {
          syncManager.saveStatus.markSaved();
        } else {
          syncManager.saveStatus.markFailed();
        }
      });
    });
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-xs select-none">
      <span className={config.className}>{config.icon}</span>
      <span className={`${config.className} whitespace-nowrap`}>{config.text}</span>
      {status === 'offline' && pendingCount > 0 && (
        <span className="text-[10px] text-gray-500 whitespace-nowrap">{pendingCount} 条待同步</span>
      )}
      {status === 'failed' && (
        <button
          onClick={handleRetry}
          className="ml-1 px-1.5 py-0.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          {'\u91cd\u8bd5'}
        </button>
      )}
    </div>
  );
});
