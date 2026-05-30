#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import csv
import random
import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional

try:
    from pypinyin import pinyin, Style
    PYPINYIN_AVAILABLE = True
except ImportError:
    PYPINYIN_AVAILABLE = False

try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


CONFIG_DIR = os.path.expanduser("~/.couplet_tool")
COUPLET_LIB_PATH = os.path.join(CONFIG_DIR, "couplet_library.json")
GENERATION_HISTORY_PATH = os.path.join(CONFIG_DIR, "generation_history.json")
TRAINING_DATA_PATH = os.path.join(CONFIG_DIR, "training_data.json")
CONFIG_PATH = os.path.join(CONFIG_DIR, "config.json")

DEFAULT_CONFIG = {
    "model": {
        "provider": "mock",
        "api_url": "",
        "api_key": "",
        "temperature": 0.7,
        "top_k": 50,
        "top_p": 0.9,
        "max_length": 32
    },
    "scoring": {
        "min_rating_to_save": 4
    }
}

PINGZE_MAP = {}


def _init_pingze_map():
    ze_tones = ['3', '4']
    ping_tones = ['1', '2']
    PINGZE_MAP['ze'] = ze_tones
    PINGZE_MAP['ping'] = ping_tones


def get_tone(pinyin_str: str) -> str:
    if not pinyin_str:
        return 'unknown'
    last_char = pinyin_str[-1]
    if last_char.isdigit():
        if last_char in ['1', '2']:
            return 'ping'
        elif last_char in ['3', '4']:
            return 'ze'
    return 'neutral'


def ensure_config_dir():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
    for path in [COUPLET_LIB_PATH, GENERATION_HISTORY_PATH, TRAINING_DATA_PATH]:
        if not os.path.exists(path):
            with open(path, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)


def load_config() -> Dict:
    ensure_config_dir()
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_config(config: Dict):
    ensure_config_dir()
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def load_json_file(path: str) -> List:
    ensure_config_dir()
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        if not content:
            return []
        return json.loads(content)


def save_json_file(path: str, data: List):
    ensure_config_dir()
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class CoupletGenerator:
    def __init__(self, config: Dict):
        self.config = config
        self.provider = config['model']['provider']

    def generate(self,上联: str, num_candidates: int = 5,
                 temperature: Optional[float] = None,
                 top_k: Optional[int] = None) -> List[str]:
        temp = temperature if temperature is not None else self.config['model']['temperature']
        tk = top_k if top_k is not None else self.config['model']['top_k']

        if self.provider == 'mock':
            return self._mock_generate(上联, num_candidates, temp)
        elif self.provider == 'api':
            return self._api_generate(上联, num_candidates, temp, tk)
        elif self.provider == 'local':
            return self._local_generate(上联, num_candidates, temp, tk)
        else:
            return self._mock_generate(上联, num_candidates, temp)

    def _mock_generate(self,上联: str, num_candidates: int, temperature: float) -> List[str]:
        candidates = []
        templates = [
            "春风得意马蹄疾",
            "岁月如歌梦亦香",
            "江山如画志弥坚",
            "日月同辉福满堂",
            "桃李争春燕归来",
            "梅雪迎春岁吉祥",
            "天地同心国运昌",
            "龙凤呈祥喜事多",
            "松柏常青岁久长",
            "云霞似锦画难工"
        ]

        keywords = self._extract_keywords(上联)

        for i in range(num_candidates):
            if temperature > 0.8 and keywords:
                idx = random.randint(0, len(templates) - 1)
                candidate = self._modify_with_keyword(templates[idx], keywords)
            else:
                idx = (len(上联) + i) % len(templates)
                candidate = templates[idx]

            if candidate not in candidates:
                candidates.append(candidate)

        while len(candidates) < num_candidates:
            idx = random.randint(0, len(templates) - 1)
            if templates[idx] not in candidates:
                candidates.append(templates[idx])

        return candidates[:num_candidates]

    def _extract_keywords(self, text: str) -> List[str]:
        if JIEBA_AVAILABLE:
            return list(jieba.cut(text))
        return list(text)

    def _modify_with_keyword(self, template: str, keywords: List[str]) -> str:
        if keywords and len(template) > 0:
            kw = random.choice(keywords)
            pos = random.randint(0, len(template) - 1)
            chars = list(template)
            chars[pos] = kw[0] if kw else chars[pos]
            return ''.join(chars)
        return template

    def _api_generate(self,上联: str, num_candidates: int, temperature: float, top_k: int) -> List[str]:
        if not REQUESTS_AVAILABLE:
            print("⚠️  requests库未安装，使用模拟生成模式")
            return self._mock_generate(上联, num_candidates, temperature)

        api_url = self.config['model']['api_url']
        api_key = self.config['model']['api_key']

        if not api_url:
            print("⚠️  API地址未配置，使用模拟生成模式")
            return self._mock_generate(上联, num_candidates, temperature)

        try:
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            payload = {
                "prompt": f"请为以下上联生成{num_candidates}个下联：{上联}",
                "temperature": temperature,
                "top_k": top_k,
                "max_length": self.config['model']['max_length'],
                "num_return_sequences": num_candidates
            }

            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()

            candidates = []
            if isinstance(data, dict):
                if 'candidates' in data:
                    candidates = data['candidates']
                elif 'output' in data:
                    candidates = [data['output']]
                elif 'choices' in data:
                    candidates = [c.get('text', c.get('message', {}).get('content', '')) for c in data['choices']]

            candidates = [c.strip() for c in candidates if c.strip()]

            if not candidates:
                return self._mock_generate(上联, num_candidates, temperature)

            return candidates[:num_candidates]

        except Exception as e:
            print(f"⚠️  API调用失败: {e}，使用模拟生成模式")
            return self._mock_generate(上联, num_candidates, temperature)

    def _local_generate(self,上联: str, num_candidates: int, temperature: float, top_k: int) -> List[str]:
        print("⚠️  本地模型功能需要额外的模型文件，使用模拟生成模式")
        return self._mock_generate(上联, num_candidates, temperature)


