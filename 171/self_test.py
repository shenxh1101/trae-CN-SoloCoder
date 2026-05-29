#!/usr/bin/env python3
"""
股票投资组合管理系统 - 自执行测试与验证脚本
此脚本在 Python 进程内直接运行所有测试和验证，不依赖外部终端。
输出写入 self_test_report.txt
"""
import sys
import os
import io
import tempfile
import shutil
import traceback
from pathlib import Path
from datetime import date, datetime

PROJECT_ROOT = Path(__file__).parent
REPORT_FILE = PROJECT_ROOT / "self_test_report.txt"

_report_lines = []

def log(msg=""):
    _report_lines.append(msg)
    print(msg, flush=True)

def log_separator():
    log("=" * 80)

def log_section(title):
    log()
    log_separator()
    log(f"  {title}")
    log_separator()
    log()

def log_pass(msg):
    log(f"  \033[92m✓\033[0m {msg}")

def log_fail(msg):
    log(f"  \033[91m✗\033[0m {msg}")

def log_warn(msg):
    log(f"  \033[93m⚠️\033[0m {msg}")

def log_info(msg):
    log(f"    {msg}")

def save_report():
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(_report_lines))
    log(f"\n完整报告已保存到: {REPORT_FILE}")


def main():
    sys.path.insert(0, str(PROJECT_ROOT))

    log_separator()
    log("  股票投资组合管理系统 - 自执行测试与验证")
    log(f"  执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"  Python: {sys.version}")
    log(f"  工作目录: {PROJECT_ROOT}")
    log_separator()

    all_pass = 0
    all_fail = 0
    all_skip = 0

    # ================================================================
    # PHASE 1: Dependency Check
    # ================================================================
    log_section("[阶段 1] 依赖检查")

    deps = ["requests", "sqlite3", "csv", "ast", "tempfile", "shutil"]
    for dep in deps:
        try:
            __import__(dep)
            log_pass(dep)
            all_pass += 1
        except ImportError as e:
            log_fail(f"{dep}: {e}")
            all_fail += 1

    optional_deps = [
        ("tabulate", "pip3 install tabulate"),
        ("rich", "pip3 install rich"),
        ("matplotlib", "pip3 install matplotlib"),
    ]
    for dep, hint in optional_deps:
        try:
            __import__(dep)
            log_pass(f"{dep} (可选)")
        except ImportError:
            log_warn(f"{dep} (可选, 未安装: {hint})")
            all_skip += 1

    # ================================================================
    # PHASE 2: Syntax Check
    # ================================================================
    log_section("[阶段 2] 语法检查")

    import ast
    package_dir = PROJECT_ROOT / "stock_portfolio"
    py_files = list(package_dir.glob("*.py")) + [PROJECT_ROOT / "portfolio_manager.py"]

    for py_file in sorted(py_files):
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                ast.parse(f.read())
            log_pass(f"{py_file.name}")
            all_pass += 1
        except SyntaxError as e:
            log_fail(f"{py_file.name}: {e}")
            all_fail += 1

    # ================================================================
    # PHASE 3: Module Import Check
    # ================================================================
    log_section("[阶段 3] 模块导入检查")

    modules = [
        "stock_portfolio.database",
        "stock_portfolio.price_fetcher",
        "stock_portfolio.portfolio",
        "stock_portfolio.transactions",
        "stock_portfolio.corporate_actions",
        "stock_portfolio.alerts",
        "stock_portfolio.charts",
        "stock_portfolio.exporter",
        "stock_portfolio.importer",
        "stock_portfolio.snapshots",
        "stock_portfolio.cli",
    ]

    for mod in modules:
        try:
            __import__(mod)
            log_pass(mod)
            all_pass += 1
        except Exception as e:
            log_fail(f"{mod}: {e}")
            all_fail += 1

    # ================================================================
    # PHASE 4: Setup Test Database
    # ================================================================
    log_section("[阶段 4] 数据库初始化")

    from stock_portfolio import database

    original_get_db_path = database.get_db_path
    temp_dir = tempfile.mkdtemp(prefix="stock_selftest_")
    temp_db = Path(temp_dir) / "portfolio.db"

    def mock_db_path():
        return temp_db

    database.get_db_path = mock_db_path

    try:
        database.init_db()
        log_pass(f"数据库初始化成功: {temp_db}")
        all_pass += 1
    except Exception as e:
        log_fail(f"数据库初始化失败: {e}")
        all_fail += 1
        database.get_db_path = original_get_db_path
        save_report()
        return 1

    # ================================================================
    # PHASE 5: Stock Code Normalization
    # ================================================================
    log_section("[阶段 5] 股票代码规范化测试")

    from stock_portfolio.price_fetcher import normalize_stock_code

    norm_tests = [
        ("600519", "SH600519", "沪市A股"),
        ("000001", "SZ000001", "深市A股"),
        ("300750", "SZ300750", "创业板"),
        ("000651", "SZ000651", "格力电器"),
        ("00700", "HK00700", "港股"),
        ("688001", "SH688001", "科创板"),
        ("SH600519", "SH600519", "已带前缀"),
    ]

    for code, expected, desc in norm_tests:
        actual = normalize_stock_code(code)
        if actual == expected:
            log_pass(f"{code} -> {actual} ({desc})")
            all_pass += 1
        else:
            log_fail(f"{code} -> {actual}, 期望 {expected} ({desc})")
            all_fail += 1

    # ================================================================
    # PHASE 6: Stock Price Query
    # ================================================================
    log_section("[阶段 6] 实时股价查询测试")

    from stock_portfolio.price_fetcher import get_stock_price

    price_codes = ["600519", "000651", "00700"]

    for raw_code in price_codes:
        code = normalize_stock_code(raw_code)
        try:
            data = get_stock_price(code)
            if data and data.get("current", 0) > 0:
                log_pass(f"{raw_code} ({code}): {data.get('name', 'N/A')} 当前价={data['current']} 昨收={data.get('prev_close', 0)}")
                all_pass += 1
            elif data:
                log_warn(f"{raw_code} ({code}): 返回数据但价格为0 (可能非交易时段)")
                all_skip += 1
            else:
                log_warn(f"{raw_code} ({code}): 无数据返回 (网络不可用)")
                all_skip += 1
        except Exception as e:
            log_fail(f"{raw_code} ({code}): {e}")
            all_fail += 1

    # ================================================================
    # PHASE 7: Portfolio Management
    # ================================================================
    log_section("[阶段 7] 投资组合管理测试")

    from stock_portfolio.portfolio import (
        create_portfolio, list_portfolios, get_portfolio_by_name,
        get_portfolio_by_id, add_position, get_position,
        get_all_positions_with_prices, set_alert_prices,
        delete_position, get_portfolio_summary
    )

    log("  --- 7.1 创建投资组合 ---")
    try:
        pid_a = create_portfolio("A股账户", "A股测试账户")
        pid_hk = create_portfolio("港股账户", "港股测试账户")
        log_pass(f"创建A股账户 (ID={pid_a})")
        log_pass(f"创建港股账户 (ID={pid_hk})")
        all_pass += 2
    except Exception as e:
        log_fail(f"创建投资组合: {e}")
        all_fail += 2

    log("  --- 7.2 列出投资组合 ---")
    try:
        pfs = list_portfolios()
        log_pass(f"找到 {len(pfs)} 个投资组合")
        for pf in pfs:
            log_info(f"ID={pf['id']}, 名称={pf['name']}, 描述={pf.get('description', '')}")
        all_pass += 1
    except Exception as e:
        log_fail(f"列出投资组合: {e}")
        all_fail += 1

    log("  --- 7.3 添加持仓 ---")
    positions_to_add = [
        ("A股账户", "600519", 100, 1800.0, "贵州茅台", 5.0),
        ("A股账户", "000651", 500, 38.5, "格力电器", 2.0),
        ("A股账户", "000001", 1000, 11.5, "平安银行", 0.5),
        ("港股账户", "00700", 200, 350.0, "腾讯控股", 10.0),
    ]

    for pf_name, code, shares, price, name, fee in positions_to_add:
        try:
            pf = get_portfolio_by_name(pf_name)
            add_position(pf["id"], code, shares, price, stock_name=name, fee=fee)
            norm_code = normalize_stock_code(code)
            pos = get_position(pf["id"], norm_code)
            if pos and pos["total_shares"] == shares:
                log_pass(f"{pf_name}: {code} {shares}股@{price} (成本={pos['total_cost']:.2f})")
                all_pass += 1
            else:
                log_fail(f"{pf_name}: {code} 持仓验证失败")
                all_fail += 1
        except Exception as e:
            log_fail(f"{pf_name}: {code} - {e}")
            all_fail += 1

    log("  --- 7.4 加仓（累加持仓）---")
    try:
        pf = get_portfolio_by_name("A股账户")
        add_position(pf["id"], "600519", 50, 1850.0, fee=3.0)
        pos = get_position(pf["id"], "SH600519")
        if pos["total_shares"] == 150:
            log_pass(f"加仓后总股数: {pos['total_shares']}")
            all_pass += 1
        else:
            log_fail(f"加仓后总股数: {pos['total_shares']}, 期望 150")
            all_fail += 1
    except Exception as e:
        log_fail(f"加仓: {e}")
        all_fail += 1

    log("  --- 7.5 查看持仓汇总 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        summary = get_portfolio_summary(pf["id"])
        log_pass(f"A股持仓: {summary['total_positions']}只, 总成本={summary['total_cost']:.2f}, 总市值={summary['total_value']:.2f}")
        log_info(f"浮动盈亏: {summary['total_pnl']:.2f} ({summary['total_pnl_percent']:.2f}%)")
        for pos in summary["positions"]:
            log_info(f"  {pos['stock_code']} {pos.get('stock_name','')} {pos['total_shares']}股 现价={pos['current_price']:.2f} 盈亏={pos['unrealized_pnl']:.2f}")
        all_pass += 1
    except Exception as e:
        log_fail(f"持仓汇总: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 8: Transactions & PnL
    # ================================================================
    log_section("[阶段 8] 交易与盈亏测试")

    from stock_portfolio.transactions import sell_position, list_transactions, get_realized_pnl_summary

    log("  --- 8.1 卖出持仓 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        tx_id, pnl = sell_position(pf["id"], "600519", 50, 2000.0, fee=5.0, notes="止盈半仓")
        pos = get_position(pf["id"], "SH600519")
        if pos["total_shares"] == 100 and pnl > 0:
            log_pass(f"卖出50股@2000, 实现盈亏={pnl:.2f}, 剩余={pos['total_shares']}股")
            all_pass += 1
        else:
            log_fail(f"卖出验证失败: 剩余={pos['total_shares']}, 盈亏={pnl}")
            all_fail += 1
    except Exception as e:
        log_fail(f"卖出: {e}")
        all_fail += 1

    log("  --- 8.2 查看交易记录 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        txs = list_transactions(pf["id"])
        buy_txs = list_transactions(pf["id"], transaction_type="BUY")
        sell_txs = list_transactions(pf["id"], transaction_type="SELL")
        log_pass(f"交易记录: {len(txs)}笔 (买入{len(buy_txs)}笔, 卖出{len(sell_txs)}笔)")
        for tx in txs[:5]:
            log_info(f"  {tx['transaction_date'][:10]} {tx['transaction_type']} {tx['stock_code']} {tx['shares']}股@{tx['price']:.2f}")
        all_pass += 1
    except Exception as e:
        log_fail(f"交易记录: {e}")
        all_fail += 1

    log("  --- 8.3 盈亏统计 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        pnl_s = get_realized_pnl_summary(pf["id"])
        log_pass(f"已实现盈亏={pnl_s['total_realized_pnl']:.2f}, 未实现={pnl_s['total_unrealized_pnl']:.2f}")
        log_info(f"胜率={pnl_s['win_rate']:.1f}%, 交易次数={pnl_s['trade_count']}")
        all_pass += 1
    except Exception as e:
        log_fail(f"盈亏统计: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 9: Alerts
    # ================================================================
    log_section("[阶段 9] 止盈止损测试")

    from stock_portfolio.alerts import check_alerts, check_position_alerts

    try:
        pf = get_portfolio_by_name("A股账户")
        set_alert_prices(pf["id"], "600519", take_profit=2500.0, stop_loss=1500.0)
        pos = get_position(pf["id"], "SH600519")
        if pos["take_profit_price"] == 2500.0 and pos["stop_loss_price"] == 1500.0:
            log_pass(f"600519 止盈=2500, 止损=1500 已设置")
            all_pass += 1
        else:
            log_fail(f"止盈止损设置失败")
            all_fail += 1
    except Exception as e:
        log_fail(f"止盈止损: {e}")
        all_fail += 1

    try:
        pf = get_portfolio_by_name("A股账户")
        positions = get_all_positions_with_prices(pf["id"])
        alerts = check_position_alerts(positions, pf["id"])
        db_alerts = check_alerts(pf["id"])
        log_pass(f"预警检查完成: 持仓预警={len(alerts)}, 数据库预警={len(db_alerts)}")
        all_pass += 1
    except Exception as e:
        log_fail(f"预警检查: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 10: Corporate Actions
    # ================================================================
    log_section("[阶段 10] 分红送股测试")

    from stock_portfolio.corporate_actions import (
        record_dividend, record_stock_dividend, record_stock_split, list_corporate_actions
    )

    log("  --- 10.1 现金分红 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        pos_before = get_position(pf["id"], "SH600519")
        cost_before = pos_before["total_cost"]
        shares_before = pos_before["total_shares"]

        record_dividend(pf["id"], "600519", amount_per_share=21.675, action_date="2024-06-30")

        pos_after = get_position(pf["id"], "SH600519")
        expected = cost_before - shares_before * 21.675
        if abs(pos_after["total_cost"] - expected) < 0.01:
            log_pass(f"分红后成本: {cost_before:.2f} -> {pos_after['total_cost']:.2f}")
            all_pass += 1
        else:
            log_fail(f"分红后成本: {pos_after['total_cost']:.2f}, 期望 {expected:.2f}")
            all_fail += 1
    except Exception as e:
        log_fail(f"现金分红: {e}")
        all_fail += 1

    log("  --- 10.2 送股 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        add_position(pf["id"], "601318", 200, 45.0, stock_name="中国平安")
        pos_before = get_position(pf["id"], "SH601318")
        shares = pos_before["total_shares"]

        record_stock_dividend(pf["id"], "601318", shares_per_holding=0.5, action_date="2024-07-15")

        pos_after = get_position(pf["id"], "SH601318")
        expected = shares * 1.5
        if abs(pos_after["total_shares"] - expected) < 0.01:
            log_pass(f"送股后: {shares} -> {pos_after['total_shares']}")
            all_pass += 1
        else:
            log_fail(f"送股后: {pos_after['total_shares']}, 期望 {expected}")
            all_fail += 1
    except Exception as e:
        log_fail(f"送股: {e}")
        all_fail += 1

    log("  --- 10.3 拆股 ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        add_position(pf["id"], "300750", 50, 200.0, stock_name="宁德时代")
        pos_before = get_position(pf["id"], "SZ300750")
        shares = pos_before["total_shares"]

        record_stock_split(pf["id"], "300750", split_ratio=2.0, action_date="2024-07-01")

        pos_after = get_position(pf["id"], "SZ300750")
        if pos_after["total_shares"] == shares * 2:
            log_pass(f"拆股后: {shares} -> {pos_after['total_shares']}")
            all_pass += 1
        else:
            log_fail(f"拆股后: {pos_after['total_shares']}, 期望 {shares*2}")
            all_fail += 1
    except Exception as e:
        log_fail(f"拆股: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 11: Export
    # ================================================================
    log_section("[阶段 11] 数据导出测试")

    export_dir = Path(temp_dir) / "exports"
    export_dir.mkdir(exist_ok=True)

    log("  --- 11.1 导出CSV ---")
    try:
        pf = get_portfolio_by_name("A股账户")
        csv_path = export_portfolio_to_csv(pf["id"], str(export_dir))
        if Path(csv_path).exists():
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                content = f.read()
            lines = content.strip().split("\n")
            log_pass(f"CSV导出成功: {Path(csv_path).name} ({len(lines)}行)")
            log_info(f"前3行: {lines[0][:80]}...")
            all_pass += 1
        else:
            log_fail(f"CSV文件未创建")
            all_fail += 1
    except Exception as e:
        log_fail(f"CSV导出: {e}")
        all_fail += 1

    log("  --- 11.2 导出HTML ---")
    try:
        from stock_portfolio.exporter import export_portfolio_to_html
        pf = get_portfolio_by_name("A股账户")
        html_path = export_portfolio_to_html(pf["id"], str(export_dir))
        if Path(html_path).exists():
            with open(html_path, 'r', encoding='utf-8') as f:
                content = f.read()
            has_doctype = "<!DOCTYPE html>" in content
            has_title = "投资组合报告" in content
            log_pass(f"HTML导出成功: {Path(html_path).name} ({len(content)}字节, DOCTYPE={has_doctype}, 标题={has_title})")
            all_pass += 1
        else:
            log_fail(f"HTML文件未创建")
            all_fail += 1
    except Exception as e:
        log_fail(f"HTML导出: {e}")
        all_fail += 1

    log("  --- 11.3 导出交易记录CSV ---")
    try:
        from stock_portfolio.exporter import export_transactions_to_csv
        pf = get_portfolio_by_name("A股账户")
        tx_csv = export_transactions_to_csv(pf["id"], str(export_dir))
        if Path(tx_csv).exists():
            log_pass(f"交易记录CSV导出成功: {Path(tx_csv).name}")
            all_pass += 1
        else:
            log_fail(f"交易记录CSV未创建")
            all_fail += 1
    except Exception as e:
        log_fail(f"交易记录CSV导出: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 12: Import
    # ================================================================
    log_section("[阶段 12] CSV导入测试")

    log("  --- 12.1 雪球格式检测 ---")
    try:
        from stock_portfolio.importer import detect_csv_format
        sample_file = PROJECT_ROOT / "sample_xueqiu.csv"
        if sample_file.exists():
            fmt = detect_csv_format(str(sample_file))
            if fmt == "xueqiu":
                log_pass(f"格式检测: {fmt}")
                all_pass += 1
            else:
                log_fail(f"格式检测: {fmt}, 期望 xueqiu")
                all_fail += 1
        else:
            log_warn("sample_xueqiu.csv 不存在，跳过")
            all_skip += 1
    except Exception as e:
        log_fail(f"格式检测: {e}")
        all_fail += 1

    log("  --- 12.2 导入雪球CSV持仓 ---")
    try:
        from stock_portfolio.importer import import_from_csv
        sample_file = PROJECT_ROOT / "sample_xueqiu.csv"
        if sample_file.exists():
            pf = get_portfolio_by_name("港股账户")
            imported, positions = import_from_csv(pf["id"], str(sample_file))
            if imported > 0:
                log_pass(f"导入成功: {imported}只股票")
                for pos in positions:
                    log_info(f"  {pos['stock_code']} {pos['stock_name']}: {pos['shares']}股@{pos['cost_price']}")
                all_pass += 1
            else:
                log_fail(f"导入0只股票")
                all_fail += 1
        else:
            log_warn("sample_xueqiu.csv 不存在，跳过")
            all_skip += 1
    except Exception as e:
        log_fail(f"导入: {e}")
        all_fail += 1

    log("  --- 12.3 导入交易记录CSV ---")
    try:
        from stock_portfolio.importer import import_transactions_from_csv
        sample_file = PROJECT_ROOT / "sample_transactions.csv"
        if sample_file.exists():
            from stock_portfolio.portfolio import create_portfolio
            create_portfolio("交易导入", "交易导入测试")
            pf = get_portfolio_by_name("交易导入")
            buy_count, sell_count = import_transactions_from_csv(pf["id"], str(sample_file))
            if buy_count >= 1:
                log_pass(f"导入成功: {buy_count}笔买入, {sell_count}笔卖出")
                all_pass += 1
            else:
                log_fail(f"导入0笔买入")
                all_fail += 1
        else:
            log_warn("sample_transactions.csv 不存在，跳过")
            all_skip += 1
    except Exception as e:
        log_fail(f"交易导入: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 13: Snapshots
    # ================================================================
    log_section("[阶段 13] 资产快照测试")

    from stock_portfolio.snapshots import (
        create_snapshot, get_snapshots, get_latest_snapshot,
        get_asset_growth, export_snapshots_to_csv
    )

    try:
        pf = get_portfolio_by_name("A股账户")
        sid = create_snapshot(pf["id"], snapshot_date="2024-12-01", cash_balance=50000.0)
        latest = get_latest_snapshot(pf["id"])
        if latest and latest["cash_balance"] == 50000.0:
            log_pass(f"快照创建成功: ID={sid}, 现金={latest['cash_balance']}")
            all_pass += 1
        else:
            log_fail(f"快照验证失败")
            all_fail += 1
    except Exception as e:
        log_fail(f"快照创建: {e}")
        all_fail += 1

    try:
        pf = get_portfolio_by_name("A股账户")
        create_snapshot(pf["id"], snapshot_date="2024-12-02", cash_balance=10000.0)
        create_snapshot(pf["id"], snapshot_date="2024-12-02", cash_balance=20000.0)
        snaps = get_snapshots(pf["id"])
        dec2 = [s for s in snaps if s["snapshot_date"] == "2024-12-02"]
        if len(dec2) == 1 and dec2[0]["cash_balance"] == 20000.0:
            log_pass(f"同日快照更新正确")
            all_pass += 1
        else:
            log_fail(f"同日快照更新失败: 数量={len(dec2)}")
            all_fail += 1
    except Exception as e:
        log_fail(f"同日快照: {e}")
        all_fail += 1

    try:
        pf = get_portfolio_by_name("A股账户")
        for days_ago in range(5, 0, -1):
            d = date.fromordinal(date.today().toordinal() - days_ago)
            create_snapshot(pf["id"], snapshot_date=d.strftime("%Y-%m-%d"), cash_balance=10000.0 * (1 + days_ago * 0.01))
        growth = get_asset_growth(pf["id"], days=10)
        if growth and "start_value" in growth:
            log_pass(f"资产增长分析: 期初={growth['start_value']:.2f}, 期末={growth['end_value']:.2f}, 最大回撤={growth['max_drawdown_pct']:.2f}%")
            all_pass += 1
        else:
            log_fail(f"资产增长分析无数据")
            all_fail += 1
    except Exception as e:
        log_fail(f"资产增长分析: {e}")
        all_fail += 1

    try:
        pf = get_portfolio_by_name("A股账户")
        snap_csv = export_snapshots_to_csv(pf["id"], str(export_dir))
        if Path(snap_csv).exists():
            log_pass(f"快照CSV导出成功")
            all_pass += 1
        else:
            log_fail(f"快照CSV未创建")
            all_fail += 1
    except Exception as e:
        log_fail(f"快照CSV导出: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 14: Charts
    # ================================================================
    log_section("[阶段 14] 图表测试")

    from stock_portfolio.charts import generate_ascii_pie_chart, generate_ascii_line_chart, generate_simple_bar_chart

    try:
        positions = [
            {"stock_code": "SH600519", "stock_name": "贵州茅台", "market_value": 180000},
            {"stock_code": "SZ000651", "stock_name": "格力电器", "market_value": 20000},
            {"stock_code": "SZ000001", "stock_name": "平安银行", "market_value": 12000},
        ]
        chart = generate_ascii_pie_chart(positions, width=40, height=12)
        log_pass(f"ASCII饼图生成成功 ({len(chart)}字符)")
        log_info(chart[:200] + "...")
        all_pass += 1
    except Exception as e:
        log_fail(f"ASCII饼图: {e}")
        all_fail += 1

    try:
        data = [("01-01", 100000), ("02-01", 105000), ("03-01", 102000), ("04-01", 108000)]
        chart = generate_ascii_line_chart(data, width=60, height=10)
        log_pass(f"ASCII曲线图生成成功 ({len(chart)}字符)")
        all_pass += 1
    except Exception as e:
        log_fail(f"ASCII曲线图: {e}")
        all_fail += 1

    try:
        data = [("01-01", 0), ("02-01", 0)]
        chart = generate_ascii_line_chart(data, width=60, height=10)
        log_pass(f"零值曲线图不崩溃")
        all_pass += 1
    except Exception as e:
        log_fail(f"零值曲线图: {e}")
        all_fail += 1

    try:
        data = [("A股", 100000), ("港股", 50000)]
        chart = generate_simple_bar_chart(data)
        log_pass(f"柱状图生成成功")
        all_pass += 1
    except Exception as e:
        log_fail(f"柱状图: {e}")
        all_fail += 1

    # ================================================================
    # PHASE 15: CLI
    # ================================================================
    log_section("[阶段 15] CLI接口测试")

    from stock_portfolio.cli import main as cli_main

    old_argv = sys.argv
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    cli_tests = [
        ("--help", ["portfolio_manager.py", "--help"]),
        ("list-portfolios", ["portfolio_manager.py", "list-portfolios"]),
        ("create-portfolio", ["portfolio_manager.py", "create-portfolio", "--name", "CLI_自动测试"]),
        ("add", ["portfolio_manager.py", "add", "--portfolio", "CLI_自动测试", "--code", "002594", "--shares", "200", "--price", "35.5", "--name", "比亚迪"]),
        ("transactions", ["portfolio_manager.py", "transactions", "--portfolio", "CLI_自动测试"]),
        ("pnl", ["portfolio_manager.py", "pnl", "--portfolio", "CLI_自动测试"]),
        ("chart", ["portfolio_manager.py", "chart", "--portfolio", "CLI_自动测试"]),
        ("price 600519", ["portfolio_manager.py", "price", "--code", "600519"]),
        ("price 000651", ["portfolio_manager.py", "price", "--code", "000651"]),
    ]

    for name, argv in cli_tests:
        captured = io.StringIO()
        sys.argv = argv
        sys.stdout = captured
        sys.stderr = captured
        try:
            cli_main()
            output = captured.getvalue()
            log_pass(f"CLI {name} (输出: {len(output)}字符)")
            if "price" in name:
                first_line = output.strip().split("\n")[0] if output.strip() else "(无输出)"
                log_info(f"  输出: {first_line[:80]}")
            all_pass += 1
        except SystemExit as e:
            if e.code == 0:
                output = captured.getvalue()
                log_pass(f"CLI {name} (退出码0, 输出: {len(output)}字符)")
                all_pass += 1
            else:
                output = captured.getvalue()
                log_fail(f"CLI {name} (退出码: {e.code})")
                log_info(f"  输出: {output[:200]}")
                all_fail += 1
        except Exception as e:
            log_fail(f"CLI {name}: {e}")
            all_fail += 1
        finally:
            sys.argv = old_argv
            sys.stdout = old_stdout
            sys.stderr = old_stderr

    # ================================================================
    # Cleanup
    # ================================================================
    database.get_db_path = original_get_db_path
    shutil.rmtree(temp_dir, ignore_errors=True)

    # ================================================================
    # FINAL REPORT
    # ================================================================
    log_section("最终测试报告")

    log(f"  \033[92m通过: {all_pass}\033[0m")
    log(f"  \033[91m失败: {all_fail}\033[0m")
    log(f"  \033[93m跳过: {all_skip}\033[0m")
    log(f"  总计: {all_pass + all_fail + all_skip}")
    log()

    if all_fail == 0:
        log("  \033[92m" + "=" * 70 + "\033[0m")
        log("  \033[92m🎉 所有测试通过！股票投资组合管理系统运行正常！\033[0m")
        log("  \033[92m" + "=" * 70 + "\033[0m")
    else:
        log(f"  \033[91m⚠️  有 {all_fail} 个测试失败，请检查上方错误信息\033[0m")

    log()
    log(f"  完整报告: {REPORT_FILE}")

    save_report()
    return all_fail


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        log(f"\n\033[91m致命错误: {e}\033[0m")
        traceback.print_exc()
        save_report()
        sys.exit(1)
