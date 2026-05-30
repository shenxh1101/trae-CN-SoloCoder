#!/usr/bin/env python3
import argparse
import csv
import json
import os
import signal
import smtplib
import ssl
import sys
import time
import threading
from collections import defaultdict
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

CONFIG_FILE = 'weather_config.json'
LOG_DIR = 'weather_logs'

OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather'
QWEATHER_NOW = 'https://devapi.qweather.com/v7/weather/now'
QWEATHER_LOOKUP = 'https://geoapi.qweather.com/v2/city/lookup'
WTTR_BASE = 'https://wttr.in/{city}?format=j1'

WEATHER_CONDITIONS_ZH = {
    'Thunderstorm': '雷暴', 'Drizzle': '毛毛雨', 'Rain': '雨',
    'Snow': '雪', 'Mist': '薄雾', 'Smoke': '烟雾', 'Haze': '霾',
    'Dust': '沙尘', 'Fog': '雾', 'Sand': '沙尘暴', 'Ash': '火山灰',
    'Squall': '飑风', 'Tornado': '龙卷风', 'Clear': '晴', 'Clouds': '多云',
    'overcast clouds': '阴', 'scattered clouds': '少云',
    'broken clouds': '多云', 'few clouds': '晴间多云',
    'light rain': '小雨', 'moderate rain': '中雨', 'heavy rain': '大雨',
    'light snow': '小雪', 'heavy snow': '大雪',
}


def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'cities': [],
        'api_provider': 'openweathermap',
        'api_key': '',
        'qweather_key': '',
        'temp_change_threshold': 5,
        'smtp': {
            'enabled': False,
            'server': '',
            'port': 587,
            'use_ssl': False,
            'username': '',
            'password': '',
            'from_email': '',
            'to_email': ''
        }
    }


def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def ensure_log_dir():
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)


def get_log_filename(city):
    ensure_log_dir()
    safe_city = city.replace('/', '_').replace(' ', '_')
    return os.path.join(LOG_DIR, f'{safe_city}_weather.csv')


def _translate_condition(condition):
    lower = condition.lower()
    for key, val in WEATHER_CONDITIONS_ZH.items():
        if key.lower() in lower:
            return val
    return condition


def _get_weather_owm(city, api_key):
    url = OWM_BASE
    params = {'q': city, 'appid': api_key, 'units': 'metric'}
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    main = data['main']
    weather = data['weather'][0]
    condition_en = weather['description']
    condition = _translate_condition(condition_en)
    return {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'city': city,
        'temperature': round(float(main['temp']), 1),
        'humidity': int(main['humidity']),
        'condition': condition,
    }


def _get_weather_qweather(city, api_key):
    lookup_params = {'location': city, 'key': api_key}
    lookup_resp = requests.get(QWEATHER_LOOKUP, params=lookup_params, timeout=15)
    lookup_resp.raise_for_status()
    lookup_data = lookup_resp.json()
    if lookup_data.get('code') != '200' or not lookup_data.get('location'):
        raise ValueError(f'和风天气城市查询失败: {lookup_data.get("code", "unknown")}')
    location_id = lookup_data['location'][0]['id']
    now_params = {'location': location_id, 'key': api_key}
    now_resp = requests.get(QWEATHER_NOW, params=now_params, timeout=15)
    now_resp.raise_for_status()
    now_data = now_resp.json()
    if now_data.get('code') != '200':
        raise ValueError(f'和风天气获取失败: {now_data.get("code", "unknown")}')
    current = now_data['now']
    return {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'city': city,
        'temperature': round(float(current['temp']), 1),
        'humidity': int(current['humidity']),
        'condition': current['text'],
    }


def _get_weather_wttr(city):
    url = WTTR_BASE.format(city=city)
    headers = {'User-Agent': 'curl/7.68.0'}
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    current = data['current_condition'][0]
    condition_en = current['weatherDesc'][0]['value']
    condition = _translate_condition(condition_en)
    return {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'city': city,
        'temperature': round(float(current['temp_C']), 1),
        'humidity': int(current['humidity']),
        'condition': condition,
    }


