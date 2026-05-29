#!/usr/bin/env python3
import sys
import os
import ast
import tempfile
import shutil
import io
from pathlib import Path
from datetime import date

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

TEST_DB_DIR = None
ORIGINAL_GET_DB_PATH = None

def setup_test_db():
    global TEST_DB_DIR, ORIGINAL_GET_DB_PATH
    from stock_portfolio import database
    
    if ORIGINAL_GET_DB_PATH is None:
        ORIGINAL_GET_DB_PATH = database.get_db_path
    
    TEST_DB_DIR = tempfile.mkdtemp(prefix="stock_test_")
    test_db_path = Path(TEST_DB_DIR) / "portfolio.db"
    
    def mock_get_db_path():
        return test_db_path
    
    database.get_db_path = mock_get_db_path
    database.init_db()
    return test_db_path

def cleanup_test_db():
    global TEST_DB_DIR, ORIGINAL_GET_DB_PATH
    from stock_portfolio import database
    if ORIGINAL_GET_DB_PATH is not None:
        database.get_db_path = ORIGINAL_GET_DB_PATH
        ORIGINAL_GET_DB_PATH = None
    if TEST_DB_DIR and os.path.exists(TEST_DB_DIR):
        shutil.rmtree(TEST_DB_DIR, ignore_errors=True)
        TEST_DB_DIR = None

test_results = []

def test(name, func):
    try:
        func()
        test_results.append(("PASS", name))
        print(f"  \033[92m✓\033[0m {name}")
    except Exception as e:
        test_results.append(("FAIL", name, str(e)))
        print(f"  \033[91m✗\033[0m {name}: {e}")

def test_syntax_check():
    package_dir = project_root / "stock_portfolio"
    for py_file in package_dir.glob("*.py"):
        with open(py_file, 'r', encoding='utf-8') as f:
            source = f.read()
        ast.parse(source)
    main_file = project_root / "portfolio_manager.py"
    with open(main_file, 'r', encoding='utf-8') as f:
        source = f.read()
    ast.parse(source)

def test_imports():
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

def test_db_init():
    from stock_portfolio.database import init_db, get_db_path
    init_db()
    db_path = get_db_path()
    assert db_path.exists(), f"Database not created at {db_path}"

def test_normalize_stock_code():
    from stock_portfolio.price_fetcher import normalize_stock_code
    assert normalize_stock_code("600519") == "SH600519"
    assert normalize_stock_code("000001") == "SZ000001"
    assert normalize_stock_code("300750") == "SZ300750"
    assert normalize_stock_code("00700") == "HK00700"
    assert normalize_stock_code("SH600519") == "SH600519"
    assert normalize_stock_code("sz000001") == "SZ000001"
    assert normalize_stock_code("688001") == "SH688001"

def test_create_portfolio():
    from stock_portfolio.portfolio import create_portfolio, get_portfolio_by_name, get_portfolio_by_id
    pid = create_portfolio("测试A股", "测试用A股账户")
    assert pid > 0, f"Invalid portfolio ID: {pid}"
    
    pf = get_portfolio_by_name("测试A股")
    assert pf is not None, "Portfolio not found by name"
    assert pf["name"] == "测试A股"
    assert pf["description"] == "测试用A股账户"
    
    pf2 = get_portfolio_by_id(pid)
    assert pf2 is not None, "Portfolio not found by ID"
    assert pf2["name"] == "测试A股"

def test_list_portfolios():
    from stock_portfolio.portfolio import create_portfolio, list_portfolios
    create_portfolio("测试港股", "港股账户")
    portfolios = list_portfolios()
    assert len(portfolios) >= 2, f"Expected >= 2 portfolios, got {len(portfolios)}"
    names = [p["name"] for p in portfolios]
    assert "测试A股" in names
    assert "测试港股" in names

