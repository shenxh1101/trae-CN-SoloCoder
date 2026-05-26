#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
进度条功能演示脚本
"""

import os
import sys
import zipfile
import tarfile
import py7zr
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def reset_logger():
    import logging
    logger = logging.getLogger('batch_unzip')
    logger.handlers.clear()
    return logger


def create_large_test_files():
    print("=" * 60)
    print("创建演示用测试文件...")
    print("=" * 60)

    test_dir = os.path.join(os.path.dirname(__file__), "demo_test")
    archives_dir = os.path.join(test_dir, "archives")
    output_dir = os.path.join(test_dir, "output")

    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)

    os.makedirs(archives_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    temp_work = os.path.join(test_dir, "temp")
    os.makedirs(temp_work, exist_ok=True)

    large_file1 = os.path.join(temp_work, "large_file1.bin")
    print(f"  创建 {os.path.basename(large_file1)} (5MB)...")
    with open(large_file1, "wb") as f:
        f.write(os.urandom(5 * 1024 * 1024))

    large_file2 = os.path.join(temp_work, "large_file2.bin")
    print(f"  创建 {os.path.basename(large_file2)} (3MB)...")
    with open(large_file2, "wb") as f:
        f.write(os.urandom(3 * 1024 * 1024))

    large_file3 = os.path.join(temp_work, "large_file3.txt")
    print(f"  创建 {os.path.basename(large_file3)} (2MB)...")
    with open(large_file3, "w") as f:
        f.write("测试内容\n" * 500000)

    zip_path = os.path.join(archives_dir, "demo_large.zip")
    print(f"  创建 {os.path.basename(zip_path)}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(large_file1, arcname="large_file1.bin")
        zf.write(large_file2, arcname="large_file2.bin")
        zf.write(large_file3, arcname="large_file3.txt")

    tar_path = os.path.join(archives_dir, "demo_large.tar")
    print(f"  创建 {os.path.basename(tar_path)}...")
    with tarfile.open(tar_path, "w") as tf:
        tf.add(large_file1, arcname="large_file1.bin")
        tf.add(large_file2, arcname="large_file2.bin")
        tf.add(large_file3, arcname="large_file3.txt")

    tgz_path = os.path.join(archives_dir, "demo_large.tar.gz")
    print(f"  创建 {os.path.basename(tgz_path)}...")
    with tarfile.open(tgz_path, "w:gz") as tf:
        tf.add(large_file1, arcname="large_file1.bin")
        tf.add(large_file2, arcname="large_file2.bin")
        tf.add(large_file3, arcname="large_file3.txt")

    seven_zip_path = os.path.join(archives_dir, "demo_large.7z")
    print(f"  创建 {os.path.basename(seven_zip_path)}...")
    with py7zr.SevenZipFile(seven_zip_path, "w") as szf:
        szf.write(large_file1, arcname="large_file1.bin")
        szf.write(large_file2, arcname="large_file2.bin")
        szf.write(large_file3, arcname="large_file3.txt")

    shutil.rmtree(temp_work)
    print("\n测试文件创建完成!")

    return archives_dir, output_dir


def main():
    print("\n" + "*" * 60)
    print("*" + " " * 58 + "*")
    print("*" + " " * 15 + "批量解压工具 - 进度条功能演示" + " " * 13 + "*")
    print("*" + " " * 58 + "*")
    print("*" * 60)

    archives_dir, output_dir = create_large_test_files()

    print("\n" + "=" * 60)
    print("现在演示命令行使用方式:")
    print("=" * 60)

    print("\n1. 基本解压（带进度条）:")
    print(f"   python batch_unzip.py \"{archives_dir}\"")
    print(f"   输出目录: {output_dir}")

    print("\n2. 多线程解压（2个线程，带进度条）:")
    print(f"   python batch_unzip.py \"{archives_dir}\" -t 2")

    print("\n3. 关闭进度条:")
    print(f"   python batch_unzip.py \"{archives_dir}\" --no-progress")

    print("\n4. 解压后删除原文件:")
    print(f"   python batch_unzip.py \"{archives_dir}\" -d")

    print("\n5. 只解压特定扩展名的文件:")
    print(f"   python batch_unzip.py \"{archives_dir}\" --ext .bin")

    print("\n" + "=" * 60)
    print("运行命令示例（带进度条）:")
    print("=" * 60)
    print(f"\n$ python batch_unzip.py \"{archives_dir}\" -o \"{output_dir}\"")
    print()

    import batch_unzip
    reset_logger()
    batch_unzip.next_position = 0

    logger = batch_unzip.setup_logger(None)
    archives = batch_unzip.find_archives(archives_dir)

    for arch in archives:
        result = batch_unzip.extract_file(
            arch, output_dir, progress_bar=True,
            conflict='rename', logger=logger
        )
        print()

    print("\n" + "=" * 60)
    print("✓ 演示完成! 进度条功能已正常工作")
    print("=" * 60)

    print(f"\n测试文件目录: {os.path.dirname(archives_dir)}")
    print("可以手动删除该目录以清理空间")


if __name__ == "__main__":
    main()
