import threading
import time
import json
import os
import re
from urllib.parse import urljoin, urlparse, urldefrag
from collections import deque

import requests
from bs4 import BeautifulSoup


class CrawlerTask:
    def __init__(self, task_id, start_url, max_depth=3, respect_robots=True,
                 request_interval=1, allowed_domains=None, keywords=None,
                 user_agent="CrawlerScheduler/1.0"):
        self.task_id = task_id
        self.start_url = start_url
        self.max_depth = min(max_depth, 3)
        self.respect_robots = respect_robots
        self.request_interval = request_interval
        self.allowed_domains = allowed_domains or []
        self.keywords = keywords or []
        self.user_agent = user_agent

        self.status = "pending"
        self.pages_crawled = 0
        self.links_found = 0
        self.start_time = None
        self.end_time = None
        self.pages = []
        self.visited_urls = set()
        self.url_queue = deque()
        self.error_count = 0

        self._pause_event = threading.Event()
        self._pause_event.set()
        self._cancel_event = threading.Event()
        self._thread = None
        self._lock = threading.Lock()

        self.results_dir = os.path.join("results", task_id)
        os.makedirs(self.results_dir, exist_ok=True)

    def is_allowed_by_robots(self, url):
        if not self.respect_robots:
            return True
        try:
            parsed = urlparse(url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            cache_key = f"robots_{parsed.netloc}"
            if not hasattr(self, '_robots_cache'):
                self._robots_cache = {}
            if cache_key not in self._robots_cache:
                try:
                    resp = requests.get(robots_url, timeout=5,
                                        headers={"User-Agent": self.user_agent})
                    self._robots_cache[cache_key] = resp.text if resp.status_code == 200 else ""
                except Exception:
                    self._robots_cache[cache_key] = ""
            robots_text = self._robots_cache[cache_key]
            path = parsed.path or "/"
            for line in robots_text.split("\n"):
                line = line.strip()
                if line.lower().startswith("disallow:"):
                    disallowed_path = line.split(":", 1)[1].strip()
                    if disallowed_path and path.startswith(disallowed_path):
                        return False
            return True
        except Exception:
            return True

    def is_same_domain(self, url):
        if not self.allowed_domains:
            return True
        try:
            parsed = urlparse(url)
            return any(parsed.netloc == domain or parsed.netloc.endswith("." + domain)
                       for domain in self.allowed_domains)
        except Exception:
            return False

    def contains_keywords(self, text):
        if not self.keywords:
            return True
        text_lower = text.lower()
        return any(keyword.lower() in text_lower for keyword in self.keywords)

    def crawl(self):
        self.status = "running"
        self.start_time = time.time()
        self.url_queue.append((self.start_url, 0))

        try:
            while self.url_queue and not self._cancel_event.is_set():
                self._pause_event.wait()

                if self._cancel_event.is_set():
                    break

                with self._lock:
                    if not self.url_queue:
                        break
                    url, depth = self.url_queue.popleft()

                url, _ = urldefrag(url)

                if url in self.visited_urls:
                    continue
                self.visited_urls.add(url)

                if depth > self.max_depth:
                    continue

                if not self.is_allowed_by_robots(url):
                    continue

                if not self.is_same_domain(url):
                    continue

                try:
                    page_data = self._fetch_page(url, depth)
                    if page_data:
                        if self.contains_keywords(page_data["title"] + " " + page_data["text"]):
                            self.pages.append(page_data)
                            self._save_page_text(page_data)
                        self.pages_crawled += 1
                except Exception:
                    self.error_count += 1

                time.sleep(self.request_interval)

            if self._cancel_event.is_set():
                self.status = "cancelled"
            else:
                self.status = "completed"
        except Exception as e:
            self.status = "failed"
        finally:
            self.end_time = time.time()
            self._save_results()

    def _fetch_page(self, url, depth):
        headers = {"User-Agent": self.user_agent}
        response = requests.get(url, timeout=30, headers=headers)
        response.encoding = response.apparent_encoding or "utf-8"

        if response.status_code != 200:
            return None

        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type and "text/plain" not in content_type:
            return None

        soup = BeautifulSoup(response.text, "lxml")

        title = soup.title.string.strip() if soup.title else url
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        summary = text[:500] + "..." if len(text) > 500 else text

        links = []
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            absolute_url = urljoin(url, href)
            absolute_url, _ = urldefrag(absolute_url)
            if absolute_url.startswith(("http://", "https://")):
                links.append({
                    "url": absolute_url,
                    "text": a_tag.get_text(strip=True)[:100]
                })
                if absolute_url not in self.visited_urls:
                    with self._lock:
                        self.url_queue.append((absolute_url, depth + 1))
                    self.links_found += 1

        return {
            "url": url,
            "depth": depth,
            "title": title,
            "summary": summary,
            "text": text,
            "links": links,
            "status_code": response.status_code,
            "crawled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "content_length": len(response.text)
        }

    def _save_page_text(self, page_data):
        safe_filename = re.sub(r"[^\w\-_.]", "_", page_data["url"])[:100]
        text_file = os.path.join(self.results_dir, f"{safe_filename}.txt")
        with open(text_file, "w", encoding="utf-8") as f:
            f.write(f"URL: {page_data['url']}\n")
            f.write(f"Title: {page_data['title']}\n")
            f.write(f"Crawled at: {page_data['crawled_at']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(page_data["text"])

    def _save_results(self):
        results = {
            "task_id": self.task_id,
            "start_url": self.start_url,
            "max_depth": self.max_depth,
            "status": self.status,
            "pages_crawled": self.pages_crawled,
            "links_found": self.links_found,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": (self.end_time - self.start_time) if self.end_time else None,
            "pages": self.pages,
            "error_count": self.error_count
        }
        results_file = os.path.join(self.results_dir, "results.json")
        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    def pause(self):
        if self.status == "running":
            self._pause_event.clear()
            self.status = "paused"

    def resume(self):
        if self.status == "paused":
            self._pause_event.set()
            self.status = "running"

    def cancel(self):
        self._cancel_event.set()
        self._pause_event.set()
        if self.status in ["running", "paused"]:
            self.status = "cancelled"

    def start(self):
        self._thread = threading.Thread(target=self.crawl, daemon=True)
        self._thread.start()

    def get_progress(self):
        duration = 0
        if self.start_time:
            end = self.end_time or time.time()
            duration = end - self.start_time
        return {
            "task_id": self.task_id,
            "status": self.status,
            "pages_crawled": self.pages_crawled,
            "links_found": self.links_found,
            "duration": round(duration, 2),
            "error_count": self.error_count
        }

    def to_dict(self):
        return {
            "task_id": self.task_id,
            "start_url": self.start_url,
            "max_depth": self.max_depth,
            "respect_robots": self.respect_robots,
            "request_interval": self.request_interval,
            "allowed_domains": self.allowed_domains,
            "keywords": self.keywords,
            "status": self.status,
            "pages_crawled": self.pages_crawled,
            "links_found": self.links_found,
            "error_count": self.error_count,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": (self.end_time - self.start_time) if self.start_time and self.end_time else None
        }
