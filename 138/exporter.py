import os
import json
import csv
from datetime import datetime
from config import OUTPUT_DIR
from jinja2 import Template


class DataExporter:
    def __init__(self):
        self._ensure_output_dir()
    
    def _ensure_output_dir(self):
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    def export_json(self, data, filename=None):
        if filename is None:
            filename = f"weather_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def export_csv(self, daily_data, filename=None):
        if filename is None:
            filename = f"weather_daily_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if not daily_data:
            return None
        
        fieldnames = ['date', 'temp_max', 'temp_min', 'temp_mean', 'precipitation', 'humidity']
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(daily_data)
        
        return filepath
    
    def export_comparison_csv(self, cities_data, filename=None):
        if filename is None:
            filename = f"cities_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if not cities_data:
            return None
        
        fieldnames = ['city', 'avg_temperature', 'max_temperature', 'min_temperature', 
                     'avg_humidity', 'precipitation_days', 'total_precipitation']
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(cities_data)
        
        return filepath
    
    def export_html_report(self, analysis_data, filename=None):
        if filename is None:
            filename = f"weather_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        html_template = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>天气分析报告 - {{ city }}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
        .stat-card .value { font-size: 28px; font-weight: bold; color: #333; }
        .stat-card .unit { font-size: 16px; color: #999; }
        .chart-container { background: white; padding: 20px; border-radius: 10px; 
                           box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .chart-container h2 { margin-bottom: 20px; color: #333; font-size: 20px; }
        .comfort-box { background: {% if comfort %}
                            {% if '舒适' in comfort.comfort_level %}#d4edda{% elif '凉爽' in comfort.comfort_level %}#d1ecf1{% elif '炎热' in comfort.comfort_level %}#fff3cd{% else %}#f8d7da{% endif %}
                        {% else %}#f8f9fa{% endif %}; 
                        padding: 20px; border-radius: 10px; margin-bottom: 30px; }
        .comfort-box h3 { margin-bottom: 10px; }
        .comfort-box .suggestion { font-size: 16px; line-height: 1.6; }
        .comparison-table { background: white; padding: 20px; border-radius: 10px; 
                             box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .comparison-table h2 { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f5f5f5; }
        .wind-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .wind-item { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .wind-item .dir { font-size: 18px; font-weight: bold; }
        .wind-item .pct { color: #666; }
        .footer { text-align: center; color: #999; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌤️ 天气趋势分析报告</h1>
            <p>城市: {{ city }} | 时间范围: {{ start_date }} ~ {{ end_date }}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>平均温度</h3>
                <div class="value">{{ stats.avg_temperature|default('N/A') }}<span class="unit">℃</span></div>
            </div>
            <div class="stat-card">
                <h3>最高温度</h3>
                <div class="value">{{ stats.max_temperature|default('N/A') }}<span class="unit">℃</span></div>
            </div>
            <div class="stat-card">
                <h3>最低温度</h3>
                <div class="value">{{ stats.min_temperature|default('N/A') }}<span class="unit">℃</span></div>
            </div>
            <div class="stat-card">
                <h3>降水天数</h3>
                <div class="value">{{ stats.precipitation_days|default('N/A') }}<span class="unit">天</span></div>
            </div>
            <div class="stat-card">
                <h3>总降水量</h3>
                <div class="value">{{ stats.total_precipitation|default('N/A') }}<span class="unit">mm</span></div>
            </div>
            <div class="stat-card">
                <h3>平均湿度</h3>
                <div class="value">{{ stats.avg_humidity|default('N/A') }}<span class="unit">%</span></div>
            </div>
        </div>

        {% if comfort %}
        <div class="comfort-box">
            <h3>😊 舒适度指数: {{ comfort.comfort_level }}</h3>
            <p class="suggestion">{{ comfort.suggestion }}</p>
            <p style="margin-top: 10px; font-size: 14px;">
                平均温度: {{ comfort.avg_temperature }}℃ | 平均湿度: {{ comfort.avg_humidity }}%
            </p>
        </div>
        {% endif %}

        {% if comparison %}
        <div class="comparison-table">
            <h2>📊 与去年同期对比</h2>
            <table>
                <tr><th>项目</th><th>本期</th><th>去年同期</th><th>变化</th></tr>
                <tr><td>平均温度</td><td>{{ stats.avg_temperature }}℃</td><td>{{ comparison.avg_temperature_last_year }}℃</td>
                    <td>{% if comparison.avg_temperature_diff > 0 %}↑{% elif comparison.avg_temperature_diff < 0 %}↓{% else %}→{% endif %} 
                        {{ comparison.avg_temperature_diff }}℃ ({{ comparison.avg_temperature_trend }})</td></tr>
                <tr><td>总降水量</td><td>{{ stats.total_precipitation }}mm</td><td>{{ comparison.precipitation_last_year }}mm</td>
                    <td>{% if comparison.precipitation_diff > 0 %}↑{% elif comparison.precipitation_diff < 0 %}↓{% else %}→{% endif %} 
                        {{ comparison.precipitation_diff }}mm ({{ comparison.precipitation_trend }})</td></tr>
            </table>
        </div>
        {% endif %}

        <div class="chart-container">
            <h2>🌡️ 温度趋势图</h2>
            <canvas id="tempChart"></canvas>
        </div>

        <div class="chart-container">
            <h2>🌧️ 降水量分布</h2>
            <canvas id="precipChart"></canvas>
        </div>

        {% if wind_frequency %}
        <div class="chart-container">
            <h2>💨 风向频率</h2>
            <div class="wind-grid">
                {% for dir, data in wind_frequency.items() %}
                <div class="wind-item">
                    <div class="dir">{{ dir }}</div>
                    <div class="pct">{{ data.percentage }}%</div>
                </div>
                {% endfor %}
            </div>
        </div>
        {% endif %}

        {% if monthly %}
        <div class="chart-container">
            <h2>📅 月度统计</h2>
            <table>
                <tr><th>月份</th><th>季节</th><th>平均最高温</th><th>平均最低温</th><th>总降水量</th><th>降水天数</th></tr>
                {% for m in monthly %}
                <tr>
                    <td>{{ m.month_name }}</td>
                    <td>{{ m.season }}</td>
                    <td>{{ m.avg_max_temp }}℃</td>
                    <td>{{ m.avg_min_temp }}℃</td>
                    <td>{{ m.total_precipitation }}mm</td>
                    <td>{{ m.rainy_days }}天</td>
                </tr>
                {% endfor %}
            </table>
        </div>
        {% endif %}

        <div class="footer">
            <p>报告生成时间: {{ generate_time }}</p>
            <p>数据来源: Open-Meteo API</p>
        </div>
    </div>

    <script>
        const dailyData = {{ daily_data|tojson|safe }};
        
        const tempCtx = document.getElementById('tempChart').getContext('2d');
        new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(d => d.date ? d.date.slice(5) : ''),
                datasets: [
                    {
                        label: '最高温(℃)',
                        data: dailyData.map(d => d.temp_max),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: '最低温(℃)',
                        data: dailyData.map(d => d.temp_min),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: false } }
            }
        });

        const precipCtx = document.getElementById('precipChart').getContext('2d');
        new Chart(precipCtx, {
            type: 'bar',
            data: {
                labels: dailyData.map(d => d.date ? d.date.slice(5) : ''),
                datasets: [{
                    label: '降水量(mm)',
                    data: dailyData.map(d => d.precipitation),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: '#3498db',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    </script>
</body>
</html>
        """
        
        template = Template(html_template)
        
        html_content = template.render(
            city=analysis_data.get('city', '未知'),
            start_date=analysis_data.get('start_date'),
            end_date=analysis_data.get('end_date'),
            stats=analysis_data.get('stats', {}),
            comfort=analysis_data.get('comfort'),
            comparison=analysis_data.get('comparison'),
            wind_frequency=analysis_data.get('wind_frequency'),
            daily_data=analysis_data.get('daily_data', []),
            monthly=analysis_data.get('monthly'),
            generate_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return filepath