def get_weather(city):
    config = get_config()
    provider = config.get('api_provider', 'openweathermap')
    errors = []

    if provider == 'openweathermap':
        api_key = config.get('api_key', '')
        if api_key:
            try:
                return _get_weather_owm(city, api_key)
            except Exception as e:
                errors.append(f'OpenWeatherMap: {e}')
        else:
            errors.append('OpenWeatherMap API密钥未配置')

    elif provider == 'qweather':
        api_key = config.get('qweather_key', '')
        if api_key:
            try:
                return _get_weather_qweather(city, api_key)
            except Exception as e:
                errors.append(f'和风天气: {e}')
        else:
            errors.append('和风天气API密钥未配置')

    try:
        return _get_weather_wttr(city)
    except Exception as e:
        errors.append(f'wttr.in(备用): {e}')

    for err in errors:
        print(f'  ✗ {err}')
    return None


def log_weather(city):
    weather_data = get_weather(city)
    if not weather_data:
        print(f'获取 {city} 天气数据失败')
        return None

    log_file = get_log_filename(city)
    file_exists = os.path.exists(log_file)

    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['timestamp', 'temperature', 'humidity', 'condition'])
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            'timestamp': weather_data['timestamp'],
            'temperature': weather_data['temperature'],
            'humidity': weather_data['humidity'],
            'condition': weather_data['condition']
        })

    print(f'✓ 已记录 {city}: {weather_data["temperature"]}°C, 湿度{weather_data["humidity"]}%, {weather_data["condition"]}')
    return weather_data


def read_logs(city):
    log_file = get_log_filename(city)
    if not os.path.exists(log_file):
        return []

    logs = []
    with open(log_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row['temperature'] = float(row['temperature'])
                row['humidity'] = int(row['humidity'])
            except (ValueError, KeyError):
                continue
            logs.append(row)
    return logs


def check_temp_change(city, current_temp):
    logs = read_logs(city)
    if len(logs) < 2:
        return

    config = get_config()
    threshold = config.get('temp_change_threshold', 5)

    one_hour_ago = datetime.now() - timedelta(hours=1)
    for log in reversed(logs[:-1]):
        try:
            log_time = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
        if log_time <= one_hour_ago:
            old_temp = log['temperature']
            diff = abs(current_temp - old_temp)
            if diff > threshold:
                direction = '升高' if current_temp > old_temp else '降低'
                print(f'\n{"=" * 50}')
                print(f'⚠️  温度突变提醒 ({city})!')
                print(f'   一小时前: {old_temp}°C')
                print(f'   当前: {current_temp}°C')
                print(f'   1小时内{direction} {diff:.1f}°C (阈值: {threshold}°C)')
                print(f'{"=" * 50}\n')
            break


def record_all_cities():
    config = get_config()
    if not config['cities']:
        print('未配置任何城市，请先使用 add 命令添加')
        return

    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'\n[{timestamp}] 开始记录天气数据...')
    for city in config['cities']:
        weather = log_weather(city)
        if weather:
            check_temp_change(city, weather['temperature'])


