#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tkinter as tk
from tkinter import ttk
from PIL import Image

from main import ImageBatchProcessorApp


def get_window_id():
    try:
        script = '''
        tell application "System Events"
            set windowList to {}
            repeat with p in (processes whose name is "Python")
                repeat with w in windows of p
                    if (name of w contains "图像批量处理工具") then
                        return id of w as string
                    end if
                end repeat
            end repeat
            return ""
        end tell
        '''
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True, text=True, timeout=5
        )
        win_id = result.stdout.strip()
        if win_id:
            print(f"  找到窗口ID: {win_id}")
            return win_id
    except Exception as e:
        print(f"  AppleScript获取窗口ID失败: {e}")
    return None


def run_app_and_screenshot():
    screenshot_dir = 'real_screenshots'
    os.makedirs(screenshot_dir, exist_ok=True)
    test_image_dir = 'test_images'

    root = tk.Tk()
    root.title("图像批量处理工具")
    root.geometry("1600x1000+100+50")

    style = ttk.Style()
    try:
        style.theme_use('clam')
    except:
        pass

    app = ImageBatchProcessorApp(root)
    root.update_idletasks()
    root.lift()
    root.attributes('-topmost', True)
    root.after(100, lambda: root.attributes('-topmost', False))
    root.update()

    time.sleep(1.0)

    window_id = None
    for _ in range(3):
        window_id = get_window_id()
        if window_id:
            break
        time.sleep(0.5)

    print("\n" + "=" * 70)
    print("🚀 程序已启动，准备截取真实界面（Mac系统screencapture工具）")
    print("=" * 70)
    if window_id:
        print(f"✅ 使用窗口ID精确捕获: {window_id}")
    else:
        print("⚠️  未找到窗口ID，将使用坐标方式（需确保程序窗口在屏幕左上方）")

    def take_real_screenshot(filename, description):
        time.sleep(0.4)
        root.update()
        root.update_idletasks()
        root.lift()
        root.focus_force()
        time.sleep(0.3)

        filepath = os.path.join(screenshot_dir, filename)

        try:
            if window_id:
                subprocess.run([
                    'screencapture', '-x', '-l', window_id,
                    filepath
                ], check=True, timeout=5)
            else:
                x = root.winfo_rootx()
                y = root.winfo_rooty()
                w = root.winfo_width()
                h = root.winfo_height()
                subprocess.run([
                    'screencapture', '-x', '-R',
                    f'{x},{y},{w},{h}',
                    filepath
                ], check=True, timeout=5)

            for _ in range(10):
                if os.path.exists(filepath) and os.path.getsize(filepath) > 2000:
                    break
                time.sleep(0.1)

            if os.path.exists(filepath) and os.path.getsize(filepath) > 2000:
                img = Image.open(filepath)
                size_kb = os.path.getsize(filepath) / 1024
                print(f"  ✅ 真实截图: {filename}")
                print(f"     尺寸: {img.size[0]}x{img.size[1]} | {size_kb:.1f} KB | {description}")
                return True
            else:
                print(f"  ❌ 失败: {filename}")
                return False
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            return False

    test_files = []
    for f in sorted(os.listdir(test_image_dir)):
        fpath = os.path.join(test_image_dir, f)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')):
            test_files.append(fpath)

    app.batch_processor.add_files(test_files)
    app.refresh_file_list()
    root.update()
    time.sleep(0.3)

    if test_files:
        app.file_listbox.selection_set(0)
        app.on_file_select(None)
        root.update()
        time.sleep(0.3)

    screenshots_tasks = [
        ('01_main_11tabs.png', '主界面+11个功能选项卡', 0, None),
        ('02_compare_preview.png', '对比预览-老照片滤镜', 2, lambda: (
            app.filter_name.set("老照片"),
            app.preview_filter()
        )),
        ('03_task_queue.png', '任务队列-所有按钮', 9, lambda: (
            app.clear_tasks(),
            setattr(app, 'resize_width', app.resize_width),
            app.resize_width.set(1024),
            app.resize_height.set(768),
            app.add_resize_task(),
            app.convert_format.set("PNG"),
            app.convert_quality.set(90),
            app.add_convert_task(),
            app.filter_name.set("灰度化"),
            app.add_filter_task(),
            app.refresh_queue_list(),
            app.queue_listbox.selection_set(1)
        )),
        ('04_file_list.png', '文件列表-文件夹扫描+格式过滤', 0, lambda: (
            app.batch_processor.clear_files(),
            app.batch_processor.add_folder(test_image_dir),
            app.refresh_file_list()
        )),
        ('05_color_realtime.png', '颜色调整-实时预览', 7, lambda: (
            app.color_vars['brightness'].set(1.4),
            app.color_vars['contrast'].set(1.2),
            app.color_vars['saturation'].set(0.7),
            app.color_vars['hue'].set(0.1),
            app.color_vars['sharpness'].set(1.3),
            time.sleep(0.1),
            app.preview_colors()
        )),
        ('06_resize.png', '尺寸调整-像素/百分比/插值', 0, lambda: (
            app.resize_mode.set("pixel"),
            app.resize_width.set(1920),
            app.resize_height.set(1080),
            app.keep_aspect.set(True),
            app.interpolation_var.set("双三次 (Bicubic)")
        )),
        ('07_watermark.png', '水印添加-文字水印设置', 3, lambda: (
            app.watermark_type.set("text"),
            app.wm_text.set("© 版权所有 2026"),
            app.wm_font_size.set(48),
            app.wm_opacity.set(0.6),
            app.wm_rotation.set(30),
            app.wm_position.set("右下"),
            app.wm_scale.set(0.3),
            app.preview_watermark()
        )),
        ('08_rename.png', '批量重命名-预览', 4, lambda: (
            app.rename_mode.set("序号+前缀"),
            app.rename_prefix.set("vacation_2026_"),
            app.rename_start.set(1),
            app.rename_padding.set(4),
            app.preview_rename()
        )),
        ('09_crop.png', '自动裁剪-固定尺寸', 5, lambda: (
            app.crop_mode.set("固定尺寸"),
            app.crop_width.set(800),
            app.crop_height.set(600),
            app.preview_crop()
        )),
        ('10_rotate.png', '旋转翻转-90度旋转', 6, lambda: (
            app.rotate_operation.set("90度顺时针"),
            app.preview_rotate()
        )),
    ]

    for i, (filename, desc, tab_idx, action) in enumerate(screenshots_tasks, 1):
        print(f"\n--- 截图 {i}/10 ---")
        try:
            app.control_notebook.select(tab_idx)
            root.update()
            if action:
                action()
            root.update()
            take_real_screenshot(filename, desc)
        except Exception as e:
            print(f"  ❌ 截图{i}异常: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 70)
    print("📸 真实截图完成！")
    print("=" * 70)

    print("\n最终截图文件列表:")
    success_count = 0
    for f in sorted(os.listdir(screenshot_dir)):
        if f.endswith('.png'):
            filepath = os.path.join(screenshot_dir, f)
            try:
                img = Image.open(filepath)
                size_kb = os.path.getsize(filepath) / 1024
                print(f"  {f}: {img.size[0]}x{img.size[1]} ({size_kb:.1f} KB)")
                success_count += 1
            except:
                print(f"  {f}: 损坏")

    print(f"\n✅ 共 {success_count} 张有效真实截图")
    print(f"📁 保存目录: {os.path.abspath(screenshot_dir)}")

    time.sleep(1)
    root.destroy()


def main():
    try:
        run_app_and_screenshot()
        return 0
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
