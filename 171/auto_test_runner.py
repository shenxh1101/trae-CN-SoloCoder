#!/usr/bin/env python3
import sys
import os
import io
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

output_log = project_root / "test_execution_log.txt"

def log(msg):
    with open(output_log, 'a', encoding='utf-8') as f:
        f.write(msg + "\n")
    print(msg, flush=True)

def main():
    with open(output_log, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("  测试执行日志 - 开始时间: " + str(os.times()) + "\n")
        f.write("=" * 70 + "\n\n")
    
    log("=" * 70)
    log("  股票投资组合管理系统 - 测试执行器")
    log("=" * 70)
    log("")
    
    log("[阶段 1] 依赖检查")
    try:
        import requests
        log("  ✓ requests")
    except ImportError as e:
        log(f"  ✗ requests: {e}")
    
    try:
        import tabulate
        log("  ✓ tabulate")
    except ImportError as e:
        log(f"  ✗ tabulate: {e}")
    
    try:
        import rich
        log("  ✓ rich")
    except ImportError as e:
        log(f"  ✗ rich: {e}")
    
    try:
        import matplotlib
        log("  ✓ matplotlib")
    except ImportError as e:
        log(f"  ✗ matplotlib: {e}")
    
    log("")
    log("[阶段 2] 运行 test_e2e.py")
    log("")
    
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    captured_output = io.StringIO()
    
    sys.stdout = captured_output
    sys.stderr = captured_output
    
    test_exit_code = 0
    try:
        import test_e2e
        test_exit_code = test_e2e.main()
    except SystemExit as e:
        test_exit_code = e.code
    except Exception as e:
        test_exit_code = 1
        captured_output.write(f"\nEXCEPTION: {e}\n")
        import traceback
        captured_output.write(traceback.format_exc())
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
    
    test_output = captured_output.getvalue()
    log(test_output)
    
    log("")
    log(f"  测试退出码: {test_exit_code}")
    log("")
    
    log("[阶段 3] 功能验证测试")
    log("")
    
    import tempfile
    import shutil
    
    from stock_portfolio.database import init_db, get_db_path
    from stock_portfolio.portfolio import (
        create_portfolio, delete_portfolio, list_portfolios,
        get_portfolio_by_name, add_position, get_position,
        get_portfolio_summary
    )
    from stock_portfolio.transactions import sell_position, get_realized_pnl_summary
    from stock_portfolio.price_fetcher import normalize_stock_code, get_stock_price
    from stock_portfolio.exporter import export_portfolio_to_csv, export_portfolio_to_html
    from stock_portfolio.importer import import_from_csv, detect_csv_format
    
    temp_db_dir = tempfile.mkdtemp(prefix="stock_func_test_")
    temp_db_path = Path(temp_db_dir) / "portfolio.db"
    
    from stock_portfolio import database
    original_get_db_path = database.get_db_path
    
    def mock_db_path():
        return temp_db_path
    
    database.get_db_path = mock_db_path
    init_db()
    
    func_results = []
    
    log("  测试 1: 创建投资组合")
    try:
        pid = create_portfolio("功能测试组合", "自动功能测试")
        assert pid > 0
        func_results.append(("create_portfolio", "PASS"))
        log(f"    ✓ 创建成功 (ID: {pid})")
    except Exception as e:
        func_results.append(("create_portfolio", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 2: 列出投资组合")
    try:
        portfolios = list_portfolios()
        assert len(portfolios) >= 1
        func_results.append(("list_portfolios", "PASS"))
        log(f"    ✓ 找到 {len(portfolios)} 个投资组合")
    except Exception as e:
        func_results.append(("list_portfolios", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 3: 添加持仓 (600519)")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        add_position(pf["id"], "600519", 100, 1800.0, stock_name="贵州茅台", fee=5.0)
        pos = get_position(pf["id"], "SH600519")
        assert pos is not None
        assert pos["total_shares"] == 100
        func_results.append(("add_position", "PASS"))
        log(f"    ✓ 添加成功: 100股 @ 1800.0")
    except Exception as e:
        func_results.append(("add_position", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 4: 股票代码规范化")
    try:
        assert normalize_stock_code("600519") == "SH600519"
        assert normalize_stock_code("000001") == "SZ000001"
        assert normalize_stock_code("300750") == "SZ300750"
        assert normalize_stock_code("00700") == "HK00700"
        func_results.append(("normalize_code", "PASS"))
        log("    ✓ 规范化正确")
    except Exception as e:
        func_results.append(("normalize_code", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 5: 600519 实时股价查询")
    try:
        code = normalize_stock_code("600519")
        data = get_stock_price(code)
        if data and data.get("current", 0) > 0:
            func_results.append(("price_query_600519", "PASS"))
            log(f"    ✓ 查询成功: {data.get('name', 'N/A')}  当前价: {data.get('current', 0)}")
        else:
            func_results.append(("price_query_600519", "SKIP (网络不可用)"))
            log(f"    ⚠️  跳过 (网络不可用或非交易时段)")
    except Exception as e:
        func_results.append(("price_query_600519", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 6: 投资组合汇总")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        summary = get_portfolio_summary(pf["id"])
        assert "total_positions" in summary
        assert "total_value" in summary
        func_results.append(("portfolio_summary", "PASS"))
        log(f"    ✓ 汇总成功: {summary['total_positions']} 只持仓, 总市值 {summary['total_value']:.2f}")
    except Exception as e:
        func_results.append(("portfolio_summary", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 7: 卖出持仓")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        tx_id, pnl = sell_position(pf["id"], "600519", 50, 2000.0, fee=3.0)
        assert tx_id > 0
        pos = get_position(pf["id"], "SH600519")
        assert pos["total_shares"] == 50
        func_results.append(("sell_position", "PASS"))
        log(f"    ✓ 卖出成功: 50股, 实现盈亏 {pnl:.2f}")
    except Exception as e:
        func_results.append(("sell_position", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 8: 盈亏统计")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        summary = get_realized_pnl_summary(pf["id"])
        assert "total_realized_pnl" in summary
        func_results.append(("pnl_summary", "PASS"))
        log(f"    ✓ 统计成功: 已实现盈亏 {summary['total_realized_pnl']:.2f}")
    except Exception as e:
        func_results.append(("pnl_summary", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 9: 导出 CSV")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        export_dir = Path(temp_db_dir) / "exports"
        export_dir.mkdir(exist_ok=True)
        csv_path = export_portfolio_to_csv(pf["id"], str(export_dir))
        assert Path(csv_path).exists()
        func_results.append(("export_csv", "PASS"))
        log(f"    ✓ 导出成功: {Path(csv_path).name}")
    except Exception as e:
        func_results.append(("export_csv", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 10: 导出 HTML")
    try:
        pf = get_portfolio_by_name("功能测试组合")
        export_dir = Path(temp_db_dir) / "exports"
        html_path = export_portfolio_to_html(pf["id"], str(export_dir))
        assert Path(html_path).exists()
        func_results.append(("export_html", "PASS"))
        log(f"    ✓ 导出成功: {Path(html_path).name}")
    except Exception as e:
        func_results.append(("export_html", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 11: 雪球 CSV 格式检测")
    try:
        sample_file = project_root / "sample_xueqiu.csv"
        if sample_file.exists():
            fmt = detect_csv_format(str(sample_file))
            assert fmt == "xueqiu"
            func_results.append(("detect_csv_format", "PASS"))
            log(f"    ✓ 格式检测: {fmt}")
        else:
            func_results.append(("detect_csv_format", "SKIP"))
            log("    ⚠️  跳过 (sample_xueqiu.csv 不存在)")
    except Exception as e:
        func_results.append(("detect_csv_format", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    log("  测试 12: 从雪球 CSV 导入")
    try:
        sample_file = project_root / "sample_xueqiu.csv"
        if sample_file.exists():
            pf = get_portfolio_by_name("功能测试组合")
            imported, positions = import_from_csv(pf["id"], str(sample_file))
            assert imported > 0
            func_results.append(("import_csv", "PASS"))
            log(f"    ✓ 导入成功: {imported} 只股票")
        else:
            func_results.append(("import_csv", "SKIP"))
            log("    ⚠️  跳过 (sample_xueqiu.csv 不存在)")
    except Exception as e:
        func_results.append(("import_csv", f"FAIL: {e}"))
        log(f"    ✗ 失败: {e}")
    
    database.get_db_path = original_get_db_path
    shutil.rmtree(temp_db_dir, ignore_errors=True)
    
    log("")
    log("=" * 70)
    log("  功能测试结果汇总")
    log("=" * 70)
    log("")
    
    pass_count = 0
    skip_count = 0
    fail_count = 0
    
    for name, result in func_results:
        if result == "PASS":
            log(f"  ✓ {name}")
            pass_count += 1
        elif "SKIP" in result:
            log(f"  ⚠️  {name}: {result}")
            skip_count += 1
        else:
            log(f"  ✗ {name}: {result}")
            fail_count += 1
    
    log("")
    log(f"  通过: {pass_count}")
    log(f"  跳过: {skip_count}")
    log(f"  失败: {fail_count}")
    log(f"  总计: {len(func_results)}")
    log("")
    
    if fail_count == 0:
        log("  🎉 所有功能测试通过！")
    else:
        log(f"  ⚠️  有 {fail_count} 个测试失败")
    log("")
    
    log("=" * 70)
    log(f"  完整日志已保存到: {output_log}")
    log("=" * 70)
    log("")
    
    return test_exit_code if test_exit_code != 0 else fail_count

if __name__ == "__main__":
    sys.exit(main())
