import time
import os
from typing import Optional, List
from datetime import datetime
from collections import deque

from parser import parse_file, get_format_pattern, build_custom_pattern, parse_line
from analyzer import LogAnalyzer


class LogMonitor:
    def __init__(self, filepath: str, fmt: str = 'nginx',
                 update_interval: int = 5, max_entries: int = 10000):
        self.filepath = filepath
        self.fmt = fmt
        self.update_interval = update_interval
        self.max_entries = max_entries
        self.entries = deque(maxlen=max_entries)
        self._file_pos = 0
        self._running = False

        if fmt in ('nginx', 'apache', 'apache-combined', 'apache-common', 'combined', 'common'):
            self.pattern = get_format_pattern(fmt)
        else:
            self.pattern = build_custom_pattern(fmt)

    def _read_new_lines(self) -> List[str]:
        lines = []
        try:
            if not os.path.exists(self.filepath):
                return lines
            file_size = os.path.getsize(self.filepath)
            if file_size < self._file_pos:
                self._file_pos = 0
            with open(self.filepath, 'r', encoding='utf-8', errors='replace') as f:
                f.seek(self._file_pos)
                new_lines = f.readlines()
                self._file_pos = f.tell()
            return new_lines
        except Exception:
            return []

    def _parse_lines(self, lines: List[str]):
        for line in lines:
            entry = parse_line(line, self.pattern)
            if entry:
                self.entries.append(entry)

    def start(self, callback=None):
        self._running = True
        print(f'🚀 Starting real-time monitoring of {self.filepath}...')
        print(f'   Format: {self.fmt}')
        print(f'   Update interval: {self.update_interval}s')
        print('   Press Ctrl+C to stop\n')

        lines = self._read_new_lines()
        self._parse_lines(lines)
        print(f'📥 Loaded {len(self.entries)} existing entries')

        try:
            while self._running:
                time.sleep(self.update_interval)
                lines = self._read_new_lines()
                if lines:
                    self._parse_lines(lines)
                    if callback:
                        entries_list = list(self.entries)
                        analyzer = LogAnalyzer(entries_list)
                        analysis = analyzer.analyze()
                        callback(analysis, len(lines))
                    else:
                        self._print_update(len(lines))
        except KeyboardInterrupt:
            print('\n\n⏹️  Monitoring stopped.')
            self._running = False

    def _print_update(self, new_count: int):
        total = len(self.entries)
        print(f'[{datetime.now().strftime("%H:%M:%S")}] +{new_count} new | Total: {total} | '
              f'RPS: {new_count / self.update_interval:.1f}')
