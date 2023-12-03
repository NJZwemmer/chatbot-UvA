# ChatBot-UvA
Repo for the UvA Chatbot, loosely based on and heavily inspired by the implementation from Vision Chatbot Project: https://github.com/VisionChatbotProject/Vision/tree/main/chatbot

The current state of the bot is: pre-alpha.

The bot currently supports pre-defined simple queries. It also allows taking quizzes about pre-defined topics. The ultimate goal would be to integrate this bot in as many applications as possible.
Our goal is to make this bot as modular as possible, allowing easy plug-and-play.

## How to run:

We have separated our frontend (React) and backend (Flask). We host the application for testing use on https://www.cocobot.nl/. This application is hosted using Nginx.

Frontend:
1) Navigate to the src folder: 
/chatbot-UvA/frontend/cocobot/cocobot/src
2) For development: npm run start
3) For production: npm run build

Backend:
1) Navigate to the backend folder:
2) /chatbot-UvA/backend
3) For development:
    $ python3 app.py
5) For production:
    $ gunicorn -w 4 -b 192.168.100.30:5000 --certfile=../.cert/server.crt --keyfile=../.cert/server.key app:app

NOTE: this last command assumes you have the proper certificates installed on your system. These are not stored on GitHub. You can use certbot to obtain self-signed certificates for the application alternatively.

## Feature list:
- Ask pre-defined questions.
- Canvas LTI integration.
- Observe history based on session (Integration with Canvas keeps it persistent).
- Take pre-defined quizzes.

## Future features:
- Further integration with Canvas (Course/Study wide, dependent on requirements).
- Connecting the bot with other applications (such as FeedbackDiary - pending thesis Niels).
- Improved security.
- UI improvements upon request/feedback.
- Further exploration in possibilities for the bot (Canvas scraping).
- Teacher dashboard - see student quiz progression, score, time spent etc.
- Make bot smarter for general questions - balancing speed with versatility. The aim is not to re-create ChatGPT.
- Import self-learning improvements to A.I. model.
- Integrate missing features from VISION Chatbot.
- Suggestions...
