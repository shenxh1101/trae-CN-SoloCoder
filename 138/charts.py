class ASCIICharts:
    @staticmethod
    def draw_temperature_trend(daily_data, width=80):
        if not daily_data:
            return "无数据"
        
        dates = [d['date'][5:] if d['date'] else '' for d in daily_data]
        temp_max = [d['temp_max'] for d in daily_data if d['temp_max'] is not None]
        temp_min = [d['temp_min'] for d in daily_data if d['temp_min'] is not None]
        
        if not temp_max or not temp_min:
            return "温度数据不足"
        
        all_temps = temp_max + temp_min
        min_temp = min(all_temps)
        max_temp = max(all_temps)
        temp_range = max_temp - min_temp
        
        if temp_range == 0:
            temp_range = 1
        
        height = 10
        chart_lines = [''] * height
        
        for i, day in enumerate(daily_data):
            if day['temp_max'] is None or day['temp_min'] is None:
                continue
            
            t_max_norm = int((day['temp_max'] - min_temp) / temp_range * (height - 1))
            t_min_norm = int((day['temp_min'] - min_temp) / temp_range * (height - 1))
            
            for h in range(height):
                line_pos = height - 1 - h
                char = ' '
                
                if line_pos == t_max_norm and line_pos == t_min_norm:
                    char = '○'
                elif line_pos == t_max_norm:
                    char = '▲'
                elif line_pos == t_min_norm:
                    char = '▼'
                elif t_min_norm < line_pos < t_max_norm:
                    char = '│'
                elif h == height - 1:
                    char = '─'
                
                chart_lines[h] += char
        
        result = ["\n温度趋势图 (℃)", "=" * width]
        
        label_step = 2
        for i, line in enumerate(chart_lines):
            if i % label_step == 0 or i == height - 1:
                temp_value = max_temp - (i / (height - 1) * temp_range)
                temp_label = f"{temp_value:5.1f} │"
            else:
                temp_label = "      │"
            result.append(temp_label + line)
        
        result.append("      └" + "─" * (width - 7))
        
        date_label = "        "
        step = max(1, len(dates) // 10)
        for i in range(0, len(dates), step):
            date_label += dates[i] + ' '
        result.append(date_label)
        result.append("图例: ▲最高温  ▼最低温  ○温差小")
        
        return '\n'.join(result)
    
    @staticmethod
    def draw_precipitation_bar(distribution, width=60):
        if not distribution:
            return "无降水数据"
        
        max_count = max(distribution.values()) if distribution else 0
        if max_count == 0:
            max_count = 1
        
        bar_width = width - 15
        
        result = ["\n降水强度分布", "=" * width]
        
        for level, count in distribution.items():
            bar_len = int(count / max_count * bar_width)
            bar = '█' * bar_len
            result.append(f"{level:>6} │ {bar} ({count}天)")
        
        result.append("       └" + "─" * (width - 8))
        
        return '\n'.join(result)
    
    @staticmethod
    def draw_sunrise_sunset(sun_data, width=70):
        if not sun_data:
            return "无日出日落数据"
        
        result = ["\n日出日落时间变化", "=" * width]
        result.append(f"{'日期':<12} {'日出':<8} {'日落':<8} {'昼长(小时)':<12} 变化图")
        result.append("-" * width)
        
        day_lengths = [d['day_length_hours'] for d in sun_data]
        min_dl = min(day_lengths)
        max_dl = max(day_lengths)
        dl_range = max_dl - min_dl if max_dl != min_dl else 1
        
        bar_width = 20
        for d in sun_data:
            dl_norm = int((d['day_length_hours'] - min_dl) / dl_range * bar_width)
            bar = '█' * dl_norm
            date = d['date'][5:] if d['date'] else ''
            result.append(f"{date:<12} {d['sunrise']:<8} {d['sunset']:<8} {d['day_length_hours']:<12.2f} {bar}")
        
        return '\n'.join(result)
    
    @staticmethod
    def draw_wind_direction(frequency, width=50):
        if not frequency:
            return "无风向数据"
        
        result = ["\n风向频率分布", "=" * width]
        
        max_pct = max(v['percentage'] for v in frequency.values()) if frequency else 0
        if max_pct == 0:
            max_pct = 1
        
        bar_width = width - 20
        
        for direction, data in frequency.items():
            bar_len = int(data['percentage'] / max_pct * bar_width)
            bar = '█' * bar_len
            result.append(f"{direction:>4} │ {bar} {data['percentage']:5.1f}% ({data['count']}天)")
        
        return '\n'.join(result)
    
    @staticmethod
    def draw_forecast_comparison(forecast_data, historical_avg, width=60):
        if not forecast_data:
            return "无预报数据"
        
        result = ["\n未来3天预报与历史均值对比", "=" * width]
        result.append(f"{'日期':<12} {'最高温':<10} {'最低温':<10} {'降水概率':<10} 与均值差")
        result.append("-" * width)
        
        for day in forecast_data:
            date = day['date'][5:] if 'date' in day and day['date'] else ''
            temp_max = day.get('temp_max', 'N/A')
            temp_min = day.get('temp_min', 'N/A')
            precip_prob = day.get('precipitation_probability_max', 'N/A')
            
            diff = ''
            if temp_max != 'N/A' and historical_avg:
                temp_diff = temp_max - historical_avg.get('avg_temperature', temp_max)
                sign = '+' if temp_diff > 0 else ''
                diff = f"{sign}{temp_diff:+.1f}℃"
            
            result.append(f"{date:<12} {temp_max:<10} {temp_min:<10} {precip_prob:<10} {diff}")
        
        return '\n'.join(result)
