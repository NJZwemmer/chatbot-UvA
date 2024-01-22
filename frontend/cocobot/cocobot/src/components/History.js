import styles from "./History.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

export default function History({ question, onClick, deleteFunction, timestamp }) {
  return (
    <div>
      <div className={styles.historyItem}>
        <div className={styles.wrapper} onClick={onClick}>
          <div>
            {question.length > 18 ? 
              <p>{question.substring(0, 15)}...</p>
              :
              <p>{question}</p>
            }
            
            <p className={styles.dateTime}>{timestamp.split(":")[0] + ":" + timestamp.split(":")[1]}</p>
            </div>
        </div>
        <button
            className={styles.btn}
            onClick={deleteFunction}
          >
          <FontAwesomeIcon icon={faTrash} inverse/>
        </button>
      </div>
    </div>
    
    
  );
}