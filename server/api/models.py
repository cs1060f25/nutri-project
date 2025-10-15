from django.db import models

class User(models.Model):
    name = models.CharField(max_length=200)
    allergies = models.JSONField(default=list)
    diet_goal = models.CharField(max_length=100)
    activity_level = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
