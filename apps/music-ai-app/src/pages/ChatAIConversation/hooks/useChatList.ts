import { useState, useEffect } from 'react';
import { chatList, chatSend } from '../../../services/chat';

export function useChatList() {
  const [messages, setMessages] = useState<unknown>([{"id":"msg_1","role":"user","text":"Hello!"}]);
  const [inputDraft, setInputDraft] = useState<string>("");
  const [isChatListLoading, setIsChatListLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsChatListLoading(true);
      try {
        const result = await chatList();
        setMessages(result);
      } catch (error) {
        console.error('Failed to fetch chat-list:', error);
      } finally {
        setIsChatListLoading(false);
      }
    };
    fetchData();
  }, []);
  const handleSendButtonClick = async () => {
    if (!(inputDraft.length > 0)) return;
    const result = await chatSend({ text: inputDraft });
    setMessages(prev => [...prev, result.userMessage]);
    setMessages(prev => [...prev, result.aiReply]);
    setInputDraft("");
  };

  return { messages, inputDraft, setMessages, setInputDraft, isChatListLoading, handleSendButtonClick };
}
