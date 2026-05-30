#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from history import HistoryManager
from image_processor import ImageProcessor
from wallpaper_setter import WallpaperSetter
from preview import AsciiPreview
from sources.local import LocalSource
from sources.bing import BingSource
from sources.unsplash import UnsplashSource
from wallpaper_manager import WallpaperManager


class TestConfig(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmpdir, "config.json")
        self.config = Config(self.config_path)

    def test_default_values(self):
        self.assertEqual(self.config.get("quality"), 85)
        self.assertTrue(self.config.get("auto_resize"))
        self.assertIsNotNone(self.config.get("wallpaper_dir"))
        self.assertIsNotNone(self.config.get("time_slots"))

    def test_set_and_get(self):
        self.config.set("quality", "70")
        self.assertEqual(self.config.get("quality"), 70)
        self.assertIsInstance(self.config.get("quality"), int)

    def test_set_boolean(self):
        self.config.set("auto_resize", "false")
        self.assertFalse(self.config.get("auto_resize"))
        self.assertIsInstance(self.config.get("auto_resize"), bool)

    def test_set_nested_key(self):
        self.config.set("multi_monitor.enabled", "true")
        self.assertTrue(self.config.get("multi_monitor.enabled"))

    def test_save_and_reload(self):
        self.config.set("quality", 95)
        self.config.save()
        config2 = Config(self.config_path)
        self.assertEqual(config2.get("quality"), 95)

    def test_get_nonexistent_key(self):
        self.assertIsNone(self.config.get("nonexistent"))
        self.assertEqual(self.config.get("nonexistent", "default"), "default")

    def test_coerce_type_float(self):
        result = Config._coerce_type("3.14")
        self.assertAlmostEqual(result, 3.14)
        self.assertIsInstance(result, float)

    def test_coerce_type_string(self):
        result = Config._coerce_type("hello")
        self.assertEqual(result, "hello")
        self.assertIsInstance(result, str)

    def test_time_slots(self):
        slot_name, slot = self.config.get_current_time_slot()
        self.assertIsNotNone(slot_name)
        self.assertIn("start", slot)
        self.assertIn("end", slot)
        self.assertIn("subdir", slot)

    def test_export_import_config(self):
        export_path = os.path.join(self.tmpdir, "export.json")
        self.config.set("quality", 77)
        self.config.save()
        export_config = Config(export_path)
        export_config.data = self.config.data.copy()
        export_config.save()

        import_config = Config(export_path)
        self.assertEqual(import_config.get("quality"), 77)