def draw_ascii_chart(city, hours=24):
    logs = read_logs(city)
    if not logs:
        print(f'{city} 暂无天气数据')
        return

    now = datetime.now()
    time_threshold = now - timedelta(hours=hours)

    recent_logs = []
    for log in logs:
        try:
            log_time = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
        if log_time >= time_threshold:
            recent_logs.append(log)

    if not recent_logs:
        print(f'{city} 最近{hours}小时无数据')
        return

    temps = [log['temperature'] for log in recent_logs]
    min_temp = min(temps)
    max_temp = max(temps)
    temp_range = max_temp - min_temp if max_temp != min_temp else 1

    height = 15
    width = min(len(recent_logs), 60)

    print(f'\n{city} 最近{hours}小时温度变化')
    print(f'最高: {max_temp}°C | 最低: {min_temp}°C\n')

    for i in range(height):
        current_temp_level = max_temp - (i * temp_range / (height - 1))
        line = f'{current_temp_level:5.1f}°C |'
        for j in range(width):
            idx = int(j * len(recent_logs) / width)
            log_temp = recent_logs[idx]['temperature']
            if abs(log_temp - current_temp_level) < (temp_range / (height - 1)) / 2:
                line += '█'
            elif log_temp > current_temp_level:
                line += '█'
            else:
                line += ' '
        print(line)

    print('       +' + '-' * width)
    time_labels = '        '
    step = max(1, width // 6)
    for j in range(0, width, step):
        idx = int(j * len(recent_logs) / width)
        try:
            time_str = datetime.strptime(recent_logs[idx]['timestamp'], '%Y-%m-%d %H:%M:%S').strftime('%H:%M')
        except ValueError:
            time_str = '??:??'
        time_labels += time_str + ' ' * (step - 5)
    print(time_labels)
    print()


def analyze_month(city):
    logs = read_logs(city)
    if not logs:
        print(f'{city} 暂无天气数据')
        return

    now = datetime.now()
    current_month = now.month
    current_year = now.year

    month_logs = []
    for log in logs:
        try:
            log_time = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
        if log_time.month == current_month and log_time.year == current_year:
            month_logs.append(log)

    if not month_logs:
        print(f'{city} 本月暂无数据')
        return

    temps = [log['temperature'] for log in month_logs]
    avg_temp = sum(temps) / len(temps)
    max_temp = max(temps)
    min_temp = min(temps)

    rainy_days = set()
    rain_keywords = ['雨', '阵雨', '小雨', '中雨', '大雨', '暴雨', '雷阵雨', '雷暴',
                     '毛毛雨', 'rain', 'drizzle', 'thunderstorm', 'shower']
    for log in month_logs:
        condition = log.get('condition', '')
        if any(keyword.lower() in condition.lower() for keyword in rain_keywords):
            try:
                day = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S').date()
            except ValueError:
                continue
            rainy_days.add(day)

    days_set = set()
    for log in month_logs:
        try:
            day = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S').date()
        except ValueError:
            continue
        days_set.add(day)

    print(f'\n📊 {city} 本月天气统计')
    print(f'{"=" * 40}')
    print(f'统计天数: {len(days_set)} 天')
    print(f'平均温度: {avg_temp:.1f}°C')
    print(f'最高温度: {max_temp:.1f}°C')
    print(f'最低温度: {min_temp:.1f}°C')
    print(f'降雨天数: {len(rainy_days)} 天')
    print(f'{"=" * 40}\n')


def predict_trend(city, hours=3):
    logs = read_logs(city)
    if len(logs) < 3:
        print(f'{city} 数据不足，无法预测')
        return

    recent = logs[-6:] if len(logs) >= 6 else logs
    temps = [log['temperature'] for log in recent]

    recent_temps = temps[-3:] if len(temps) >= 3 else temps
    older_temps = temps[:3] if len(temps) >= 3 else temps[:1]

    recent_avg = sum(recent_temps) / len(recent_temps)
    older_avg = sum(older_temps) / len(older_temps)

    trend = recent_avg - older_avg
    current_temp = temps[-1]

    print(f'\n🔮 {city} 未来{hours}小时天气趋势预测')
    print(f'{"=" * 40}')
    print(f'当前温度: {current_temp:.1f}°C')

    if trend > 1:
        direction = '上升 ⬆️'
        pred_temp = current_temp + trend * 0.5
    elif trend < -1:
        direction = '下降 ⬇️'
        pred_temp = current_temp + trend * 0.5
    else:
        direction = '基本稳定 ➡️'
        pred_temp = current_temp

    print(f'温度趋势: {direction}')
    print(f'预测{hours}小时后温度: {pred_temp:.1f}°C')

    if len(recent) >= 2:
        humidity_diff = recent[-1]['humidity'] - recent[-2]['humidity']
        if humidity_diff > 10:
            print(f'其他提示: 湿度上升(+{humidity_diff}%)，可能有降雨')
        elif humidity_diff < -10:
            print(f'其他提示: 湿度下降({humidity_diff}%)，天气转晴')

    print(f'{"=" * 40}\n')


def export_to_json(city, output_file=None):
    logs = read_logs(city)
    if not logs:
        print(f'{city} 暂无天气数据')
        return

    if not output_file:
        safe_city = city.replace('/', '_').replace(' ', '_')
        output_file = f'{safe_city}_weather.json'

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'city': city,
            'export_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'record_count': len(logs),
            'records': logs
        }, f, indent=2, ensure_ascii=False)

    print(f'数据已导出到: {output_file}')


