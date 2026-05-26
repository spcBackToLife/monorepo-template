import styles from './index.module.less';

interface InputBarProps {
  inputDraft: string;
  setInputDraft: (value: string) => void;
  handleSendButtonClick: () => void;
}


export function InputBar({ inputDraft, setInputDraft, handleSendButtonClick }: InputBarProps) {


  return (
        <div className={styles.inputBar}>
          <input className={styles.messageInput} value={inputDraft} onChange={e => setInputDraft(e.target.value)} placeholder="Write here" />
          <div className={styles.sendButton} onClick={handleSendButtonClick} />
          <div className={styles.voiceButton}>🎙</div>
          <div className={styles.imageButton}>🖼</div>
        </div>
  );
}
