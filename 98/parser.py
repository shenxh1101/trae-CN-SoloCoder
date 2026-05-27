import re
from datetime import datetime
from typing import Dict, Optional, List, Generator


NGINX_COMBINED = r'(?P<ip>\S+) - - \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<agent>[^"]*)"'

APACHE_COMMON = r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<size>\S+)'

APACHE_COMBINED = r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<agent>[^"]*)"'

TIME_FORMATS = [
    '%d/%b/%Y:%H:%M:%S %z',
    '%d/%b/%Y:%H:%M:%S',
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%dT%H:%M:%S%z',
    '%d/%b/%Y:%H:%M:%S %Z',
]


class LogEntry:
    __slots__ = ('ip', 'time', 'method', 'path', 'protocol', 'status', 'size', 'referer', 'agent', 'raw')

    def __init__(self, ip: str, time: datetime, method: str, path: str,
                 protocol: str, status: int, size: int,
                 referer: str = '', agent: str = '', raw: str = ''):
        self.ip = ip
        self.time = time
        self.method = method
        self.path = path
        self.protocol = protocol
        self.status = status
        self.size = size
        self.referer = referer
        self.agent = agent
        self.raw = raw

    def to_dict(self) -> dict:
        return {
            'ip': self.ip,
            'time': self.time.isoformat(),
            'method': self.method,
            'path': self.path,
            'protocol': self.protocol,
            'status': self.status,
            'size': self.size,
            'referer': self.referer,
            'agent': self.agent,
        }


def parse_time(time_str: str) -> Optional[datetime]:
    for fmt in TIME_FORMATS:
        try:
            return datetime.strptime(time_str.strip(), fmt)
        except (ValueError, OverflowError):
            continue
    try:
        ts = time_str.strip()
        return datetime.strptime(ts.split()[0], '%d/%b/%Y:%H:%M:%S')
    except (ValueError, OverflowError):
        return None


def get_format_pattern(fmt: str) -> str:
    lower = fmt.lower()
    if 'nginx' in lower or 'combined' in lower:
        return NGINX_COMBINED
    if 'apache-common' in lower or 'common' in lower:
        return APACHE_COMMON
    if 'apache-combined' in lower:
        return APACHE_COMBINED
    if 'apache' in lower:
        return APACHE_COMBINED
    return fmt


def build_custom_pattern(fmt_str: str) -> str:
    mapping = {
        '%h': r'(?P<ip>\S+)',
        '%l': r'\S+',
        '%u': r'\S+',
        '%t': r'\[(?P<time>[^\]]+)\]',
        '%r': r'"(?P<method>\S+) (?P<path>\S+) (?P<protocol>[^"]+)"',
        '%m': r'(?P<method>\S+)',
        '%U': r'(?P<path>\S+)',
        '%H': r'(?P<protocol>[^"]+)',
        '%s': r'(?P<status>\d+)',
        '%b': r'(?P<size>\S+)',
        '%B': r'(?P<size>\d+)',
        '%{Referer}i': r'"(?P<referer>[^"]*)"',
        '%{User-Agent}i': r'"(?P<agent>[^"]*)"',
        '%a': r'(?P<ip>\S+)',
        '%A': r'(?P<ip>\S+)',
    }
    pattern = re.escape(fmt_str)
    for token, regex in mapping.items():
        pattern = pattern.replace(re.escape(token), regex)
    return pattern


def parse_line(line: str, pattern: str) -> Optional[LogEntry]:
    line = line.strip()
    if not line:
        return None
    m = re.match(pattern, line)
    if not m:
        return None
    gd = m.groupdict()
    ip = gd.get('ip', '')
    time_str = gd.get('time', '')
    method = gd.get('method', '')
    path = gd.get('path', '')
    protocol = gd.get('protocol', '')
    status_str = gd.get('status', '0')
    size_str = gd.get('size', '0')
    referer = gd.get('referer', '')
    agent = gd.get('agent', '')
    try:
        status = int(status_str)
    except (ValueError, TypeError):
        status = 0
    try:
        size = int(size_str) if size_str and size_str != '-' else 0
    except (ValueError, TypeError):
        size = 0
    dt = parse_time(time_str)
    if dt is None:
        return None
    return LogEntry(
        ip=ip, time=dt, method=method, path=path,
        protocol=protocol, status=status, size=size,
        referer=referer, agent=agent, raw=line
    )


def parse_file(filepath: str, fmt: str = 'nginx',
               time_start: Optional[datetime] = None,
               time_end: Optional[datetime] = None) -> Generator[LogEntry, None, None]:
    if fmt in ('nginx', 'apache', 'apache-combined', 'apache-common', 'combined', 'common'):
        pattern = get_format_pattern(fmt)
    else:
        pattern = build_custom_pattern(fmt)

    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            entry = parse_line(line, pattern)
            if entry is None:
                continue
            if time_start and entry.time < time_start:
                continue
            if time_end and entry.time > time_end:
                continue
            yield entry


def detect_format(filepath: str, sample_lines: int = 50) -> str:
    lines = []
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        for i, line in enumerate(f):
            if i >= sample_lines:
                break
            if line.strip():
                lines.append(line.strip())

    formats = {
        'nginx': NGINX_COMBINED,
        'apache-combined': APACHE_COMBINED,
        'apache-common': APACHE_COMMON,
    }
    for name, pattern in formats.items():
        matched = sum(1 for l in lines if re.match(pattern, l))
        if matched >= len(lines) * 0.8:
            return name
    return 'nginx'
