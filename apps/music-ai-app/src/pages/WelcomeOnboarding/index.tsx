import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentCard } from './components/ContentCard';
import type { Slide } from './types';
import styles from './index.module.less';

export function WelcomeOnboarding() {
  const [welcomePagerIndex, setWelcomePagerIndex] = useState<string>("0");
  const [slide] = useState<Slide>({"title":"Your Music, Your Imagination\nAI Makes It Real.","eyebrow":"Welcome to","description":"Create your own music with the help of AI. Choose a genre, set a mood, and let AI create your song!","emptyBanner":""});

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
  navigate("/home");
};

  const handleNextButtonClick = () => {
  navigate("/home");
};

  return (
    <div className={styles.welcomePage}>
      <div className={styles.backdropOverlay} />
      <ContentCard
        slide={slide}
        handleDotIndicatorClick={handleDotIndicatorClick}
        handle7b28a3Click={handle7b28a3Click}
        handle8ab03fClick={handle8ab03fClick}
        handleSkipButtonClick={handleSkipButtonClick}
        handleNextButtonClick={handleNextButtonClick}
      />
    </div>
  );
}
