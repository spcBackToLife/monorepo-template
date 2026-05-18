import styles from './index.module.less';
import type { Slide } from '../../types';

interface ContentCardProps {
  slide: Slide;
  handleDotIndicatorClick: () => void;
  handle7b28a3Click: () => void;
  handle8ab03fClick: () => void;
  handleSkipButtonClick: () => void;
  handleNextButtonClick: () => void;
}


export function ContentCard({ slide, handleDotIndicatorClick, handle7b28a3Click, handle8ab03fClick, handleSkipButtonClick, handleNextButtonClick }: ContentCardProps) {


  return (
        <div className={styles.contentCard}>
          <p className={styles.node497927}>{slide.eyebrow || 'Welcome to'}</p>
          <h1 className={styles.node19d1ae}>{slide.title || 'Your Music, Your Imagination\nAI Makes It Real.'}</h1>
          <p className={styles.node781a08}>{slide.description || 'Create your own music with the help of AI. Choose a genre, set a mood, and let AI create your song!'}</p>
          <p className={styles.nodeeb357b}>{slide.emptyBanner || ''}</p>
          <div className={styles.pagerDots}>
            <div className={styles.dotIndicator} onClick={handleDotIndicatorClick} />
            <div className={styles.node7b28a3} onClick={handle7b28a3Click} />
            <div className={styles.node8ab03f} onClick={handle8ab03fClick} />
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.skipButton} onClick={handleSkipButtonClick}>Skip</button>
            <button className={styles.nextButton} onClick={handleNextButtonClick}>→</button>
          </div>
        </div>
  );
}
