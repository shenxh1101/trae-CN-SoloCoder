#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件分片合并工具 - 完整端到端测试套件 (详细版)
包含加密过程详细日志和恢复脚本执行完整输出
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
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_evidence_detailed")
LOG_FILE = os.path.join(TEST_DIR, "test_log_detailed.txt")
RESULTS = []

def log(msg: str) -> None:
    """记录日志到控制台和文件"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_msg + '\n')

def log_section(title: str) -> None:
    """记录分节标题"""
    separator = "=" * 80
    log("")
    log(separator)
    log(f"  {title}")
    log(separator)

def log_subsection(title: str) -> None:
    """记录子节标题"""
    separator = "-" * 80
    log("")
    log(f"--- {title} ---")
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
    log("")
    log(f"  【{status}】 {test_name}")
    if details:
        log(f"         {details}")
    log("")

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
    log(f"  文件大小: {actual_size} 字节")
    log(f"  文件MD5: {file_md5}")
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
    LOG_FILE = os.path.join(TEST_DIR, "test_log_detailed.txt")
    
    log("=" * 80)
    log("=" * 80)
    log("  文件分片合并工具 - 完整端到端测试 (详细版)")
    log(f"  测试时间: {datetime.now().isoformat()}")
    log(f"  测试目录: {TEST_DIR}")
    log("=" * 80)
    log("=" * 80)

def test_1_xor_encryption_detailed() -> None:
    """测试1: XOR加密分片合并 - 详细过程"""
    log_section("测试1: XOR加密分片合并 - 完整详细过程")
    
    test_file = os.path.join(TEST_DIR, "test_1_xor", "original_data.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    log_subsection("步骤1: 生成原始测试文件")
    original_md5 = generate_test_file(test_file, 4)
    
    log_subsection("步骤2: 配置XOR加密参数")
    password = "XOR_Encryption_Test_Password_2024!"
    log(f"  加密类型: XOR (异或加密)")
    log(f"  密码: {password}")
    log(f"  密码长度: {len(password)} 字符")
    
    log_subsection("步骤3: 执行带XOR加密的分片操作")
    split_dir = os.path.join(TEST_DIR, "test_1_xor", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    log(f"  分片大小: 1 MB")
    log(f"  输出目录: {split_dir}")
    log(f"  开始分片加密...")
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="xor",
        password=password
    )
    index_path, chunk_count = splitter.split()
    
    log(f"  分片加密完成！")
    log(f"  分片数量: {chunk_count} 个")
    log(f"  索引文件: {index_path}")
    
    log_subsection("步骤4: 查看所有加密后的分片文件")
    for i in range(1, chunk_count + 1):
        chunk_file = os.path.join(split_dir, f"original_data.part{i}")
        file_size = os.path.getsize(chunk_file)
        chunk_md5 = file_md5(chunk_file)
        log(f"  分片 {i}: original_data.part{i} - {file_size} 字节 - MD5: {chunk_md5}")
    
    log_subsection("步骤5: 验证加密效果（比较加密前后数据）")
    with open(test_file, 'rb') as f:
        original_header = f.read(64)
    
    with open(os.path.join(split_dir, "original_data.part1"), 'rb') as f:
        encrypted_header = f.read(64)
    
    log("  原始文件前64字节(十六进制):")
    log(f"    {original_header.hex()}")
    log("  加密后文件前64字节(十六进制):")
    log(f"    {encrypted_header.hex()}")
    
    is_encrypted = original_header != encrypted_header
    log(f"  数据已加密: {'是 ✓' if is_encrypted else '否 ✗'}")
    
    log_subsection("步骤6: 查看索引文件内容")
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    log(f"  原始文件: {index_data['original_file']}")
    log(f"  原始大小: {index_data['original_size']} 字节")
    log(f"  加密类型: {index_data['encryption_type']}")
    log(f"  分片扩展名: {index_data['chunk_extension']}")
    log(f"  总分片数: {index_data['total_chunks']}")
    
    log_subsection("步骤7: 尝试不带密码合并（应该失败）")
    merged_fail = os.path.join(TEST_DIR, "test_1_xor", "merged_no_password.bin")
    log(f"  尝试合并: {merged_fail}")
    log("  不提供密码...")
    
    merger_fail = FileMerger(
        index_file_path=index_path,
        output_path=merged_fail,
        verify_integrity=True,
        resume=False
    )
    
    try:
        merger_fail.merge()
        log("  ✗ 错误: 不带密码合并成功了（不应该）！")
        record_result("XOR加密-不带密码失败验证", False, "不带密码合并不应该成功")
    except ValueError as e:
        log(f"  ✓ 正确: 不带密码合并失败")
        log(f"    错误信息: {str(e)}")
        record_result("XOR加密-不带密码失败验证", True, "正确拒绝无密码合并")
    
    log_subsection("步骤8: 带正确密码解密合并")
    merged_file = os.path.join(TEST_DIR, "test_1_xor", "merged_with_password.bin")
    log(f"  输出文件: {merged_file}")
    log(f"  使用密码: {password}")
    log(f"  开始解密合并...")
    
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        password=password,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    log(f"  解密合并完成！")
    log(f"  输出文件: {output_path}")
    log(f"  文件大小: {os.path.getsize(output_path)} 字节")
    
    merged_md5 = file_md5(merged_file)
    log(f"  原始文件MD5: {original_md5}")
    log(f"  合并文件MD5: {merged_md5}")
    
    md5_match = original_md5 == merged_md5
    log(f"  MD5匹配: {'是 ✓' if md5_match else '否 ✗'}")
    log(f"  完整性验证: {'通过 ✓' if verified else '失败 ✗'}")
    
    passed = md5_match and verified and is_encrypted
    record_result("XOR加密分片合并（详细）", passed,
                   f"加密有效: {is_encrypted}, MD5匹配: {md5_match}, 完整性验证: {verified}")

def test_2_aes_encryption_detailed() -> None:
    """测试2: AES加密分片合并 - 详细过程"""
    log_section("测试2: AES加密分片合并 - 完整详细过程")
    
    test_file = os.path.join(TEST_DIR, "test_2_aes", "original_data.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    log_subsection("步骤1: 生成原始测试文件")
    original_md5 = generate_test_file(test_file, 4)
    
    log_subsection("步骤2: 配置AES加密参数")
    password = "AES_Encryption_Secure_Password_2024!"
    log(f"  加密类型: AES-256-GCM")
    log(f"  密码: {password}")
    log(f"  密码长度: {len(password)} 字符")
    log(f"  密钥派生: PBKDF2 with 100,000 iterations")
    
    log_subsection("步骤3: 执行带AES加密的分片操作")
    split_dir = os.path.join(TEST_DIR, "test_2_aes", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    log(f"  分片大小: 1 MB")
    log(f"  输出目录: {split_dir}")
    log(f"  开始分片加密...")
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="aes",
        encryption_type="aes",
        password=password
    )
    index_path, chunk_count = splitter.split()
    
    log(f"  分片加密完成！")
    log(f"  分片数量: {chunk_count} 个")
    log(f"  索引文件: {index_path}")
    
    log_subsection("步骤4: 查看所有加密后的分片文件")
    for i in range(1, chunk_count + 1):
        chunk_file = os.path.join(split_dir, f"original_data.aes{i}")
        file_size = os.path.getsize(chunk_file)
        chunk_md5 = file_md5(chunk_file)
        log(f"  分片 {i}: original_data.aes{i} - {file_size} 字节 - MD5: {chunk_md5}")
    
    log_subsection("步骤5: 验证加密效果（比较加密前后数据）")
    with open(test_file, 'rb') as f:
        original_header = f.read(64)
    
    with open(os.path.join(split_dir, "original_data.aes1"), 'rb') as f:
        encrypted_header = f.read(64)
    
    log("  原始文件前64字节(十六进制):")
    log(f"    {original_header.hex()}")
    log("  加密后文件前64字节(十六进制):")
    log(f"    {encrypted_header.hex()}")
    
    is_encrypted = original_header != encrypted_header
    log(f"  数据已加密: {'是 ✓' if is_encrypted else '否 ✗'}")
    
    log_subsection("步骤6: 查看AES加密元数据结构")
    log("  AES加密数据结构:")
    log("    - Salt: 16 字节 (用于密钥派生)")
    log("    - Nonce: 16 字节 (GCM模式)")
    log("    - Tag: 16 字节 (完整性验证)")
    log("    - Ciphertext: 实际加密数据")
    
    log_subsection("步骤7: 尝试使用错误密码合并（应该失败）")
    merged_fail = os.path.join(TEST_DIR, "test_2_aes", "merged_wrong_password.bin")
    wrong_password = "Wrong_Password_123!"
    log(f"  尝试合并: {merged_fail}")
    log(f"  使用错误密码: {wrong_password}")
    
    merger_fail = FileMerger(
        index_file_path=index_path,
        output_path=merged_fail,
        password=wrong_password,
        verify_integrity=True,
        resume=False
    )
    
    try:
        merger_fail.merge()
        log("  ✗ 错误: 错误密码合并成功了（不应该）！")
        record_result("AES加密-错误密码失败验证", False, "错误密码合并不应该成功")
    except ValueError as e:
        log(f"  ✓ 正确: 错误密码合并失败")
        log(f"    错误信息: {str(e)}")
        record_result("AES加密-错误密码失败验证", True, "正确拒绝错误密码")
    
    log_subsection("步骤8: 带正确密码解密合并")
    merged_file = os.path.join(TEST_DIR, "test_2_aes", "merged_with_password.bin")
    log(f"  输出文件: {merged_file}")
    log(f"  使用正确密码: {password}")
    log(f"  开始解密合并...")
    
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        password=password,
        verify_integrity=True,
        resume=False
    )
    output_path, verified = merger.merge()
    
    log(f"  解密合并完成！")
    log(f"  输出文件: {output_path}")
    log(f"  文件大小: {os.path.getsize(output_path)} 字节")
    
    merged_md5 = file_md5(merged_file)
    log(f"  原始文件MD5: {original_md5}")
    log(f"  合并文件MD5: {merged_md5}")
    
    md5_match = original_md5 == merged_md5
    log(f"  MD5匹配: {'是 ✓' if md5_match else '否 ✗'}")
    log(f"  完整性验证: {'通过 ✓' if verified else '失败 ✗'}")
    
    passed = md5_match and verified and is_encrypted
    record_result("AES加密分片合并（详细）", passed,
                   f"加密有效: {is_encrypted}, MD5匹配: {md5_match}, 完整性验证: {verified}")

def test_3_recovery_script_detailed() -> None:
    """测试3: 生成并运行恢复脚本 - 详细过程"""
    log_section("测试3: 生成并运行恢复脚本 - 完整详细过程")
    
    test_file = os.path.join(TEST_DIR, "test_3_script", "original_file.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    log_subsection("步骤1: 生成原始测试文件")
    original_md5 = generate_test_file(test_file, 3)
    
    log_subsection("步骤2: 执行分片（不加密）")
    split_dir = os.path.join(TEST_DIR, "test_3_script", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    log(f"  分片大小: 1 MB")
    log(f"  输出目录: {split_dir}")
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        chunk_extension="part",
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"  分片完成: {chunk_count} 个分片")
    
    log_subsection("步骤3: 生成所有类型的恢复脚本")
    script_dir = os.path.join(TEST_DIR, "test_3_script", "scripts")
    os.makedirs(script_dir, exist_ok=True)
    
    script_gen = RecoveryScriptGenerator(splitter.get_index_manager())
    log(f"  生成脚本目录: {script_dir}")
    log(f"  脚本基础名称: recover")
    
    scripts = script_gen.generate_all(
        output_dir=script_dir,
        base_name="recover",
        require_password=False
    )
    
    log("  生成的脚本文件:")
    for script_type, script_path in scripts.items():
        file_size = os.path.getsize(script_path)
        log(f"    {script_type.upper()}: {script_path} ({file_size} 字节)")
    
    log_subsection("步骤4: 查看Windows批处理脚本内容")
    log("  Windows批处理脚本 (recover.bat) 前30行:")
    with open(scripts['windows'], 'r', encoding='gbk', errors='replace') as f:
        for i, line in enumerate(f):
            if i >= 30:
                log("    ...")
                break
            log(f"    {i+1:2d}: {line.rstrip()}")
    
    log_subsection("步骤5: 查看Unix Shell脚本内容")
    log("  Unix Shell脚本 (recover.sh) 前30行:")
    with open(scripts['unix'], 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= 30:
                log("    ...")
                break
            log(f"    {i+1:2d}: {line.rstrip()}")
    
    log_subsection("步骤6: 查看Python恢复脚本内容")
    log("  Python恢复脚本 (recover.py) 前50行:")
    with open(scripts['python'], 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= 50:
                log("    ...")
                break
            log(f"    {i+1:2d}: {line.rstrip()}")
    
    log_subsection("步骤7: 将恢复脚本复制到分片目录并运行")
    import shutil
    
    # 复制Python脚本到分片目录
    script_in_split_dir = os.path.join(split_dir, "recover.py")
    shutil.copy2(scripts['python'], script_in_split_dir)
    log(f"  复制Python脚本到: {script_in_split_dir}")
    
    # 先删除原文件，确保是恢复出来的
    original_in_split = os.path.join(split_dir, "original_file.bin")
    if os.path.exists(original_in_split):
        os.remove(original_in_split)
        log(f"  删除已有文件以确保是新恢复的")
    
    log_subsection("步骤8: 执行恢复脚本 (python recover.py)")
    log("  执行命令: python recover.py")
    log("  输入: n (不删除分片)")
    log("")
    log("  ========== 恢复脚本执行开始 ==========")
    
    import subprocess
    
    result = subprocess.run(
        [sys.executable, "recover.py"],
        cwd=split_dir,
        capture_output=True,
        text=True,
        input="n\n",
        timeout=60
    )
    
    # 记录脚本完整输出
    if result.stdout:
        log("  脚本标准输出:")
        for line in result.stdout.split('\n'):
            log(f"    {line}")
    
    if result.stderr:
        log("  脚本标准错误:")
        for line in result.stderr.split('\n'):
            log(f"    {line}")
    
    log("  ========== 恢复脚本执行结束 ==========")
    log("")
    log(f"  脚本返回码: {result.returncode}")
    
    log_subsection("步骤9: 验证恢复结果")
    restored_file = os.path.join(split_dir, "original_file.bin")
    
    if os.path.exists(restored_file):
        restored_size = os.path.getsize(restored_file)
        restored_md5 = file_md5(restored_file)
        log(f"  恢复文件存在: 是 ✓")
        log(f"  恢复文件大小: {restored_size} 字节")
        log(f"  原始文件MD5: {original_md5}")
        log(f"  恢复文件MD5: {restored_md5}")
        
        md5_match = original_md5 == restored_md5
        log(f"  MD5匹配: {'是 ✓' if md5_match else '否 ✗'}")
        
        script_ok = result.returncode == 0
        passed = script_ok and md5_match
    else:
        log("  恢复文件不存在: 否 ✗")
        script_ok = result.returncode == 0
        passed = False
    
    record_result("恢复脚本生成与运行（详细）", passed,
                   f"脚本返回码: {result.returncode}, 文件MD5匹配: {md5_match if os.path.exists(restored_file) else False}")

def test_4_resume_merge_detailed() -> None:
    """测试4: 断点续传合并 - 详细过程"""
    log_section("测试4: 断点续传合并 - 完整详细过程")
    
    test_file = os.path.join(TEST_DIR, "test_4_resume", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    log_subsection("步骤1: 生成原始测试文件")
    original_md5 = generate_test_file(test_file, 5)
    
    log_subsection("步骤2: 执行分片")
    split_dir = os.path.join(TEST_DIR, "test_4_resume", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"  分片完成: {chunk_count} 个分片")
    
    log_subsection("步骤3: 模拟合并中断（只合并前2个分片）")
    merged_file = os.path.join(TEST_DIR, "test_4_resume", "merged.bin")
    
    index_mgr = IndexManager()
    index_mgr.load(index_path)
    chunks = sorted(index_mgr.index_data['chunks'], key=lambda x: x['index'])
    
    log(f"  模拟合并前2个分片后中断...")
    with open(merged_file, 'wb') as out_file:
        for i in range(2):
            chunk_path = os.path.join(split_dir, chunks[i]['filename'])
            with open(chunk_path, 'rb') as cf:
                out_file.write(cf.read())
                log(f"  已写入分片 {i+1}")
    
    partial_size = os.path.getsize(merged_file)
    log(f"  部分合并完成: {partial_size} 字节")
    
    # 保存进度
    index_mgr.update_merge_progress(
        current_chunk=2,
        bytes_written=partial_size,
        completed=False
    )
    index_mgr.save()
    
    log(f"  进度已保存到索引文件")
    log(f"  当前分片: 2")
    log(f"  已写入字节: {partial_size}")
    log(f"  完成状态: False")
    
    log_subsection("步骤4: 查看索引文件中的进度信息")
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    progress = index_data.get('merge_progress', {})
    log(f"  merge_progress.current_chunk: {progress.get('current_chunk')}")
    log(f"  merge_progress.bytes_written: {progress.get('bytes_written')}")
    log(f"  merge_progress.completed: {progress.get('completed')}")
    
    log_subsection("步骤5: 执行断点续传（从第3个分片继续）")
    log(f"  继续合并: {merged_file}")
    log(f"  resume=True (启用断点续传)")
    
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=True
    )
    output_path, verified = merger.merge()
    
    log(f"  断点续传合并完成！")
    
    merged_md5 = file_md5(merged_file)
    log(f"  原始文件MD5: {original_md5}")
    log(f"  合并文件MD5: {merged_md5}")
    
    md5_match = original_md5 == merged_md5
    log(f"  MD5匹配: {'是 ✓' if md5_match else '否 ✗'}")
    
    log_subsection("步骤6: 验证最终进度状态")
    index_mgr2 = IndexManager()
    index_mgr2.load(index_path)
    final_progress = index_mgr2.get_merge_progress()
    
    log(f"  最终进度:")
    log(f"    current_chunk: {final_progress.get('current_chunk')} (应为 {chunk_count})")
    log(f"    bytes_written: {final_progress.get('bytes_written')} (应为 {os.path.getsize(merged_file)})")
    log(f"    completed: {final_progress.get('completed')} (应为 True)")
    
    progress_ok = (
        final_progress.get('current_chunk') == chunk_count and
        final_progress.get('completed') == True
    )
    
    passed = md5_match and verified and progress_ok
    record_result("断点续传合并（详细）", passed,
                   f"MD5匹配: {md5_match}, 完整性验证: {verified}, 进度正确: {progress_ok}")
    
    log_subsection("步骤7: 测试 --no-resume 参数（强制重新合并）")
    merged_file2 = os.path.join(TEST_DIR, "test_4_resume", "merged_no_resume.bin")
    
    # 先部分写入
    with open(merged_file2, 'wb') as out_file:
        chunk_path = os.path.join(split_dir, chunks[0]['filename'])
        with open(chunk_path, 'rb') as cf:
            out_file.write(cf.read())
    
    # 重置进度
    index_mgr2.update_merge_progress(
        current_chunk=1,
        bytes_written=os.path.getsize(merged_file2),
        completed=False
    )
    index_mgr2.save()
    
    log(f"  强制重新合并 (resume=False)")
    log(f"  忽略已有进度，从头开始合并...")
    
    merger2 = FileMerger(
        index_file_path=index_path,
        output_path=merged_file2,
        verify_integrity=True,
        resume=False
    )
    output_path2, verified2 = merger2.merge()
    
    merged_md5_2 = file_md5(merged_file2)
    no_resume_ok = merged_md5_2 == original_md5
    log(f"  强制重新合并MD5匹配: {'是 ✓' if no_resume_ok else '否 ✗'}")
    
    record_result("强制重新合并(no-resume)（详细）", no_resume_ok,
                   f"MD5匹配: {no_resume_ok}")

def test_5_cli_commands_detailed() -> None:
    """测试5: 命令行接口命令执行 - 详细过程"""
    log_section("测试5: 命令行接口命令执行 - 完整详细过程")
    
    cli_test_dir = os.path.join(TEST_DIR, "test_5_cli")
    os.makedirs(cli_test_dir, exist_ok=True)
    test_file = os.path.join(cli_test_dir, "cli_test.bin")
    
    log_subsection("步骤1: 生成测试文件")
    original_md5 = generate_test_file(test_file, 2)
    
    log_subsection("步骤2: 执行 split 命令（通过CLI）")
    split_dir = os.path.join(cli_test_dir, "splits")
    log(f"  执行命令: python main.py split -f {test_file} -s 1 -o {split_dir} -e part")
    log("")
    log("  ========== CLI split 命令输出开始 ==========")
    
    import subprocess
    
    result = subprocess.run(
        [sys.executable, "main.py", "split", "-f", test_file, "-s", "1", "-o", split_dir, "-e", "part"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.stdout:
        for line in result.stdout.split('\n'):
            if line.strip():
                log(f"    {line}")
    
    if result.stderr:
        for line in result.stderr.split('\n'):
            if line.strip():
                log(f"    [STDERR] {line}")
    
    log("  ========== CLI split 命令输出结束 ==========")
    log(f"  命令返回码: {result.returncode}")
    
    index_path = os.path.join(split_dir, "cli_test.index.json")
    index_exists = os.path.exists(index_path)
    log(f"  索引文件生成: {'是 ✓' if index_exists else '否 ✗'}")
    
    if index_exists:
        log(f"  索引文件: {index_path}")
        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
        log(f"  分片数量: {index_data['total_chunks']}")
    
    log_subsection("步骤3: 执行 info 命令查看索引信息")
    log(f"  执行命令: python main.py info -i {index_path}")
    log("")
    log("  ========== CLI info 命令输出开始 ==========")
    
    result = subprocess.run(
        [sys.executable, "main.py", "info", "-i", index_path],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.stdout:
        for line in result.stdout.split('\n'):
            if line.strip():
                log(f"    {line}")
    
    log("  ========== CLI info 命令输出结束 ==========")
    
    log_subsection("步骤4: 执行 verify 命令验证分片")
    log(f"  执行命令: python main.py verify -i {index_path}")
    log("")
    log("  ========== CLI verify 命令输出开始 ==========")
    
    result = subprocess.run(
        [sys.executable, "main.py", "verify", "-i", index_path],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.stdout:
        for line in result.stdout.split('\n'):
            if line.strip():
                log(f"    {line}")
    
    log("  ========== CLI verify 命令输出结束 ==========")
    
    log_subsection("步骤5: 执行 merge 命令合并文件")
    merged_file = os.path.join(cli_test_dir, "merged_cli.bin")
    log(f"  执行命令: python main.py merge -i {index_path} -o {merged_file}")
    log("")
    log("  ========== CLI merge 命令输出开始 ==========")
    
    result = subprocess.run(
        [sys.executable, "main.py", "merge", "-i", index_path, "-o", merged_file],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.stdout:
        for line in result.stdout.split('\n'):
            if line.strip():
                log(f"    {line}")
    
    log("  ========== CLI merge 命令输出结束 ==========")
    log(f"  命令返回码: {result.returncode}")
    
    if os.path.exists(merged_file):
        merged_md5 = file_md5(merged_file)
        log(f"  合并文件MD5: {merged_md5}")
        log(f"  原始文件MD5: {original_md5}")
        cli_ok = merged_md5 == original_md5
        log(f"  CLI合并成功: {'是 ✓' if cli_ok else '否 ✗'}")
    else:
        cli_ok = False
        log(f"  合并文件不存在: 否 ✗")
    
    record_result("CLI命令执行（详细）", cli_ok,
                   f"split: {index_exists}, merge: {cli_ok}")

def test_6_range_merge_detailed() -> None:
    """测试6: 按范围合并 - 详细过程"""
    log_section("测试6: 按分片序号范围合并 - 完整详细过程")
    
    test_file = os.path.join(TEST_DIR, "test_6_range", "original.bin")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    log_subsection("步骤1: 生成原始测试文件 (5 MB)")
    original_md5 = generate_test_file(test_file, 5)
    
    log_subsection("步骤2: 执行分片 (1 MB/片 → 5个分片)")
    split_dir = os.path.join(TEST_DIR, "test_6_range", "splits")
    os.makedirs(split_dir, exist_ok=True)
    
    splitter = FileSplitter(
        file_path=test_file,
        chunk_size_mb=1,
        output_dir=split_dir,
        encryption_type="none"
    )
    index_path, chunk_count = splitter.split()
    
    log(f"  分片完成: {chunk_count} 个分片")
    
    log_subsection("步骤3: 合并分片范围 2-4")
    log("  说明: 跳过第1个分片，合并第2、3、4个分片")
    log("  预期结果: 3 MB 文件，内容对应原文件偏移 1MB-4MB")
    
    merged_file = os.path.join(TEST_DIR, "test_6_range", "partial_2-4.bin")
    
    merger = FileMerger(
        index_file_path=index_path,
        output_path=merged_file,
        verify_integrity=True,
        resume=False
    )
    output_path, count = merger.merge_range(2, 4, merged_file)
    
    log(f"  合并完成！")
    log(f"  合并分片数: {count}")
    log(f"  输出文件: {output_path}")
    log(f"  文件大小: {os.path.getsize(output_path)} 字节")
    
    log_subsection("步骤4: 验证部分合并的数据正确性")
    with open(test_file, 'rb') as f:
        f.seek(1 * 1024 * 1024)  # 跳过第1个分片
        expected_data = f.read(3 * 1024 * 1024)  # 读取分片2-4
    
    with open(merged_file, 'rb') as f:
        actual_data = f.read()
    
    log(f"  预期数据大小: {len(expected_data)} 字节")
    log(f"  实际数据大小: {len(actual_data)} 字节")
    
    data_match = expected_data == actual_data
    log(f"  数据完全匹配: {'是 ✓' if data_match else '否 ✗'}")
    
    if not data_match:
        log("  前64字节对比:")
        log(f"    预期: {expected_data[:64].hex()}")
        log(f"    实际: {actual_data[:64].hex()}")
    
    record_result("按范围合并（详细）", data_match,
                   f"范围: 2-4, 分片数: {count}, 数据匹配: {data_match}")

def save_results() -> None:
    """保存测试结果"""
    log_section("测试结果汇总")
    
    passed = sum(1 for r in RESULTS if r['passed'])
    failed = sum(1 for r in RESULTS if not r['passed'])
    total = len(RESULTS)
    
    log(f"  总测试数: {total}")
    log(f"  通过: {passed}")
    log(f"  失败: {failed}")
    
    if failed > 0:
        log("")
        log("  失败的测试:")
        for r in RESULTS:
            if not r['passed']:
                log(f"    - {r['name']}: {r['details']}")
    
    # 保存结果到JSON
    results_path = os.path.join(TEST_DIR, "test_results_detailed.json")
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
    
    log("")
    log(f"  测试结果已保存到: {results_path}")
    log(f"  详细日志已保存到: {LOG_FILE}")
    log(f"  所有测试证据保存在: {TEST_DIR}")
    log("")
    log(f"  日志文件大小: {os.path.getsize(LOG_FILE)} 字节")
    
    return failed == 0

def main() -> int:
    """主函数"""
    setup()
    
    tests = [
        test_1_xor_encryption_detailed,
        test_2_aes_encryption_detailed,
        test_3_recovery_script_detailed,
        test_4_resume_merge_detailed,
        test_5_cli_commands_detailed,
        test_6_range_merge_detailed,
    ]
    
    for test_func in tests:
        try:
            test_func()
        except Exception as e:
            log(f"  测试异常: {str(e)}")
            log(f"  异常堆栈: {traceback.format_exc()}")
            record_result(test_func.__name__, False, f"异常: {str(e)}")
    
    all_passed = save_results()
    
    log("")
    log("=" * 80)
    log("=" * 80)
    log(f"  全部测试完成 - {'全部通过 ✓✓✓' if all_passed else '存在失败 ✗'}")
    log("=" * 80)
    log("=" * 80)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
