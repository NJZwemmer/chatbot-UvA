from flask import Flask, request, jsonify, session
from flask_session import Session
from flask_cors import CORS, cross_origin
from flask_sslify import SSLify
import os
from flask_pymongo import PyMongo
import pymongo
from canvas_blueprint import canvas_blueprint
from common import *
from bson import json_util
import json

app = Flask(__name__)

# ********************* INTEGRATION WITH CANVAS ***********************
app.register_blueprint(canvas_blueprint)

# ********************* CONFIGURATION OF APP ***********************
app.config.from_pyfile('database.py')

# Enable CORS for all routes
cors = CORS(app, resource={
    r"/*":{
        "origins":"*"
    }
})

# Work with MongoDB.
mongo = PyMongo(app)

# Use filesystem to store session data
app.config['SESSION_PERMANENT'] = False  # Make the session permanent
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SESSION_COOKIE_SECURE'] = True  # Requires HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'None'

Session(app)  # Initialize Flask-Session
sslify = SSLify(app)

@app.route('/api/create_new_chat', methods=['GET'])
def create_chat_identifier():
    """ 
    Route for creating new chat ID.
    Scenarios:
    - new chat button is pressed.
    - new quiz button is pressed.
    """
    chat_id = create_new_chat_identifier()
    return jsonify({'chat_id': chat_id, 'message': f'Unique identifier {chat_id} created'})


# TODO: omit eventually. Necessary now to get browser to accept self-signed certificate.
@app.route('/allow', methods=['GET'])
def test_endpoint():
    return jsonify({"response": "You have successfuly added the self-signed certificate exception."})

@app.route('/api/database/questions', methods=['GET'])
def get_questions_database():
    collection = mongo.db.questions
    data = collection.find()
    result = []
    for index, doc in enumerate(data):
        result.append({index: doc['Question']})
    return jsonify(result)

# Function is used by both /api/database/answer route and
# the /api/database/history/store route.
def get_answer(data):
    _, formatted_time, hour_minute = get_current_time()

    # Check if question is already in the database.
    if 'Question' in data:
        collection = mongo.db.questions
        document = collection.find_one({'Question': data['Question']})

        if document:
            result = {
                '_id': str(document['_id']),
                'Question': document['Question'],
                'Answer': document['Answer'],
                'timestamp' : hour_minute
            }
        # The question field was empty.
        elif not data['Question']:
            result = {
                'Answer': "Your question did not get through. Try again!"
            }
        # TODO: Eventually; return a valid response.
        else:
            result = {
                'Answer': "I do not (yet) understand that. I'm sorry! I am still learning.",
                'timestamp' : hour_minute
            }

        data['timestamp'] = formatted_time
        data['Answer'] = result['Answer']
        store_history(data)
        return result
    else:
        return {'error': 'Missing Question in request'}

@app.route('/api/database/answer', methods=['POST'])
@cross_origin()
def get_answer_from_database():
    data = request.get_json()
    print(f"GET ANSWER? {session.get('chat_id')}")
    result = get_answer(data)
    return jsonify(result)

# ************************* HISTORY ****************************
def store_history(data):
    # Create a new chat id if it is not yet made.
    print(f"STORE {session.get('chat_id')}")

    if 'chat_id' not in session:
        create_chat_identifier()

    # This should only trigger outside of Canvas implementation.
    if 'user_id' not in session:
        create_new_user_identifier()

    collection = mongo.db.history

    requirements = ['Answer', 'Question', 'timestamp']

    for requirement in requirements:
        if requirement not in data:
            return {"error": "Missing data in request."}, 400

    insertion_data = {
        'chat_id': session["chat_id"],
        'user_id': session["user_id"],
        'Question': data['Question'],
        'Answer': data['Answer'],
        'timestamp': data['timestamp'],
        'Quiz' : False
    }

    # If 'Correct' information was parsed, it was actually a quiz response.
    # Adjust insertion data accordingly.
    if 'Correct' in data:
        insertion_data["Quiz"] = True
        insertion_data["Subject"] = data['Subject']
        insertion_data["Correct"] = data['Correct']
        insertion_data["Is_correct"] = data['Is_correct']    


    insertion = collection.insert_one(insertion_data)

    if insertion:
        return {'message': 'User input stored successfully'}, 201
    else:
        return {"error": "Could not store the history item"}, 500

def delete_history(id=None):
    print(f"DELETE {session.get('chat_id')}")

    if 'chat_id' not in session:
        create_chat_identifier()

    if 'user_id' not in session:
        create_new_user_identifier()

    collection = mongo.db.history
    print(f"ID: {id}")
    if id == "DEBUG_DELETE_ALL":
        result = collection.delete_many({})
        print("|||||DEBUG||||||: DELETING ALL!")
    elif id :
        result = collection.delete_many({'chat_id': id})
    else:
        print("Deleting for this user")
        result = collection.delete_many({'user_id': session['user_id']})

    if result:
        return {'message': f'Deleted {result.deleted_count} entries.'}, 200
    else:
        return {'message' : f'Nothing to delete for user {session["user_id"]}.'}, 204


