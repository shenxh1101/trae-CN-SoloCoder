#!/usr/bin/env python3
import os
import sys
import tempfile
import shutil
import csv
import io

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encoding_converter as ec


def test_encoding_detection():
    """测试编码检测功能"""
    print("=" * 60)
    print("测试1: 编码检测功能")
    print("=" * 60)
    
    test_cases = [
        ("Hello World", "ascii", 0.7),
        ("你好，世界", "utf-8", 0.7),
        ("こんにちは", "utf-8", 0.7),
        ("안녕하세요", "utf-8", 0.7),
    ]
    
    with tempfile.TemporaryDirectory() as tmpdir:
        for content, expected_enc, min_conf in test_cases:
            filepath = os.path.join(tmpdir, f"test_{content[:5]}.txt")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            detected_enc, confidence = ec.detect_encoding(filepath)
            status = "✓" if confidence >= min_conf else "✗"
            print(f"{status} {content[:10]}: 检测到 {detected_enc} (置信度: {confidence:.2%})")
    
    print()


def test_encoding_normalization():
    """测试编码标准化"""
    print("=" * 60)
    print("测试2: 编码标准化")
    print("=" * 60)
    
    test_pairs = [
        ("UTF8", "utf-8"),
        ("GBK", "gbk"),
        ("Shift-JIS", "shift_jis"),
        ("shiftjis", "shift_jis"),
        ("EUC-KR", "euc-kr"),
        ("ansi", "gbk"),
    ]
    
    for input_enc, expected in test_pairs:
        result = ec.normalize_encoding(input_enc)
        status = "✓" if result == expected else "✗"
        print(f"{status} {input_enc} -> {result} (预期: {expected})")
    
    print()


def test_encoding_validation():
    """测试编码验证"""
    print("=" * 60)
    print("测试3: 编码验证")
    print("=" * 60)
    
    valid_encodings = ["utf-8", "gbk", "big5", "shift_jis"]
    invalid_encodings = ["invalid-enc", "fake-encoding", ""]
    
    for enc in valid_encodings:
        result = ec.validate_encoding(enc)
        status = "✓" if result else "✗"
        print(f"{status} {enc}: {result}")
    
    for enc in invalid_encodings:
        result = ec.validate_encoding(enc)
        status = "✓" if not result else "✗"
        print(f"{status} {enc}: {result} (预期: False)")
    
    print()


