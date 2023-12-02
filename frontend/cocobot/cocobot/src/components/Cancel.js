import React, { useState, useEffect, useRef } from "react";
import styles from "./Cancel.module.css";

export default function Cancel({ onClick, botIsTyping}) {

  // const [buttonPressed, setButtonPressed] = useState(false);

  // const buttonAction = () => {
  //   if (buttonPressed) {
  //     console.log("buttonAction Called")
  //     setBotIsTyping(false);
  //   }
  // };

  // useEffect(() => {
  //   if (buttonPressed) {
  //     console.log("Canceled");
  //     setButtonPressed(false);
  //     onClick();
  //   }
  // }, [botIsTyping, setBotIsTyping]);

  return (
    <button className={styles.wrapper} onClick={onClick} disabled={!botIsTyping}>
      Cancel
    </button>
  );
}