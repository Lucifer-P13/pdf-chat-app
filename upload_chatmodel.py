import mysql.connector
from mysql.connector import Error
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os

from use_llama import PDFChatBot

import csv
import datetime
import io

app = Flask(__name__)
CORS(app)
def create_connection():
    connection = None
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='chat',
            user='pranab',
            password='StrongPassword123!'
        )
        print("Connected to MySQL database")
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
    return connection

UPLOAD_FOLDER = './books'
HISTORY_UPLOAD_FOLDER = './history_files'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(HISTORY_UPLOAD_FOLDER):
    os.makedirs(HISTORY_UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['HISTORY_UPLOAD_FOLDER'] = HISTORY_UPLOAD_FOLDER

chatbot = PDFChatBot()

#PDF question asked
@app.route('/ask', methods=['POST'])
def ask_question():
    global chatbot
    if chatbot is None:
        return jsonify({'error': 'Chatbot not initialized. Please initialize first.'}), 500

    data = request.json
    print("Received data:", data)
    if 'question' not in data:
        return jsonify({'error': 'Question not provided.'}), 400

    question = data['question']
    result = chatbot.conversational_chain()({"question": question})
    serializable_result = {
        'answer': result.get('answer', '')
        # Add more fields as needed
    }

    print(question)
    print(type(question))
    print(serializable_result['answer'])
    print(type(serializable_result['answer']))

    #Add question history
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            sql_query = "INSERT INTO chat_history (question, answer, time) VALUES (%s, %s, %s)"
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(sql_query, (question, serializable_result['answer'], timestamp))
            connection.commit()
            print("History saved to MySQL database")
        except Error as e:
            print(f"Error savinging history into MySQL database: {e}")
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
                print("MySQL connection closed")
    else:
        print("Failed to connect to MySQL database")

    return jsonify(serializable_result)

#PDF Vectorization
@app.route('/initialize', methods=['POST'])
def initialize_chatbot():
    global chatbot
    print("Wait for a minute.")
    chatbot = PDFChatBot()
    chatbot.create_vector_db()
    return jsonify({'message': 'Chatbot initialized successfully!'})

#PDF Upload
@app.route('/upload', methods=['POST'])
def upload_file():
    global vector_db_path  # Access the global variable
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Save file path to MySQL database
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            sql_query = "INSERT INTO books (book_path) VALUES (%s)"
            cursor.execute(sql_query, (file_path,))
            connection.commit()
            print("File path saved to MySQL database")
        except Error as e:
            print(f"Error inserting file path into MySQL database: {e}")
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
                print("MySQL connection closed")
    else:
        print("Failed to connect to MySQL database")

    # Initialize chatbot and create vector database
    global chatbot
    print("Wait for a minute.")
    chatbot = PDFChatBot()
    vector_db_path = chatbot.create_vector_db(file_path)  # Store the returned database path

    return jsonify({'message': 'File uploaded successfully'})

@app.route('/upload-history', methods=['POST'])
def upload_history_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_path = os.path.join(app.config['HISTORY_UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Process the CSV file
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            with open(file_path, mode='r', encoding='utf-8') as csvfile:
                csvreader = csv.reader(csvfile)
                next(csvreader)  # Skip header row if it exists
                for row in csvreader:
                    # Assuming the CSV has columns: question, answer, timestamp
                    _, question, answer, time = row
                    sql_query = "INSERT INTO chat_history (question, answer, time) VALUES (%s, %s, %s)"
                    cursor.execute(sql_query, (question, answer, time))
                connection.commit()
            return jsonify({'message': 'History uploaded successfully!'}), 200
        except Error as e:
            print(f"Error inserting history into MySQL database: {e}")
            return jsonify({'error': 'Failed to save history'}), 500
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
                print("MySQL connection closed")
    else:
        return jsonify({'error': 'Failed to connect to MySQL database'}), 500

@app.route('/download-history', methods=['GET'])
def download_history():
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT * FROM chat_history")
            rows = cursor.fetchall()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['id', 'question', 'answer', 'time'])  # Adjust column names as necessary
            for row in rows:
                writer.writerow(row)
            output.seek(0)

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chat_history_download_{timestamp}.csv"

            return send_file(io.BytesIO(output.getvalue().encode('utf-8')), 
                             mimetype='text/csv', 
                             as_attachment=True, 
                             download_name=filename)  # Updated to use download_name
        except Error as e:
            print(f"Error fetching chat history: {e}")
            return jsonify({'error': 'Failed to fetch chat history'}), 500
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
                print("MySQL connection closed")
    else:
        return jsonify({'error': 'Failed to connect to MySQL database'}), 500
    
@app.route('/history', methods=['GET'])
def get_history():
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT sl_no, question, answer, time FROM chat_history")
            rows = cursor.fetchall()
            history = [{'id': row[0], 'question': row[1], 'answer': row[2], 'time': row[3]} for row in rows]
            return jsonify(history), 200
        except Error as e:
            print(f"Error fetching chat history: {e}")
            return jsonify({'error': 'Failed to fetch chat history'}), 500
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
                print("MySQL connection closed")
    else:
        return jsonify({'error': 'Failed to connect to MySQL database'}), 500

if __name__ == '__main__':
    app.run(debug=True)
