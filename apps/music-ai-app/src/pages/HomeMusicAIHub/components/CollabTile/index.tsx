import styles from './index.less';

interface CollabTileProps {
  featureTiles: Record<string, unknown>[];
  handleCollabTileClick: () => void;
}


export function CollabTile({ featureTiles, handleCollabTileClick }: CollabTileProps) {


  return (
        <div className={styles.collabTile} onClick={handleCollabTileClick}>
          <div className={styles.tileIcon}></div>
          <p>{featureTiles[2].title}</p>
          <p>{featureTiles[2].subtitle}</p>
          <div className={styles.tileArrow}>›</div>
        </div>
  );
}
