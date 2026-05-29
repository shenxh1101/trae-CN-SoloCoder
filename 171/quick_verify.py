#!/usr/bin/env python3
"""
快速验证脚本 - 检查核心功能是否正常
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

errors = []

print("=" * 70)
print("  快速验证 - 股票投资组合管理系统")
print("=" * 70)
print()

try:
    import ast
    import os
    package_dir = os.path.join(os.path.dirname(__file__), "stock_portfolio")
    for fname in os.listdir(package_dir):
        if fname.endswith(".py"):
            fpath = os.path.join(package_dir, fname)
            with open(fpath, encoding='utf-8') as f:
                ast.parse(f.read())
    print("✓ 所有 Python 文件语法正确")
except Exception as e:
    errors.append(f"语法错误: {e}")
    print(f"✗ 语法错误: {e}")

print()

try:
    from stock_portfolio import database
    from stock_portfolio import price_fetcher
    from stock_portfolio import portfolio
    from stock_portfolio import transactions
    from stock_portfolio import corporate_actions
    from stock_portfolio import alerts
    from stock_portfolio import charts
    from stock_portfolio import exporter
    from stock_portfolio import importer
    from stock_portfolio import snapshots
    from stock_portfolio import cli
    print("✓ 所有模块导入成功")
except Exception as e:
    errors.append(f"导入错误: {e}")
    print(f"✗ 导入错误: {e}")

print()

try:
    from stock_portfolio.price_fetcher import normalize_stock_code
    tests = [
        ("600519", "SH600519"),
        ("000001", "SZ000001"),
        ("300750", "SZ300750"),
        ("00700", "HK00700"),
        ("SH600519", "SH600519"),
    ]
    all_ok = True
    for inp, expected in tests:
        actual = normalize_stock_code(inp)
        if actual != expected:
            errors.append(f"normalize_stock_code({inp}) = {actual}, 期望 {expected}")
            all_ok = False
    if all_ok:
        print("✓ 股票代码规范化正确")
except Exception as e:
    errors.append(f"规范化错误: {e}")
    print(f"✗ 代码规范化错误: {e}")

print()

try:
    from stock_portfolio.price_fetcher import get_sina_symbol
    tests = [
        ("SH600519", "sh600519"),
        ("SZ000001", "sz000001"),
        ("HK00700", "hk00700"),
    ]
    all_ok = True
    for inp, expected in tests:
        actual = get_sina_symbol(inp)
        if actual != expected:
            errors.append(f"get_sina_symbol({inp}) = {actual}, 期望 {expected}")
            all_ok = False
    if all_ok:
        print("✓ 新浪财经接口符号转换正确")
except Exception as e:
    errors.append(f"符号转换错误: {e}")
    print(f"✗ 符号转换错误: {e}")

print()

print("=" * 70)
if errors:
    print(f"✗ 发现 {len(errors)} 个错误:")
    for e in errors:
        print(f"  - {e}")
    print()
    print("请修复后再运行完整测试")
    sys.exit(1)
else:
    print("✓ 所有快速验证通过！")
    print()
    print("现在可以运行完整测试:")
    print("  python3 run_full_test.py")
    print("  python3 test_e2e.py")
    print()
    print("或直接使用系统:")
    print("  python3 portfolio_manager.py --help")
    print()
    sys.exit(0)
