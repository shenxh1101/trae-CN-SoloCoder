import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional

from parser import LogEntry


UA_PATTERNS = {
    'Chrome': r'Chrome/(\d+\.\d+)',
    'Firefox': r'Firefox/(\d+\.\d+)',
    'Safari': r'Version/(\d+\.\d+).*Safari',
    'Edge': r'Edg/(\d+\.\d+)',
    'Opera': r'(?:OPR|Opera)/(\d+\.\d+)',
    'IE': r'MSIE (\d+\.\d+);',
    '360': r'360SE',
    'QQ': r'QQBrowser',
    'UC': r'UBrowser|UCBrowser',
    'Baidu': r'Bidubrowser',
    'Mi': r'MiuiBrowser',
    'Curl': r'curl/(\d+\.\d+)',
    'Wget': r'Wget/(\d+\.\d+)',
    'Python': r'python-requests/(\d+\.\d+)',
    'Go': r'Go-http-client/(\d+\.\d+)',
    'Java': r'Java/(\d+\.\d+)',
    'PhantomJS': r'PhantomJS/(\d+\.\d+)',
    'Googlebot': r'Googlebot/(\d+\.\d+)',
    'Bingbot': r'Bingbot/(\d+\.\d+)',
    'Baiduspider': r'Baiduspider/(\d+\.\d+)',
    'Yandex': r'YandexBot/(\d+\.\d+)',
    'Sogou': r'Sogou web spider',
    '360bot': r'360Spider',
    'Bytespider': r'Bytespider',
    'Twitterbot': r'Twitterbot',
    'Facebook': r'facebookexternalhit',
}

OS_PATTERNS = {
    'Windows 10': r'Windows NT 10\.0',
    'Windows 8.1': r'Windows NT 6\.3',
    'Windows 8': r'Windows NT 6\.2',
    'Windows 7': r'Windows NT 6\.1',
    'Windows Vista': r'Windows NT 6\.0',
    'Windows XP': r'Windows NT 5\.1',
    'Windows Server': r'Windows NT [65]\.\d+.*Server',
    'macOS': r'Mac OS X (\d+[_.]\d+([_.]\d+)?)',
    'iOS': r'(?:iPhone|iPad|iPod).*OS (\d+_\d+(_\d+)?)',
    'Android': r'Android (\d+\.\d+(\.\d+)?)',
    'Linux': r'X11.*Linux',
    'Ubuntu': r'Ubuntu',
    'Fedora': r'Fedora',
    'FreeBSD': r'FreeBSD',
    'ChromeOS': r'CrOS',
    'Unix': r'UNIX',
}

SENSITIVE_PATHS = [
    r'/admin', r'/wp-admin', r'/wp-login', r'/phpmyadmin',
    r'/manager/html', r'/.env', r'/config\.php', r'/\.git',
    r'/wp-config', r'/xmlrpc\.php', r'/administrator',
    r'/setup\.php', r'/install\.php', r'/debug',
    r'/\.ssh', r'/backup', r'/db\.sql', r'/dump',
    r'/api/admin', r'/console', r'/actuator',
]


