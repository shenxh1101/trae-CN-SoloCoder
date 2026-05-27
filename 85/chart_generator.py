class ChartGenerator:
    def generate_steps_chart(self, steps_data):
        lines = self.get_chart_lines(steps_data)
        for line in lines:
            print(line)

    def get_chart_lines(self, steps_data):
        if not steps_data:
            return ["无数据"]

        sorted_dates = sorted(steps_data.keys())
        max_steps = max(steps_data.values())
        max_bar_length = 30

        lines = []
        for date in sorted_dates:
            steps = steps_data[date]
            bar_length = int((steps / max_steps) * max_bar_length) if max_steps > 0 else 0
            bar = '█' * bar_length
            lines.append(f"{date[5:]} | {bar} {steps:,} 步")

        return lines
