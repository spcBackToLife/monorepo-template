import styles from './index.module.less';
import type { Creation } from '../../types';

interface PageWrapperProps {
  creations: Creation[];
}


export function PageWrapper({ creations }: PageWrapperProps) {


  return (
        <div className={styles.pageWrapper}>
          <div className={styles.historyHeader}>
            <h2 className={styles.nodec4b5e8}>My Creations</h2>
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
                    <p className={styles.node1f00ce}>{item.title}</p>
                    <p className={styles.node3ad72c}>{`${item.genre} · ${item.duration}`}</p>
                    <p className={styles.nodec4551e}>{item.createdAt}</p>
                  </div>
                  <div className={styles.playBtn}>▶</div>
                </div>
            ))}
          </div>
          <div className={styles.bottomTabBar}>
            <div className={styles.homeTab}>
              <div className={styles.tabIcon}>🏠</div>
              <p className={styles.node58a809}>Home</p>
            </div>
            <div className={styles.messagesTab}>
              <div className={styles.tabIcon}>💬</div>
              <p className={styles.node3c2129}>Messages</p>
            </div>
            <div className={styles.historyTab}>
              <div className={styles.tabIcon}>🕐</div>
              <p className={styles.nodeb892ac}>History</p>
            </div>
            <div className={styles.profileTab}>
              <div className={styles.tabIcon}>👤</div>
              <p className={styles.node1f310b}>Profile</p>
            </div>
          </div>
        </div>
  );
}
