#!/usr/bin/env python3
import sys
import subprocess
import tempfile
from pathlib import Path
from image_processor import ImageProcessor


class WallpaperSetter:
    def __init__(self, config, logger=None, history=None):
        self.config = config
        self.logger = logger
        self.history = history
        self.image_processor = ImageProcessor(logger)
        self.temp_dir = Path(tempfile.gettempdir()) / "wallpaper_manager"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def set_wallpaper(self, image_path, monitor=0, source="local",
                      quality=None, auto_resize=None):
        image_path = Path(image_path)
        if not image_path.exists():
            if self.logger:
                self.logger.error(f"图片不存在: {image_path}")
            return False

        if quality is None:
            quality = self.config.get("quality", 85)
        if auto_resize is None:
            auto_resize = self.config.get("auto_resize", True)

        target_resolution = None
        if auto_resize:
            target_resolution = self.image_processor.get_screen_resolution(monitor)

        processed_path = self.temp_dir / f"processed_{monitor}_{image_path.stem}.jpg"
        success = self.image_processor.process_image(
            image_path, processed_path,
            quality=quality,
            target_resolution=target_resolution,
            auto_resize=auto_resize
        )
        if not success:
            processed_path = image_path

        set_result = self._set_wallpaper_os(processed_path, monitor)

        if set_result and self.history:
            monitor_name = "primary" if monitor == 0 else "secondary"
            self.history.add_entry(image_path, source=source, monitor=monitor_name)

        if self.logger and set_result:
            monitor_name = "主显示器" if monitor == 0 else f"显示器{monitor + 1}"
            self.logger.info(f"壁纸已设置到{monitor_name}: {image_path}")

        return set_result

    def _set_wallpaper_os(self, image_path, monitor=0):
        try:
            if sys.platform == 'darwin':
                return self._set_wallpaper_macos(image_path, monitor)
            elif sys.platform.startswith('win'):
                return self._set_wallpaper_windows(image_path, monitor)
            elif sys.platform.startswith('linux'):
                return self._set_wallpaper_linux(image_path, monitor)
            else:
                if self.logger:
                    self.logger.error(f"不支持的操作系统: {sys.platform}")
                return False
        except Exception as e:
            if self.logger:
                self.logger.error(f"设置壁纸失败: {e}")
            return False

    def _set_wallpaper_macos(self, image_path, monitor=0):
        try:
            from AppKit import (
                NSWorkspace, NSScreen,
                NSDesktopImageURLKey,
                NSDesktopImageScalingKey,
                NSImageScaleProportionallyUpOrDown
            )

            workspace = NSWorkspace.sharedWorkspace()
            screens = NSScreen.screens()

            if monitor >= len(screens):
                monitor = 0

            screen = screens[monitor]
            options = {
                NSDesktopImageScalingKey: NSImageScaleProportionallyUpOrDown
            }
            url = Path(image_path).absolute().as_uri()
            workspace.setDesktopImageURL_forScreen_options_error_(
                url, screen, options, None
            )
            return True
        except ImportError:
            script = f'''
            tell application "System Events"
                set desktopCount to count of desktops
                if desktopCount > {monitor} then
                    set picture of item {monitor + 1} of desktops to POSIX file "{image_path}"
                end if
            end tell
            '''
            subprocess.run(['osascript', '-e', script], capture_output=True)
            return True
        except Exception as e:
            if self.logger:
                self.logger.error(f"macOS设置壁纸失败: {e}")
            return False

    def _set_wallpaper_windows(self, image_path, monitor=0):
        try:
            import ctypes
            SPI_SETDESKWALLPAPER = 0x0014
            SPIF_UPDATEINIFILE = 0x01
            SPIF_SENDWININICHANGE = 0x02

            image_path_str = str(Path(image_path).absolute())
            ctypes.windll.user32.SystemParametersInfoW(
                SPI_SETDESKWALLPAPER, 0, image_path_str,
                SPIF_UPDATEINIFILE | SPIF_SENDWININICHANGE
            )
            return True
        except Exception as e:
            if self.logger:
                self.logger.error(f"Windows设置壁纸失败: {e}")
            return False

    def _set_wallpaper_linux(self, image_path, monitor=0):
        image_path_str = str(Path(image_path).absolute())

        desktop_env = self._get_desktop_environment()

        try:
            if desktop_env in ['gnome', 'unity', 'cinnamon', 'pantheon']:
                cmd = [
                    'gsettings', 'set', 'org.gnome.desktop.background',
                    'picture-uri', f'file://{image_path_str}'
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            elif desktop_env == 'xfce':
                cmd = [
                    'xfconf-query', '--channel', 'xfce4-desktop',
                    '--property', f'/backdrop/screen0/monitor{monitor}/workspace0/last-image',
                    '--set', image_path_str
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            elif desktop_env == 'kde':
                script = f'''
                var allDesktops = desktops();
                for (i=0;i<allDesktops.length;i++) {{
                    d = allDesktops[i];
                    d.wallpaperPlugin = "org.kde.image";
                    d.currentConfigGroup = Array("Wallpaper", "org.kde.image", "General");
                    d.writeConfig("Image", "file://{image_path_str}");
                }}
                '''
                cmd = [
                    'qdbus', 'org.kde.plasmashell', '/PlasmaShell',
                    'org.kde.PlasmaShell.evaluateScript', script
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            elif desktop_env == 'mate':
                cmd = [
                    'gsettings', 'set', 'org.mate.background',
                    'picture-filename', image_path_str
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            elif desktop_env == 'lxde':
                cmd = [
                    'pcmanfm', '--set-wallpaper', image_path_str,
                    '--wallpaper-mode', 'fit'
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            else:
                cmd = ['feh', '--bg-scale', image_path_str]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
        except Exception as e:
            if self.logger:
                self.logger.error(f"Linux设置壁纸失败 ({desktop_env}): {e}")
            return False

    def _get_desktop_environment(self):
        import os
        de = os.environ.get('XDG_CURRENT_DESKTOP', '').lower()
        if 'gnome' in de:
            return 'gnome'
        elif 'unity' in de:
            return 'unity'
        elif 'cinnamon' in de:
            return 'cinnamon'
        elif 'pantheon' in de:
            return 'pantheon'
        elif 'xfce' in de:
            return 'xfce'
        elif 'kde' in de:
            return 'kde'
        elif 'mate' in de:
            return 'mate'
        elif 'lxde' in de:
            return 'lxde'
        elif 'lxqt' in de:
            return 'lxqt'
        return 'unknown'

    def set_wallpaper_multi_monitor(self, primary_image, secondary_image=None,
                                    primary_source="local", secondary_source="local",
                                    quality=None, auto_resize=None):
        success = True
        success = self.set_wallpaper(
            primary_image, monitor=0, source=primary_source,
            quality=quality, auto_resize=auto_resize
        ) and success

        if secondary_image:
            success = self.set_wallpaper(
                secondary_image, monitor=1, source=secondary_source,
                quality=quality, auto_resize=auto_resize
            ) and success

        return success
