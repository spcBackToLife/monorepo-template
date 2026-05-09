import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './index.less';

export function WelcomeOnboarding() {
  const [welcomePagerIndex, setWelcomePagerIndex] = useState<string>("0");
  const [slide, setSlide] = useState<Record<string, unknown>>({"title":"Your Music, Your Imagination\nAI Makes It Real.","eyebrow":"Welcome to","description":"Create your own music with the help of AI. Choose a genre, set a mood, and let AI create your song!","emptyBanner":""});
  const navigate = useNavigate();


  const handleDotIndicatorClick = () => {
  setWelcomePagerIndex("0");
};

  const handle7b28a3Click = () => {
  setWelcomePagerIndex("1");
};

  const handle8ab03fClick = () => {
  setWelcomePagerIndex("2");
};

  const handleSkipButtonClick = () => {
  navigate('/home');
};

  const handleNextButtonClick = () => {
  navigate('/home');
};

  return (
        <div className={styles.welcomePage}>
          <div className={styles.backdropOverlay} />
          <div className={styles.contentCard}>
            <p>{slide.eyebrow || 'Welcome to'}</p>
            <h1>{slide.title || 'Your Music, Your Imagination\nAI Makes It Real.'}</h1>
            <p>{slide.description || 'Create your own music with the help of AI. Choose a genre, set a mood, and let AI create your song!'}</p>
            <p>{slide.emptyBanner || ''}</p>
            <div className={styles.pagerDots}>
              <div className={styles.dotIndicator} onClick={handleDotIndicatorClick} />
              <div onClick={handle7b28a3Click} />
              <div onClick={handle8ab03fClick} />
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.skipButton} onClick={handleSkipButtonClick}>Skip</button>
              <button className={styles.nextButton} onClick={handleNextButtonClick}>→</button>
            </div>
          </div>
        </div>
  );
}
