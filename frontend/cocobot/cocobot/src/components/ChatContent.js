import React, { useEffect } from 'react';
import Message from './Message';
import backgroundImage from '../logos/full_removed_bg.png';


const ChatContent = ({ messages, quizReaction, lastMessageRef, botIsTyping, messagesContainerRef }) => {

  const styles = {
    background: `url(${backgroundImage}) no-repeat center center fixed, rgba(255, 255, 255, 0.5)`,
    backgroundSize: '30%',
    backgroundPosition: 'center'
  };


  useEffect(() => {
    // Scroll to the last message when the messages state changes
    if (lastMessageRef.current) {
      if (botIsTyping.current && messages[messages.length - 1].content.length === 1) {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else if (!botIsTyping.current && messages[messages.length - 1].content.length > 0) {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages, lastMessageRef]);

  return (
    <div className="ChatContent" ref={messagesContainerRef} style={styles}>
      {messages.map((el, i) => (
        <div key={i} ref={i === messages.length - 1 ? lastMessageRef : null}>
          <Message onClick={quizReaction} quiz={el.quiz ? true : false} role={el.role} content={el.content} time={el.time} />
        </div>
      ))}
    </div>
  );
};

export default ChatContent;