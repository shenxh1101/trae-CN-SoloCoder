#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件分片合并工具 - 完整端到端测试套件
测试所有功能，保留完整日志和测试证据
"""
import os
import sys
import json
import time
import hashlib
import traceback
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from file_splitter.splitter import FileSplitter
from file_splitter.merger import FileMerger
from file_splitter.index import IndexManager
from file_splitter.checksum import calculate_md5, verify_md5
from file_splitter.crypto import XOREncryptor, AESEncryptor, get_encryptor
from file_splitter.recovery_script import RecoveryScriptGenerator

# 全局配置
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_evidence")
LOG_FILE = os.path.join(TEST_DIR, "test_log.txt")
RESULTS = []

def log(msg: str) -> None:
    """记录日志到控制台和文件"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_msg + '\n')

def log_section(title: str) -> None:
    """记录分节标题"""
    separator = "=" * 70
    log("")
    log(separator)
    log(f"  {title}")
    log(separator)

def record_result(test_name: str, passed: bool, details: str = "") -> None:
    """记录测试结果"""
    status = "PASS" if passed else "FAIL"
    RESULTS.append({
        "name": test_name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })
    log(f"  [{status}] {test_name}")
    if details:
        log(f"         {details}")

def generate_test_file(file_path: str, size_mb: int) -> str:
    """生成测试文件并返回MD5"""
    log(f"生成测试文件: {file_path} ({size_mb} MB)")
    size_bytes = size_mb * 1024 * 1024
    md5 = hashlib.md5()
    
    with open(file_path, 'wb') as f:
        remaining = size_bytes
        chunk_size = 1024 * 1024
        while remaining > 0:
            write_size = min(chunk_size, remaining)
            random_data = os.urandom(write_size)
            f.write(random_data)
            md5.update(random_data)
            remaining -= write_size
    
    file_md5 = md5.hexdigest()
    actual_size = os.path.getsize(file_path)
    log(f"测试文件生成完成，大小: {actual_size} 字节, MD5: {file_md5}")
    return file_md5

def file_md5(file_path: str) -> str:
    """计算文件MD5"""
    md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        while True:
            data = f.read(8192)
            if not data:
                break
            md5.update(data)
    return md5.hexdigest()

def setup() -> None:
    """初始化测试环境"""
    global TEST_DIR, LOG_FILE
    
    if os.path.exists(TEST_DIR):
        import shutil
        shutil.rmtree(TEST_DIR)
    
    os.makedirs(TEST_DIR, exist_ok=True)
    LOG_FILE = os.path.join(TEST_DIR, "test_log.txt")
    
    log("=" * 70)
    log("文件分片合并工具 - 完整端到端测试")
    log(f"测试时间: {datetime.now().isoformat()}")
    log(f"测试目录: {TEST_DIR}")
    log("=" * 70)

