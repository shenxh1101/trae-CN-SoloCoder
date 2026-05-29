#!/usr/bin/env python3
import ast
import sys
import os
from pathlib import Path

def check_syntax(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        ast.parse(source)
        return True, None
    except SyntaxError as e:
        return False, str(e)

def main():
    project_root = Path(__file__).parent
    package_dir = project_root / "stock_portfolio"
    
    py_files = list(package_dir.glob("*.py"))
    py_files.append(project_root / "portfolio_manager.py")
    py_files.append(project_root / "test_basic.py")
    
    print("=" * 70)
    print("  语法检查")
    print("=" * 70)
    
    all_ok = True
    for py_file in py_files:
        ok, error = check_syntax(py_file)
        status = "✓" if ok else "✗"
        print(f"  {status} {py_file.name}")
        if error:
            print(f"      错误: {error}")
            all_ok = False
    
    print()
    
    if all_ok:
        print("✓ 所有文件语法正确")
    else:
        print("✗ 存在语法错误")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  导入检查")
    print("=" * 70)
    
    sys.path.insert(0, str(project_root))
    
    try:
        from stock_portfolio import database
        print("  ✓ database")
        from stock_portfolio import price_fetcher
        print("  ✓ price_fetcher")
        from stock_portfolio import portfolio
        print("  ✓ portfolio")
        from stock_portfolio import transactions
        print("  ✓ transactions")
        from stock_portfolio import corporate_actions
        print("  ✓ corporate_actions")
        from stock_portfolio import alerts
        print("  ✓ alerts")
        from stock_portfolio import charts
        print("  ✓ charts")
        from stock_portfolio import exporter
        print("  ✓ exporter")
        from stock_portfolio import importer
        print("  ✓ importer")
        from stock_portfolio import snapshots
        print("  ✓ snapshots")
        from stock_portfolio import cli
        print("  ✓ cli")
        print("\n✓ 所有模块导入成功")
    except Exception as e:
        print(f"\n✗ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  函数签名检查")
    print("=" * 70)
    
    functions_to_check = [
        (database, "init_db", []),
        (database, "execute_query", ["query", "params", "fetch"]),
        (price_fetcher, "normalize_stock_code", ["stock_code"]),
        (price_fetcher, "fetch_stock_prices", ["stock_codes"]),
        (portfolio, "create_portfolio", ["name", "description"]),
        (portfolio, "add_position", ["portfolio_id", "stock_code", "shares", "price"]),
        (portfolio, "get_portfolio_summary", ["portfolio_id"]),
        (portfolio, "set_alert_prices", ["portfolio_id", "stock_code"]),
        (transactions, "sell_position", ["portfolio_id", "stock_code", "shares", "price"]),
        (transactions, "get_realized_pnl_summary", ["portfolio_id"]),
        (corporate_actions, "record_dividend", ["portfolio_id", "stock_code", "amount_per_share"]),
        (alerts, "check_alerts", ["portfolio_id"]),
        (alerts, "check_position_alerts", ["positions", "portfolio_id"]),
        (charts, "generate_ascii_pie_chart", ["positions"]),
        (charts, "generate_ascii_line_chart", ["data_points"]),
        (exporter, "export_portfolio_to_csv", ["portfolio_id", "output_path"]),
        (exporter, "export_portfolio_to_html", ["portfolio_id", "output_path"]),
        (importer, "import_from_csv", ["portfolio_id", "file_path"]),
        (importer, "detect_csv_format", ["file_path"]),
        (snapshots, "create_snapshot", ["portfolio_id"]),
        (snapshots, "get_asset_growth", ["portfolio_id", "days"]),
    ]
    
    all_funcs_ok = True
    for module, func_name, expected_args in functions_to_check:
        if hasattr(module, func_name):
            func = getattr(module, func_name)
            import inspect
            sig = inspect.signature(func)
            params = list(sig.parameters.keys())
            has_all = all(arg in params for arg in expected_args)
            status = "✓" if has_all else "✗"
            print(f"  {status} {func_name}({', '.join(params)})")
            if not has_all:
                all_funcs_ok = False
                print(f"      缺少参数: {set(expected_args) - set(params)}")
        else:
            print(f"  ✗ {func_name} - 未找到")
            all_funcs_ok = False
    
    print()
    
    if all_funcs_ok:
        print("✓ 所有函数签名正确")
    else:
        print("✗ 部分函数存在问题")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  ✓ 所有检查通过！")
    print("=" * 70)
    print("\n项目结构:")
    print(f"  {project_root}/")
    print(f"  ├── portfolio_manager.py          # 主入口")
    print(f"  ├── requirements.txt              # 依赖")
    print(f"  ├── sample_xueqiu.csv             # 持仓导入示例")
    print(f"  ├── sample_transactions.csv       # 交易导入示例")
    print(f"  └── stock_portfolio/")
    for f in sorted(package_dir.glob("*.py")):
        print(f"      ├── {f.name}")
    
    print("\n使用方法:")
    print("  python3 portfolio_manager.py --help")
    print("  python3 portfolio_manager.py <command> --help")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
