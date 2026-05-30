#!/usr/bin/env python3
"""IPTV Playlist Manager - Command-line tool for managing M3U IPTV playlists."""

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import threading
import time
import socket
import ssl
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

CACHE_DIR = Path.home() / ".iptv_manager" / "cache"
LOGO_CACHE_DIR = Path.home() / ".iptv_manager" / "logos"
REPORTS_DIR = Path.home() / ".iptv_manager" / "reports"
CONFIG_FILE = Path.home() / ".iptv_manager" / "config.json"

DEFAULT_TIMEOUT = 10
DEFAULT_TEST_BYTES = 51200
DEFAULT_WORKERS = 8
DEFAULT_RETRIES = 2


ERROR_CATEGORIES = {
    "DNS_FAILURE": "DNS解析失败",
    "CONNECTION_REFUSED": "连接被拒绝",
    "CONNECTION_TIMEOUT": "连接超时",
    "READ_TIMEOUT": "读取超时",
    "SSL_ERROR": "SSL/TLS错误",
    "HTTP_4XX": "HTTP客户端错误",
    "HTTP_5XX": "服务器错误",
    "REDIRECT_ERROR": "重定向错误",
    "EMPTY_RESPONSE": "响应为空",
    "INVALID_STREAM": "无效流数据",
    "NETWORK_ERROR": "网络错误",
    "UNKNOWN_ERROR": "未知错误",
}


@dataclass
class Channel:
    name: str = ""
    url: str = ""
    group: str = ""
    logo: str = ""
    tvg_id: str = ""
    tvg_name: str = ""
    extra_attrs: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "url": self.url,
            "group": self.group,
            "logo": self.logo,
            "tvg_id": self.tvg_id,
            "tvg_name": self.tvg_name,
        }

    @property
    def identifier(self) -> str:
        return f"{self.name.strip().lower()}|{self.url.strip().lower()}"


@dataclass
class TestResult:
    channel: Channel
    available: bool = False
    response_time: float = 0.0
    error: str = ""
    error_category: str = ""
    retries_used: int = 0
    tested_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "name": self.channel.name,
            "url": self.channel.url,
            "group": self.channel.group,
            "available": self.available,
            "response_time_ms": round(self.response_time * 1000, 2),
            "error": self.error,
            "error_category": self.error_category,
            "error_category_cn": ERROR_CATEGORIES.get(self.error_category, self.error_category),
            "retries_used": self.retries_used,
            "tested_at": self.tested_at,
        }


class M3UParser:
    @staticmethod
    def parse(content: str) -> List[Channel]:
        channels = []
        lines = content.strip().splitlines()
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if line.startswith("#EXTINF:"):
                channel = Channel()
                attrs = M3UParser._parse_extinf(line)
                channel.tvg_id = attrs.get("tvg-id", "")
                channel.tvg_name = attrs.get("tvg-name", "")
                channel.logo = attrs.get("tvg-logo", "")
                channel.group = attrs.get("group-title", "")
                for k, v in attrs.items():
                    if k not in ("tvg-id", "tvg-name", "tvg-logo", "group-title"):
                        channel.extra_attrs[k] = v
                channel.name = attrs.get("_name", "")
                j = i + 1
                while j < len(lines) and lines[j].strip().startswith("#"):
                    j += 1
                if j < len(lines):
                    channel.url = lines[j].strip()
                    i = j + 1
                else:
                    i += 1
                channels.append(channel)
            else:
                i += 1
        return channels

    @staticmethod
    def _parse_extinf(line: str) -> Dict[str, str]:
        attrs = {}
        match = re.match(r"#EXTINF:\s*[-\d]*\s*(.*),(.*)$", line)
        if not match:
            return attrs
        attr_str = match.group(1)
        name = match.group(2).strip()
        attrs["_name"] = name
        for m in re.finditer(r'([a-zA-Z][\w\-]*)="([^"]*)"', attr_str):
            attrs[m.group(1)] = m.group(2)
        return attrs

    @staticmethod
    def render(channels: List[Channel]) -> str:
        lines = ["#EXTM3U"]
        for ch in channels:
            attr_parts = []
            if ch.tvg_id:
                attr_parts.append(f'tvg-id="{ch.tvg_id}"')
            if ch.tvg_name:
                attr_parts.append(f'tvg-name="{ch.tvg_name}"')
            if ch.logo:
                attr_parts.append(f'tvg-logo="{ch.logo}"')
            if ch.group:
                attr_parts.append(f'group-title="{ch.group}"')
            for k, v in ch.extra_attrs.items():
                attr_parts.append(f'{k}="{v}"')
            attr_str = " ".join(attr_parts)
            if attr_str:
                attr_str = " " + attr_str
            lines.append(f"#EXTINF:-1{attr_str},{ch.name}")
            lines.append(ch.url)
        return "\n".join(lines) + "\n"


