import styles from './index.module.less';
import type { Message } from '../../types';

interface MessageItemProps {
  item: Message;
  index: number;
}


export function MessageItem({ item, index }: MessageItemProps) {


  return (
        <div className={styles.messageItem} style={{ flexDirection: item.role === 'user' ? 'row-reverse' : 'row' }}>
          <div className={styles.avatar} style={{ border: item.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: item.role === 'user' ? 'linear-gradient(135deg, #f472b6, #fb923c)' : '#1f1f2e' }} />
          <div className={styles.bubble} style={{ background: item.role === 'user' ? 'linear-gradient(135deg, #f472b6, #fb923c)' : 'rgba(255,255,255,0.08)', borderTopLeftRadius: item.role === 'user' ? '16px' : '4px', borderBottomRightRadius: item.role === 'user' ? '4px' : '16px' }}>
            <p className={styles.messageText}>{item.text}</p>
          </div>
        </div>
  );
}
