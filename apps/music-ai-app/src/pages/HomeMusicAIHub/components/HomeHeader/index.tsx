import styles from './index.module.less';

interface HomeHeaderProps {
  user: unknown;
}


export function HomeHeader({ user }: HomeHeaderProps) {


  return (
        <div className={styles.homeHeader}>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar} src="">🏆</div>
            <div className={styles.userInfo}>
              <p className={styles.welcomeText}>Welcome back</p>
              <h3 className={styles.displayName}>{user.displayName}</h3>
            </div>
          </div>
          <div className={styles.menuButton}>☰</div>
        </div>
  );
}