class FileManager:
    @staticmethod
    def read_m3u(filepath: str) -> List[Channel]:
        path = Path(filepath)
        if not path.exists():
            print(f"Error: file not found: {filepath}", file=sys.stderr)
            return []
        content = path.read_text(encoding="utf-8", errors="ignore")
        return M3UParser.parse(content)

    @staticmethod
    def write_m3u(filepath: str, channels: List[Channel]):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        content = M3UParser.render(channels)
        path.write_text(content, encoding="utf-8")

    @staticmethod
    def import_from_url(url: str, use_cache: bool = True) -> List[Channel]:
        cache_key = hashlib.md5(url.encode()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.m3u"
        if use_cache and cache_file.exists():
            cache_age = time.time() - cache_file.stat().st_mtime
            if cache_age < 3600:
                print(f"Using cached file (age: {cache_age:.0f}s)")
                return FileManager.read_m3u(str(cache_file))
        print(f"Downloading M3U from: {url}")
        try:
            if HAS_REQUESTS:
                resp = requests.get(url, timeout=DEFAULT_TIMEOUT, headers={"User-Agent": "IPTV-Manager/1.0"})
                resp.raise_for_status()
                content = resp.text
            else:
                req = Request(url, headers={"User-Agent": "IPTV-Manager/1.0"})
                with urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
                    content = resp.read().decode("utf-8", errors="ignore")
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(content, encoding="utf-8")
            print(f"Cached to: {cache_file}")
            return M3UParser.parse(content)
        except Exception as e:
            print(f"Error downloading M3U: {e}", file=sys.stderr)
            if cache_file.exists():
                print("Falling back to cached version")
                return FileManager.read_m3u(str(cache_file))
            return []

    @staticmethod
    def export_txt(filepath: str, channels: List[Channel]):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = []
        for ch in channels:
            parts = [ch.name, ch.url]
            if ch.group:
                parts.append(ch.group)
            if ch.logo:
                parts.append(ch.logo)
            lines.append(",".join(parts))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    @staticmethod
    def export_csv(filepath: str, channels: List[Channel]):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Name", "URL", "Group", "Logo", "TVG-ID", "TVG-Name"])
            for ch in channels:
                writer.writerow([ch.name, ch.url, ch.group, ch.logo, ch.tvg_id, ch.tvg_name])

    @staticmethod
    def merge(file1: str, file2: str) -> List[Channel]:
        ch1 = FileManager.read_m3u(file1)
        ch2 = FileManager.read_m3u(file2)
        all_channels = ch1 + ch2
        return Deduplicator.dedup(all_channels)


class AvailabilityTester:
    @staticmethod
    def _classify_error(exc: Exception) -> Tuple[str, str]:
        category = "UNKNOWN_ERROR"
        if isinstance(exc, HTTPError):
            code = exc.code
            if 400 <= code < 500:
                category = "HTTP_4XX"
            elif 500 <= code < 600:
                category = "HTTP_5XX"
            else:
                category = "REDIRECT_ERROR"
            msg = f"HTTP {code} {exc.reason} - {exc.url}"
        elif isinstance(exc, URLError):
            reason = exc.reason
            if isinstance(reason, socket.gaierror):
                category = "DNS_FAILURE"
                msg = f"DNS解析失败: {reason}"
            elif isinstance(reason, socket.timeout):
                category = "CONNECTION_TIMEOUT"
                msg = f"连接超时: {reason}"
            elif isinstance(reason, ConnectionRefusedError):
                category = "CONNECTION_REFUSED"
                msg = f"连接被拒绝: {reason}"
            elif isinstance(reason, ssl.SSLError):
                category = "SSL_ERROR"
                msg = f"SSL错误: {reason}"
            elif isinstance(reason, OSError) and "timed out" in str(reason).lower():
                category = "CONNECTION_TIMEOUT"
                msg = f"连接超时: {reason}"
            else:
                category = "NETWORK_ERROR"
                msg = f"网络错误: {reason}"
        elif isinstance(exc, socket.timeout):
            category = "CONNECTION_TIMEOUT"
            msg = f"连接超时: {exc}"
        elif isinstance(exc, ConnectionRefusedError):
            category = "CONNECTION_REFUSED"
            msg = f"连接被拒绝: {exc}"
        elif isinstance(exc, ssl.SSLError):
            category = "SSL_ERROR"
            msg = f"SSL错误: {exc}"
        elif isinstance(exc, requests.exceptions.ConnectionError) if HAS_REQUESTS else False:
            cause = exc.__cause__ or exc
            cause_str = str(cause).lower()
            if "name or service not known" in cause_str or "getaddrinfo" in cause_str:
                category = "DNS_FAILURE"
                msg = f"DNS解析失败: {cause}"
            elif "connection refused" in cause_str:
                category = "CONNECTION_REFUSED"
                msg = f"连接被拒绝: {cause}"
            elif "timed out" in cause_str:
                category = "CONNECTION_TIMEOUT"
                msg = f"连接超时: {cause}"
            elif "ssl" in cause_str:
                category = "SSL_ERROR"
                msg = f"SSL错误: {cause}"
            else:
                category = "NETWORK_ERROR"
                msg = f"网络连接失败: {cause}"
        elif isinstance(exc, requests.exceptions.Timeout) if HAS_REQUESTS else False:
            category = "READ_TIMEOUT"
            msg = f"读取超时: {exc}"
        elif isinstance(exc, requests.exceptions.HTTPError) if HAS_REQUESTS else False:
            resp = exc.response
            if resp is not None:
                code = resp.status_code
                if 400 <= code < 500:
                    category = "HTTP_4XX"
                elif 500 <= code < 600:
                    category = "HTTP_5XX"
                else:
                    category = "REDIRECT_ERROR"
                msg = f"HTTP {code} - {exc}"
            else:
                category = "HTTP_4XX"
                msg = f"HTTP错误: {exc}"
        else:
            exc_str = str(exc).lower()
            if "timed out" in exc_str or "timeout" in exc_str:
                category = "CONNECTION_TIMEOUT"
                msg = f"超时: {exc}"
            elif "connection refused" in exc_str:
                category = "CONNECTION_REFUSED"
                msg = f"连接被拒绝: {exc}"
            elif "name or service" in exc_str or "getaddrinfo" in exc_str:
                category = "DNS_FAILURE"
                msg = f"DNS解析失败: {exc}"
            else:
                category = "NETWORK_ERROR"
                msg = f"{type(exc).__name__}: {exc}"
        cn = ERROR_CATEGORIES.get(category, category)
        return category, f"[{cn}] {msg}"

    @staticmethod
    def _is_hls_url(url: str) -> bool:
        parsed = urlparse(url)
        path = parsed.path.lower()
        return path.endswith(".m3u8") or path.endswith(".m3u") or "/live/" in path.lower()

    @staticmethod
    def _test_single_attempt(channel: Channel, timeout: int, test_bytes: int) -> TestResult:
        result = TestResult(channel=channel, tested_at=datetime.now().isoformat())
        start = time.time()
        is_hls = AvailabilityTester._is_hls_url(channel.url)
        try:
            if HAS_REQUESTS:
                if is_hls:
                    resp = requests.get(channel.url, timeout=timeout, stream=False,
                                        headers={"User-Agent": "IPTV-Manager/1.0"})
                    resp.raise_for_status()
                    data = resp.content[:test_bytes]
                    if b"#EXTM3U" in data[:1024]:
                        result.available = True
                    elif len(data) > 0:
                        result.available = True
                    else:
                        result.error_category = "EMPTY_RESPONSE"
                        result.error = "[响应为空] 服务器返回空内容"
                else:
                    resp = requests.get(channel.url, timeout=timeout, stream=True,
                                        headers={"User-Agent": "IPTV-Manager/1.0", "Range": "bytes=0-"})
                    if resp.status_code == 200 or resp.status_code == 206:
                        data = resp.raw.read(test_bytes)
                        if len(data) > 0:
                            result.available = True
                        else:
                            result.error_category = "EMPTY_RESPONSE"
                            result.error = "[响应为空] 服务器返回0字节数据"
                    else:
                        resp.raise_for_status()
            else:
                headers = {"User-Agent": "IPTV-Manager/1.0"}
                if not is_hls:
                    headers["Range"] = "bytes=0-"
                req = Request(channel.url, headers=headers)
                with urlopen(req, timeout=timeout) as resp:
                    data = resp.read(test_bytes)
                    if is_hls and b"#EXTM3U" in data[:1024]:
                        result.available = True
                    elif len(data) > 0:
                        result.available = True
                    else:
                        result.error_category = "EMPTY_RESPONSE"
                        result.error = "[响应为空] 服务器返回0字节数据"
            result.response_time = time.time() - start
        except Exception as e:
            result.available = False
            if not result.error:
                result.error_category, result.error = AvailabilityTester._classify_error(e)
            result.response_time = time.time() - start
        return result

    @staticmethod
    def test_channel(channel: Channel, timeout: int = DEFAULT_TIMEOUT,
                     test_bytes: int = DEFAULT_TEST_BYTES,
                     retries: int = DEFAULT_RETRIES) -> TestResult:
        last_result = None
        for attempt in range(retries + 1):
            result = AvailabilityTester._test_single_attempt(channel, timeout, test_bytes)
            result.retries_used = attempt
            if result.available:
                if attempt > 0:
                    result.error = f"第{attempt + 1}次尝试成功"
                return result
            last_result = result
            if result.error_category in ("HTTP_4XX", "DNS_FAILURE", "SSL_ERROR", "CONNECTION_REFUSED"):
                break
            if attempt < retries:
                wait = 0.5 * (attempt + 1)
                time.sleep(wait)
        return last_result or TestResult(channel=channel, tested_at=datetime.now().isoformat(),
                                          error="[未知错误] 无测试结果", error_category="UNKNOWN_ERROR")

    @staticmethod
    def test_channels(channels: List[Channel], timeout: int = DEFAULT_TIMEOUT,
                      test_bytes: int = DEFAULT_TEST_BYTES, workers: int = DEFAULT_WORKERS,
                      retries: int = DEFAULT_RETRIES,
                      progress: bool = True) -> List[TestResult]:
        results = []
        total = len(channels)
        done = 0
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(AvailabilityTester.test_channel, ch, timeout, test_bytes, retries): ch
                       for ch in channels}
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                done += 1
                if progress:
                    if result.available:
                        retry_str = f" (retry#{result.retries_used})" if result.retries_used > 0 else ""
                        print(f"  [{done}/{total}] OK   - {result.channel.name} ({result.response_time:.2f}s){retry_str}")
                    else:
                        error_cat = ERROR_CATEGORIES.get(result.error_category, result.error_category)
                        retry_str = f" ({result.retries_used} retries)" if result.retries_used > 0 else ""
                        print(f"  [{done}/{total}] FAIL - {result.channel.name} | {error_cat}{retry_str}")
        return results

    @staticmethod
    def generate_report(results: List[TestResult], filepath: str):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        available = [r for r in results if r.available]
        unavailable = [r for r in results if not r.available]
        error_stats = defaultdict(int)
        for r in unavailable:
            error_stats[ERROR_CATEGORIES.get(r.error_category, r.error_category)] += 1
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"IPTV Channel Availability Report\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*60}\n\n")
            f.write(f"Total: {len(results)} | Available: {len(available)} | Unavailable: {len(unavailable)}\n")
            f.write(f"Availability Rate: {len(available)/max(len(results),1)*100:.1f}%\n\n")
            if error_stats:
                f.write(f"Error Summary:\n")
                for cat, count in sorted(error_stats.items(), key=lambda x: -x[1]):
                    f.write(f"  {cat}: {count}\n")
                f.write("\n")
            f.write(f"--- Available Channels ({len(available)}) ---\n")
            for r in sorted(available, key=lambda x: x.channel.name):
                retry_info = f" [重试{r.retries_used}次后成功]" if r.retries_used > 0 else ""
                f.write(f"  [OK] {r.channel.name} | {r.response_time:.2f}s{retry_info} | {r.channel.url}\n")
            f.write(f"\n--- Unavailable Channels ({len(unavailable)}) ---\n")
            for r in sorted(unavailable, key=lambda x: x.channel.name):
                error_cat = ERROR_CATEGORIES.get(r.error_category, r.error_category)
                retry_info = f" [重试{r.retries_used}次]" if r.retries_used > 0 else ""
                detail = r.error.replace(f"[{error_cat}] ", "")
                f.write(f"  [FAIL] {r.channel.name} | {error_cat}{retry_info} | {detail} | {r.channel.url}\n")
        report_json = path.with_suffix(".json")
        json.dump([r.to_dict() for r in results], open(report_json, "w", encoding="utf-8"), indent=2, ensure_ascii=False)


