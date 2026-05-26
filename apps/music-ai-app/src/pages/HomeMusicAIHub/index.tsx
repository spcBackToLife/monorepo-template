import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeHeader } from './components/HomeHeader';
import { MainContent } from './components/MainContent';
import styles from './index.module.less';
import { BottomTabBar } from '@/components/BottomTabBar';

export function HomeMusicAIHub() {
  const [hero] = useState({"cta":"Start Creating","title":"AI Music Studio","greeting":"Tap to start","subtitle":"Create, collaborate, and share music with AI","backgroundImage":"hero-bg.png"});
  const [user] = useState({"name":"User","isPro":false,"avatar":"","displayName":"Music Maker"});
  const [featureTiles] = useState([{"id":"1","icon":"mic","title":"AI Singing","subtitle":"Create songs with AI"}]);
  const [popularPrompts] = useState([{"id":"1","title":"Create a lo-fi beat"}]);

  const navigate = useNavigate();


  const handleHeroCircleClick = () => {
  navigate("/chat");
};

  const handleFeatureTileClick = () => {
  navigate("/chat");
};

  return (
    <div className={styles.homePage}>
      <HomeHeader user={user} />
      <MainContent
        hero={hero}
        featureTiles={featureTiles}
        popularPrompts={popularPrompts}
        handleHeroCircleClick={handleHeroCircleClick}
        handleFeatureTileClick={handleFeatureTileClick}
      />
      <BottomTabBar />
    </div>
  );
}
