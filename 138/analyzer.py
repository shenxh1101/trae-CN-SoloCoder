from datetime import datetime
from collections import Counter
from config import WIND_DIRECTIONS, COMFORT_LEVELS, PRECIPITATION_LEVELS


class WeatherAnalyzer:
    def __init__(self, weather_data):
        self.data = weather_data
        self.daily = weather_data.get('daily', {})
    
    def get_basic_stats(self):
        temp_max = self.daily.get('temperature_2m_max', [])
        temp_min = self.daily.get('temperature_2m_min', [])
        temp_mean = self.daily.get('temperature_2m_mean', [])
        precipitation = self.daily.get('precipitation_sum', [])
        
        stats = {
            'city': self.data.get('city_name', self.data.get('city')),
            'start_date': self.data.get('start_date'),
            'end_date': self.data.get('end_date'),
            'days': self.data.get('days'),
        }
        
        if temp_mean:
            stats['avg_temperature'] = round(sum(temp_mean) / len(temp_mean), 1)
        
        if temp_max:
            stats['max_temperature'] = round(max(temp_max), 1)
            stats['max_temp_date'] = self.daily.get('time', [])[temp_max.index(max(temp_max))] if self.daily.get('time') else None
        
        if temp_min:
            stats['min_temperature'] = round(min(temp_min), 1)
            stats['min_temp_date'] = self.daily.get('time', [])[temp_min.index(min(temp_min))] if self.daily.get('time') else None
        
        if precipitation:
            rain_days = sum(1 for p in precipitation if p > 0)
            stats['precipitation_days'] = rain_days
            stats['total_precipitation'] = round(sum(precipitation), 1)
            stats['avg_precipitation_per_day'] = round(sum(precipitation) / len(precipitation), 1)
        
        humidity = self.daily.get('relative_humidity_2m_mean', [])
        if humidity:
            stats['avg_humidity'] = round(sum(humidity) / len(humidity), 1)
        
        return stats
    
    def get_wind_direction_frequency(self):
        wind_directions = self.daily.get('wind_direction_10m_dominant', [])
        if not wind_directions:
            return {}
        
        def get_direction(deg):
            directions = sorted(WIND_DIRECTIONS.keys())
            for i, d in enumerate(directions):
                if i == len(directions) - 1:
                    if deg >= (d + directions[0]) / 2 or deg < (d + directions[0]) / 2:
                        return WIND_DIRECTIONS[d]
                else:
                    mid = (d + directions[i+1]) / 2
                    if deg < mid:
                        return WIND_DIRECTIONS[d]
            return WIND_DIRECTIONS[0]
        
        direction_counts = Counter(get_direction(d) for d in wind_directions if d is not None)
        total = sum(direction_counts.values())
        
        result = {}
        for direction, count in sorted(direction_counts.items(), key=lambda x: -x[1]):
            result[direction] = {
                'count': count,
                'percentage': round(count / total * 100, 1)
            }
        
        return result
    
    def get_precipitation_distribution(self):
        precipitation = self.daily.get('precipitation_sum', [])
        if not precipitation:
            return {}
        
        distribution = {}
        for level in PRECIPITATION_LEVELS:
            count = 0
            for p in precipitation:
                if p is None:
                    continue
                if level['min'] <= p <= level['max']:
                    if level['name'] == '无雨' and p == 0:
                        count += 1
                    elif level['name'] != '无雨':
                        count += 1
            distribution[level['name']] = count
        
        return distribution
    
    def calculate_comfort_index(self):
        temp_mean = self.daily.get('temperature_2m_mean', [])
        humidity = self.daily.get('relative_humidity_2m_mean', [])
        
        if not temp_mean:
            return None
        
        avg_temp = sum(temp_mean) / len(temp_mean)
        avg_humidity = sum(humidity) / len(humidity) if humidity else 50
        
        hi = -42.379 + 2.04901523 * avg_temp + 10.14333127 * avg_humidity
        hi -= 0.22475541 * avg_temp * avg_humidity
        hi -= 0.00683783 * avg_temp ** 2
        hi -= 0.05481717 * avg_humidity ** 2
        hi += 0.00122874 * avg_temp ** 2 * avg_humidity
        hi += 0.00085282 * avg_temp * avg_humidity ** 2
        hi -= 0.00000199 * avg_temp ** 2 * avg_humidity ** 2
        
        for level in COMFORT_LEVELS:
            if level['min'] <= avg_temp < level['max']:
                return {
                    'avg_temperature': round(avg_temp, 1),
                    'avg_humidity': round(avg_humidity, 1),
                    'comfort_index': round(hi, 1),
                    'comfort_level': level['level'],
                    'suggestion': level['suggestion']
                }
        
        return None
    
    def get_sunrise_sunset_data(self):
        sunrise = self.daily.get('sunrise', [])
        sunset = self.daily.get('sunset', [])
        times = self.daily.get('time', [])
        
        if not sunrise or not sunset:
            return []
        
        result = []
        for i in range(len(sunrise)):
            if sunrise[i] and sunset[i]:
                sunrise_dt = datetime.fromisoformat(sunrise[i].replace('T', ' '))
                sunset_dt = datetime.fromisoformat(sunset[i].replace('T', ' '))
                day_length = (sunset_dt - sunrise_dt).total_seconds() / 3600
                
                result.append({
                    'date': times[i] if i < len(times) else None,
                    'sunrise': sunrise_dt.strftime('%H:%M'),
                    'sunset': sunset_dt.strftime('%H:%M'),
                    'day_length_hours': round(day_length, 2)
                })
        
        return result
    
    def compare_with_last_year(self, last_year_data):
        current_stats = self.get_basic_stats()
        ly_analyzer = WeatherAnalyzer(last_year_data)
        ly_stats = ly_analyzer.get_basic_stats()
        
        comparison = {
            'current_period': f"{current_stats['start_date']} ~ {current_stats['end_date']}",
            'last_year_period': f"{last_year_data.get('start_date')} ~ {last_year_data.get('end_date')}",
        }
        
        if 'avg_temperature' in current_stats and 'avg_temperature' in ly_stats:
            temp_diff = current_stats['avg_temperature'] - ly_stats['avg_temperature']
            comparison['avg_temperature_diff'] = round(temp_diff, 1)
            comparison['avg_temperature_trend'] = '偏高' if temp_diff > 0 else '偏低' if temp_diff < 0 else '持平'
        
        if 'total_precipitation' in current_stats and 'total_precipitation' in ly_stats:
            precip_diff = current_stats['total_precipitation'] - ly_stats['total_precipitation']
            comparison['precipitation_diff'] = round(precip_diff, 1)
            comparison['precipitation_trend'] = '偏多' if precip_diff > 0 else '偏少' if precip_diff < 0 else '持平'
        
        return comparison
    
    def get_monthly_analysis(self):
        daily = self.daily
        times = daily.get('time', [])
        temp_max = daily.get('temperature_2m_max', [])
        temp_min = daily.get('temperature_2m_min', [])
        temp_mean = daily.get('temperature_2m_mean', [])
        precipitation = daily.get('precipitation_sum', [])
        
        monthly_data = {}
        
        for i in range(len(times)):
            if not times[i]:
                continue
            month = times[i][:7]
            if month not in monthly_data:
                monthly_data[month] = {
                    'temp_max_list': [],
                    'temp_min_list': [],
                    'temp_mean_list': [],
                    'precipitation_list': [],
                    'count': 0
                }
            
            m = monthly_data[month]
            if i < len(temp_max) and temp_max[i] is not None:
                m['temp_max_list'].append(temp_max[i])
            if i < len(temp_min) and temp_min[i] is not None:
                m['temp_min_list'].append(temp_min[i])
            if i < len(temp_mean) and temp_mean[i] is not None:
                m['temp_mean_list'].append(temp_mean[i])
            if i < len(precipitation) and precipitation[i] is not None:
                m['precipitation_list'].append(precipitation[i])
            m['count'] += 1
        
        result = []
        for month in sorted(monthly_data.keys()):
            m = monthly_data[month]
            month_num = int(month.split('-')[1])
            season = self._get_season(month_num)
            
            result.append({
                'month': month,
                'month_name': f"{month_num}月",
                'season': season,
                'avg_max_temp': round(sum(m['temp_max_list']) / len(m['temp_max_list']), 1) if m['temp_max_list'] else None,
                'avg_min_temp': round(sum(m['temp_min_list']) / len(m['temp_min_list']), 1) if m['temp_min_list'] else None,
                'avg_mean_temp': round(sum(m['temp_mean_list']) / len(m['temp_mean_list']), 1) if m['temp_mean_list'] else None,
                'total_precipitation': round(sum(m['precipitation_list']), 1) if m['precipitation_list'] else None,
                'rainy_days': sum(1 for p in m['precipitation_list'] if p > 0),
                'days_count': m['count']
            })
        
        return result
    
    def _get_season(self, month):
        if month in [3, 4, 5]:
            return '春季'
        elif month in [6, 7, 8]:
            return '夏季'
        elif month in [9, 10, 11]:
            return '秋季'
        else:
            return '冬季'
    
    def get_daily_data(self):
        times = self.daily.get('time', [])
        temp_max = self.daily.get('temperature_2m_max', [])
        temp_min = self.daily.get('temperature_2m_min', [])
        temp_mean = self.daily.get('temperature_2m_mean', [])
        precipitation = self.daily.get('precipitation_sum', [])
        humidity = self.daily.get('relative_humidity_2m_mean', [])
        
        result = []
        for i in range(len(times)):
            day_data = {
                'date': times[i] if i < len(times) else None,
                'temp_max': round(temp_max[i], 1) if i < len(temp_max) and temp_max[i] is not None else None,
                'temp_min': round(temp_min[i], 1) if i < len(temp_min) and temp_min[i] is not None else None,
                'temp_mean': round(temp_mean[i], 1) if i < len(temp_mean) and temp_mean[i] is not None else None,
                'precipitation': round(precipitation[i], 1) if i < len(precipitation) and precipitation[i] is not None else None,
                'humidity': round(humidity[i], 1) if i < len(humidity) and humidity[i] is not None else None,
            }
            result.append(day_data)
        
        return result
