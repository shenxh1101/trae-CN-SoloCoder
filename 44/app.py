from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

QWEATHER_KEY = os.getenv('QWEATHER_KEY', '')
QWEATHER_BASE_URL = 'https://devapi.qweather.com/v7'
PLACEHOLDER_KEYS = ['', 'your_qweather_api_key_here', 'YOUR_DEFAULT_API_KEY']


def is_valid_api_key():
    return QWEATHER_KEY not in PLACEHOLDER_KEYS


def get_city_location(city_name):
    try:
        url = 'https://geoapi.qweather.com/v2/city/lookup'
        params = {
            'location': city_name,
            'key': QWEATHER_KEY,
            'lang': 'zh'
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        if data.get('code') == '200' and data.get('location'):
            return data['location'][0]
        app.logger.error(f'城市查找失败: {data}')
        return None
    except Exception as e:
        app.logger.error(f'获取城市位置失败: {e}')
        return None


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/weather/current')
def get_current_weather():
    if not is_valid_api_key():
        return jsonify({'error': '请先在.env文件中配置QWEATHER_KEY'}), 500
    
    city = request.args.get('city', '')
    if not city:
        return jsonify({'error': '请输入城市名称'}), 400
    
    location = get_city_location(city)
    if not location:
        return jsonify({'error': '未找到该城市，请检查城市名称'}), 404
    
    try:
        url = f'{QWEATHER_BASE_URL}/weather/now'
        params = {
            'location': location['id'],
            'key': QWEATHER_KEY,
            'lang': 'zh'
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('code') == '200':
            return jsonify({
                'city': location['name'],
                'country': location.get('country', ''),
                'temp': data['now']['temp'],
                'feelsLike': data['now']['feelsLike'],
                'text': data['now']['text'],
                'icon': data['now']['icon'],
                'humidity': data['now']['humidity'],
                'windDir': data['now']['windDir'],
                'windScale': data['now']['windScale'],
                'windSpeed': data['now']['windSpeed'],
                'pressure': data['now']['pressure'],
                'vis': data['now']['vis'],
                'lon': location['lon'],
                'lat': location['lat']
            })
        
        app.logger.error(f'获取实时天气失败: {data}')
        return jsonify({'error': f'获取天气信息失败 (代码: {data.get("code", "unknown")})'}), 500
    except Exception as e:
        app.logger.error(f'获取实时天气异常: {e}')
        return jsonify({'error': '获取天气信息失败，请稍后重试'}), 500


@app.route('/api/weather/forecast')
def get_forecast():
    if not is_valid_api_key():
        return jsonify({'error': '请先在.env文件中配置QWEATHER_KEY'}), 500
    
    city = request.args.get('city', '')
    if not city:
        return jsonify({'error': '请输入城市名称'}), 400
    
    location = get_city_location(city)
    if not location:
        return jsonify({'error': '未找到该城市，请检查城市名称'}), 404
    
    try:
        url = f'{QWEATHER_BASE_URL}/weather/3d'
        params = {
            'location': location['id'],
            'key': QWEATHER_KEY,
            'lang': 'zh'
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('code') == '200':
            forecast = []
            for day in data['daily']:
                forecast.append({
                    'date': day['fxDate'],
                    'tempMax': day['tempMax'],
                    'tempMin': day['tempMin'],
                    'textDay': day['textDay'],
                    'textNight': day['textNight'],
                    'iconDay': day['iconDay'],
                    'iconNight': day['iconNight'],
                    'windDirDay': day['windDirDay'],
                    'windScaleDay': day['windScaleDay']
                })
            return jsonify({'forecast': forecast})
        
        app.logger.error(f'获取天气预报失败: {data}')
        return jsonify({'error': f'获取天气预报失败 (代码: {data.get("code", "unknown")})'}), 500
    except Exception as e:
        app.logger.error(f'获取天气预报异常: {e}')
        return jsonify({'error': '获取天气预报失败，请稍后重试'}), 500


@app.route('/api/weather/aqi')
def get_aqi():
    if not is_valid_api_key():
        return jsonify({'error': '请先在.env文件中配置QWEATHER_KEY'}), 500
    
    city = request.args.get('city', '')
    if not city:
        return jsonify({'error': '请输入城市名称'}), 400
    
    location = get_city_location(city)
    if not location:
        return jsonify({'error': '未找到该城市，请检查城市名称'}), 404
    
    try:
        url = f'{QWEATHER_BASE_URL}/air/now'
        params = {
            'location': location['id'],
            'key': QWEATHER_KEY,
            'lang': 'zh'
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('code') == '200':
            return jsonify({
                'aqi': data['now']['aqi'],
                'level': data['now']['level'],
                'category': data['now']['category'],
                'pm2p5': data['now']['pm2p5'],
                'pm10': data['now']['pm10'],
                'no2': data['now']['no2'],
                'so2': data['now']['so2'],
                'co': data['now']['co'],
                'o3': data['now']['o3']
            })
        
        app.logger.error(f'获取空气质量失败: {data}')
        return jsonify({'error': f'获取空气质量失败 (代码: {data.get("code", "unknown")})'}), 500
    except Exception as e:
        app.logger.error(f'获取空气质量异常: {e}')
        return jsonify({'error': '获取空气质量失败，请稍后重试'}), 500


@app.route('/api/weather/alarm')
def get_alarm():
    if not is_valid_api_key():
        return jsonify({'error': '请先在.env文件中配置QWEATHER_KEY'}), 500
    
    city = request.args.get('city', '')
    if not city:
        return jsonify({'error': '请输入城市名称'}), 400
    
    location = get_city_location(city)
    if not location:
        return jsonify({'error': '未找到该城市，请检查城市名称'}), 404
    
    try:
        url = f'{QWEATHER_BASE_URL}/warning/now'
        params = {
            'location': location['id'],
            'key': QWEATHER_KEY,
            'lang': 'zh'
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('code') == '200':
            alarms = []
            if data.get('warning'):
                for alarm in data['warning']:
                    alarms.append({
                        'type': alarm['typeName'],
                        'level': alarm['level'],
                        'title': alarm['title'],
                        'text': alarm.get('text', '')
                    })
            return jsonify({'alarms': alarms})
        
        app.logger.error(f'获取天气预警失败: {data}')
        return jsonify({'error': f'获取天气预警失败 (代码: {data.get("code", "unknown")})'}), 500
    except Exception as e:
        app.logger.error(f'获取天气预警异常: {e}')
        return jsonify({'error': '获取天气预警失败，请稍后重试'}), 500


@app.route('/api/location/by-ip')
def get_location_by_ip():
    try:
        ip = request.remote_addr
        if ip == '127.0.0.1' or ip.startswith('192.168.') or ip.startswith('10.'):
            try:
                response = requests.get('https://api.ipify.org?format=json', timeout=5)
                ip = response.json()['ip']
            except:
                return jsonify({'city': '北京', 'country': '中国'})
        
        try:
            response = requests.get(f'https://ipapi.co/{ip}/json/', timeout=5)
            data = response.json()
            
            city = data.get('city', '')
            if city:
                return jsonify({'city': city, 'country': data.get('country_name', '')})
        except:
            pass
        
        return jsonify({'city': '北京', 'country': '中国'})
    except Exception as e:
        app.logger.error(f'IP定位失败: {e}')
        return jsonify({'city': '北京', 'country': '中国'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
