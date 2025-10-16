# nutrition/serializers.py

from rest_framework import serializers
from .models import MealLog, NutritionGoal, GoalStreak, FoodItem
from django.db.models import Sum, Avg, Count
from datetime import datetime, timedelta

class NutritionGoalSerializer(serializers.ModelSerializer):
    goal_type_display = serializers.CharField(source='get_goal_type_display', read_only=True)
    current_streak = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionGoal
        fields = [
            'id', 'goal_type', 'goal_type_display', 'target_value', 
            'target_min', 'target_max', 'unit', 'is_active', 'current_streak'
        ]
    
    def get_current_streak(self, obj):
        return GoalStreak.calculate_current_streak(obj.user, obj)


class MealLogSerializer(serializers.ModelSerializer):
    food_item_name = serializers.CharField(source='food_item.name', read_only=True)
    actual_nutrients = serializers.SerializerMethodField()
    
    class Meta:
        model = MealLog
        fields = [
            'id', 'food_item', 'food_item_name', 'consumed_at', 
            'portion_multiplier', 'log_method', 'actual_nutrients'
        ]
    
    def get_actual_nutrients(self, obj):
        return obj.get_actual_nutrients()


class InsightsSerializer(serializers.Serializer):
    """Serializer for aggregated nutrition insights"""
    date_range = serializers.DictField()
    daily_averages = serializers.DictField()
    goal_alignment = serializers.DictField()
    trends = serializers.ListField()
    recommendations = serializers.ListField()
    highest_intake_day = serializers.DictField()
    lowest_intake_day = serializers.DictField()
    macro_distribution = serializers.DictField()