class QualityScorer:
    def __init__(self):
        _init_pingze_map()

    def get_pinyin(self, text: str) -> List[List[str]]:
        if PYPINYIN_AVAILABLE:
            return pinyin(text, style=Style.TONE3)
        return [[c + '1'] for c in text]

    def analyze_pingze(self, text: str) -> List[str]:
        pinyin_list = self.get_pinyin(text)
        return [get_tone(pl[0] if pl else '') for pl in pinyin_list]

    def score_pingze(self,上联: str,下联: str) -> Tuple[float, str]:
        up_pattern = self.analyze_pingze(上联)
        down_pattern = self.analyze_pingze(下联)

        if len(up_pattern) != len(down_pattern):
            return 50.0, "上下联字数不匹配"

        matches = 0
        total = len(up_pattern)
        details = []

        for i, (up, down) in enumerate(zip(up_pattern, down_pattern)):
            if up == 'unknown' or down == 'unknown':
                total -= 1
                details.append(f"{i+1}字：无法判断")
            elif up != down:
                matches += 1
                details.append(f"{i+1}字：{up}→{down} ✓")
            else:
                details.append(f"{i+1}字：{up}→{down} ✗")

        if total == 0:
            return 60.0, "无法判断平仄"

        score = (matches / total) * 100
        detail_str = "\n  ".join(details)
        return score, f"平仄交替匹配度: {matches}/{total}\n  {detail_str}"

    def analyze_pos(self, text: str) -> List[str]:
        if JIEBA_AVAILABLE:
            import jieba.posseg as pseg
            words = pseg.cut(text)
            return [w.flag for w in words]
        return ['n'] * len(text)

    def score_pos(self,上联: str,下联: str) -> Tuple[float, str]:
        up_pos = self.analyze_pos(上联)
        down_pos = self.analyze_pos(下联)

        up_words = list(jieba.cut(上联)) if JIEBA_AVAILABLE else list(上联)
        down_words = list(jieba.cut(下联)) if JIEBA_AVAILABLE else list(下联)

        if len(up_pos) != len(down_pos):
            return 50.0, f"分词后词数不匹配（上联{len(up_pos)}词，下联{len(down_pos)}词）"

        matches = 0
        total = len(up_pos)
        details = []

        pos_map = {
            'n': ['n', 'nr', 'ns', 'nt', 'nl', 'nz'],
            'v': ['v', 'vd', 'vn', 'vshi', 'vyou', 'vf', 'vx', 'vi', 'vl', 'vg'],
            'adj': ['a', 'ad', 'an', 'ag', 'al'],
            'adv': ['d', 'dg', 'dl'],
            'num': ['m', 'mq'],
            'q': ['q', 'qv', 'qt'],
            'pron': ['r', 'rr', 'rz', 'rzt', 'rzs', 'rzv', 'ry', 'ryt', 'rys', 'ryv', 'rg'],
            'prep': ['p', 'pba', 'pbei'],
            'conj': ['c', 'cc'],
            'aux': ['u', 'uzhe', 'ule', 'uguo', 'ude1', 'ude2', 'ude3', 'usuo', 'udeng', 'uyy', 'udh', 'uls', 'uzhi', 'ulian'],
            't': ['t', 'tg'],
            's': ['s'],
            'f': ['f'],
            'b': ['b'],
            'z': ['z'],
        }

        for i, (up, down) in enumerate(zip(up_pos, down_pos)):
            up_group = self._get_pos_group(up, pos_map)
            down_group = self._get_pos_group(down, pos_map)
            if up_group == down_group:
                matches += 1
                status = "✓"
            else:
                status = "✗"
            up_word = up_words[i] if i < len(up_words) else '?'
            down_word = down_words[i] if i < len(down_words) else '?'
            details.append(f"{i+1}词：{up_word}({up}) → {down_word}({down}) {status}")

        score = (matches / total) * 100
        detail_str = "\n  ".join(details)
        return score, f"词性匹配度: {matches}/{total}\n  {detail_str}"

    def _get_pos_group(self, pos: str, pos_map: Dict) -> str:
        for group, tags in pos_map.items():
            if pos in tags:
                return group
        return 'other'

    def score_overall(self,上联: str,下联: str) -> Dict:
        pingze_score, pingze_detail = self.score_pingze(上联,下联)
        pos_score, pos_detail = self.score_pos(上联,下联)

        overall = pingze_score * 0.5 + pos_score * 0.5

        if len(上联) != len(下联):
            overall *= 0.8

        return {
            "overall": round(overall, 2),
            "pingze_score": round(pingze_score, 2),
            "pos_score": round(pos_score, 2),
            "pingze_detail": pingze_detail,
            "pos_detail": pos_detail,
            "length_match": len(上联) == len(下联)
        }


