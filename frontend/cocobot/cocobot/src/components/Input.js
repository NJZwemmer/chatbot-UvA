import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faSpinner, faCommentDots } from '@fortawesome/free-solid-svg-icons';

import styles from "./Input.module.css";

export default function Input({ value, buttonPressed, botIsTyping, setValue, setButtonPressed, onChange, onClick }) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [questions, setQuestions] = useState([]);

  const toggleDropdown = () => {
    getQuestions();
    setDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownItemClick = (item) => {
    setDropdownOpen(false);
    setValue(item.question);
    setButtonPressed(true);
  };

  useEffect(() => {
    if (buttonPressed) {
      setButtonPressed(false);
      onClick();
    }
  }, [buttonPressed, onClick, setButtonPressed]);

  const getQuestions = async () => {
    try {
      const response = await fetch("/api/database/questions");
      const data = await response.json();

      const questionList = data.map((item, index) => ({
        id: index,
        question: Object.values(item)[0],
      }));
      setQuestions(questionList);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  return (
    <div className={styles.wrapper}>
      {isDropdownOpen && questions.length > 0 && (
        <div className={styles.dropdownContainer}>
          {questions.map((question) => (
            <div
              className={styles.dropdownItem}
              key={question.id}
              onClick={() => handleDropdownItemClick(question)}>
              {question.question}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={toggleDropdown}
        className={`${styles.dropbtn} ${isDropdownOpen ? styles.crossBtn : styles.questionMark}`}
        disabled={botIsTyping}
      >
        <FontAwesomeIcon icon={botIsTyping ? faSpinner : faCommentDots} spin={botIsTyping} inverse />
      </button>
      <div className={styles.border}></div>
      <input
        autoFocus
        onKeyDown={(e) => (
          e.key === 'Enter' ? onClick() : null
        )}
        className={styles.text}
        placeholder="Your prompt here..."
        value={value}
        onChange={onChange}
        disabled={botIsTyping}
      />
      <div className={styles.border}></div>
      <button
        className={`${styles.btn} ${botIsTyping ? styles.disabledButton : ""}`}
        onClick={onClick}
        disabled={botIsTyping}
      >
        <FontAwesomeIcon icon={botIsTyping ? faSpinner : faShare} spin={botIsTyping} inverse />
      </button>
    </div>
  );
}
