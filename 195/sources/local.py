#!/usr/bin/env python3
import random
from pathlib import Path


class LocalSource:
    SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tiff'}

    def __init__(self, base_dir, logger=None):
        self.base_dir = Path(base_dir)
        self.logger = logger

    def get_images_in_dir(self, subdir=None):
        if subdir:
            search_dir = self.base_dir / subdir
        else:
            search_dir = self.base_dir

        if not search_dir.exists():
            if self.logger:
                self.logger.warning(f"目录不存在: {search_dir}")
            return []

        images = []
        for f in search_dir.iterdir():
            if f.is_file() and f.suffix.lower() in self.SUPPORTED_EXTENSIONS:
                images.append(f)
        return sorted(images)

    def get_random_image(self, subdir=None):
        images = self.get_images_in_dir(subdir)
        if not images:
            if self.logger:
                self.logger.warning(f"目录中没有图片: {subdir or self.base_dir}")
            return None
        return random.choice(images)

    def get_all_images(self):
        return self.get_images_in_dir()

    def get_images_for_time_slot(self, slot_subdir):
        return self.get_images_in_dir(slot_subdir)

    def get_random_for_time_slot(self, slot_subdir):
        return self.get_random_image(slot_subdir)
