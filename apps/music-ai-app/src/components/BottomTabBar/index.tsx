import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.less';

export function BottomTabBar() {
  const navigate = useNavigate();

  const handleHomeTabClick = () => {
        navigate("/home");
  };

  const handleMessagesTabClick = () => {
        navigate("/chat");
  };

  const handleHistoryTabClick = () => {
        navigate("/history");
  };

  const handleProfileTabClick = () => {
        navigate("/profile");
  };

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
