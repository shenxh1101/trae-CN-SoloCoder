#!/usr/bin/env python3
import os
import sys
import tempfile
import shutil
import unittest
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dir_compare import (
    FileInfo, DirectoryScanner, DirectoryComparator,
    ReportGenerator, CacheManager, DirectorySynchronizer
)


class TestFileInfo(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.test_dir, "test.txt")
        with open(self.test_file, 'w') as f:
            f.write("Hello, World!")

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_file_info_creation(self):
        info = FileInfo(self.test_file, self.test_dir)
        self.assertEqual(info.rel_path, "test.txt")
        self.assertEqual(info.size, 13)
        self.assertTrue(info.mtime > 0)

    def test_md5_calculation(self):
        info = FileInfo(self.test_file, self.test_dir)
        md5 = info.calculate_md5()
        self.assertIsNotNone(md5)
        self.assertEqual(len(md5), 32)

    def test_md5_caching(self):
        info = FileInfo(self.test_file, self.test_dir)
        md5_1 = info.calculate_md5()
        md5_2 = info.calculate_md5()
        self.assertEqual(md5_1, md5_2)

    def test_to_dict_and_from_dict(self):
        info = FileInfo(self.test_file, self.test_dir)
        info.calculate_md5()
        data = info.to_dict()
        self.assertIn('rel_path', data)
        self.assertIn('size', data)
        self.assertIn('mtime', data)
        self.assertIn('md5', data)

        info2 = FileInfo.from_dict(data, self.test_dir)
        self.assertEqual(info2.rel_path, info.rel_path)
        self.assertEqual(info2.size, info.size)
        self.assertEqual(info2.md5, info.md5)