def generate_monthly_summary(city):
    logs = read_logs(city)
    if not logs:
        return None

    now = datetime.now()
    current_month = now.month
    current_year = now.year

    month_logs = []
    for log in logs:
        try:
            log_time = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
        if log_time.month == current_month and log_time.year == current_year:
            month_logs.append(log)

    if not month_logs:
        return None

    temps = [log['temperature'] for log in month_logs]
    avg_temp = sum(temps) / len(temps)
    max_temp = max(temps)
    min_temp = min(temps)

    rainy_days = set()
    rain_keywords = ['雨', '阵雨', '小雨', '中雨', '大雨', '暴雨', '雷阵雨', '雷暴',
                     '毛毛雨', 'rain', 'drizzle', 'thunderstorm', 'shower']
    for log in month_logs:
        condition = log.get('condition', '')
        if any(keyword.lower() in condition.lower() for keyword in rain_keywords):
            try:
                day = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S').date()
            except ValueError:
                continue
            rainy_days.add(day)

    days_set = set()
    for log in month_logs:
        try:
            day = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S').date()
        except ValueError:
            continue
        days_set.add(day)

    summary = f"""
{city} 月度天气摘要
{'=' * 50}
月份: {current_year}年{current_month}月

🌡️  温度统计:
   - 平均温度: {avg_temp:.1f}°C
   - 最高温度: {max_temp:.1f}°C
   - 最低温度: {min_temp:.1f}°C

🌧️  降水统计:
   - 降雨天数: {len(rainy_days)} 天

📊  数据概览:
   - 总记录数: {len(month_logs)} 条
   - 统计天数: {len(days_set)} 天

{'=' * 50}
生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    return summary


def send_email(subject, body):
    config = get_config()
    smtp_config = config.get('smtp', {})

    if not smtp_config.get('enabled', False):
        print('SMTP未启用，请先使用 config-smtp 命令配置')
        return False

    server = smtp_config.get('server', '').strip()
    port = smtp_config.get('port', 587)
    username = smtp_config.get('username', '').strip()
    password = smtp_config.get('password', '').strip()
    from_email = smtp_config.get('from_email', '').strip()
    to_email = smtp_config.get('to_email', '').strip()
    use_ssl = smtp_config.get('use_ssl', False)

    if not all([server, username, password, from_email, to_email]):
        print('SMTP配置不完整，请检查: server, username, password, from_email, to_email')
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        if use_ssl:
            context = ssl.create_default_context()
            smtp_server = smtplib.SMTP_SSL(server, port, context=context)
        else:
            smtp_server = smtplib.SMTP(server, port)
            context = ssl.create_default_context()
            smtp_server.starttls(context=context)

        smtp_server.login(username, password)
        smtp_server.sendmail(from_email, to_email, msg.as_string())
        smtp_server.quit()

        print('✓ 邮件发送成功')
        return True
    except smtplib.SMTPAuthenticationError:
        print('✗ SMTP认证失败，请检查用户名和密码')
        return False
    except smtplib.SMTPConnectError:
        print('✗ SMTP连接失败，请检查服务器地址和端口')
        return False
    except smtplib.SMTPRecipientsRefused:
        print('✗ 收件人地址被拒绝，请检查收件人邮箱')
        return False
    except Exception as e:
        print(f'✗ 邮件发送失败: {e}')
        return False


def test_smtp(config=None):
    if config is None:
        config = get_config()
    smtp_config = config.get('smtp', {})

    server = smtp_config.get('server', '').strip()
    port = smtp_config.get('port', 587)
    username = smtp_config.get('username', '').strip()
    password = smtp_config.get('password', '').strip()
    use_ssl = smtp_config.get('use_ssl', False)

    if not server or not username or not password:
        print('SMTP配置不完整，请先使用 config-smtp 命令配置')
        return False

    try:
        print(f'正在连接 {server}:{port} ...')
        if use_ssl:
            context = ssl.create_default_context()
            smtp_server = smtplib.SMTP_SSL(server, port, context=context, timeout=10)
        else:
            smtp_server = smtplib.SMTP(server, port, timeout=10)
            context = ssl.create_default_context()
            smtp_server.starttls(context=context)

        print('正在验证账号...')
        smtp_server.login(username, password)
        smtp_server.quit()
        print('✓ SMTP连接和认证测试成功')
        return True
    except smtplib.SMTPAuthenticationError:
        print('✗ SMTP认证失败，请检查用户名和密码')
        return False
    except smtplib.SMTPConnectError:
        print('✗ SMTP连接失败，请检查服务器地址和端口')
        return False
    except Exception as e:
        print(f'✗ SMTP测试失败: {e}')
        return False


def generate_html_calendar(city, output_file=None):
    logs = read_logs(city)
    if not logs:
        print(f'{city} 暂无天气数据')
        return

    if not output_file:
        safe_city = city.replace('/', '_').replace(' ', '_')
        output_file = f'{safe_city}_weather_calendar.html'

    daily_temps = defaultdict(list)
    daily_conditions = defaultdict(list)
    for log in logs:
        day = log['timestamp'].split(' ')[0]
        daily_temps[day].append(log['temperature'])
        daily_conditions[day].append(log.get('condition', ''))

    daily_avg = {}
    daily_mode_condition = {}
    for day, temps in daily_temps.items():
        daily_avg[day] = sum(temps) / len(temps)
        conditions = daily_conditions[day]
        if conditions:
            daily_mode_condition[day] = max(set(conditions), key=conditions.count)

    if not daily_avg:
        print(f'{city} 无有效数据')
        return

    all_temps = list(daily_avg.values())
    min_temp = min(all_temps)
    max_temp = max(all_temps)

    def get_temp_color(temp):
        if max_temp == min_temp:
            normalized = 0.5
        else:
            normalized = (temp - min_temp) / (max_temp - min_temp)
        if normalized < 0.5:
            r = int(normalized * 2 * 100 + 50)
            g = int(normalized * 2 * 150 + 80)
            b = int((1 - normalized * 2) * 200 + 55)
        else:
            n2 = (normalized - 0.5) * 2
            r = int(n2 * 200 + 180)
            g = int((1 - n2) * 150 + 80)
            b = int(55)
        r = max(0, min(255, r))
        g = max(0, min(255, g))
        b = max(0, min(255, b))
        return f'rgb({r}, {g}, {b})'

    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{city} 天气日历</title>
    <style>
        body {{ font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        h1 {{ text-align: center; color: #333; }}
        .calendar {{ display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; max-width: 800px; margin: 0 auto; }}
        .day-header {{ background: #333; color: white; padding: 10px; text-align: center; font-weight: bold; border-radius: 4px; }}
        .day {{ padding: 12px; text-align: center; min-height: 70px; display: flex; flex-direction: column; justify-content: center; color: white; font-weight: bold; border-radius: 5px; font-size: 13px; }}
        .day .temp {{ font-size: 16px; margin-top: 2px; }}
        .day .cond {{ font-size: 11px; margin-top: 2px; opacity: 0.9; }}
        .empty {{ background: #e0e0e0; min-height: 40px; }}
        .legend {{ display: flex; justify-content: center; gap: 20px; margin-top: 20px; flex-wrap: wrap; }}
        .legend-item {{ display: flex; align-items: center; gap: 5px; }}
        .legend-color {{ width: 20px; height: 20px; border-radius: 3px; }}
        .info {{ text-align: center; margin-top: 20px; color: #666; }}
    </style>
</head>
<body>
    <h1>🌡️ {city} 天气日历</h1>
    <div class="calendar">
        <div class="day-header">周一</div>
        <div class="day-header">周二</div>
        <div class="day-header">周三</div>
        <div class="day-header">周四</div>
        <div class="day-header">周五</div>
        <div class="day-header">周六</div>
        <div class="day-header">周日</div>
"""

    sorted_days = sorted(daily_avg.keys())
    if sorted_days:
        first_day = datetime.strptime(sorted_days[0], '%Y-%m-%d')
        start_weekday = first_day.weekday()

        for _ in range(start_weekday):
            html_content += '        <div class="day empty"></div>\n'

        for day in sorted_days:
            avg_temp = daily_avg[day]
            color = get_temp_color(avg_temp)
            day_date = datetime.strptime(day, '%Y-%m-%d').day
            condition = daily_mode_condition.get(day, '')
            html_content += f'        <div class="day" style="background-color: {color};">{day_date}<span class="temp">{avg_temp:.1f}°C</span><span class="cond">{condition}</span></div>\n'

    html_content += f"""
    </div>
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color" style="background-color: {get_temp_color(min_temp)};"></div>
            <span>最低 {min_temp:.1f}°C</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: {get_temp_color((min_temp + max_temp) / 2)};"></div>
            <span>平均 {(min_temp + max_temp) / 2:.1f}°C</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: {get_temp_color(max_temp)};"></div>
            <span>最高 {max_temp:.1f}°C</span>
        </div>
    </div>
    <div class="info">
        <p>数据记录: {len(logs)} 条 | 统计天数: {len(daily_avg)} 天</p>
        <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
</body>
</html>"""

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f'✓ HTML天气日历已生成: {output_file}')