def generate_couplet(args):
    config = load_config()
    generator = CoupletGenerator(config)
    scorer = QualityScorer()

    candidates = generator.generate(
        args.input,
        num_candidates=args.num_candidates,
        temperature=args.temperature,
        top_k=args.top_k
    )

    print(f"\n📜 上联：{args.input}")
    print(f"\n🎯 生成的下联候选：\n")

    rated_candidates = []
    for i, candidate in enumerate(candidates, 1):
        quality = scorer.score_overall(args.input, candidate)
        rated_candidates.append({
            "candidate": candidate,
            "quality": quality
        })

        print(f"  [{i}] {candidate}")
        print(f"      质量评分：{quality['overall']}/100  "
              f"(平仄：{quality['pingze_score']}/100, "
              f"词性：{quality['pos_score']}/100, "
              f"字数匹配：{'✓' if quality['length_match'] else '✗'})")
        if args.verbose:
            print(f"      {quality['pingze_detail']}")
            print(f"      {quality['pos_detail']}")
        print()

    if not args.no_interactive:
        ratings = []
        for i, item in enumerate(rated_candidates, 1):
            while True:
                try:
                    r = input(f"请为第[{i}]个下联评分（1-5星，输入0跳过）：").strip()
                    if r == '0':
                        break
                    rating = int(r)
                    if 1 <= rating <= 5:
                        ratings.append({
                            "index": i,
                            "下联": item['candidate'],
                            "rating": rating,
                            "quality": item['quality']
                        })
                        break
                    else:
                        print("请输入1-5之间的数字")
                except ValueError:
                    print("请输入有效的数字")

        if ratings:
            save_to_library(args.input, ratings, config)
            save_to_history(args.input, rated_candidates, ratings)

    return rated_candidates


def save_to_library(上联: str, ratings: List[Dict], config: Dict):
    library = load_json_file(COUPLET_LIB_PATH)
    min_rating = config['scoring']['min_rating_to_save']

    saved_count = 0
    for item in ratings:
        if item['rating'] >= min_rating:
            entry = {
                "上联": 上联,
                "下联": item['下联'],
                "rating": item['rating'],
                "quality": item['quality'],
                "created_at": datetime.now().isoformat()
            }
            library.append(entry)
            saved_count += 1

    save_json_file(COUPLET_LIB_PATH, library)
    print(f"\n💾 已保存 {saved_count} 个高分对联到本地库")


