import { useNavigate } from 'react-router-dom';
import { useChatList } from './hooks/useChatList';
import { MessageList } from './components/MessageList';
import styles from './index.less';

export function ChatAIConversation() {

  const { messages, inputDraft, setMessages, setInputDraft, isChatListLoading, chatList, handleSendButtonClick } = useChatList();
  const navigate = useNavigate();


  const handleBackButtonClick = () => {
  navigate('/home');
};

  return (
        <div className={styles.chatPage}>
          <div className={styles.chatHeader}>
            <div className={styles.backButton} onClick={handleBackButtonClick}>‹</div>
            <h3 className={styles.pageTitle}>Chat</h3>
            <div className={styles.moreButton}>⋮</div>
          </div>
          {messages.map((item, index) => (
              <div key={item.id ?? index} className={styles.messageItem} style={{ flexDirection: item.role === 'user' ? 'row-reverse' : 'row' }}>
                <div className={styles.avatar} style={{ border: item.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: item.role === 'user' ? 'linear-gradient(135deg, #f472b6, #fb923c)' : '#1f1f2e' }} />
                <div className={styles.bubble} style={{ background: item.role === 'user' ? 'linear-gradient(135deg, #f472b6, #fb923c)' : 'rgba(255,255,255,0.08)', borderTopLeftRadius: item.role === 'user' ? '16px' : '4px', borderBottomRightRadius: item.role === 'user' ? '4px' : '16px' }}>
                  <p className={styles.messageText}>{item.text}</p>
                </div>
              </div>
          ))}
          <div className={styles.inputBar}>
            <input className={styles.messageInput} value={inputDraft} onChange={e => setInputDraft(e.target.value)} />
            <div className={styles.sendButton} onClick={handleSendButtonClick} />
            <div className={styles.voiceButton}>🎙</div>
            <div className={styles.imageButton}>🖼</div>
          </div>
        </div>
  );
}
