import React, { useState, useEffect, useRef } from "react";
import Message from "./components/Message";
import Input from "./components/Input";
import History from "./components/History";
import Cancel from "./components/Cancel";
import ChatTitle from "./components/ChatTitle";
import "./App.css";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory } from '@fortawesome/free-solid-svg-icons';
import ChatContent from "./components/ChatContent";
// import ChatMainColumn from "./components/ChatMainColumn";

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
  const [showHistory, setShowHistory] = useState(true);
  const [quizzesSelected, setQuizzesSelected] = useState(false);
  const showChatSuggestions = useRef(false);
  const suggestionSource = useRef("suggestions");
  const [quizSubject, setQuizSubject] = useState("");
  const [quizActive, setQuizActive] = useState(false);
  const [canvasInfo, setCanvasInfo] = useState();

  const getQuizResult = async (chatId) => {
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
        Subject: quizSubject,
        Question: messages.slice(-2, -1)[0].content,
        Answer: reaction
      }),
    });

    const quiz = await response.json();
    console.log(quizSubject)
    console.log(quiz);
    const timestamp = quiz.timestamp;
    setMessages((messages) => [
      ...messages.slice(0, -1), // Remove the last message
      {
        role: "user",
        content: reaction,
        time: timestamp,
      },
    ]);

    if (quiz.message) {
      getQuizResult(currentChatId);
      suggestionSource.current = "suggestions";
      setQuizSubject("");

      if (quizzesSelected) {
        const newChat = {
          quiz: true,
          chat_id: currentChatId,
          question: quizSubject,
          timestamp: timestamp,
        };
  
        setHistory((historyItems) => [...historyItems, newChat]);
      }

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

  const setupQuiz = async () => {
    await newChat();
    showChatSuggestions.current = true;
    suggestionSource.current = "quiz/subjects";
  }

  const startQuiz = async () => {
    setQuizActive(true);
    const response = await fetch("/api/database/quiz/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: quizSubject,
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
          question: quizSubject,
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
    showChatSuggestions.current = false;
    suggestionSource.current = "suggestions";
  }

  useEffect(() => {
    if (quizSubject !== ""){
      startQuiz();
    }
  }, [quizSubject])

  function switchHistory() {
    setShowHistory(!showHistory);
  }

  const switch_quizSelected = async (value) => {
    if (value) {
      try {
        const response = await fetch("/api/database/quizzes");
        const data = await response.json();
        
        const historyList = data.map((item, index) => ({
          id: index,
          chat_id: item._id,
          correct_count: item.correct_count,
          score: item.score,
          question: item.subject,
          timestamp: item.timestamp,
          total_count: item.total_count,
        }));
    
        setHistory(historyList);
      } catch (error) {
        setHistory([]);
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
      setHistory([]);
      console.error("Error fetching history:", error);
    }
  };

  const getCanvasInfo = async () => {
    try {
      const response = await fetch("/canvas/information");
      const data = await response.json();

      setCanvasInfo({
        title: data.title,
        label: data.label
      });

    } catch (error) {
      setCanvasInfo([])
      console.error("Error fetching Canvas Information:", error);
    }
  };

  useEffect(() => {
    getHistory();
    newChat();
    // Added by Niels
    getCanvasInfo();
  }, []);

  const selectHistory = async (chatId) => {
    try {
      setQuizActive(false);
      showChatSuggestions.current = false;
      const response = await fetch("/api/database/history/" + chatId);
      const data = await response.json();

      setCurrentChatId(chatId);
      setMessages([]);

      if (data[0].Quiz) {
        data.forEach((item) => {
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
        setQuizActive(true);
        getQuizResult(chatId); // Added by Niels (To get score for quiz item.)
      } else {
        data.forEach((item) => {
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
    currentChatId === chatid && newChat();
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

  const handleSubmit = async () => {

    showChatSuggestions.current = false;

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

      if (history.some(item => currentChatId === item.chat_id)){
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

      setInput("");
    } catch (error) {
      console.error("Error fetching answer:", error);
    } finally {
      botIsTyping.current = false;
    }
  };

  const newChat = async () => {
    try {
      setQuizActive(false);
      const response = await fetch("/api/create_new_chat");
      const data = await response.json();

      setCurrentChatId(data.chat_id);
      console.log("Chat id set: " + data.chat_id);
      setMessages([]);

      suggestionSource.current = "suggestions";
      showChatSuggestions.current = true;

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
          {history.length > 0 ?
            (history.map((el, i) => (
              <History
                key={i}
                question={el.question}
                timestamp={el.timestamp}
                onClick={() => {selectHistory(el.chat_id); showChatSuggestions.current = false}}
                deleteFunction={() => {deleteHistory(el.chat_id)}}
              />
            ))):
            (
            <div className="EmptyHistoryMessage">
                <FontAwesomeIcon icon={faHistory} /> &nbsp; Nothing here yet
            </div>
            )}
        </div>
        <div className="HistoryVersion">
          v0.1 pre-alpha
        </div>
      </div>

      {/* 
        TODO: Refactoring.
      
        <ChatMainColumn 
        showHistory={showHistory}
        switchHistory={switchHistory}
        setupQuiz={setupQuiz}
        newChat={newChat}
        messages={messages}
        quizActive={quizActive}
        setInput={setInput}
        handleSubmit={handleSubmit}
        botIsTyping={botIsTyping}
        showChatSuggestions={showChatSuggestions}
        suggestionSource={suggestionSource}
        quizReaction={quizReaction}
        lastMessageRef={lastMessageRef}
        messagesContainerRef={messagesContainerRef}
        canvasInfo={canvasInfo}
      /> */}
      
      
  
      <div className={`ChatColumn ${showHistory ? 'ShowHistory' : null}`}>
        <ChatTitle
          switchHistory={switchHistory}
          setupQuiz={setupQuiz}
          newChat={newChat}
          canvasInfo={canvasInfo}
        />
        <ChatContent
          messages={messages}
          quizReaction={quizReaction}
          lastMessageRef={lastMessageRef}
          botIsTyping={botIsTyping}
          messagesContainerRef={messagesContainerRef}
        />

        { !botIsTyping.current && !quizActive && (
          <Input
            value={input}
            buttonPressed={buttonPressed}
            botIsTyping={botIsTyping.current}
            showChatSuggestions={showChatSuggestions.current}
            suggestionSource={suggestionSource.current}
            setQuizSubject = {setQuizSubject}
            setValue={setInput}
            setButtonPressed={setButtonPressed}
            onChange={(e) => setInput(e.target.value)}
            onClick={() => {question.current = input; handleSubmit()}}
          />
        )}
        { botIsTyping.current && !quizActive && (
          <Cancel
            onClick={() => {botIsTyping.current = false}}
            botIsTyping={botIsTyping.current}
          />
        )}
      </div>
    </div>
  );
}