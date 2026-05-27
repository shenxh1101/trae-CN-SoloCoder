import re
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict


class TimeParser:
    def __init__(self):
        self.patterns = [
            (re.compile(r'(\d+)\s*天'), 'days'),
            (re.compile(r'(\d+)\s*小时|(\d+)\s*h(?:ours?)?'), 'hours'),
            (re.compile(r'(\d+)\s*分钟|(\d+)\s*分[钟]?|(\d+)\s*m(?:in)?'), 'minutes'),
            (re.compile(r'(\d+)\s*秒钟?|(\d+)\s*秒|(\d+)\s*s(?:ec)?'), 'seconds'),
        ]
        
        self.relative_patterns = [
            (re.compile(r'半\s*个?小时'), {'minutes': 30}),
            (re.compile(r'^半小时'), {'minutes': 30}),
            (re.compile(r'一\s*刻钟|一刻钟'), {'minutes': 15}),
            (re.compile(r'半\s*天'), {'hours': 12}),
            (re.compile(r'一\s*天'), {'days': 1}),
            (re.compile(r'一\s*小时'), {'hours': 1}),
        ]

        self.time_suffixes = ['后', '之后', '以后', '']

        self.command_patterns = [
            re.compile(r'提醒我'),
            re.compile(r'叫我'),
            re.compile(r'通知我'),
        ]

    def parse(self, text: str) -> Optional[Dict]:
        text = text.strip().lower()
        
        name = self._extract_name(text)
        
        result = {
            'days': 0,
            'hours': 0,
            'minutes': 0,
            'seconds': 0,
            'name': name,
            'is_periodic': self._is_periodic(text),
            'has_time': False
        }

        text_normalized = text
        for suffix in ['后', '之后', '以后']:
            if text_normalized.endswith(suffix):
                text_normalized = text_normalized[:-len(suffix)]
                break

        for pattern, amount in self.relative_patterns:
            if pattern.search(text_normalized):
                for key, value in amount.items():
                    result[key] += value
                result['has_time'] = True
                return result if result['has_time'] else None

        for pattern, unit in self.patterns:
            match = pattern.search(text_normalized)
            if match:
                value = int([g for g in match.groups() if g][0])
                result[unit] += value
                result['has_time'] = True

        return result if result['has_time'] else None

    def _extract_name(self, text: str) -> str:
        for pattern in self.command_patterns:
            match = pattern.search(text)
            if match:
                idx = match.end()
                remaining = text[idx:].strip()
                if remaining:
                    time_words = ['天', '小时', '分', '秒', 'h', 'm', 's']
                    for word in time_words:
                        pos = remaining.find(word)
                        if pos > 0:
                            name_part = remaining[:pos]
                            if len(name_part.strip()) > 0:
                                return name_part.strip()
                    return remaining
        return f"提醒_{datetime.now().strftime('%H%M%S')}"

    def _is_periodic(self, text: str) -> bool:
        periodic_keywords = ['每', '循环', '重复', '周期', 'periodic', 'repeat']
        return any(keyword in text for keyword in periodic_keywords)

    def to_seconds(self, parsed: Dict) -> int:
        return (
            parsed['days'] * 86400 +
            parsed['hours'] * 3600 +
            parsed['minutes'] * 60 +
            parsed['seconds']
        )
