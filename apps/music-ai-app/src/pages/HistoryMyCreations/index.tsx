import { useState } from 'react';
import { PageWrapper } from './components/PageWrapper';
import type { Creation } from './types';
import styles from './index.module.less';

export function HistoryMyCreations() {
  const [creations] = useState<Creation[]>([{"id":"1","emoji":"🎵","genre":"Lo-fi","title":"Summer Vibes","duration":"3:24","gradient":"linear-gradient(135deg, #667eea, #764ba2)","createdAt":"2024-01-15"}]);





  return (
    <div className={styles.historyPage}>
      <PageWrapper creations={creations} />
    </div>
  );
}
