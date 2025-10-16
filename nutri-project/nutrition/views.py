# nutrition/views.py

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Sum, Avg, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from decimal import Decimal
import json

from .models import MealLog, NutritionGoal, GoalStreak, FoodItem
from .serializers import InsightsSerializer, NutritionGoalSerializer


@login_required
def insights_page(request):
    """Main insights page view"""
    context = {
        'user': request.user,
        'page_title': 'Your Nutrition Insights',
    }
    return render(request, 'nutrition/insights.html', context)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_insights_data(request):
    """
    API endpoint to retrieve aggregated nutrition insights
    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - metric: specific metric to focus on (optional)
    """
    user = request.user
    
    # Parse date range
    try:
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            # Default to last 7 days
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get user's meal logs in date range
    meal_logs = MealLog.objects.filter(
        user=user,
        consumed_at__date__gte=start_date,
        consumed_at__date__lte=end_date
    ).select_related('food_item')
    
    # Get user's active goals
    goals = NutritionGoal.objects.filter(user=user, is_active=True)
    
    # Calculate daily aggregates
    daily_data = calculate_daily_aggregates(meal_logs, start_date, end_date)
    
    # Calculate averages
    daily_averages = calculate_averages(daily_data)
    
    # Calculate goal alignment
    goal_alignment = calculate_goal_alignment(daily_averages, goals)
    
    # Generate trends
    trends = generate_trends(daily_data, goals)
    
    # Generate recommendations
    recommendations = generate_recommendations(daily_averages, goals, trends)
    
    # Find highest and lowest intake days
    highest_day = find_extreme_day(daily_data, 'calories', 'max')
    lowest_day = find_extreme_day(daily_data, 'calories', 'min')
    
    # Calculate macronutrient distribution
    macro_distribution = calculate_macro_distribution(daily_averages)
    
    # Prepare response data
    insights_data = {
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'days': (end_date - start_date).days + 1
        },
        'daily_averages': daily_averages,
        'goal_alignment': goal_alignment,
        'trends': trends,
        'recommendations': recommendations,
        'highest_intake_day': highest_day,
        'lowest_intake_day': lowest_day,
        'macro_distribution': macro_distribution,
        'daily_data': daily_data,  # For charting
    }
    
    serializer = InsightsSerializer(insights_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_goals(request):
    """Get user's active nutrition goals"""
    goals = NutritionGoal.objects.filter(user=request.user, is_active=True)
    serializer = NutritionGoalSerializer(goals, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_goal_streak_data(request, goal_id):
    """Get streak data for a specific goal"""
    try:
        goal = NutritionGoal.objects.get(id=goal_id, user=request.user)
    except NutritionGoal.DoesNotExist:
        return Response(
            {'error': 'Goal not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get last 30 days of streak data
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    
    streaks = GoalStreak.objects.filter(
        user=request.user,
        goal=goal,
        streak_date__gte=start_date,
        streak_date__lte=end_date
    ).order_by('streak_date')
    
    streak_data = {
        'goal': NutritionGoalSerializer(goal).data,
        'current_streak': GoalStreak.calculate_current_streak(request.user, goal),
        'history': [
            {
                'date': s.streak_date.isoformat(),
                'achieved': s.achieved,
                'actual_value': float(s.actual_value),
                'deviation_percentage': float(s.deviation_percentage),
            }
            for s in streaks
        ]
    }
    
    return Response(streak_data)


# Helper functions

def calculate_daily_aggregates(meal_logs, start_date, end_date):
    """Calculate daily nutrition totals"""
    daily_data = {}
    
    current_date = start_date
    while current_date <= end_date:
        day_logs = meal_logs.filter(consumed_at__date=current_date)
        
        daily_totals = {
            'date': current_date.isoformat(),
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fats': 0,
            'sodium': 0,
            'fiber': 0,
            'sugar': 0,
            'calcium': 0,
            'iron': 0,
            'meal_count': day_logs.count(),
        }
        
        for log in day_logs:
            nutrients = log.get_actual_nutrients()
            for key in nutrients:
                daily_totals[key] = daily_totals.get(key, 0) + nutrients[key]
        
        daily_data[current_date.isoformat()] = daily_totals
        current_date += timedelta(days=1)
    
    return daily_data


def calculate_averages(daily_data):
    """Calculate average intake across all days"""
    if not daily_data:
        return {}
    
    totals = {
        'calories': 0, 'protein': 0, 'carbs': 0, 'fats': 0,
        'sodium': 0, 'fiber': 0, 'sugar': 0, 'calcium': 0, 'iron': 0
    }
    
    days_with_data = 0
    for day in daily_data.values():
        if day['meal_count'] > 0:
            days_with_data += 1
            for key in totals:
                totals[key] += day.get(key, 0)
    
    if days_with_data == 0:
        return totals
    
    return {key: round(value / days_with_data, 2) for key, value in totals.items()}


def calculate_goal_alignment(daily_averages, goals):
    """Calculate how well user is meeting their goals"""
    alignment = {}
    
    goal_mapping = {
        'calories': 'calories',
        'protein': 'protein',
        'carbs': 'carbs',
        'fats': 'fats',
        'sodium': 'sodium',
        'fiber': 'fiber',
        'sugar': 'sugar',
        'calcium': 'calcium',
        'iron': 'iron',
    }
    
    for goal in goals:
        nutrient = goal_mapping.get(goal.goal_type)
        if not nutrient or nutrient not in daily_averages:
            continue
        
        actual = daily_averages[nutrient]
        target = float(goal.target_value)
        
        if target > 0:
            percentage = (actual / target) * 100
            deviation = actual - target
            
            alignment[goal.goal_type] = {
                'goal_id': goal.id,
                'target': target,
                'actual': actual,
                'percentage': round(percentage, 1),
                'deviation': round(deviation, 2),
                'status': 'on_track' if 90 <= percentage <= 110 else 'needs_attention',
                'unit': goal.unit,
            }
    
    return alignment


def generate_trends(daily_data, goals):
    """Identify trends in nutrition data"""
    trends = []
    
    if len(daily_data) < 3:
        return trends
    
    # Analyze calorie trend
    calorie_values = [day['calories'] for day in daily_data.values() if day['meal_count'] > 0]
    if len(calorie_values) >= 3:
        first_half_avg = sum(calorie_values[:len(calorie_values)//2]) / (len(calorie_values)//2)
        second_half_avg = sum(calorie_values[len(calorie_values)//2:]) / (len(calorie_values) - len(calorie_values)//2)
        
        if second_half_avg > first_half_avg * 1.1:
            trends.append({
                'type': 'increasing',
                'metric': 'calories',
                'message': 'Your calorie intake has been increasing over the selected period',
            })
        elif second_half_avg < first_half_avg * 0.9:
            trends.append({
                'type': 'decreasing',
                'metric': 'calories',
                'message': 'Your calorie intake has been decreasing over the selected period',
            })
        else:
            trends.append({
                'type': 'stable',
                'metric': 'calories',
                'message': 'Your calorie intake has been consistent',
            })
    
    return trends


def generate_recommendations(daily_averages, goals, trends):
    """Generate personalized recommendations"""
    recommendations = []
    
    # Check sodium levels
    if daily_averages.get('sodium', 0) > 2300:
        recommendations.append({
            'priority': 'high',
            'category': 'sodium',
            'message': 'Your sodium intake is above the recommended daily limit of 2,300mg',
            'suggestion': 'Consider choosing lower-sodium options at HUDS dining halls',
        })
    
    # Check fiber levels
    if daily_averages.get('fiber', 0) < 25:
        recommendations.append({
            'priority': 'medium',
            'category': 'fiber',
            'message': 'You could benefit from more fiber in your diet',
            'suggestion': 'Try adding more whole grains, fruits, and vegetables to your meals',
        })
    
    # Check protein distribution
    protein_avg = daily_averages.get('protein', 0)
    if protein_avg < 50:
        recommendations.append({
            'priority': 'medium',
            'category': 'protein',
            'message': 'Your protein intake is on the lower side',
            'suggestion': 'Include protein-rich foods like lean meats, legumes, or tofu',
        })
    
    return recommendations


def find_extreme_day(daily_data, metric, extreme_type='max'):
    """Find day with highest or lowest value for a metric"""
    if not daily_data:
        return {}
    
    days_with_meals = {
        date: data for date, data in daily_data.items() 
        if data['meal_count'] > 0
    }
    
    if not days_with_meals:
        return {}
    
    if extreme_type == 'max':
        extreme_date = max(days_with_meals, key=lambda d: days_with_meals[d].get(metric, 0))
    else:
        extreme_date = min(days_with_meals, key=lambda d: days_with_meals[d].get(metric, float('inf')))
    
    return days_with_meals[extreme_date]


def calculate_macro_distribution(daily_averages):
    """Calculate macronutrient distribution as percentages"""
    protein = daily_averages.get('protein', 0) * 4  # 4 cal/g
    carbs = daily_averages.get('carbs', 0) * 4      # 4 cal/g
    fats = daily_averages.get('fats', 0) * 9        # 9 cal/g
    
    total = protein + carbs + fats
    
    if total == 0:
        return {'protein': 0, 'carbs': 0, 'fats': 0}
    
    return {
        'protein': round((protein / total) * 100, 1),
        'carbs': round((carbs / total) * 100, 1),
        'fats': round((fats / total) * 100, 1),
    }
