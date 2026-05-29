import os
import time
import platform
from typing import Optional, Tuple
from PIL import Image, ImageDraw
import mss
import pyautogui


class ScreenCapture:
    def __init__(self):
        self.sct = mss.mss()

    def get_monitors(self):
        return self.sct.monitors

    def list_monitors(self):
        monitors = self.get_monitors()
        print("可用显示器:")
        for i, mon in enumerate(monitors):
            if i == 0:
                print(f"  {i}: 所有显示器 (合并) - {mon['width']}x{mon['height']}")
            else:
                print(f"  {i}: 显示器 {i} - {mon['width']}x{mon['height']} 位置: ({mon['left']}, {mon['top']})")

    def capture_full_screen(self, monitor: int = 0) -> Image.Image:
        monitors = self.get_monitors()
        if monitor >= len(monitors):
            raise ValueError(f"显示器 {monitor} 不存在，共 {len(monitors)} 个显示器")
        monitor_info = monitors[monitor]
        sct_img = self.sct.grab(monitor_info)
        return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

    def capture_active_window(self) -> Image.Image:
        system = platform.system()
        if system == "Windows":
            return self._capture_active_window_windows()
        elif system == "Darwin":
            return self._capture_active_window_mac()
        else:
            return self._capture_active_window_linux()

    def _capture_active_window_windows(self) -> Image.Image:
        try:
            import pygetwindow as gw
            active_win = gw.getActiveWindow()
            if active_win:
                bbox = (active_win.left, active_win.top, 
                        active_win.left + active_win.width, 
                        active_win.top + active_win.height)
                sct_img = self.sct.grab(bbox)
                return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        except Exception as e:
            print(f"获取活动窗口失败: {e}，使用全屏截图")
        return self.capture_full_screen()

    def _capture_active_window_mac(self) -> Image.Image:
        try:
            from Quartz import (CGWindowListCopyWindowInfo, 
                              kCGWindowListOptionOnScreenOnly, 
                              kCGNullWindowID,
                              kCGWindowName,
                              kCGWindowNumber)
            window_list = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly, kCGNullWindowID
            )
            if window_list and len(window_list) > 0:
                front_window = window_list[0]
                bounds = front_window.get("kCGWindowBounds")
                if bounds:
                    left = int(bounds["X"])
                    top = int(bounds["Y"])
                    width = int(bounds["Width"])
                    height = int(bounds["Height"])
                    bbox = {"left": left, "top": top, "width": width, "height": height}
                    sct_img = self.sct.grab(bbox)
                    return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        except Exception as e:
            print(f"获取活动窗口失败: {e}，使用全屏截图")
        return self.capture_full_screen()

    def _capture_active_window_linux(self) -> Image.Image:
        try:
            import pygetwindow as gw
            active_win = gw.getActiveWindow()
            if active_win:
                bbox = (active_win.left, active_win.top, 
                        active_win.left + active_win.width, 
                        active_win.top + active_win.height)
                sct_img = self.sct.grab(bbox)
                return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        except Exception as e:
            print(f"获取活动窗口失败: {e}，使用全屏截图")
        return self.capture_full_screen()

    def capture_circular_area(self, radius: int, monitor: int = 0) -> Image.Image:
        x, y = pyautogui.position()
        monitors = self.get_monitors()
        if monitor >= len(monitors):
            raise ValueError(f"显示器 {monitor} 不存在")
        mon = monitors[monitor]
        
        left = max(mon["left"], x - radius)
        top = max(mon["top"], y - radius)
        right = min(mon["left"] + mon["width"], x + radius)
        bottom = min(mon["top"] + mon["height"], y + radius)
        
        bbox = {"left": int(left), "top": int(top), 
                "width": int(right - left), "height": int(bottom - top)}
        
        sct_img = self.sct.grab(bbox)
        img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        center_x = img.width // 2
        center_y = img.height // 2
        actual_radius = min(center_x, center_y, radius)
        draw.ellipse([center_x - actual_radius, center_y - actual_radius,
                      center_x + actual_radius, center_y + actual_radius],
                     fill=255)
        
        result = Image.new("RGBA", img.size, (0, 0, 0, 0))
        result.paste(img, (0, 0))
        result.putalpha(mask)
        
        return result

    def capture_region(self, region: Tuple[int, int, int, int]) -> Image.Image:
        left, top, width, height = region
        bbox = {"left": left, "top": top, "width": width, "height": height}
        sct_img = self.sct.grab(bbox)
        return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

    def capture(self, mode: str = "full", monitor: int = 0, 
                radius: int = 200, region: Optional[Tuple[int, int, int, int]] = None) -> Image.Image:
        if mode == "full":
            return self.capture_full_screen(monitor)
        elif mode == "window":
            return self.capture_active_window()
        elif mode == "circle":
            return self.capture_circular_area(radius, monitor)
        elif mode == "region" and region:
            return self.capture_region(region)
        else:
            raise ValueError(f"不支持的截图模式: {mode}")
