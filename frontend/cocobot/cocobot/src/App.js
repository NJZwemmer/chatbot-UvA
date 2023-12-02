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

  // This is how we set and get session data
  // ReactSession.set("username", "Bob");
  // ReactSession.get("username");

  const quizReaction = async (reaction) => {
    setMessages((messages) => [
      ...messages.slice(0, -1), // Remove the last message
      {
        role: "user",
        content: reaction,
        time: "00:00",
      },
    ]);

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

    console.log(quiz);
    if (quiz.message == "Quiz completed") {
      return;
    }

    const question = quiz.Question;
    const options = quiz.Options;

    const prompt = {
      role: "assistant",
      content: question,
      time: "00:00",
    };

    setMessages((messages) => [...messages, prompt]);

    const answers = {
      quiz: true,
      role: "user",
      content: options,
      time: "00:00",
    };

    setMessages((messages) => [...messages, answers])

  }

  const startQuiz = async () => {
    newChat();
    const response = await fetch("/api/database/quiz/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: "Creating a chatbot",
      }),
    });

    const quiz = await response.json();
    const question = quiz.Question;
    const options = quiz.Options;

    const prompt = {
      role: "assistant",
      content: question,
      time: "00:00",
    };

    setMessages((messages) => [...messages, prompt]);

    const answers = {
      quiz: true,
      role: "user",
      content: options,
      time: "00:00",
    };

    setMessages((messages) => [...messages, answers])
  }

  function switch_History() {
    console.log("switched");
    setShowHistory(!showHistory);
  }

  const getHistory = async () => {
    try {
      const response = await fetch("/api/database/history");
      const data = await response.json();
      
      const historyList = data.map((item, index) => ({
        id: index,
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
  }, []);

  const selectHistory = async (chatid) => {
    try {
      const response = await fetch("/api/database/history/" + chatid);
      const data = await response.json();
      setCurrentChatId(chatid);

      setMessages([]);
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

      setHistory(oldHistory => {
        return oldHistory.filter(historyItem => historyItem.chat_id === currentChatId ? () => {historyItem.question = question.current; historyItem.timestamp = timestamp} : true)
      })

      console.log(JSON.stringify({
        Question: question.current,
        Answer: responseText,
        Time: timestamp,
      }));

      setInput("");
    } catch (error) {
      console.error("Error fetching answer:", error);
    } finally {
      botIsTyping.current = false;
    }
  };

  // const clear = async () => {
  //   try {
  //     const response = await fetch("https://192.168.100.30:5001/api/database/history", {
  //       method: "DELETE",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Error fetching answer:", error);
  //   }
  //   setMessages([]);
  // };

  const newChat = async ()=> {
    try {
      const response = await fetch("/api/create_new_chat");
      const data = await response.json();
      setCurrentChatId(data.chat_id);
      setMessages([]);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  return (
    <div className="App">
      <div className={`HistoryColumn ${showHistory ? 'ShowHistory' : null}`}>
        <h3 className="HistoryTitle">History</h3>
        <div className="HistoryContent">
          {history.map((el, i) => (
            <History
              key={i}
              question={el.question}
              timestamp={el.timestamp}
              onClick={() => {selectHistory(el.chat_id); switch_History()}}
              deleteFunction={() => {deleteHistory(el.chat_id); switch_History()}}
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