#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse
import random
import time
from pathlib import Path
from datetime import datetime


class UnsplashSource:
    BASE_URL = "https://api.unsplash.com"
    SOURCE_URL = "https://source.unsplash.com"
    PICSUM_URL = "https://picsum.photos"

    def __init__(self, download_dir, access_key="", query="nature",
                 featured=True, logger=None):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.access_key = access_key
        self.query = query
        self.featured = featured
        self.logger = logger

    def get_random_image_info(self, count=1):
        if not self.access_key:
            if self.logger:
                self.logger.error("未配置Unsplash Access Key")
            return None

        params = {
            "query": self.query,
            "featured": "true" if self.featured else "false",
            "count": str(count),
            "client_id": self.access_key
        }
        query = urllib.parse.urlencode(params)
        url = f"{self.BASE_URL}/photos/random?{query}"

        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if isinstance(data, list) and data:
                    return data[0]
                return data
        except Exception as e:
            if self.logger:
                self.logger.error(f"获取Unsplash图片信息失败: {e}")
        return None

    def download_random_image(self):
        if self.access_key:
            result = self._download_via_api()
            if result:
                return result

        result = self._download_via_source()
        if result:
            return result

        return self._download_via_picsum()

    def _download_via_api(self):
        info = self.get_random_image_info()
        if not info:
            return None

        photo_id = info.get("id", random.randint(1000, 999999))
        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"unsplash_{photo_id}_{date_str}.jpg"
        filepath = self.download_dir / filename

        try:
            download_url = info.get("urls", {}).get("raw") or info.get("urls", {}).get("full")
            if not download_url:
                if self.logger:
                    self.logger.error("Unsplash图片URL不存在")
                return None

            if self.logger:
                self.logger.info(f"正在下载Unsplash图片(API): {download_url}")

            req = urllib.request.Request(download_url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(filepath, 'wb') as f:
                    f.write(resp.read())

            info_path = self.download_dir / f"unsplash_{photo_id}_{date_str}.json"
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(info, f, indent=2, ensure_ascii=False)

            if self.logger:
                self.logger.info(f"Unsplash图片下载完成: {filepath}")
            return filepath
        except Exception as e:
            if self.logger:
                self.logger.error(f"下载Unsplash图片失败: {e}")
            return None

    def _download_via_source(self):
        path_parts = ["random", "1920x1080"]
        url = f"{self.SOURCE_URL}/{'/'.join(path_parts)}?{self.query}"
        url += f"&sig={int(time.time())}"

        if self.logger:
            self.logger.info(f"正在通过Source API下载Unsplash图片: {url}")

        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"unsplash_source_{date_str}.jpg"
        filepath = self.download_dir / filename

        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'WallpaperManager/1.0')
            with urllib.request.urlopen(req, timeout=30) as resp:
                content_type = resp.headers.get('Content-Type', '')
                if 'image' not in content_type and 'octet-stream' not in content_type:
                    if self.logger:
                        self.logger.error(f"Source API返回非图片内容: {content_type}")
                    return None
                with open(filepath, 'wb') as f:
                    f.write(resp.read())

            if self.logger:
                self.logger.info(f"Unsplash Source图片下载完成: {filepath}")
            return filepath
        except Exception as e:
            if self.logger:
                self.logger.warning(f"Source API不可用: {e}, 尝试Picsum备用...")
            return None

    def _download_via_picsum(self):
        url = f"{self.PICSUM_URL}/1920/1080"

        if self.logger:
            self.logger.info(f"正在通过Lorem Picsum下载随机图片: {url}")

        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"picsum_{date_str}.jpg"
        filepath = self.download_dir / filename

        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'WallpaperManager/1.0')
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(filepath, 'wb') as f:
                    f.write(resp.read())

            if self.logger:
                self.logger.info(f"Picsum图片下载完成: {filepath}")
            return filepath
        except Exception as e:
            if self.logger:
                self.logger.error(f"通过Picsum下载图片失败: {e}")
            return None
