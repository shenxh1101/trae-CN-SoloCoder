import os
import json
import threading
from queue import Queue
from datetime import datetime
from image_processor import ImageProcessor, batch_rename
from config import SUPPORTED_FORMATS


class ProcessingTask:
    def __init__(self, task_type, params=None):
        self.task_type = task_type
        self.params = params or {}
        self.timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def to_dict(self):
        return {
            'task_type': self.task_type,
            'params': self.params,
            'timestamp': self.timestamp
        }

    @classmethod
    def from_dict(cls, data):
        task = cls(data['task_type'], data['params'])
        task.timestamp = data.get('timestamp', '')
        return task

    def get_description(self):
        desc_map = {
            'resize': '尺寸调整',
            'convert': '格式转换',
            'filter': '滤镜效果',
            'watermark': '添加水印',
            'rotate': '旋转/翻转',
            'crop': '裁剪',
            'colors': '颜色调整',
            'beautify': '人像美化',
            'rename': '批量重命名'
        }
        base = desc_map.get(self.task_type, self.task_type)
        if self.task_type == 'resize':
            if self.params.get('percent'):
                return f"{base}: {self.params['percent']}%"
            else:
                return f"{base}: {self.params.get('width', '?')}x{self.params.get('height', '?')}"
        elif self.task_type == 'convert':
            return f"{base}: {self.params.get('output_format', '?')} (质量:{self.params.get('quality', 85)})"
        elif self.task_type == 'filter':
            return f"{base}: {self.params.get('filter_name', '?')}"
        elif self.task_type == 'watermark':
            wm_type = '图片' if self.params.get('watermark_type') == 'image' else '文字'
            return f"{base}: {wm_type}水印"
        return base


