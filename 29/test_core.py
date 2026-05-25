#!/usr/bin/env python3
import os
import sys
import tempfile
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from image_processor import ImageProcessor, batch_rename
from task_queue import ProcessingTask, BatchProcessor
from config import SUPPORTED_FORMATS, FILTER_NAMES


def create_test_image(path, size=(200, 200), color=(255, 100, 100)):
    img = Image.new('RGB', size, color)
    for i in range(50, 150):
        for j in range(50, 150):
            img.putpixel((i, j), (100, 200, 100))
    img.save(path)
    return path


def test_image_processor():
    print("=== 测试 ImageProcessor ===")

    with tempfile.TemporaryDirectory() as tmpdir:
        test_path = os.path.join(tmpdir, "test.jpg")
        create_test_image(test_path)

        processor = ImageProcessor()

        processor.load_image(test_path)
        info = processor.get_image_info()
        print(f"  加载图片: {info['size']}, {info['mode']}")
        assert info['size'] == (200, 200)

        processor.resize(width=100, height=100, keep_aspect=True)
        print(f"  尺寸调整后: {processor.get_image_info()['size']}")
        assert processor.get_image_info()['size'] == (100, 100)

        processor.reset()
        processor.apply_filter('灰度化')
        print(f"  灰度化: {processor.current_image.mode}")

        processor.reset()
        processor.apply_filter('老照片')
        print("  老照片滤镜: OK")

        processor.reset()
        processor.apply_filter('浮雕')
        print("  浮雕滤镜: OK")

        processor.reset()
        processor.apply_filter('高斯模糊', blur_radius=3)
        print("  高斯模糊: OK")

        processor.reset()
        processor.adjust_colors(brightness=1.2, contrast=1.1, saturation=0.8)
        print("  颜色调整: OK")

        processor.reset()
        processor.rotate_flip('90度顺时针')
        print(f"  旋转90度: {processor.get_image_info()['size']}")
        assert processor.get_image_info()['size'] == (200, 200)

        processor.reset()
        processor.crop_image('固定尺寸', crop_width=100, crop_height=100)
        print(f"  裁剪: {processor.get_image_info()['size']}")
        assert processor.get_image_info()['size'] == (100, 100)

        processor.reset()
        processor.add_watermark('text', text='测试水印', position='右下', opacity=0.7, scale=0.3, rotation=30)
        print("  文字水印: OK")

        processor.reset()
        processor.convert_format('PNG', quality=90)
        output_path = os.path.join(tmpdir, "output.png")
        processor.save_image(output_path, 'PNG')
        assert os.path.exists(output_path)
        print("  格式转换并保存: OK")

    print("  ✅ ImageProcessor 测试通过\n")


def test_batch_rename():
    print("=== 测试 batch_rename ===")

    with tempfile.TemporaryDirectory() as tmpdir:
        files = []
        for i in range(3):
            path = os.path.join(tmpdir, f"photo_{i}.jpg")
            create_test_image(path)
            files.append(path)

        renamed = batch_rename(files, '序号+前缀', prefix='img', start_index=1)
        print(f"  序号重命名: {len(renamed)} 个文件")
        for old, new in renamed:
            print(f"    {os.path.basename(old)} -> {os.path.basename(new)}")
        assert len(renamed) == 3

        renamed2 = batch_rename(files, '拍摄日期', date_format='%Y%m%d')
        print(f"  日期重命名: {len(renamed2)} 个文件")
        assert len(renamed2) == 3

    print("  ✅ batch_rename 测试通过\n")


def test_processing_task():
    print("=== 测试 ProcessingTask ===")

    task1 = ProcessingTask('resize', {'width': 1024, 'height': 768, 'keep_aspect': True})
    desc = task1.get_description()
    print(f"  任务描述: {desc}")
    assert '尺寸调整' in desc

    task2 = ProcessingTask('filter', {'filter_name': '老照片'})
    print(f"  任务描述: {task2.get_description()}")

    task_dict = task1.to_dict()
    task3 = ProcessingTask.from_dict(task_dict)
    assert task3.task_type == task1.task_type
    assert task3.params == task1.params
    print("  序列化/反序列化: OK")

    print("  ✅ ProcessingTask 测试通过\n")


def test_batch_processor():
    print("=== 测试 BatchProcessor ===")

    with tempfile.TemporaryDirectory() as tmpdir:
        files = []
        for i in range(2):
            path = os.path.join(tmpdir, f"test_{i}.jpg")
            create_test_image(path, size=(300, 200))
            files.append(path)

        processor = BatchProcessor()

        processor.add_files(files)
        assert len(processor.get_files()) == 2
        print(f"  添加文件: {len(processor.get_files())} 个")

        processor.add_folder(tmpdir)
        assert len(processor.get_files()) == 2
        print(f"  添加文件夹(去重): {len(processor.get_files())} 个")

        processor.add_task(ProcessingTask('resize', {'width': 150, 'keep_aspect': True}))
        processor.add_task(ProcessingTask('convert', {'output_format': 'PNG', 'quality': 90}))
        assert len(processor.get_tasks()) == 2
        print(f"  添加任务: {len(processor.get_tasks())} 个")

        processor.move_task(1, -1)
        tasks = processor.get_tasks()
        assert tasks[0].task_type == 'convert'
        print("  任务排序: OK")

        processor.set_output_dir(tmpdir)

        output_dir = os.path.join(tmpdir, "output")
        processor.set_output_dir(output_dir)

        log_messages = []
        processor.log_callback = lambda msg: log_messages.append(msg)
        processor.progress_callback = lambda p, f: None
        processor.complete_callback = lambda s: None

        result = processor.start_processing()
        assert result == True
        print("  开始处理: OK")

        import time
        timeout = 10
        start = time.time()
        while processor.is_running and time.time() - start < timeout:
            time.sleep(0.1)

        output_files = os.listdir(output_dir) if os.path.exists(output_dir) else []
        print(f"  输出文件: {len(output_files)} 个")
        for f in output_files:
            print(f"    - {f}")

        processor.remove_task(0)
        assert len(processor.get_tasks()) == 1
        print("  删除任务: OK")

        processor.clear_tasks()
        assert len(processor.get_tasks()) == 0
        print("  清空任务: OK")

    print("  ✅ BatchProcessor 测试通过\n")


def test_config():
    print("=== 测试 Config ===")
    print(f"  支持格式: {SUPPORTED_FORMATS}")
    print(f"  滤镜数量: {len(FILTER_NAMES)}")
    assert '.jpg' in SUPPORTED_FORMATS
    assert '灰度化' in FILTER_NAMES
    print("  ✅ Config 测试通过\n")


def main():
    try:
        test_config()
        test_image_processor()
        test_batch_rename()
        test_processing_task()
        test_batch_processor()
        print("🎉 所有核心功能测试通过！")
        return 0
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
