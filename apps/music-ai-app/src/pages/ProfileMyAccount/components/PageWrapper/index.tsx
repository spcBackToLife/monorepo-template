import styles from './index.module.less';
import { BottomTabBar } from '@/components/BottomTabBar';

interface PageWrapperProps {
  user: unknown;
  stats: unknown;
}


export function PageWrapper({ user, stats }: PageWrapperProps) {


  return (
        <div className={styles.pageWrapper}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarRing}>
              <div className={styles.avatarInner}>🏆</div>
            </div>
            <h2 className={styles.displayName}>{user.displayName}</h2>
            <p className={styles.labelText}>{user.email}</p>
            <div className={styles.editProfileBtn}>
              <p className={styles.editProfileText}>Edit Profile</p>
            </div>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.labelText2}>{stats.creations}</p>
              <p className={styles.creationsText}>Creations</p>
            </div>
            <div className={styles.statCard2}>
              <p className={styles.labelText3}>{stats.hours}</p>
              <p className={styles.hoursText}>Hours</p>
            </div>
            <div className={styles.statCard3}>
              <p className={styles.labelText4}>{stats.shared}</p>
              <p className={styles.sharedText}>Shared</p>
            </div>
          </div>
          <div className={styles.menuList}>
            <div className={styles.menuItem}>
              <div className={styles.labelText5}>⚙️</div>
              <p className={styles.settingsText}>Settings</p>
              <div className={styles.labelText6}>›</div>
            </div>
            <div className={styles.menuItem2}>
              <div className={styles.labelText7}>🎵</div>
              <p className={styles.myLibraryText}>My Library</p>
              <div className={styles.labelText8}>›</div>
            </div>
            <div className={styles.menuItem3}>
              <div className={styles.labelText9}>💎</div>
              <p className={styles.subscriptionText}>Subscription</p>
              <div className={styles.proBadge}>
                <p className={styles.pROText}>PRO</p>
              </div>
              <div className={styles.labelText10}>›</div>
            </div>
            <div className={styles.menuItem4}>
              <div className={styles.labelText11}>❓</div>
              <p className={styles.helpSupportText}>Help & Support</p>
              <div className={styles.labelText12}>›</div>
            </div>
            <div className={styles.logoutItem}>
              <div className={styles.labelText13}>🚪</div>
              <p className={styles.logOutText}>Log Out</p>
            </div>
          </div>
          <BottomTabBar />
        </div>
  );
}