def list_history(id=None, quiz=None):
    # print(f"LIST {session.get('chat_id')}")
    # Check if 'chat_id' is present in the session
    if 'chat_id' not in session:
        create_chat_identifier()

    if 'user_id' not in session:
        create_new_user_identifier()

    try:
        if id is None and quiz is None:
            # Aggregate query to group by 'chat_id' and find the latest document within each group
            # Used for getting the last sent message in any of the chats to display in the history list.
            pipeline = [
                {'$match': {'user_id': session["user_id"]}},
                {'$sort': {'timestamp': -1}},
                {'$group': {
                    '_id': '$chat_id',
                    'latest_message': {'$first': '$$ROOT'}
                }},
                {'$replaceRoot': {'newRoot': '$latest_message'}},
                {'$sort': {'timestamp': -1}}
            ]
        elif id is None and quiz:
            # Get the quiz results for history listing.
            pipeline = [
                {"$match": {'user_id': session["user_id"], 'Quiz': True}},
                {"$group": {
                    '_id': '$chat_id',
                    'subject' : {'$first' : "$Subject"},
                    'correct_count': {'$sum': {'$cond': [{'$eq': ['$Is_correct', True]}, 1, 0]}},
                    'total_count': {'$sum': 1},
                    'score': {'$avg': {'$cond': [{'$eq': ['$Is_correct', True]}, 100, 0]}},
                    'timestamp': {'$first': '$timestamp'}
                }},
                {"$project": {
                    '_id': 1,
                    'subject':1,
                    'correct_count': 1,
                    'total_count': 1,
                    'score': {'$round': ['$score', 2]},
                    'timestamp': 1
                }}
            ]
        elif id and quiz:
            # Get specific quiz results for history listing.
            pipeline = [
                {"$match": {'chat_id': id, 'Quiz': True}},
                {"$group": {
                    '_id': '$chat_id',
                    'correct_count': {'$sum': {'$cond': [{'$eq': ['$Is_correct', True]}, 1, 0]}},
                    'total_count': {'$sum': 1},
                    'score': {'$avg': {'$cond': [{'$eq': ['$Is_correct', True]}, 100, 0]}},
                    'timestamp': {'$first': '$timestamp'}
                }},
                {"$project": {
                    '_id': 1,
                    'correct_count': 1,
                    'total_count': 1,
                    'score': {'$round': ['$score', 2]},
                    'timestamp': 1
                }}
            ]
        else:
            # Get the full list of messages for any specific chat. Used when switching to a previous/different chat and rendering the 
            # history in the UI.
            pipeline = [
                {'$match': {'chat_id': id}}
            ]

        # Execute the aggregation pipeline
        history_documents = mongo.db.history.aggregate(pipeline)

        # Convert the BSON documents to a JSON-serializable format
        # and then convert it to a proper JSON format.
        history_list = json.loads(json_util.dumps(history_documents))

        if id is not None:
            # Modify the timestamp format for each item in the history_list
            for item in history_list:
                # Parse the existing timestamp string to a datetime object
                timestamp = datetime.strptime(item['timestamp'], '%Y-%m-%d %H:%M:%S')

                # Format the timestamp to H:M and update the item
                item['timestamp'] = timestamp.strftime('%H:%M')

        if history_list:
            return history_list, 200
        else:
            return {"message": "You do not have any history yet!"}, 204
    
    except pymongo.errors.ServerSelectionTimeoutError as e:
        print("Error:", e)
        return {"message": "Error connecting to the database."}, 500


@app.route('/api/database/history/DEBUG_DELETE_ALL', methods=['DELETE'])
def DEBUG_DELETE_ALL():
    """
    !!! WARNING !!!
    This function clears all documents in the history collection.
    Use with caution and only for debugging purposes.
    """
    response, status = delete_history("DEBUG_DELETE_ALL")
    return jsonify(response), status


@app.route('/api/database/history/<id>', methods=['GET', 'DELETE'])
@app.route('/api/database/history', methods=['PUT', 'GET', 'DELETE'])
def handle_history_request(id=None):
    """
    Main API endpoint for all history related tasks.
    
    Expected data:
    GET <id> -> id of which history item should be requested.
    DELETE <id> -> id of which history item should be deleted.
    PUT -> form data that needs to be put in the database.
    GET -> none.
    DELETE -> none. Caution: Deletes all history and should be removed in the final version.
    Returns the response data based on which function was called, as well as HTTP status code.
    """
    if request.method == "PUT":
        data = request.get_json()
        response, status = store_history(data)
    elif request.method == "GET":
        response, status = list_history(id) if id is not None else list_history()
    elif request.method == "DELETE":
        response, status = delete_history(id) if id is not None else delete_history()
    else:
        response, status = {"error": "Unsupported method"}, 405

    return jsonify(response), status