def query_by_date_range(city, start_date, end_date):
    logs = read_logs(city)
    if not logs:
        print(f'{city} 暂无天气数据')
        return

    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    except ValueError:
        print('日期格式错误，请使用 YYYY-MM-DD 格式')
        return

    range_logs = []
    for log in logs:
        try:
            log_time = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
        if start <= log_time <= end:
            range_logs.append(log)

    if not range_logs:
        print(f'{city} 在 {start_date} 至 {end_date} 期间无数据')
        return

    temps = [log['temperature'] for log in range_logs]
    humidities = [log['humidity'] for log in range_logs]

    print(f'\n📋 {city} 历史天气查询结果')
    print(f'{"=" * 50}')
    print(f'时间范围: {start_date} 至 {end_date}')
    print(f'记录条数: {len(range_logs)}')
    print(f'{"-" * 50}')
    print(f'🌡️  温度统计:')
    print(f'   平均温度: {sum(temps) / len(temps):.1f}°C')
    print(f'   最高温度: {max(temps):.1f}°C')
    print(f'   最低温度: {min(temps):.1f}°C')
    print(f'💧 湿度统计:')
    print(f'   平均湿度: {sum(humidities) / len(humidities):.1f}%')
    print(f'   最高湿度: {max(humidities)}%')
    print(f'   最低湿度: {min(humidities)}%')
    print(f'{"=" * 50}\n')


