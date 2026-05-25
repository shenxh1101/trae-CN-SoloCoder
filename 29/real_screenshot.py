#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tkinter as tk
from tkinter import ttk
from PIL import Image

from main import ImageBatchProcessorApp


def run_app_and_screenshot():
    screenshot_dir = 'real_screenshots'
    os.makedirs(screenshot_dir, exist_ok=True)
    test_image_dir = 'test_images'

    root = tk.Tk()
    root.title("图像批量处理工具")
    root.geometry("1600x1000")

    style = ttk.Style()
    try:
        style.theme_use('clam')
    except:
        pass

    app = ImageBatchProcessorApp(root)
    root.update_idletasks()

    time.sleep(0.5)

    print("\n" + "=" * 60)
    print("🚀 程序已启动，准备截取真实界面...")
    print("=" * 60)

    def take_real_screenshot(filename, description):
        time.sleep(0.3)
        root.update()
        root.update_idletasks()
        time.sleep(0.2)

        filepath = os.path.join(screenshot_dir, filename)

        try:
            x = root.winfo_rootx()
            y = root.winfo_rooty()
            w = root.winfo_width()
            h = root.winfo_height()

            print(f"  窗口位置: ({x}, {y}), 尺寸: {w}x{h}")

            capture_x = max(0, x)
            capture_y = max(0, y)
            capture_w = w
            capture_h = h

            subprocess.run([
                'screencapture', '-x', '-R',
                f'{capture_x},{capture_y},{capture_w},{capture_h}',
                filepath
            ], check=True)

            if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
                img = Image.open(filepath)
                print(f"  ✅ 真实截图成功: {filename}")
                print(f"     尺寸: {img.size[0]}x{img.size[1]}, 大小: {os.path.getsize(filepath)/1024:.1f} KB")
                print(f"     说明: {description}")
                return True
            else:
                print(f"  ❌ 截图失败: {filename} (文件过小或不存在)")
                return False
        except Exception as e:
            print(f"  ❌ 截图异常: {e}")
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

    print("\n=== 截图 1: 主界面 + 11个功能选项卡 ===")
    app.control_notebook.select(0)
    root.update()
    take_real_screenshot('01_main_window_11_tabs.png', '主界面-11个功能选项卡全部可见')

    print("\n=== 截图 2: 对比预览功能 ===")
    app.control_notebook.select(2)
    app.filter_name.set("老照片")
    app.preview_filter()
    root.update()
    take_real_screenshot('02_compare_preview.png', '对比预览-左侧原图右侧处理后(老照片滤镜)')

    print("\n=== 截图 3: 任务队列界面 ===")
    app.control_notebook.select(9)
    app.clear_tasks()
    app.resize_width.set(1024)
    app.resize_height.set(768)
    app.add_resize_task()
    app.convert_format.set("PNG")
    app.convert_quality.set(90)
    app.add_convert_task()
    app.filter_name.set("灰度化")
    app.add_filter_task()
    app.refresh_queue_list()
    app.queue_listbox.selection_set(1)
    root.update()
    take_real_screenshot('03_task_queue.png', '任务队列-上移/下移/删除/清空/保存模板/开始/暂停/继续/取消按钮完整')

    print("\n=== 截图 4: 文件列表 + 格式过滤 ===")
    app.control_notebook.select(0)
    app.batch_processor.clear_files()
    app.batch_processor.add_folder(test_image_dir)
    app.refresh_file_list()
    root.update()
    take_real_screenshot('04_file_list.png', '文件列表-添加文件夹后显示6个图片(自动排除txt/csv)')

    print("\n=== 截图 5: 颜色调整实时预览 ===")
    app.control_notebook.select(7)
    app.file_listbox.selection_set(0)
    app.on_file_select(None)
    root.update()
    time.sleep(0.2)
    app.color_vars['brightness'].set(1.4)
    app.color_vars['contrast'].set(1.2)
    app.color_vars['saturation'].set(0.7)
    app.color_vars['hue'].set(0.1)
    app.color_vars['sharpness'].set(1.3)
    root.update()
    time.sleep(0.3)
    app.preview_colors()
    root.update()
    take_real_screenshot('05_color_adjust_realtime.png', '颜色调整-5个滑动条调节后预览图实时更新')

    print("\n=== 截图 6: 尺寸调整选项卡 ===")
    app.control_notebook.select(0)
    app.resize_mode.set("pixel")
    app.resize_width.set(1920)
    app.resize_height.set(1080)
    app.keep_aspect.set(True)
    root.update()
    take_real_screenshot('06_resize_tab.png', '尺寸调整-像素模式/百分比模式/插值算法选择')

    print("\n=== 截图 7: 水印添加选项卡 ===")
    app.control_notebook.select(3)
    app.watermark_type.set("text")
    app.wm_text.set("© 版权所有")
    app.wm_font_size.set(48)
    app.wm_opacity.set(0.6)
    app.wm_rotation.set(30)
    app.wm_position.set("右下")
    app.preview_watermark()
    root.update()
    take_real_screenshot('07_watermark_tab.png', '水印添加-文字水印/位置/透明度/旋转角度设置')

    print("\n=== 截图 8: 批量重命名选项卡 ===")
    app.control_notebook.select(4)
    app.rename_mode.set("序号+前缀")
    app.rename_prefix.set("holiday_")
    app.rename_start.set(1)
    app.preview_rename()
    root.update()
    take_real_screenshot('08_batch_rename.png', '批量重命名-预览功能显示新旧文件名对照')

    print("\n=== 截图 9: 自动裁剪选项卡 ===")
    app.control_notebook.select(5)
    app.crop_mode.set("固定尺寸")
    app.crop_width.set(800)
    app.crop_height.set(600)
    app.preview_crop()
    root.update()
    take_real_screenshot('09_auto_crop.png', '自动裁剪-固定尺寸/比例/智能边缘检测')

    print("\n=== 截图 10: 旋转翻转选项卡 ===")
    app.control_notebook.select(6)
    app.rotate_operation.set("90度顺时针")
    app.preview_rotate()
    root.update()
    take_real_screenshot('10_rotate_flip.png', '旋转翻转-90/180/270度/镜像/自定义角度')

    print("\n" + "=" * 60)
    print("📸 真实截图完成！")
    print("=" * 60)

    print("\n真实截图文件列表:")
    for f in sorted(os.listdir(screenshot_dir)):
        if f.endswith('.png'):
            filepath = os.path.join(screenshot_dir, f)
            img = Image.open(filepath)
            size_kb = os.path.getsize(filepath) / 1024
            print(f"  {f}: {img.size[0]}x{img.size[1]} ({size_kb:.1f} KB)")

    print(f"\n共 {len([f for f in os.listdir(screenshot_dir) if f.endswith('.png')])} 张真实截图")
    print(f"保存目录: {os.path.abspath(screenshot_dir)}")

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
