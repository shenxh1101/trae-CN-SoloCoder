"""
情感分析模块 - 分析对话情感并生成ASCII图表
"""

from typing import List, Dict, Tuple
from .models import Script, Sentiment


class SentimentAnalyzer:
    EMOTION_COLORS = {
        'joy': '\033[93m',
        'sadness': '\033[94m',
        'anger': '\033[91m',
        'fear': '\033[95m',
        'surprise': '\033[96m',
        'neutral': '\033[97m',
        'tension': '\033[95m',
        'affection': '\033[92m'
    }

    EMOTION_SYMBOLS = {
        'joy': '★',
        'sadness': '○',
        'anger': '▲',
        'fear': '◇',
        'surprise': '◆',
        'neutral': '□',
        'tension': '◆',
        'affection': '♥'
    }

    EMOTION_CN = {
        'joy': '喜悦',
        'sadness': '悲伤',
        'anger': '愤怒',
        'fear': '恐惧',
        'surprise': '惊讶',
        'neutral': '中性',
        'tension': '紧张',
        'affection': '亲近'
    }

    def __init__(self, chart_width: int = 60):
        self.chart_width = chart_width

    def analyze_script(self, script: Script) -> Script:
        from .generator import DialogueGenerator
        generator = DialogueGenerator()
        return generator.analyze_sentiment(script)

    def get_emotion_arc(self, script: Script) -> Dict[str, List[float]]:
        arc = {}
        emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'tension', 'affection']

        for emotion in emotions:
            arc[emotion] = []

        for line in script.dialogue:
            for emotion in emotions:
                value = getattr(line.sentiment, emotion, 0.0)
                arc[emotion].append(value)

        return arc

    def generate_ascii_chart(
        self,
        script: Script,
        show_emotions: List[str] = None,
        use_color: bool = True
    ) -> str:
        if show_emotions is None:
            show_emotions = ['joy', 'tension', 'affection', 'sadness']

        arc = self.get_emotion_arc(script)
        num_lines = len(script.dialogue)
        chart_w = self.chart_width
        lines = []

        lines.append("")
        lines.append("=" * chart_w)
        lines.append("  情感弧线分析图")
        lines.append("=" * chart_w)
        lines.append(f"  场景：{script.scene}")
        lines.append(f"  对话轮数：{num_lines}")
        lines.append("-" * chart_w)

        for emotion in show_emotions:
            if emotion not in arc:
                continue

            values = arc[emotion]
            if not values:
                continue

            color_start = self.EMOTION_COLORS.get(emotion, '') if use_color else ''
            color_end = '\033[0m' if use_color else ''
            symbol = self.EMOTION_SYMBOLS.get(emotion, '●')
            cn_name = self.EMOTION_CN.get(emotion, emotion)

            chart_line = self._build_chart_line(values, symbol, chart_w - 20)
            avg_value = sum(values) / len(values) if values else 0.0

            lines.append(
                f"  {color_start}{cn_name:<4}({emotion:<9}){color_end} "
                f"[{chart_line}] "
                f"avg:{avg_value:.2f}"
            )

        lines.append("-" * chart_w)

        speaker_line = "  轮次  "
        for i, dl in enumerate(script.dialogue):
            short_name = dl.speaker if len(dl.speaker) <= 3 else dl.speaker[:2] + "·"
            speaker_line += f" {short_name}:{i+1}"
        lines.append(speaker_line)

        detail_header = "        "
        for i, dl in enumerate(script.dialogue):
            val_str = f"L{i+1}"
            detail_header += f"  {val_str:^5}"
        lines.append(detail_header)

        lines.append("-" * chart_w)

        lines.append("  对话明细：")
        for i, dl in enumerate(script.dialogue):
            dominant = dl.sentiment.dominant_emotion()
            dominant_cn = self.EMOTION_CN.get(dominant, dominant)
            val = max(dl.sentiment.to_dict().values())
            preview = dl.text[:25] + ".." if len(dl.text) > 25 else dl.text
            color_s = self.EMOTION_COLORS.get(dominant, '') if use_color else ''
            color_e = '\033[0m' if use_color else ''
            lines.append(
                f"  L{i+1} {dl.speaker:<6} "
                f"{color_s}{dominant_cn}({val:.1f}){color_e} "
                f"- {preview}"
            )

        if script.overall_arc:
            lines.append(f"\n  整体情感弧线：{script.overall_arc}")

        lines.append("=" * chart_w + "")

        return "\n".join(lines)

    def _build_chart_line(
        self,
        values: List[float],
        symbol: str,
        max_width: int
    ) -> str:
        num_points = len(values)
        if num_points == 0:
            return " " * max_width

        points_per_value = max(1, max_width // num_points)
        chart = ""

        for value in values:
            level = int(value * 8)
            for _ in range(points_per_value):
                if level >= 7:
                    chart += symbol
                elif level >= 5:
                    chart += symbol.lower() if symbol.isalpha() else '▓'
                elif level >= 3:
                    chart += '·'
                else:
                    chart += ' '

        return chart[:max_width].ljust(max_width)

    def generate_heatmap(self, script: Script, use_color: bool = True) -> str:
        lines = []
        emotions = ['joy', 'tension', 'affection', 'sadness', 'anger']
        chart_w = self.chart_width

        lines.append("")
        lines.append("=" * chart_w)
        lines.append("  情感热力图")
        lines.append("=" * chart_w)

        header = "  情感    "
        for i, dl in enumerate(script.dialogue):
            short_name = dl.speaker if len(dl.speaker) <= 3 else dl.speaker[:2] + "·"
            header += f" {short_name}:{i+1}"
        lines.append(header)
        lines.append("-" * chart_w)

        for emotion in emotions:
            color_start = self.EMOTION_COLORS.get(emotion, '') if use_color else ''
            color_end = '\033[0m' if use_color else ''
            cn_name = self.EMOTION_CN.get(emotion, emotion)

            line = f"  {color_start}{cn_name:<4}{emotion:<6}{color_end} "

            for dialogue_line in script.dialogue:
                value = getattr(dialogue_line.sentiment, emotion, 0.0)
                block = self._get_heat_block(value, use_color)
                line += f" {block} "

            lines.append(line)

        lines.append("-" * chart_w)
        lines.append("  图例: ███ 高 (0.8-1.0)  ▓▓▓ 中 (0.4-0.8)  ░░░ 低 (0.1-0.4)  ··· 无 (<0.1)")
        lines.append("=" * chart_w + "")

        return "\n".join(lines)

    def _get_heat_block(self, value: float, use_color: bool) -> str:
        if value >= 0.8:
            return '\033[97m███\033[0m' if use_color else '███'
        elif value >= 0.4:
            return '\033[97m▓▓▓\033[0m' if use_color else '▓▓▓'
        elif value >= 0.1:
            return '\033[90m░░░\033[0m' if use_color else '░░░'
        else:
            return '···'

    def get_dominant_emotions(self, script: Script) -> List[Tuple[int, str, float]]:
        results = []
        for idx, line in enumerate(script.dialogue):
            emotions = line.sentiment.to_dict()
            dominant = max(emotions.items(), key=lambda x: x[1])
            results.append((idx, dominant[0], dominant[1]))
        return results

    def print_summary(self, script: Script):
        dominant = self.get_dominant_emotions(script)
        print("\n" + "=" * 60)
        print("  对话情感摘要")
        print("=" * 60)

        for idx, emotion, value in dominant:
            speaker = script.dialogue[idx].speaker
            emotion_cn = self.EMOTION_CN.get(emotion, emotion)
            text_preview = script.dialogue[idx].text[:30]
            if len(script.dialogue[idx].text) > 30:
                text_preview += "..."

            print(f"  L{idx+1:2d} {speaker:<6} {emotion_cn:<4}({emotion:<9} {value:.2f}) - {text_preview}")

        print("=" * 60 + "\n")
