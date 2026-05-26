import styles from './index.module.less';

interface BottomTabBarProps {
  handleHomeTabClick: () => void;
  handleMessagesTabClick: () => void;
  handleHistoryTabClick: () => void;
  handleProfileTabClick: () => void;
}


export function BottomTabBar({ handleHomeTabClick, handleMessagesTabClick, handleHistoryTabClick, handleProfileTabClick }: BottomTabBarProps) {


  return (
        <div className={styles.bottomTabBar}>
          <div className={styles.homeTab} onClick={handleHomeTabClick}>
            <div className={styles.tabIcon}>🏠</div>
            <p className={styles.homeText}>Home</p>
          </div>
          <div className={styles.messagesTab} onClick={handleMessagesTabClick}>
            <div className={styles.tabIcon2}>💬</div>
            <p className={styles.messagesText}>Messages</p>
          </div>
          <div className={styles.historyTab} onClick={handleHistoryTabClick}>
            <div className={styles.tabIcon3}>🕐</div>
            <p className={styles.historyText}>History</p>
          </div>
          <div className={styles.profileTab} onClick={handleProfileTabClick}>
            <div className={styles.tabIcon4}>👤</div>
            <p className={styles.profileText}>Profile</p>
          </div>
        </div>
  );
}
