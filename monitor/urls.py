# monitor/urls.py
from django.urls import path
from . import views

app_name = 'monitor'  # ✅ This must match what you use in {% url 'monitor:dashboard' %}

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('history/', views.anomaly_history, name='anomaly_history'),
    path('api/live-data/', views.api_live_data, name='api_live_data'),
    path('api/current-stats/', views.api_current_stats, name='api_current_stats'),
    path('api/queue-status/', views.api_queue_status, name='api_queue_status'),
    path('api/retrain-model/', views.api_retrain_model, name='api_retrain_model'),
]