class Deduplicator:
    @staticmethod
    def dedup(channels: List[Channel], by: str = "both") -> List[Channel]:
        seen_urls = set()
        seen_names = set()
        result = []
        for ch in channels:
            url_key = ch.url.strip().lower()
            name_key = ch.name.strip().lower()
            if by == "url" and url_key in seen_urls:
                continue
            elif by == "name" and name_key in seen_names:
                continue
            elif by == "both":
                if url_key in seen_urls and name_key in seen_names:
                    continue
            seen_urls.add(url_key)
            seen_names.add(name_key)
            result.append(ch)
        removed = len(channels) - len(result)
        if removed > 0:
            print(f"Removed {removed} duplicate channel(s)")
        return result


class ChannelSearcher:
    @staticmethod
    def search(channels: List[Channel], keyword: str, case_sensitive: bool = False) -> List[Channel]:
        if not case_sensitive:
            keyword = keyword.lower()
        results = []
        for ch in channels:
            target = ch.name if case_sensitive else ch.name.lower()
            if keyword in target:
                results.append(ch)
        return results


class ChannelGrouper:
    GROUP_KEYWORDS = {
        "电影": ["电影", "影视频道", "影视", "movie", "film", "cinema"],
        "体育": ["体育", "运动", "sport", "football", "basketball", "soccer", "nba", "奥运"],
        "新闻": ["新闻", "资讯", "news", "时事", "报道"],
        "少儿": ["少儿", "卡通", "动画", "kid", "children", "cartoon"],
        "音乐": ["音乐", "music", "mtv"],
        "综艺": ["综艺", "娱乐", "entertainment"],
        "纪录": ["纪录", "documentary", "探索"],
        "财经": ["财经", "经济", "finance", "business", "stock"],
        "教育": ["教育", "education", "学习"],
    }

    @staticmethod
    def auto_group(channels: List[Channel]) -> List[Channel]:
        for ch in channels:
            if ch.group:
                continue
            name_lower = ch.name.lower()
            for group_name, keywords in ChannelGrouper.GROUP_KEYWORDS.items():
                for kw in keywords:
                    if kw in name_lower:
                        ch.group = group_name
                        break
                if ch.group:
                    break
            if not ch.group:
                ch.group = "其他"
        return channels

    @staticmethod
    def set_group(channels: List[Channel], group: str, keyword: str = "") -> List[Channel]:
        for ch in channels:
            if keyword:
                if keyword.lower() in ch.name.lower():
                    ch.group = group
            else:
                ch.group = group
        return channels

    @staticmethod
    def organize_by_group(channels: List[Channel]) -> Dict[str, List[Channel]]:
        groups = defaultdict(list)
        for ch in channels:
            groups[ch.group or "未分组"].append(ch)
        return dict(groups)


