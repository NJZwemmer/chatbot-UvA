import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faSpinner } from '@fortawesome/free-solid-svg-icons';

import styles from "./Input.module.css";

export default function Input({ value, buttonPressed, botIsTyping, setValue, setButtonPressed, onChange, onClick, showChatSuggestions, suggestionSource, setQuizSubject }) {
  const [suggestions, setSuggestions] = useState([]);

  const handlesuggestionItemClick = (item) => {
    if (suggestionSource === "suggestions") {
      setValue(item.suggestion);
      setButtonPressed(true);
      getSuggestions();
    } else {
      setQuizSubject(item.suggestion);
    }
    
  };

  useEffect(() => {
    getSuggestions();
  }, [suggestionSource]);

  useEffect(() => {
    if (buttonPressed) {
      setButtonPressed(false);
      onClick();
    }
  }, [buttonPressed, onClick, setButtonPressed]);

  const getSuggestions = async () => {
    console.log("getSuggestions called!");
    console.log("/api/database/" + suggestionSource)
    try {
      const response = await fetch("/api/database/" + suggestionSource);
      const data = await response.json();

      const suggestionList = data.map((item) => ({
        suggestion: item,
      }));
      setSuggestions(suggestionList);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  return (
    <div className={styles.wrapper}>
      {showChatSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestionContainer}>
          {suggestions.map((suggestion, index) => (
            <div
              className={styles.suggestionItem}
              key={index}
              onClick={() => handlesuggestionItemClick(suggestion)}>
              {suggestion.suggestion}
            </div>
          ))}
        </div>
      )}
      <input
        autoFocus
        onKeyDown={(e) => (
          e.key === 'Enter' ? onClick() : null
        )}
        className={styles.text}
        placeholder="Message..."
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
