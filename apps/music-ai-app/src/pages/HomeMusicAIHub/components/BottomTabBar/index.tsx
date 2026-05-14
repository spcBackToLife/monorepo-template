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
            <p className={styles.node5b37d8}>Home</p>
          </div>
          <div className={styles.messagesTab} onClick={handleMessagesTabClick}>
            <div className={styles.tabIcon}>💬</div>
            <p className={styles.node9854aa}>Messages</p>
          </div>
          <div className={styles.historyTab} onClick={handleHistoryTabClick}>
            <div className={styles.tabIcon}>🕐</div>
            <p className={styles.nodeda61ae}>History</p>
          </div>
          <div className={styles.profileTab} onClick={handleProfileTabClick}>
            <div className={styles.tabIcon}>👤</div>
            <p className={styles.node095ca2}>Profile</p>
          </div>
        </div>
  );
}
