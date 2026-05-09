import styles from './index.less';


export function BottomTabBar() {


  return (
        <div className={styles.bottomTabBar}>
          <div className={styles.homeTab} onClick={handleHomeTabClick}>
            <div className={styles.tabIcon}>🏠</div>
            <p>Home</p>
          </div>
          <div className={styles.messagesTab} onClick={handleMessagesTabClick}>
            <div className={styles.tabIcon}>💬</div>
            <p>Messages</p>
          </div>
          <div className={styles.historyTab} onClick={handleHistoryTabClick}>
            <div className={styles.tabIcon}>🕐</div>
            <p>History</p>
          </div>
          <div className={styles.profileTab} onClick={handleProfileTabClick}>
            <div className={styles.tabIcon}>👤</div>
            <p>Profile</p>
          </div>
        </div>
  );
}