def test_add_position():
    from stock_portfolio.portfolio import add_position, get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    add_position(pid, "600519", 100, 1800.0, stock_name="贵州茅台", fee=5.0)
    
    pos = get_position(pid, "SH600519")
    assert pos is not None, "Position not found"
    assert pos["total_shares"] == 100, f"Expected 100 shares, got {pos['total_shares']}"
    assert pos["total_cost"] == 180005.0, f"Expected 180005.0 cost, got {pos['total_cost']}"
    
    add_position(pid, "000001", 1000, 11.5, stock_name="平安银行")
    pos2 = get_position(pid, "SZ000001")
    assert pos2 is not None
    assert pos2["total_shares"] == 1000

def test_add_position_accumulate():
    from stock_portfolio.portfolio import add_position, get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    add_position(pid, "600519", 50, 1850.0, fee=3.0)
    
    pos = get_position(pid, "SH600519")
    assert pos["total_shares"] == 150, f"Expected 150 shares, got {pos['total_shares']}"
    expected_cost = 180005.0 + 50 * 1850.0 + 3.0
    assert abs(pos["total_cost"] - expected_cost) < 0.01, f"Cost mismatch: {pos['total_cost']} vs {expected_cost}"

def test_sell_position():
    from stock_portfolio.transactions import sell_position
    from stock_portfolio.portfolio import get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    tx_id, pnl = sell_position(pid, "600519", 50, 2000.0, fee=5.0, notes="止盈部分")
    
    assert tx_id > 0, f"Invalid transaction ID: {tx_id}"
    assert pnl > 0, f"Expected profit, got {pnl}"
    
    pos = get_position(pid, "SH600519")
    assert pos["total_shares"] == 100, f"Expected 100 remaining shares, got {pos['total_shares']}"

def test_list_transactions():
    from stock_portfolio.transactions import list_transactions
    from stock_portfolio.portfolio import get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    
    txs = list_transactions(pf["id"])
    assert len(txs) >= 3, f"Expected >= 3 transactions, got {len(txs)}"
    
    sell_txs = list_transactions(pf["id"], transaction_type="SELL")
    assert len(sell_txs) >= 1, "No SELL transactions found"
    
    buy_txs = list_transactions(pf["id"], transaction_type="BUY")
    assert len(buy_txs) >= 2, "Not enough BUY transactions found"

def test_realized_pnl():
    from stock_portfolio.transactions import get_realized_pnl_summary
    from stock_portfolio.portfolio import get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    
    summary = get_realized_pnl_summary(pf["id"])
    assert "total_realized_pnl" in summary
    assert "win_count" in summary
    assert summary["win_count"] >= 1, f"Expected >= 1 win, got {summary['win_count']}"

def test_set_alert():
    from stock_portfolio.portfolio import set_alert_prices, get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    set_alert_prices(pid, "600519", take_profit=2500.0, stop_loss=1500.0)
    
    pos = get_position(pid, "SH600519")
    assert pos["take_profit_price"] == 2500.0, f"Take profit price mismatch: {pos['take_profit_price']}"
    assert pos["stop_loss_price"] == 1500.0, f"Stop loss price mismatch: {pos['stop_loss_price']}"

def test_dividend():
    from stock_portfolio.corporate_actions import record_dividend, list_corporate_actions
    from stock_portfolio.portfolio import get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    pos_before = get_position(pid, "SH600519")
    cost_before = pos_before["total_cost"]
    shares = pos_before["total_shares"]
    
    record_dividend(pid, "600519", amount_per_share=21.675, action_date="2024-06-30")
    
    pos_after = get_position(pid, "SH600519")
    expected_dividend = shares * 21.675
    assert abs(pos_after["total_cost"] - (cost_before - expected_dividend)) < 0.01, \
        f"Cost after dividend mismatch: {pos_after['total_cost']}"
    
    actions = list_corporate_actions(pid, "SH600519")
    assert len(actions) >= 1, "No corporate actions found"

