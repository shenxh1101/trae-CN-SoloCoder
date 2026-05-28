#!/usr/bin/env python3
import argparse
import sys
from api_client import WeatherAPIClient
from analyzer import WeatherAnalyzer
from charts import ASCIICharts
from exporter import DataExporter
from config import CITIES_COORDINATES


class WeatherCLI:
    def __init__(self):
        self.api_client = WeatherAPIClient()
        self.exporter = DataExporter()
    
    def print_basic_stats(self, stats):
        print("\n" + "=" * 60)
        print(f"📊 {stats['city']} 天气统计报告")
        print("=" * 60)
        print(f"📅 统计周期: {stats['start_date']} ~ {stats['end_date']}")
        print(f"📆 统计天数: {stats['days']} 天")
        print("-" * 60)
        print(f"🌡️  平均温度: {stats.get('avg_temperature', 'N/A')}℃")
        print(f"🔥 最高温度: {stats.get('max_temperature', 'N/A')}℃ ({stats.get('max_temp_date', '')})")
        print(f"❄️  最低温度: {stats.get('min_temperature', 'N/A')}℃ ({stats.get('min_temp_date', '')})")
        print(f"💧 降水天数: {stats.get('precipitation_days', 'N/A')} 天")
        print(f"🌧️  总降水量: {stats.get('total_precipitation', 'N/A')} mm")
        print(f"💦 日均降水量: {stats.get('avg_precipitation_per_day', 'N/A')} mm")
        print(f"💨 平均湿度: {stats.get('avg_humidity', 'N/A')}%")
    
    def print_comparison(self, comparison):
        print("\n" + "=" * 60)
        print("📈 与去年同期对比")
        print("=" * 60)
        print(f"本期: {comparison['current_period']}")
        print(f"去年: {comparison['last_year_period']}")
        print("-" * 60)
        if 'avg_temperature_diff' in comparison:
            sign = '+' if comparison['avg_temperature_diff'] > 0 else ''
            print(f"🌡️  平均温度: {sign}{comparison['avg_temperature_diff']:+.1f}℃ ({comparison['avg_temperature_trend']})")
        if 'precipitation_diff' in comparison:
            sign = '+' if comparison['precipitation_diff'] > 0 else ''
            print(f"🌧️  总降水量: {sign}{comparison['precipitation_diff']:+.1f}mm ({comparison['precipitation_trend']})")
    
    def print_comfort_info(self, comfort):
        if not comfort:
            return
        print("\n" + "=" * 60)
        print("😊 舒适度指数")
        print("=" * 60)
        print(f"等级: {comfort['comfort_level']}")
        print(f"建议: {comfort['suggestion']}")
        print(f"平均温度: {comfort['avg_temperature']}℃")
        print(f"平均湿度: {comfort['avg_humidity']}%")
    
    def print_monthly_stats(self, monthly_data):
        if not monthly_data:
            return
        print("\n" + "=" * 80)
        print("📅 月度气候统计")
        print("=" * 80)
        print(f"{'月份':<8} {'季节':<6} {'平均最高':<10} {'平均最低':<10} {'总降水量':<12} {'降水天数':<8}")
        print("-" * 80)
        for m in monthly_data:
            print(f"{m['month_name']:<8} {m['season']:<6} "
                  f"{m['avg_max_temp'] if m['avg_max_temp'] else 'N/A':>7}℃   "
                  f"{m['avg_min_temp'] if m['avg_min_temp'] else 'N/A':>7}℃   "
                  f"{m['total_precipitation'] if m['total_precipitation'] else 'N/A':>8}mm   "
                  f"{m['rainy_days']:>6}天")
    
    def print_cities_comparison(self, cities_stats):
        if not cities_stats:
            return
        print("\n" + "=" * 90)
        print("🌍 多城市天气对比")
        print("=" * 90)
        print(f"{'城市':<10} {'平均温度':<12} {'最高温度':<12} {'最低温度':<12} {'平均湿度':<12} {'降水天数':<10} {'总降水量':<12}")
        print("-" * 90)
        for stats in cities_stats:
            print(f"{stats['city']:<10} "
                  f"{stats.get('avg_temperature', 'N/A'):>8}℃    "
                  f"{stats.get('max_temperature', 'N/A'):>8}℃    "
                  f"{stats.get('min_temperature', 'N/A'):>8}℃    "
                  f"{stats.get('avg_humidity', 'N/A'):>8}%    "
                  f"{stats.get('precipitation_days', 'N/A'):>6}天    "
                  f"{stats.get('total_precipitation', 'N/A'):>8}mm")
    
    def analyze_city(self, city, days=7, compare=False, forecast=False, sun_only=False, comfort_only=False):
        print(f"\n🔍 正在获取 {city} 的天气数据...")
        
        weather_data = self.api_client.get_historical_weather(city, days=days)
        analyzer = WeatherAnalyzer(weather_data)
        
        if sun_only:
            sunrise_sunset = analyzer.get_sunrise_sunset_data()
            print(ASCIICharts.draw_sunrise_sunset(sunrise_sunset))
            return {
                'city': city,
                'sunrise_sunset': sunrise_sunset,
            }
        
        if comfort_only:
            comfort = analyzer.calculate_comfort_index()
            self.print_comfort_info(comfort)
            return {
                'city': city,
                'comfort': comfort,
            }
        
        stats = analyzer.get_basic_stats()
        self.print_basic_stats(stats)
        
        daily_data = analyzer.get_daily_data()
        print(ASCIICharts.draw_temperature_trend(daily_data))
        
        precipitation_dist = analyzer.get_precipitation_distribution()
        print(ASCIICharts.draw_precipitation_bar(precipitation_dist))
        
        wind_freq = analyzer.get_wind_direction_frequency()
        print(ASCIICharts.draw_wind_direction(wind_freq))
        
        comfort = analyzer.calculate_comfort_index()
        self.print_comfort_info(comfort)
        
        sunrise_sunset = analyzer.get_sunrise_sunset_data()
        print(ASCIICharts.draw_sunrise_sunset(sunrise_sunset))
        
        if compare:
            try:
                ly_data = self.api_client.get_historical_weather_year_ago(city, days=days)
                comparison = analyzer.compare_with_last_year(ly_data)
                ly_analyzer = WeatherAnalyzer(ly_data)
                ly_stats = ly_analyzer.get_basic_stats()
                comparison['avg_temperature_last_year'] = ly_stats.get('avg_temperature')
                comparison['precipitation_last_year'] = ly_stats.get('total_precipitation')
                self.print_comparison(comparison)
            except Exception as e:
                print(f"\n⚠️  获取去年同期数据失败: {e}")
        
        if forecast:
            try:
                forecast_data = self.api_client.get_forecast_weather(city, days=3)
                forecast_analyzer = WeatherAnalyzer(forecast_data)
                forecast_daily = forecast_analyzer.get_daily_data()
                print(ASCIICharts.draw_forecast_comparison(forecast_daily, stats))
            except Exception as e:
                print(f"\n⚠️  获取预报数据失败: {e}")
        
        return {
            'city': city,
            'stats': stats,
            'daily_data': daily_data,
            'comfort': comfort,
            'wind_frequency': wind_freq,
            'precipitation_distribution': precipitation_dist,
            'start_date': weather_data.get('start_date'),
            'end_date': weather_data.get('end_date'),
        }
    
    def compare_cities(self, cities, days=7):
        cities_stats = []
        for city in cities:
            try:
                weather_data = self.api_client.get_historical_weather(city, days=days)
                analyzer = WeatherAnalyzer(weather_data)
                stats = analyzer.get_basic_stats()
                cities_stats.append(stats)
            except Exception as e:
                print(f"\n⚠️  获取 {city} 数据失败: {e}")
        
        self.print_cities_comparison(cities_stats)
        return cities_stats
    
    def analyze_monthly(self, city, year=None):
        print(f"\n🔍 正在获取 {city} 的年度数据...")
        monthly_data = self.api_client.get_monthly_stats(city, year=year)
        analyzer = WeatherAnalyzer(monthly_data)
        monthly_stats = analyzer.get_monthly_analysis()
        self.print_monthly_stats(monthly_stats)
        return monthly_stats
    
    def run(self):
        parser = argparse.ArgumentParser(
            description='🌤️  天气趋势分析工具 - 命令行天气数据分析工具',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  python weather_analyzer.py beijing -d 7                    # 分析北京近7天天气
  python weather_analyzer.py beijing -d 30 -c -f              # 分析北京近30天，对比去年，含预报
  python weather_analyzer.py beijing shanghai -d 7 --compare  # 多城市对比
  python weather_analyzer.py beijing --monthly 2024           # 分析北京2024年月度气候
  python weather_analyzer.py beijing -d 7 --export json csv html # 导出报告
  python weather_analyzer.py beijing -d 7 --sun-times         # 只显示日出日落时间
  python weather_analyzer.py beijing -d 7 --comfort           # 只显示舒适度指数
  python weather_analyzer.py --list-cities                    # 列出支持的城市
            """
        )
        
        parser.add_argument('cities', nargs='*', help='城市名称（拼音，如 beijing shanghai）')
        parser.add_argument('-d', '--days', type=int, default=7, choices=[7, 30, 90],
                            help='分析天数: 7, 30, 或 90 (默认: 7)')
        parser.add_argument('-c', '--year-compare', action='store_true',
                            help='与去年同期对比')
        parser.add_argument('-f', '--forecast', action='store_true',
                            help='显示未来3天天气预报')
        parser.add_argument('--compare', action='store_true',
                            help='多城市对比模式')
        parser.add_argument('--monthly', type=int, metavar='YEAR',
                            help='按月份统计分析（指定年份）')
        parser.add_argument('--export', nargs='+', choices=['json', 'csv', 'html'],
                            help='导出分析结果格式: json, csv, html')
        parser.add_argument('--no-cache', action='store_true',
                            help='不使用缓存，强制重新获取数据')
        parser.add_argument('--list-cities', action='store_true',
                            help='列出支持的城市列表')
        parser.add_argument('--sun-times', action='store_true',
                            help='仅显示日出日落时间变化曲线')
        parser.add_argument('--comfort', action='store_true',
                            help='仅显示舒适度指数分析')
        
        args = parser.parse_args()
        
        if args.list_cities:
            print("\n🌍 支持的城市列表:")
            print("=" * 40)
            for key, info in CITIES_COORDINATES.items():
                print(f"  {key:<15} -> {info['name']}")
            return
        
        if not args.cities:
            parser.print_help()
            return
        
        if args.no_cache:
            self.api_client.session.params = {'no_cache': 'true'}
        
        if args.monthly:
            for city in args.cities:
                monthly_stats = self.analyze_monthly(city, args.monthly)
                if args.export:
                    data = {
                        'city': city,
                        'year': args.monthly,
                        'monthly_stats': monthly_stats
                    }
                    if 'json' in args.export:
                        path = self.exporter.export_json(data, f'{city}_monthly_{args.monthly}.json')
                        print(f"\n💾 JSON报告已导出: {path}")
            return
        
        if args.compare and len(args.cities) > 1:
            cities_stats = self.compare_cities(args.cities, args.days)
            if args.export:
                if 'csv' in args.export:
                    path = self.exporter.export_comparison_csv(cities_stats)
                    print(f"\n💾 CSV报告已导出: {path}")
                if 'json' in args.export:
                    path = self.exporter.export_json({'cities': cities_stats})
                    print(f"💾 JSON报告已导出: {path}")
            return
        
        for city in args.cities:
            try:
                analysis_data = self.analyze_city(
                    city, 
                    days=args.days,
                    compare=args.year_compare,
                    forecast=args.forecast,
                    sun_only=args.sun_times,
                    comfort_only=args.comfort
                )
                
                if args.export and not args.sun_times and not args.comfort:
                    if 'json' in args.export:
                        path = self.exporter.export_json(analysis_data, f'{city}_analysis.json')
                        print(f"\n💾 JSON报告已导出: {path}")
                    if 'csv' in args.export:
                        path = self.exporter.export_csv(analysis_data['daily_data'], f'{city}_daily.csv')
                        print(f"💾 CSV报告已导出: {path}")
                    if 'html' in args.export:
                        if args.year_compare:
                            try:
                                ly_data = self.api_client.get_historical_weather_year_ago(city, days=args.days)
                                ly_analyzer = WeatherAnalyzer(ly_data)
                                ly_stats = ly_analyzer.get_basic_stats()
                                analysis_data['comparison'] = analysis_data.get('comparison', {})
                                analysis_data['comparison']['avg_temperature_last_year'] = ly_stats.get('avg_temperature')
                                analysis_data['comparison']['precipitation_last_year'] = ly_stats.get('total_precipitation')
                            except:
                                pass
                        path = self.exporter.export_html_report(analysis_data, f'{city}_report.html')
                        print(f"💾 HTML报告已导出: {path}")
                        
            except Exception as e:
                print(f"\n❌ 分析 {city} 时出错: {e}")
                import traceback
                traceback.print_exc()


def main():
    cli = WeatherCLI()
    cli.run()


if __name__ == '__main__':
    main()