class LogoManager:
    @staticmethod
    def download_logo(url: str, channel_name: str) -> str:
        ext = Path(urlparse(url).path).suffix or ".png"
        safe_name = re.sub(r'[^\w]', '_', channel_name)
        local_path = LOGO_CACHE_DIR / f"{safe_name}{ext}"
        if local_path.exists():
            return str(local_path)
        try:
            if HAS_REQUESTS:
                resp = requests.get(url, timeout=DEFAULT_TIMEOUT, headers={"User-Agent": "IPTV-Manager/1.0"})
                resp.raise_for_status()
                data = resp.content
            else:
                req = Request(url, headers={"User-Agent": "IPTV-Manager/1.0"})
                with urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
                    data = resp.read()
            LOGO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(data)
            return str(local_path)
        except Exception as e:
            print(f"Error downloading logo for {channel_name}: {e}", file=sys.stderr)
            return url

    @staticmethod
    def apply_local_logo(channels: List[Channel], logo_dir: str) -> List[Channel]:
        logo_path = Path(logo_dir)
        if not logo_path.exists():
            print(f"Logo directory not found: {logo_dir}", file=sys.stderr)
            return channels
        for ch in channels:
            safe_name = re.sub(r'[^\w]', '_', ch.name)
            for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
                candidate = logo_path / f"{safe_name}{ext}"
                if candidate.exists():
                    ch.logo = str(candidate)
                    break
        return channels

    @staticmethod
    def cache_all_logos(channels: List[Channel]) -> List[Channel]:
        for ch in channels:
            if ch.logo and ch.logo.startswith("http"):
                local = LogoManager.download_logo(ch.logo, ch.name)
                ch.logo = local
        return channels