def add_city(city):
    config = get_config()
    if city not in config['cities']:
        config['cities'].append(city)
        save_config(config)
        print(f'✓ 已添加城市: {city}')
    else:
        print(f'城市 {city} 已存在')


def remove_city(city):
    config = get_config()
    if city in config['cities']:
        config['cities'].remove(city)
        save_config(config)
        print(f'✓ 已移除城市: {city}')
    else:
        print(f'城市 {city} 不存在')


def list_cities():
    config = get_config()
    provider = config.get('api_provider', 'openweathermap')
    has_key = bool(config.get('api_key') or config.get('qweather_key'))

    print(f'\n当前API提供商: {provider}')
    print(f'API密钥: {"已配置 ✓" if has_key else "未配置 ✗"}')
    print()

    if config['cities']:
        print('已配置的城市:')
        for i, city in enumerate(config['cities'], 1):
            log_file = get_log_filename(city)
            log_count = 0
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    log_count = sum(1 for _ in csv.DictReader(f))
            print(f'  {i}. {city} (记录数: {log_count})')
    else:
        print('暂无配置的城市，请使用 add 命令添加')
    print()


def config_api_interactive(provider=None, api_key=None):
    config = get_config()

    if provider and api_key:
        config['api_provider'] = provider
        if provider == 'openweathermap':
            config['api_key'] = api_key
        elif provider == 'qweather':
            config['qweather_key'] = api_key
        save_config(config)
        print(f'✓ API配置已保存 (提供商: {provider})')
        return

    print('\n--- API密钥配置 ---')
    print('支持的天API提供商:')
    print('  1. openweathermap - OpenWeatherMap (免费层: 60次/分钟)')
    print('  2. qweather       - 和风天气 (免费层: 1000次/天)')
    print()

    if not provider:
        provider = input('请选择API提供商 [openweathermap/qweather]: ').strip().lower()
        if provider not in ('openweathermap', 'qweather'):
            print('✗ 无效的提供商')
            return

    if provider == 'openweathermap':
        print('获取API密钥: https://openweathermap.org/api')
        key = input('请输入OpenWeatherMap API密钥: ').strip()
        if not key:
            print('✗ 密钥不能为空')
            return
        config['api_provider'] = 'openweathermap'
        config['api_key'] = key
    elif provider == 'qweather':
        print('获取API密钥: https://dev.qweather.com/')
        key = input('请输入和风天气API密钥: ').strip()
        if not key:
            print('✗ 密钥不能为空')
            return
        config['api_provider'] = 'qweather'
        config['qweather_key'] = key

    save_config(config)
    print(f'✓ API配置已保存 (提供商: {provider})')

    print('\n正在测试API连接...')
    test_city = config['cities'][0] if config['cities'] else 'London'
    weather = get_weather(test_city)
    if weather:
        print(f'✓ API测试成功: {test_city} 当前温度 {weather["temperature"]}°C, {weather["condition"]}')
    else:
        print('✗ API测试失败，请检查密钥是否正确')


