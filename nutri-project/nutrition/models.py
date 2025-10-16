# nutrition/models.py

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta

class UserProfile(models.Model):
    """Extended user profile with nutrition preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='nutrition_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    activity_level = models.CharField(
        max_length=20,
        choices=[
            ('sedentary', 'Sedentary'),
            ('light', 'Lightly Active'),
            ('moderate', 'Moderately Active'),
            ('very', 'Very Active'),
            ('extra', 'Extra Active'),
        ],
        default='moderate'
    )
    preferences = models.JSONField(default=dict, blank=True)  # Dietary restrictions, allergies
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username}'s Profile"


class NutritionGoal(models.Model):
    """User-defined nutrition goals"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nutrition_goals')
    goal_type = models.CharField(
        max_length=50,
        choices=[
            ('calories', 'Daily Calorie Intake'),
            ('protein', 'Protein (grams)'),
            ('carbs', 'Carbohydrates (grams)'),
            ('fats', 'Fats (grams)'),
            ('sodium', 'Sodium (mg)'),
            ('fiber', 'Fiber (grams)'),
            ('sugar', 'Sugar (grams)'),
            ('calcium', 'Calcium (mg)'),
            ('iron', 'Iron (mg)'),
        ]
    )
    target_value = models.DecimalField(max_digits=10, decimal_places=2)
    target_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    target_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, default='g')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Nutrition Goal'
        verbose_name_plural = 'Nutrition Goals'
        unique_together = ['user', 'goal_type']

    def __str__(self):
        return f"{self.user.username} - {self.get_goal_type_display()}: {self.target_value}{self.unit}"


class FoodItem(models.Model):
    """HUDS menu items with nutritional information"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    dining_hall = models.CharField(max_length=100)
    meal_type = models.CharField(
        max_length=20,
        choices=[
            ('breakfast', 'Breakfast'),
            ('lunch', 'Lunch'),
            ('dinner', 'Dinner'),
            ('brunch', 'Brunch'),
        ]
    )
    
    # Macronutrients
    calories = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=2)
    fats_g = models.DecimalField(max_digits=6, decimal_places=2)
    
    # Micronutrients
    sodium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fiber_g = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sugar_g = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    calcium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    iron_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    vitamin_a_iu = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    vitamin_c_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    # Metadata
    serving_size = models.CharField(max_length=100)
    allergens = models.JSONField(default=list, blank=True)
    dietary_tags = models.JSONField(default=list, blank=True)  # vegan, vegetarian, gluten-free, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Food Item'
        verbose_name_plural = 'Food Items'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['dining_hall', 'meal_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.dining_hall})"


class MealLog(models.Model):
    """User's logged meals from HUDS selections or photo analysis"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meal_logs')
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='meal_logs')
    consumed_at = models.DateTimeField(default=timezone.now)
    portion_multiplier = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(10.0)]
    )
    
    # Photo analysis data (if meal was logged via photo)
    photo = models.ImageField(upload_to='meal_photos/%Y/%m/%d/', null=True, blank=True)
    confidence_score = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    
    # Logging method
    log_method = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual Selection'),
            ('photo', 'Photo Analysis'),
            ('barcode', 'Barcode Scan'),
        ],
        default='manual'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Meal Log'
        verbose_name_plural = 'Meal Logs'
        ordering = ['-consumed_at']
        indexes = [
            models.Index(fields=['user', '-consumed_at']),
            models.Index(fields=['consumed_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.food_item.name} at {self.consumed_at}"

    def get_actual_nutrients(self):
        """Calculate nutrients based on portion multiplier"""
        return {
            'calories': float(self.food_item.calories) * float(self.portion_multiplier),
            'protein': float(self.food_item.protein_g) * float(self.portion_multiplier),
            'carbs': float(self.food_item.carbs_g) * float(self.portion_multiplier),
            'fats': float(self.food_item.fats_g) * float(self.portion_multiplier),
            'sodium': float(self.food_item.sodium_mg or 0) * float(self.portion_multiplier),
            'fiber': float(self.food_item.fiber_g or 0) * float(self.portion_multiplier),
            'sugar': float(self.food_item.sugar_g or 0) * float(self.portion_multiplier),
            'calcium': float(self.food_item.calcium_mg or 0) * float(self.portion_multiplier),
            'iron': float(self.food_item.iron_mg or 0) * float(self.portion_multiplier),
        }


class GoalStreak(models.Model):
    """Track user's goal achievement streaks"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_streaks')
    goal = models.ForeignKey(NutritionGoal, on_delete=models.CASCADE, related_name='streaks')
    streak_date = models.DateField()
    achieved = models.BooleanField(default=False)
    actual_value = models.DecimalField(max_digits=10, decimal_places=2)
    deviation_percentage = models.DecimalField(max_digits=5, decimal_places=2)  # +/- from goal
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Goal Streak'
        verbose_name_plural = 'Goal Streaks'
        unique_together = ['user', 'goal', 'streak_date']
        ordering = ['-streak_date']
        indexes = [
            models.Index(fields=['user', '-streak_date']),
        ]

    def __str__(self):
        status = "✓" if self.achieved else "✗"
        return f"{status} {self.user.username} - {self.goal.goal_type} on {self.streak_date}"

    @classmethod
    def calculate_current_streak(cls, user, goal):
        """Calculate the current consecutive streak for a goal"""
        today = timezone.now().date()
        streak_count = 0
        
        for i in range(365):  # Check up to 1 year back
            check_date = today - timedelta(days=i)
            try:
                streak_record = cls.objects.get(user=user, goal=goal, streak_date=check_date)
                if streak_record.achieved:
                    streak_count += 1
                else:
                    break
            except cls.DoesNotExist:
                break
        
        return streak_count
