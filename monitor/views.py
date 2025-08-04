import pandas as pd
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, timedelta
from .models import detector, get_anomaly_stats
import json
import logging
from monitor.realtime_buffer import live_data_queue

logger = logging.getLogger(__name__)

def ensure_model_ready():
    """Ensure model is loaded, return success status"""
    try:
        if not detector.load_model():
            logger.info("Model not loaded, training new model...")
            detector.train_model()
            return True
        return True
    except Exception as e:
        logger.error(f"Model preparation failed: {str(e)}")
        return False

def safe_get_live_data():
    """Safely extract live data from queue without removing items"""
    data = []
    try:
        # Get queue size first
        queue_size = live_data_queue.qsize()
        
        if queue_size > 0:
            # Convert queue to list to read data without removing it
            temp_items = []
            
            # Extract all items temporarily
            while not live_data_queue.empty():
                try:
                    item = live_data_queue.get_nowait()
                    temp_items.append(item)
                except:
                    break
            
            # Put all items back
            for item in temp_items:
                try:
                    live_data_queue.put_nowait(item)
                except:
                    # If queue is full, remove oldest and add current
                    try:
                        live_data_queue.get_nowait()
                        live_data_queue.put_nowait(item)
                    except:
                        pass
            
            data = temp_items
        
    except Exception as e:
        logger.error(f"Error accessing live queue: {str(e)}")
    
    return data

def get_recent_live_data(hours=1):
    """Get recent live data within specified hours"""
    try:
        live_data = safe_get_live_data()
        
        if not live_data:
            return []
        
        # Filter data by timestamp
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_data = []
        
        for item in live_data:
            try:
                # Parse timestamp from the data
                if 'Timestamp' in item:
                    item_time = datetime.strptime(item['Timestamp'], "%Y-%m-%d %H:%M:%S")
                    if item_time >= cutoff_time:
                        recent_data.append(item)
            except Exception as e:
                logger.warning(f"Error parsing timestamp: {str(e)}")
                # Include item anyway if timestamp parsing fails
                recent_data.append(item)
        
        return recent_data
        
    except Exception as e:
        logger.error(f"Error getting recent live data: {str(e)}")
        return []

def home(request):
    return render(request, 'monitor/home.html')

def dashboard(request):
    context = {
        'stats': {'total_packets': 0, 'normal_packets': 0, 'anomaly_packets': 0, 'anomaly_percentage': 0},
        'recent_anomalies': [],
        'hourly_stats': '[]'
    }
    
    if not ensure_model_ready():
        context['error'] = 'Model initialization failed'
        return render(request, 'monitor/dashboard.html', context)
    
    try:
        # Get live data from the last 24 hours
        live_data = get_recent_live_data(hours=24)
        
        if live_data:
            df = pd.DataFrame(live_data)
            df_with_predictions, stats = get_anomaly_stats(df)
            hourly_stats = prepare_hourly_stats(df_with_predictions)
            
            # Get recent anomalies
            anomalies = df_with_predictions[df_with_predictions['Status'] == 'Anomaly'].tail(10)
            
            context.update({
                'stats': stats,
                'recent_anomalies': anomalies.to_dict('records'),
                'hourly_stats': json.dumps(hourly_stats)
            })
        else:
            logger.info("No live data available for dashboard")
            
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        context['error'] = 'Data processing error'

    return render(request, 'monitor/dashboard.html', context)

def anomaly_history(request):
    context = {
        'data': [],
        'stats': {'total_packets': 0, 'normal_packets': 0, 'anomaly_packets': 0, 'anomaly_percentage': 0},
        'total_anomalies': 0
    }
    
    if not ensure_model_ready():
        context['error'] = 'Model initialization failed'
        return render(request, 'monitor/history.html', context)
    
    try:
        # Get all available live data
        live_data = safe_get_live_data()
        
        if live_data:
            df = pd.DataFrame(live_data)
            df_with_predictions, stats = get_anomaly_stats(df)
            
            # Filter only anomalies and sort by timestamp
            anomalies = df_with_predictions[df_with_predictions['Status'] == 'Anomaly']
            if 'Timestamp' in anomalies.columns:
                anomalies = anomalies.sort_values(by='Timestamp', ascending=False)
            
            context.update({
                'data': anomalies.to_dict('records'),
                'stats': stats,
                'total_anomalies': len(anomalies)
            })
        else:
            logger.info("No live data available for anomaly history")
            
    except Exception as e:
        logger.error(f"Anomaly history error: {str(e)}")
        context['error'] = 'Data processing error'

    return render(request, 'monitor/history.html', context)

