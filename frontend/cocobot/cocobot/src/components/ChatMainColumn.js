import React from 'react';
import ChatTitle from './ChatTitle';
import ChatContent from './ChatContent';
import InputArea from './InputArea';


const styles = {
  background: `url(${backgroundImage}) no-repeat center center fixed, rgba(255, 255, 255, 0.5)`,
  backgroundSize: '35%',
  backgroundPosition: 'center'
};


const ChatMainColumn = ({
  showHistory,
  switchHistory,
  setupQuiz,
  newChat,
  messages,
  quizActive,
  setInput,
  handleSubmit,
  botIsTyping,
  showChatSuggestions,
  suggestionSource,
  quizReaction,
  canvasInfo,
  lastMessageRef,
  messagesContainerRef
}) => {
  return (
    <div className={`ChatColumn ${showHistory ? 'ShowHistory' : null}`} style={styles}>
      <ChatTitle
        switchHistory={switchHistory}
        setupQuiz={setupQuiz}
        newChat={newChat}
        canvasInfo={canvasInfo} // Pass canvasInfo as needed
      />
      <ChatContent
        messages={messages}
        quizReaction={quizReaction}
        lastMessageRef={lastMessageRef}
        botIsTyping={botIsTyping}
        messagesContainerRef={messagesContainerRef}
      />
      {!botIsTyping && !quizActive && (
        <InputArea
          value={input}
          buttonPressed={buttonPressed}
          botIsTyping={botIsTyping}
          showChatSuggestions={showChatSuggestions}
          suggestionSource={suggestionSource}
          setQuizSubject={setQuizSubject}
          setValue={setInput}
          setButtonPressed={setButtonPressed}
          onChange={(e) => setInput(e.target.value)}
          onClick={() => {
            question.current = input;
            handleSubmit();
          }}
        />
      )}
      {botIsTyping && !quizActive && (
        <Cancel onClick={() => (botIsTyping.current = false)} botIsTyping={botIsTyping.current} />
      )}
    </div>
  );
};

export default ChatMainColumn;