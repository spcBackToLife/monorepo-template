import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatList, chatSend } from '@/services/chat';
import styles from './index.less';
import { MessageList } from './components/MessageList';
import { useChatList } from './hooks/useChatList';
import { useChatSend } from './hooks/useChatSend';

export function ChatAIConversation() {
  const [inputDraft, setInputDraft] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, unknown>[]>([{"id":"1","role":"assistant","text":"Hi! I'm your AI music assistant. What would you like to create today?"},{"id":"2","role":"user","text":"Create a lo-fi beat for studying"},{"id":"3","role":"assistant","text":"Great! I'll craft a chill lo-fi track at 70 BPM with soft piano and rain ambience."},{"id":"4","role":"user","text":"Perfect, make it 2 minutes long"},{"id":"5","role":"assistant","text":"Got it! 2 minutes of lo-fi goodness coming right up. Adding some vinyl crackle for warmth."},{"id":"6","role":"user","text":"Can you add some jazz guitar?"},{"id":"7","role":"assistant","text":"Absolutely! I'll layer in some mellow jazz guitar chords with a slight reverb."},{"id":"8","role":"user","text":"How about a saxophone solo in the middle?"},{"id":"9","role":"assistant","text":"Nice idea! I'll add a smooth saxophone solo around the 1-minute mark."},{"id":"10","role":"user","text":"Love it! Can we also try a hip-hop version?"},{"id":"11","role":"assistant","text":"Sure! I'll create a hip-hop remix with boom-bap drums and a heavier bass line."},{"id":"12","role":"user","text":"Make the drums punchier"},{"id":"13","role":"assistant","text":"Done! Boosted the kick and snare with sidechain compression for that pumping effect."},{"id":"14","role":"user","text":"What BPM is the hip-hop version?"},{"id":"15","role":"assistant","text":"The hip-hop version is at 90 BPM. Want me to speed it up?"},{"id":"16","role":"user","text":"No, 90 is perfect. Can you add vocals?"},{"id":"17","role":"assistant","text":"I can add vocal chops and harmonized samples. Full vocal generation is coming soon!"},{"id":"18","role":"user","text":"Add the vocal chops then"},{"id":"19","role":"assistant","text":"Added! Pitched vocal chops on beats 2 and 4 with a reverb tail."},{"id":"20","role":"user","text":"This is amazing, save both versions!"}]);
  const navigate = useNavigate();

  useEffect(() => {
  const init = async () => {
    const result = await chatList({});
    setMessages(result.data);
  };
  init();
}, []);

  const handleBackButtonClick = () => {
  navigate('/home');
};

  const handleSendButtonClick = async () => {
  if (!(inputDraft.length > 0)) return;
  const result = await chatSend({ text: inputDraft });
  setMessages(prev => [...prev, result.userMessage]);
  setMessages(prev => [...prev, result.aiReply]);
  setInputDraft("");
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
