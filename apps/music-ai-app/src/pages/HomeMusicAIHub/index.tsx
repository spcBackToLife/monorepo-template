import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeHeader } from './components/HomeHeader';
import { MainContent } from './components/MainContent';
import { BottomTabBar } from './components/BottomTabBar';
import type { HeroInfo, UserInfo, FeatureTile, PopularPrompt } from './types';
import styles from './index.module.less';

export function HomeMusicAIHub() {
  const [hero, setHero] = useState<HeroInfo>({"cta":"Start Creating","title":"AI Music Studio","greeting":"Tap to start","subtitle":"Create, collaborate, and share music with AI","backgroundImage":"hero-bg.png"});
  const [user, setUser] = useState<UserInfo>({"name":"User","isPro":false,"avatar":"","displayName":"Music Maker"});
  const [featureTiles, setFeatureTiles] = useState<FeatureTile[]>([]);
  const [popularPrompts, setPopularPrompts] = useState<PopularPrompt[]>([]);

  const navigate = useNavigate();


  const handleHeroCircleClick = () => {
  navigate("/chat");
};

  const handleCreateTileClick = () => {
  navigate("/chat");
};

  const handleRemixTileClick = () => {
  navigate("/chat");
};

  const handleCollabTileClick = () => {
  navigate("/chat");
};

  const handleExploreTileClick = () => {
  navigate("/chat");
};

  const handleHomeTabClick = () => {
  navigate("/home");
};

  const handleMessagesTabClick = () => {
  navigate("/chat");
};

  const handleHistoryTabClick = () => {
  navigate("/home");
};

  const handleProfileTabClick = () => {
  navigate("/home");
};

  return (
    <div className={styles.homePage}>
      <HomeHeader user={user} />
      <MainContent
        hero={hero}
        featureTiles={featureTiles}
        popularPrompts={popularPrompts}
        handleHeroCircleClick={handleHeroCircleClick}
        handleCreateTileClick={handleCreateTileClick}
        handleRemixTileClick={handleRemixTileClick}
        handleCollabTileClick={handleCollabTileClick}
        handleExploreTileClick={handleExploreTileClick}
      />
      <BottomTabBar
        handleHomeTabClick={handleHomeTabClick}
        handleMessagesTabClick={handleMessagesTabClick}
        handleHistoryTabClick={handleHistoryTabClick}
        handleProfileTabClick={handleProfileTabClick}
      />
    </div>
  );
}
