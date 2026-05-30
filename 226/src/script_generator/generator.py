"""
对话生成核心模块 - 处理剧本生成逻辑
"""

import json
import re
from typing import List, Dict, Optional, Tuple
from colorama import Fore, Style
from .models import Script, Character, DialogueLine, Sentiment
from .llm_client import LLMClient
from .prompts import PromptTemplates


class DialogueGenerator:
    def __init__(self, config_path: Optional[str] = None, test_connection: bool = True):
        self.llm_client = LLMClient(config_path, test_connection=test_connection)
        self.templates = PromptTemplates()

    def generate_script(
        self,
        scene: str,
        character1: Character,
        character2: Character,
        min_turns: int = 4,
        max_turns: int = 6,
        include_emotion: bool = True,
        num_versions: int = 1,
        character_history: Optional[str] = None,
        mood_reference: Optional[str] = None
    ) -> List[Script]:
        scripts = []

        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  开始生成对话剧本{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"  场景: {scene}")
        print(f"  角色1: {character1.name} - {character1.personality}")
        print(f"  角色2: {character2.name} - {character2.personality}")
        print(f"  轮数: {min_turns}-{max_turns}轮")
        print(f"  版本数: {num_versions}")
        print(f"{Fore.CYAN}{'-'*60}{Style.RESET_ALL}\n")

        for version in range(1, num_versions + 1):
            print(f"\n{Fore.YELLOW}>>> 正在生成版本 {version}/{num_versions} <<<{Style.RESET_ALL}")
            script = self._generate_single_version(
                scene=scene,
                character1=character1,
                character2=character2,
                min_turns=min_turns,
                max_turns=max_turns,
                include_emotion=include_emotion,
                version=version,
                character_history=character_history,
                mood_reference=mood_reference
            )
            scripts.append(script)
            print(f"  {Fore.GREEN}✓ 版本 {version} 生成完成，共 {len(script.dialogue)} 轮对话{Style.RESET_ALL}")

        print(f"\n{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}  ✓ 全部 {num_versions} 个版本生成完成！{Style.RESET_ALL}")
        print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}\n")

        return scripts

    def generate_crossover(
        self,
        character1: Character,
        character2: Character,
        scenario: str,
        min_turns: int = 4,
        max_turns: int = 6,
        include_emotion: bool = True,
        num_versions: int = 1
    ) -> List[Script]:
        scripts = []

        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  开始生成梦幻联动对话{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"  联动场景: {scenario}")
        print(f"  角色1: {character1.name} (出自: {character1.source})")
        print(f"  角色2: {character2.name} (出自: {character2.source})")
        print(f"  版本数: {num_versions}")
        print(f"{Fore.CYAN}{'-'*60}{Style.RESET_ALL}\n")

        for version in range(1, num_versions + 1):
            print(f"\n{Fore.YELLOW}>>> 正在生成联动版本 {version}/{num_versions} <<<{Style.RESET_ALL}")
            prompt = self.templates.cross_over_generation(
                character1=character1.to_dict(),
                character2=character2.to_dict(),
                scenario=scenario,
                min_turns=min_turns,
                max_turns=max_turns,
                include_emotion=include_emotion
            )

            response = self.llm_client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                response_format="json",
                temperature=0.8 + (version * 0.05)
            )

            script = self._parse_response(
                response=response,
                scene=f"【梦幻联动】{scenario}",
                characters=[character1, character2],
                version=version
            )
            scripts.append(script)
            print(f"  {Fore.GREEN}✓ 版本 {version} 生成完成{Style.RESET_ALL}")

        print(f"\n{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}  ✓ 梦幻联动生成完成！{Style.RESET_ALL}")
        print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}\n")

        return scripts

    def _generate_single_version(
        self,
        scene: str,
        character1: Character,
        character2: Character,
        min_turns: int,
        max_turns: int,
        include_emotion: bool,
        version: int,
        character_history: Optional[str],
        mood_reference: Optional[str]
    ) -> Script:
        prompt = self.templates.dialogue_generation(
            scene=scene,
            character1=character1.to_dict(),
            character2=character2.to_dict(),
            min_turns=min_turns,
            max_turns=max_turns,
            include_emotion=include_emotion,
            character_history=character_history,
            mood_reference=mood_reference
        )

        temperature = 0.7 + (version * 0.1)
        response = self.llm_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            response_format="json",
            temperature=min(temperature, 1.2)
        )

        return self._parse_response(
            response=response,
            scene=scene,
            characters=[character1, character2],
            version=version
        )

    def _parse_response(
        self,
        response: str,
        scene: str,
        characters: List[Character],
        version: int
    ) -> Script:
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            print(f"  {Fore.YELLOW}⚠ JSON解析失败，尝试提取JSON内容...{Style.RESET_ALL}")
            data = self._extract_json(response)

        dialogue_data = data.get("dialogue", [])
        if not dialogue_data:
            print(f"  {Fore.YELLOW}⚠ LLM返回的对话数据为空，可能格式不正确{Style.RESET_ALL}")
            print(f"  原始响应前200字符: {response[:200]}...")

        dialogue_lines = []

        for idx, line_data in enumerate(dialogue_data):
            sentiment_data = line_data.get("sentiment", {})
            sentiment = Sentiment.from_dict(sentiment_data)

            speaker = line_data.get("speaker", "")
            text = line_data.get("text", "")
            emotion = line_data.get("emotion", "")

            if not speaker or not text:
                print(f"  {Fore.YELLOW}⚠ 跳过第{idx+1}行：缺少speaker或text字段{Style.RESET_ALL}")
                continue

            line = DialogueLine(
                line_index=idx,
                speaker=speaker,
                text=text,
                emotion=emotion,
                sentiment=sentiment
            )
            dialogue_lines.append(line)

        overall_arc = data.get("overall_arc", "")

        return Script(
            scene=scene,
            characters=characters,
            dialogue=dialogue_lines,
            version=version,
            overall_arc=overall_arc
        )

    def _extract_json(self, text: str) -> Dict:
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        print(f"  {Fore.RED}✗ 无法从响应中提取JSON{Style.RESET_ALL}")
        return {"dialogue": []}

    def analyze_sentiment(self, script: Script) -> Script:
        print(f"\n{Fore.CYAN}  正在分析对话情感...{Style.RESET_ALL}")
        dialogue_text = "\n".join([line.format_simple() for line in script.dialogue])
        prompt = self.templates.sentiment_analysis(dialogue_text)

        response = self.llm_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            response_format="json"
        )

        try:
            data = json.loads(response)
            analysis = data.get("analysis", [])

            for idx, analysis_data in enumerate(analysis):
                if idx < len(script.dialogue):
                    sentiment_data = analysis_data.get("sentiment", {})
                    script.dialogue[idx].sentiment = Sentiment.from_dict(sentiment_data)

            script.overall_arc = data.get("overall_arc", script.overall_arc)
            print(f"  {Fore.GREEN}✓ 情感分析完成{Style.RESET_ALL}")
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  {Fore.YELLOW}⚠ 情感分析解析失败: {e}{Style.RESET_ALL}")

        return script

    def extract_character_style(self, dialogue_history: str) -> Dict:
        print(f"\n{Fore.CYAN}  正在提取角色风格...{Style.RESET_ALL}")
        prompt = self.templates.style_extraction(dialogue_history)

        response = self.llm_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            response_format="json"
        )

        try:
            result = json.loads(response)
            print(f"  {Fore.GREEN}✓ 角色风格提取完成{Style.RESET_ALL}")
            return result
        except json.JSONDecodeError:
            print(f"  {Fore.YELLOW}⚠ 角色风格解析失败{Style.RESET_ALL}")
            return {}

    def get_api_status(self) -> Dict:
        return self.llm_client.get_config_status()
