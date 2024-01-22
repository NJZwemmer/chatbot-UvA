import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faQuestion, faListCheck, faCommentMedical } from '@fortawesome/free-solid-svg-icons';

const ChatTitle = ({ switchHistory, setupQuiz, newChat, canvasInfo }) => {
  return (
    <div className="ChatTitle">
      <button className="TitleBtn" onClick={switchHistory}>
        <FontAwesomeIcon icon={faHistory} inverse />
      </button>
      <button className="TitleBtn">
        <FontAwesomeIcon icon={faQuestion} inverse />
      </button>
      {canvasInfo ? (
        <h3>Current Chat - {canvasInfo.title}</h3>
      ) : (
        <h3>Current Chat - No Canvas connection</h3>
      )}
      <button className="TitleBtn" onClick={setupQuiz}>
        <FontAwesomeIcon icon={faListCheck} inverse />
      </button>
      <button className="TitleBtn" onClick={newChat}>
        <FontAwesomeIcon icon={faCommentMedical} inverse />
      </button>
    </div>
  );
};

export default ChatTitle;