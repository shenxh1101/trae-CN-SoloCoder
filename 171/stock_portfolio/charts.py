import math
from typing import Dict, List, Tuple
from .portfolio import get_portfolio_summary


def generate_ascii_pie_chart(positions: List[Dict], width: int = 60, 
                             height: int = 20) -> str:
    if not positions:
        return "No positions to display."
    
    total_value = sum(p["market_value"] for p in positions)
    if total_value <= 0:
        return "Total value is zero, cannot generate chart."
    
    segments = []
    for pos in positions:
        pct = pos["market_value"] / total_value
        segments.append((pos["stock_code"], pct, pos["market_value"]))
    
    segments.sort(key=lambda x: x[1], reverse=True)
    
    colors = ['█', '▓', '▒', '░', '█', '▓', '▒', '░', '█', '▓']
    color_idx = 0
    
    segment_colors = {}
    for code, _, _ in segments:
        segment_colors[code] = colors[color_idx % len(colors)]
        color_idx += 1
    
    chart_lines = []
    
    center_x = width // 2
    center_y = height // 2
    radius = min(center_x, center_y) - 1
    
    current_angle = -math.pi / 2
    
    for code, pct, value in segments:
        segment_angle = pct * 2 * math.pi
        end_angle = current_angle + segment_angle
        segment_colors[code] = (segment_colors[code], current_angle, end_angle)
        current_angle = end_angle
    
    for y in range(height):
        line = ""
        for x in range(width):
            dx = x - center_x
            dy = y - center_y
            distance = math.sqrt(dx * dx + dy * dy)
            
            if distance <= radius:
                angle = math.atan2(dy, dx)
                if angle < -math.pi / 2:
                    angle += 2 * math.pi
                
                char = ' '
                for code, (color, start, end) in segment_colors.items():
                    if start <= angle <= end:
                        char = color
                        break
                    if end > math.pi * 1.5 and (angle >= start or angle <= end - 2 * math.pi):
                        char = color
                        break
                
                line += char
            else:
                line += ' '
        chart_lines.append(line)
    
    legend = ["", "  持仓占比:"]
    for code, pct, value in segments:
        color = segment_colors[code][0]
        name = next((p["stock_name"] for p in positions if p["stock_code"] == code), code)
        legend.append(f"  {color} {name} ({code}): {pct*100:.1f}%  ¥{value:,.2f}")
    
    return "\n".join(chart_lines + legend)


def generate_ascii_line_chart(data_points: List[Tuple[str, float]], 
                              width: int = 80, height: int = 20) -> str:
    if not data_points:
        return "No data points to display."
    
    values = [v for _, v in data_points]
    labels = [l for l, _ in data_points]
    
    min_val = min(values)
    max_val = max(values)
    
    if max_val == min_val:
        if max_val == 0:
            max_val = 1
            min_val = -1
        else:
            max_val = max_val * 1.1
            min_val = min_val * 0.9
    
    value_range = max_val - min_val
    
    chart_width = width - 10
    chart_height = height - 2
    
    n_points = len(data_points)
    
    if n_points > chart_width:
        step = n_points // chart_width
        sampled = []
        for i in range(0, n_points, step):
            sampled.append(data_points[i])
        if sampled[-1] != data_points[-1]:
            sampled.append(data_points[-1])
        data_points = sampled
        values = [v for _, v in data_points]
        labels = [l for l, _ in data_points]
        n_points = len(data_points)
    
    y_scale = chart_height / value_range
    
    def get_y(val):
        return int(round((max_val - val) * y_scale))
    
    canvas = [[' ' for _ in range(chart_width)] for _ in range(chart_height)]
    
    for i in range(n_points):
        x = int(round(i * (chart_width - 1) / (n_points - 1))) if n_points > 1 else 0
        y = get_y(values[i])
        if 0 <= y < chart_height and 0 <= x < chart_width:
            canvas[y][x] = '●'
        
        if i > 0:
            prev_x = int(round((i - 1) * (chart_width - 1) / (n_points - 1))) if n_points > 1 else 0
            prev_y = get_y(values[i - 1])
            
            steps = max(abs(x - prev_x), abs(y - prev_y))
            for s in range(1, steps):
                interp_x = int(prev_x + (x - prev_x) * s / steps)
                interp_y = int(prev_y + (y - prev_y) * s / steps)
                if 0 <= interp_y < chart_height and 0 <= interp_x < chart_width:
                    if canvas[interp_y][interp_x] == ' ':
                        canvas[interp_y][interp_x] = '─'
    
    output_lines = []
    
    for y in range(chart_height):
        val = max_val - y * value_range / chart_height
        line = f"{val:8.0f} │"
        line += "".join(canvas[y])
        output_lines.append(line)
    
    x_axis = "         └" + "─" * (chart_width)
    output_lines.append(x_axis)
    
    if n_points >= 2:
        label_step = max(1, n_points // 5)
        label_indices = list(range(0, n_points, label_step))
        if label_indices[-1] != n_points - 1:
            label_indices.append(n_points - 1)
        
        label_line = "          "
        last_x = -1
        for idx in label_indices:
            x = int(round(idx * (chart_width - 1) / (n_points - 1))) if n_points > 1 else 0
            if x > last_x:
                padding = x - last_x - 1
                label_line += " " * padding + labels[idx]
                last_x = x + len(labels[idx]) - 1
        
        output_lines.append(label_line[:width])
    
    output_lines.append("")
    output_lines.append(f"  最高: ¥{max_val:,.2f}  |  最低: ¥{min_val:,.2f}  |  当前: ¥{values[-1]:,.2f}")
    
    return "\n".join(output_lines)


def print_portfolio_allocation_chart(portfolio_id: int) -> None:
    summary = get_portfolio_summary(portfolio_id)
    positions = summary["positions"]
    
    print("\n" + "=" * 70)
    print("  持仓占比分析")
    print("=" * 70)
    print()
    print(generate_ascii_pie_chart(positions))
    print()


def print_asset_curve(snapshots: List[Dict], title: str = "资产曲线") -> None:
    if not snapshots:
        print("\n暂无资产快照数据\n")
        return
    
    data = [(s["snapshot_date"][5:], s["total_value"]) for s in snapshots]
    
    print("\n" + "=" * 90)
    print(f"  {title}")
    print("=" * 90)
    print()
    print(generate_ascii_line_chart(data, width=85, height=18))
    print()


def generate_simple_bar_chart(data: List[Tuple[str, float]], 
                              max_width: int = 50) -> str:
    if not data:
        return ""
    
    max_val = max(v for _, v in data)
    if max_val == 0:
        return "\n".join([f"  {label}: 0" for label, _ in data])
    
    lines = []
    for label, value in data:
        bar_width = int(round(value / max_val * max_width))
        bar = "█" * bar_width
        lines.append(f"  {label:<8} |{bar:<{max_width}} {value:,.2f}")
    
    return "\n".join(lines)
