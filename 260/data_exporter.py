import json
import hashlib
import re
from pathlib import Path
from datetime import date, datetime
from typing import List, Dict, Any

from config import EXPORT_DIR
from diary_reader import DiaryEntry


class DataExporter:
    def __init__(self, entries: List[DiaryEntry]):
        self.entries = entries
        self.export_dir = EXPORT_DIR
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def export_to_json(self, filename: str = None, anonymize: bool = False) -> str:
        if filename is None:
            filename = f"diary_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        export_path = self.export_dir / filename

        data = self._prepare_export_data(anonymize)

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=self._json_serializer)

        return str(export_path)

    def _prepare_export_data(self, anonymize: bool) -> Dict[str, Any]:
        entries_data = []

        for entry in self.entries:
            entry_dict = {
                "date": entry.date.isoformat(),
                "content": self._anonymize_text(entry.content) if anonymize else entry.content,
                "sentiment_score": entry.sentiment_score,
                "keywords": entry.keywords,
                "categories": entry.categories,
                "word_count": len(entry.content)
            }

            if not anonymize:
                entry_dict["filename"] = entry.filename

            entries_data.append(entry_dict)

        summary = {
            "total_entries": len(self.entries),
            "date_range": {
                "start": min(e.date for e in self.entries).isoformat() if self.entries else None,
                "end": max(e.date for e in self.entries).isoformat() if self.entries else None
            },
            "export_date": datetime.now().isoformat(),
            "anonymized": anonymize,
            "version": "1.0.0"
        }

        return {
            "summary": summary,
            "entries": entries_data
        }

    def _anonymize_text(self, text: str) -> str:
        patterns = [
            (r'\b1[3-9]\d{9}\b', '[PHONE]'),
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),
            (r'\b\d{17}[\dXx]\b', '[ID_CARD]'),
            (r'(https?://\S+)', '[URL]'),
        ]

        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text)

        names = self._extract_potential_names(text)
        for name in names:
            text = text.replace(name, '[NAME]')

        return text

    def _extract_potential_names(self, text: str) -> List[str]:
        name_patterns = [
            r'([张王李赵刘陈杨黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段漕钱汤尹黎易常武乔贺赖龚文][\u4e00-\u9fa5]{1,2})',
        ]

        potential_names = set()
        for pattern in name_patterns:
            matches = re.findall(pattern, text)
            potential_names.update(matches)

        return [name for name in potential_names if len(name) >= 2]

    def export_sentiment_data(self, year: int = None, month: int = None) -> str:
        filename = f"sentiment_data_{year or 'all'}"
        if month:
            filename += f"_{month:02d}"
        filename += ".json"

        export_path = self.export_dir / filename

        if year and month:
            entries = [e for e in self.entries if e.date.year == year and e.date.month == month]
        elif year:
            entries = [e for e in self.entries if e.date.year == year]
        else:
            entries = self.entries

        data = {
            "period": {"year": year, "month": month},
            "sentiment_data": [
                {
                    "date": e.date.isoformat(),
                    "score": e.sentiment_score,
                    "categories": e.categories
                }
                for e in entries if e.sentiment_score is not None
            ]
        }

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(export_path)

    def export_keyword_frequency(self, top_n: int = 100) -> str:
        from trend_analyzer import TrendAnalyzer

        trend_analyzer = TrendAnalyzer()
        all_text = " ".join(e.content for e in self.entries)
        keywords = trend_analyzer.extract_keywords(all_text, top_n)

        data = {
            "export_date": datetime.now().isoformat(),
            "total_entries": len(self.entries),
            "keywords": [
                {"word": kw, "frequency": count}
                for kw, count in keywords
            ]
        }

        filename = f"keyword_frequency_{datetime.now().strftime('%Y%m%d')}.json"
        export_path = self.export_dir / filename

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(export_path)

    def generate_export_hash(self) -> str:
        all_text = "".join(
            f"{e.date.isoformat()}:{e.content}"
            for e in sorted(self.entries, key=lambda x: x.date)
        )
        return hashlib.sha256(all_text.encode('utf-8')).hexdigest()

    def _json_serializer(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
