#!/usr/bin/env python3
import json
import urllib.request
from pathlib import Path
from datetime import datetime


class BingSource:
    BASE_URL = "https://www.bing.com/HPImageArchive.aspx"

    def __init__(self, download_dir, market="zh-CN", logger=None):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.market = market
        self.logger = logger

    def get_daily_image_info(self):
        params = {
            "format": "js",
            "idx": "0",
            "n": "1",
            "mkt": self.market
        }
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        url = f"{self.BASE_URL}?{query}"

        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get('images'):
                    image_data = data['images'][0]
                    return {
                        "url": "https://www.bing.com" + image_data["url"],
                        "title": image_data.get("title", ""),
                        "copyright": image_data.get("copyright", ""),
                        "startdate": image_data.get("startdate", "")
                    }
        except Exception as e:
            if self.logger:
                self.logger.error(f"获取必应每日图片信息失败: {e}")
        return None

    def download_daily_image(self):
        info = self.get_daily_image_info()
        if not info:
            return None

        date_str = datetime.now().strftime('%Y%m%d')
        filename = f"bing_{date_str}.jpg"
        filepath = self.download_dir / filename

        if filepath.exists():
            if self.logger:
                self.logger.info(f"必应图片已存在: {filepath}")
            return filepath

        try:
            if self.logger:
                self.logger.info(f"正在下载必应图片: {info['url']}")
            urllib.request.urlretrieve(info['url'], filepath)

            info_path = self.download_dir / f"bing_{date_str}.json"
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(info, f, indent=2, ensure_ascii=False)

            if self.logger:
                self.logger.info(f"必应图片下载完成: {filepath}")
            return filepath
        except Exception as e:
            if self.logger:
                self.logger.error(f"下载必应图片失败: {e}")
            return None
