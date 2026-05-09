import styles from './index.less';

interface RemixTileProps {
  featureTiles: Record<string, unknown>[];
  handleRemixTileClick: () => void;
}


export function RemixTile({ featureTiles, handleRemixTileClick }: RemixTileProps) {


  return (
        <div className={styles.remixTile} onClick={handleRemixTileClick}>
          <div className={styles.tileIcon}></div>
          <p>{featureTiles[1].title}</p>
          <p>{featureTiles[1].subtitle}</p>
          <div className={styles.tileArrow}>›</div>
        </div>
  );
}
