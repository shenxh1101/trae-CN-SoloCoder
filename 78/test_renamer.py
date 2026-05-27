#!/usr/bin/env python3
"""PDF 工具测试脚本 - 验证所有功能模块"""

import os
import sys
import tempfile
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)


def test_help():
    """测试帮助信息"""
    print("\n[1] 测试帮助信息...")
    import subprocess
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "--help"],
        capture_output=True, text=True
    )
    assert result.returncode == 0, f"帮助命令返回非零: {result.returncode}"
    assert "usage" in result.stdout.lower() or "用法" in result.stdout
    print("    ✅ 帮助信息正常")


def test_subcommands_exist():
    """测试所有子命令存在"""
    print("\n[2] 测试子命令...")
    import subprocess
    subcommands = [
        "info", "text", "images", "tables", "bookmarks",
        "encrypt-check", "decrypt", "merge", "split",
        "compress", "rotate", "annotations", "batch"
    ]
    for cmd in subcommands:
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), cmd, "--help"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, f"子命令 {cmd} 不存在或出错"
    print(f"    ✅ 所有 {len(subcommands)} 个子命令正常")


def test_syntax():
    """测试 Python 语法"""
    print("\n[3] 测试语法正确性...")
    import py_compile
    try:
        py_compile.compile(os.path.join(SCRIPT_DIR, "pdf_tool.py"), doraise=True)
        print("    ✅ 语法正确")
    except py_compile.PyCompileError as e:
        print(f"    ❌ 语法错误: {e}")
        return False
    return True


def test_no_pdf_error():
    """测试文件不存在时的错误处理"""
    print("\n[4] 测试错误处理...")
    import subprocess
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "info", "/nonexistent/file.pdf"],
        capture_output=True, text=True
    )
    assert result.returncode != 0, "文件不存在时应返回非零"
    assert "错误" in result.stderr or "错误" in result.stdout
    print("    ✅ 错误处理正常")


def test_imports():
    """测试模块导入"""
    print("\n[5] 测试模块导入...")
    try:
        import pypdf
        print(f"    ✅ pypdf {pypdf.__version__}")
    except ImportError:
        print("    ⚠️  pypdf 未安装 (功能受限)")

    try:
        import pdfplumber
        print(f"    ✅ pdfplumber {pdfplumber.__version__}")
    except ImportError:
        print("    ⚠️  pdfplumber 未安装 (文本/表格提取不可用)")

    try:
        import fitz
        print(f"    ✅ PyMuPDF {fitz.version}")
    except ImportError:
        print("    ⚠️  PyMuPDF 未安装 (图片/注释提取不可用)")

    try:
        from PIL import Image
        print("    ✅ Pillow 已安装")
    except ImportError:
        print("    ⚠️  Pillow 未安装 (图片压缩不可用)")


def test_create_and_process_sample():
    """测试创建一个简单 PDF 并处理"""
    print("\n[6] 测试创建和处理示例 PDF...")

    try:
        from pypdf import PdfWriter, PdfReader
    except ImportError:
        print("    ⚠️  pypdf 未安装，跳过")
        return

    tmpdir = tempfile.mkdtemp(prefix="pdf_test_")
    try:
        sample_pdf = os.path.join(tmpdir, "sample.pdf")
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        writer.add_blank_page(width=612, height=792)

        writer.add_metadata({
            "/Title": "Test Document",
            "/Author": "Test Author",
            "/Creator": "pdf_tool_test",
            "/Producer": "pypdf",
            "/Subject": "Testing",
            "/Keywords": "test,pdf",
        })

        with open(sample_pdf, "wb") as f:
            writer.write(f)

        print("    已创建测试 PDF: 2 页，含元数据")

        # Test info command
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "info", sample_pdf],
            capture_output=True, text=True
        )
        assert "Test Document" in result.stdout
        assert "Test Author" in result.stdout
        assert "2 页" in result.stdout or "2" in result.stdout
        print("    ✅ info 命令正常")

        # Test encrypt-check
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "encrypt-check", sample_pdf],
            capture_output=True, text=True
        )
        assert "未加密" in result.stdout
        print("    ✅ encrypt-check 命令正常")

        # Test merge
        merged_pdf = os.path.join(tmpdir, "merged.pdf")
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "merge",
             "--output", merged_pdf, sample_pdf, sample_pdf],
            capture_output=True, text=True
        )
        assert "合并完成" in result.stdout
        assert os.path.exists(merged_pdf)
        reader = PdfReader(merged_pdf)
        assert len(reader.pages) == 4
        print("    ✅ merge 命令正常 (4 页)")

        # Test split
        split_dir = os.path.join(tmpdir, "split")
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "split",
             sample_pdf, "--ranges", "1-1,2-2", "--output-dir", split_dir],
            capture_output=True, text=True
        )
        assert "拆分" in result.stdout
        split_files = os.listdir(split_dir)
        assert len(split_files) == 2
        print("    ✅ split 命令正常")

        # Test rotate
        rotated_pdf = os.path.join(tmpdir, "rotated.pdf")
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "rotate",
             sample_pdf, "--angle", "90", "--pages", "1", "--output", rotated_pdf],
            capture_output=True, text=True
        )
        assert "旋转完成" in result.stdout
        print("    ✅ rotate 命令正常")

        # Test batch
        report_file = os.path.join(tmpdir, "report.json")
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "pdf_tool.py"), "batch",
             tmpdir, "--report", report_file],
            capture_output=True, text=True
        )
        assert "report" in result.stdout or os.path.exists(report_file)
        print("    ✅ batch 命令正常")

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    print("=" * 60)
    print("PDF 工具测试套件")
    print("=" * 60)

    tests = [
        ("帮助信息", test_help),
        ("子命令完整性", test_subcommands_exist),
        ("语法正确性", test_syntax),
        ("错误处理", test_no_pdf_error),
        ("依赖检查", test_imports),
        ("完整流程测试", test_create_and_process_sample),
    ]

    passed = 0
    failed = 0
    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"    ❌ 失败: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)


if __name__ == "__main__":
    main()