class LogAnalyzer:
    def __init__(self, entries: List[LogEntry]):
        self.entries = entries
        self.total_requests = len(entries)

    def analyze(self) -> Dict:
        return {
            'summary': self._summary(),
            'top_ips': self._top_ips(10),
            'top_urls': self._top_urls(10),
            'status_distribution': self._status_distribution(),
            'hourly_distribution': self._hourly_distribution(),
            'user_agents': self._analyze_user_agents(),
            'os_distribution': self._analyze_os(),
            'anomalies': self._detect_anomalies(),
            'geo_data': self._geo_distribution(),
            'time_range': self._time_range(),
        }

    def _summary(self) -> Dict:
        if not self.entries:
            return {
                'total_requests': 0, 'unique_ips': 0, 'unique_urls': 0,
                'total_bytes': 0, 'avg_bytes': 0,
                'time_start': None, 'time_end': None,
                'duration_hours': 0,
            }
        total_bytes = sum(e.size for e in self.entries)
        unique_ips = len(set(e.ip for e in self.entries))
        unique_urls = len(set(e.path for e in self.entries))
        times = [e.time for e in self.entries]
        time_start = min(times)
        time_end = max(times)
        duration = (time_end - time_start).total_seconds() / 3600.0 if times else 0
        return {
            'total_requests': self.total_requests,
            'unique_ips': unique_ips,
            'unique_urls': unique_urls,
            'total_bytes': total_bytes,
            'avg_bytes': total_bytes // self.total_requests if self.total_requests else 0,
            'time_start': time_start.isoformat(),
            'time_end': time_end.isoformat(),
            'duration_hours': round(duration, 2),
        }

    def _top_ips(self, n: int = 10) -> List[Tuple[str, int]]:
        counter = Counter(e.ip for e in self.entries)
        return counter.most_common(n)

    def _top_urls(self, n: int = 10) -> List[Tuple[str, int]]:
        counter = Counter(e.path for e in self.entries)
        return counter.most_common(n)

    def _status_distribution(self) -> Dict[str, int]:
        counter = Counter()
        for e in self.entries:
            if 200 <= e.status < 300:
                counter['2xx'] += 1
            elif 300 <= e.status < 400:
                counter['3xx'] += 1
            elif 400 <= e.status < 500:
                counter['4xx'] += 1
            elif 500 <= e.status < 600:
                counter['5xx'] += 1
            else:
                counter[f'{e.status}'] += 1
        specific = Counter()
        for e in self.entries:
            specific[str(e.status)] += 1
        return {
            'by_category': dict(counter),
            'by_code': dict(specific.most_common()),
        }

    def _hourly_distribution(self) -> List[Dict]:
        hourly = defaultdict(int)
        for e in self.entries:
            key = e.time.strftime('%Y-%m-%d %H:00')
            hourly[key] += 1
        result = [{'hour': k, 'count': v} for k, v in sorted(hourly.items())]
        return result

    def _analyze_user_agents(self) -> Dict:
        browser_counter = Counter()
        crawler_counter = Counter()
        bot_counter = Counter()
        for e in self.entries:
            ua = e.agent
            if not ua or ua == '-':
                browser_counter['Unknown'] += 1
                continue
            matched = False
            for name, pattern in UA_PATTERNS.items():
                if re.search(pattern, ua, re.IGNORECASE):
                    if 'bot' in name.lower() or 'spider' in name.lower() or 'crawl' in name.lower():
                        crawler_counter[name] += 1
                    elif name in ('Curl', 'Wget', 'Python', 'Go', 'Java', 'PhantomJS'):
                        bot_counter[name] += 1
                    else:
                        browser_counter[name] += 1
                    matched = True
                    break
            if not matched:
                if any(kw in ua.lower() for kw in ['bot', 'spider', 'crawl', 'scraper']):
                    crawler_counter['Other Crawler'] += 1
                else:
                    browser_counter['Other'] += 1
        return {
            'browsers': browser_counter.most_common(10),
            'crawlers': crawler_counter.most_common(10),
            'bots': bot_counter.most_common(10),
        }

    def _analyze_os(self) -> List[Tuple[str, int]]:
        os_counter = Counter()
        for e in self.entries:
            ua = e.agent
            if not ua or ua == '-':
                os_counter['Unknown'] += 1
                continue
            matched = False
            for name, pattern in OS_PATTERNS.items():
                if re.search(pattern, ua, re.IGNORECASE):
                    os_counter[name] += 1
                    matched = True
                    break
            if not matched:
                os_counter['Other'] += 1
        return os_counter.most_common(10)

    def _detect_anomalies(self, flood_threshold: int = 100,
                          flood_window_seconds: int = 60) -> Dict:
        ip_times = defaultdict(list)
        for e in self.entries:
            ip_times[e.ip].append(e.time)

        flooding_ips = []
        for ip, times in ip_times.items():
            if len(times) < flood_threshold:
                continue
            times.sort()
            for i in range(len(times)):
                window_end = times[i] + timedelta(seconds=flood_window_seconds)
                j = i
                while j < len(times) and times[j] <= window_end:
                    j += 1
                count = j - i
                if count >= flood_threshold:
                    severity = 'critical' if count >= flood_threshold * 3 else (
                        'high' if count >= flood_threshold * 2 else 'medium')
                    flooding_ips.append({
                        'ip': ip,
                        'count': count,
                        'window_start': times[i].isoformat(),
                        'window_end': times[j - 1].isoformat(),
                        'requests_per_second': round(count / max(flood_window_seconds, 1), 2),
                        'severity': severity,
                    })
                    break

        sensitive_hits = []
        for e in self.entries:
            for pattern in SENSITIVE_PATHS:
                if re.search(pattern, e.path, re.IGNORECASE):
                    sensitive_hits.append({
                        'ip': e.ip,
                        'path': e.path,
                        'status': e.status,
                        'time': e.time.isoformat(),
                    })
                    break

        high_error_ips = Counter()
        error_4xx = Counter()
        error_5xx = Counter()
        for e in self.entries:
            if e.status >= 400:
                high_error_ips[e.ip] += 1
                if e.status < 500:
                    error_4xx[e.ip] += 1
                else:
                    error_5xx[e.ip] += 1
        error_offenders = [
            {'ip': ip, 'total_errors': count, 'error_4xx': error_4xx.get(ip, 0), 'error_5xx': error_5xx.get(ip, 0)}
            for ip, count in high_error_ips.most_common(10)
            if count >= 10
        ]

        return {
            'flooding_ips': flooding_ips[:20],
            'sensitive_path_hits': sensitive_hits[:50],
            'high_error_ips': error_offenders,
        }

    def _geo_distribution(self) -> Dict:
        from geo import ip_to_country, generate_world_map
        country_counter = Counter()
        unknown_ips = []
        for e in self.entries:
            country = ip_to_country(e.ip)
            if country == 'Unknown':
                unknown_ips.append(e.ip)
            country_counter[country] += 1
        by_country = country_counter.most_common(20)
        world_map = generate_world_map(by_country)
        return {
            'by_country': by_country,
            'unknown_ip_count': len(unknown_ips),
            'world_map': world_map,
        }

    def _time_range(self) -> Dict:
        if not self.entries:
            return {'start': None, 'end': None}
        times = [e.time for e in self.entries]
        return {
            'start': min(times).isoformat(),
            'end': max(times).isoformat(),
        }