def config_smtp_interactive():
    config = get_config()
    smtp = config.get('smtp', {})

    print('\n--- SMTP邮件配置 ---')
    print('常见SMTP服务器:')
    print('  QQ邮箱:     smtp.qq.com    端口465(SSL) / 587(TLS)')
    print('  163邮箱:    smtp.163.com   端口465(SSL) / 25(TLS)')
    print('  Gmail:      smtp.gmail.com 端口465(SSL) / 587(TLS)')
    print('  Outlook:    smtp.office365.com 端口587(TLS)')
    print()

    server = input(f'SMTP服务器 [{smtp.get("server", "")}]: ').strip()
    if server:
        smtp['server'] = server

    port_str = input(f'SMTP端口 [{smtp.get("port", 587)}]: ').strip()
    if port_str:
        try:
            smtp['port'] = int(port_str)
        except ValueError:
            print('端口格式错误，使用默认值587')
            smtp['port'] = 587

    use_ssl_input = input('使用SSL连接? (QQ/163推荐SSL) [y/N]: ').strip().lower()
    smtp['use_ssl'] = use_ssl_input == 'y'

    username = input(f'用户名/邮箱 [{smtp.get("username", "")}]: ').strip()
    if username:
        smtp['username'] = username

    password = input(f'授权码/密码 [{"*" * len(smtp.get("password", ""))}]: ').strip()
    if password:
        smtp['password'] = password

    from_email = input(f'发件人邮箱 [{smtp.get("from_email", "")}]: ').strip()
    if from_email:
        smtp['from_email'] = from_email
    elif not from_email and smtp.get('username'):
        smtp['from_email'] = smtp['username']

    to_email = input(f'收件人邮箱 [{smtp.get("to_email", "")}]: ').strip()
    if to_email:
        smtp['to_email'] = to_email

    smtp['enabled'] = True
    config['smtp'] = smtp
    save_config(config)
    print('✓ SMTP配置已保存')

    print('\n正在测试SMTP连接...')
    test_smtp(config)


def start_monitoring():
    config = get_config()
    if not config['cities']:
        print('请先配置城市 (使用 add 命令)')
        return

    provider = config.get('api_provider', 'openweathermap')
    has_key = bool(config.get('api_key') or config.get('qweather_key'))
    if not has_key:
        print('警告: API密钥未配置，将使用wttr.in备用接口(可能不稳定)')
        print('建议使用 config-api 命令配置API密钥\n')

    monitor_stop = threading.Event()

    def signal_handler(signum, frame):
        print('\n正在停止监控...')
        monitor_stop.set()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print(f'开始天气监控')
    print(f'城市: {", ".join(config["cities"])}')
    print(f'API: {provider}')
    print(f'记录间隔: 每小时')
    print(f'温度突变阈值: {config.get("temp_change_threshold", 5)}°C')
    print('按 Ctrl+C 停止\n')

    record_all_cities()

    next_record = datetime.now() + timedelta(hours=1)
    print(f'下次记录时间: {next_record.strftime("%Y-%m-%d %H:%M:%S")}\n')

    while not monitor_stop.is_set():
        now = datetime.now()
        if now >= next_record:
            try:
                record_all_cities()
            except Exception as e:
                print(f'✗ 记录失败: {e}')
            next_record = now + timedelta(hours=1)
            print(f'下次记录时间: {next_record.strftime("%Y-%m-%d %H:%M:%S")}\n')

        remaining = (next_record - now).total_seconds()
        sleep_time = min(30, max(1, remaining))
        monitor_stop.wait(sleep_time)

    print('监控已停止')


def show_config():
    config = get_config()
    print('\n当前配置:')
    print(f'{"=" * 50}')
    print(f'API提供商: {config.get("api_provider", "openweathermap")}')
    print(f'OpenWeatherMap密钥: {"已配置" if config.get("api_key") else "未配置"}')
    print(f'和风天气密钥: {"已配置" if config.get("qweather_key") else "未配置"}')
    print(f'温度突变阈值: {config.get("temp_change_threshold", 5)}°C')
    print(f'城市列表: {", ".join(config["cities"]) if config["cities"] else "无"}')

    smtp = config.get('smtp', {})
    print(f'\nSMTP配置:')
    print(f'  启用: {"是" if smtp.get("enabled") else "否"}')
    print(f'  服务器: {smtp.get("server", "未配置")}:{smtp.get("port", 587)}')
    print(f'  SSL: {"是" if smtp.get("use_ssl") else "否"}')
    print(f'  用户名: {smtp.get("username", "未配置")}')
    print(f'  发件人: {smtp.get("from_email", "未配置")}')
    print(f'  收件人: {smtp.get("to_email", "未配置")}')
    print(f'{"=" * 50}\n')


