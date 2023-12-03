import React, { useState, useEffect, useRef } from "react";
import ReactSession from './ReactSession';
import Message from "./components/Message";
import Input from "./components/Input";
import History from "./components/History";
import Cancel from "./components/Cancel";
import "./App.css";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faCommentMedical, faListCheck, faQuestion } from '@fortawesome/free-solid-svg-icons';

export default function App() {
  const question = useRef("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [buttonPressed, setButtonPressed] = useState(false);
  const messagesContainerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const botIsTyping= useRef(false);
  const [currentChatId, setCurrentChatId] = useState("");

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quizzesSelected, setQuizzesSelected] = useState(false);
  const [showChatSuggestions, setShowChatSuggestions] = useState(false);

  const getQuizResult = async (chatId) => {
    console.log("getQuizResults called!");
    const response = await fetch("/api/database/quiz/result/" + chatId);
    const data = await response.json();

    const correctCount = data.correct_count;
    const totalCount = data.total_count;
    const score = data.score;
    const timestamp = data.timestamp;

    const prompt = {
      role: "assistant",
      content: "You scored " + correctCount + " out of " + totalCount + ". \n That is a score of: " + score + "%.",
      time: timestamp,
    };

    setMessages((messages) => [...messages, prompt]);
  }

  const quizReaction = async (reaction) => {

    const response = await fetch("/api/database/quiz/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: "Creating a chatbot",
        Question: messages.slice(-2, -1)[0].content,
        Answer: reaction
      }),
    });

    const quiz = await response.json();
    const timestamp = quiz.timestamp;
    setMessages((messages) => [
      ...messages.slice(0, -1), // Remove the last message
      {
        role: "user",
        content: reaction,
        time: timestamp,
      },
    ]);

    console.log(quiz);
    if (quiz.message) {
      getQuizResult(currentChatId);
      return;
    }

    const question = quiz.Question;
    const options = quiz.Options;

    const prompt = {
      role: "assistant",
      content: question,
      time: timestamp,
    };

    setMessages((messages) => [...messages, prompt]);

    const answers = {
      quiz: true,
      role: "user",
      content: options,
      time: timestamp,
    };

    setMessages((messages) => [...messages, answers])

  }

  const startQuiz = async () => {
    await newChat();
    const subject = "Creating a chatbot";
    const response = await fetch("/api/database/quiz/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: subject,
      }),
    });

    const quiz = await response.json();
    const question = quiz.Question;
    const options = quiz.Options;
    const timestamp = quiz.timestamp;

    setHistory(history.map((item, idx) => {
      if (item.chat_id === currentChatId) {
        return {
          ...item,
          quiz: true,
          question: subject,
          timestamp: timestamp
        }
      }
      return item
    }))

    const prompt = {
      role: "assistant",
      content: question,
      time: timestamp,
    };

    setMessages((messages) => [...messages, prompt]);

    const answers = {
      quiz: true,
      role: "user",
      content: options,
      time: timestamp,
    };

    setMessages((messages) => [...messages, answers])
  }

  function switch_History() {
    setShowHistory(!showHistory);
  }

  const switch_quizSelected = async (value) => {
    if (value) {
      try {
        const response = await fetch("/api/database/quizzes");
        const data = await response.json();
        
        const historyList = data.map((item, index) => ({
          chat_id: index,
          correct_count: item.correct_count,
          score: item.score,
          question: item.subject,
          timestamp: item.timestamp,
          total_count: item.total_count,
        }));
    
        setHistory(historyList);
        console.log(history);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    } else {
      getHistory();
    }
    setQuizzesSelected(value);

  }

  const getHistory = async () => {
    try {
      const response = await fetch("/api/database/history");
      const data = await response.json();
      
      const historyList = data.map((item, index) => ({
        id: index,
        quiz: item.Quiz,
        chat_id: item.chat_id,
        user_id: item.user_id,
        question: item.Question,
        answer: item.Answer,
        timestamp: item.timestamp,
      }));
  
      setHistory(historyList);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  useEffect(() => {
    getHistory();
    newChat();
  }, []);

  const selectHistory = async (chatId) => {
    try {
      const response = await fetch("/api/database/history/" + chatId);
      const data = await response.json();

      setCurrentChatId(chatId);
      setMessages([]);

      if (data[0].Quiz) {
        data.forEach((item, index) => {
          setMessages(prevMessages => [
            ...prevMessages, 
            {
              role: "assistant",
              content: item.Question,
              time: item.timestamp
            },
            {
              role: "user",
              content: item.Answer,
              time: item.timestamp
            }
          ]);
        });

      } else {
        data.forEach((item, index) => {
          setMessages(prevMessages => [
            ...prevMessages, 
            {
              role: "user",
              content: item.Question,
              time: item.timestamp
            },
            {
              role: "assistant",
              content: item.Answer,
              time: item.timestamp
            }
          ]);
        });
      }
      

    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const deleteHistory = async (chatid) => {
    console.log("Delete called");
    currentChatId == chatid && newChat();
    try {
      const response = await fetch("/api/database/history/" + chatid, {
        method: "DELETE",
      });
      const data = await response.json();
      setHistory(oldHistory => {
        return oldHistory.filter(historyItem => historyItem.chat_id !== chatid)
      })

    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  useEffect(() => {
    // Scroll to the last message when the messages state changes
    console.log("Scroll called");
    console.log(lastMessageRef.current);
    if (lastMessageRef.current) {
      if (messages[messages.length - 1].content.length === 1){
        lastMessageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [messages]);

  const handleSubmit = async () => {

    try {
      const response = await fetch("/api/database/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Question: question.current,
        }),
      });

      const data = await response.json();
      const res = data.Answer;
      const timestamp = data.timestamp;

      const prompt = {
        role: "user",
        content: question.current,
        time: timestamp,
      };
  
      setMessages([...messages, prompt]);
  
      // Simulate typing delay
      const typingDelay = 150; // Adjust the delay time as needed
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
  
      // Simulate bot response with gradual typing effect
      const botResponse = {
        role: "assistant",
        content: "",
        time: timestamp,
      };

      setMessages((messages) => [...messages, botResponse]);
      let responseText = "";

      botIsTyping.current = true;

      // Simulate typing delay for the actual response
      const responseDelay = 20; // Adjust the delay time as needed

      for (const char of res) {
        // Simulate typing delay for each character
        await new Promise((resolve) => setTimeout(resolve, responseDelay));
        responseText += char;

        setMessages((messages) => [
          ...messages.slice(0, -1), // Remove the last message
          {
            role: "assistant",
            content: responseText,
            time: timestamp,
          },
        ]);
        
        if (!botIsTyping.current) {
          break;
        }
      }

      console.log(currentChatId);
      console.log(history);
      if (history.some(item => currentChatId == item.chat_id)){
        setHistory(history.map((item, idx) => {
          if (item.chat_id === currentChatId) {
            if (!item.quiz) {
              return {
                ...item,
                question: question.current,
                timestamp: timestamp
              }
            }
          }
          return item
        }))
      } else {
        const newChat = {
          quiz: false,
          chat_id: currentChatId,
          question: question.current,
          timestamp: timestamp,
        };
  
        setHistory((historyItems) => [...historyItems, newChat]);
      }
      

      // console.log(JSON.stringify({
      //   Question: question.current,
      //   Answer: responseText,
      //   Time: timestamp,
      // }));

      setInput("");
    } catch (error) {
      console.error("Error fetching answer:", error);
    } finally {
      botIsTyping.current = false;
    }
  };

  const newChat = async ()=> {
    try {
      const response = await fetch("/api/create_new_chat");
      const data = await response.json();

      setCurrentChatId(data.chat_id);
      console.log("Chat id set: " + data.chat_id);
      setMessages([]);

    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  return (
    <div className="App">
      <div className={`HistoryColumn ${showHistory ? 'ShowHistory' : null}`}>
        <h3 className="HistoryTitle">History</h3>
        <div className="HorizontalBorder"></div>
        <div className="HistoryBanner">
          <h4 className={`HistoryTitle HistoryButton ${quizzesSelected ? 'Faded' : null}`} onClick={() => switch_quizSelected(false)}>Chats</h4>
          <div className="VerticalBorder"></div>
          <h4 className={`HistoryTitle HistoryButton ${quizzesSelected ? null : 'Faded'}`} onClick={() => switch_quizSelected(true)}>Quizzes</h4>
        </div>
        <div className="HorizontalBorder"></div>
        <div className="HistoryContent">
          {history.map((el, i) => (
            <History
              key={i}
              question={el.question}
              timestamp={el.timestamp}
              onClick={() => {selectHistory(el.chat_id); switch_History()}}
              deleteFunction={() => {deleteHistory(el.chat_id)}}
            />
          ))}
        </div>
        {/* <Clear onClick={clear} botIsTyping={botIsTyping.current} /> */}
      </div>
      <div className={`ChatColumn ${showHistory ? 'ShowHistory' : null}`}>
        <div className="ChatTitle">
          <button className="TitleBtn" onClick={switch_History}><FontAwesomeIcon icon={faHistory} inverse/></button>
          <button className="TitleBtn" ><FontAwesomeIcon icon={faQuestion} inverse/></button>
          <h3>Current Chat</h3>
          <button className="TitleBtn" onClick={startQuiz}><FontAwesomeIcon icon={faListCheck} inverse/></button>
          <button className="TitleBtn" onClick={newChat}><FontAwesomeIcon icon={faCommentMedical} inverse/></button>
        </div>
        <div className="ChatContent" ref={messagesContainerRef}>
          {messages.map((el, i) => (
            <div key={i} ref={i === messages.length - 1 ? lastMessageRef : null}>
              <Message onClick={quizReaction} quiz={el.quiz ? true : false} role={el.role} content={el.content} time={el.time} />
            </div>
          ))}
        </div>
        { !botIsTyping.current && (
          <Input
            value={input}
            buttonPressed={buttonPressed}
            botIsTyping={botIsTyping.current}
            setValue={setInput}
            setButtonPressed={setButtonPressed}
            onChange={(e) => setInput(e.target.value)}
            onClick={() => {question.current = input; handleSubmit()}}
          />
        )}
        { botIsTyping.current && (
          <Cancel
            onClick={() => {botIsTyping.current = false}}
            botIsTyping={botIsTyping.current}
          />
        )}
      </div>
    </div>
  );
}