def test_1_basic_split_merge() -> None:
    """测试1: 基础分片合并"""
    log_section("测试1: 基础分片合并")
    
    test_file = os.path.join(TEST_DIR, "test_1_basic", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 5)
    split_dir = os.path.join(TEST_DIR, "test_1_basic", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    # 分片
    log("执行分片操作...")
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    log(f"索引文件: {index_path}")
    
    # 验证分片文件存在
    for i in range(1, chunk_count + 1):
        chunk_file = os.path.join(split_dir, f"original.part{i}")
        exists = os.path.exists(chunk_file)
        log(f"  分片 {i}: {chunk_file} - {'存在' if exists else '缺失'}")
    
    # 合并
    log("执行合并操作...")
    merged_file = os.path.join(TEST_DIR, "test_1_basic", "merged.bin")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    log(f"合并完成: {output_path}")
    log(f"完整性验证: {'通过' if verified else '失败'}")
    log(f"原始MD5: {original_md5}")
    log(f"合并MD5: {merged_md5}")
    
    passed = (original_md5 == merged_md5) and verified
    record_result("基础分片合并", passed, 
                   f"分片数: {chunk_count}, 完整性验证: {'通过' if verified else '失败'}")

def test_2_custom_extension() -> None:
    """测试2: 自定义分片扩展名"""
    log_section("测试2: 自定义分片扩展名")
    
    test_file = os.path.join(TEST_DIR, "test_2_extension", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_2_extension", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="chunk",
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    all_exist = True
    for i in range(1, chunk_count + 1):
        chunk_file = os.path.join(split_dir, f"original.chunk{i}")
        exists = os.path.exists(chunk_file)
        if not exists:
            all_exist = False
        log(f"  分片 {i}: original.chunk{i} - {'存在' if exists else '缺失'}")
    
    merged_file = os.path.join(TEST_DIR, "test_2_extension", "merged.bin")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    passed = (original_md5 == merged_md5) and all_exist
    record_result("自定义分片扩展名", passed,
                   f"扩展名: chunk, 所有分片存在: {all_exist}")

def test_3_xor_encryption() -> None:
    """测试3: XOR加密分片合并"""
    log_section("测试3: XOR加密分片合并")
    
    test_file = os.path.join(TEST_DIR, "test_3_xor", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_3_xor", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    password = "test_xor_password_2024"
    log(f"使用XOR加密，密码长度: {len(password)}")
    
    # 分片
    log("执行XOR加密分片...")
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="xor",
        password=password
    )
    index_path, chunk_count = splitter.split()
    
    log(f"XOR加密分片完成: {chunk_count} 个分片")
    
    # 验证加密后数据与原数据不同
    log("验证加密效果...")
    with open(test_file, 'rb') as f:
        original_data = f.read(1024)
    
    chunk1_path = os.path.join(split_dir, "original.part1")
    with open(chunk1_path, 'rb') as f:
        encrypted_data = f.read(1024)
    
    is_encrypted = original_data != encrypted_data
    log(f"  加密后数据与原数据不同: {is_encrypted}")
    
    # 尝试不带密码合并（应该失败）
    log("尝试不带密码合并（预期失败）...")
    merged_fail = os.path.join(TEST_DIR, "test_3_xor", "fail.bin")
    merger_fail = FileMerger(
        index_file_path=index_path,
        output_path=merged_fail,
        verify_integrity=True,
        resume=False
    )
    try:
        merger_fail.merge()
        log("  错误: 不带密码合并成功了（不应该）！")
        record_result("XOR加密-不带密码失败", False, "不带密码合并不应该成功")
    except ValueError as e:
        log(f"  正确: 不带密码合并失败 - {str(e)}")
        record_result("XOR加密-不带密码失败", True)
    
    # 使用正确密码合并
    log("使用正确密码解密合并...")
    merged_file = os.path.join(TEST_DIR, "test_3_xor", "merged.bin")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        password=password,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    log(f"XOR解密合并完成")
    log(f"  完整性验证: {'通过' if verified else '失败'}")
    log(f"  原始MD5: {original_md5}")
    log(f"  合并MD5: {merged_md5}")
    log(f"  MD5匹配: {original_md5 == merged_md5}")
    
    passed = (original_md5 == merged_md5) and verified and is_encrypted
    record_result("XOR加密分片合并", passed,
                   f"加密有效: {is_encrypted}, 解密合并: {'成功' if passed else '失败'}")

def test_4_aes_encryption() -> None:
    """测试4: AES加密分片合并"""
    log_section("测试4: AES加密分片合并")
    
    test_file = os.path.join(TEST_DIR, "test_4_aes", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_4_aes", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    password = "test_aes_password_secure_2024"
    log(f"使用AES加密，密码长度: {len(password)}")
    
    # 分片
    log("执行AES加密分片...")
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="aes",
        password=password
    )
    index_path, chunk_count = splitter.split()
    
    log(f"AES加密分片完成: {chunk_count} 个分片")
    
    # 验证加密后数据与原数据不同
    log("验证加密效果...")
    with open(test_file, 'rb') as f:
        original_data = f.read(1024)
    
    chunk1_path = os.path.join(split_dir, "original.part1")
    with open(chunk1_path, 'rb') as f:
        encrypted_data = f.read(1024)
    
    is_encrypted = original_data != encrypted_data
    log(f"  加密后数据与原数据不同: {is_encrypted}")
    
    # 尝试使用错误密码合并（应该失败）
    log("尝试使用错误密码合并（预期失败）...")
    merged_fail = os.path.join(TEST_DIR, "test_4_aes", "fail.bin")
    merger_fail = FileMerger(
        index_file_path=index_path,
        output_path=merged_fail,
        password="wrong_password",
        verify_integrity=True,
        resume=False
    )
    try:
        merger_fail.merge()
        log("  错误: 错误密码合并成功了（不应该）！")
        record_result("AES加密-错误密码失败", False, "错误密码合并不应该成功")
    except ValueError as e:
        log(f"  正确: 错误密码合并失败 - {str(e)}")
        record_result("AES加密-错误密码失败", True)
    
    # 使用正确密码合并
    log("使用正确密码解密合并...")
    merged_file = os.path.join(TEST_DIR, "test_4_aes", "merged.bin")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        password=password,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    log(f"AES解密合并完成")
    log(f"  完整性验证: {'通过' if verified else '失败'}")
    log(f"  原始MD5: {original_md5}")
    log(f"  合并MD5: {merged_md5}")
    log(f"  MD5匹配: {original_md5 == merged_md5}")
    
    passed = (original_md5 == merged_md5) and verified and is_encrypted
    record_result("AES加密分片合并", passed,
                   f"加密有效: {is_encrypted}, 解密合并: {'成功' if passed else '失败'}")

def test_5_resume_merge() -> None:
    """测试5: 断点续传合并"""
    log_section("测试5: 断点续传合并")
    
    test_file = os.path.join(TEST_DIR, "test_5_resume", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 5)
    split_dir = os.path.join(TEST_DIR, "test_5_resume", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    # 分片
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    # 模拟部分合并（只合并前2个分片）
    log("模拟中断合并场景...")
    merged_file = os.path.join(TEST_DIR, "test_5_resume", "merged.bin")
    index_mgr = IndexManager()
    index_mgr.load(index_path)
    
    chunks = sorted(index_mgr.index_data['chunks'], key=lambda x: x['index'])
    
    with open(merged_file, 'wb') as out_file:
        for i in range(2):  # 只写前2个分片
            chunk_path = os.path.join(split_dir, chunks[i]['filename'])
            with open(chunk_path, 'rb') as cf:
                out_file.write(cf.read())
    
    partial_size = os.path.getsize(merged_file)
    index_mgr.update_merge_progress(
        current_chunk=2,
        bytes_written=partial_size,
        completed=False
    )
    log(f"  部分合并完成: {partial_size} 字节, 进度保存到索引文件")
    
    # 继续合并（断点续传）
    log("使用断点续传继续合并...")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=True
    )
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    log(f"断点续传合并完成")
    log(f"  完整性验证: {'通过' if verified else '失败'}")
    log(f"  原始MD5: {original_md5}")
    log(f"  合并MD5: {merged_md5}")
    
    passed = (original_md5 == merged_md5) and verified
    record_result("断点续传合并", passed,
                   f"断点续传: {'成功' if passed else '失败'}, 完整性验证: {'通过' if verified else '失败'}")
    
    # 测试--no-resume参数（强制重新合并）
    log("测试强制重新合并（--no-resume）...")
    merged_file2 = os.path.join(TEST_DIR, "test_5_resume", "merged_no_resume.bin")
    
    # 先模拟部分合并
    with open(merged_file2, 'wb') as out_file:
        for i in range(1):  # 只写1个分片
            chunk_path = os.path.join(split_dir, chunks[i]['filename'])
            with open(chunk_path, 'rb') as cf:
                out_file.write(cf.read())
    
    index_mgr.update_merge_progress(
        current_chunk=1,
        bytes_written=os.path.getsize(merged_file2),
        completed=False
    )
    
    merger2 = FileMerger(
        index_file_path=index_path,
        output_path=merged_file2,
        verify_integrity=True,
        resume=False  # 强制重新合并
    )
    output_path2, verified2 = merger2.merge()
    
    merged_md5_2 = file_md5(merged_file2)
    passed2 = (original_md5 == merged_md5_2) and verified2
    log(f"强制重新合并完成: {'成功' if passed2 else '失败'}")
    record_result("强制重新合并(no-resume)", passed2)

def test_6_range_merge() -> None:
    """测试6: 按分片序号范围合并"""
    log_section("测试6: 按分片序号范围合并")
    
    test_file = os.path.join(TEST_DIR, "test_6_range", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 5)
    split_dir = os.path.join(TEST_DIR, "test_6_range", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    # 合并分片2-4
    log("合并分片范围: 2-4")
    merged_file = os.path.join(TEST_DIR, "test_6_range", "partial.bin")
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=False
    )
    output_path, count = merger.merge_range(2, 4, merged_file)
    
    # 验证合并的数据与原文件对应部分匹配
    with open(test_file, 'rb') as f:
        f.seek(1 * 1024 * 1024)  # 跳过第1个分片
        expected_data = f.read(3 * 1024 * 1024)  # 读取分片2-4
    
    with open(merged_file, 'rb') as f:
        actual_data = f.read()
    
    data_match = expected_data == actual_data
    log(f"  合并分片数: {count}")
    log(f"  合并大小: {os.path.getsize(merged_file)} 字节")
    log(f"  数据匹配: {data_match}")
    
    record_result("按范围合并", data_match,
                   f"范围: 2-4, 分片数: {count}, 数据匹配: {data_match}")

def test_7_json_import_export() -> None:
    """测试7: JSON导入导出"""
    log_section("测试7: JSON导入导出")
    
    test_file = os.path.join(TEST_DIR, "test_7_json", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 2)
    split_dir = os.path.join(TEST_DIR, "test_7_json", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    # 导出
    export_path = os.path.join(TEST_DIR, "test_7_json", "exported.json")
    index_mgr = IndexManager()
    index_mgr.load(index_path)
    index_mgr.export_json(export_path)
    
    log(f"导出完成: {export_path}")
    
    # 验证导出文件
    with open(export_path, 'r', encoding='utf-8') as f:
        exported_data = json.load(f)
    
    log(f"  原始文件: {exported_data['original_file']}")
    log(f"  分片数量: {exported_data['total_chunks']}")
    
    # 导入
    import_mgr = IndexManager()
    import_mgr.import_json(export_path)
    
    import_valid = import_mgr.index_data['original_file'] == 'original.bin'
    import_valid = import_valid and import_mgr.index_data['total_chunks'] == 2
    log(f"导入验证: {'通过' if import_valid else '失败'}")
    
    record_result("JSON导入导出", import_valid,
                   f"导出: {export_path}, 数据完整: {import_valid}")

def test_8_text_file_merge() -> None:
    """测试8: 从文本文件读取分片列表合并"""
    log_section("测试8: 从文本文件读取分片列表合并")
    
    test_file = os.path.join(TEST_DIR, "test_8_text", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_8_text", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    # 手动分片
    chunk_size = 1 * 1024 * 1024
    chunk_paths = []
    
    with open(test_file, 'rb') as f:
        for i in range(3):
            chunk_data = f.read(chunk_size)
            chunk_path = os.path.join(split_dir, f"chunk_{i+1}.bin")
            with open(chunk_path, 'wb') as cf:
                cf.write(chunk_data)
            chunk_paths.append(chunk_path)
            log(f"  创建分片: {chunk_path}")
    
    # 创建文本列表
    text_list_path = os.path.join(TEST_DIR, "test_8_text", "chunks_list.txt")
    with open(text_list_path, 'w', encoding='utf-8') as f:
        f.write("# 分片文件列表 - 由测试生成\n")
        for path in chunk_paths:
            f.write(path + "\n")
    
    log(f"文本列表文件: {text_list_path}")
    
    # 从文本文件合并
    merged_file = os.path.join(TEST_DIR, "test_8_text", "merged.bin")
    merger = FileMerger(
        output_path=merged_file,
        verify_integrity=True,
        resume=False
    )
    merger.load_chunks_from_text(text_list_path, merged_file)
    output_path, verified = merger.merge()
    
    merged_md5 = file_md5(merged_file)
    log(f"合并完成")
    log(f"  原始MD5: {original_md5}")
    log(f"  合并MD5: {merged_md5}")
    log(f"  MD5匹配: {original_md5 == merged_md5}")
    
    passed = original_md5 == merged_md5
    record_result("文本文件列表合并", passed,
                   f"MD5匹配: {passed}")

def test_9_recovery_script() -> None:
    """测试9: 生成并运行恢复脚本"""
    log_section("测试9: 生成并运行恢复脚本")
    
    test_file = os.path.join(TEST_DIR, "test_9_script", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 2)
    split_dir = os.path.join(TEST_DIR, "test_9_script", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    # 生成所有类型的恢复脚本
    script_dir = os.path.join(TEST_DIR, "test_9_script", "scripts")
    os.makedirs(script_dir, exist_ok=True)
    
    script_gen = RecoveryScriptGenerator(splitter.get_index_manager())
    scripts = script_gen.generate_all(
        output_dir=script_dir,
        base_name="recover",
        require_password=False
    )
    
    log("生成的脚本:")
    for script_type, script_path in scripts.items():
        file_size = os.path.getsize(script_path)
        log(f"  {script_type}: {script_path} ({file_size} 字节)")
    
    # 运行Python恢复脚本
    log("运行Python恢复脚本...")
    python_script = scripts['python']
    
    import subprocess
    
    result = subprocess.run(
        [sys.executable, python_script],
        cwd=split_dir,
        capture_output=True,
        text=True,
        input="n\n",
        timeout=30
    )
    
    log(f"脚本输出:")
    for line in result.stdout.split('\n'):
        if line.strip():
            log(f"  {line}")
    
    if result.stderr.strip():
        log(f"脚本错误输出:")
        for line in result.stderr.split('\n'):
            if line.strip():
                log(f"  {line}")
    
    log(f"脚本返回码: {result.returncode}")
    
    # 检查恢复的文件
    restored_file = os.path.join(split_dir, "original.bin")
    if os.path.exists(restored_file):
        restored_md5 = file_md5(restored_file)
        log(f"恢复文件MD5: {restored_md5}")
        log(f"与原文件匹配: {original_md5 == restored_md5}")
        
        passed = (result.returncode == 0) and (original_md5 == restored_md5)
    else:
        log("恢复文件不存在！")
        passed = False
    
    record_result("恢复脚本生成与运行", passed,
                   f"脚本返回码: {result.returncode}, 文件匹配: {original_md5 == restored_md5 if os.path.exists(restored_file) else 'N/A'}")

def test_10_md5_verification() -> None:
    """测试10: MD5完整性校验"""
    log_section("测试10: MD5完整性校验")
    
    test_file = os.path.join(TEST_DIR, "test_10_md5", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_10_md5", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"分片完成: {chunk_count} 个分片")
    
    # 验证所有分片
    merger = FileMerger(index_file_path=index_path)
    results = merger.verify_all_chunks()
    
    log("分片验证结果:")
    all_valid = True
    for result in results:
        status = '有效' if result['valid'] else '无效'
        log(f"  分片 {result['index']}: {result['filename']} - {status}")
        if not result['valid']:
            all_valid = False
    
    # 破坏一个分片
    log("破坏分片2进行验证...")
    chunk2_path = os.path.join(split_dir, "original.part2")
    with open(chunk2_path, 'ab') as f:
        f.write(b'corrupted_data_for_test')
    
    # 重新验证
    results2 = merger.verify_all_chunks()
    invalid_count = sum(1 for r in results2 if not r['valid'])
    log(f"破坏后验证 - 无效分片数: {invalid_count}")
    
    passed = all_valid and (invalid_count == 1)
    record_result("MD5完整性校验", passed,
                   f"完整时有效: {all_valid}, 破坏后检测: {invalid_count == 1}")

def test_11_index_info() -> None:
    """测试11: 索引信息查看"""
    log_section("测试11: 索引信息查看")
    
    test_file = os.path.join(TEST_DIR, "test_11_info", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    original_md5 = generate_test_file(test_file, 3)
    split_dir = os.path.join(TEST_DIR, "test_11_info", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    # 查看索引信息
    index_mgr = IndexManager()
    index_mgr.load(index_path)
    data = index_mgr.index_data
    
    log("索引信息:")
    log(f"  原始文件: {data['original_file']}")
    log(f"  原始大小: {data['original_size']} 字节")
    log(f"  分片大小: {data['chunk_size_mb']} MB")
    log(f"  分片数量: {data['total_chunks']}")
    log(f"  加密类型: {data['encryption_type']}")
    log(f"  分片扩展名: {data['chunk_extension']}")
    
    for chunk in data['chunks']:
        log(f"  分片 {chunk['index']}: {chunk['filename']} - {chunk['size']} 字节")
    
    info_valid = (
        data['original_file'] == 'original.bin' and
        data['total_chunks'] == 3 and
        data['chunk_size_mb'] == 1 and
        data['chunk_extension'] == 'part'
    )
    
    record_result("索引信息查看", info_valid,
                   f"信息完整: {info_valid}")

def test_12_crypto_module_unit() -> None:
    """测试12: 加密模块单元测试"""
    log_section("测试12: 加密模块单元测试")
    
    test_data = b"Hello, World! This is a test for encryption." * 100
    password = "secure_test_password"
    
    log("测试XOR加密...")
    xor_enc = XOREncryptor(password)
    encrypted = xor_enc.encrypt(test_data)
    decrypted = xor_enc.decrypt(encrypted)
    
    xor_ok = (encrypted != test_data) and (decrypted == test_data)
    log(f"  XOR加密解密: {'通过' if xor_ok else '失败'}")
    
    log("测试AES加密...")
    aes_enc = AESEncryptor(password)
    encrypted_aes = aes_enc.encrypt(test_data)
    decrypted_aes = aes_enc.decrypt(encrypted_aes)
    
    aes_ok = (encrypted_aes != test_data) and (decrypted_aes == test_data)
    log(f"  AES加密解密: {'通过' if aes_ok else '失败'}")
    
    log("测试AES错误密码...")
    aes_wrong = AESEncryptor("wrong_password", salt=aes_enc.salt)
    try:
        aes_wrong.decrypt(encrypted_aes)
        wrong_ok = False
        log("  错误: 错误密码解密成功了！")
    except ValueError:
        wrong_ok = True
        log("  正确: 错误密码解密失败")
    
    log("测试get_encryptor工厂函数...")
    enc_none = get_encryptor('none', password)
    enc_xor = get_encryptor('xor', password)
    enc_aes = get_encryptor('aes', password)
    
    factory_ok = (
        enc_none is None and
        isinstance(enc_xor, XOREncryptor) and
        isinstance(enc_aes, AESEncryptor)
    )
    log(f"  工厂函数: {'通过' if factory_ok else '失败'}")
    
    all_ok = xor_ok and aes_ok and wrong_ok and factory_ok
    record_result("加密模块单元测试", all_ok,
                   f"XOR: {xor_ok}, AES: {aes_ok}, 错误密码: {wrong_ok}, 工厂: {factory_ok}")

def save_results() -> None:
    """保存测试结果"""
    log_section("测试结果汇总")
    
    passed = sum(1 for r in RESULTS if r['passed'])
    failed = sum(1 for r in RESULTS if not r['passed'])
    total = len(RESULTS)
    
    log(f"总测试数: {total}")
    log(f"通过: {passed}")
    log(f"失败: {failed}")
    
    if failed > 0:
        log("")
        log("失败的测试:")
        for r in RESULTS:
            if not r['passed']:
                log(f"  - {r['name']}: {r['details']}")
    
    # 保存结果到JSON
    results_path = os.path.join(TEST_DIR, "test_results.json")
    with open(results_path, 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "timestamp": datetime.now().isoformat()
            },
            "details": RESULTS
        }, f, indent=2, ensure_ascii=False)
    
    log(f"")
    log(f"测试结果已保存到: {results_path}")
    log(f"测试日志已保存到: {LOG_FILE}")
    log(f"所有测试证据保存在: {TEST_DIR}")
    
    return failed == 0

def main() -> int:
    """主函数"""
    setup()
    
    tests = [
        test_1_basic_split_merge,
        test_2_custom_extension,
        test_3_xor_encryption,
        test_4_aes_encryption,
        test_5_resume_merge,
        test_6_range_merge,
        test_7_json_import_export,
        test_8_text_file_merge,
        test_9_recovery_script,
        test_10_md5_verification,
        test_11_index_info,
        test_12_crypto_module_unit,
    ]
    
    for test_func in tests:
        try:
            test_func()
        except Exception as e:
            log(f"  测试异常: {str(e)}")
            traceback.print_exc()
            record_result(test_func.__name__, False, f"异常: {str(e)}")
    
    all_passed = save_results()
    
    log("")
    log("=" * 70)
    log(f"测试完成 - {'全部通过' if all_passed else '存在失败'}")
    log("=" * 70)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