def main():
    parser = argparse.ArgumentParser(
        description='天气日志记录与分析工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s config-api --provider openweathermap --key YOUR_KEY
  %(prog)s add beijing
  %(prog)s record
  %(prog)s monitor
  %(prog)s chart beijing
  %(prog)s analyze beijing
  %(prog)s predict beijing
  %(prog)s export beijing
  %(prog)s summary beijing --email
  %(prog)s calendar beijing
  %(prog)s query beijing 2026-05-01 2026-05-31
"""
    )
    subparsers = parser.add_subparsers(dest='command', help='命令')

    subparsers.add_parser('list', help='列出已配置的城市和配置状态')
    subparsers.add_parser('show-config', help='显示当前配置')

    add_parser = subparsers.add_parser('add', help='添加城市')
    add_parser.add_argument('city', help='城市名称(英文，如Beijing)')

    remove_parser = subparsers.add_parser('remove', help='移除城市')
    remove_parser.add_argument('city', help='城市名称')

    subparsers.add_parser('record', help='手动记录所有城市当前天气')

    subparsers.add_parser('monitor', help='启动每小时自动监控')

    config_api_parser = subparsers.add_parser('config-api', help='配置天气API密钥')
    config_api_parser.add_argument('--provider', choices=['openweathermap', 'qweather'], help='API提供商')
    config_api_parser.add_argument('--key', help='API密钥')

    subparsers.add_parser('config-smtp', help='配置SMTP邮件(交互式)')

    subparsers.add_parser('test-smtp', help='测试SMTP连接')

    threshold_parser = subparsers.add_parser('set-threshold', help='设置温度突变提醒阈值')
    threshold_parser.add_argument('value', type=float, help='阈值(°C)')

    chart_parser = subparsers.add_parser('chart', help='显示温度曲线图')
    chart_parser.add_argument('city', help='城市名称')
    chart_parser.add_argument('--hours', type=int, default=24, help='小时数(默认24)')

    analyze_parser = subparsers.add_parser('analyze', help='分析本月天气')
    analyze_parser.add_argument('city', help='城市名称')

    predict_parser = subparsers.add_parser('predict', help='预测天气趋势')
    predict_parser.add_argument('city', help='城市名称')

    export_parser = subparsers.add_parser('export', help='导出数据为JSON')
    export_parser.add_argument('city', help='城市名称')
    export_parser.add_argument('--output', help='输出文件名')

    summary_parser = subparsers.add_parser('summary', help='生成月度摘要')
    summary_parser.add_argument('city', help='城市名称')
    summary_parser.add_argument('--email', action='store_true', help='发送到邮箱')

    calendar_parser = subparsers.add_parser('calendar', help='生成HTML天气日历')
    calendar_parser.add_argument('city', help='城市名称')
    calendar_parser.add_argument('--output', help='输出文件名')

    query_parser = subparsers.add_parser('query', help='按日期范围查询')
    query_parser.add_argument('city', help='城市名称')
    query_parser.add_argument('start_date', help='开始日期 (YYYY-MM-DD)')
    query_parser.add_argument('end_date', help='结束日期 (YYYY-MM-DD)')

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return

    if args.command == 'list':
        list_cities()
    elif args.command == 'show-config':
        show_config()
    elif args.command == 'add':
        add_city(args.city)
    elif args.command == 'remove':
        remove_city(args.city)
    elif args.command == 'record':
        record_all_cities()
    elif args.command == 'monitor':
        start_monitoring()
    elif args.command == 'config-api':
        config_api_interactive(args.provider, args.key)
    elif args.command == 'config-smtp':
        config_smtp_interactive()
    elif args.command == 'test-smtp':
        test_smtp()
    elif args.command == 'set-threshold':
        config = get_config()
        config['temp_change_threshold'] = args.value
        save_config(config)
        print(f'✓ 温度突变阈值已设置为 {args.value}°C')
    elif args.command == 'chart':
        draw_ascii_chart(args.city, args.hours)
    elif args.command == 'analyze':
        analyze_month(args.city)
    elif args.command == 'predict':
        predict_trend(args.city)
    elif args.command == 'export':
        export_to_json(args.city, args.output)
    elif args.command == 'summary':
        summary = generate_monthly_summary(args.city)
        if summary:
            print(summary)
            if args.email:
                send_email(f'{args.city} 月度天气摘要', summary)
    elif args.command == 'calendar':
        generate_html_calendar(args.city, args.output)
    elif args.command == 'query':
        query_by_date_range(args.city, args.start_date, args.end_date)


if __name__ == '__main__':
    main()
