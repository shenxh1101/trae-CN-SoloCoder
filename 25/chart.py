from typing import List, Dict, Any, Optional
from datetime import datetime


class ASCIIChart:
    @staticmethod
    def draw_minute_chart(price_data: List[Dict[str, Any]], 
                          width: int = 60, height: int = 15,
                          title: str = "分时走势") -> str:
        if not price_data:
            return "无数据可显示"
            
        prices = [item.get("close", 0) for item in price_data]
        times = [item.get("time", "") for item in price_data]
        
        if len(prices) < 2:
            return "数据点不足"
            
        max_price = max(prices)
        min_price = min(prices)
        price_range = max_price - min_price
        
        if price_range <= 0:
            price_range = max_price * 0.01 if max_price > 0 else 1.0
        
        chart_lines = []
        
        title_line = f" {title} "
        padding = width - len(title_line)
        if padding > 0:
            title_line = "=" * (padding // 2) + title_line + "=" * (padding - padding // 2)
        chart_lines.append(title_line)
        
        price_labels = []
        for i in range(height + 1):
            price = max_price - (price_range * i / height)
            price_labels.append(f"{price:8.2f}")
            
        label_width = max(len(l) for l in price_labels) + 1
        
        plot_width = width - label_width
        
        normalized_prices = []
        for p in prices:
            if price_range > 0:
                np = int((p - min_price) / price_range * (height - 1))
                normalized_prices.append(max(0, min(height - 1, np)))
            else:
                normalized_prices.append(height // 2)
        
        step = max(1, len(prices) // plot_width)
        sampled_prices = normalized_prices[::step][:plot_width]
        sampled_times = times[::step][:plot_width]
        
        for row in range(height):
            line = f"{price_labels[row]:>{label_width-1}} │"
            for col, price_row in enumerate(sampled_prices):
                if price_row == row:
                    line += "●"
                elif col > 0 and sampled_prices[col-1] == row and price_row > row:
                    line += "╱"
                elif col > 0 and sampled_prices[col-1] == row and price_row < row:
                    line += "╲"
                elif col > 0 and sampled_prices[col-1] > row and price_row == row:
                    line += "╱"
                elif col > 0 and sampled_prices[col-1] < row and price_row == row:
                    line += "╲"
                else:
                    line += " "
            chart_lines.append(line)
        
        axis_line = " " * (label_width - 1) + "└" + "─" * plot_width
        chart_lines.append(axis_line)
        
        if sampled_times:
            time_line = " " * (label_width - 1) + " "
            n_times = min(6, len(sampled_times))
            interval = max(1, len(sampled_times) // n_times)
            
            positions = []
            labels = []
            for i in range(0, len(sampled_times), interval):
                time_str = sampled_times[i]
                if len(time_str) >= 16:
                    time_label = time_str[11:16]
                else:
                    time_label = time_str[-5:]
                labels.append(time_label)
                positions.append(i)
            
            last_pos = -10
            time_label_line = " " * (label_width - 1) + " "
            for i, (pos, label) in enumerate(zip(positions, labels)):
                if pos >= last_pos + 6:
                    padding = pos - last_pos - 1
                    time_label_line += " " * max(0, padding) + label
                    last_pos = pos + len(label) - 1
            
            chart_lines.append(time_label_line)
        
        open_price = price_data[0].get("close", 0)
        close_price = price_data[-1].get("close", 0)
        change = close_price - open_price
        change_percent = (change / open_price) * 100 if open_price > 0 else 0
        
        info_line = f"开:{open_price:.2f} 高:{max_price:.2f} 低:{min_price:.2f} 收:{close_price:.2f} "
        info_line += f"涨跌:{change:+.2f} ({change_percent:+.2f}%)"
        padding = width - len(info_line)
        if padding > 0:
            info_line = "=" * padding + info_line
        chart_lines.append(info_line)
        
        return "\n".join(chart_lines)

    @staticmethod
    def draw_price_line(price_data: List[Dict[str, Any]], 
                        width: int = 60, height: int = 10) -> str:
        if not price_data:
            return "无数据"
            
        prices = [item.get("close", 0) for item in price_data]
        max_p = max(prices)
        min_p = min(prices)
        range_p = max_p - min_p if max_p != min_p else 1.0
        
        step = max(1, len(prices) // width)
        sampled = prices[::step][:width]
        
        norm = []
        for p in sampled:
            n = int((p - min_p) / range_p * (height - 1))
            norm.append(max(0, min(height - 1, n)))
        
        lines = []
        for row in range(height - 1, -1, -1):
            line = ""
            for col, val in enumerate(norm):
                if val == row:
                    line += "●"
                elif val > row:
                    line += "│"
                else:
                    line += " "
            lines.append(line)
            
        return "\n".join(lines)

    @staticmethod
    def draw_volume_bars(volume_data: List[Dict[str, Any]],
                         width: int = 60, height: int = 5) -> str:
        if not volume_data:
            return "无数据"
            
        volumes = [item.get("volume", 0) for item in volume_data]
        if not volumes:
            return "无数据"
            
        max_vol = max(volumes) if volumes else 1
        step = max(1, len(volumes) // width)
        sampled = volumes[::step][:width]
        
        bars = "▁▂▃▄▅▆▇█"
        lines = []
        
        for row in range(height - 1, -1, -1):
            line = ""
            for vol in sampled:
                if max_vol > 0:
                    ratio = vol / max_vol
                    bar_level = int(ratio * (height - 1))
                else:
                    bar_level = 0
                    
                if bar_level >= row:
                    bar_char = bars[min(7, int(ratio * 7))]
                    line += bar_char
                else:
                    line += " "
            lines.append(line)
            
        return "\n".join(lines)