def test_file_conversion():
    """测试文件转换功能"""
    print("=" * 60)
    print("测试4: 文件转换")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_file = os.path.join(tmpdir, "input.txt")
        output_file = os.path.join(tmpdir, "output.txt")
        
        content = "Hello, 这是测试内容。"
        with open(input_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        success, message, stats = ec.convert_file(
            input_file, output_file,
            source_encoding='utf-8',
            target_encoding='gbk'
        )
        
        if success and os.path.exists(output_file):
            with open(output_file, 'r', encoding='gbk') as f:
                result = f.read()
            status = "✓" if result == content else "✗"
            print(f"{status} UTF-8 -> GBK 转换: {message}")
            print(f"  原始: {content}")
            print(f"  结果: {result}")
        else:
            print(f"✗ 转换失败: {message}")
        
        print()


def test_chunk_size_validation():
    """测试块大小验证"""
    print("=" * 60)
    print("测试5: 块大小验证")
    print("=" * 60)
    
    test_cases = [
        (512, ec.MIN_CHUNK_SIZE, "太小"),
        (200 * 1024 * 1024, ec.MAX_CHUNK_SIZE, "太大"),
        (1024 * 1024, 1024 * 1024, "正常"),
        ("invalid", ec.DEFAULT_CHUNK_SIZE, "无效值"),
    ]
    
    for input_val, expected, desc in test_cases:
        result = ec.validate_chunk_size(input_val)
        status = "✓" if result == expected else "✗"
        print(f"{status} {desc} ({input_val} -> {result}, 预期: {expected})")
    
    print()


def test_backup_file():
    """测试文件备份功能"""
    print("=" * 60)
    print("测试6: 文件备份")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = os.path.join(tmpdir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("test content")
        
        backup_path = ec.backup_file(test_file)
        if backup_path and os.path.exists(backup_path):
            print(f"✓ 首次备份成功: {backup_path}")
        else:
            print("✗ 首次备份失败")
        
        backup_path2 = ec.backup_file(test_file)
        if backup_path2 and os.path.exists(backup_path2):
            print(f"✓ 第二次备份成功: {backup_path2}")
        else:
            print("✗ 第二次备份失败")
        
        print()


def test_csv_parsing():
    """测试CSV解析功能"""
    print("=" * 60)
    print("测试7: CSV解析")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_file = os.path.join(tmpdir, "files.csv")
        
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["文件路径", "原编码", "目标路径"])
            writer.writerow(["/path/to/file1.txt", "gbk", "/output/file1.txt"])
            writer.writerow(["/path/to/file2.txt", "utf-8", ""])
            writer.writerow(["/path/to/file3.txt", "", ""])
        
        files = ec.get_files_from_csv(csv_file)
        if len(files) == 3:
            print(f"✓ 成功解析 {len(files)} 条记录")
            for i, entry in enumerate(files):
                print(f"  {i+1}. {entry}")
        else:
            print(f"✗ 解析失败，预期 3 条，实际 {len(files)} 条")
        
        print()


def test_preview_conversion():
    """测试预览转换功能"""
    print("=" * 60)
    print("测试8: 预览转换")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = os.path.join(tmpdir, "test.txt")
        content = "第一行\n第二行\n第三行\n第四行\n第五行"
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        preview = ec.preview_conversion(test_file, target_encoding='gbk', lines=3)
        if 'error' not in preview and len(preview['original_lines']) <= 3:
            print(f"✓ 预览成功，显示 {len(preview['original_lines'])} 行")
            for orig, conv in zip(preview['original_lines'], preview['converted_lines']):
                print(f"  {orig} -> {conv}")
        else:
            print(f"✗ 预览失败: {preview.get('error', '未知错误')}")
        
        print()


def test_nonexistent_file():
    """测试不存在文件的处理"""
    print("=" * 60)
    print("测试9: 错误处理 - 不存在的文件")
    print("=" * 60)
    
    success, message, stats = ec.convert_file(
        "/nonexistent/path.txt",
        "/tmp/output.txt"
    )
    
    if not success and "不存在" in message:
        print(f"✓ 正确处理不存在的文件: {message}")
    else:
        print(f"✗ 处理失败: {message}")
    
    print()


def test_empty_file():
    """测试空文件处理"""
    print("=" * 60)
    print("测试10: 空文件处理")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        empty_file = os.path.join(tmpdir, "empty.txt")
        output_file = os.path.join(tmpdir, "output.txt")
        open(empty_file, 'w').close()
        
        success, message, stats = ec.convert_file(
            empty_file, output_file,
            source_encoding='utf-8',
            target_encoding='gbk'
        )
        
        if success and os.path.exists(output_file) and os.path.getsize(output_file) == 0:
            print(f"✓ 空文件处理成功: {message}")
        else:
            print(f"✗ 空文件处理失败: {message}")
        
        print()


def test_replace_char():
    """测试字符替换功能"""
    print("=" * 60)
    print("测试11: 字符替换")
    print("=" * 60)
    
    content = "Hello 🌍 World"
    target_encoding = 'ascii'
    
    result_default = ec.convert_encoding(content, target_encoding, errors='replace')
    result_custom = ec.convert_encoding(content, target_encoding, errors='replace', replace_char='*')
    
    print(f"原始: {content}")
    print(f"默认替换 (?): {result_default.decode('ascii', errors='replace')}")
    print(f"自定义替换 (*): {result_custom.decode('ascii', errors='replace')}")
    
    decoded_default = result_default.decode('ascii')
    decoded_custom = result_custom.decode('ascii')
    
    if '?' in decoded_default:
        print("✓ 默认字符替换工作正常")
    else:
        print("✗ 默认字符替换失败")
    
    if '*' in decoded_custom and '?' not in decoded_custom:
        print("✓ 自定义字符替换工作正常")
    else:
        print("✗ 自定义字符替换失败")
    
    print()


def test_generate_report():
    """测试报告生成功能"""
    print("=" * 60)
    print("测试12: 报告生成")
    print("=" * 60)
    
    results = [
        {
            'file': '/path/to/file1.txt',
            'success': True,
            'source_encoding': 'utf-8',
            'target_encoding': 'gbk',
            'output': '/output/file1.txt',
            'stats': {'total_bytes': 1024, 'replaced_chars': 5}
        },
        {
            'file': '/path/to/file2.txt',
            'success': False,
            'error': '文件不存在'
        }
    ]
    
    report = ec.generate_report(results)
    if "成功: 1" in report and "失败: 1" in report and "file1.txt" in report and "file2.txt" in report:
        print("✓ 报告生成成功")
        print(f"  报告长度: {len(report)} 字符")
        print(f"  包含成功文件: {'file1.txt' in report}")
        print(f"  包含失败文件: {'file2.txt' in report}")
    else:
        print("✗ 报告生成失败")
    
    print()


def test_stdin_processing():
    """测试标准输入处理"""
    print("=" * 60)
    print("测试13: 标准输入处理")
    print("=" * 60)
    
    test_input = "测试文本 Hello World"
    target_encoding = 'gbk'
    
    data = test_input.encode('utf-8')
    detected_enc, confidence = ec.detect_encoding_from_bytes(data)
    
    print(f"输入: {test_input}")
    print(f"检测编码: {detected_enc} (置信度: {confidence:.2%})")
    
    try:
        text = data.decode('utf-8', errors='replace')
        result = ec.convert_encoding(text, target_encoding, errors='replace', replace_char=None)
        decoded = result.decode(target_encoding)
        
        if decoded == test_input:
            print(f"✓ 编码转换成功 (UTF-8 -> GBK -> UTF-8)")
            print(f"  输出: {decoded}")
        else:
            print(f"✗ 转换结果不匹配")
            print(f"  预期: {test_input}")
            print(f"  实际: {decoded}")
    except Exception as e:
        print(f"✗ 转换异常: {e}")
    
    print()


def test_batch_conversion():
    """测试批量转换功能"""
    print("=" * 60)
    print("测试14: 批量转换")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        subdir = os.path.join(tmpdir, "subdir")
        os.makedirs(subdir)
        
        for i in range(3):
            with open(os.path.join(tmpdir, f"file{i}.txt"), 'w', encoding='utf-8') as f:
                f.write(f"文件 {i} 内容")
        
        with open(os.path.join(subdir, "nested.txt"), 'w', encoding='utf-8') as f:
            f.write("嵌套文件内容")
        
        with open(os.path.join(tmpdir, "ignore.csv"), 'w', encoding='utf-8') as f:
            f.write("CSV文件，应该被忽略")
        
        files_recursive = ec.get_files_from_folder(tmpdir, extensions=['.txt'], recursive=True)
        files_non_recursive = ec.get_files_from_folder(tmpdir, extensions=['.txt'], recursive=False)
        
        print(f"递归模式找到 {len(files_recursive)} 个 .txt 文件")
        print(f"非递归模式找到 {len(files_non_recursive)} 个 .txt 文件")
        
        if len(files_recursive) == 4 and len(files_non_recursive) == 3:
            print("✓ 批量文件查找工作正常")
        else:
            print("✗ 批量文件查找结果不正确")
        
        for f in files_recursive:
            print(f"  - {os.path.relpath(f, tmpdir)}")
        
        print()


def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("编码转换工具 - 全面测试套件")
    print("=" * 60 + "\n")
    
    tests = [
        test_encoding_detection,
        test_encoding_normalization,
        test_encoding_validation,
        test_file_conversion,
        test_chunk_size_validation,
        test_backup_file,
        test_csv_parsing,
        test_preview_conversion,
        test_nonexistent_file,
        test_empty_file,
        test_replace_char,
        test_generate_report,
        test_stdin_processing,
        test_batch_conversion,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ 测试 {test.__name__} 发生异常: {e}")
            failed += 1
            import traceback
            traceback.print_exc()
    
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"总测试数: {len(tests)}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    print(f"成功率: {passed/len(tests)*100:.1f}%")
    print("=" * 60)
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
