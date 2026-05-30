import os
import io
import base64
import json
from typing import Dict, Any, Optional
from PIL import Image
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


class ImageStyleAnalyzer:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.getenv("OPENAI_VISION_MODEL", "gpt-4o")
        self.client = None
        self.use_mock = False

        if not self.api_key:
            self.use_mock = True
        else:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            except Exception as e:
                print(f"⚠️  API 初始化失败: {e}，使用模拟模式")
                self.use_mock = True

    def _image_to_base64(self, image_path: str) -> str:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def _extract_dominant_colors_simple(self, image_path: str) -> list:
        img = Image.open(image_path)
        img = img.convert('RGB')
        img = img.resize((50, 50))

        pixels = list(img.getdata())

        color_counts = {}
        for r, g, b in pixels:
            r = (r // 32) * 32
            g = (g // 32) * 32
            b = (b // 32) * 32
            color = (r, g, b)
            color_counts[color] = color_counts.get(color, 0) + 1

        sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        hex_colors = []
        for (r, g, b), _ in sorted_colors:
            hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")

        return hex_colors

    def _estimate_brightness(self, img) -> float:
        gray = img.convert('L')
        pixels = list(gray.getdata())
        return sum(pixels) / len(pixels)

    def _classify_composition(self, aspect_ratio: float) -> str:
        if aspect_ratio > 1.5:
            return "横向宽屏"
        elif aspect_ratio < 0.75:
            return "竖向竖屏"
        else:
            return "标准画幅"

    def _generate_mock_vision_analysis(self, dominant_colors, brightness_level, composition_type) -> Dict[str, Any]:
        """模拟视觉分析 - 基于真实颜色生成风格描述"""
        avg_brightness = sum(int(c[1:], 16) >> (8*i) & 0xFF for c in dominant_colors[:3] for i in range(3)) / 9

        if avg_brightness > 180:
            mood = "明亮清新"
            lighting = "充足自然光"
        elif avg_brightness > 100:
            mood = "温暖舒适"
            lighting = "柔和均匀"
        else:
            mood = "神秘深沉"
            lighting = "低光对比"

        return {
            "color_scheme": f"以 {', '.join(dominant_colors[:3])} 为主色调",
            "mood": mood,
            "lighting": lighting,
            "composition_details": f"{composition_type}构图，层次分明",
            "style_reference": "现代摄影风格",
            "key_elements": ["主体", "背景", "光影"],
            "full_description": f"画面采用{composition_type}构图，整体{brightness_level}，主色调为{', '.join(dominant_colors[:3])}，营造出{mood}的视觉氛围。建议分镜中采用类似的色彩搭配和光影处理。"
        }

    def analyze_style(self, image_path: str, use_vision: bool = True) -> Dict[str, Any]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"图片不存在: {image_path}")

        dominant_colors = self._extract_dominant_colors_simple(image_path)

        with Image.open(image_path) as img:
            width, height = img.size
            aspect_ratio = width / height
            brightness = self._estimate_brightness(img)

        composition_type = self._classify_composition(aspect_ratio)
        brightness_level = "明亮" if brightness > 150 else "中等" if brightness > 100 else "偏暗"

        vision_analysis = None
        if use_vision and not self.use_mock and self.client:
            try:
                vision_analysis = self._analyze_with_vision(image_path)
            except Exception as e:
                print(f"视觉分析警告: {e}，使用模拟分析")
                vision_analysis = self._generate_mock_vision_analysis(dominant_colors, brightness_level, composition_type)
        elif use_vision:
            print("  [模拟模式] 分析图片风格...")
            vision_analysis = self._generate_mock_vision_analysis(dominant_colors, brightness_level, composition_type)

        if vision_analysis:
            style_description = vision_analysis.get('full_description', '')
            mood = vision_analysis.get('mood', '')
            lighting = vision_analysis.get('lighting', '')
            color_scheme = vision_analysis.get('color_scheme', '')
        else:
            style_description = f"画面采用{composition_type}构图，整体亮度{brightness_level}"
            mood = "未知"
            lighting = brightness_level
            color_scheme = ", ".join(dominant_colors)

        return {
            "dominant_colors": dominant_colors,
            "composition": composition_type,
            "brightness": brightness_level,
            "mood": mood,
            "lighting": lighting,
            "color_scheme": color_scheme,
            "style_description": style_description,
            "aspect_ratio": aspect_ratio,
            "resolution": f"{width}x{height}",
            "vision_analysis": vision_analysis
        }

    def _analyze_with_vision(self, image_path: str) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("未配置 API Key，无法使用视觉分析功能")

        base64_image = self._image_to_base64(image_path)

        prompt = """请分析这张图片的视觉风格，输出JSON格式。包含以下字段:
- color_scheme: 主色调描述（中文）
- mood: 整体氛围/情绪（中文）
- lighting: 光线特点（中文）
- composition_details: 构图特点（中文）
- style_reference: 艺术风格参考（中文）
- key_elements: 主要画面元素列表（中文，数组）
- full_description: 完整的风格描述，可用于分镜生成的参考提示（中文，200字以内）

只输出JSON，不要其他内容。"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "low"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        content = response.choices[0].message.content
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]

        return json.loads(content.strip())

    def get_style_prompt(self, image_path: str) -> str:
        analysis = self.analyze_style(image_path)

        if analysis.get('vision_analysis'):
            return f"""参考图片风格：
- 色调方案: {analysis['vision_analysis'].get('color_scheme', '未识别')}
- 整体氛围: {analysis['vision_analysis'].get('mood', '未识别')}
- 光线特点: {analysis['vision_analysis'].get('lighting', '未识别')}
- 构图方式: {analysis['vision_analysis'].get('composition_details', '未识别')}
- 风格参考: {analysis['vision_analysis'].get('style_reference', '未识别')}
- 主要元素: {', '.join(analysis['vision_analysis'].get('key_elements', []))}

详细风格说明: {analysis['vision_analysis'].get('full_description', '')}

请在分镜画面描述中充分体现上述视觉风格特点，包括色调、光线、构图和氛围。"""
        else:
            return f"""参考图片风格：
- 主色调: {', '.join(analysis['dominant_colors'])}
- 构图: {analysis['composition']}
- 亮度: {analysis['brightness']}
请在分镜画面描述中体现这种色调和构图风格。
"""
