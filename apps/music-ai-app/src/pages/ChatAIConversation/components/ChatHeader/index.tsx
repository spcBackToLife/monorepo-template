import styles from './index.module.less';

interface ChatHeaderProps {
  handleBackButtonClick: () => void;
}


export function ChatHeader({ handleBackButtonClick }: ChatHeaderProps) {


  return (
        <div className={styles.chatHeader}>
          <div className={styles.backButton} onClick={handleBackButtonClick}>‹</div>
          <h3 className={styles.pageTitle}>Chat</h3>
          <div className={styles.moreButton}>⋮</div>
        </div>
  );
}
