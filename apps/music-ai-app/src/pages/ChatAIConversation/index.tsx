import { useNavigate } from 'react-router-dom';
import { useChatList } from './hooks/useChatList';
import { ChatHeader } from './components/ChatHeader';
import { MessageItem } from './components/MessageItem';
import { InputBar } from './components/InputBar';
import styles from './index.module.less';

export function ChatAIConversation() {

  const { messages, inputDraft, setMessages, setInputDraft, isChatListLoading, handleSendButtonClick } = useChatList();
  const navigate = useNavigate();


  const handleBackButtonClick = () => {
  navigate("/home");
};

  return (
    <div className={styles.chatPage}>
      <ChatHeader handleBackButtonClick={handleBackButtonClick} />
      <div className={styles.messageList}>
        {messages.map((item, index) => (
            <MessageItem key={item.id ?? index} item={item} index={index} />
        ))}
      </div>
      <InputBar
        inputDraft={inputDraft}
        setInputDraft={setInputDraft}
        handleSendButtonClick={handleSendButtonClick}
      />
    </div>
  );
}
