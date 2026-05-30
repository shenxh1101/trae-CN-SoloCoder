#!/usr/bin/env python3
from pathlib import Path
from PIL import Image


class ImageProcessor:
    def __init__(self, logger=None):
        self.logger = logger

    def process_image(self, input_path, output_path, quality=85,
                      target_resolution=None, auto_resize=True):
        input_path = Path(input_path)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        quality = int(quality)

        try:
            with Image.open(input_path) as img:
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')

                if auto_resize and target_resolution:
                    img = self._resize_to_fit(img, target_resolution)

                img.save(output_path, 'JPEG', quality=quality, optimize=True)

            if self.logger:
                self.logger.info(f"图片已处理: {input_path} -> {output_path}")
            return True
        except Exception as e:
            if self.logger:
                self.logger.error(f"图片处理失败: {e}")
            return False

    def _resize_to_fit(self, img, target_resolution):
        target_w, target_h = target_resolution
        img_w, img_h = img.size

        scale = max(target_w / img_w, target_h / img_h)
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)

        img = img.resize((new_w, new_h), Image.LANCZOS)

        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        right = left + target_w
        bottom = top + target_h

        return img.crop((left, top, right, bottom))

    def get_image_size(self, image_path):
        try:
            with Image.open(image_path) as img:
                return img.size
        except Exception as e:
            if self.logger:
                self.logger.error(f"获取图片尺寸失败: {e}")
            return None

    def get_screen_resolution(self, monitor=0):
        try:
            import screeninfo
            monitors = screeninfo.get_monitors()
            if monitor < len(monitors):
                m = monitors[monitor]
                return (m.width, m.height)
            return None
        except ImportError:
            return self._get_screen_resolution_fallback()
        except Exception as e:
            if self.logger:
                self.logger.error(f"获取屏幕分辨率失败: {e}")
            return None

    def _get_screen_resolution_fallback(self):
        import sys
        try:
            if sys.platform == 'darwin':
                import AppKit
                main_screen = AppKit.NSScreen.mainScreen()
                frame = main_screen.frame()
                return (int(frame.size.width), int(frame.size.height))
            elif sys.platform.startswith('win'):
                import ctypes
                user32 = ctypes.windll.user32
                return (user32.GetSystemMetrics(0), user32.GetSystemMetrics(1))
            elif sys.platform.startswith('linux'):
                import subprocess
                result = subprocess.run(
                    ['xrandr', '-q'],
                    capture_output=True, text=True
                )
                for line in result.stdout.split('\n'):
                    if '*' in line:
                        parts = line.split()[0].split('x')
                        return (int(parts[0]), int(parts[1]))
        except Exception:
            pass
        return (1920, 1080)

    def get_monitor_count(self):
        try:
            import screeninfo
            return len(screeninfo.get_monitors())
        except ImportError:
            try:
                import AppKit
                return len(AppKit.NSScreen.screens())
            except Exception:
                return 1
