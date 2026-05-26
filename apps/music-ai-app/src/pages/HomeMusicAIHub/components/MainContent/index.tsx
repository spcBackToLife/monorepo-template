import styles from './index.module.less';

interface MainContentProps {
  hero: unknown;
  featureTiles: unknown;
  popularPrompts: unknown;
  handleHeroCircleClick: () => void;
  handleFeatureTileClick: () => void;
}


export function MainContent({ hero, featureTiles, popularPrompts, handleHeroCircleClick, handleFeatureTileClick }: MainContentProps) {


  return (
        <div className={styles.mainContent}>
          <div className={styles.heroCircle} onClick={handleHeroCircleClick}>
            <p className={styles.heroGreeting}>{hero.greeting}</p>
            <h2 className={styles.heroTitle}>{hero.cta}</h2>
            <div className={styles.heroRing}>
              <div className={styles.micIcon} />
            </div>
          </div>
          <div className={styles.featureGrid}>
            {featureTiles.map((item, index) => (
                <div key={item.id ?? index} className={styles.featureTile} onClick={handleFeatureTileClick}>
                  <div className={styles.tileIcon}></div>
                  <p className={styles.featureTileTitle}>{item.title}</p>
                  <p className={styles.featureTileSubtitle}>{item.subtitle}</p>
                  <div className={styles.tileArrow}>›</div>
                </div>
            ))}
          </div>
          <div className={styles.popularPrompts}>
            <div className={styles.popularHeader}>
              <h3 className={styles.popularTitle}>Popular Promt</h3>
              <span className={styles.seeAllLink}>See All</span>
            </div>
            <div className={styles.promptList}>
              {popularPrompts.map((item, index) => (
                  <div key={item.id ?? index} className={styles.promptCard}>
                    <div className={styles.promptCardIcon}></div>
                    <p className={styles.promptCardText}>{item.title}</p>
                    <div className={styles.promptCardArrow}>›</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
  );
}
