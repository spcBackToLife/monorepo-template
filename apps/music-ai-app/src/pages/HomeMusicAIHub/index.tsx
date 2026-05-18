import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeHeader } from './components/HomeHeader';
import { MainContent } from './components/MainContent';
import { BottomTabBar } from './components/BottomTabBar';
import type { HeroInfo, UserInfo, FeatureTile, PopularPrompt } from './types';
import styles from './index.module.less';

export function HomeMusicAIHub() {
  const [hero] = useState<HeroInfo>({"cta":"Start Creating","title":"AI Music Studio","greeting":"Tap to start","subtitle":"Create, collaborate, and share music with AI","backgroundImage":"hero-bg.png"});
  const [user] = useState<UserInfo>({"name":"User","isPro":false,"avatar":"","displayName":"Music Maker"});
  const [featureTiles] = useState<FeatureTile[]>([{"id":"1","icon":"mic","title":"AI Singing","subtitle":"Transform your voice","description":"Transform your voice with AI"},{"id":"2","icon":"remix","title":"AI Remix","subtitle":"Remix any track","description":"Remix and reimagine any track with AI"},{"id":"3","icon":"collab","title":"Collab","subtitle":"Create together","description":"Collaborate with friends and AI"},{"id":"4","icon":"explore","title":"Explore","subtitle":"Discover new music","description":"Explore AI-generated music"}]);
  const [popularPrompts] = useState<PopularPrompt[]>([{"id":"1","text":"Create a lo-fi beat","title":"Create a lo-fi beat","category":"beats"},{"id":"2","text":"Sing a pop ballad","title":"Sing a pop ballad","category":"vocal"}]);

  const navigate = useNavigate();


  const handleHeroCircleClick = () => {
  navigate("/chat");
};

  const handleFeatureTileClick = () => {
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
        handleFeatureTileClick={handleFeatureTileClick}
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
