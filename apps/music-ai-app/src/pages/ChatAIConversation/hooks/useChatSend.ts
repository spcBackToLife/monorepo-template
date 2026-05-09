import { useState, useEffect } from 'react';

export function useChatSend() {
const [messages, setMessages] = useState<unknown>(undefined);
const [inputDraft, setInputDraft] = useState<unknown>(undefined);
  useEffect(() => {
    chatSend().then(res => setMessages(res));
  }, []);
const handleSendButtonClick = async () => {
  if (!(inputDraft.length > 0)) return;
  const result = await chatSend({ text: inputDraft });
  setMessages(prev => [...prev, result.userMessage]);
  setMessages(prev => [...prev, result.aiReply]);
  setInputDraft("");
};

  return { messages, inputDraft, isChatSendLoading, chatSend, handleSendButtonClick };
}
