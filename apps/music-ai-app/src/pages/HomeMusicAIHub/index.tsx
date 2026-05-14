import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroCircle } from './components/HeroCircle';
import { CreateTile } from './components/CreateTile';
import { RemixTile } from './components/RemixTile';
import { CollabTile } from './components/CollabTile';
import { ExploreTile } from './components/ExploreTile';
import { BottomTabBar } from './components/BottomTabBar';
import styles from './index.less';

export function HomeMusicAIHub() {
  const [hero, setHero] = useState<unknown>([]);
  const [user, setUser] = useState<unknown>([]);
  const [featureTiles, setFeatureTiles] = useState<unknown>([]);
  const [popularPrompts, setPopularPrompts] = useState<unknown>([]);

  const navigate = useNavigate();


  const handleHeroCircleClick = () => {
  navigate('/chat');
};

  const handleCreateTileClick = () => {
  navigate('/chat');
};

  const handleRemixTileClick = () => {
  navigate('/chat');
};

  const handleCollabTileClick = () => {
  navigate('/chat');
};

  const handleExploreTileClick = () => {
  navigate('/chat');
};

  const handleHomeTabClick = () => {
  navigate('/home');
};

  const handleMessagesTabClick = () => {
  navigate('/chat');
};

  const handleHistoryTabClick = () => {
  navigate('/home');
};

  const handleProfileTabClick = () => {
  navigate('/home');
};

  return (
        <div className={styles.homePage}>
          <div className={styles.homeHeader}>
            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>🏆</div>
              <div className={styles.userInfo}>
                <p>Welcome back</p>
                <h3>{user.displayName}</h3>
              </div>
            </div>
            <div className={styles.menuButton}>☰</div>
          </div>
          <div className={styles.mainContent}>
            <div className={styles.heroCircle} onClick={handleHeroCircleClick}>
              <p>{hero.greeting}</p>
              <h2>{hero.cta}</h2>
              <div className={styles.heroRing}>
                <div className={styles.micIcon} />
              </div>
            </div>
            <div className={styles.featureGrid}>
              <div className={styles.createTile} onClick={handleCreateTileClick}>
                <div className={styles.tileIcon}></div>
                <p>{featureTiles[0].title}</p>
                <p>{featureTiles[0].subtitle}</p>
                <div className={styles.tileArrow}>›</div>
              </div>
              <div className={styles.remixTile} onClick={handleRemixTileClick}>
                <div className={styles.tileIcon}></div>
                <p>{featureTiles[1].title}</p>
                <p>{featureTiles[1].subtitle}</p>
                <div className={styles.tileArrow}>›</div>
              </div>
              <div className={styles.collabTile} onClick={handleCollabTileClick}>
                <div className={styles.tileIcon}></div>
                <p>{featureTiles[2].title}</p>
                <p>{featureTiles[2].subtitle}</p>
                <div className={styles.tileArrow}>›</div>
              </div>
              <div className={styles.exploreTile} onClick={handleExploreTileClick}>
                <div className={styles.tileIcon}></div>
                <p>{featureTiles[3].title}</p>
                <p>{featureTiles[3].subtitle}</p>
                <div className={styles.tileArrow}>›</div>
              </div>
            </div>
            <div className={styles.popularPrompts}>
              <div className={styles.popularHeader}>
                <h3>Popular Promt</h3>
                <span className={styles.seeAllLink}>See All</span>
              </div>
              <div className={styles.promptList}>
                <div className={styles.promptCard}>
                  <div className={styles.promptCardIcon}></div>
                  <p>{popularPrompts[0].title}</p>
                  <div className={styles.promptCardArrow}>›</div>
                </div>
                <div className={styles.promptCard}>
                  <div className={styles.promptCardIcon}></div>
                  <p>{popularPrompts[1].title}</p>
                  <div className={styles.promptCardArrow}>›</div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.bottomTabBar}>
            <div className={styles.homeTab} onClick={handleHomeTabClick}>
              <div className={styles.tabIcon}>🏠</div>
              <p>Home</p>
            </div>
            <div className={styles.messagesTab} onClick={handleMessagesTabClick}>
              <div className={styles.tabIcon}>💬</div>
              <p>Messages</p>
            </div>
            <div className={styles.historyTab} onClick={handleHistoryTabClick}>
              <div className={styles.tabIcon}>🕐</div>
              <p>History</p>
            </div>
            <div className={styles.profileTab} onClick={handleProfileTabClick}>
              <div className={styles.tabIcon}>👤</div>
              <p>Profile</p>
            </div>
          </div>
        </div>
  );
}