def save_to_history(上联: str, candidates: List[Dict], ratings: List[Dict]):
    history = load_json_file(GENERATION_HISTORY_PATH)

    rating_map = {r['index']: r for r in ratings}
    history_entry = {
        "上联": 上联,
        "timestamp": datetime.now().isoformat(),
        "candidates": [
            {
                "下联": c['candidate'],
                "quality": c['quality'],
                "rating": rating_map.get(i+1, {}).get('rating', None)
            }
            for i, c in enumerate(candidates)
        ]
    }

    history.append(history_entry)
    save_json_file(GENERATION_HISTORY_PATH, history)


def random_recommend(args):
    library = load_json_file(COUPLET_LIB_PATH)

    if not library:
        print("📚 本地库为空，请先生成并保存一些对联")
        return

    count = min(args.count, len(library))
    samples = random.sample(library, count)

    print(f"\n🎲 为您推荐 {count} 副对联：\n")
    for i, entry in enumerate(samples, 1):
        print(f"  [{i}] 上联：{entry['上联']}")
        print(f"      下联：{entry['下联']}")
        print(f"      用户评分：{'⭐' * entry['rating']} ({entry['rating']}/5)")
        print(f"      质量评分：{entry['quality']['overall']}/100")
        print()


def batch_generate(args):
    if not os.path.exists(args.input_file):
        print(f"❌ 文件不存在：{args.input_file}")
        return

    with open(args.input_file, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    if not lines:
        print("❌ 输入文件为空")
        return

    config = load_config()
    generator = CoupletGenerator(config)
    scorer = QualityScorer()
    results = []

    print(f"\n📦 开始批量生成，共 {len(lines)} 个上联\n")

    for idx, line in enumerate(lines, 1):
        print(f"[{idx}/{len(lines)}] 处理：{line}")
        candidates = generator.generate(
            line,
            num_candidates=args.num_candidates,
            temperature=args.temperature,
            top_k=args.top_k
        )

        for candidate in candidates:
            quality = scorer.score_overall(line, candidate)
            results.append({
                "上联": line,
                "下联": candidate,
                "quality_overall": quality['overall'],
                "pingze_score": quality['pingze_score'],
                "pos_score": quality['pos_score'],
                "length_match": quality['length_match']
            })

    if args.output:
        output_path = args.output
    else:
        output_path = f"batch_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "上联", "下联", "quality_overall", "pingze_score",
            "pos_score", "length_match"
        ])
        writer.writeheader()
        writer.writerows(results)

    print(f"\n✅ 批量生成完成，共生成 {len(results)} 个结果")
    print(f"📄 结果已保存到：{output_path}")

    return results


def export_csv(args):
    history = load_json_file(GENERATION_HISTORY_PATH)

    if not history:
        print("📭 没有生成记录可导出")
        return

    rows = []
    for entry in history:
        for cand in entry['candidates']:
            rows.append({
                "timestamp": entry['timestamp'],
                "上联": entry['上联'],
                "下联": cand['下联'],
                "quality_overall": cand['quality']['overall'],
                "pingze_score": cand['quality']['pingze_score'],
                "pos_score": cand['quality']['pos_score'],
                "length_match": cand['quality']['length_match'],
                "user_rating": cand.get('rating', '')
            })

    output_path = args.output or f"couplet_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "timestamp", "上联", "下联", "quality_overall",
            "pingze_score", "pos_score", "length_match", "user_rating"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✅ 已导出 {len(rows)} 条记录到：{output_path}")


def analyze_couplet(args):
    scorer = QualityScorer()

    if not args.下联:
        print("📊 分析上联：\n")
        pinyin_list = scorer.get_pinyin(args.上联)
        pingze = scorer.analyze_pingze(args.上联)

        print(f"  汉字：{' '.join(list(args.上联))}")
        print(f"  拼音：{' '.join([pl[0] if pl else '?' for pl in pinyin_list])}")
        print(f"  平仄：{' '.join(pingze)}")

        if JIEBA_AVAILABLE:
            import jieba.posseg as pseg
            words = pseg.cut(args.上联)
            print(f"  分词：{' | '.join([f'{w.word}({w.flag})' for w in words])}")
    else:
        print(f"📊 对联分析：\n")
        print(f"  上联：{args.上联}")
        print(f"  下联：{args.下联}\n")

        quality = scorer.score_overall(args.上联, args.下联)

        print(f"  综合质量评分：{quality['overall']}/100")
        print(f"  平仄评分：{quality['pingze_score']}/100")
        print(f"  {quality['pingze_detail']}")
        print()
        print(f"  词性评分：{quality['pos_score']}/100")
        print(f"  {quality['pos_detail']}")
        print()
        print(f"  字数匹配：{'✓' if quality['length_match'] else '✗'}")