def test_stock_split():
    from stock_portfolio.corporate_actions import record_stock_split
    from stock_portfolio.portfolio import add_position, get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    add_position(pid, "300750", 50, 200.0, stock_name="宁德时代")
    
    pos_before = get_position(pid, "SZ300750")
    shares_before = pos_before["total_shares"]
    
    record_stock_split(pid, "300750", split_ratio=2.0, action_date="2024-07-01")
    
    pos_after = get_position(pid, "SZ300750")
    assert pos_after["total_shares"] == shares_before * 2, \
        f"Shares after split mismatch: {pos_after['total_shares']} vs {shares_before * 2}"

def test_stock_dividend():
    from stock_portfolio.corporate_actions import record_stock_dividend
    from stock_portfolio.portfolio import add_position, get_position, get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    add_position(pid, "601318", 200, 45.0, stock_name="中国平安")
    
    pos_before = get_position(pid, "SH601318")
    shares_before = pos_before["total_shares"]
    
    record_stock_dividend(pid, "601318", shares_per_holding=0.5, action_date="2024-07-15")
    
    pos_after = get_position(pid, "SH601318")
    expected_shares = shares_before * 1.5
    assert abs(pos_after["total_shares"] - expected_shares) < 0.01, \
        f"Shares after stock dividend mismatch: {pos_after['total_shares']} vs {expected_shares}"

def test_check_alerts():
    from stock_portfolio.alerts import check_alerts, check_position_alerts
    from stock_portfolio.portfolio import get_portfolio_by_name
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    results = check_alerts(pid)
    assert isinstance(results, list), "check_alerts should return a list"

def test_ascii_pie_chart():
    from stock_portfolio.charts import generate_ascii_pie_chart
    positions = [
        {"stock_code": "SH600519", "stock_name": "贵州茅台", "market_value": 180000},
        {"stock_code": "SZ000001", "stock_name": "平安银行", "market_value": 12000},
        {"stock_code": "SZ300750", "stock_name": "宁德时代", "market_value": 20000},
    ]
    chart = generate_ascii_pie_chart(positions, width=40, height=15)
    assert len(chart) > 0, "Chart should not be empty"
    assert "SH600519" in chart, "Stock code should appear in chart"

def test_ascii_line_chart():
    from stock_portfolio.charts import generate_ascii_line_chart
    data = [("01-01", 100000), ("01-15", 105000), ("02-01", 102000), ("02-15", 108000), ("03-01", 110000)]
    chart = generate_ascii_line_chart(data, width=60, height=12)
    assert len(chart) > 0, "Chart should not be empty"
    assert "100,000" in chart or "100000" in chart, "Values should appear in chart"

def test_ascii_line_chart_zero():
    from stock_portfolio.charts import generate_ascii_line_chart
    data = [("01-01", 0), ("01-15", 0), ("02-01", 0)]
    chart = generate_ascii_line_chart(data, width=60, height=12)
    assert len(chart) > 0, "Chart with zero values should not crash"

