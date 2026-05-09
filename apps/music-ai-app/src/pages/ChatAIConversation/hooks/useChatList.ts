import { useState, useEffect } from 'react';

export function useChatList() {
const [messages, setMessages] = useState<unknown>(undefined);
  useEffect(() => {
    chatList().then(res => setMessages(res));
  }, []);


  return { messages, isChatListLoading, chatList };
}
