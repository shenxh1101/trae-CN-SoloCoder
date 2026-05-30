#!/usr/bin/env python3
"""imgmeta.py 功能验证测试脚本 - 自动创建测试数据并验证所有核心功能"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

TOOL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'imgmeta.py')
PYTHON = sys.executable

passed = 0
failed = 0
errors = []


def run(cmd, expect_fail=False):
    """运行命令并返回 (returncode, stdout, stderr)"""
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=60
    )
    return result.returncode, result.stdout, result.stderr


def check(name, condition, detail=""):
    global passed, failed, errors
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        msg = f"  ✗ {name}" + (f" — {detail}" if detail else "")
        print(msg)
        errors.append(msg)


def create_test_jpg(path, size=(256, 256), color='red'):
    """创建带EXIF的测试JPG图片"""
    try:
        from PIL import Image
        import piexif
    except ImportError:
        print("错误: 需要安装 Pillow 和 piexif")
        print("运行: pip install Pillow piexif numpy scipy")
        sys.exit(1)

    img = Image.new('RGB', size, color)
    exif_dict = {
        '0th': {
            piexif.ImageIFD.Artist: b'Test Author',
            piexif.ImageIFD.Copyright: b'Copyright 2026',
            piexif.ImageIFD.ImageDescription: b'Test Description',
            piexif.ImageIFD.DateTime: b'2026:05:30 14:30:00',
        },
        'Exif': {
            piexif.ExifIFD.DateTimeOriginal: b'2026:05:30 14:30:00',
            piexif.ExifIFD.DateTimeDigitized: b'2026:05:30 14:30:00',
        },
        'GPS': {
            piexif.GPSIFD.GPSLatitudeRef: b'N',
            piexif.GPSIFD.GPSLatitude: ((31, 1), (14, 1), (0, 1)),
            piexif.GPSIFD.GPSLongitudeRef: b'E',
            piexif.GPSIFD.GPSLongitude: ((121, 1), (28, 1), (0, 1)),
        },
    }
    exif_bytes = piexif.dump(exif_dict)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(path), exif=exif_bytes, quality=95)


def create_test_png(path, size=(256, 256), color='blue'):
    """创建测试PNG图片"""
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo
    img = Image.new('RGB', size, color)
    pnginfo = PngInfo()
    pnginfo.add_text('Author', 'Test Author PNG')
    pnginfo.add_text('Copyright', 'Copyright 2026 PNG')
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(path), pnginfo=pnginfo)


def test_help():
    """测试1: 帮助信息"""
    print("\n[测试1] --help 命令")
    code, out, err = run([PYTHON, TOOL, '--help'])
    check("主程序 --help 可执行", code == 0, f"returncode={code}, stderr={err[:200]}")
    check("包含子命令列表", 'edit' in out and 'watermark' in out and 'report' in out)

    code, out, err = run([PYTHON, TOOL, 'edit', '--help'])
    check("edit --help 可执行", code == 0, f"returncode={code}")
    check("edit 包含 --author 参数", '--author' in out)
    check("edit 包含 --no-recursive 参数", '--no-recursive' in out)


def test_find_images(test_dir):
    """测试2: 图片发现"""
    print("\n[测试2] 图片发现功能")
    create_test_jpg(test_dir / 'photo1.jpg')
    create_test_jpg(test_dir / 'sub1' / 'photo2.jpg')
    create_test_png(test_dir / 'sub2' / 'photo3.png')
    create_test_jpg(test_dir / 'sub1' / 'deep' / 'photo4.jpg')

    code, out, err = run([PYTHON, TOOL, 'report', str(test_dir)])
    check("递归发现图片", 'photo1' in out and 'photo2' in out and 'photo3' in out and 'photo4' in out,
          f"stdout={out[:300]}")

    code, out, err = run([PYTHON, TOOL, 'report', str(test_dir), '--no-recursive'])
    only_top = 'photo1' in out and 'photo2' not in out and 'photo3' not in out
    check("非递归只发现顶层图片", only_top, f"stdout={out[:300]}")


def test_edit(test_dir):
    """测试3: EXIF编辑"""
    print("\n[测试3] EXIF批量编辑")
    jpg = test_dir / 'edit_test.jpg'
    create_test_jpg(jpg, color='green')

    code, out, err = run([PYTHON, TOOL, 'edit', str(test_dir), '--author', '张三',
                          '--copyright', '© 2026 张三', '--no-recursive'])
    check("edit 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("edit 输出包含修改确认", '已修改' in out or '完成' in out, f"stdout={out[:300]}")

    code, out, err = run([PYTHON, TOOL, 'report', str(test_dir), '--no-recursive'])
    check("修改后包含新作者", '张三' in out, f"stdout={out[:500]}")


def test_backup(test_dir):
    """测试4: 备份功能"""
    print("\n[测试4] 备份功能（保留目录结构）")
    sub = test_dir / 'backup_test'
    backup_dest = test_dir / 'backup_output'
    create_test_jpg(sub / 'a.jpg')
    create_test_jpg(sub / 'nested' / 'b.jpg')
    create_test_png(sub / 'nested' / 'deep' / 'c.png')

    code, out, err = run([PYTHON, TOOL, 'backup', str(sub), '--backup-dir', str(backup_dest)])
    check("backup 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("backup 输出包含备份确认", '已备份' in out, f"stdout={out[:200]}")

    check_a = (backup_dest / 'a.jpg').exists()
    check_b = (backup_dest / 'nested' / 'b.jpg').exists()
    check_c = (backup_dest / 'nested' / 'deep' / 'c.png').exists()
    check("备份保留子目录结构", check_a and check_b and check_c,
          f"a={check_a}, b={check_b}, c={check_c}")


def test_report(test_dir):
    """测试5: 元数据报告"""
    print("\n[测试5] 元数据报告")
    sub = test_dir / 'report_test'
    create_test_jpg(sub / 'r1.jpg')
    create_test_png(sub / 'r2.png')

    csv_out = test_dir / 'report_output.csv'
    code, out, err = run([PYTHON, TOOL, 'report', str(sub), '--output', str(csv_out)])
    check("report 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("CSV报告文件已创建", csv_out.exists())
    if csv_out.exists():
        content = csv_out.read_text(encoding='utf-8-sig')
        check("CSV报告包含图片数据", 'r1' in content and 'r2' in content, f"content={content[:300]}")


def test_search(test_dir):
    """测试6: 元数据搜索"""
    print("\n[测试6] 元数据搜索")
    sub = test_dir / 'search_test'
    create_test_jpg(sub / 'found.jpg')
    create_test_jpg(sub / 'other.jpg', color='blue')

    code, out, err = run([PYTHON, TOOL, 'edit', str(sub), '--author', '张三', '--no-recursive'])
    code, out, err = run([PYTHON, TOOL, 'search', str(sub), '--field', 'artist', '--keyword', '张三'])
    check("search 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("搜索结果包含匹配图片", 'found' in out or '匹配' in out, f"stdout={out[:300]}")


def test_clear(test_dir):
    """测试7: 清除元数据"""
    print("\n[测试7] 清除元数据")
    sub = test_dir / 'clear_test'
    create_test_jpg(sub / 'gps_photo.jpg')

    code, out, err = run([PYTHON, TOOL, 'clear', str(sub), '--fields', 'gps'])
    check("clear 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("clear 输出包含确认", '已清除' in out or '完成' in out, f"stdout={out[:200]}")


def test_watermark(test_dir):
    """测试8: 数字水印"""
    print("\n[测试8] 数字水印嵌入与验证")
    sub = test_dir / 'wm_test'
    wm_text = "Copyright2026Test"

    create_test_jpg(sub / 'wm.jpg', size=(512, 512), color='white')
    create_test_jpg(sub / 'wm2.jpg', size=(512, 512), color='white')

    code, out, err = run([PYTHON, TOOL, 'watermark', str(sub), 'embed', '--text', wm_text, '--no-recursive'])
    check("watermark embed 命令执行成功", code == 0, f"stderr={err[:300]}")
    check("watermark embed 输出确认", '已嵌入' in out, f"stdout={out[:300]}")

    code, out, err = run([PYTHON, TOOL, 'watermark', str(sub), 'verify', '--text', wm_text, '--no-recursive'])
    check("watermark verify 命令执行成功", code == 0, f"stderr={err[:300]}")
    check("水印验证通过", '验证通过' in out or '相似度' in out, f"stdout={out[:300]}")

    code, out, err = run([PYTHON, TOOL, 'watermark', str(sub), 'verify', '--text', 'WrongText', '--no-recursive'])
    check("错误水印验证失败", '验证失败' in out, f"stdout={out[:300]}")


def test_copy_meta(test_dir):
    """测试9: 复制元数据"""
    print("\n[测试9] 复制元数据")
    sub = test_dir / 'copy_test'
    create_test_jpg(sub / 'source.jpg', color='red')
    create_test_jpg(sub / 'dest.jpg', color='blue')

    code, out, err = run([PYTHON, TOOL, 'copy-meta', str(sub)])
    check("copy-meta 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("copy-meta 输出确认", '已复制' in out or '复制元数据' in out, f"stdout={out[:300]}")


def test_timestamp(test_dir):
    """测试10: 文件时间戳"""
    print("\n[测试10] 文件时间戳修改")
    sub = test_dir / 'ts_test'
    create_test_jpg(sub / 'ts.jpg')

    code, out, err = run([PYTHON, TOOL, 'timestamp', str(sub), '--datetime', '2026-01-15 10:30:00', '--no-recursive'])
    check("timestamp 命令执行成功", code == 0, f"stderr={err[:200]}")

    stat = (sub / 'ts.jpg').stat()
    import time
    mtime = time.strftime('%Y-%m-%d', time.localtime(stat.st_mtime))
    check("文件修改时间已更改", '2026' in mtime, f"mtime={mtime}")


def test_rename(test_dir):
    """测试11: 按EXIF时间重命名"""
    print("\n[测试11] 按EXIF时间重命名")
    sub = test_dir / 'rename_test'
    create_test_jpg(sub / 'old_name.jpg')

    code, out, err = run([PYTHON, TOOL, 'rename', str(sub), '--dry-run'])
    check("rename --dry-run 执行成功", code == 0, f"stderr={err[:200]}")
    check("rename 预览输出包含重命名信息", '重命名' in out, f"stdout={out[:300]}")

    renamed_file = sub / '20260530_143000.jpg'
    code, out, err = run([PYTHON, TOOL, 'rename', str(sub)])
    check("rename 实际执行成功", code == 0, f"stderr={err[:200]}")
    check("重命名后的文件存在", renamed_file.exists(), f"目录内容: {list(sub.iterdir())}")


def test_import_csv(test_dir):
    """测试12: CSV导入"""
    print("\n[测试12] CSV导入元数据")
    sub = test_dir / 'csv_test'
    create_test_jpg(sub / 'csv1.jpg')
    create_test_jpg(sub / 'csv2.jpg')

    csv_file = test_dir / 'import_meta.csv'
    with open(str(csv_file), 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['path', 'author', 'copyright'])
        writer.writerow(['csv1.jpg', 'CSV作者1', '© CSV'])
        writer.writerow(['csv2.jpg', 'CSV作者2', '© CSV2'])

    code, out, err = run([PYTHON, TOOL, 'import-csv', str(csv_file), '--folder', str(sub)])
    check("import-csv 命令执行成功", code == 0, f"stderr={err[:200]}")
    check("import-csv 输出确认", '已导入' in out or '导入' in out, f"stdout={out[:300]}")


def main():
    print("=" * 60)
    print("  imgmeta.py 功能验证测试")
    print("=" * 60)

    print("\n[前置] 检查依赖...")
    try:
        import PIL
        print(f"  ✓ Pillow {PIL.__version__}")
    except ImportError:
        print("  ✗ Pillow 未安装 — 运行: pip install Pillow")
        sys.exit(1)

    try:
        import piexif
        print(f"  ✓ piexif")
    except ImportError:
        print("  ✗ piexif 未安装 — 运行: pip install piexif")
        sys.exit(1)

    try:
        import numpy
        print(f"  ✓ numpy {numpy.__version__}")
    except ImportError:
        print("  ✗ numpy 未安装 — 运行: pip install numpy")
        sys.exit(1)

    try:
        import scipy
        print(f"  ✓ scipy {scipy.__version__}")
    except ImportError:
        print("  ✗ scipy 未安装 — 运行: pip install scipy")
        sys.exit(1)

    tmpdir = Path(tempfile.mkdtemp(prefix='imgmeta_test_'))
    print(f"\n测试目录: {tmpdir}")

    try:
        test_help()
        test_find_images(tmpdir)
        test_edit(tmpdir)
        test_backup(tmpdir)
        test_report(tmpdir)
        test_search(tmpdir)
        test_clear(tmpdir)
        test_watermark(tmpdir)
        test_copy_meta(tmpdir)
        test_timestamp(tmpdir)
        test_rename(tmpdir)
        test_import_csv(tmpdir)
    finally:
        print(f"\n清理测试目录: {tmpdir}")
        shutil.rmtree(tmpdir, ignore_errors=True)

    print("\n" + "=" * 60)
    print(f"  测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)

    if errors:
        print("\n失败详情:")
        for e in errors:
            print(e)

    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    import csv
    main()
