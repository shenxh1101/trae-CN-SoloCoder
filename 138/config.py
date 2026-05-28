import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, 'cache')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

API_BASE_URL = 'https://api.open-meteo.com/v1'
FORECAST_URL = f'{API_BASE_URL}/forecast'
ARCHIVE_URL = f'{API_BASE_URL}/forecast'
HISTORICAL_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'

CITIES_COORDINATES = {
    'beijing': {'lat': 39.9042, 'lon': 116.4074, 'name': '北京'},
    'shanghai': {'lat': 31.2304, 'lon': 121.4737, 'name': '上海'},
    'guangzhou': {'lat': 23.1291, 'lon': 113.2644, 'name': '广州'},
    'shenzhen': {'lat': 22.5431, 'lon': 114.0579, 'name': '深圳'},
    'chengdu': {'lat': 30.5728, 'lon': 104.0668, 'name': '成都'},
    'hangzhou': {'lat': 30.2741, 'lon': 120.1551, 'name': '杭州'},
    'wuhan': {'lat': 30.5928, 'lon': 114.3055, 'name': '武汉'},
    'xian': {'lat': 34.3416, 'lon': 108.9398, 'name': '西安'},
    'nanjing': {'lat': 32.0603, 'lon': 118.7969, 'name': '南京'},
    'chongqing': {'lat': 29.4316, 'lon': 106.9123, 'name': '重庆'},
    'newyork': {'lat': 40.7128, 'lon': -74.0060, 'name': '纽约'},
    'london': {'lat': 51.5074, 'lon': -0.1278, 'name': '伦敦'},
    'tokyo': {'lat': 35.6762, 'lon': 139.6503, 'name': '东京'},
    'paris': {'lat': 48.8566, 'lon': 2.3522, 'name': '巴黎'},
}

WIND_DIRECTIONS = {
    0: '北', 45: '东北', 90: '东', 135: '东南',
    180: '南', 225: '西南', 270: '西', 315: '西北'
}

COMFORT_LEVELS = [
    {'min': -float('inf'), 'max': 0, 'level': '寒冷', 'suggestion': '不适宜出行，注意保暖'},
    {'min': 0, 'max': 10, 'level': '寒冷', 'suggestion': '较不适宜出行，建议多穿衣物'},
    {'min': 10, 'max': 20, 'level': '凉爽', 'suggestion': '适宜出行，天气凉爽舒适'},
    {'min': 20, 'max': 28, 'level': '舒适', 'suggestion': '非常适宜出行，天气温暖舒适'},
    {'min': 28, 'max': 35, 'level': '炎热', 'suggestion': '较不适宜出行，注意防暑降温'},
    {'min': 35, 'max': float('inf'), 'level': '酷热', 'suggestion': '不适宜出行，尽量避免户外活动'},
]

PRECIPITATION_LEVELS = [
    {'name': '无雨', 'min': 0, 'max': 0},
    {'name': '小雨', 'min': 0.1, 'max': 2.5},
    {'name': '中雨', 'min': 2.5, 'max': 10},
    {'name': '大雨', 'min': 10, 'max': 25},
    {'name': '暴雨', 'min': 25, 'max': float('inf')},
]
