import os
from typing import Dict, Any, List


class PaceAnalyzer:
    def __init__(self):
        self.pace_values = {
            "紧张": 3,
            "正常": 2,
            "舒缓": 1
        }

    def analyze_pace_curve(self, storyboard: Dict[str, Any]) -> Dict[str, Any]:
        shots = storyboard['shots']
        pace_data = []

        cumulative_time = 0
        for shot in shots:
            pace_score = self.pace_values.get(shot.pace, 2)
            cumulative_time += shot.duration
            pace_data.append({
                "shot_number": shot.shot_number,
                "time_point": cumulative_time,
                "duration": shot.duration,
                "pace": shot.pace,
                "pace_score": pace_score
            })

        pace_scores = [p['pace_score'] for p in pace_data]
        avg_pace = sum(pace_scores) / len(pace_scores) if pace_scores else 2

        if avg_pace > 2.5:
            overall_pace_level = "快节奏"
        elif avg_pace < 1.5:
            overall_pace_level = "慢节奏"
        else:
            overall_pace_level = "中等节奏"

        transitions = []
        for i in range(len(shots) - 1):
            current_shot = shots[i]
            next_shot = shots[i + 1]
            transitions.append({
                "from_shot": i + 1,
                "to_shot": i + 2,
                "transition_type": next_shot.transition,
                "suggestion": self._get_transition_suggestion(current_shot, next_shot)
            })

        return {
            "pace_curve": pace_data,
            "average_pace": avg_pace,
            "overall_pace_level": overall_pace_level,
            "transitions": transitions,
            "pace_chart": self._generate_ascii_chart(pace_data)
        }

    def _get_transition_suggestion(self, current_shot, next_shot) -> str:
        current_pace = self.pace_values.get(current_shot.pace, 2)
        next_pace = self.pace_values.get(next_shot.pace, 2)

        if current_pace > next_pace:
            return "从快到慢，建议使用淡入淡出转场，营造舒缓感"
        elif current_pace < next_pace:
            return "从慢到快，建议使用切或缩放转场，增强节奏"
        else:
            return "节奏平稳，可使用常规切或滑动转场"

    def _generate_ascii_chart(self, pace_data: List[Dict]) -> str:
        if not pace_data:
            return ""

        height = 3
        width = len(pace_data) * 4
        chart = []

        for row in range(height):
            line = ""
            for point in pace_data:
                pace_score = point['pace_score']
                bar_height = pace_score
                if height - row <= bar_height:
                    line += "█" * 3 + " "
                else:
                    line += "   " + " "
            chart.append(line)

        labels = "  ".join([f"#{p['shot_number']}" for p in pace_data])
        chart.append(labels)

        return "\n".join(chart)

    def print_pace_analysis(self, analysis: Dict[str, Any]):
        print("\n" + "=" * 60)
        print("📊 节奏分析")
        print("=" * 60)
        print(f"\n整体节奏: {analysis['overall_pace_level']}")
        print(f"平均节奏值: {analysis['average_pace']:.2f}")

        print("\n节奏曲线:")
        print(analysis['pace_chart'])

        print("\n镜头节奏点:")
        for point in analysis['pace_curve']:
            print(f"  镜头{point['shot_number']}: {point['pace']} ({point['duration']}秒)")

        print("\n转场建议:")
        for trans in analysis['transitions']:
            print(f"  {trans['from_shot']} → {trans['to_shot']}: {trans['suggestion']}")
        print("=" * 60 + "\n")
