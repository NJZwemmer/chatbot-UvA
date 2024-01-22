import React from 'react';
import styles from './Cancel.module.css';

const Cancel = ({ onClick, botIsTyping }) => {
  return (
    <button className={styles.wrapper} onClick={onClick} disabled={!botIsTyping}>
      Cancel
    </button>
  );
};

export default Cancel;