import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse
from collections import deque
import threading
import time
import re
import os
import hashlib
import logging

logger = logging.getLogger(__name__)


class CrawlResult:
    def __init__(self, url, title='', summary='', links=None, status_code=None, content_type='',
                 content_length=0, crawled_at=None):
        self.url = url
        self.title = title
        self.summary = summary
        self.links = links or []
        self.status_code = status_code
        self.content_type = content_type
        self.content_length = content_length
        self.crawled_at = crawled_at or time.time()
        self.raw_html = ''

    def to_dict(self):
        return {
            'url': self.url,
            'title': self.title,
            'summary': self.summary,
            'links': self.links,
            'status_code': self.status_code,
            'content_type': self.content_type,
            'content_length': self.content_length,
            'crawled_at': self.crawled_at,
        }


class Crawler:
    def __init__(self, config, task_manager=None):
        self.config = config
        self.task_manager = task_manager
        self.task_id = config.get('task_id', '')

        self.base_url = config['url']
        self.max_depth = int(config.get('max_depth', 2))
        self.respect_robots = config.get('respect_robots', True)
        self.crawl_interval = float(config.get('crawl_interval', 1.0))
        self.timeout = int(config.get('timeout', 15))
        self.allowed_domains = config.get('allowed_domains', [])
        self.keywords = config.get('keywords', [])
        self.save_html = config.get('save_html', False)
        self.user_agent = config.get('user_agent', 'Mozilla/5.0 (compatible; CrawlerService/1.0)')

        self._visited_urls = set()
        self._visited_hashes = set()
        self._results = []
        self._results_lock = threading.Lock()
        self._pause_event = threading.Event()
        self._pause_event.set()
        self._cancel_event = threading.Event()
        self._robots_cache = {}
        self._queue = deque()
        self._total_urls_discovered = 0
        self._total_urls_crawled = 0
        self._lock = threading.Lock()

        if not self.allowed_domains:
            parsed = urlparse(self.base_url)
            domain = parsed.netloc
            self.allowed_domains = [domain]

    @property
    def is_paused(self):
        return not self._pause_event.is_set()

    @property
    def is_cancelled(self):
        return self._cancel_event.is_set()

    def pause(self):
        self._pause_event.clear()

    def resume(self):
        self._pause_event.set()

    def cancel(self):
        self._cancel_event.set()

    def _check_robots(self, url):
        if not self.respect_robots:
            return True
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        if base in self._robots_cache:
            allowed = self._robots_cache[base]
        else:
            allowed = True
            try:
                robots_url = urljoin(base + '/', 'robots.txt')
                resp = requests.get(robots_url, timeout=self.timeout,
                                    headers={'User-Agent': self.user_agent})
                if resp.status_code == 200:
                    self._parse_robots(resp.text, base)
                    allowed = self._is_allowed_by_robots(url, base)
            except Exception:
                allowed = True
            self._robots_cache[base] = allowed
        return self._is_allowed_by_robots(url, base) if base in self._robots_cache else True

    def _parse_robots(self, text, base):
        self._robots_rules = {}
        current_agent = None
        for line in text.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if ':' in line:
                key, _, value = line.partition(':')
                key = key.strip().lower()
                value = value.strip()
                if key == 'user-agent':
                    current_agent = value
                    if current_agent not in self._robots_rules:
                        self._robots_rules[current_agent] = {'allow': [], 'disallow': []}
                elif key in ('disallow', 'allow') and current_agent:
                    self._robots_rules[current_agent][key].append(value)

    def _is_allowed_by_robots(self, url, base):
        if not self.respect_robots:
            return True
        parsed = urlparse(url)
        path = parsed.path or '/'
        ua_rules = self._robots_rules.get('*', {'allow': [], 'disallow': []})
        for disallow in ua_rules.get('disallow', []):
            if disallow and path.startswith(disallow):
                for allow in ua_rules.get('allow', []):
                    if allow and path.startswith(allow):
                        return True
                return False
        return True

    def _normalize_url(self, url):
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return None
        netloc = parsed.netloc.lower()
        if parsed.port in (80, 443, None):
            netloc = parsed.hostname
        path = parsed.path or '/'
        normalized = urlunparse((
            parsed.scheme.lower(),
            netloc,
            path,
            '',
            parsed.query,
            ''
        ))
        return normalized.rstrip('/') if normalized.endswith('/') and len(normalized) > 8 else normalized

    def _is_same_domain(self, url):
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        for allowed in self.allowed_domains:
            if domain == allowed.lower() or domain.endswith('.' + allowed.lower()):
                return True
        return False

    def _extract_title(self, soup):
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        h1 = soup.find('h1')
        if h1 and h1.get_text():
            return h1.get_text().strip()[:200]
        return '无标题'

    def _extract_summary(self, soup):
        for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        meta_desc = soup.find('meta', attrs={'name': re.compile(r'^description$', re.I)})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()[:300]
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text)
        return text[:300]

    def _extract_links(self, soup, base_url):
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href'].strip()
            if not href or href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                continue
            try:
                absolute = urljoin(base_url, href)
                normalized = self._normalize_url(absolute)
                if normalized and self._is_same_domain(normalized):
                    links.append({'url': normalized, 'text': a.get_text(strip=True)[:100]})
            except Exception:
                continue
        return links

    def _content_matches_keywords(self, content, title):
        if not self.keywords:
            return True
        text = (title + ' ' + content).lower()
        return any(kw.lower() in text for kw in self.keywords)

    def _save_html_file(self, url, html):
        if not self.save_html:
            return
        safe_name = hashlib.md5(url.encode()).hexdigest()[:16]
        parsed = urlparse(url)
        path = parsed.path.strip('/').replace('/', '_') or 'index'
        filename = f"{safe_name}_{path}.html"
        filepath = os.path.join('crawled_pages', filename)
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html)
        except Exception as e:
            logger.error(f"Failed to save HTML for {url}: {e}")

    def crawl(self):
        start_url = self._normalize_url(self.base_url)
        if not start_url:
            self._update_status('failed', error='无效的URL')
            return

        self._queue.append((start_url, 0))
        self._update_status('running', progress=0)

        try:
            self._crawl_loop()
        except Exception as e:
            logger.error(f"Crawl error: {e}")
            self._update_status('failed', error=str(e))
            return

        if self._cancel_event.is_set():
            self._update_status('cancelled')
        else:
            self._update_status('completed')

    def _crawl_loop(self):
        while self._queue:
            self._pause_event.wait()
            if self._cancel_event.is_set():
                break

            url, depth = self._queue.popleft()

            url_hash = hashlib.md5(url.encode()).hexdigest()
            with self._lock:
                if url in self._visited_urls or url_hash in self._visited_hashes:
                    continue
                self._visited_urls.add(url)
                self._visited_hashes.add(url_hash)

            if not self._check_robots(url):
                continue

            result = self._fetch_and_parse(url)
            if result is None:
                continue

            with self._results_lock:
                self._results.append(result)
                self._total_urls_crawled += 1

            self._save_html_file(url, result.raw_html)

            if depth < self.max_depth:
                for link in result.links:
                    link_url = link['url']
                    link_hash = hashlib.md5(link_url.encode()).hexdigest()
                    with self._lock:
                        if link_url not in self._visited_urls and link_hash not in self._visited_hashes:
                            already_queued = any(u == link_url for u, _ in self._queue)
                            if not already_queued:
                                self._queue.append((link_url, depth + 1))
                                self._total_urls_discovered += 1

            self._update_progress()

            if self.crawl_interval > 0:
                time.sleep(self.crawl_interval)

    def _fetch_and_parse(self, url):
        try:
            resp = requests.get(url, timeout=self.timeout,
                                headers={'User-Agent': self.user_agent,
                                         'Accept': 'text/html,application/xhtml+xml'})
            content_type = resp.headers.get('Content-Type', '')
            if 'text/html' not in content_type and 'application/xhtml' not in content_type:
                return None

            if resp.status_code != 200:
                result = CrawlResult(
                    url=url,
                    status_code=resp.status_code,
                    content_type=content_type,
                )
                return result

            html = resp.text
            soup = BeautifulSoup(html, 'lxml')
            title = self._extract_title(soup)
            summary = self._extract_summary(soup)
            links = self._extract_links(soup, url)

            if not self._content_matches_keywords(soup.get_text(), title):
                return None

            result = CrawlResult(
                url=url,
                title=title,
                summary=summary,
                links=links,
                status_code=resp.status_code,
                content_type=content_type,
                content_length=len(html),
            )
            result.raw_html = html
            return result

        except requests.exceptions.Timeout:
            logger.warning(f"Timeout for {url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request failed for {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Parse error for {url}: {e}")
            return None

    def _update_progress(self):
        total = len(self._visited_urls)
        discovered = self._total_urls_discovered
        crawled = self._total_urls_crawled
        progress = 0
        if discovered > 0:
            progress = min(99, int((crawled / max(total, 1)) * 100))
        if self.is_paused:
            self._update_status('paused', progress=progress)
        elif not self.is_cancelled:
            self._update_status('running', progress=progress)

    def _update_status(self, status, progress=None, error=None):
        if self.task_manager:
            self.task_manager.update_task(self.task_id, status, progress, error)

    def get_results(self):
        with self._results_lock:
            return [r.to_dict() for r in self._results]

    def get_result_count(self):
        with self._results_lock:
            return len(self._results)
