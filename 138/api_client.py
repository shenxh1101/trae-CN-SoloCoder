import os
import json
import requests
from datetime import datetime, timedelta
from config import CACHE_DIR, ARCHIVE_URL, FORECAST_URL, HISTORICAL_ARCHIVE_URL, CITIES_COORDINATES


class WeatherAPIClient:
    def __init__(self):
        self.session = requests.Session()
        self._ensure_cache_dir()
    
    def _ensure_cache_dir(self):
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR, exist_ok=True)
    
    def _get_cache_filename(self, city, start_date, end_date, data_type='historical'):
        city_lower = city.lower()
        filename = f"{city_lower}_{data_type}_{start_date}_{end_date}.json"
        return os.path.join(CACHE_DIR, filename)
    
    def _load_from_cache(self, cache_file):
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return None
        return None
    
    def _save_to_cache(self, cache_file, data):
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            pass
    
    def get_city_coordinates(self, city):
        city_lower = city.lower()
        if city_lower in CITIES_COORDINATES:
            return CITIES_COORDINATES[city_lower]
        return None
    
    def get_historical_weather(self, city, days=7, use_cache=True):
        coords = self.get_city_coordinates(city)
        if not coords:
            raise ValueError(f"未找到城市: {city}")
        
        end_date = datetime.now().date() - timedelta(days=1)
        start_date = end_date - timedelta(days=days-1)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        cache_file = self._get_cache_filename(city, start_str, end_str, 'historical')
        
        if use_cache:
            cached_data = self._load_from_cache(cache_file)
            if cached_data:
                return cached_data
        
        params = {
            'latitude': coords['lat'],
            'longitude': coords['lon'],
            'start_date': start_str,
            'end_date': end_str,
            'daily': ','.join([
                'temperature_2m_max',
                'temperature_2m_min',
                'temperature_2m_mean',
                'precipitation_sum',
                'precipitation_hours',
                'wind_direction_10m_dominant',
                'relative_humidity_2m_mean',
                'sunrise',
                'sunset',
            ]),
            'timezone': 'Asia/Shanghai',
            'wind_speed_unit': 'ms',
        }
        
        response = self.session.get(ARCHIVE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        result = {
            'city': city,
            'city_name': coords['name'],
            'coordinates': {'lat': coords['lat'], 'lon': coords['lon']},
            'start_date': start_str,
            'end_date': end_str,
            'days': days,
            'daily': data.get('daily', {}),
            'fetch_time': datetime.now().isoformat()
        }
        
        self._save_to_cache(cache_file, result)
        
        return result
    
    def get_forecast_weather(self, city, days=3, use_cache=True):
        coords = self.get_city_coordinates(city)
        if not coords:
            raise ValueError(f"未找到城市: {city}")
        
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=days-1)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        cache_file = self._get_cache_filename(city, start_str, end_str, 'forecast')
        
        if use_cache:
            cached_data = self._load_from_cache(cache_file)
            if cached_data:
                return cached_data
        
        params = {
            'latitude': coords['lat'],
            'longitude': coords['lon'],
            'start_date': start_str,
            'end_date': end_str,
            'daily': ','.join([
                'temperature_2m_max',
                'temperature_2m_min',
                'temperature_2m_mean',
                'precipitation_sum',
                'precipitation_probability_max',
                'wind_direction_10m_dominant',
                'relative_humidity_2m_mean',
            ]),
            'timezone': 'Asia/Shanghai',
            'wind_speed_unit': 'ms',
        }
        
        response = self.session.get(FORECAST_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        result = {
            'city': city,
            'city_name': coords['name'],
            'coordinates': {'lat': coords['lat'], 'lon': coords['lon']},
            'start_date': start_str,
            'end_date': end_str,
            'days': days,
            'daily': data.get('daily', {}),
            'fetch_time': datetime.now().isoformat()
        }
        
        self._save_to_cache(cache_file, result)
        
        return result
    
    def get_historical_weather_year_ago(self, city, days=7, use_cache=True):
        coords = self.get_city_coordinates(city)
        if not coords:
            raise ValueError(f"未找到城市: {city}")
        
        end_date = datetime.now().date() - timedelta(days=365)
        start_date = end_date - timedelta(days=days-1)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        cache_file = self._get_cache_filename(city, start_str, end_str, 'historical_ly')
        
        if use_cache:
            cached_data = self._load_from_cache(cache_file)
            if cached_data:
                return cached_data
        
        params = {
            'latitude': coords['lat'],
            'longitude': coords['lon'],
            'start_date': start_str,
            'end_date': end_str,
            'daily': ','.join([
                'temperature_2m_max',
                'temperature_2m_min',
                'temperature_2m_mean',
                'precipitation_sum',
            ]),
            'timezone': 'Asia/Shanghai',
            'wind_speed_unit': 'ms',
        }
        
        response = self.session.get(HISTORICAL_ARCHIVE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        result = {
            'city': city,
            'city_name': coords['name'],
            'start_date': start_str,
            'end_date': end_str,
            'days': days,
            'daily': data.get('daily', {}),
            'fetch_time': datetime.now().isoformat()
        }
        
        self._save_to_cache(cache_file, result)
        
        return result
    
    def get_monthly_stats(self, city, year=None, use_cache=True):
        coords = self.get_city_coordinates(city)
        if not coords:
            raise ValueError(f"未找到城市: {city}")
        
        if year is None:
            year = datetime.now().year
        
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        cache_file = self._get_cache_filename(city, start_str, end_str, 'monthly')
        
        if use_cache:
            cached_data = self._load_from_cache(cache_file)
            if cached_data:
                return cached_data
        
        params = {
            'latitude': coords['lat'],
            'longitude': coords['lon'],
            'start_date': start_str,
            'end_date': end_str,
            'daily': ','.join([
                'temperature_2m_max',
                'temperature_2m_min',
                'temperature_2m_mean',
                'precipitation_sum',
            ]),
            'timezone': 'Asia/Shanghai',
            'wind_speed_unit': 'ms',
        }
        
        response = self.session.get(HISTORICAL_ARCHIVE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        result = {
            'city': city,
            'city_name': coords['name'],
            'year': year,
            'start_date': start_str,
            'end_date': end_str,
            'daily': data.get('daily', {}),
            'fetch_time': datetime.now().isoformat()
        }
        
        self._save_to_cache(cache_file, result)
        
        return result