def add_pinyin_annotation(text: str) -> Dict:
    scorer = QualityScorer()
    pinyin_list = scorer.get_pinyin(text)
    pingze = scorer.analyze_pingze(text)

    return {
        "text": text,
        "characters": list(text),
        "pinyin": [pl[0] if pl else '?' for pl in pinyin_list],
        "pingze": pingze
    }


def annotate_text(args):
    result = add_pinyin_annotation(args.text)

    print(f"\n📝 标注结果：\n")
    print(f"  原文：{result['text']}")
    print(f"  汉字：{' '.join(result['characters'])}")
    print(f"  拼音：{' '.join(result['pinyin'])}")
    print(f"  平仄：{' '.join(result['pingze'])}")

    if args.segment and JIEBA_AVAILABLE:
        words = jieba.cut(args.text)
        print(f"  分词：{' | '.join(words)}")

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 标注结果已保存到：{args.output}")


def export_training_data(args):
    history = load_json_file(GENERATION_HISTORY_PATH)
    library = load_json_file(COUPLET_LIB_PATH)

    training_data = load_json_file(TRAINING_DATA_PATH)

    for entry in history:
        for cand in entry['candidates']:
            if cand.get('rating') and cand['rating'] >= 4:
                sample = {
                    "上联": entry['上联'],
                    "下联": cand['下联'],
                    "rating": cand['rating'],
                    "quality": cand['quality'],
                    "timestamp": entry['timestamp'],
                    "source": "history"
                }
                if not any(t['上联'] == sample['上联'] and t['下联'] == sample['下联'] for t in training_data):
                    training_data.append(sample)

    for entry in library:
        sample = {
            "上联": entry['上联'],
            "下联": entry['下联'],
            "rating": entry['rating'],
            "quality": entry['quality'],
            "timestamp": entry['created_at'],
            "source": "library"
        }
        if not any(t['上联'] == sample['上联'] and t['下联'] == sample['下联'] for t in training_data):
            training_data.append(sample)

    save_json_file(TRAINING_DATA_PATH, training_data)

    formatted_data = []
    for item in training_data:
        formatted_data.append({
            "instruction": "对出下联",
            "input": item['上联'],
            "output": item['下联'],
            "rating": item['rating'],
            "quality_score": item['quality']['overall']
        })

    if args.format == 'jsonl':
        output_path = args.output or f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        with open(output_path, 'w', encoding='utf-8') as f:
            for item in formatted_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
    else:
        output_path = args.output or f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已导出 {len(formatted_data)} 条训练数据到：{output_path}")
    print(f"📁 原始训练数据也已保存到：{TRAINING_DATA_PATH}")


def show_config(args):
    config = load_config()
    print("\n⚙️  当前配置：\n")
    print(json.dumps(config, ensure_ascii=False, indent=2))
    print()


def set_config(args):
    config = load_config()

    keys = args.key.split('.')
    current = config
    for k in keys[:-1]:
        if k not in current:
            current[k] = {}
        current = current[k]

    value = args.value
    if value.lower() in ['true', 'false']:
        value = value.lower() == 'true'
    else:
        try:
            if '.' in value:
                value = float(value)
            else:
                value = int(value)
        except ValueError:
            pass

    current[keys[-1]] = value
    save_config(config)
    print(f"✅ 已设置 {args.key} = {value}")


def segment_text(args):
    if not JIEBA_AVAILABLE:
        print("⚠️  jieba库未安装，无法进行分词")
        return

    words = list(jieba.cut(args.text))
    print(f"\n✂️  断句结果：\n")
    print(f"  原文：{args.text}")
    print(f"  分词：{' | '.join(words)}")
    print(f"  词数：{len(words)}")

    if args.with_pos:
        import jieba.posseg as pseg
        words_pos = pseg.cut(args.text)
        print(f"  词性：{' | '.join([f'{w.word}({w.flag})' for w in words_pos])}")

    if args.output:
        result = {
            "text": args.text,
            "segments": words
        }
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 结果已保存到：{args.output}")


