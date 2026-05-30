import os
import json
import random
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Shot:
    shot_number: int
    shot_type: str
    description: str
    dialogue: str
    duration: float
    pace: str
    transition: str


class StoryboardGenerator:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.client = None
        self.use_mock = False

        if not self.api_key:
            print("⚠️  未检测到 API Key，使用模拟模式生成演示数据")
            self.use_mock = True
        else:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            except Exception as e:
                print(f"⚠️  API 初始化失败: {e}，使用模拟模式")
                self.use_mock = True

    def _calculate_shots_count(self, total_duration: int) -> int:
        if total_duration <= 15:
            return 4
        elif total_duration <= 30:
            return 6
        elif total_duration <= 60:
            return 10
        elif total_duration <= 120:
            return 15
        else:
            return min(25, total_duration // 5)

    def _build_prompt(self, creative: str, total_duration: int, style_reference: Optional[str] = None) -> str:
        shots_count = self._calculate_shots_count(total_duration)
        avg_duration = total_duration / shots_count

        style_note = ""
        if style_reference:
            style_note = f"\n\n画面风格参考: {style_reference}\n请在画面描述中体现这种风格特点。"

        prompt = f"""你是一位专业的视频分镜师。请根据以下创意生成一个{total_duration}秒的视频分镜脚本。

视频创意: {creative}

总时长: {total_duration}秒
分镜数量: {shots_count}个
平均每个镜头时长: {avg_duration:.1f}秒

请严格按照以下JSON格式输出，不要添加任何其他内容:
{{
    "title": "视频标题",
    "shots": [
        {{
            "shot_number": 1,
            "shot_type": "近景/中景/远景/特写",
            "description": "详细的画面描述，包括人物动作、场景、道具等",
            "dialogue": "台词或旁白内容",
            "duration": 5.0,
            "pace": "紧张/舒缓/正常",
            "transition": "切/淡入淡出/滑动/缩放"
        }}
    ],
    "overall_pace_analysis": "整体节奏分析",
    "transition_suggestions": "转场建议"
}}

要求:
1. 所有镜头的duration之和必须等于{total_duration}秒
2. 合理分配每个镜头的时长，高潮部分镜头可以更短，舒缓部分可以更长
3. shot_type只能使用: 远景、全景、中景、近景、特写
4. pace只能使用: 紧张、舒缓、正常
5. transition只能使用: 切、淡入淡出、滑动、缩放、旋转
6. 画面描述要具体、可拍摄
7. 台词/旁白要简洁有力{style_note}

请确保输出是有效的JSON格式。"""

        return prompt

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        try:
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            return json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            print(f"原始响应: {response_text}")
            raise

    def _generate_mock_storyboard(self, creative: str, total_duration: int) -> Dict[str, Any]:
        """模拟模式 - 生成演示分镜数据"""
        shots_count = self._calculate_shots_count(total_duration)
        shot_types = ['远景', '全景', '中景', '近景', '特写']
        paces = ['紧张', '正常', '舒缓']
        transitions = ['切', '淡入淡出', '滑动', '缩放']

        base_duration = total_duration / shots_count

        shot_templates = [
            ("程序员在深夜的办公室，屏幕蓝光映照在脸上", "旁白: 凌晨三点，代码仍在运行"),
            ("手指快速敲击键盘，各种代码滚动", "嗒嗒嗒..."),
            ("眉头紧锁，盯着屏幕上的错误提示", "到底是哪里出了问题？"),
            ("咖啡杯旁边，便利贴写满了思路", ""),
            ("突然眼睛一亮，想到了什么", "等等！难道是..."),
            ("快速修改代码，手指翻飞", ""),
            ("运行程序，等待结果", "一定要成功..."),
            ("屏幕显示 SUCCESS，松了口气", "旁白: bug修复完成"),
            ("微笑着合上电脑，窗外天已微亮", "旁白: 又是一个充实的夜晚"),
            ("起身伸懒腰，准备休息", ""),
        ]

        shots = []
        for i in range(shots_count):
            template_idx = min(i, len(shot_templates) - 1)
            desc, dialogue = shot_templates[template_idx]

            # 根据位置调整节奏
            if i < shots_count // 3:
                pace = '舒缓'
            elif i < shots_count * 2 // 3:
                pace = '紧张'
            else:
                pace = '正常'

            duration = base_duration
            if pace == '紧张':
                duration *= 0.8
            elif pace == '舒缓':
                duration *= 1.2

            shots.append(Shot(
                shot_number=i + 1,
                shot_type=random.choice(shot_types),
                description=desc,
                dialogue=dialogue,
                duration=round(duration, 1),
                pace=pace,
                transition=random.choice(transitions)
            ))

        # 调整总时长
        actual_total = sum(s.duration for s in shots)
        diff = total_duration - actual_total
        if shots:
            shots[-1].duration = round(shots[-1].duration + diff, 1)

        return {
            "title": f"模拟: {creative[:20]}...",
            "creative": creative,
            "total_duration": total_duration,
            "shots": shots,
            "overall_pace_analysis": "本片节奏由舒缓逐渐紧张，最后回归平静，符合问题解决的叙事弧线。建议开头用慢镜头铺垫氛围，中间用快切增强紧张感，结尾用长镜头释放情绪。",
            "transition_suggestions": "开头使用淡入，紧张段落使用快速切换，结尾使用淡出效果。关键转折点可使用缩放转场增强冲击感。"
        }

    def generate(self, creative: str, total_duration: int = 30, style_reference: Optional[str] = None) -> Dict[str, Any]:
        if self.use_mock:
            print("  [模拟模式] 正在生成分镜...")
            result = self._generate_mock_storyboard(creative, total_duration)
            if style_reference:
                print(f"  [模拟模式] 应用风格参考")
            result["title"] = f"[模拟] {creative[:15]}..."
            return result

        prompt = self._build_prompt(creative, total_duration, style_reference)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000
        )

        result = self._parse_response(response.choices[0].message.content)

        shots = []
        for shot_data in result["shots"]:
            shots.append(Shot(**shot_data))

        return {
            "title": result.get("title", "未命名视频"),
            "creative": creative,
            "total_duration": total_duration,
            "shots": shots,
            "overall_pace_analysis": result.get("overall_pace_analysis", ""),
            "transition_suggestions": result.get("transition_suggestions", "")
        }

    def modify_shot(self, storyboard: Dict[str, Any], shot_index: int, modification_request: str) -> Shot:
        if shot_index < 0 or shot_index >= len(storyboard["shots"]):
            raise ValueError(f"镜头序号超出范围，共有 {len(storyboard['shots'])} 个镜头")

        original_shot = storyboard["shots"][shot_index]

        if self.use_mock:
            print(f"  [模拟模式] 正在修改镜头 {shot_index + 1}...")
            # 模拟修改
            modified_shot = Shot(
                shot_number=original_shot.shot_number,
                shot_type='特写' if '特写' in modification_request else (
                    '近景' if '近景' in modification_request else original_shot.shot_type
                ),
                description=f"[已修改] {original_shot.description} | 修改要求: {modification_request}",
                dialogue=original_shot.dialogue,
                duration=original_shot.duration,
                pace=original_shot.pace,
                transition=original_shot.transition
            )
            return modified_shot

        prompt = f"""你是一位专业的视频分镜师。请根据修改要求修改指定镜头。

原始分镜信息:
- 视频创意: {storyboard['creative']}
- 总时长: {storyboard['total_duration']}秒

原始镜头:
{{
    "shot_number": {original_shot.shot_number},
    "shot_type": "{original_shot.shot_type}",
    "description": "{original_shot.description}",
    "dialogue": "{original_shot.dialogue}",
    "duration": {original_shot.duration},
    "pace": "{original_shot.pace}",
    "transition": "{original_shot.transition}"
}}

修改要求: {modification_request}

请输出修改后的镜头JSON，保持相同的结构。只返回JSON，不要其他内容。"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )

        modified_data = self._parse_response(response.choices[0].message.content)
        return Shot(**modified_data)

    def shots_to_dicts(self, shots: List[Shot]) -> List[Dict[str, Any]]:
        return [asdict(shot) for shot in shots]
