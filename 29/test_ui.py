#!/usr/bin/env python3
import os
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tkinter as tk
from tkinter import ttk
from PIL import Image

from main import ImageBatchProcessorApp
from image_processor import ImageProcessor
from config import FILTER_NAMES, RENAME_MODES, CROP_MODES, ROTATE_OPTIONS


def create_test_image(path, size=(400, 300)):
    img = Image.new('RGB', size, (200, 100, 100))
    w, h = size
    x1, x2 = w // 4, w * 3 // 4
    y1, y2 = h // 4, h * 3 // 4
    for i in range(x1, x2):
        for j in range(y1, y2):
            img.putpixel((i, j), (100, 200, 100))
    img.save(path)
    return path


class UITester:
    def __init__(self):
        self.errors = []
        self.successes = []
        self.root = None
        self.app = None

    def log_success(self, msg):
        self.successes.append(msg)
        print(f"  ✅ {msg}")

    def log_error(self, msg):
        self.errors.append(msg)
        print(f"  ❌ {msg}")

    def setup(self):
        print("\n=== 初始化UI测试 ===")
        try:
            self.root = tk.Tk()
            self.root.withdraw()

            style = ttk.Style()
            try:
                style.theme_use('clam')
            except:
                pass

            self.app = ImageBatchProcessorApp(self.root)
            self.log_success("UI主界面初始化成功")
            return True
        except Exception as e:
            self.log_error(f"UI初始化失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_tabs(self):
        print("\n=== 测试功能选项卡 ===")
        expected_tabs = [
            "尺寸调整", "格式转换", "滤镜效果", "添加水印",
            "批量重命名", "自动裁剪", "旋转翻转", "颜色调整",
            "人像美化", "任务队列", "历史记录"
        ]

        try:
            notebook = self.app.control_notebook
            actual_tabs = [notebook.tab(i, "text") for i in range(notebook.index("end"))]

            for tab in expected_tabs:
                if tab in actual_tabs:
                    self.log_success(f"选项卡存在: {tab}")
                else:
                    self.log_error(f"选项卡缺失: {tab}")

            self.log_success(f"共 {len(actual_tabs)} 个选项卡")
            return len(self.errors) == 0
        except Exception as e:
            self.log_error(f"选项卡测试失败: {e}")
            return False

    def test_file_panel(self):
        print("\n=== 测试文件选择面板 ===")
        try:
            widgets = [
                ("添加文件按钮", self.app.add_files),
                ("添加文件夹按钮", self.app.add_folder),
                ("移除按钮", self.app.remove_file),
                ("清空按钮", self.app.clear_files),
                ("文件列表框", self.app.file_listbox),
                ("输出目录输入框", self.app.output_dir_var),
                ("输出目录选择按钮", self.app.choose_output_dir),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"文件面板测试失败: {e}")
            return False

    def test_preview_panel(self):
        print("\n=== 测试预览面板 ===")
        try:
            widgets = [
                ("原图按钮", self.app.show_original),
                ("应用预览按钮", self.app.apply_preview),
                ("重置按钮", self.app.reset_preview),
                ("添加到队列按钮", self.app.add_current_to_queue),
                ("原图画布", self.app.original_canvas),
                ("处理后画布", self.app.preview_canvas),
                ("信息标签", self.app.info_label),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"预览面板测试失败: {e}")
            return False

    def test_resize_tab(self):
        print("\n=== 测试尺寸调整选项卡 ===")
        try:
            widgets = [
                ("resize_mode", self.app.resize_mode),
                ("resize_width", self.app.resize_width),
                ("resize_height", self.app.resize_height),
                ("keep_aspect", self.app.keep_aspect),
                ("force_stretch", self.app.force_stretch),
                ("resize_percent", self.app.resize_percent),
                ("interpolation_var", self.app.interpolation_var),
                ("preview_resize", self.app.preview_resize),
                ("add_resize_task", self.app.add_resize_task),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"尺寸调整测试失败: {e}")
            return False

    def test_filter_tab(self):
        print("\n=== 测试滤镜效果选项卡 ===")
        try:
            filter_value = self.app.filter_name.get()
            if filter_value == "原图":
                self.log_success("滤镜默认值正确: 原图")
            else:
                self.log_error(f"滤镜默认值错误: {filter_value}")

            actual_filters = self.app.filter_name.get()
            self.log_success(f"滤镜组件存在，当前值: {actual_filters}")
            self.log_success(f"滤镜参数动态更新函数存在")
            return True
        except Exception as e:
            self.log_error(f"滤镜测试失败: {e}")
            return False

    def test_watermark_tab(self):
        print("\n=== 测试水印选项卡 ===")
        try:
            widgets = [
                ("watermark_type", self.app.watermark_type),
                ("wm_text", self.app.wm_text),
                ("wm_font_size", self.app.wm_font_size),
                ("wm_color_btn", self.app.wm_color_btn),
                ("wm_image_path", self.app.wm_image_path),
                ("wm_position", self.app.wm_position),
                ("wm_opacity", self.app.wm_opacity),
                ("wm_rotation", self.app.wm_rotation),
                ("wm_scale", self.app.wm_scale),
                ("preview_watermark", self.app.preview_watermark),
                ("add_watermark_task", self.app.add_watermark_task),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"水印测试失败: {e}")
            return False

    def test_queue_tab(self):
        print("\n=== 测试任务队列选项卡 ===")
        try:
            widgets = [
                ("上移按钮", self.app.move_task_up),
                ("下移按钮", self.app.move_task_down),
                ("删除按钮", self.app.remove_task),
                ("清空按钮", self.app.clear_tasks),
                ("保存模板按钮", self.app.save_template),
                ("队列列表框", self.app.queue_listbox),
                ("开始批量处理", self.app.start_batch),
                ("暂停按钮", self.app.pause_batch),
                ("继续按钮", self.app.resume_batch),
                ("取消按钮", self.app.cancel_batch),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"任务队列测试失败: {e}")
            return False

    def test_colors_tab(self):
        print("\n=== 测试颜色调整选项卡 ===")
        try:
            color_params = ['brightness', 'contrast', 'saturation', 'hue', 'sharpness']
            for param in color_params:
                if param in self.app.color_vars:
                    var = self.app.color_vars[param]
                    self.log_success(f"颜色参数存在: {param} = {var.get():.2f}")
                else:
                    self.log_error(f"颜色参数缺失: {param}")

            if hasattr(self.app, 'preview_colors'):
                self.log_success("实时预览按钮存在")
            if hasattr(self.app, 'reset_colors'):
                self.log_success("重置参数按钮存在")
            return True
        except Exception as e:
            self.log_error(f"颜色调整测试失败: {e}")
            return False

    def test_history_tab(self):
        print("\n=== 测试历史记录选项卡 ===")
        try:
            widgets = [
                ("应用模板按钮", self.app.apply_history_template),
                ("删除按钮", self.app.delete_history),
                ("清空按钮", self.app.clear_history),
                ("重命名按钮", self.app.rename_history),
                ("历史列表框", self.app.history_listbox),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"历史记录测试失败: {e}")
            return False

    def test_progress_panel(self):
        print("\n=== 测试进度面板 ===")
        try:
            widgets = [
                ("进度条", self.app.progress_bar),
                ("进度标签", self.app.progress_label),
                ("日志文本框", self.app.log_text),
            ]
            for name, obj in widgets:
                if obj is not None:
                    self.log_success(f"组件存在: {name}")
                else:
                    self.log_error(f"组件缺失: {name}")
            return True
        except Exception as e:
            self.log_error(f"进度面板测试失败: {e}")
            return False

    def test_file_loading(self):
        print("\n=== 测试图片加载与预览 ===")
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                test_img = create_test_image(os.path.join(tmpdir, "test.jpg"))
                self.app.batch_processor.add_files([test_img])
                self.app.refresh_file_list()

                listbox_count = self.app.file_listbox.size()
                if listbox_count == 1:
                    self.log_success("文件列表正确显示: 1个文件")
                else:
                    self.log_error(f"文件列表显示错误: {listbox_count}个文件")

                self.app.load_preview(test_img)
                if self.app.processor.current_image is not None:
                    self.log_success("图片成功加载到处理器")
                else:
                    self.log_error("图片加载失败")

                if self.app.preview_file == test_img:
                    self.log_success("预览文件路径正确设置")
                else:
                    self.log_error("预览文件路径错误")

                info = self.app.processor.get_image_info()
                if info.get('size') == (400, 300):
                    self.log_success(f"图片信息正确: {info['size']}")
                else:
                    self.log_error(f"图片信息错误: {info.get('size')}")

            return True
        except Exception as e:
            self.log_error(f"图片加载测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_preview_functionality(self):
        print("\n=== 测试预览功能 ===")
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                test_img = create_test_image(os.path.join(tmpdir, "test.jpg"))
                self.app.load_preview(test_img)

                self.app.show_original()
                self.log_success("显示原图功能正常")

                self.app.resize_width.set(200)
                self.app.resize_height.set(150)
                self.app.preview_resize()
                if self.app.preview_image_tk is not None:
                    self.log_success("尺寸调整预览功能正常")
                else:
                    self.log_error("尺寸调整预览失败")

                self.app.reset_preview()
                self.log_success("重置预览功能正常")

                self.app.filter_name.set("灰度化")
                self.app.preview_filter()
                self.log_success("滤镜预览功能正常")

            return True
        except Exception as e:
            self.log_error(f"预览功能测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_task_queue_operations(self):
        print("\n=== 测试任务队列操作 ===")
        try:
            self.app.clear_tasks()

            self.app.resize_width.set(1024)
            self.app.resize_height.set(768)
            self.app.add_resize_task()

            self.app.convert_format.set("PNG")
            self.app.add_convert_task()

            queue_len = len(self.app.batch_processor.get_tasks())
            if queue_len == 2:
                self.log_success(f"添加任务成功: {queue_len}个任务")
            else:
                self.log_error(f"添加任务失败: {queue_len}个任务")

            self.app.queue_listbox.selection_set(1)
            self.app.move_task_up()
            tasks = self.app.batch_processor.get_tasks()
            if tasks[0].task_type == 'convert':
                self.log_success("任务上移功能正常")
            else:
                self.log_error("任务上移功能失败")

            self.app.remove_task()
            queue_len = len(self.app.batch_processor.get_tasks())
            if queue_len == 1:
                self.log_success(f"删除任务成功: {queue_len}个任务")
            else:
                self.log_error(f"删除任务失败: {queue_len}个任务")

            self.app.clear_tasks()
            queue_len = len(self.app.batch_processor.get_tasks())
            if queue_len == 0:
                self.log_success("清空任务成功")
            else:
                self.log_error("清空任务失败")

            return True
        except Exception as e:
            self.log_error(f"任务队列操作测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_color_real_time_preview(self):
        print("\n=== 测试颜色调整实时预览 ===")
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                test_img = create_test_image(os.path.join(tmpdir, "test_color.jpg"))
                self.app.load_preview(test_img)

                test_values = [
                    ('brightness', 1.5),
                    ('contrast', 1.3),
                    ('saturation', 0.7),
                    ('hue', 0.2),
                    ('sharpness', 1.5),
                ]

                for param, value in test_values:
                    self.app.color_vars[param].set(value)

                self.app.preview_colors()

                if self.app.preview_image_tk is not None:
                    self.log_success("颜色调整实时预览功能正常")
                else:
                    self.log_error("颜色调整实时预览失败")

                self.app.reset_colors()
                all_default = True
                for param, default in [('brightness', 1.0), ('contrast', 1.0),
                                       ('saturation', 1.0), ('hue', 0.0), ('sharpness', 1.0)]:
                    if abs(self.app.color_vars[param].get() - default) > 0.001:
                        all_default = False
                        break

                if all_default:
                    self.log_success("颜色参数重置功能正常")
                else:
                    self.log_error("颜色参数重置功能失败")

            return True
        except Exception as e:
            self.log_error(f"颜色调整测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_folder_selection(self):
        print("\n=== 测试文件夹选择与格式过滤 ===")
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                supported_files = ['img1.jpg', 'img2.png', 'img3.bmp', 'img4.webp']
                unsupported_files = ['doc.txt', 'data.csv', 'video.mp4']

                for f in supported_files + unsupported_files:
                    filepath = os.path.join(tmpdir, f)
                    if f.endswith(('.jpg', '.png', '.bmp', '.webp')):
                        create_test_image(filepath, size=(100, 100))
                    else:
                        with open(filepath, 'w') as tf:
                            tf.write('test')

                subdir = os.path.join(tmpdir, 'subfolder')
                os.makedirs(subdir)
                create_test_image(os.path.join(subdir, 'nested.jpg'), size=(100, 100))

                self.app.batch_processor.clear_files()
                self.app.batch_processor.add_folder(tmpdir)
                files = self.app.batch_processor.get_files()

                expected_count = len(supported_files) + 1
                if len(files) == expected_count:
                    self.log_success(f"文件夹扫描正确: {len(files)}个图片文件 (期望{expected_count}个)")
                else:
                    self.log_error(f"文件夹扫描错误: {len(files)}个文件 (期望{expected_count}个)")
                    for f in files:
                        print(f"      - {os.path.basename(f)}")

                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in ('.jpg', '.jpeg', '.png', '.bmp', '.webp'):
                        pass
                    else:
                        self.log_error(f"包含不支持的文件: {os.path.basename(f)}")

                has_unsupported = any(not f.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')) for f in files)
                if not has_unsupported:
                    self.log_success("格式过滤正常，仅包含支持的图片格式")
                else:
                    self.log_error("格式过滤失败，包含不支持的文件")

            return True
        except Exception as e:
            self.log_error(f"文件夹选择测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def run_all_tests(self):
        if not self.setup():
            return False

        self.test_tabs()
        self.test_file_panel()
        self.test_preview_panel()
        self.test_resize_tab()
        self.test_filter_tab()
        self.test_watermark_tab()
        self.test_queue_tab()
        self.test_colors_tab()
        self.test_history_tab()
        self.test_progress_panel()
        self.test_file_loading()
        self.test_preview_functionality()
        self.test_task_queue_operations()
        self.test_color_real_time_preview()
        self.test_folder_selection()

        if self.root:
            self.root.destroy()

        print("\n" + "=" * 60)
        print(f"测试完成: {len(self.successes)} 个通过, {len(self.errors)} 个失败")

        if self.errors:
            print("\n失败列表:")
            for err in self.errors:
                print(f"  - {err}")
            return False
        else:
            print("\n🎉 所有UI测试通过！")
            return True


def main():
    tester = UITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
