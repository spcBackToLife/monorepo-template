import styles from './index.less';

interface CreateTileProps {
  featureTiles: unknown;
  handleCreateTileClick: () => void;
}


export function CreateTile({ featureTiles, handleCreateTileClick }: CreateTileProps) {


  return (
        <div className={styles.createTile} onClick={handleCreateTileClick}>
          <div className={styles.tileIcon}></div>
          <p>{featureTiles[0].title}</p>
          <p>{featureTiles[0].subtitle}</p>
          <div className={styles.tileArrow}>›</div>
        </div>
  );
}
