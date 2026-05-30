"""
历史记录管理模块 - 加载和管理历史对话记录
"""

import os
import json
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from .models import Script, Character


class HistoryManager:
    def __init__(self, history_dir: str = "./history"):
        self.history_dir = history_dir
        self._ensure_dir()

    def _ensure_dir(self):
        if not os.path.exists(self.history_dir):
            os.makedirs(self.history_dir, exist_ok=True)

    def save_script(self, script: Script, filename: Optional[str] = None) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            char_names = "_".join([c.name for c in script.characters])
            filename = f"{timestamp}_{char_names}_v{script.version}.json"

        filepath = os.path.join(self.history_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(script.to_json())

        return filepath

    def load_script(self, filepath: str) -> Optional[Script]:
        if not os.path.exists(filepath):
            filepath = os.path.join(self.history_dir, filepath)

        if not os.path.exists(filepath):
            return None

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        try:
            return Script.from_json(content)
        except json.JSONDecodeError:
            return None

    def list_history(self) -> List[str]:
        if not os.path.exists(self.history_dir):
            return []

        files = [f for f in os.listdir(self.history_dir) if f.endswith('.json')]
        files.sort(reverse=True)
        return files

    def get_character_history(
        self,
        character_name: str,
        max_entries: int = 5
    ) -> Tuple[str, List[Script]]:
        scripts = self._find_character_scripts(character_name, max_entries)
        history_text = self._format_history_text(scripts, character_name)
        return history_text, scripts

    def _find_character_scripts(
        self,
        character_name: str,
        max_entries: int
    ) -> List[Script]:
        scripts = []
        history_files = self.list_history()

        for filename in history_files:
            if len(scripts) >= max_entries:
                break

            script = self.load_script(filename)
            if script and any(c.name == character_name for c in script.characters):
                scripts.append(script)

        return scripts

    def _format_history_text(
        self,
        scripts: List[Script],
        character_name: str
    ) -> str:
        if not scripts:
            return ""

        lines = []
        for script in scripts:
            lines.append(f"--- 场景: {script.scene} ---")
            for line in script.dialogue:
                if line.speaker == character_name:
                    lines.append(line.format_with_emotion())
            lines.append("")

        return "\n".join(lines)

    def extract_character_style(
        self,
        character_name: str,
        generator
    ) -> Dict:
        history_text, _ = self.get_character_history(character_name)
        if not history_text:
            return {}

        return generator.extract_character_style(history_text)

    def save_character_profile(self, character: Character, style_data: Dict):
        char_dir = os.path.join(self.history_dir, "characters")
        os.makedirs(char_dir, exist_ok=True)

        filepath = os.path.join(char_dir, f"{character.name}_profile.json")
        data = {
            "character": character.to_dict(),
            "style": style_data,
            "updated_at": datetime.now().isoformat()
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_character_profile(self, character_name: str) -> Optional[Dict]:
        char_dir = os.path.join(self.history_dir, "characters")
        filepath = os.path.join(char_dir, f"{character_name}_profile.json")

        if not os.path.exists(filepath):
            return None

        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def parse_text_history(self, text_content: str) -> List[Dict]:
        pattern = r'(\w+)[（(]([^）)]+)[）)][：:](.+)'
        lines = text_content.strip().split('\n')
        parsed = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            match = re.match(pattern, line)
            if match:
                parsed.append({
                    "speaker": match.group(1),
                    "emotion": match.group(2),
                    "text": match.group(3)
                })
            else:
                simple_pattern = r'(\w+)：(.+)'
                match = re.match(simple_pattern, line)
                if match:
                    parsed.append({
                        "speaker": match.group(1),
                        "emotion": "",
                        "text": match.group(2)
                    })

        return parsed

    def import_text_history(
        self,
        text_filepath: str,
        scene: str,
        character1: Character,
        character2: Character
    ) -> Optional[Script]:
        if not os.path.exists(text_filepath):
            return None

        with open(text_filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        parsed_lines = self.parse_text_history(content)
        if not parsed_lines:
            return None

        from .models import DialogueLine, Sentiment

        dialogue_lines = []
        for idx, line_data in enumerate(parsed_lines):
            dialogue_lines.append(DialogueLine(
                line_index=idx,
                speaker=line_data["speaker"],
                text=line_data["text"],
                emotion=line_data["emotion"],
                sentiment=Sentiment()
            ))

        script = Script(
            scene=scene,
            characters=[character1, character2],
            dialogue=dialogue_lines,
            version=1
        )

        self.save_script(script)
        return script
