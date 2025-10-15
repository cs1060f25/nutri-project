from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health'),
    path('onboarding/complete/', views.complete_onboarding, name='complete_onboarding'),
]
