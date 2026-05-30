#!/usr/bin/env python3
"""自动检查并安装依赖"""
import sys
import subprocess
import importlib

required_packages = [
    ("click", "click"),
    ("jinja2", "jinja2"),
    ("python-dateutil", "dateutil"),
]

optional_packages = [
    ("markdown", "markdown"),
    ("weasyprint", "weasyprint"),
]

def check_installed(import_name):
    try:
        importlib.import_module(import_name)
        return True
    except ImportError:
        return False

def install_package(package_name):
    print(f"正在安装 {package_name}...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", package_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  安装失败: {e}")
        return False

def main():
    print("=" * 60)
    print("检查并安装旅行日记工具依赖")
    print("=" * 60)
    print()

    all_ok = True
    
    print("【必需依赖】")
    for package, import_name in required_packages:
        if check_installed(import_name):
            print(f"  ✓ {package} - 已安装")
        else:
            print(f"  ✗ {package} - 未安装")
            if install_package(package):
                if check_installed(import_name):
                    print(f"    ✓ {package} - 安装成功")
                else:
                    print(f"    ✗ {package} - 安装后仍无法导入")
                    all_ok = False
            else:
                all_ok = False
    
    print()
    print("【可选依赖（PDF导出需要）】")
    for package, import_name in optional_packages:
        if check_installed(import_name):
            print(f"  ✓ {package} - 已安装")
        else:
            print(f"  - {package} - 未安装 (可选)")
    
    print()
    print("=" * 60)
    if all_ok:
        print("✅ 所有必需依赖已安装完成!")
        return 0
    else:
        print("❌ 部分必需依赖安装失败，请手动运行:")
        print("   pip install click jinja2 python-dateutil")
        return 1

if __name__ == "__main__":
    sys.exit(main())
