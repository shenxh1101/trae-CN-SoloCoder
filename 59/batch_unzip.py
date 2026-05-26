#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量解压工具 - 支持多种格式的命令行解压工具
"""

import os
import sys
import argparse
import zipfile
import tarfile
import logging
import time
import shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import py7zr
from tqdm import tqdm

SUPPORTED_FORMATS = ('.zip', '.tar', '.tar.gz', '.tgz', '.gz', '.7z')

print_lock = Lock()
position_lock = Lock()
next_position = 0


def setup_logger(log_file=None):
    logger = logging.getLogger('batch_unzip')
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def get_archive_format(file_path):
    path = Path(file_path)
    name = path.name.lower()

    if name.endswith('.tar.gz') or name.endswith('.tgz'):
        return 'tar.gz'
    elif name.endswith('.gz'):
        return 'gz'
    elif name.endswith('.tar'):
        return 'tar'
    elif name.endswith('.zip'):
        return 'zip'
    elif name.endswith('.7z'):
        return '7z'
    return None


def is_archive(file_path):
    return get_archive_format(file_path) is not None


def list_archive_contents(file_path, password=None):
    fmt = get_archive_format(file_path)
    contents = []

    try:
        if fmt == 'zip':
            with zipfile.ZipFile(file_path, 'r') as zf:
                if password:
                    zf.setpassword(password.encode())
                contents = zf.namelist()
        elif fmt in ('tar', 'tar.gz', 'tgz'):
            mode = 'r:gz' if fmt in ('tar.gz', 'tgz') else 'r:'
            with tarfile.open(file_path, mode) as tf:
                contents = tf.getnames()
        elif fmt == '7z':
            with py7zr.SevenZipFile(file_path, mode='r', password=password) as szf:
                contents = [f.filename for f in szf.list()]
        elif fmt == 'gz':
            contents = [Path(file_path).stem]
    except Exception as e:
        raise Exception(f"无法读取压缩包内容: {e}")

    return contents


def test_archive_integrity(file_path, password=None):
    fmt = get_archive_format(file_path)
    try:
        if fmt == 'zip':
            with zipfile.ZipFile(file_path, 'r') as zf:
                if password:
                    zf.setpassword(password.encode())
                result = zf.testzip()
                return result is None, result
        elif fmt in ('tar', 'tar.gz', 'tgz'):
            mode = 'r:gz' if fmt in ('tar.gz', 'tgz') else 'r:'
            with tarfile.open(file_path, mode) as tf:
                tf.getmembers()
                return True, None
        elif fmt == '7z':
            with py7zr.SevenZipFile(file_path, mode='r', password=password) as szf:
                szf.list()
                return True, None
        elif fmt == 'gz':
            import gzip
            with gzip.open(file_path, 'rb') as gf:
                while gf.read(1024 * 1024):
                    pass
                return True, None
    except Exception as e:
        return False, str(e)
    return False, "未知错误"


def try_passwords(file_path, passwords):
    if not passwords:
        return None

    fmt = get_archive_format(file_path)
    import tempfile

    for pwd in passwords:
        try:
            if fmt == 'zip':
                with zipfile.ZipFile(file_path, 'r') as zf:
                    zf.setpassword(pwd.encode())
                    for name in zf.namelist():
                        with zf.open(name) as f:
                            f.read(1)
                    return pwd
            elif fmt == '7z':
                with tempfile.TemporaryDirectory() as tmpdir:
                    with py7zr.SevenZipFile(file_path, mode='r', password=pwd) as szf:
                        szf.extractall(path=tmpdir)
                    return pwd
            else:
                ok, _ = test_archive_integrity(file_path, pwd)
                if ok:
                    return pwd
        except Exception:
            continue
    return None


def get_unique_path(dest_path):
    if not os.path.exists(dest_path):
        return dest_path

    base, ext = os.path.splitext(dest_path)
    counter = 1
    while True:
        new_path = f"{base}_{counter}{ext}"
        if not os.path.exists(new_path):
            return new_path
        counter += 1


def get_progress_position():
    global next_position
    with position_lock:
        pos = next_position
        next_position += 1
        return pos


def release_progress_position():
    global next_position
    with position_lock:
        if next_position > 0:
            next_position -= 1


def copyfileobj_with_progress(src, dst, pbar, length=16*1024):
    while True:
        buf = src.read(length)
        if not buf:
            break
        dst.write(buf)
        pbar.update(len(buf))


def extract_file(file_path, output_dir, passwords=None, delete_original=False,
                 allowed_extensions=None, preview=False, progress_bar=True,
                 conflict='skip', logger=None):
    if logger is None:
        logger = logging.getLogger('batch_unzip')

    start_time = time.time()
    fmt = get_archive_format(file_path)
    file_name = Path(file_path).name

    with print_lock:
        logger.info(f"处理文件: {file_name} (格式: {fmt})")

    if preview:
        try:
            contents = list_archive_contents(file_path, passwords[0] if passwords else None)
            with print_lock:
                logger.info(f"压缩包 {file_name} 包含 {len(contents)} 个文件:")
                for item in contents[:50]:
                    logger.info(f"  - {item}")
                if len(contents) > 50:
                    logger.info(f"  ... 还有 {len(contents) - 50} 个文件")
            return {'success': True, 'file': file_name, 'action': 'preview', 'count': len(contents)}
        except Exception as e:
            with print_lock:
                logger.error(f"预览失败 {file_name}: {e}")
            return {'success': False, 'file': file_name, 'error': str(e)}

    archive_base = Path(file_path).stem
    if archive_base.endswith('.tar'):
        archive_base = Path(archive_base).stem

    extract_dir = os.path.join(output_dir, archive_base)

    if conflict == 'rename':
        extract_dir = get_unique_path(extract_dir)
    elif conflict == 'skip' and os.path.exists(extract_dir):
        with print_lock:
            logger.info(f"跳过已存在的目录: {extract_dir}")
        return {'success': True, 'file': file_name, 'action': 'skipped'}

    os.makedirs(extract_dir, exist_ok=True)

    password = None
    if passwords:
        password = try_passwords(file_path, passwords)
        if password is None and passwords:
            with print_lock:
                logger.warning(f"所有密码都无法解压 {file_name}，尝试无密码解压")

    try:
        extracted_count = 0
        position = get_progress_position() if progress_bar else None

        if fmt == 'zip':
            extracted_count = extract_zip(file_path, extract_dir, password, allowed_extensions, conflict, progress_bar, position, file_name)
        elif fmt in ('tar', 'tar.gz', 'tgz'):
            extracted_count = extract_tar(file_path, extract_dir, fmt, allowed_extensions, conflict, progress_bar, position, file_name)
        elif fmt == '7z':
            extracted_count = extract_7z(file_path, extract_dir, password, allowed_extensions, conflict, progress_bar, position, file_name)
        elif fmt == 'gz':
            extracted_count = extract_gz(file_path, extract_dir, allowed_extensions, conflict, progress_bar, position, file_name)

        if progress_bar and position is not None:
            release_progress_position()

        elapsed = time.time() - start_time

        with print_lock:
            logger.info(f"✓ 成功解压 {file_name}: {extracted_count} 个文件, 耗时 {elapsed:.2f}秒")

        if delete_original:
            try:
                os.remove(file_path)
                with print_lock:
                    logger.info(f"已删除原压缩包: {file_name}")
            except Exception as e:
                with print_lock:
                    logger.warning(f"删除原压缩包失败 {file_name}: {e}")

        return {'success': True, 'file': file_name, 'extracted': extracted_count,
                'time': elapsed, 'output_dir': extract_dir}

    except Exception as e:
        if progress_bar and 'position' in locals() and position is not None:
            release_progress_position()
        elapsed = time.time() - start_time
        with print_lock:
            logger.error(f"✗ 解压失败 {file_name}: {e}, 耗时 {elapsed:.2f}秒")
        return {'success': False, 'file': file_name, 'error': str(e), 'time': elapsed}


def extract_zip(file_path, extract_dir, password, allowed_extensions, conflict, progress_bar, position, file_name):
    count = 0
    with zipfile.ZipFile(file_path, 'r') as zf:
        if password:
            zf.setpassword(password.encode())

        members = []
        for member in zf.infolist():
            if member.is_dir():
                continue
            if allowed_extensions:
                if not any(member.filename.lower().endswith(ext.lower()) for ext in allowed_extensions):
                    continue
            members.append(member)

        total_size = sum(m.file_size for m in members)

        pbar = None
        if progress_bar and total_size > 0:
            desc = f"{file_name[:20]:<20}"
            pbar = tqdm(total=total_size, unit='B', unit_scale=True, unit_divisor=1024,
                        desc=desc, position=position, leave=False, dynamic_ncols=True)

        try:
            for member in members:
                dest_path = os.path.join(extract_dir, member.filename)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)

                if os.path.exists(dest_path):
                    if conflict == 'skip':
                        if pbar:
                            pbar.update(member.file_size)
                        continue
                    elif conflict == 'rename':
                        dest_path = get_unique_path(dest_path)

                with zf.open(member) as source, open(dest_path, 'wb') as target:
                    if pbar:
                        copyfileobj_with_progress(source, target, pbar)
                    else:
                        shutil.copyfileobj(source, target)
                count += 1
        finally:
            if pbar:
                pbar.close()

    return count


def extract_tar(file_path, extract_dir, fmt, allowed_extensions, conflict, progress_bar, position, file_name):
    count = 0
    mode = 'r:gz' if fmt in ('tar.gz', 'tgz') else 'r:'
    with tarfile.open(file_path, mode) as tf:
        members = []
        for member in tf.getmembers():
            if not member.isfile():
                continue
            if allowed_extensions:
                if not any(member.name.lower().endswith(ext.lower()) for ext in allowed_extensions):
                    continue
            members.append(member)

        total_size = sum(m.size for m in members)

        pbar = None
        if progress_bar and total_size > 0:
            desc = f"{file_name[:20]:<20}"
            pbar = tqdm(total=total_size, unit='B', unit_scale=True, unit_divisor=1024,
                        desc=desc, position=position, leave=False, dynamic_ncols=True)

        try:
            for member in members:
                dest_path = os.path.join(extract_dir, member.name)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)

                if os.path.exists(dest_path):
                    if conflict == 'skip':
                        if pbar:
                            pbar.update(member.size)
                        continue
                    elif conflict == 'rename':
                        dest_path = get_unique_path(dest_path)

                source = tf.extractfile(member)
                if source:
                    with open(dest_path, 'wb') as target:
                        if pbar:
                            copyfileobj_with_progress(source, target, pbar)
                        else:
                            shutil.copyfileobj(source, target)
                    count += 1
        finally:
            if pbar:
                pbar.close()

    return count


def extract_7z(file_path, extract_dir, password, allowed_extensions, conflict, progress_bar, position, file_name):
    count = 0
    archive_size = os.path.getsize(file_path)

    pbar = None
    if progress_bar and archive_size > 0:
        desc = f"{file_name[:20]:<20}"
        pbar = tqdm(total=archive_size, unit='B', unit_scale=True, unit_divisor=1024,
                    desc=desc, position=position, leave=False, dynamic_ncols=True)

    try:
        with py7zr.SevenZipFile(file_path, mode='r', password=password) as szf:
            if allowed_extensions:
                all_files = szf.list()
                filtered = [f for f in all_files if not f.is_directory and
                            any(f.filename.lower().endswith(ext.lower()) for ext in allowed_extensions)]
                targets = [f.filename for f in filtered]
                count = len(targets)
            else:
                all_files = szf.list()
                filtered = [f for f in all_files if not f.is_directory]
                targets = None
                count = len(filtered)

            if count > 0:
                if targets:
                    szf.extract(path=extract_dir, targets=targets)
                else:
                    szf.extractall(path=extract_dir)

            if pbar:
                pbar.update(archive_size)
    finally:
        if pbar:
            pbar.close()

    return count


def extract_gz(file_path, extract_dir, allowed_extensions, conflict, progress_bar, position, file_name):
    import gzip
    count = 0
    out_filename = Path(file_path).stem
    if allowed_extensions:
        if not any(out_filename.lower().endswith(ext.lower()) for ext in allowed_extensions):
            return 0

    dest_path = os.path.join(extract_dir, out_filename)
    if os.path.exists(dest_path):
        if conflict == 'skip':
            return 0
        elif conflict == 'rename':
            dest_path = get_unique_path(dest_path)

    file_size = os.path.getsize(file_path)

    pbar = None
    if progress_bar and file_size > 0:
        desc = f"{file_name[:20]:<20}"
        pbar = tqdm(total=file_size, unit='B', unit_scale=True, unit_divisor=1024,
                    desc=desc, position=position, leave=False, dynamic_ncols=True)

    try:
        with gzip.open(file_path, 'rb') as f_in:
            with open(dest_path, 'wb') as f_out:
                if pbar:
                    copyfileobj_with_progress(f_in, f_out, pbar)
                else:
                    shutil.copyfileobj(f_in, f_out)
        count = 1
    finally:
        if pbar:
            pbar.close()

    return count


def find_archives(directory, recursive=False):
    archives = []
    if recursive:
        for root, dirs, files in os.walk(directory):
            for f in files:
                fp = os.path.join(root, f)
                if is_archive(fp):
                    archives.append(fp)
    else:
        for f in os.listdir(directory):
            fp = os.path.join(directory, f)
            if os.path.isfile(fp) and is_archive(fp):
                archives.append(fp)
    return archives


def recursive_extract(archives, output_dir, passwords, delete_original, allowed_extensions,
                      preview, conflict, logger, progress_bar=True, max_depth=10):
    all_results = []
    current_archives = archives[:]
    depth = 0

    while current_archives and depth < max_depth:
        depth += 1
        logger.info(f"递归解压第 {depth} 层，找到 {len(current_archives)} 个压缩包")

        new_archives = []
        for archive in current_archives:
            result = extract_file(archive, output_dir, passwords, delete_original,
                                  allowed_extensions, preview, progress_bar, conflict, logger)
            all_results.append(result)

            if result.get('success') and 'output_dir' in result:
                sub_archives = find_archives(result['output_dir'], recursive=True)
                new_archives.extend(sub_archives)

        current_archives = new_archives

    return all_results


def main():
    parser = argparse.ArgumentParser(
        description='批量解压工具 - 支持多种压缩格式的命令行解压工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s ./archives                           # 基本解压
  %(prog)s ./archives -p password1 password2    # 使用密码列表
  %(prog)s ./archives -d                        # 解压后删除原文件
  %(prog)s ./archives --ext .jpg .png           # 只解压图片
  %(prog)s ./archives --preview                 # 预览模式
  %(prog)s ./archives --test                    # 测试完整性
  %(prog)s ./archives -r                        # 递归解压
  %(prog)s ./archives -t 4                      # 4线程解压
  %(prog)s ./archives --conflict rename         # 冲突时重命名
  %(prog)s ./archives --log unzip.log           # 写入日志
  %(prog)s ./archives --no-progress             # 不显示进度条
        """
    )

    parser.add_argument('directory', help='包含压缩包的目录路径')
    parser.add_argument('-o', '--output', help='输出目录，默认为输入目录')
    parser.add_argument('-p', '--passwords', nargs='+', help='密码列表，按顺序尝试')
    parser.add_argument('-d', '--delete', action='store_true', help='解压成功后删除原压缩包')
    parser.add_argument('--ext', nargs='+', help='只解压指定扩展名的文件，如 .jpg .png')
    parser.add_argument('--preview', action='store_true', help='预览模式，只显示内容不解压')
    parser.add_argument('--no-progress', action='store_true', help='不显示进度条')
    parser.add_argument('-r', '--recursive', action='store_true', help='递归解压嵌套的压缩包')
    parser.add_argument('--log', help='日志文件路径')
    parser.add_argument('--conflict', choices=['skip', 'rename', 'overwrite'],
                        default='skip', help='文件冲突处理方式 (默认: skip)')
    parser.add_argument('--test', action='store_true', help='测试压缩包完整性，不解压')
    parser.add_argument('-t', '--threads', type=int, default=1, help='线程数 (默认: 1)')
    parser.add_argument('-v', '--verbose', action='store_true', help='显示详细信息')

    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"错误: 目录不存在: {args.directory}", file=sys.stderr)
        sys.exit(1)

    logger = setup_logger(args.log)
    output_dir = args.output if args.output else args.directory
    os.makedirs(output_dir, exist_ok=True)

    archives = find_archives(args.directory, recursive=False)

    if not archives:
        logger.info(f"在 {args.directory} 中没有找到支持的压缩包")
        sys.exit(0)

    logger.info(f"找到 {len(archives)} 个压缩包")
    for arch in archives:
        logger.info(f"  - {os.path.basename(arch)}")

    if args.test:
        logger.info("开始测试压缩包完整性...")
        results = []
        for arch in archives:
            start = time.time()
            ok, error = test_archive_integrity(arch, args.passwords[0] if args.passwords else None)
            elapsed = time.time() - start
            status = "✓ 完好" if ok else f"✗ 损坏: {error}"
            logger.info(f"{os.path.basename(arch)}: {status} (耗时 {elapsed:.2f}秒)")
            results.append((arch, ok, error, elapsed))

        good = sum(1 for _, ok, _, _ in results if ok)
        logger.info(f"测试完成: {good}/{len(results)} 个压缩包完好")
        return

    start_time = time.time()
    show_progress = not args.no_progress

    if args.recursive:
        results = recursive_extract(archives, output_dir, args.passwords, args.delete,
                                    args.ext, args.preview, args.conflict, logger, show_progress)
    elif args.threads > 1:
        logger.info(f"使用 {args.threads} 个线程解压...")
        results = []
        with ThreadPoolExecutor(max_workers=args.threads) as executor:
            futures = [
                executor.submit(extract_file, arch, output_dir, args.passwords, args.delete,
                                args.ext, args.preview, show_progress,
                                args.conflict, logger)
                for arch in archives
            ]
            for future in as_completed(futures):
                results.append(future.result())
    else:
        results = []
        for arch in archives:
            result = extract_file(arch, output_dir, args.passwords, args.delete,
                                  args.ext, args.preview, show_progress,
                                  args.conflict, logger)
            results.append(result)

    total_time = time.time() - start_time
    success_count = sum(1 for r in results if r.get('success'))
    total_files = sum(r.get('extracted', 0) for r in results)

    logger.info("=" * 50)
    logger.info(f"处理完成! 成功: {success_count}/{len(results)}")
    logger.info(f"总解压文件数: {total_files}")
    logger.info(f"总耗时: {total_time:.2f} 秒")

    if len(results) > success_count:
        logger.info("失败的文件:")
        for r in results:
            if not r.get('success'):
                logger.info(f"  - {r.get('file')}: {r.get('error')}")


if __name__ == '__main__':
    main()
