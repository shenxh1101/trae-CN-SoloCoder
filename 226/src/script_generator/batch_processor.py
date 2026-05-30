"""
批量处理模块 - 支持从文件批量读取场景并生成对话
"""

import os
import json
import csv
import yaml
from typing import List, Dict, Optional
from .models import Script, Character
from .generator import DialogueGenerator
from .exporter import Exporter


class BatchProcessor:
    def __init__(self, config_path: Optional[str] = None, test_connection: bool = True):
        self.generator = DialogueGenerator(config_path, test_connection=test_connection)
        self.exporter = Exporter()

    def load_scenes_from_file(self, filepath: str) -> List[Dict]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"场景文件不存在: {filepath}")

        ext = os.path.splitext(filepath)[1].lower()

        if ext == '.json':
            return self._load_json(filepath)
        elif ext == '.csv':
            return self._load_csv(filepath)
        elif ext in ['.yaml', '.yml']:
            return self._load_yaml(filepath)
        elif ext == '.txt':
            return self._load_txt(filepath)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

    def _load_json(self, filepath: str) -> List[Dict]:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'scenes' in data:
            return data['scenes']
        else:
            return [data]

    def _load_csv(self, filepath: str) -> List[Dict]:
        scenes = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                scene = {
                    "scene": row.get('scene', row.get('场景', '')),
                    "character1": {
                        "name": row.get('char1_name', row.get('角色1', '')),
                        "personality": row.get('char1_personality', row.get('角色1性格', ''))
                    },
                    "character2": {
                        "name": row.get('char2_name', row.get('角色2', '')),
                        "personality": row.get('char2_personality', row.get('角色2性格', ''))
                    },
                    "min_turns": int(row.get('min_turns', row.get('最少轮数', 4))),
                    "max_turns": int(row.get('max_turns', row.get('最多轮数', 6))),
                    "num_versions": int(row.get('num_versions', row.get('版本数', 1)))
                }
                if scene['scene'] and scene['character1']['name']:
                    scenes.append(scene)
        return scenes

    def _load_yaml(self, filepath: str) -> List[Dict]:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'scenes' in data:
            return data['scenes']
        else:
            return [data]

    def _load_txt(self, filepath: str) -> List[Dict]:
        scenes = []
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        blocks = content.strip().split('\n\n')

        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                scene = {
                    "scene": lines[0].strip(),
                    "character1": {
                        "name": lines[1].split('：')[0].strip(),
                        "personality": lines[1].split('：')[1].strip() if '：' in lines[1] else ''
                    },
                    "character2": {
                        "name": lines[2].split('：')[0].strip(),
                        "personality": lines[2].split('：')[1].strip() if '：' in lines[2] else ''
                    },
                    "min_turns": 4,
                    "max_turns": 6,
                    "num_versions": 1
                }
                scenes.append(scene)

        return scenes

    def process_batch(
        self,
        scenes_file: str,
        output_format: str = "json",
        output_dir: Optional[str] = None
    ) -> List[Script]:
        scenes = self.load_scenes_from_file(scenes_file)
        all_scripts = []

        print(f"\n开始批量处理 {len(scenes)} 个场景...\n")

        for idx, scene_data in enumerate(scenes, 1):
            print(f"[{idx}/{len(scenes)}] 正在生成: {scene_data.get('scene', '未知场景')}")

            character1 = Character.from_dict(scene_data.get('character1', {}))
            character2 = Character.from_dict(scene_data.get('character2', {}))

            scripts = self.generator.generate_script(
                scene=scene_data.get('scene', ''),
                character1=character1,
                character2=character2,
                min_turns=scene_data.get('min_turns', 4),
                max_turns=scene_data.get('max_turns', 6),
                include_emotion=scene_data.get('include_emotion', True),
                num_versions=scene_data.get('num_versions', 1)
            )

            all_scripts.extend(scripts)

            for script in scripts:
                if output_dir:
                    self.exporter.output_dir = output_dir
                self.exporter.export(script, output_format)
                print(f"  ✓ 已导出版本 {script.version}")

        print(f"\n批量处理完成！共生成 {len(all_scripts)} 个剧本。")
        return all_scripts

    def generate_crossover_batch(
        self,
        characters_file: str,
        scenario_template: str = "两个角色在神秘空间相遇",
        min_turns: int = 4,
        max_turns: int = 6,
        num_versions: int = 1
    ) -> List[Script]:
        with open(characters_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        characters = [Character.from_dict(c) for c in data.get('characters', [])]

        if len(characters) < 2:
            raise ValueError("至少需要2个角色才能进行梦幻联动")

        all_scripts = []

        for i in range(len(characters)):
            for j in range(i + 1, len(characters)):
                char1 = characters[i]
                char2 = characters[j]

                scenario = scenario_template.format(
                    char1=char1.name,
                    char2=char2.name,
                    source1=char1.source,
                    source2=char2.source
                )

                print(f"\n正在生成梦幻联动: {char1.name} x {char2.name}")

                scripts = self.generator.generate_crossover(
                    character1=char1,
                    character2=char2,
                    scenario=scenario,
                    min_turns=min_turns,
                    max_turns=max_turns,
                    num_versions=num_versions
                )

                all_scripts.extend(scripts)

                for script in scripts:
                    self.exporter.export(script, 'json')
                    print(f"  ✓ 已导出: {script.scene}")

        return all_scripts