class BatchProcessor:
    def __init__(self):
        self.task_queue = []
        self.input_files = []
        self.output_dir = ''
        self.is_running = False
        self.is_paused = False
        self.current_progress = 0
        self.total_progress = 0
        self.current_file = ''
        self.progress_callback = None
        self.complete_callback = None
        self.log_callback = None
        self.cancel_flag = False

    def add_task(self, task):
        self.task_queue.append(task)

    def remove_task(self, index):
        if 0 <= index < len(self.task_queue):
            self.task_queue.pop(index)

    def move_task(self, index, direction):
        new_index = index + direction
        if 0 <= new_index < len(self.task_queue):
            self.task_queue[index], self.task_queue[new_index] = \
                self.task_queue[new_index], self.task_queue[index]

    def clear_tasks(self):
        self.task_queue.clear()

    def get_tasks(self):
        return self.task_queue

    def add_files(self, files):
        for f in files:
            if f not in self.input_files and self._is_supported(f):
                self.input_files.append(f)

    def add_folder(self, folder):
        for root, dirs, files in os.walk(folder):
            for f in files:
                filepath = os.path.join(root, f)
                if self._is_supported(filepath) and filepath not in self.input_files:
                    self.input_files.append(filepath)

    def _is_supported(self, filepath):
        ext = os.path.splitext(filepath)[1].lower()
        return ext in SUPPORTED_FORMATS

    def remove_file(self, index):
        if 0 <= index < len(self.input_files):
            self.input_files.pop(index)

    def clear_files(self):
        self.input_files.clear()

    def get_files(self):
        return self.input_files

    def set_output_dir(self, output_dir):
        self.output_dir = output_dir

    def start_processing(self):
        if not self.input_files or not self.task_queue:
            return False

        self.is_running = True
        self.is_paused = False
        self.cancel_flag = False
        self.total_progress = len(self.input_files) * len(self.task_queue)
        self.current_progress = 0

        thread = threading.Thread(target=self._process_batch)
        thread.daemon = True
        thread.start()
        return True

    def _process_batch(self):
        processor = ImageProcessor()
        output_format = None
        quality = 85
        rename_tasks = [t for t in self.task_queue if t.task_type == 'rename']
        processing_tasks = [t for t in self.task_queue if t.task_type != 'rename']

        for file_idx, input_file in enumerate(self.input_files):
            if self.cancel_flag:
                break

            while self.is_paused:
                if self.cancel_flag:
                    break
                threading.Event().wait(0.1)

            try:
                self.current_file = input_file
                self._log(f"正在处理: {os.path.basename(input_file)}")

                processor.load_image(input_file)

                for task_idx, task in enumerate(processing_tasks):
                    if self.cancel_flag:
                        break

                    while self.is_paused:
                        if self.cancel_flag:
                            break
                        threading.Event().wait(0.1)

                    try:
                        self._execute_task(processor, task)

                        if task.task_type == 'convert':
                            output_format = task.params.get('output_format', 'JPEG')
                            quality = task.params.get('quality', 85)

                        self.current_progress += 1
                        self._update_progress()
                    except Exception as e:
                        self._log(f"  任务 {task.get_description()} 失败: {str(e)}")

                if not self.cancel_flag:
                    output_file = self._get_output_path(input_file, output_format, file_idx)
                    processor.save_image(output_file, output_format, quality)
                    self._log(f"  已保存: {os.path.basename(output_file)}")

            except Exception as e:
                self._log(f"处理失败 {input_file}: {str(e)}")

        if rename_tasks and not self.cancel_flag:
            self._log("执行批量重命名...")
            for task in rename_tasks:
                output_files = []
                for input_file in self.input_files:
                    output_files.append(self._get_output_path(input_file, output_format, 0))
                renamed = batch_rename(output_files, **task.params)
                for old_path, new_path in renamed:
                    if os.path.exists(old_path) and old_path != new_path:
                        try:
                            os.rename(old_path, new_path)
                            self._log(f"  重命名: {os.path.basename(old_path)} -> {os.path.basename(new_path)}")
                        except Exception as e:
                            self._log(f"  重命名失败: {str(e)}")

        self.is_running = False
        if self.complete_callback:
            self.complete_callback(not self.cancel_flag)

    def _execute_task(self, processor, task):
        t = task.task_type
        p = task.params

        if t == 'resize':
            processor.resize(**p)
        elif t == 'convert':
            processor.convert_format(**p)
        elif t == 'filter':
            processor.apply_filter(**p)
        elif t == 'watermark':
            processor.add_watermark(**p)
        elif t == 'rotate':
            processor.rotate_flip(**p)
        elif t == 'crop':
            processor.crop_image(**p)
        elif t == 'colors':
            processor.adjust_colors(**p)
        elif t == 'beautify':
            processor.portrait_beautify(**p)

    def _get_output_path(self, input_file, output_format, index):
        filename = os.path.basename(input_file)
        name, ext = os.path.splitext(filename)

        if output_format:
            format_ext = {
                'JPEG': '.jpg',
                'PNG': '.png',
                'BMP': '.bmp',
                'WEBP': '.webp'
            }.get(output_format.upper(), ext)
            filename = name + format_ext

        if self.output_dir:
            os.makedirs(self.output_dir, exist_ok=True)
            return os.path.join(self.output_dir, filename)
        else:
            path, _ = os.path.split(input_file)
            output_name = f"{name}_processed{os.path.splitext(filename)[1]}"
            return os.path.join(path, output_name)

    def _update_progress(self):
        if self.progress_callback:
            progress = (self.current_progress / self.total_progress * 100) if self.total_progress > 0 else 0
            self.progress_callback(progress, self.current_file)

    def _log(self, message):
        if self.log_callback:
            self.log_callback(message)

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def cancel(self):
        self.cancel_flag = True
        self.is_paused = False

    def get_tasks_dict(self):
        return [task.to_dict() for task in self.task_queue]

    def load_tasks_dict(self, tasks_data):
        self.task_queue = [ProcessingTask.from_dict(data) for data in tasks_data]
