from datetime import datetime
import uuid
from flask import session

def create_new_chat_identifier():
    """
    Creates a new chat identifier whenever necessary.
    Scenarios:
    - new chat button is pressed
    - new quiz button is pressed
    - user logs in (either through canvas or standalone).
    """
    chat_id = str(uuid.uuid4())
    session['chat_id'] = chat_id
    return chat_id

def create_new_user_identifier():
    """
    Creates a new user identifier whenever necessary.
    Scenarios:
    - user does not login through canvas, but standalone.
    """
    user_id = str(uuid.uuid4())
    session['user_id'] = user_id
    return user_id


def get_current_time():
    """
    Returns the current time in three formats.
    - datetime.now() default (Y, m, d, H, m, s, ms)
    - formatted time Y-m-d H-m-s
    - formatted time H-m
    """
    current_time = datetime.now()
    formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
    hour_minute = current_time.strftime("%H:%M")
    return current_time, formatted_time, hour_minute