# ************************* HISTORY ****************************

# *************************** QUIZ *****************************
@app.route('/api/database/quiz/subjects', methods=['GET'])
def get_all_quiz_subjects():
    """
    Provides a list of all possible quiz subjects that are stored in the database.
    Expected data:
    - None.
    """
    collection = mongo.db.quizzes
    data = collection.find()
    result = []
    for doc in data:
        result.append(doc['Subject'])
    return jsonify(result)

def check_answer(subject, user_answer):
    """
    Checks for validity of user provided answer to a question.
    Question is selected based on current quiz progress.
    Returns whether the answer was correct along with other quiz data.
    """
    collection = mongo.db.quizzes
    result = collection.find_one({'Subject': subject}, {'Questions': 1, '_id': 0})
    progress = session["quiz_progress"]
    _, formatted_time, _ = get_current_time()

    if result:
        questions = result['Questions']
        if progress < len(questions):
            # Extract the next question and its options
            question, data = list(questions.items())[progress]
            correct_answer = data['Correct']

            answer_data = {
                'Question': question,
                'Options': data['Options'],
                'Correct' : correct_answer,
                'Is_correct' : user_answer == correct_answer,
                'timestamp' : formatted_time
            }

            return answer_data
    else:
        return {"error" : "There was an error verifying the answer with this subject."}

def get_next_question(subject):
    """
    Return the next question if it is available.
    """
    collection = mongo.db.quizzes
    result = collection.find_one({'Subject': subject}, {'Questions': 1, '_id': 0})
    progress = session["quiz_progress"]

    if result:
        questions = result['Questions']
        if progress < len(questions):
            # Extract the next question and its options
            question, data = list(questions.items())[progress]

            _, _, hour_minute = get_current_time()
            question_data = {
                'Question': question,
                'Options': data['Options'],
                'timestamp' : hour_minute,
            }

            return question_data
    else:
        return None

# Expected data: subject. Requires creation of quiz session with progress.
# Returns first question along with possible answers (in case of multiple choice - currently only supported).
@app.route('/api/database/quiz/start', methods=['POST'])
def start_quiz():
    """
    Start the quiz.
    Expected data:
    - Subject.

    Creates a progress session variable and sets quiz running to true.
    """

    try:
        data = request.json
        subject = data.get('Subject')

        session["quiz_progress"] = 0
        session["quiz_running"] = True

        # Get the first question for the quiz
        question_data = get_next_question(subject)
        if question_data:
            return jsonify(question_data)
        else:
            return jsonify({'error': 'No questions found for the specified subject'})

    except Exception as e:
        return jsonify({'error': str(e)})

# Expected data: answer to question. Requires quiz session with progress.
# Returns (optionally) whether an answer was correct, and the next question.
# Also returns progress.
@app.route('/api/database/quiz/answer', methods=['POST'])
def answer_question():
    try:
        if not session["quiz_running"]:
            return jsonify({'message' : 'No quiz is currently active.'})

        data = request.json
        subject = data.get('Subject')
        answer = data.get('Answer')

        # Verify user provided answer with the database.
        answer_data = check_answer(subject, answer)

        # Increase session quiz progress by 1.
        session['quiz_progress'] += 1

        data["Quiz"] = True
        data["Subject"] = subject
        data["Correct"] = answer_data["Correct"]
        data["Is_correct"] = answer_data["Is_correct"]
        data["timestamp"] = answer_data["timestamp"]

        # Save the answer to history
        store_history(data)

        # Get the next question for the quiz
        question_data = get_next_question(subject)

        _, _, hour_minute = get_current_time()
        if question_data:
            return jsonify(question_data)
        else:
            session["quiz_running"] = False
            data = {
                "message" : "Quiz completed",
                "timestamp" : hour_minute
            }
            return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/database/quizzes', methods=['GET'])
def get_quiz_results():
    return list_history(id=None, quiz=True)

# Expected data: quiz score result. Requires quiz session with progress.
# Returns how many questions were answered correctly.
@app.route('/api/database/quiz/result', methods=['GET'])
@app.route('/api/database/quiz/result/<id>', methods=['GET'])
def handle_quiz_request(id=None):
    """
    Main API endpoint for all quiz related tasks.
    
    Expected data:
    GET <id> -> id of which quiz item should be requested.
    GET -> none.
    """
    if request.method == "GET":
        if id is not None:
            response, status = list_history(id, quiz=True)
            response = response[0]
        else:
            response, status = list_history(quiz=True)
    else:
        response, status = {"error": "Unsupported method"}, 405

    return response, status

# *************************** QUIZ *****************************
if __name__ == '__main__':
    # Use the generated certificate and private key
    cert_path = os.path.join(os.path.dirname(__file__), '../.cert/server.crt')
    key_path = os.path.join(os.path.dirname(__file__), '../.cert/server.key')
    app.run(debug=True, host='0.0.0.0', ssl_context=(cert_path, key_path))