def compare_analyses(analysis_a: Dict, analysis_b: Dict) -> Dict:
    def diff(a, b):
        if a == 0:
            return float('inf') if b > 0 else 0
        return round((b - a) / a * 100, 2)

    sa = analysis_a.get('summary', {})
    sb = analysis_b.get('summary', {})

    changes = {
        'total_requests': {
            'value_a': sa.get('total_requests', 0),
            'value_b': sb.get('total_requests', 0),
            'change_pct': diff(sa.get('total_requests', 0), sb.get('total_requests', 0)),
        },
        'unique_ips': {
            'value_a': sa.get('unique_ips', 0),
            'value_b': sb.get('unique_ips', 0),
            'change_pct': diff(sa.get('unique_ips', 0), sb.get('unique_ips', 0)),
        },
        'total_bytes': {
            'value_a': sa.get('total_bytes', 0),
            'value_b': sb.get('total_bytes', 0),
            'change_pct': diff(sa.get('total_bytes', 0), sb.get('total_bytes', 0)),
        },
    }

    status_a = analysis_a.get('status_distribution', {}).get('by_category', {})
    status_b = analysis_b.get('status_distribution', {}).get('by_category', {})
    status_changes = {}
    all_cats = set(status_a.keys()) | set(status_b.keys())
    for cat in all_cats:
        status_changes[cat] = {
            'value_a': status_a.get(cat, 0),
            'value_b': status_b.get(cat, 0),
            'change_pct': diff(status_a.get(cat, 0), status_b.get(cat, 0)),
        }

    top_ips_a = dict(analysis_a.get('top_ips', []))
    top_ips_b = dict(analysis_b.get('top_ips', []))
    all_ips = set(top_ips_a.keys()) | set(top_ips_b.keys())
    ip_changes = []
    for ip in all_ips:
        ip_changes.append({
            'ip': ip,
            'count_a': top_ips_a.get(ip, 0),
            'count_b': top_ips_b.get(ip, 0),
            'change_pct': diff(top_ips_a.get(ip, 0), top_ips_b.get(ip, 0)),
        })
    ip_changes.sort(key=lambda x: abs(x['change_pct']), reverse=True)

    return {
        'metric_changes': changes,
        'status_changes': status_changes,
        'top_ip_changes': ip_changes[:20],
        'time_range_a': analysis_a.get('time_range', {}),
        'time_range_b': analysis_b.get('time_range', {}),
    }
