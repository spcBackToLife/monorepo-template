import styles from './index.less';

interface ExploreTileProps {
  featureTiles: unknown;
  handleExploreTileClick: () => void;
}


export function ExploreTile({ featureTiles, handleExploreTileClick }: ExploreTileProps) {


  return (
        <div className={styles.exploreTile} onClick={handleExploreTileClick}>
          <div className={styles.tileIcon}></div>
          <p>{featureTiles[3].title}</p>
          <p>{featureTiles[3].subtitle}</p>
          <div className={styles.tileArrow}>›</div>
        </div>
  );
}