class TestDirectoryScanner(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self._create_test_files()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def _create_test_files(self):
        os.makedirs(os.path.join(self.test_dir, "subdir"))
        with open(os.path.join(self.test_dir, "file1.txt"), 'w') as f:
            f.write("Content 1")
        with open(os.path.join(self.test_dir, "file2.txt"), 'w') as f:
            f.write("Content 2")
        with open(os.path.join(self.test_dir, "subdir", "file3.txt"), 'w') as f:
            f.write("Content 3")
        with open(os.path.join(self.test_dir, "logfile.log"), 'w') as f:
            f.write("Log content")
        with open(os.path.join(self.test_dir, ".hidden"), 'w') as f:
            f.write("Hidden file")

    def test_scan_all_files(self):
        scanner = DirectoryScanner(self.test_dir)
        files = scanner.scan()
        self.assertEqual(len(files), 5)

    def test_ignore_extensions(self):
        scanner = DirectoryScanner(self.test_dir, ignore_extensions=['.log'])
        files = scanner.scan()
        self.assertEqual(len(files), 4)
        self.assertNotIn('logfile.log', files)

    def test_ignore_hidden(self):
        scanner = DirectoryScanner(self.test_dir, ignore_hidden=True)
        files = scanner.scan()
        self.assertEqual(len(files), 4)
        self.assertNotIn('.hidden', files)

    def test_recursive_scan(self):
        scanner = DirectoryScanner(self.test_dir)
        files = scanner.scan()
        self.assertIn(os.path.join('subdir', 'file3.txt'), files)

    def test_to_dict_and_from_dict(self):
        scanner = DirectoryScanner(self.test_dir)
        scanner.scan()
        data = scanner.to_dict()
        self.assertEqual(len(data), 5)

        scanner2 = DirectoryScanner.from_dict(data, self.test_dir)
        self.assertEqual(len(scanner2.files), 5)


class TestDirectoryComparator(unittest.TestCase):
    def setUp(self):
        self.dir_a = tempfile.mkdtemp()
        self.dir_b = tempfile.mkdtemp()
        self._create_test_structure()

    def tearDown(self):
        shutil.rmtree(self.dir_a)
        shutil.rmtree(self.dir_b)

    def _create_test_structure(self):
        with open(os.path.join(self.dir_a, "only_a.txt"), 'w') as f:
            f.write("Only in A")
        
        with open(os.path.join(self.dir_b, "only_b.txt"), 'w') as f:
            f.write("Only in B")
        
        with open(os.path.join(self.dir_a, "same.txt"), 'w') as f:
            f.write("Same content")
        with open(os.path.join(self.dir_b, "same.txt"), 'w') as f:
            f.write("Same content")
        
        with open(os.path.join(self.dir_a, "different.txt"), 'w') as f:
            f.write("Content A")
        with open(os.path.join(self.dir_b, "different.txt"), 'w') as f:
            f.write("Content B different")
        
        os.makedirs(os.path.join(self.dir_a, "subdir"))
        with open(os.path.join(self.dir_a, "subdir", "nested.txt"), 'w') as f:
            f.write("Nested A")

    def test_basic_comparison(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        results = comparator.compare()
        
        self.assertEqual(len(results['only_a']), 2)
        self.assertIn('only_a.txt', results['only_a'])
        self.assertIn(os.path.join('subdir', 'nested.txt'), results['only_a'])
        
        self.assertEqual(len(results['only_b']), 1)
        self.assertIn('only_b.txt', results['only_b'])
        
        self.assertEqual(len(results['different']), 1)
        self.assertIn('different.txt', results['different'])
        
        self.assertEqual(len(results['same']), 1)
        self.assertIn('same.txt', results['same'])

    def test_fast_mode(self):
        with open(os.path.join(self.dir_a, "samesize.txt"), 'w') as f:
            f.write("12345")
        with open(os.path.join(self.dir_b, "samesize.txt"), 'w') as f:
            f.write("54321")
        
        comparator = DirectoryComparator(self.dir_a, self.dir_b, fast_mode=True)
        results = comparator.compare()
        
        self.assertIn('samesize.txt', results['same'])

    def test_md5_mode(self):
        with open(os.path.join(self.dir_a, "same_content.txt"), 'w') as f:
            f.write("MD5 test content")
        with open(os.path.join(self.dir_b, "same_content_diff_name.txt"), 'w') as f:
            f.write("MD5 test content")
        
        comparator = DirectoryComparator(self.dir_a, self.dir_b, use_md5=True)
        results = comparator.compare()
        
        self.assertGreater(len(results['duplicates']), 0)

    def test_summary(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        summary = comparator.get_summary()
        
        self.assertEqual(summary['only_a_count'], 2)
        self.assertEqual(summary['only_b_count'], 1)
        self.assertEqual(summary['different_count'], 1)
        self.assertEqual(summary['same_count'], 1)
        self.assertGreater(summary['only_a_size'], 0)

    def test_ignore_extensions_in_comparison(self):
        with open(os.path.join(self.dir_a, "temp.tmp"), 'w') as f:
            f.write("Temp file")
        
        comparator = DirectoryComparator(
            self.dir_a, self.dir_b,
            ignore_extensions=['.tmp']
        )
        results = comparator.compare()
        
        self.assertNotIn('temp.tmp', results['only_a'])


class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.dir_a = tempfile.mkdtemp()
        self.dir_b = tempfile.mkdtemp()
        self._create_test_files()
        self.comparator = DirectoryComparator(self.dir_a, self.dir_b)
        self.comparator.compare()

    def tearDown(self):
        shutil.rmtree(self.dir_a)
        shutil.rmtree(self.dir_b)

    def _create_test_files(self):
        with open(os.path.join(self.dir_a, "a.txt"), 'w') as f:
            f.write("A content")
        with open(os.path.join(self.dir_b, "b.txt"), 'w') as f:
            f.write("B content")
        with open(os.path.join(self.dir_a, "same.txt"), 'w') as f:
            f.write("Same")
        with open(os.path.join(self.dir_b, "same.txt"), 'w') as f:
            f.write("Same")
        with open(os.path.join(self.dir_a, "diff.txt"), 'w') as f:
            f.write("Diff A")
        with open(os.path.join(self.dir_b, "diff.txt"), 'w') as f:
            f.write("Diff B longer")

    def test_text_report_generation(self):
        report = ReportGenerator.generate_text_report(self.comparator)
        self.assertIn("目录对比报告", report)
        self.assertIn("仅在目录 A 中存在的文件", report)
        self.assertIn("仅在目录 B 中存在的文件", report)
        self.assertIn("内容不同的文件", report)
        self.assertIn("内容相同的文件", report)
        self.assertIn("a.txt", report)
        self.assertIn("b.txt", report)
        self.assertIn("diff.txt", report)
        self.assertIn("same.txt", report)

    def test_html_report_generation(self):
        report = ReportGenerator.generate_html_report(self.comparator)
        self.assertIn("<html", report)
        self.assertIn("目录对比报告", report)
        self.assertIn("a.txt", report)
        self.assertIn("b.txt", report)
        self.assertIn("diff.txt", report)
        self.assertIn("same.txt", report)

    def test_text_report_to_file(self):
        output_file = os.path.join(tempfile.mkdtemp(), "report.txt")
        ReportGenerator.generate_text_report(self.comparator, output_file)
        self.assertTrue(os.path.exists(output_file))
        with open(output_file, 'r') as f:
            content = f.read()
        self.assertIn("目录对比报告", content)

    def test_html_report_to_file(self):
        output_file = os.path.join(tempfile.mkdtemp(), "report.html")
        ReportGenerator.generate_html_report(self.comparator, output_file)
        self.assertTrue(os.path.exists(output_file))
        with open(output_file, 'r') as f:
            content = f.read()
        self.assertIn("<html", content)

    def test_format_size(self):
        self.assertEqual(ReportGenerator._format_size(0), "0 B")
        self.assertEqual(ReportGenerator._format_size(1024), "1.0 KB")
        self.assertEqual(ReportGenerator._format_size(1048576), "1.0 MB")

    def test_format_time_diff(self):
        self.assertIn("秒", ReportGenerator._format_time_diff(30))
        self.assertIn("分钟", ReportGenerator._format_time_diff(120))
        self.assertIn("小时", ReportGenerator._format_time_diff(7200))
        self.assertIn("天", ReportGenerator._format_time_diff(100000))


class TestCacheManager(unittest.TestCase):
    def setUp(self):
        self.dir_a = tempfile.mkdtemp()
        self.dir_b = tempfile.mkdtemp()
        self.cache_dir = tempfile.mkdtemp()
        with open(os.path.join(self.dir_a, "test.txt"), 'w') as f:
            f.write("Test")
        with open(os.path.join(self.dir_b, "test.txt"), 'w') as f:
            f.write("Test")

    def tearDown(self):
        shutil.rmtree(self.dir_a)
        shutil.rmtree(self.dir_b)
        shutil.rmtree(self.cache_dir)

    def test_cache_save_and_load(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        
        cache_manager = CacheManager(cache_dir=self.cache_dir)
        cache_key = cache_manager.save(comparator)
        self.assertIsNotNone(cache_key)
        
        cached = cache_manager.load(self.dir_a, self.dir_b)
        self.assertIsNotNone(cached)
        self.assertIn('timestamp', cached)
        self.assertIn('results', cached)

    def test_get_changes(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        
        cache_manager = CacheManager(cache_dir=self.cache_dir)
        changes = cache_manager.get_changes(comparator)
        self.assertIsNone(changes)
        
        cache_manager.save(comparator)
        
        with open(os.path.join(self.dir_a, "new_file.txt"), 'w') as f:
            f.write("New file")
        
        comparator2 = DirectoryComparator(self.dir_a, self.dir_b)
        comparator2.compare()
        
        changes = cache_manager.get_changes(comparator2)
        self.assertIsNotNone(changes)
        self.assertEqual(len(changes['added_to_a']), 1)


class TestDirectorySynchronizer(unittest.TestCase):
    def setUp(self):
        self.dir_a = tempfile.mkdtemp()
        self.dir_b = tempfile.mkdtemp()
        self._create_test_files()

    def tearDown(self):
        shutil.rmtree(self.dir_a)
        shutil.rmtree(self.dir_b)

    def _create_test_files(self):
        with open(os.path.join(self.dir_a, "missing_in_b.txt"), 'w') as f:
            f.write("Should be copied to B")
        with open(os.path.join(self.dir_b, "extra_in_b.txt"), 'w') as f:
            f.write("Should be deleted from B")
        with open(os.path.join(self.dir_a, "same.txt"), 'w') as f:
            f.write("Same")
        with open(os.path.join(self.dir_b, "same.txt"), 'w') as f:
            f.write("Same")

    def test_copy_missing_to_b(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        
        synchronizer = DirectorySynchronizer(comparator)
        copied = synchronizer.copy_missing_to_b()
        
        self.assertEqual(len(copied), 1)
        self.assertIn('missing_in_b.txt', copied)
        self.assertTrue(os.path.exists(os.path.join(self.dir_b, "missing_in_b.txt")))

    def test_remove_extra_from_b(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        
        synchronizer = DirectorySynchronizer(comparator)
        removed = synchronizer.remove_extra_from_b()
        
        self.assertEqual(len(removed), 1)
        self.assertIn('extra_in_b.txt', removed)
        self.assertFalse(os.path.exists(os.path.join(self.dir_b, "extra_in_b.txt")))

    def test_full_sync(self):
        comparator = DirectoryComparator(self.dir_a, self.dir_b)
        comparator.compare()
        
        synchronizer = DirectorySynchronizer(comparator)
        copied, removed = synchronizer.sync_a_to_b()
        
        self.assertEqual(len(copied), 1)
        self.assertEqual(len(removed), 1)
        self.assertTrue(os.path.exists(os.path.join(self.dir_b, "missing_in_b.txt")))
        self.assertFalse(os.path.exists(os.path.join(self.dir_b, "extra_in_b.txt")))


class TestDirectoryMonitor(unittest.TestCase):
    def test_monitor_initialization(self):
        from dir_compare import DirectoryMonitor
        monitor = DirectoryMonitor(
            "/tmp/test_a", "/tmp/test_b",
            ignore_extensions=['.log'],
            ignore_hidden=True,
            fast_mode=True,
            interval=2
        )
        self.assertEqual(monitor.dir_a, "/tmp/test_a")
        self.assertEqual(monitor.dir_b, "/tmp/test_b")
        self.assertEqual(monitor.interval, 2)
        self.assertTrue(monitor.fast_mode)


class TestEdgeCases(unittest.TestCase):
    def test_empty_directories(self):
        dir_a = tempfile.mkdtemp()
        dir_b = tempfile.mkdtemp()
        
        comparator = DirectoryComparator(dir_a, dir_b)
        results = comparator.compare()
        
        self.assertEqual(len(results['only_a']), 0)
        self.assertEqual(len(results['only_b']), 0)
        self.assertEqual(len(results['different']), 0)
        self.assertEqual(len(results['same']), 0)
        
        shutil.rmtree(dir_a)
        shutil.rmtree(dir_b)

    def test_nested_directories(self):
        dir_a = tempfile.mkdtemp()
        dir_b = tempfile.mkdtemp()
        
        os.makedirs(os.path.join(dir_a, "level1", "level2"))
        with open(os.path.join(dir_a, "level1", "level2", "deep.txt"), 'w') as f:
            f.write("Deep file")
        
        comparator = DirectoryComparator(dir_a, dir_b)
        results = comparator.compare()
        
        self.assertIn(os.path.join('level1', 'level2', 'deep.txt'), results['only_a'])
        
        shutil.rmtree(dir_a)
        shutil.rmtree(dir_b)

    def test_large_file_simulation(self):
        dir_a = tempfile.mkdtemp()
        dir_b = tempfile.mkdtemp()
        
        with open(os.path.join(dir_a, "large.txt"), 'w') as f:
            f.write("x" * 10000)
        with open(os.path.join(dir_b, "large.txt"), 'w') as f:
            f.write("x" * 10000)
        
        comparator = DirectoryComparator(dir_a, dir_b, fast_mode=True)
        results = comparator.compare()
        
        self.assertIn('large.txt', results['same'])
        
        shutil.rmtree(dir_a)
        shutil.rmtree(dir_b)

    def test_md5_same_content_different_names(self):
        dir_a = tempfile.mkdtemp()
        dir_b = tempfile.mkdtemp()
        
        content = "Same content different names"
        with open(os.path.join(dir_a, "name1.txt"), 'w') as f:
            f.write(content)
        with open(os.path.join(dir_b, "name2.txt"), 'w') as f:
            f.write(content)
        
        comparator = DirectoryComparator(dir_a, dir_b, use_md5=True)
        results = comparator.compare()
        
        self.assertEqual(len(results['duplicates']), 1)
        
        shutil.rmtree(dir_a)
        shutil.rmtree(dir_b)


def run_tests():
    print("=" * 60)
    print("运行目录对比工具单元测试")
    print("=" * 60)
    
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print("✓ 所有测试通过!")
    else:
        print(f"✗ 测试失败: {len(result.failures)} 个失败, {len(result.errors)} 个错误")
    print("=" * 60)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
