import os
import re
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from config import DIARY_DIR, DATE_FORMATS, MAX_MISSING_DAYS_FOR_REMINDER


@dataclass
class DiaryEntry:
    date: date
    content: str
    filename: str
    sentiment_score: Optional[float] = None
    keywords: List[str] = field(default_factory=list)
    categories: Dict[str, float] = field(default_factory=dict)
    weather: Optional[str] = None


class DiaryReader:
    def __init__(self, diary_dir: Path = None):
        self.diary_dir = diary_dir or DIARY_DIR
        self.entries: List[DiaryEntry] = []
        self._load_all_diaries()

    def _load_all_diaries(self) -> None:
        try:
            if not self.diary_dir.exists():
                self.diary_dir.mkdir(parents=True, exist_ok=True)
                return
        except OSError as e:
            print(f"Warning: Cannot create diary directory: {e}")
            return

        for file_path in self.diary_dir.glob("*.txt"):
            entry = self._parse_diary_file(file_path)
            if entry:
                self.entries.append(entry)

        self.entries.sort(key=lambda x: x.date)

    def _parse_diary_file(self, file_path: Path) -> Optional[DiaryEntry]:
        try:
            content = file_path.read_text(encoding="utf-8")
            if not content or not content.strip():
                return None
            diary_date = self._extract_date(file_path.stem, content)

            if diary_date is None:
                return None

            return DiaryEntry(
                date=diary_date,
                content=content.strip(),
                filename=file_path.name
            )
        except UnicodeDecodeError:
            print(f"Warning: Cannot decode {file_path} (non-UTF-8 encoding)")
            return None
        except OSError as e:
            print(f"Warning: Cannot read {file_path}: {e}")
            return None
        except Exception as e:
            print(f"Warning: Error parsing {file_path}: {e}")
            return None

    def _extract_date(self, filename: str, content: str) -> Optional[date]:
        for date_format in DATE_FORMATS:
            try:
                return datetime.strptime(filename, date_format).date()
            except ValueError:
                continue

        date_patterns = [
            r'(\d{4})[-_/年](\d{1,2})[-_/月](\d{1,2})',
            r'日期[:：]\s*(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})',
            r'今天是\s*(\d{4})年(\d{1,2})月(\d{1,2})日'
        ]

        for pattern in date_patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    year, month, day = map(int, match.groups())
                    return date(year, month, day)
                except (ValueError, TypeError):
                    continue

        return None

    def get_entries_by_date_range(self, start_date: date, end_date: date) -> List[DiaryEntry]:
        return [
            entry for entry in self.entries
            if start_date <= entry.date <= end_date
        ]

    def get_entries_by_month(self, year: int, month: int) -> List[DiaryEntry]:
        return [
            entry for entry in self.entries
            if entry.date.year == year and entry.date.month == month
        ]

    def get_entries_by_year(self, year: int) -> List[DiaryEntry]:
        return [
            entry for entry in self.entries
            if entry.date.year == year
        ]

    def check_consecutive_missing_days(self) -> Tuple[int, bool]:
        if not self.entries:
            return 0, False

        today = date.today()
        last_entry_date = max(entry.date for entry in self.entries)
        days_missing = (today - last_entry_date).days

        should_remind = days_missing >= MAX_MISSING_DAYS_FOR_REMINDER
        return days_missing, should_remind

    def get_all_dates(self) -> List[date]:
        return [entry.date for entry in self.entries]

    def get_latest_entry(self) -> Optional[DiaryEntry]:
        return self.entries[-1] if self.entries else None

    def get_entry_by_date(self, target_date: date) -> Optional[DiaryEntry]:
        for entry in self.entries:
            if entry.date == target_date:
                return entry
        return None

    def get_available_years(self) -> List[int]:
        return sorted({entry.date.year for entry in self.entries})

    def get_available_months(self, year: int) -> List[int]:
        return sorted({
            entry.date.month for entry in self.entries
            if entry.date.year == year
        })