class TestHistoryManager(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.history_file = os.path.join(self.tmpdir, "history.json")
        self.history = HistoryManager(self.history_file, max_entries=5)

    def test_empty_history(self):
        self.assertEqual(self.history.get_recent(), [])
        self.assertIsNone(self.history.get_last())

    def test_add_entry(self):
        self.history.add_entry("/path/to/image.jpg", "local", "primary")
        last = self.history.get_last()
        self.assertIsNotNone(last)
        self.assertEqual(last["path"], "/path/to/image.jpg")
        self.assertEqual(last["source"], "local")
        self.assertEqual(last["monitor"], "primary")

    def test_max_entries(self):
        for i in range(10):
            self.history.add_entry(f"/path/{i}.jpg", "local", "primary")
        self.assertEqual(len(self.history.get_recent()), 5)

    def test_get_recent_count(self):
        for i in range(5):
            self.history.add_entry(f"/path/{i}.jpg", "local", "primary")
        recent = self.history.get_recent(3)
        self.assertEqual(len(recent), 3)

    def test_clear(self):
        self.history.add_entry("/path/to/image.jpg", "local", "primary")
        self.history.clear()
        self.assertEqual(self.history.get_recent(), [])

    def test_multi_monitor_entries(self):
        self.history.add_entry("/path/primary.jpg", "local", "primary")
        self.history.add_entry("/path/secondary.jpg", "bing", "secondary")
        recent = self.history.get_recent(2)
        self.assertEqual(recent[0]["monitor"], "secondary")
        self.assertEqual(recent[1]["monitor"], "primary")

    def test_persistence(self):
        self.history.add_entry("/path/persist.jpg", "local", "primary")
        history2 = HistoryManager(self.history_file, max_entries=5)
        self.assertEqual(len(history2.get_recent()), 1)


class TestImageProcessor(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.processor = ImageProcessor()
        self._create_test_image()

    def _create_test_image(self, width=800, height=600):
        from PIL import Image as PILImage
        self.test_image = os.path.join(self.tmpdir, "test.jpg")
        img = PILImage.new('RGB', (width, height), color=(100, 150, 200))
        img.save(self.test_image)
        return self.test_image

    def test_process_image_basic(self):
        output = os.path.join(self.tmpdir, "output.jpg")
        result = self.processor.process_image(self.test_image, output, quality=85)
        self.assertTrue(result)
        self.assertTrue(os.path.exists(output))

    def test_process_image_with_quality(self):
        output_q50 = os.path.join(self.tmpdir, "q50.jpg")
        output_q95 = os.path.join(self.tmpdir, "q95.jpg")
        self.processor.process_image(self.test_image, output_q50, quality=50)
        self.processor.process_image(self.test_image, output_q95, quality=95)
        size_50 = os.path.getsize(output_q50)
        size_95 = os.path.getsize(output_q95)
        self.assertLess(size_50, size_95)

    def test_process_image_string_quality(self):
        output = os.path.join(self.tmpdir, "str_quality.jpg")
        result = self.processor.process_image(self.test_image, output, quality="85")
        self.assertTrue(result)

    def test_resize_to_fit(self):
        output = os.path.join(self.tmpdir, "resized.jpg")
        result = self.processor.process_image(
            self.test_image, output,
            target_resolution=(1920, 1080),
            auto_resize=True
        )
        self.assertTrue(result)
        from PIL import Image as PILImage
        with PILImage.open(output) as img:
            self.assertEqual(img.size, (1920, 1080))

    def test_process_image_no_resize(self):
        output = os.path.join(self.tmpdir, "no_resize.jpg")
        result = self.processor.process_image(
            self.test_image, output,
            target_resolution=(1920, 1080),
            auto_resize=False
        )
        self.assertTrue(result)
        from PIL import Image as PILImage
        with PILImage.open(output) as img:
            self.assertEqual(img.size, (800, 600))

    def test_get_image_size(self):
        size = self.processor.get_image_size(self.test_image)
        self.assertEqual(size, (800, 600))

    def test_get_image_size_nonexistent(self):
        size = self.processor.get_image_size("/nonexistent/image.jpg")
        self.assertIsNone(size)

    def test_process_rgba_image(self):
        from PIL import Image as PILImage
        rgba_path = os.path.join(self.tmpdir, "rgba.png")
        img = PILImage.new('RGBA', (400, 300), color=(100, 150, 200, 128))
        img.save(rgba_path)

        output = os.path.join(self.tmpdir, "from_rgba.jpg")
        result = self.processor.process_image(rgba_path, output, quality=85)
        self.assertTrue(result)

    def test_get_monitor_count(self):
        count = self.processor.get_monitor_count()
        self.assertGreaterEqual(count, 1)


class TestLocalSource(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self._create_test_images()

    def _create_test_images(self):
        from PIL import Image as PILImage
        for subdir in ['morning', 'noon', 'evening', 'night', '']:
            dir_path = os.path.join(self.tmpdir, subdir) if subdir else self.tmpdir
            os.makedirs(dir_path, exist_ok=True)
            img = PILImage.new('RGB', (800, 600), color=(100, 100, 100))
            img.save(os.path.join(dir_path, f"test_{subdir or 'root'}.jpg"))

    def test_get_images_in_dir(self):
        source = LocalSource(self.tmpdir)
        images = source.get_images_in_dir()
        self.assertGreaterEqual(len(images), 1)

    def test_get_images_in_subdir(self):
        source = LocalSource(self.tmpdir)
        images = source.get_images_in_dir("morning")
        self.assertGreaterEqual(len(images), 1)

    def test_get_random_image(self):
        source = LocalSource(self.tmpdir)
        image = source.get_random_image()
        self.assertIsNotNone(image)
        self.assertTrue(image.exists())

    def test_get_random_from_time_slot(self):
        source = LocalSource(self.tmpdir)
        image = source.get_random_for_time_slot("evening")
        self.assertIsNotNone(image)

    def test_nonexistent_dir(self):
        source = LocalSource("/nonexistent/path")
        images = source.get_images_in_dir()
        self.assertEqual(images, [])

    def test_empty_dir(self):
        empty_dir = os.path.join(tempfile.mkdtemp(), "empty")
        os.makedirs(empty_dir)
        source = LocalSource(empty_dir)
        image = source.get_random_image()
        self.assertIsNone(image)


class TestBingSource(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.download_dir = os.path.join(self.tmpdir, "bing")
        self.source = BingSource(self.download_dir, "zh-CN")

    @patch('sources.bing.urllib.request.urlopen')
    def test_get_daily_image_info(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({
            "images": [{
                "url": "/th?id=OHR.Test_1920x1080.jpg",
                "title": "Test Title",
                "copyright": "Test Copyright",
                "startdate": "20260530"
            }]
        }).encode('utf-8')
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        info = self.source.get_daily_image_info()
        self.assertIsNotNone(info)
        self.assertEqual(info["title"], "Test Title")
        self.assertIn("bing.com", info["url"])

    @patch('sources.bing.urllib.request.urlopen')
    def test_download_daily_image(self, mock_urlopen):
        from PIL import Image as PILImage
        import io

        mock_info_resp = MagicMock()
        mock_info_resp.read.return_value = json.dumps({
            "images": [{
                "url": "/th?id=OHR.Test_1920x1080.jpg",
                "title": "Test",
                "copyright": "Test",
                "startdate": "20260530"
            }]
        }).encode('utf-8')
        mock_info_resp.__enter__ = MagicMock(return_value=mock_info_resp)
        mock_info_resp.__exit__ = MagicMock(return_value=False)

        img = PILImage.new('RGB', (100, 100), color=(0, 0, 0))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_data = img_bytes.getvalue()

        mock_dl_resp = MagicMock()
        mock_dl_resp.read.return_value = img_data
        mock_dl_resp.__enter__ = MagicMock(return_value=mock_dl_resp)
        mock_dl_resp.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [mock_info_resp, mock_dl_resp]
        with patch('sources.bing.urllib.request.urlretrieve'):
            with patch('sources.bing.datetime') as mock_dt:
                mock_dt.now.return_value.strftime.return_value = '20260530'
                result = self.source.download_daily_image()

    @patch('sources.bing.urllib.request.urlopen')
    def test_get_daily_image_info_failure(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Network error")
        info = self.source.get_daily_image_info()
        self.assertIsNone(info)


class TestUnsplashSource(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.download_dir = os.path.join(self.tmpdir, "unsplash")
        self.source_with_key = UnsplashSource(
            self.download_dir, access_key="test_key", query="nature"
        )
        self.source_without_key = UnsplashSource(
            self.download_dir, access_key="", query="nature"
        )

    def test_no_key_returns_none_for_info(self):
        info = self.source_without_key.get_random_image_info()
        self.assertIsNone(info)

    def test_download_falls_back_to_picsum(self):
        result = self.source_without_key.download_random_image()
        if result:
            self.assertTrue(result.exists())
            self.assertIn("picsum", str(result).lower())

    @patch('sources.unsplash.urllib.request.urlopen')
    def test_api_with_key(self, mock_urlopen):
        mock_info_resp = MagicMock()
        mock_info_resp.read.return_value = json.dumps({
            "id": "abc123",
            "urls": {"raw": "https://images.unsplash.com/test", "full": "https://images.unsplash.com/test_full"}
        }).encode('utf-8')
        mock_info_resp.__enter__ = MagicMock(return_value=mock_info_resp)
        mock_info_resp.__exit__ = MagicMock(return_value=False)

        img_data = b'\xff\xd8\xff\xe0' + b'\x00' * 100
        mock_img_resp = MagicMock()
        mock_img_resp.read.return_value = img_data
        mock_img_resp.__enter__ = MagicMock(return_value=mock_img_resp)
        mock_img_resp.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [mock_info_resp, mock_img_resp]
        result = self.source_with_key.download_random_image()
        self.assertIsNotNone(result)


class TestAsciiPreview(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.preview = AsciiPreview(width=40)
        from PIL import Image as PILImage
        self.test_image = os.path.join(self.tmpdir, "preview_test.jpg")
        img = PILImage.new('RGB', (200, 100), color=(128, 128, 128))
        img.save(self.test_image)

    def test_generate_ascii(self):
        result = self.preview.generate(self.test_image)
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)

    def test_generate_colorful(self):
        result = self.preview.generate_colorful(self.test_image)
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)
        self.assertIn("\033[", result)

    def test_nonexistent_image(self):
        result = self.preview.generate("/nonexistent/image.jpg")
        self.assertIn("预览失败", result)

    def test_custom_width(self):
        result_narrow = self.preview.generate(self.test_image, width=20)
        result_wide = self.preview.generate(self.test_image, width=80)
        self.assertLess(len(result_narrow.split('\n')[0]), len(result_wide.split('\n')[0]))


class TestWallpaperSetterMultiMonitor(unittest.TestCase):
    """核心测试：多显示器场景的代码路径"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmpdir, "config.json")
        self.config = Config(self.config_path)
        self.config.set("quality", 85)
        self.config.set("auto_resize", False)
        self.config.save()

        self.logger = MagicMock()
        self.history = HistoryManager(
            os.path.join(self.tmpdir, "history.json")
        )
        self.setter = WallpaperSetter(self.config, self.logger, self.history)

        from PIL import Image as PILImage
        self.test_image = os.path.join(self.tmpdir, "wallpaper.jpg")
        img = PILImage.new('RGB', (1920, 1080), color=(50, 100, 150))
        img.save(self.test_image)

        self.test_image2 = os.path.join(self.tmpdir, "wallpaper2.jpg")
        img2 = PILImage.new('RGB', (1920, 1080), color=(150, 50, 100))
        img2.save(self.test_image2)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_primary_monitor(self, mock_os_set):
        mock_os_set.return_value = True
        result = self.setter.set_wallpaper(self.test_image, monitor=0, source="local")
        self.assertTrue(result)
        mock_os_set.assert_called_once()
        call_args = mock_os_set.call_args
        self.assertEqual(call_args[1].get('monitor', call_args[0][1] if len(call_args[0]) > 1 else 0), 0)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_secondary_monitor(self, mock_os_set):
        mock_os_set.return_value = True
        result = self.setter.set_wallpaper(self.test_image, monitor=1, source="bing")
        self.assertTrue(result)
        mock_os_set.assert_called_once()

        history = self.history.get_recent(1)
        self.assertEqual(history[0]["monitor"], "secondary")
        self.assertEqual(history[0]["source"], "bing")

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_multi_monitor(self, mock_os_set):
        mock_os_set.return_value = True
        result = self.setter.set_wallpaper_multi_monitor(
            self.test_image,
            self.test_image2,
            primary_source="local",
            secondary_source="bing"
        )
        self.assertTrue(result)
        self.assertEqual(mock_os_set.call_count, 2)

        calls = mock_os_set.call_args_list
        first_call_monitor = calls[0][0][1]
        second_call_monitor = calls[1][0][1]
        self.assertEqual(first_call_monitor, 0)
        self.assertEqual(second_call_monitor, 1)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_multi_monitor_history_records(self, mock_os_set):
        mock_os_set.return_value = True
        self.setter.set_wallpaper_multi_monitor(
            self.test_image,
            self.test_image2,
            primary_source="time",
            secondary_source="unsplash"
        )

        history = self.history.get_recent(2)
        primary_entry = [h for h in history if h["monitor"] == "primary"][0]
        secondary_entry = [h for h in history if h["monitor"] == "secondary"][0]

        self.assertEqual(primary_entry["source"], "time")
        self.assertEqual(secondary_entry["source"], "unsplash")

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_quality_override(self, mock_os_set):
        mock_os_set.return_value = True
        result = self.setter.set_wallpaper(
            self.test_image, monitor=0, quality=50
        )
        self.assertTrue(result)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_nonexistent_image(self, mock_os_set):
        result = self.setter.set_wallpaper("/nonexistent/image.jpg", monitor=0)
        self.assertFalse(result)
        mock_os_set.assert_not_called()

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_without_secondary(self, mock_os_set):
        mock_os_set.return_value = True
        result = self.setter.set_wallpaper_multi_monitor(
            self.test_image,
            None,
            primary_source="local"
        )
        self.assertTrue(result)
        mock_os_set.assert_called_once()

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_wallpaper_auto_resize(self, mock_os_set):
        mock_os_set.return_value = True
        self.config.set("auto_resize", True)

        with patch.object(ImageProcessor, 'get_screen_resolution', return_value=(1920, 1080)):
            result = self.setter.set_wallpaper(self.test_image, monitor=0)
            self.assertTrue(result)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_primary_monitor_history_name(self, mock_os_set):
        mock_os_set.return_value = True
        self.setter.set_wallpaper(self.test_image, monitor=0, source="local")
        last = self.history.get_last()
        self.assertEqual(last["monitor"], "primary")

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_secondary_monitor_history_name(self, mock_os_set):
        mock_os_set.return_value = True
        self.setter.set_wallpaper(self.test_image, monitor=1, source="bing")
        last = self.history.get_last()
        self.assertEqual(last["monitor"], "secondary")

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_third_monitor_history_name(self, mock_os_set):
        mock_os_set.return_value = True
        self.setter.set_wallpaper(self.test_image, monitor=2, source="unsplash")
        last = self.history.get_last()
        self.assertEqual(last["monitor"], "secondary")


class TestWallpaperManagerIntegration(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmpdir, "config.json")

        from PIL import Image as PILImage
        self.wp_dir = os.path.join(self.tmpdir, "wallpapers")
        for subdir in ['morning', 'noon', 'evening', 'night', '']:
            d = os.path.join(self.wp_dir, subdir) if subdir else self.wp_dir
            os.makedirs(d, exist_ok=True)
            img = PILImage.new('RGB', (800, 600), color=(100, 100, 100))
            img.save(os.path.join(d, f"test_{subdir or 'root'}.jpg"))

        config = Config(self.config_path)
        config.set("wallpaper_dir", self.wp_dir)
        config.set("download_dir", os.path.join(self.tmpdir, "downloads"))
        config.set("auto_resize", False)
        config.save()

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_from_local(self, mock_os_set):
        mock_os_set.return_value = True
        manager = WallpaperManager(self.config_path)
        result = manager.set_wallpaper_from_source("local")
        self.assertTrue(result)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_from_time(self, mock_os_set):
        mock_os_set.return_value = True
        manager = WallpaperManager(self.config_path)
        result = manager.set_wallpaper_from_source("time")
        self.assertTrue(result)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_set_from_custom_path(self, mock_os_set):
        mock_os_set.return_value = True
        manager = WallpaperManager(self.config_path)
        test_img = os.path.join(self.wp_dir, "test_root.jpg")
        result = manager.set_wallpaper_from_source(test_img)
        self.assertTrue(result)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_multi_monitor_command(self, mock_os_set):
        mock_os_set.return_value = True
        manager = WallpaperManager(self.config_path)
        result = manager.set_wallpaper_multi("local", "time")
        self.assertTrue(result)
        self.assertEqual(mock_os_set.call_count, 2)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_get_image_from_source_local(self, mock_os_set):
        manager = WallpaperManager(self.config_path)
        image = manager._get_image_from_source("local")
        self.assertIsNotNone(image)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_get_image_from_source_time(self, mock_os_set):
        manager = WallpaperManager(self.config_path)
        image = manager._get_image_from_source("time")
        self.assertIsNotNone(image)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_get_image_from_source_nonexistent(self, mock_os_set):
        manager = WallpaperManager(self.config_path)
        image = manager._get_image_from_source("/nonexistent/path.jpg")
        self.assertIsNone(image)

    @patch.object(WallpaperSetter, '_set_wallpaper_os')
    def test_show_current(self, mock_os_set):
        mock_os_set.return_value = True
        manager = WallpaperManager(self.config_path)
        manager.set_wallpaper_from_source("local")
        last = manager.history.get_last()
        self.assertIsNotNone(last)
        self.assertIn("path", last)


class TestMacOSWallpaperSetter(unittest.TestCase):
    """macOS特定壁纸设置逻辑测试"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmpdir, "config.json")
        self.config = Config(self.config_path)
        self.config.set("auto_resize", False)
        self.config.save()

        from PIL import Image as PILImage
        self.test_image = os.path.join(self.tmpdir, "mac_wallpaper.jpg")
        img = PILImage.new('RGB', (1920, 1080), color=(0, 0, 0))
        img.save(self.test_image)

    @patch('wallpaper_setter.subprocess.run')
    def test_macos_applescript_fallback(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0)
        setter = WallpaperSetter(self.config, MagicMock(), MagicMock())

        with patch.dict('sys.modules', {'AppKit': None}):
            result = setter._set_wallpaper_macos(self.test_image, monitor=0)

        self.assertTrue(result)
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        self.assertEqual(call_args[0], 'osascript')

    @patch('wallpaper_setter.subprocess.run')
    def test_macos_applescript_monitor_index(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0)
        setter = WallpaperSetter(self.config, MagicMock(), MagicMock())

        setter._set_wallpaper_macos(self.test_image, monitor=1)

        script = mock_run.call_args[0][0][2]
        self.assertIn("item 2", script)

    @patch('wallpaper_setter.subprocess.run')
    def test_macos_applescript_primary_monitor(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0)
        setter = WallpaperSetter(self.config, MagicMock(), MagicMock())

        setter._set_wallpaper_macos(self.test_image, monitor=0)

        script = mock_run.call_args[0][0][2]
        self.assertIn("item 1", script)


if __name__ == "__main__":
    unittest.main(verbosity=2)
