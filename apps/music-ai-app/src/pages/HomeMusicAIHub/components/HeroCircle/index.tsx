import styles from './index.less';

interface HeroCircleProps {
  hero: unknown;
  handleHeroCircleClick: () => void;
}


export function HeroCircle({ hero, handleHeroCircleClick }: HeroCircleProps) {


  return (
        <div className={styles.heroCircle} onClick={handleHeroCircleClick}>
          <p>{hero.greeting}</p>
          <h2>{hero.cta}</h2>
          <div className={styles.heroRing}>
            <div className={styles.micIcon} />
          </div>
        </div>
  );
}