def main():
    parser = argparse.ArgumentParser(
        description="AI对联生成辅助工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法：
  %(prog)s generate "春风得意马蹄疾"              # 生成下联
  %(prog)s generate "春" -n 10 --temp 0.9        # 高创造性生成10个
  %(prog)s recommend -n 5                         # 随机推荐5副对联
  %(prog)s batch input.txt -o output.csv          # 批量生成
  %(prog)s analyze "上联" "下联"                   # 分析对联质量
  %(prog)s annotate "春风得意" --segment          # 拼音标注和断句
  %(prog)s export-csv -o history.csv              # 导出历史记录
  %(prog)s export-training                        # 导出训练数据
  %(prog)s config model.temperature 0.8           # 设置配置
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    gen_parser = subparsers.add_parser('generate', help='生成下联')
    gen_parser.add_argument('input', help='上联或关键词')
    gen_parser.add_argument('-n', '--num-candidates', type=int, default=5, help='候选数量（默认：5）')
    gen_parser.add_argument('--temp', '--temperature', dest='temperature', type=float, default=None,
                            help='温度参数，越高越有创造性（0.1-1.5）')
    gen_parser.add_argument('--top-k', dest='top_k', type=int, default=None,
                            help='Top-K采样参数（默认：50）')
    gen_parser.add_argument('--no-interactive', action='store_true', help='非交互模式，不提示评分')
    gen_parser.add_argument('-v', '--verbose', action='store_true', help='显示详细分析')

    rec_parser = subparsers.add_parser('recommend', help='随机推荐对联')
    rec_parser.add_argument('-n', '--count', type=int, default=3, help='推荐数量（默认：3）')

    batch_parser = subparsers.add_parser('batch', help='批量生成')
    batch_parser.add_argument('input_file', help='包含上联的文本文件，每行一个')
    batch_parser.add_argument('-o', '--output', help='输出CSV文件路径')
    batch_parser.add_argument('-n', '--num-candidates', type=int, default=3, help='每个上联的候选数量')
    batch_parser.add_argument('--temp', '--temperature', dest='temperature', type=float, default=None)
    batch_parser.add_argument('--top-k', dest='top_k', type=int, default=None)

    analyze_parser = subparsers.add_parser('analyze', help='分析对联质量')
    analyze_parser.add_argument('上联', help='上联')
    analyze_parser.add_argument('下联', nargs='?', help='下联（可选，只分析上联时省略）')

    annotate_parser = subparsers.add_parser('annotate', help='拼音标注')
    annotate_parser.add_argument('text', help='要标注的文本')
    annotate_parser.add_argument('--segment', action='store_true', help='同时进行分词')
    annotate_parser.add_argument('-o', '--output', help='输出JSON文件路径')

    segment_parser = subparsers.add_parser('segment', help='自动断句')
    segment_parser.add_argument('text', help='要断句的文本')
    segment_parser.add_argument('--with-pos', action='store_true', help='显示词性')
    segment_parser.add_argument('-o', '--output', help='输出JSON文件路径')

    export_csv_parser = subparsers.add_parser('export-csv', help='导出历史记录为CSV')
    export_csv_parser.add_argument('-o', '--output', help='输出CSV文件路径')

    train_parser = subparsers.add_parser('export-training', help='导出训练数据')
    train_parser.add_argument('-f', '--format', choices=['json', 'jsonl'], default='json', help='输出格式')
    train_parser.add_argument('-o', '--output', help='输出文件路径')

    config_parser = subparsers.add_parser('config', help='配置管理')
    config_parser.add_argument('action', choices=['show', 'set'], help='操作')
    config_parser.add_argument('key', nargs='?', help='配置键，如 model.temperature')
    config_parser.add_argument('value', nargs='?', help='配置值')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    ensure_config_dir()

    if args.command == 'generate':
        generate_couplet(args)
    elif args.command == 'recommend':
        random_recommend(args)
    elif args.command == 'batch':
        batch_generate(args)
    elif args.command == 'analyze':
        analyze_couplet(args)
    elif args.command == 'annotate':
        annotate_text(args)
    elif args.command == 'segment':
        segment_text(args)
    elif args.command == 'export-csv':
        export_csv(args)
    elif args.command == 'export-training':
        export_training_data(args)
    elif args.command == 'config':
        if args.action == 'show':
            show_config(args)
        elif args.action == 'set' and args.key and args.value:
            set_config(args)
        else:
            config_parser.print_help()


if __name__ == '__main__':
    main()
