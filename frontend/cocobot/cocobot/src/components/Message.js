import bot from "../icons/bot.png";
import user from "../icons/user.png";

import styles from "./Message.module.css";

export default function Message({ onClick, quiz, role, content, time }) {
  return (
    <div className={styles.wrapper}>
      { role === "user" && (
        quiz == true ? (
          <div>
            <div className={styles.userQuiz}>
              <div>
                { content.map(element =>
                  <div className={styles.userOption} onClick={() => {onClick(element)}}>{element}</div>
                )}
              </div>
              <div>
                <img
                  src={role === "assistant" ? bot : user}
                  className={styles.avatar}
                  alt="profile avatar"
                />
                <div className={styles.userTimestamp}>{time}</div>
              </div>
            </div>
          </div>
        ): (
          <div>
            <div className={styles.userMessage}>
              <div>
                <p>{content}</p>
              </div>
              <div>
                <img
                  src={role === "assistant" ? bot : user}
                  className={styles.avatar}
                  alt="profile avatar"
                />
                <div className={styles.userTimestamp}>{time}</div>
              </div>
            </div>
          </div>
        )
        

      )}
      { role === "assistant" && (
        <div className={styles.assistantMessage}>
          <div>
            <img
              src={role === "assistant" ? bot : user}
              className={styles.avatar}
              alt="profile avatar"
            />
            <div className={styles.assistantTimestamp}>{time}</div>
          </div>
          <div>
            <p>{content}</p>
          </div>
        </div>
      )}
    </div>
  );
}