from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Mock SQLite3 database (in-memory)
DATABASE = ':memory:'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            gender TEXT,
            gluten_free BOOLEAN,
            food_preferences TEXT,
            activity_level TEXT,
            diet_goal TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'CrimsonFuel Flask API running'})

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    # Validate Harvard email
    if not email.endswith('@college.harvard.edu'):
        return jsonify({
            'success': False,
            'message': 'Please use a valid Harvard College email (@college.harvard.edu)'
        }), 400
    
    # INTENTIONAL ERROR: Missing password validation
    # This will cause issues if password is empty
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'userId': user_id
        }), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            'success': False,
            'message': 'An account with this email already exists'
        }), 400

@app.route('/api/onboarding/complete', methods=['POST'])
def complete_onboarding():
    data = request.get_json()
    user_id = data.get('userId')
    name = data.get('name')
    gender = data.get('gender')
    gluten_free = data.get('glutenFree')
    food_preferences = data.get('foodPreferences')
    activity_level = data.get('activityLevel')
    diet_goal = data.get('dietGoal')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO profiles (user_id, name, gender, gluten_free, food_preferences, activity_level, diet_goal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, name, gender, gluten_free, food_preferences, activity_level, diet_goal))
        conn.commit()
        
        # Get user data
        cursor.execute('SELECT email FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Onboarding completed successfully',
            'user': {
                'id': user_id,
                'email': user['email'],
                'profile': {
                    'name': name,
                    'gender': gender,
                    'glutenFree': gluten_free,
                    'foodPreferences': food_preferences,
                    'activityLevel': activity_level,
                    'dietGoal': diet_goal
                }
            }
        }), 200
    except Exception as e:
        conn.close()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