def test_export_csv():
    from stock_portfolio.exporter import export_portfolio_to_csv
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    output_dir = Path(TEST_DB_DIR)
    
    output_path = export_portfolio_to_csv(pf["id"], str(output_dir))
    assert Path(output_path).exists(), f"CSV file not created at {output_path}"
    
    with open(output_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    assert "投资组合" in content, "CSV should contain portfolio header"
    assert "SH600519" in content or "600519" in content, "CSV should contain stock code"

def test_export_html():
    from stock_portfolio.exporter import export_portfolio_to_html
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    output_dir = Path(TEST_DB_DIR)
    
    output_path = export_portfolio_to_html(pf["id"], str(output_dir))
    assert Path(output_path).exists(), f"HTML file not created at {output_path}"
    
    with open(output_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert "<!DOCTYPE html>" in content, "HTML should have DOCTYPE"
    assert "投资组合报告" in content, "HTML should contain report title"

def test_export_transactions_csv():
    from stock_portfolio.exporter import export_transactions_to_csv
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    output_dir = Path(TEST_DB_DIR)
    
    output_path = export_transactions_to_csv(pf["id"], str(output_dir))
    assert Path(output_path).exists(), f"Transactions CSV not created at {output_path}"

def test_import_xueqiu_csv():
    from stock_portfolio.importer import import_from_csv, detect_csv_format
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    sample_file = project_root / "sample_xueqiu.csv"
    if not sample_file.exists():
        print("    (跳过 - 示例文件不存在)")
        return
    
    fmt = detect_csv_format(str(sample_file))
    assert fmt == "xueqiu", f"Expected xueqiu format, got {fmt}"
    
    pf = get_portfolio_by_name("测试港股")
    assert pf is not None, "测试港股 portfolio should exist"
    
    imported, positions = import_from_csv(pf["id"], str(sample_file))
    assert imported > 0, f"Expected > 0 imported positions, got {imported}"

def test_import_transactions_csv():
    from stock_portfolio.importer import import_transactions_from_csv
    from stock_portfolio.portfolio import get_portfolio_by_name, create_portfolio
    
    sample_file = project_root / "sample_transactions.csv"
    if not sample_file.exists():
        print("    (跳过 - 示例文件不存在)")
        return
    
    pf = get_portfolio_by_name("交易导入测试")
    if pf is None:
        create_portfolio("交易导入测试", "交易导入测试用")
        pf = get_portfolio_by_name("交易导入测试")
    
    buy_count, sell_count = import_transactions_from_csv(pf["id"], str(sample_file))
    assert buy_count >= 1, f"Expected >= 1 buy, got {buy_count}"

def test_snapshot():
    from stock_portfolio.snapshots import create_snapshot, get_snapshots, get_latest_snapshot
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    sid = create_snapshot(pid, snapshot_date="2024-12-01", cash_balance=50000.0)
    assert sid > 0, f"Invalid snapshot ID: {sid}"
    
    latest = get_latest_snapshot(pid)
    assert latest is not None, "Latest snapshot not found"
    assert latest["cash_balance"] == 50000.0, f"Cash balance mismatch: {latest['cash_balance']}"
    
    snapshots = get_snapshots(pid)
    assert len(snapshots) >= 1, "No snapshots found"

def test_snapshot_upsert():
    from stock_portfolio.snapshots import create_snapshot, get_snapshots
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    create_snapshot(pid, snapshot_date="2024-12-02", cash_balance=10000.0)
    create_snapshot(pid, snapshot_date="2024-12-02", cash_balance=20000.0)
    
    snapshots = get_snapshots(pid)
    dec2_snapshots = [s for s in snapshots if s["snapshot_date"] == "2024-12-02"]
    assert len(dec2_snapshots) == 1, f"Expected 1 snapshot for 2024-12-02, got {len(dec2_snapshots)}"
    assert dec2_snapshots[0]["cash_balance"] == 20000.0, "Snapshot should be updated"

def test_asset_growth():
    from stock_portfolio.snapshots import create_snapshot, get_asset_growth
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    pid = pf["id"]
    
    for days_ago in range(5, 0, -1):
        d = date.fromordinal(date.today().toordinal() - days_ago)
        create_snapshot(pid, snapshot_date=d.strftime("%Y-%m-%d"), cash_balance=10000.0 * (1 + days_ago * 0.01))
    
    growth = get_asset_growth(pid, days=10)
    if growth:
        assert "start_value" in growth
        assert "end_value" in growth
        assert "max_drawdown" in growth

def test_export_snapshots_csv():
    from stock_portfolio.snapshots import export_snapshots_to_csv
    from stock_portfolio.portfolio import get_portfolio_by_name
    
    pf = get_portfolio_by_name("测试A股")
    output_dir = Path(TEST_DB_DIR)
    
    output_path = export_snapshots_to_csv(pf["id"], str(output_dir))
    assert Path(output_path).exists(), f"Snapshots CSV not created at {output_path}"

def test_multiple_portfolios():
    from stock_portfolio.portfolio import (
        create_portfolio, list_portfolios, add_position, 
        get_portfolio_summary, get_portfolio_by_name
    )
    
    create_portfolio("美股", "美股测试账户")
    
    pf_us = get_portfolio_by_name("美股")
    assert pf_us is not None
    
    add_position(pf_us["id"], "AAPL", 10, 150.0, stock_name="苹果")
    
    pf_a = get_portfolio_by_name("测试A股")
    summary_a = get_portfolio_summary(pf_a["id"])
    summary_us = get_portfolio_summary(pf_us["id"])
    
    portfolios = list_portfolios()
    assert len(portfolios) >= 3, f"Expected >= 3 portfolios, got {len(portfolios)}"

def test_price_fetch():
    from stock_portfolio.price_fetcher import get_stock_price, normalize_stock_code
    
    code = normalize_stock_code("600519")
    try:
        data = get_stock_price(code)
        if data and data.get("current", 0) > 0:
            assert "current" in data, "Price data should have 'current' field"
            assert data["current"] > 0, f"Price should be > 0, got {data['current']}"
            print(f"    (600519 当前价: {data['current']}, 名称: {data.get('name', 'N/A')})")
        else:
            print("    (网络不可用或非交易时段，跳过实时价格验证)")
    except Exception as e:
        print(f"    (网络请求失败: {e}，跳过)")

def test_delete_portfolio():
    from stock_portfolio.portfolio import delete_portfolio, get_portfolio_by_name
    from stock_portfolio.portfolio import create_portfolio
    
    pid = create_portfolio("待删除", "将被删除的组合")
    delete_portfolio(pid)
    
    pf = get_portfolio_by_name("待删除")
    assert pf is None, "Deleted portfolio should not be found"

def test_cli_help():
    from stock_portfolio.cli import main
    old_argv = sys.argv
    old_stdout = sys.stdout
    sys.argv = ["portfolio_manager.py", "--help"]
    sys.stdout = io.StringIO()
    try:
        main()
    except SystemExit as e:
        assert e.code == 0, f"Help should exit with 0, got {e.code}"
    finally:
        sys.argv = old_argv
        sys.stdout = old_stdout

def test_cli_create_portfolio():
    from stock_portfolio.cli import main
    from stock_portfolio.portfolio import get_portfolio_by_name
    old_argv = sys.argv
    old_stdout = sys.stdout
    sys.argv = ["portfolio_manager.py", "create-portfolio", "--name", "CLI测试组合"]
    sys.stdout = io.StringIO()
    try:
        main()
    finally:
        sys.argv = old_argv
        sys.stdout = old_stdout
    pf = get_portfolio_by_name("CLI测试组合")
    assert pf is not None, "CLI-created portfolio should exist"

def test_cli_add_position():
    from stock_portfolio.cli import main
    from stock_portfolio.portfolio import get_position, get_portfolio_by_name
    old_argv = sys.argv
    old_stdout = sys.stdout
    sys.argv = ["portfolio_manager.py", "add", "--portfolio", "CLI测试组合", 
                 "--code", "002594", "--shares", "200", "--price", "35.5", "--name", "比亚迪"]
    sys.stdout = io.StringIO()
    try:
        main()
    finally:
        sys.argv = old_argv
        sys.stdout = old_stdout
    
    pf = get_portfolio_by_name("CLI测试组合")
    pos = get_position(pf["id"], "SZ002594")
    assert pos is not None, "CLI-added position should exist"
    assert pos["total_shares"] == 200, f"Expected 200 shares, got {pos['total_shares']}"

def test_cli_list_portfolios():
    from stock_portfolio.cli import main
    old_argv = sys.argv
    old_stdout = sys.stdout
    sys.argv = ["portfolio_manager.py", "list-portfolios"]
    sys.stdout = io.StringIO()
    try:
        main()
    finally:
        sys.argv = old_argv
        sys.stdout = old_stdout

def test_cli_transactions():
    from stock_portfolio.cli import main
    old_argv = sys.argv
    old_stdout = sys.stdout
    sys.argv = ["portfolio_manager.py", "transactions", "--portfolio", "CLI测试组合"]
    sys.stdout = io.StringIO()
    try:
        main()
    finally:
        sys.argv = old_argv
        sys.stdout = old_stdout

def test_simple_bar_chart():
    from stock_portfolio.charts import generate_simple_bar_chart
    data = [("A股", 100000), ("港股", 50000), ("美股", 30000)]
    chart = generate_simple_bar_chart(data)
    assert "A股" in chart
    assert "港股" in chart

def main():
    print("=" * 70)
    print("  股票投资组合管理工具 - 端到端测试")
    print("=" * 70)
    print()
    
    print("[1/8] 语法检查...")
    test("所有文件语法正确", test_syntax_check)
    print()
    
    print("[2/8] 模块导入检查...")
    test("所有模块可导入", test_imports)
    print()
    
    print("[3/8] 数据库初始化测试...")
    try:
        db_path = setup_test_db()
        test("数据库初始化成功", test_db_init)
        print(f"    测试数据库: {db_path}")
    except Exception as e:
        print(f"  ✗ 数据库设置失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    print()
    
    print("[4/8] 股票代码规范化测试...")
    test("股票代码规范化", test_normalize_stock_code)
    print()
    
    print("[5/8] 实时股价获取测试...")
    test("获取600519实时股价", test_price_fetch)
    print()
    
    print("[6/8] 投资组合与持仓管理测试...")
    test("创建投资组合", test_create_portfolio)
    test("列出投资组合", test_list_portfolios)
    test("添加持仓", test_add_position)
    test("累加持仓（加仓）", test_add_position_accumulate)
    test("卖出持仓", test_sell_position)
    test("查看交易记录", test_list_transactions)
    test("已实现盈亏统计", test_realized_pnl)
    test("设置止盈止损", test_set_alert)
    test("删除投资组合", test_delete_portfolio)
    test("多投资组合支持", test_multiple_portfolios)
    print()
    
    print("[7/8] 分红送股与导出功能测试...")
    test("记录现金分红", test_dividend)
    test("记录拆股", test_stock_split)
    test("记录送股", test_stock_dividend)
    test("检查预警", test_check_alerts)
    test("导出CSV报告", test_export_csv)
    test("导出HTML报告", test_export_html)
    test("导出交易记录CSV", test_export_transactions_csv)
    test("导入雪球CSV持仓", test_import_xueqiu_csv)
    test("导入交易记录CSV", test_import_transactions_csv)
    print()
    
    print("[8/8] 资产快照与图表测试...")
    test("创建资产快照", test_snapshot)
    test("快照更新（同日覆盖）", test_snapshot_upsert)
    test("资产增长分析", test_asset_growth)
    test("导出快照CSV", test_export_snapshots_csv)
    test("ASCII饼图", test_ascii_pie_chart)
    test("ASCII曲线图", test_ascii_line_chart)
    test("ASCII曲线图（零值）", test_ascii_line_chart_zero)
    test("简单柱状图", test_simple_bar_chart)
    print()
    
    print("[额外] CLI接口测试...")
    test("CLI --help", test_cli_help)
    test("CLI 创建投资组合", test_cli_create_portfolio)
    test("CLI 添加持仓", test_cli_add_position)
    test("CLI 列出投资组合", test_cli_list_portfolios)
    test("CLI 查看交易记录", test_cli_transactions)
    print()
    
    cleanup_test_db()
    
    print("=" * 70)
    print("  测试结果汇总")
    print("=" * 70)
    
    passed = sum(1 for r in test_results if r[0] == "PASS")
    failed = sum(1 for r in test_results if r[0] == "FAIL")
    total = len(test_results)
    
    for result in test_results:
        if result[0] == "PASS":
            print(f"  \033[92m✓\033[0m {result[1]}")
        else:
            print(f"  \033[91m✗\033[0m {result[1]}: {result[2]}")
    
    print()
    print(f"  通过: \033[92m{passed}\033[0m/{total}")
    print(f"  失败: \033[91m{failed}\033[0m/{total}")
    
    if failed == 0:
        print("\n  \033[92m🎉 所有测试通过！\033[0m\n")
    else:
        print(f"\n  \033[91m⚠️  有 {failed} 个测试失败\033[0m\n")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
