import styles from './index.module.less';
import { BottomTabBar } from '@/components/BottomTabBar';

interface PageWrapperProps {
  creations: unknown;
}


export function PageWrapper({ creations }: PageWrapperProps) {


  return (
        <div className={styles.pageWrapper}>
          <div className={styles.historyHeader}>
            <h2 className={styles.myCreationsTitle}>My Creations</h2>
            <div className={styles.searchBtn}>🔍</div>
          </div>
          <div className={styles.filterTabs}>
            <div className={styles.tabAll}>All</div>
            <div className={styles.tabSongs}>Songs</div>
            <div className={styles.tabBeats}>Beats</div>
            <div className={styles.tabLyrics}>Lyrics</div>
            <div className={styles.tabRemix}>Remix</div>
          </div>
          <div className={styles.historyList}>
            {creations.map((item, index) => (
                <div key={item.id ?? index} className={styles.creationCard}>
                  <div className={styles.albumArt} style={{ background: item.gradient }}>{item.emoji}</div>
                  <div className={styles.cardInfo}>
                    <p className={styles.creationCardTitle}>{item.title}</p>
                    <p className={styles.creationCardMeta}>{`${item.genre} · ${item.duration}`}</p>
                    <p className={styles.creationCardDate}>{item.createdAt}</p>
                  </div>
                  <div className={styles.playBtn}>▶</div>
                </div>
            ))}
          </div>
          <BottomTabBar />
        </div>
  );
}