class HTMLPlayerGenerator:
    @staticmethod
    def generate(channels: List[Channel], filepath: str, title: str = "IPTV Player"):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        groups = ChannelGrouper.organize_by_group(channels)
        group_tabs = ""
        group_panels = ""
        for i, (group, chs) in enumerate(sorted(groups.items())):
            active = "active" if i == 0 else ""
            group_tabs += f'<button class="tab-btn {active}" data-group="{group}">{group} ({len(chs)})</button>\n'
            items = ""
            for ch in chs:
                logo_html = f'<img src="{ch.logo}" class="channel-logo" onerror="this.style.display=\'none\'">' if ch.logo else '<div class="channel-logo-placeholder">&#9654;</div>'
                items += f'''<div class="channel-item" data-url="{ch.url}" data-name="{ch.name}" onclick="playChannel(this)">
                    {logo_html}
                    <span class="channel-name">{ch.name}</span>
                </div>\n'''
            group_panels += f'<div class="tab-panel {active}" data-group="{group}">{items}</div>\n'

        html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #e6edf3; }}
.header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; text-align: center; border-bottom: 1px solid #30363d; }}
.header h1 {{ font-size: 24px; color: #58a6ff; }}
.header p {{ color: #8b949e; margin-top: 4px; }}
.container {{ display: flex; height: calc(100vh - 80px); }}
.sidebar {{ width: 360px; border-right: 1px solid #30363d; display: flex; flex-direction: column; overflow: hidden; }}
.tabs {{ display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: #161b22; border-bottom: 1px solid #30363d; overflow-x: auto; }}
.tab-btn {{ padding: 6px 12px; border: 1px solid #30363d; background: #21262d; color: #8b949e; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s; }}
.tab-btn:hover {{ background: #30363d; color: #e6edf3; }}
.tab-btn.active {{ background: #1f6feb; color: #fff; border-color: #1f6feb; }}
.channel-list {{ flex: 1; overflow-y: auto; padding: 8px; }}
.tab-panel {{ display: none; }}
.tab-panel.active {{ display: block; }}
.channel-item {{ display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }}
.channel-item:hover {{ background: #21262d; }}
.channel-item.playing {{ background: #1f6feb33; border: 1px solid #1f6feb; }}
.channel-logo {{ width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }}
.channel-logo-placeholder {{ width: 36px; height: 36px; border-radius: 6px; background: #21262d; display: flex; align-items: center; justify-content: center; color: #58a6ff; font-size: 16px; }}
.channel-name {{ font-size: 14px; flex: 1; }}
.player {{ flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; }}
video {{ max-width: 100%; max-height: calc(100vh - 140px); }}
.now-playing {{ color: #8b949e; padding: 12px; text-align: center; background: #161b22; width: 100%; border-top: 1px solid #30363d; }}
.now-playing span {{ color: #58a6ff; }}
.search-box {{ padding: 8px; background: #161b22; border-bottom: 1px solid #30363d; }}
.search-box input {{ width: 100%; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font-size: 14px; outline: none; }}
.search-box input:focus {{ border-color: #58a6ff; }}
</style>
</head>
<body>
<div class="header">
    <h1>&#9654; {title}</h1>
    <p>{len(channels)} channels</p>
</div>
<div class="container">
    <div class="sidebar">
        <div class="search-box"><input type="text" id="searchInput" placeholder="Search channels..." oninput="filterChannels(this.value)"></div>
        <div class="tabs">{group_tabs}</div>
        <div class="channel-list">{group_panels}</div>
    </div>
    <div class="player">
        <video id="videoPlayer" controls autoplay></video>
        <div class="now-playing">Now playing: <span id="nowPlayingName">-</span></div>
    </div>
</div>
<script>
function playChannel(el) {{
    const url = el.dataset.url;
    const name = el.dataset.name;
    const video = document.getElementById("videoPlayer");
    video.src = url;
    video.play().catch(()=>{{}});
    document.getElementById("nowPlayingName").textContent = name;
    document.querySelectorAll(".channel-item").forEach(e=>e.classList.remove("playing"));
    el.classList.add("playing");
}}
function switchTab(group) {{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.group===group));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.dataset.group===group));
}}
document.querySelectorAll(".tab-btn").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.group)));
function filterChannels(query) {{
    const q = query.toLowerCase();
    document.querySelectorAll(".channel-item").forEach(el=>{{
        el.style.display = el.dataset.name.toLowerCase().includes(q) ? "" : "none";
    }});
}}
</script>
</body>
</html>'''
        path.write_text(html, encoding="utf-8")


class ScheduleManager:
    @staticmethod
    def run_scheduled(filepath: str, interval_minutes: int, output_dir: str,
                      timeout: int = DEFAULT_TIMEOUT, workers: int = DEFAULT_WORKERS,
                      retries: int = DEFAULT_RETRIES):
        print(f"Starting scheduled test: interval={interval_minutes}min, file={filepath}")
        print(f"Reports will be saved to: {output_dir}")
        print("Press Ctrl+C to stop\n")
        try:
            while True:
                channels = FileManager.read_m3u(filepath)
                if not channels:
                    print("No channels found, skipping...")
                else:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    report_path = os.path.join(output_dir, f"report_{timestamp}.txt")
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Testing {len(channels)} channels...")
                    results = AvailabilityTester.test_channels(channels, timeout=timeout, workers=workers, retries=retries)
                    AvailabilityTester.generate_report(results, report_path)
                    available = [r.channel for r in results if r.available]
                    available_m3u = os.path.join(output_dir, f"available_{timestamp}.m3u")
                    FileManager.write_m3u(available_m3u, available)
                    print(f"Report: {report_path}")
                    print(f"Available M3U: {available_m3u} ({len(available)}/{len(channels)})")
                    print(f"Next test in {interval_minutes} minutes...\n")
                time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            print("\nScheduled testing stopped.")


def cmd_list(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    print(f"Total channels: {len(channels)}\n")
    groups = ChannelGrouper.organize_by_group(channels)
    for group, chs in sorted(groups.items()):
        print(f"  [{group}] ({len(chs)} channels)")
        for ch in chs:
            logo_str = " [Logo]" if ch.logo else ""
            print(f"    - {ch.name}{logo_str}")
            print(f"      {ch.url}")


def cmd_test(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    print(f"Testing {len(channels)} channels (timeout={args.timeout}s, workers={args.workers}, retries={args.retries})...\n")
    results = AvailabilityTester.test_channels(channels, timeout=args.timeout, workers=args.workers, retries=args.retries)
    available = [r for r in results if r.available]
    unavailable = [r for r in results if not r.available]
    print(f"\nResults: {len(available)} available, {len(unavailable)} unavailable")
    if args.output:
        FileManager.write_m3u(args.output, [r.channel for r in available])
        print(f"Available channels saved to: {args.output}")
    if args.report:
        AvailabilityTester.generate_report(results, args.report)
        print(f"Report saved to: {args.report}")


def cmd_search(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    results = ChannelSearcher.search(channels, args.keyword, case_sensitive=args.case_sensitive)
    if not results:
        print(f"No channels found matching '{args.keyword}'")
        return
    print(f"Found {len(results)} channel(s) matching '{args.keyword}':\n")
    for ch in results:
        group_str = f" [{ch.group}]" if ch.group else ""
        print(f"  - {ch.name}{group_str}")
        print(f"    {ch.url}")


def cmd_export(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    fmt = args.format.lower()
    if fmt == "txt":
        FileManager.export_txt(args.output, channels)
    elif fmt == "csv":
        FileManager.export_csv(args.output, channels)
    else:
        print(f"Unknown format: {fmt}. Use txt or csv.")
        return
    print(f"Exported {len(channels)} channels to: {args.output}")


def cmd_import(args):
    channels = FileManager.import_from_url(args.url, use_cache=not args.no_cache)
    if not channels:
        print("No channels imported.")
        return
    if args.output:
        FileManager.write_m3u(args.output, channels)
        print(f"Imported {len(channels)} channels to: {args.output}")
    else:
        print(f"Imported {len(channels)} channels:")
        for ch in channels[:20]:
            print(f"  - {ch.name}")
        if len(channels) > 20:
            print(f"  ... and {len(channels) - 20} more")


def cmd_dedup(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    original = len(channels)
    channels = Deduplicator.dedup(channels, by=args.by)
    FileManager.write_m3u(args.output or args.file, channels)
    print(f"Deduplicated: {original} -> {len(channels)} channels")
    print(f"Saved to: {args.output or args.file}")


def cmd_group(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    if args.auto:
        channels = ChannelGrouper.auto_group(channels)
        print("Auto-grouped channels by keyword matching.")
    elif args.set_group:
        channels = ChannelGrouper.set_group(channels, args.set_group, args.keyword or "")
        print(f"Set group '{args.set_group}' for matching channels.")
    else:
        print("Use --auto or --set-group to group channels.")
        return
    FileManager.write_m3u(args.output or args.file, channels)
    groups = ChannelGrouper.organize_by_group(channels)
    print("\nGroup summary:")
    for g, chs in sorted(groups.items()):
        print(f"  [{g}] {len(chs)} channels")
    print(f"\nSaved to: {args.output or args.file}")


def cmd_schedule(args):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    output_dir = args.output_dir or str(REPORTS_DIR)
    ScheduleManager.run_scheduled(args.file, args.interval, output_dir,
                                  timeout=args.timeout, workers=args.workers,
                                  retries=args.retries)


def cmd_html(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    if args.available_only:
        print("Testing channels for availability first...")
        results = AvailabilityTester.test_channels(channels, timeout=args.timeout, workers=args.workers, retries=args.retries)
        channels = [r.channel for r in results if r.available]
        print(f"Available channels: {len(channels)}")
    HTMLPlayerGenerator.generate(channels, args.output, title=args.title or "IPTV Player")
    print(f"HTML player generated: {args.output} ({len(channels)} channels)")


def cmd_logo(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    if args.cache:
        channels = LogoManager.cache_all_logos(channels)
    elif args.local_dir:
        channels = LogoManager.apply_local_logo(channels, args.local_dir)
    elif args.set_logo:
        keyword = args.keyword or ""
        for ch in channels:
            if not keyword or keyword.lower() in ch.name.lower():
                ch.logo = args.set_logo
    else:
        print("Use --cache, --local-dir, or --set-logo to manage logos.")
        return
    FileManager.write_m3u(args.output or args.file, channels)
    print(f"Logos updated. Saved to: {args.output or args.file}")


def cmd_merge(args):
    channels = FileManager.merge(args.file1, args.file2)
    if not channels:
        print("No channels after merge.")
        return
    FileManager.write_m3u(args.output, channels)
    print(f"Merged: {len(channels)} channels (deduplicated)")
    print(f"Saved to: {args.output}")


def cmd_add(args):
    channels = FileManager.read_m3u(args.file) if os.path.exists(args.file) else []
    ch = Channel(name=args.name, url=args.url, group=args.group or "", logo=args.logo or "")
    channels.append(ch)
    FileManager.write_m3u(args.file, channels)
    print(f"Added channel: {args.name}")


def cmd_remove(args):
    channels = FileManager.read_m3u(args.file)
    if not channels:
        print("No channels found.")
        return
    before = len(channels)
    if args.url:
        channels = [ch for ch in channels if ch.url != args.url]
    elif args.keyword:
        channels = [ch for ch in channels if args.keyword.lower() not in ch.name.lower()]
    else:
        print("Use --url or --keyword to specify which channel to remove.")
        return
    removed = before - len(channels)
    FileManager.write_m3u(args.file, channels)
    print(f"Removed {removed} channel(s). {len(channels)} remaining.")


def build_parser():
    parser = argparse.ArgumentParser(
        prog="iptv-manager",
        description="IPTV Playlist Manager - Manage M3U channel playlists",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  iptv-manager list playlist.m3u
  iptv-manager test playlist.m3u --output available.m3u --report report.txt
  iptv-manager search playlist.m3u "CCTV"
  iptv-manager export playlist.m3u -o channels.csv -f csv
  iptv-manager import https://example.com/playlist.m3u -o local.m3u
  iptv-manager dedup playlist.m3u -o deduped.m3u
  iptv-manager group playlist.m3u --auto -o grouped.m3u
  iptv-manager html playlist.m3u -o player.html
  iptv-manager merge file1.m3u file2.m3u -o merged.m3u
""")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    p_list = subparsers.add_parser("list", help="List all channels in M3U file")
    p_list.add_argument("file", help="M3U file path")

    p_test = subparsers.add_parser("test", help="Test channel availability")
    p_test.add_argument("file", help="M3U file path")
    p_test.add_argument("-o", "--output", help="Output M3U with available channels only")
    p_test.add_argument("-r", "--report", help="Save availability report")
    p_test.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="Connection timeout in seconds")
    p_test.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="Number of concurrent workers")
    p_test.add_argument("--retries", type=int, default=DEFAULT_RETRIES, help="Number of retries for failed channels")

    p_search = subparsers.add_parser("search", help="Search channels by keyword")
    p_search.add_argument("file", help="M3U file path")
    p_search.add_argument("keyword", help="Search keyword")
    p_search.add_argument("--case-sensitive", action="store_true", help="Case sensitive search")

    p_export = subparsers.add_parser("export", help="Export channels to TXT or CSV")
    p_export.add_argument("file", help="M3U file path")
    p_export.add_argument("-o", "--output", required=True, help="Output file path")
    p_export.add_argument("-f", "--format", required=True, choices=["txt", "csv"], help="Export format")

    p_import = subparsers.add_parser("import", help="Import M3U from URL")
    p_import.add_argument("url", help="M3U file URL")
    p_import.add_argument("-o", "--output", help="Output M3U file path")
    p_import.add_argument("--no-cache", action="store_true", help="Skip cache")

    p_dedup = subparsers.add_parser("dedup", help="Remove duplicate channels")
    p_dedup.add_argument("file", help="M3U file path")
    p_dedup.add_argument("-o", "--output", help="Output M3U file path (default: overwrite)")
    p_dedup.add_argument("--by", choices=["both", "name", "url"], default="both", help="Dedup criteria")

    p_group = subparsers.add_parser("group", help="Group channels")
    p_group.add_argument("file", help="M3U file path")
    p_group.add_argument("-o", "--output", help="Output M3U file path (default: overwrite)")
    p_group.add_argument("--auto", action="store_true", help="Auto-group by keywords")
    p_group.add_argument("--set-group", metavar="GROUP", help="Set group name")
    p_group.add_argument("--keyword", help="Keyword filter for --set-group")

    p_schedule = subparsers.add_parser("schedule", help="Run scheduled availability tests")
    p_schedule.add_argument("file", help="M3U file path")
    p_schedule.add_argument("-i", "--interval", type=int, default=60, help="Test interval in minutes")
    p_schedule.add_argument("-o", "--output-dir", help="Report output directory")
    p_schedule.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    p_schedule.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    p_schedule.add_argument("--retries", type=int, default=DEFAULT_RETRIES)

    p_html = subparsers.add_parser("html", help="Generate HTML player page")
    p_html.add_argument("file", help="M3U file path")
    p_html.add_argument("-o", "--output", required=True, help="Output HTML file path")
    p_html.add_argument("--title", help="Player page title")
    p_html.add_argument("--available-only", action="store_true", help="Only include available channels")
    p_html.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    p_html.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    p_html.add_argument("--retries", type=int, default=DEFAULT_RETRIES)

    p_logo = subparsers.add_parser("logo", help="Manage channel logos")
    p_logo.add_argument("file", help="M3U file path")
    p_logo.add_argument("-o", "--output", help="Output M3U file path (default: overwrite)")
    p_logo.add_argument("--cache", action="store_true", help="Download and cache all remote logos")
    p_logo.add_argument("--local-dir", help="Apply logos from local directory")
    p_logo.add_argument("--set-logo", metavar="URL", help="Set logo URL for channels")
    p_logo.add_argument("--keyword", help="Keyword filter for --set-logo")

    p_merge = subparsers.add_parser("merge", help="Merge two M3U files with dedup")
    p_merge.add_argument("file1", help="First M3U file")
    p_merge.add_argument("file2", help="Second M3U file")
    p_merge.add_argument("-o", "--output", required=True, help="Output M3U file path")

    p_add = subparsers.add_parser("add", help="Add a channel")
    p_add.add_argument("file", help="M3U file path")
    p_add.add_argument("--name", required=True, help="Channel name")
    p_add.add_argument("--url", required=True, help="Stream URL")
    p_add.add_argument("--group", help="Group name")
    p_add.add_argument("--logo", help="Logo URL")

    p_remove = subparsers.add_parser("remove", help="Remove channels")
    p_remove.add_argument("file", help="M3U file path")
    p_remove.add_argument("--url", help="Remove by exact URL")
    p_remove.add_argument("--keyword", help="Remove channels matching keyword")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return
    commands = {
        "list": cmd_list,
        "test": cmd_test,
        "search": cmd_search,
        "export": cmd_export,
        "import": cmd_import,
        "dedup": cmd_dedup,
        "group": cmd_group,
        "schedule": cmd_schedule,
        "html": cmd_html,
        "logo": cmd_logo,
        "merge": cmd_merge,
        "add": cmd_add,
        "remove": cmd_remove,
    }
    handler = commands.get(args.command)
    if handler:
        handler(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
