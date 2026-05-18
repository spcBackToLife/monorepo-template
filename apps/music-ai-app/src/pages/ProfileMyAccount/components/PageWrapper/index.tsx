import styles from './index.module.less';
import type { ProfileUser, UserStats } from '../../types';

interface PageWrapperProps {
  user: ProfileUser;
  stats: UserStats;
}


export function PageWrapper({ user, stats }: PageWrapperProps) {


  return (
        <div className={styles.pageWrapper}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarRing}>
              <div className={styles.avatarInner}>🏆</div>
            </div>
            <h2 className={styles.node267c40}>{user.displayName}</h2>
            <p className={styles.node8cc830}>{user.email}</p>
            <div className={styles.editProfileBtn}>
              <p className={styles.node7d124c}>Edit Profile</p>
            </div>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.node827875}>{stats.creations}</p>
              <p className={styles.node97e7e7}>Creations</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.node9ec70c}>{stats.hours}</p>
              <p className={styles.node12a2fd}>Hours</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.node7eb2d5}>{stats.shared}</p>
              <p className={styles.node6fcb7d}>Shared</p>
            </div>
          </div>
          <div className={styles.menuList}>
            <div className={styles.menuItem}>
              <div className={styles.nodede1683}>⚙️</div>
              <p className={styles.nodeb99b55}>Settings</p>
              <div className={styles.node0f86b1}>›</div>
            </div>
            <div className={styles.menuItem}>
              <div className={styles.node30109a}>🎵</div>
              <p className={styles.nodee89929}>My Library</p>
              <div className={styles.node4f9ccb}>›</div>
            </div>
            <div className={styles.menuItem}>
              <div className={styles.noded16116}>💎</div>
              <p className={styles.nodeeec7bd}>Subscription</p>
              <div className={styles.proBadge}>
                <p className={styles.node9bc92a}>PRO</p>
              </div>
              <div className={styles.node95360f}>›</div>
            </div>
            <div className={styles.menuItem}>
              <div className={styles.nodee0cb29}>❓</div>
              <p className={styles.node71bf15}>Help & Support</p>
              <div className={styles.node582e5b}>›</div>
            </div>
            <div className={styles.logoutItem}>
              <div className={styles.node80e46f}>🚪</div>
              <p className={styles.node997d6f}>Log Out</p>
            </div>
          </div>
          <div className={styles.bottomTabBar}>
            <div className={styles.homeTab}>
              <div className={styles.tabIcon}>🏠</div>
              <p className={styles.nodee7f2ed}>Home</p>
            </div>
            <div className={styles.messagesTab}>
              <div className={styles.tabIcon}>💬</div>
              <p className={styles.nodeea8596}>Messages</p>
            </div>
            <div className={styles.historyTab}>
              <div className={styles.tabIcon}>🕐</div>
              <p className={styles.node8a61f7}>History</p>
            </div>
            <div className={styles.profileTab}>
              <div className={styles.tabIcon}>👤</div>
              <p className={styles.node645fec}>Profile</p>
            </div>
          </div>
        </div>
  );
}
