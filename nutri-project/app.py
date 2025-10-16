# app.py (Flask example)
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Use environment variable
CORS(app)
jwt = JWTManager(app)

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="huds_nutrition",
        user="your_username",
        password="your_password",
        cursor_factory=RealDictCursor
    )

@app.route('/api/nutrition/insights', methods=['POST'])
@jwt_required()
def get_nutrition_insights():
    """
    Fetch nutrition insights for a user within a date range
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
    end_date = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Fetch daily calorie data
    cur.execute("""
        SELECT 
            DATE(meal_date) as date,
            SUM(calories) as calories,
            ug.calorie_goal as goal
        FROM meals m
        JOIN user_goals ug ON m.user_id = ug.user_id
        WHERE m.user_id = %s 
        AND meal_date BETWEEN %s AND %s
        GROUP BY DATE(meal_date), ug.calorie_goal
        ORDER BY date
    """, (user_id, start_date, end_date))
    
    daily_calories = cur.fetchall()
    
    # Fetch macro data
    cur.execute("""
        SELECT 
            DATE(meal_date) as date,
            SUM(carbohydrates) as carbs,
            SUM(protein) as protein,
            SUM(fats) as fats
        FROM meals
        WHERE user_id = %s 
        AND meal_date BETWEEN %s AND %s
        GROUP BY DATE(meal_date)
        ORDER BY date
    """, (user_id, start_date, end_date))
    
    macros = cur.fetchall()
    
    # Fetch micronutrient averages
    cur.execute("""
        SELECT 
            AVG(iron) as iron,
            AVG(calcium) as calcium,
            AVG(sodium) as sodium,
            AVG(vitamin_c) as vitamin_c,
            AVG(fiber) as fiber
        FROM meals
        WHERE user_id = %s 
        AND meal_date BETWEEN %s AND %s
    """, (user_id, start_date, end_date))
    
    micronutrients_avg = cur.fetchone()
    
    # Fetch user goals
    cur.execute("""
        SELECT 
            calorie_goal,
            protein_goal,
            carb_goal,
            fat_goal,
            sodium_limit
        FROM user_goals
        WHERE user_id = %s
    """, (user_id,))
    
    user_goals = cur.fetchone()
    
    # Calculate averages and insights
    avg_calories = sum(d['calories'] for d in daily_calories) / len(daily_calories) if daily_calories else 0
    highest_day = max(daily_calories, key=lambda x: x['calories']) if daily_calories else None
    lowest_day = min(daily_calories, key=lambda x: x['calories']) if daily_calories else None
    
    # Format micronutrients data
    micronutrients = [
        {
            'nutrient': 'Iron',
            'value': round(micronutrients_avg['iron'], 1),
            'recommended': 18,
            'unit': 'mg'
        },
        {
            'nutrient': 'Calcium',
            'value': round(micronutrients_avg['calcium'], 1),
            'recommended': 1000,
            'unit': 'mg'
        },
        {
            'nutrient': 'Sodium',
            'value': round(micronutrients_avg['sodium'], 1),
            'recommended': 2300,
            'unit': 'mg'
        },
        {
            'nutrient': 'Vitamin C',
            'value': round(micronutrients_avg['vitamin_c'], 1),
            'recommended': 75,
            'unit': 'mg'
        },
        {
            'nutrient': 'Fiber',
            'value': round(micronutrients_avg['fiber'], 1),
            'recommended': 25,
            'unit': 'g'
        }
    ]
    
    # Format goals data
    goals = [
        {
            'metric': 'Daily Calories',
            'current': avg_calories,
            'target': user_goals['calorie_goal'],
            'unit': 'kcal',
            'description': 'Energy to fuel your daily activities'
        },
        {
            'metric': 'Protein',
            'current': sum(d['protein'] for d in macros) / len(macros) if macros else 0,
            'target': user_goals['protein_goal'],
            'unit': 'g',
            'description': 'Supports muscle maintenance and repair'
        },
        {
            'metric': 'Sodium',
            'current': micronutrients_avg['sodium'],
            'target': user_goals['sodium_limit'],
            'unit': 'mg',
            'description': 'Important for fluid balance'
        }
    ]
    
    cur.close()
    conn.close()
    
    return jsonify({
        'dailyCalories': [
            {
                'date': d['date'].strftime('%m/%d'),
                'calories': int(d['calories']),
                'goal': int(d['goal'])
            } for d in daily_calories
        ],
        'macros': [
            {
                'date': m['date'].strftime('%m/%d'),
                'carbs': round(m['carbs'], 1),
                'protein': round(m['protein'], 1),
                'fats': round(m['fats'], 1)
            } for m in macros
        ],
        'micronutrients': micronutrients,
        'goals': goals,
        'avgCalories': round(avg_calories, 0),
        'calorieGoal': user_goals['calorie_goal'],
        'highestDay': {
            'date': highest_day['date'].strftime('%B %d, %Y'),
            'calories': int(highest_day['calories'])
        } if highest_day else None,
        'lowestDay': {
            'date': lowest_day['date'].strftime('%B %d, %Y'),
            'calories': int(lowest_day['calories'])
        } if lowest_day else None
    })

if __name__ == '__main__':
    app.run(debug=True, ssl_context='adhoc')  # Use proper SSL certificates in production
