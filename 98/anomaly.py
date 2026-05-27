import re
from collections import Counter, defaultdict
from datetime import timedelta
from typing import List, Dict, Tuple
from parser import LogEntry


SENSITIVE_PATHS = [
    r'/admin', r'/wp-admin', r'/wp-login', r'/phpmyadmin',
    r'/manager/html', r'/.env', r'/config\.php', r'/\.git',
    r'/wp-config', r'/xmlrpc\.php', r'/administrator',
    r'/setup\.php', r'/install\.php', r'/debug',
    r'/\.ssh', r'/backup', r'/db\.sql', r'/dump',
    r'/api/admin', r'/console', r'/actuator',
]

SQL_INJECTION_PATTERNS = [
    r"(\bunion\b.*\bselect\b)",
    r"(\bselect\b.*\bfrom\b)",
    r"(\binsert\b.*\binto\b)",
    r"(\bdelete\b.*\bfrom\b)",
    r"(\bdrop\b.*\btable\b)",
    r"(--|\bor\b.*=.*\bor\b)",
    r"(\bxp_cmdshell\b)",
]

XSS_PATTERNS = [
    r"(<script[^>]*>)",
    r"(javascript:)",
    r"(on\w+\s*=)",
    r"(<iframe)",
    r"(<svg[^>]*on\w+\s*=)",
]

RFI_PATTERNS = [
    r"(https?://)",
    r"(\.\./\.\./)",
    r"(%00)",
    r"(\.\./)",
]


class AnomalyDetector:
    def __init__(self, entries: List[LogEntry]):
        self.entries = entries

    def detect(self, flood_threshold: int = 100,
               flood_window_seconds: int = 60,
               min_errors: int = 10) -> Dict:
        return {
            'flooding_ips': self._detect_flooding(flood_threshold, flood_window_seconds),
            'sensitive_path_hits': self._detect_sensitive_paths(),
            'high_error_ips': self._detect_high_error_ips(min_errors),
            'suspicious_requests': self._detect_suspicious_requests(),
            'slow_requests': self._detect_slow_requests(),
        }

    def _detect_flooding(self, threshold: int, window_seconds: int) -> List[Dict]:
        ip_times = defaultdict(list)
        for e in self.entries:
            ip_times[e.ip].append(e.time)

        results = []
        for ip, times in ip_times.items():
            if len(times) < threshold:
                continue
            times.sort()
            max_in_window = 0
            window_start = None
            window_end = None
            left = 0
            for right in range(len(times)):
                while times[right] - times[left] > timedelta(seconds=window_seconds):
                    left += 1
                count = right - left + 1
                if count > max_in_window:
                    max_in_window = count
                    window_start = times[left]
                    window_end = times[right]
            if max_in_window >= threshold:
                results.append({
                    'ip': ip,
                    'count': max_in_window,
                    'window_start': window_start.isoformat() if window_start else None,
                    'window_end': window_end.isoformat() if window_end else None,
                    'requests_per_second': round(max_in_window / max(window_seconds, 1), 2),
                    'severity': 'critical' if max_in_window >= threshold * 3 else (
                        'high' if max_in_window >= threshold * 2 else 'medium'),
                })
        results.sort(key=lambda x: x['count'], reverse=True)
        return results[:20]

    def _detect_sensitive_paths(self) -> List[Dict]:
        hits = []
        for e in self.entries:
            for pattern in SENSITIVE_PATHS:
                if re.search(pattern, e.path, re.IGNORECASE):
                    hits.append({
                        'ip': e.ip,
                        'path': e.path,
                        'status': e.status,
                        'method': e.method,
                        'time': e.time.isoformat(),
                        'matched_pattern': pattern,
                    })
                    break
        return hits[:50]

    def _detect_high_error_ips(self, min_errors: int) -> List[Dict]:
        error_counter = Counter()
        error_4xx = Counter()
        error_5xx = Counter()
        for e in self.entries:
            if e.status >= 400:
                error_counter[e.ip] += 1
                if e.status < 500:
                    error_4xx[e.ip] += 1
                else:
                    error_5xx[e.ip] += 1
        results = []
        for ip, count in error_counter.most_common(10):
            if count >= min_errors:
                results.append({
                    'ip': ip,
                    'total_errors': count,
                    'error_4xx': error_4xx.get(ip, 0),
                    'error_5xx': error_5xx.get(ip, 0),
                })
        return results

    def _detect_suspicious_requests(self) -> List[Dict]:
        results = []
        for e in self.entries:
            path = e.path
            reasons = []
            for pattern in SQL_INJECTION_PATTERNS:
                if re.search(pattern, path, re.IGNORECASE):
                    reasons.append('SQL Injection')
                    break
            for pattern in XSS_PATTERNS:
                if re.search(pattern, path, re.IGNORECASE):
                    reasons.append('XSS')
                    break
            for pattern in RFI_PATTERNS:
                if re.search(pattern, path, re.IGNORECASE):
                    reasons.append('RFI/Path Traversal')
                    break
            if reasons:
                results.append({
                    'ip': e.ip,
                    'path': path,
                    'method': e.method,
                    'status': e.status,
                    'time': e.time.isoformat(),
                    'attack_types': reasons,
                })
        return results[:50]

    def _detect_slow_requests(self) -> List[Dict]:
        return []