@csrf_exempt
def api_live_data(request):
    """API endpoint to get real-time live data"""
    try:
        # Get recent live data (last 10 minutes for real-time display)
        live_data = get_recent_live_data(hours=0.17)  # ~10 minutes
        
        if live_data:
            df = pd.DataFrame(live_data)
            
            # Validate data structure
            required_cols = ['Source_IP', 'Dest_IP', 'Protocol', 'Length']
            if all(col in df.columns for col in required_cols):
                df_with_predictions, stats = get_anomaly_stats(df)
                
                return JsonResponse({
                    "success": True,
                    "stats": stats,
                    "recent_data": df_with_predictions.tail(50).to_dict("records"),  # Last 50 packets
                    "total_packets": len(df_with_predictions)
                })
            else:
                missing_cols = [col for col in required_cols if col not in df.columns]
                return JsonResponse({
                    "success": False,
                    "error": f"Missing required columns: {missing_cols}"
                })
        else:
            return JsonResponse({
                "success": True,
                "stats": {"total_packets": 0, "normal_packets": 0, "anomaly_packets": 0, "anomaly_percentage": 0},
                "recent_data": [],
                "total_packets": 0
            })

    except Exception as e:
        logger.error(f"API live data error: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "Internal server error"
        })

@csrf_exempt
def api_current_stats(request):
    """API endpoint to get current statistics only"""
    try:
        live_data = safe_get_live_data()
        
        if live_data:
            df = pd.DataFrame(live_data)
            _, stats = get_anomaly_stats(df)
            
            return JsonResponse({
                "success": True,
                "stats": stats,
                "queue_size": live_data_queue.qsize(),
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            return JsonResponse({
                "success": True,
                "stats": {"total_packets": 0, "normal_packets": 0, "anomaly_packets": 0, "anomaly_percentage": 0},
                "queue_size": 0,
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
    except Exception as e:
        logger.error(f"API current stats error: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "Internal server error"
        })

@csrf_exempt
def api_retrain_model(request):
    if request.method == 'POST':
        try:
            # Use current live data for training
            live_data = safe_get_live_data()
            
            if live_data:
                # Train model with live data
                df = pd.DataFrame(live_data)
                detector.train_model(df)  # Assuming train_model can accept DataFrame
                
                return JsonResponse({
                    'success': True, 
                    'message': f'Model retrained with {len(live_data)} live samples'
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'error': 'No live data available for training'
                })
                
        except Exception as e:
            logger.error(f"Model retraining error: {str(e)}")
            return JsonResponse({'success': False, 'error': 'Model retraining failed'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

def prepare_hourly_stats(df):
    """Prepare hourly statistics for visualization"""
    if df.empty or 'Timestamp' not in df.columns:
        return []
    
    try:
        # Convert timestamp strings to datetime if needed
        if df['Timestamp'].dtype == 'object':
            df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
        
        df = df.dropna(subset=['Timestamp'])
        df['Hour'] = df['Timestamp'].dt.hour
        
        hourly_data = df.groupby(['Hour', 'Status']).size().unstack(fill_value=0)
        
        stats = []
        for h in range(24):
            normal_count = int(hourly_data.get('Normal', {}).get(h, 0)) if 'Normal' in hourly_data.columns else 0
            anomaly_count = int(hourly_data.get('Anomaly', {}).get(h, 0)) if 'Anomaly' in hourly_data.columns else 0
            
            stats.append({
                'hour': h, 
                'normal': normal_count, 
                'anomaly': anomaly_count
            })
        
        return stats
        
    except Exception as e:
        logger.error(f"Error preparing hourly stats: {str(e)}")
        return []

# Additional utility function for frontend polling
@csrf_exempt
def api_queue_status(request):
    """Get current queue status"""
    try:
        return JsonResponse({
            "success": True,
            "queue_size": live_data_queue.qsize(),
            "queue_max_size": live_data_queue.maxsize,
            "is_full": live_data_queue.full(),
            "is_empty": live_data_queue.empty(),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        })