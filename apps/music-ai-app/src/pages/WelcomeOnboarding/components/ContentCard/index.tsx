import styles from './index.module.less';

interface ContentCardProps {
  slide: unknown;
  handleDotIndicatorClick: () => void;
  handleDotIndicator2Click: () => void;
  handleDotIndicator3Click: () => void;
  handleSkipButtonClick: () => void;
  handleNextButtonClick: () => void;
}


export function ContentCard({ slide, handleDotIndicatorClick, handleDotIndicator2Click, handleDotIndicator3Click, handleSkipButtonClick, handleNextButtonClick }: ContentCardProps) {


  return (
        <div className={styles.contentCard}>
          <p className={styles.labelText}>{slide.eyebrow || 'Welcome to'}</p>
          <h1 className={styles.labelText2}>{slide.title || 'Your Music, Your Imagination\nAI Makes It Real.'}</h1>
          <p className={styles.labelText3}>{slide.description || 'Create your own music with the help of AI. Choose a genre, set a mood, and let AI create your song!'}</p>
          <p className={styles.labelText4}>{slide.emptyBanner || ''}</p>
          <div className={styles.pagerDots}>
            <div className={styles.dotIndicator} onClick={handleDotIndicatorClick} />
            <div className={styles.dotIndicator2} onClick={handleDotIndicator2Click} />
            <div className={styles.dotIndicator3} onClick={handleDotIndicator3Click} />
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.skipButton} onClick={handleSkipButtonClick}>Skip</button>
            <button className={styles.nextButton} onClick={handleNextButtonClick}>→</button>
          </div>
        </div>
  );
}
