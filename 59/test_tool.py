#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量解压工具测试脚本
"""

import os
import sys
import shutil
import zipfile
import tarfile
import py7zr
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batch_unzip


def create_test_archives(test_dir):
    archives_dir = os.path.join(test_dir, "archives")
    os.makedirs(archives_dir, exist_ok=True)

    temp_work = os.path.join(test_dir, "temp_work")
    os.makedirs(temp_work, exist_ok=True)

    files_info = []

    txt_file = os.path.join(temp_work, "document.txt")
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write("这是一个测试文本文件\n")
        f.write("Hello World!\n")
        f.write("测试内容 12345\n")
    files_info.append(("document.txt", txt_file))

    jpg_file = os.path.join(temp_work, "image.jpg")
    with open(jpg_file, "wb") as f:
        f.write(b"fake jpeg content")
    files_info.append(("image.jpg", jpg_file))

    png_file = os.path.join(temp_work, "picture.png")
    with open(png_file, "wb") as f:
        f.write(b"fake png content")
    files_info.append(("picture.png", png_file))

    log_file = os.path.join(temp_work, "data.log")
    with open(log_file, "w") as f:
        f.write("log data here\n")
    files_info.append(("data.log", log_file))

    zip_path = os.path.join(archives_dir, "test_zip.zip")
    with zipfile.ZipFile(zip_path, "w") as zf:
        for name, path in files_info:
            zf.write(path, arcname=name)
    print(f"✓ 创建测试 ZIP: {zip_path}")

    tar_path = os.path.join(archives_dir, "test_tar.tar")
    with tarfile.open(tar_path, "w") as tf:
        for name, path in files_info:
            tf.add(path, arcname=name)
    print(f"✓ 创建测试 TAR: {tar_path}")

    tgz_path = os.path.join(archives_dir, "test_tar_gz.tar.gz")
    with tarfile.open(tgz_path, "w:gz") as tf:
        for name, path in files_info:
            tf.add(path, arcname=name)
    print(f"✓ 创建测试 TAR.GZ: {tgz_path}")

    import gzip
    gz_path = os.path.join(archives_dir, "test_single.gz")
    with open(txt_file, "rb") as f_in:
        with gzip.open(gz_path, "wb") as f_out:
            f_out.write(f_in.read())
    print(f"✓ 创建测试 GZ: {gz_path}")

    seven_zip_path = os.path.join(archives_dir, "test_7z.7z")
    with py7zr.SevenZipFile(seven_zip_path, "w") as szf:
        for name, path in files_info:
            szf.write(path, arcname=name)
    print(f"✓ 创建测试 7Z: {seven_zip_path}")

    password = "test123"
    encrypted_zip = os.path.join(archives_dir, "test_password.zip")
    with zipfile.ZipFile(encrypted_zip, "w") as zf:
        zf.setpassword(password.encode())
        for name, path in files_info[:2]:
            zf.write(path, arcname=name)
    print(f"✓ 创建带密码 ZIP: {encrypted_zip} (密码: {password})")

    nested_dir = os.path.join(temp_work, "nested")
    os.makedirs(nested_dir, exist_ok=True)
    inner_zip = os.path.join(nested_dir, "inner.zip")
    with zipfile.ZipFile(inner_zip, "w") as zf:
        zf.write(txt_file, arcname="nested_doc.txt")

    nested_zip = os.path.join(archives_dir, "test_nested.zip")
    with zipfile.ZipFile(nested_zip, "w") as zf:
        zf.write(inner_zip, arcname="inner.zip")
        zf.write(txt_file, arcname="outer_doc.txt")
    print(f"✓ 创建嵌套压缩包: {nested_zip}")

    shutil.rmtree(temp_work)
    return archives_dir


def run_test(test_name, test_func):
    print(f"\n{'=' * 60}")
    print(f"测试: {test_name}")
    print('=' * 60)
    try:
        test_func()
        print(f"✓ 测试通过: {test_name}")
        return True
    except Exception as e:
        print(f"✗ 测试失败: {test_name}")
        print(f"  错误: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_format_detection():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)

        archives = batch_unzip.find_archives(archives_dir)
        print(f"找到 {len(archives)} 个压缩包")
        for arch in archives:
            fmt = batch_unzip.get_archive_format(arch)
            print(f"  {os.path.basename(arch)} -> {fmt}")

        expected = 7
        assert len(archives) == expected, f"应该找到 {expected} 个压缩包，实际找到 {len(archives)}"
        assert all(batch_unzip.is_archive(a) for a in archives)


def test_preview_mode():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        archives = batch_unzip.find_archives(archives_dir)

        for arch in archives[:3]:
            result = batch_unzip.extract_file(
                arch, output_dir, preview=True, logger=logger
            )
            assert result['success'], f"预览失败: {arch}"
            assert result['action'] == 'preview'

        assert len(os.listdir(output_dir)) == 0, "预览模式不应该实际解压文件"


def test_basic_extraction():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        archives = batch_unzip.find_archives(archives_dir)

        zip_path = os.path.join(archives_dir, "test_zip.zip")
        result = batch_unzip.extract_file(zip_path, output_dir, logger=logger)
        assert result['success'], f"解压失败: {zip_path}"

        zip_output = os.path.join(output_dir, "test_zip")
        assert os.path.isdir(zip_output), "应该创建同名目录"
        assert os.path.exists(os.path.join(zip_output, "document.txt"))


def test_extension_filter():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        zip_path = os.path.join(archives_dir, "test_zip.zip")

        result = batch_unzip.extract_file(
            zip_path, output_dir,
            allowed_extensions=['.jpg', '.png'],
            logger=logger
        )
        assert result['success']

        zip_output = os.path.join(output_dir, "test_zip")
        extracted = os.listdir(zip_output)
        print(f"过滤后解压的文件: {extracted}")

        assert 'image.jpg' in extracted
        assert 'picture.png' in extracted
        assert 'document.txt' not in extracted
        assert 'data.log' not in extracted


def test_password_list():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)

        encrypted_7z = os.path.join(archives_dir, "test_password_7z.7z")
        txt_file = os.path.join(tmpdir, "temp_test.txt")
        with open(txt_file, "w") as f:
            f.write("test content")

        with py7zr.SevenZipFile(encrypted_7z, mode='w', password="test123") as szf:
            szf.write(txt_file, arcname="test.txt")
        os.remove(txt_file)

        wrong_then_right = ["wrongpass", "test123", "another"]
        result = batch_unzip.extract_file(
            encrypted_7z, output_dir,
            passwords=wrong_then_right,
            logger=logger
        )
        assert result['success'], "应该能用正确密码解压"
        assert result['extracted'] == 1, "应该解压1个文件"

        used_password = batch_unzip.try_passwords(encrypted_7z, wrong_then_right)
        assert used_password == "test123", "应该找到正确的密码"

        wrong_passwords = ["wrong1", "wrong2"]
        no_match = batch_unzip.try_passwords(encrypted_7z, wrong_passwords)
        assert no_match is None, "错误密码列表应该返回None"


def test_conflict_handling():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        zip_path = os.path.join(archives_dir, "test_zip.zip")

        result1 = batch_unzip.extract_file(
            zip_path, output_dir, conflict='skip', logger=logger
        )
        assert result1['success']

        result2 = batch_unzip.extract_file(
            zip_path, output_dir, conflict='skip', logger=logger
        )
        assert result2['action'] == 'skipped'

        result3 = batch_unzip.extract_file(
            zip_path, output_dir, conflict='rename', logger=logger
        )
        assert result3['success']

        dirs = os.listdir(output_dir)
        print(f"解压后的目录: {dirs}")
        assert 'test_zip' in dirs
        assert 'test_zip_1' in dirs


def test_integrity_test():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)

        archives = batch_unzip.find_archives(archives_dir)

        for arch in archives:
            ok, error = batch_unzip.test_archive_integrity(arch)
            print(f"{os.path.basename(arch)}: 完好={ok}, error={error}")
            assert ok, f"压缩包应该是完好的: {arch}"

        corrupted = os.path.join(tmpdir, "corrupted.zip")
        with open(corrupted, "wb") as f:
            f.write(b"not a valid zip file")

        ok, error = batch_unzip.test_archive_integrity(corrupted)
        assert not ok, "损坏的文件应该检测失败"
        print(f"损坏文件检测正确: error={error}")


def test_delete_original():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        zip_path = os.path.join(archives_dir, "test_zip.zip")

        assert os.path.exists(zip_path)

        result = batch_unzip.extract_file(
            zip_path, output_dir,
            delete_original=True,
            logger=logger
        )
        assert result['success']
        assert not os.path.exists(zip_path), "原文件应该被删除"


def test_recursive_extraction():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        nested_zip = os.path.join(archives_dir, "test_nested.zip")

        results = batch_unzip.recursive_extract(
            [nested_zip], output_dir, None, False, None, False, 'skip', logger
        )

        print(f"递归解压结果: {len(results)} 个操作")
        for r in results:
            print(f"  {r}")

        assert len(results) >= 2, "应该解压外层和内层压缩包"

        all_files = []
        for root, dirs, files in os.walk(output_dir):
            for f in files:
                all_files.append(os.path.join(root, f))

        print(f"所有解压文件: {all_files}")
        assert any('nested_doc.txt' in f for f in all_files)


def test_logging():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)
        log_file = os.path.join(tmpdir, "test.log")

        logger = batch_unzip.setup_logger(log_file)
        zip_path = os.path.join(archives_dir, "test_zip.zip")

        batch_unzip.extract_file(zip_path, output_dir, logger=logger)

        assert os.path.exists(log_file), "日志文件应该被创建"

        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read()

        assert 'test_zip.zip' in log_content
        assert '成功解压' in log_content


def test_multithreaded():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        archives = batch_unzip.find_archives(archives_dir)[:4]

        from concurrent.futures import ThreadPoolExecutor, as_completed

        results = []
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(
                    batch_unzip.extract_file,
                    arch, output_dir, None, False, None, False, True, 'skip', logger
                )
                for arch in archives
            ]
            for future in as_completed(futures):
                results.append(future.result())

        success_count = sum(1 for r in results if r.get('success'))
        assert success_count == len(archives), f"所有文件都应该成功解压，成功 {success_count}/{len(archives)}"


def test_progress_bar():
    with tempfile.TemporaryDirectory() as tmpdir:
        archives_dir = create_test_archives(tmpdir)
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)

        logger = batch_unzip.setup_logger(None)
        archives = batch_unzip.find_archives(archives_dir)

        zip_path = os.path.join(archives_dir, "test_zip.zip")
        result = batch_unzip.extract_file(
            zip_path, output_dir, progress_bar=True, logger=logger
        )
        assert result['success'], "带进度条的解压应该成功"
        assert result['extracted'] == 4

        output_dir2 = os.path.join(tmpdir, "output2")
        os.makedirs(output_dir2, exist_ok=True)
        result2 = batch_unzip.extract_file(
            zip_path, output_dir2, progress_bar=False, logger=logger
        )
        assert result2['success'], "无进度条的解压应该成功"

        tar_path = os.path.join(archives_dir, "test_tar.tar")
        output_dir3 = os.path.join(tmpdir, "output3")
        os.makedirs(output_dir3, exist_ok=True)
        result3 = batch_unzip.extract_file(
            tar_path, output_dir3, progress_bar=True, logger=logger
        )
        assert result3['success'], "TAR 格式带进度条解压应该成功"

        gz_path = os.path.join(archives_dir, "test_single.gz")
        output_dir4 = os.path.join(tmpdir, "output4")
        os.makedirs(output_dir4, exist_ok=True)
        result4 = batch_unzip.extract_file(
            gz_path, output_dir4, progress_bar=True, logger=logger
        )
        assert result4['success'], "GZ 格式带进度条解压应该成功"

        seven_zip_path = os.path.join(archives_dir, "test_7z.7z")
        output_dir5 = os.path.join(tmpdir, "output5")
        os.makedirs(output_dir5, exist_ok=True)
        result5 = batch_unzip.extract_file(
            seven_zip_path, output_dir5, progress_bar=True, logger=logger
        )
        assert result5['success'], "7Z 格式带进度条解压应该成功"

        from concurrent.futures import ThreadPoolExecutor
        output_dir6 = os.path.join(tmpdir, "output6")
        os.makedirs(output_dir6, exist_ok=True)
        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(
                batch_unzip.extract_file, zip_path, output_dir6,
                None, False, None, False, True, 'rename', logger
            )
            future2 = executor.submit(
                batch_unzip.extract_file, tar_path, output_dir6,
                None, False, None, False, True, 'rename', logger
            )
            r1 = future1.result()
            r2 = future2.result()
            assert r1['success'] and r2['success'], "多线程带进度条解压应该成功"


def main():
    print("批量解压工具 - 功能测试")
    print("=" * 60)

    tests = [
        ("格式识别测试", test_format_detection),
        ("预览模式测试", test_preview_mode),
        ("基本解压测试", test_basic_extraction),
        ("扩展名过滤测试", test_extension_filter),
        ("密码列表测试", test_password_list),
        ("冲突处理测试", test_conflict_handling),
        ("完整性测试", test_integrity_test),
        ("删除原文件测试", test_delete_original),
        ("递归解压测试", test_recursive_extraction),
        ("日志记录测试", test_logging),
        ("多线程解压测试", test_multithreaded),
        ("进度条功能测试", test_progress_bar),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        if run_test(test_name, test_func):
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"测试完成: 通过 {passed}/{passed + failed}")
    if failed > 0:
        print(f"有 {failed} 个测试失败")
        sys.exit(1)
    else:
        print("所有测试通过! ✓")
        sys.exit(0)


if __name__ == "__main__":
    main()
