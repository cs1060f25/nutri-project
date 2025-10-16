# nutrition/urls.py

from django.urls import path
from . import views

app_name = 'nutrition'

urlpatterns = [
    # Page views
    path('insights/', views.insights_page, name='insights'),
    
    # API endpoints
    path('api/insights/', views.get_insights_data, name='api_insights'),
    path('api/goals/', views.get_user_goals, name='api_goals'),
    path('api/goals/<int:goal_id>/streak/', views.get_goal_streak_data, name='api_goal_streak'),
]


# huds_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('nutrition/', include('nutrition.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
