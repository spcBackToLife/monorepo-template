import { useState } from 'react';
import { PageWrapper } from './components/PageWrapper';
import styles from './index.module.less';

export function HistoryMyCreations() {
  const [creations] = useState([{"id":"1","emoji":"🎵","genre":"Lo-fi","title":"Summer Vibes","duration":"3:24","gradient":"linear-gradient(135deg, #667eea, #764ba2)","createdAt":"2025-05-15"}]);





  return (
    <div className={styles.historyPage}>
      <PageWrapper creations={creations} />
    </div>
  );
}
