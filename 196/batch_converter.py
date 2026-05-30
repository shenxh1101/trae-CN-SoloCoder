import os
import time
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from converter import convert_heic_to_jpg


class ConversionResult:
    def __init__(self, input_path, output_path, success=True, error=None, duration=0):
        self.input_path = input_path
        self.output_path = output_path
        self.success = success
        self.error = str(error) if error else None
        self.duration = duration

    def to_dict(self):
        return {
            'input': self.input_path,
            'output': self.output_path,
            'success': self.success,
            'error': self.error,
            'duration_seconds': round(self.duration, 3)
        }


class ConversionReport:
    def __init__(self, results, total_time):
        self.results = results
        self.total_time = total_time
        self.success_count = sum(1 for r in results if r.success)
        self.failed_count = sum(1 for r in results if not r.success)

    def print_summary(self):
        print("\n" + "=" * 60)
        print("转换报告")
        print("=" * 60)
        print(f"总文件数: {len(self.results)}")
        print(f"成功: {self.success_count}")
        print(f"失败: {self.failed_count}")
        print(f"总耗时: {self.total_time:.2f} 秒")
        if self.success_count > 0:
            avg_time = self.total_time / self.success_count
            print(f"平均耗时: {avg_time:.3f} 秒/文件")
        print("=" * 60)
        if self.failed_count > 0:
            print("\n失败文件列表:")
            for r in self.results:
                if not r.success:
                    print(f"  - {r.input_path}")
                    print(f"    错误: {r.error}")
            print()

    def save_json(self, output_path):
        data = {
            'summary': {
                'total': len(self.results),
                'success': self.success_count,
                'failed': self.failed_count,
                'total_time_seconds': round(self.total_time, 3),
                'generated_at': datetime.now().isoformat()
            },
            'results': [r.to_dict() for r in self.results]
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"报告已保存到: {output_path}")


def _convert_single(task, convert_options):
    input_path, output_path = task
    start_time = time.time()
    try:
        result_path = convert_heic_to_jpg(
            input_path,
            output_path=output_path,
            **convert_options
        )
        duration = time.time() - start_time
        return ConversionResult(input_path, result_path, success=True, duration=duration)
    except Exception as e:
        duration = time.time() - start_time
        return ConversionResult(input_path, output_path, success=False, error=e, duration=duration)


def batch_convert(tasks, convert_options, max_workers=4, verbose=True):
    results = []
    total = len(tasks)
    start_time = time.time()
    if max_workers <= 1:
        for i, task in enumerate(tasks, 1):
            if verbose:
                print(f"[{i}/{total}] 正在转换: {task[0]}")
            result = _convert_single(task, convert_options)
            results.append(result)
            if verbose:
                if result.success:
                    print(f"  ✓ 成功 -> {result.output_path}")
                else:
                    print(f"  ✗ 失败: {result.error}")
    else:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_task = {executor.submit(_convert_single, task, convert_options): task for task in tasks}
            completed = 0
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                result = future.result()
                results.append(result)
                completed += 1
                if verbose:
                    if result.success:
                        print(f"[{completed}/{total}] ✓ {task[0]} -> {result.output_path}")
                    else:
                        print(f"[{completed}/{total}] ✗ {task[0]} - 失败: {result.error}")
    total_time = time.time() - start_time
    results.sort(key=lambda r: r.input_path)
    return ConversionReport(results, total_time)
