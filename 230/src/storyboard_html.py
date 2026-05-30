import os
from typing import Dict, Any


class HTMLStoryboardGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, storyboard: Dict[str, Any], filename: str, pace_analysis: Dict[str, Any] = None) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.html")

        shots_html = self._generate_shots_html(storyboard['shots'])
        pace_curve_html = self._generate_pace_curve_html(pace_analysis) if pace_analysis else ""
        color_palette = self._generate_color_palette()

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{storyboard['title']} - 分镜故事板</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }}

        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}

        .header {{
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }}

        .header h1 {{
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }}

        .header .meta {{
            font-size: 1rem;
            opacity: 0.9;
        }}

        .info-card {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}

        .info-card h3 {{
            color: #667eea;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }}

        .info-card p {{
            color: #666;
            line-height: 1.8;
        }}

        .storyboard {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 30px;
        }}

        .shot-card {{
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}

        .shot-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }}

        .shot-visual {{
            height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }}

        .shot-visual .shot-type {{
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }}

        .shot-visual .shot-number {{
            font-size: 4rem;
            font-weight: bold;
            color: rgba(102, 126, 234, 0.3);
        }}

        .shot-visual .duration {{
            position: absolute;
            bottom: 12px;
            right: 12px;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }}

        .shot-content {{
            padding: 20px;
        }}

        .shot-content h4 {{
            color: #333;
            margin-bottom: 10px;
            font-size: 1rem;
        }}

        .shot-content .description {{
            color: #666;
            font-size: 0.9rem;
            line-height: 1.7;
            margin-bottom: 12px;
        }}

        .shot-content .dialogue {{
            background: #f0f4ff;
            border-left: 3px solid #667eea;
            padding: 10px 14px;
            border-radius: 0 8px 8px 0;
            font-size: 0.85rem;
            color: #555;
            font-style: italic;
        }}

        .shot-footer {{
            display: flex;
            justify-content: space-between;
            padding: 12px 20px;
            background: #f8f9fa;
            border-top: 1px solid #eee;
        }}

        .shot-footer span {{
            font-size: 0.8rem;
            color: #888;
        }}

        .pace-section {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-top: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}

        .pace-section h3 {{
            color: #667eea;
            margin-bottom: 20px;
        }}

        .pace-chart {{
            display: flex;
            align-items: flex-end;
            height: 100px;
            gap: 8px;
            padding: 20px 0;
        }}

        .pace-bar {{
            flex: 1;
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 4px 4px 0 0;
            transition: all 0.3s ease;
            position: relative;
            min-height: 8px;
        }}

        .pace-bar:hover {{
            opacity: 0.8;
        }}

        .pace-bar::after {{
            content: attr(data-shot);
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #888;
        }}

        .pace-bar[data-pace="紧张"] {{
            background: linear-gradient(to top, #f093fb, #f5576c);
        }}

        .pace-bar[data-pace="舒缓"] {{
            background: linear-gradient(to top, #4facfe, #00f2fe);
        }}

        .pace-legend {{
            display: flex;
            gap: 20px;
            margin-top: 30px;
            justify-content: center;
        }}

        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #666;
        }}

        .legend-color {{
            width: 20px;
            height: 12px;
            border-radius: 2px;
        }}

        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 1.8rem;
            }}
            .storyboard {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 {storyboard['title']}</h1>
            <div class="meta">
                创意: {storyboard['creative']} | 总时长: {storyboard['total_duration']}秒 | 镜头数: {len(storyboard['shots'])}
            </div>
        </div>

        <div class="info-card">
            <h3>📝 整体节奏分析</h3>
            <p>{storyboard.get('overall_pace_analysis', '暂无分析')}</p>
        </div>

        <div class="info-card">
            <h3>🔄 转场建议</h3>
            <p>{storyboard.get('transition_suggestions', '暂无建议')}</p>
        </div>

        <div class="storyboard">
            {shots_html}
        </div>

        {pace_curve_html}
    </div>
</body>
</html>"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)

        return filepath

    def _generate_shots_html(self, shots) -> str:
        html = ""
        shot_colors = [
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
        ]

        for i, shot in enumerate(shots):
            color_idx = i % len(shot_colors)
            pace_color = "#f5576c" if shot.pace == "紧张" else "#4facfe" if shot.pace == "舒缓" else "#667eea"

            html += f"""
            <div class="shot-card">
                <div class="shot-visual" style="background: {shot_colors[color_idx]}">
                    <span class="shot-type">{shot.shot_type}</span>
                    <span class="shot-number" style="color: rgba(255,255,255,0.4)">{shot.shot_number}</span>
                    <span class="duration">{shot.duration}秒</span>
                </div>
                <div class="shot-content">
                    <h4>镜头 {shot.shot_number}</h4>
                    <p class="description">{shot.description}</p>
                    {f'<p class="dialogue">💬 {shot.dialogue}</p>' if shot.dialogue else ''}
                </div>
                <div class="shot-footer">
                    <span>节奏: <strong style="color: {pace_color}">{shot.pace}</strong></span>
                    <span>转场: {shot.transition}</span>
                </div>
            </div>
            """

        return html

    def _generate_pace_curve_html(self, pace_analysis: Dict[str, Any]) -> str:
        if not pace_analysis or 'pace_curve' not in pace_analysis:
            return ""

        bars_html = ""
        for point in pace_analysis['pace_curve']:
            height = point['pace_score'] * 30
            bars_html += f'<div class="pace-bar" data-shot="#{point["shot_number"]}" data-pace="{point["pace"]}" style="height: {height}px;" title="镜头{point["shot_number"]}: {point["pace"]}"></div>'

        return f"""
        <div class="pace-section">
            <h3>📊 节奏曲线分析</h3>
            <p style="color: #666; margin-bottom: 15px;">整体节奏: <strong>{pace_analysis.get('overall_pace_level', '中等')}</strong></p>
            <div class="pace-chart">
                {bars_html}
            </div>
            <div class="pace-legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: linear-gradient(to right, #f093fb, #f5576c)"></div>
                    <span>紧张</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: linear-gradient(to right, #667eea, #764ba2)"></div>
                    <span>正常</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: linear-gradient(to right, #4facfe, #00f2fe)"></div>
                    <span>舒缓</span>
                </div>
            </div>
        </div>
        """

    def _generate_color_palette(self) -> list:
        return ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"]


def generate_storyboard_html(storyboard: Dict[str, Any], output_path: str, pace_analysis: Dict[str, Any] = None) -> str:
    """
    生成可视化故事板HTML文件的独立函数

    Args:
        storyboard: 分镜数据字典
        output_path: 输出文件路径（含文件名）
        pace_analysis: 节奏分析数据（可选）

    Returns:
        生成的HTML文件路径
    """
    output_dir = os.path.dirname(output_path)
    filename = os.path.splitext(os.path.basename(output_path))[0]

    generator = HTMLStoryboardGenerator(output_dir if output_dir else ".")
    return generator.generate(storyboard, filename, pace_analysis)
