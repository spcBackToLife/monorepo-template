import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentCard } from './components/ContentCard';
import styles from './index.module.less';

export function WelcomeOnboarding() {
  const [welcomePagerIndex, setWelcomePagerIndex] = useState<string>("0");
  const [slide] = useState({"title":"Your Music, Your Imagination\nAI Makes It Real.","eyebrow":"Welcome to","description":"Create your own music with AI","emptyBanner":""});

  const navigate = useNavigate();


  const handleDotIndicatorClick = () => {
  setWelcomePagerIndex("0");
};

  const handleDotIndicator2Click = () => {
  setWelcomePagerIndex("1");
};

  const handleDotIndicator3Click = () => {
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
        handleDotIndicator2Click={handleDotIndicator2Click}
        handleDotIndicator3Click={handleDotIndicator3Click}
        handleSkipButtonClick={handleSkipButtonClick}
        handleNextButtonClick={handleNextButtonClick}
      />
    </div>
  );
}
