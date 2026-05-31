from typing import List, Dict, Tuple, Optional
from config import ASCII_CHART_HEIGHT, ASCII_CHART_WIDTH


class ASCIIChart:
    def __init__(self, height: int = ASCII_CHART_HEIGHT, width: int = ASCII_CHART_WIDTH):
        self.height = height
        self.width = width

    def plot_line_chart(self, data: Dict[str, float], title: str = "",
                        x_label: str = "", y_label: str = "情绪分数") -> str:
        if not data:
            return "暂无数据可显示"

        try:
            labels = list(data.keys())
            values = list(data.values())

            valid_pairs = [(l, v) for l, v in zip(labels, values) if isinstance(v, (int, float))]
            if not valid_pairs:
                return "暂无数据可显示"
            labels, values = zip(*valid_pairs)
            labels, values = list(labels), list(values)

            if len(labels) > self.width - 10:
                step = len(labels) // (self.width - 10) + 1
                labels = labels[::step]
                values = values[::step]

            min_val = min(values)
            max_val = max(values)

            if min_val == max_val:
                min_val = max(0, min_val - 0.1)
                max_val = min(1, max_val + 0.1)

            chart = []

            if title:
                chart.append(self._center_text(title, self.width))
                chart.append("")

            for i in range(self.height):
                y_val = max_val - (max_val - min_val) * (i / (self.height - 1))
                line = [f"{y_val:.2f} | "]

                for j, val in enumerate(values):
                    if i == self.height - 1:
                        line.append("─")
                    else:
                        normalized = (val - min_val) / (max_val - min_val)
                        row_idx = int((1 - normalized) * (self.height - 1))

                        if row_idx == i:
                            line.append("●")
                        elif row_idx < i and j > 0:
                            prev_normalized = (values[j-1] - min_val) / (max_val - min_val)
                            prev_row_idx = int((1 - prev_normalized) * (self.height - 1))
                            if prev_row_idx > i:
                                line.append("\\")
                            elif prev_row_idx == i:
                                line.append("/")
                            else:
                                line.append(" ")
                        else:
                            line.append(" ")

                chart.append("".join(line))

            x_axis = "     " + "┴" + "─" * (len(values) - 1)
            chart.append(x_axis)

            if labels:
                label_line = "     "
                for label in labels:
                    if len(label) > 2:
                        label_line += label[-2:]
                    else:
                        label_line += label.ljust(2)[:2]
                chart.append(label_line)

            if x_label or y_label:
                chart.append("")
                chart.append(f"X轴: {x_label}")
                chart.append(f"Y轴: {y_label}")

            return "\n".join(chart)
        except Exception:
            return "图表生成失败"

    def plot_bar_chart(self, data: Dict[str, int], title: str = "",
                       horizontal: bool = True) -> str:
        if not data:
            return "暂无数据可显示"

        chart = []

        if title:
            chart.append(self._center_text(title, self.width))
            chart.append("")

        max_val = max(data.values())
        max_label_len = max(len(k) for k in data.keys())

        if horizontal:
            bar_width = self.width - max_label_len - 10
            for label, value in sorted(data.items(), key=lambda x: x[1], reverse=True):
                bar_length = int((value / max_val) * bar_width) if max_val > 0 else 0
                bar = "█" * bar_length + "░" * (bar_width - bar_length)
                chart.append(f"{label.rjust(max_label_len)} | {bar} {value}")
        else:
            items = list(data.items())[:10]
            for i in range(10, 0, -1):
                line = f"{i * 10:3d}% | "
                for _, value in items:
                    if (value / max_val * 100) >= i * 10:
                        line += "██ "
                    else:
                        line += "   "
                chart.append(line)

            chart.append("    ┼" + "───" * len(items))

            for i in range(max(len(k) for k, _ in items)):
                line = "      "
                for k, _ in items:
                    if i < len(k):
                        line += k[i] + "  "
                    else:
                        line += "   "
                chart.append(line)

        return "\n".join(chart)

    def plot_monthly_calendar(self, monthly_data: Dict[str, float],
                              year: int, month: int) -> str:
        from calendar import monthrange

        _, num_days = monthrange(year, month)
        chart = []

        chart.append(self._center_text(f"{year}年{month}月 情绪日历", 42))
        chart.append("")
        chart.append("  一  二  三  四  五  六  日")

        first_day = __import__('calendar').weekday(year, month, 1)

        week = ["    "] * first_day

        for day in range(1, num_days + 1):
            day_key = str(day)
            score = monthly_data.get(day_key, 0.5)

            if score >= 0.7:
                color = "😊"
            elif score >= 0.5:
                color = "🙂"
            elif score >= 0.3:
                color = "😐"
            else:
                color = "😢"

            week.append(f"{color}")

            if len(week) == 7:
                chart.append(" ".join(week))
                week = []

        if week:
            chart.append(" ".join(week))

        chart.append("")
        chart.append("图例: 😊>=0.7  🙂>=0.5  😐>=0.3  😢<0.3")

        return "\n".join(chart)

    def plot_category_radar(self, categories: Dict[str, float], title: str = "") -> str:
        if not categories:
            return "暂无数据可显示"

        chart = []

        if title:
            chart.append(self._center_text(title, 50))
            chart.append("")

        max_val = max(categories.values()) or 1

        for category, value in categories.items():
            bar_length = int((value / max_val) * 30)
            bar = "■" * bar_length + "□" * (30 - bar_length)
            chart.append(f"{category.ljust(10)} | {bar} {value:.2f}")

        return "\n".join(chart)

    def _center_text(self, text: str, width: int) -> str:
        padding = max(0, (width - len(text)) // 2)
        return " " * padding + text
