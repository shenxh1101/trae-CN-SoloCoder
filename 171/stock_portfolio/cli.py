#!/usr/bin/env python3
import argparse
import sys
from datetime import datetime

from .database import init_db
from .portfolio import (
    create_portfolio, delete_portfolio, list_portfolios,
    get_portfolio_by_id, get_portfolio_by_name,
    add_position, get_all_positions_with_prices,
    set_alert_prices, delete_position, get_portfolio_summary,
)
from .transactions import (
    sell_position, list_transactions,
    get_realized_pnl_summary,
)
from .corporate_actions import (
    record_dividend, record_stock_dividend, record_stock_split,
    list_corporate_actions,
)
from .alerts import check_alerts, check_position_alerts, print_alert_notification
from .charts import print_portfolio_allocation_chart, print_asset_curve
from .exporter import export_portfolio_to_csv, export_portfolio_to_html, export_transactions_to_csv
from .importer import import_from_csv, import_transactions_from_csv
from .snapshots import (
    create_snapshot, get_snapshots, get_asset_growth,
    print_snapshot_summary, export_snapshots_to_csv, generate_asset_curve_image,
)
from .price_fetcher import get_stock_price, normalize_stock_code


def print_positions_table(positions, title="持仓明细"):
    if not positions:
        print("\n暂无持仓数据\n")
        return
    
    print("\n" + "=" * 120)
    print(f"  {title}")
    print("=" * 120)
    
    def color_pnl(v):
        if v > 0:
            return f"\033[91m{v:,.2f}\033[0m"
        elif v < 0:
            return f"\033[92m{v:,.2f}\033[0m"
        return f"{v:,.2f}"
    
    def color_pct(v):
        if v > 0:
            return f"\033[91m{v:.2f}%\033[0m"
        elif v < 0:
            return f"\033[92m{v:.2f}%\033[0m"
        return f"{v:.2f}%"
    
    header = f"  {'股票代码':<12} {'股票名称':<12} {'持仓股数':>10} {'平均成本':>10} {'当前价':>10} {'市值':>14} {'成本':>12} {'浮动盈亏':>12} {'盈亏比':>10} {'今日':>8}"
    print(header)
    print("-" * 120)
    
    for pos in positions:
        name = pos.get('stock_name', pos['stock_code'])
        if len(name) > 10:
            name = name[:10]
        
        line = f"  {pos['stock_code']:<12} {name:<12} {pos['total_shares']:>10,.0f} {pos['avg_cost']:>10.3f} {pos['current_price']:>10.3f} {pos['market_value']:>14,.2f} {pos['cost_basis']:>12,.2f} {color_pnl(pos['unrealized_pnl']):>20} {color_pct(pos['pnl_percent']):>14} {color_pct(pos['change_today']):>12}"
        print(line)
    
    print("-" * 120)


def print_portfolio_summary_detail(summary, portfolio_name):
    total_cost = summary['total_cost']
    total_value = summary['total_value']
    total_pnl = summary['total_pnl']
    total_pnl_pct = summary['total_pnl_percent']
    
    print(f"\n  投资组合: {portfolio_name}")
    print(f"  持仓数量: {summary['total_positions']} 只")
    print(f"  总成本:   ¥{total_cost:,.2f}")
    print(f"  总市值:   ¥{total_value:,.2f}")
    
    if total_pnl >= 0:
        print(f"  浮动盈亏: \033[91m+¥{total_pnl:,.2f} ({total_pnl_pct:+.2f}%)\033[0m")
    else:
        print(f"  浮动盈亏: \033[92m¥{total_pnl:,.2f} ({total_pnl_pct:.2f}%)\033[0m")


def get_portfolio_from_arg(arg):
    if arg is None:
        portfolios = list_portfolios()
        if len(portfolios) == 1:
            return portfolios[0]
        elif len(portfolios) == 0:
            print("错误: 没有找到投资组合，请先创建一个")
            sys.exit(1)
        else:
            print("错误: 存在多个投资组合，请使用 --portfolio 指定")
            for pf in portfolios:
                print(f"  - {pf['id']}: {pf['name']}")
            sys.exit(1)
    
    try:
        pf_id = int(arg)
        pf = get_portfolio_by_id(pf_id)
        if pf:
            return pf
    except ValueError:
        pass
    
    pf = get_portfolio_by_name(arg)
    if pf:
        return pf
    
    print(f"错误: 未找到投资组合 '{arg}'")
    sys.exit(1)


def cmd_list_portfolios(args):
    portfolios = list_portfolios()
    if not portfolios:
        print("\n暂无投资组合\n")
        return
    
    print("\n" + "=" * 60)
    print("  投资组合列表")
    print("=" * 60)
    print(f"  {'ID':<6} {'名称':<20} {'描述':<20} {'创建时间':<20}")
    print("-" * 60)
    
    for pf in portfolios:
        print(f"  {pf['id']:<6} {pf['name']:<20} {pf.get('description', '')[:18]:<20} {pf['created_at']:<20}")
    print()


def cmd_create_portfolio(args):
    pid = create_portfolio(args.name, args.description or "")
    print(f"\n✓ 投资组合创建成功: ID={pid}, 名称={args.name}\n")


def cmd_delete_portfolio(args):
    pf = get_portfolio_from_arg(args.portfolio)
    confirm = input(f"确认删除投资组合 '{pf['name']}' 及其所有数据? (yes/no): ")
    if confirm.lower() == 'yes':
        delete_portfolio(pf['id'])
        print(f"\n✓ 投资组合已删除: {pf['name']}\n")
    else:
        print("\n操作已取消\n")


def cmd_add_position(args):
    pf = get_portfolio_from_arg(args.portfolio)
    pid = add_position(
        portfolio_id=pf['id'],
        stock_code=args.code,
        shares=args.shares,
        price=args.price,
        stock_name=args.name or "",
        fee=args.fee or 0.0,
        transaction_date=args.date,
    )
    print(f"\n✓ 持仓添加成功: {args.code} {args.shares}股 @ {args.price}\n")


def cmd_sell_position(args):
    pf = get_portfolio_from_arg(args.portfolio)
    tx_id, pnl = sell_position(
        portfolio_id=pf['id'],
        stock_code=args.code,
        shares=args.shares,
        price=args.price,
        fee=args.fee or 0.0,
        transaction_date=args.date,
        notes=args.notes or "",
    )
    print(f"\n✓ 卖出成功: {args.code} {args.shares}股 @ {args.price}")
    if pnl >= 0:
        print(f"  实现盈亏: \033[91m+¥{pnl:,.2f}\033[0m\n")
    else:
        print(f"  实现盈亏: \033[92m¥{pnl:,.2f}\033[0m\n")


def cmd_view_portfolio(args):
    pf = get_portfolio_from_arg(args.portfolio)
    summary = get_portfolio_summary(pf['id'])
    positions = summary['positions']
    
    alerts = check_position_alerts(positions, pf['id'])
    for alert in alerts:
        print_alert_notification(alert)
    
    price_alerts = check_alerts(pf['id'])
    for alert in price_alerts:
        print_alert_notification(alert)
    
    print_positions_table(positions)
    print_portfolio_summary_detail(summary, pf['name'])
    
    if args.chart:
        print_portfolio_allocation_chart(pf['id'])
    
    if args.pnl:
        pnl_summary = get_realized_pnl_summary(pf['id'])
        print("\n" + "=" * 60)
        print("  盈亏统计")
        print("=" * 60)
        print(f"  已实现盈亏: {pnl_summary['total_realized_pnl']:,.2f}")
        print(f"  未实现盈亏: {pnl_summary['total_unrealized_pnl']:,.2f}")
        print(f"  总盈亏: {pnl_summary['total_pnl']:,.2f}")
        print(f"  交易次数: {pnl_summary['trade_count']}")
        print(f"  胜率: {pnl_summary['win_rate']:.2f}%")
        print(f"  盈亏比: {pnl_summary['profit_factor']:.2f}" if isinstance(pnl_summary['profit_factor'], (int, float)) else f"  盈亏比: {pnl_summary['profit_factor']}")
    print()


def cmd_set_alert(args):
    pf = get_portfolio_from_arg(args.portfolio)
    set_alert_prices(
        portfolio_id=pf['id'],
        stock_code=args.code,
        take_profit=args.take_profit,
        stop_loss=args.stop_loss,
    )
    print(f"\n✓ 预警价格已设置: {args.code}")
    if args.take_profit:
        print(f"  止盈价: {args.take_profit}")
    if args.stop_loss:
        print(f"  止损价: {args.stop_loss}")
    print()


def cmd_check_alerts(args):
    pf = get_portfolio_from_arg(args.portfolio)
    positions = get_all_positions_with_prices(pf['id'])
    
    alerts = check_position_alerts(positions, pf['id'])
    price_alerts = check_alerts(pf['id'])
    
    if not alerts and not price_alerts:
        print("\n✓ 当前没有触发的预警\n")
        return
    
    for alert in alerts:
        print_alert_notification(alert)
    for alert in price_alerts:
        print_alert_notification(alert)


def cmd_list_transactions(args):
    pf = get_portfolio_from_arg(args.portfolio)
    txs = list_transactions(pf['id'], stock_code=args.code, 
                            transaction_type=args.type, limit=args.limit or 100)
    
    if not txs:
        print("\n暂无交易记录\n")
        return
    
    print("\n" + "=" * 100)
    print("  交易记录")
    print("=" * 100)
    print(f"  {'日期':<20} {'代码':<12} {'类型':<8} {'股数':>10} {'价格':>10} {'金额':>14} {'手续费':>10} {'盈亏':>14}")
    print("-" * 100)
    
    for tx in txs:
        tx_type = '\033[92m买入\033[0m' if tx['transaction_type'] == 'BUY' else '\033[91m卖出\033[0m'
        pnl = tx.get('realized_pnl')
        pnl_str = ""
        if pnl is not None:
            if pnl >= 0:
                pnl_str = f"\033[91m{pnl:,.2f}\033[0m"
            else:
                pnl_str = f"\033[92m{pnl:,.2f}\033[0m"
        
        print(f"  {tx['transaction_date']:<20} {tx['stock_code']:<12} {tx_type:<18} {tx['shares']:>10,.0f} {tx['price']:>10.3f} {tx['amount']:>14,.2f} {tx.get('fee', 0) or 0:>10.2f} {pnl_str:>18}")
    print()


def cmd_dividend(args):
    pf = get_portfolio_from_arg(args.portfolio)
    aid = record_dividend(
        portfolio_id=pf['id'],
        stock_code=args.code,
        amount_per_share=args.amount,
        action_date=args.date,
        notes=args.notes or "",
    )
    print(f"\n✓ 分红已记录: {args.code} 每股派息 {args.amount}元\n")


def cmd_stock_split(args):
    pf = get_portfolio_from_arg(args.portfolio)
    aid = record_stock_split(
        portfolio_id=pf['id'],
        stock_code=args.code,
        split_ratio=args.ratio,
        action_date=args.date,
        notes=args.notes or "",
    )
    print(f"\n✓ 拆股已记录: {args.code} 拆股比例 {args.ratio}\n")


def cmd_stock_dividend(args):
    pf = get_portfolio_from_arg(args.portfolio)
    aid = record_stock_dividend(
        portfolio_id=pf['id'],
        stock_code=args.code,
        shares_per_holding=args.ratio,
        action_date=args.date,
        notes=args.notes or "",
    )
    print(f"\n✓ 送股已记录: {args.code} 每10股送 {args.ratio*10}股\n")


def cmd_export_csv(args):
    pf = get_portfolio_from_arg(args.portfolio)
    path = export_portfolio_to_csv(pf['id'], args.output)
    print(f"\n✓ CSV 报告已导出到: {path}\n")


def cmd_export_html(args):
    pf = get_portfolio_from_arg(args.portfolio)
    path = export_portfolio_to_html(pf['id'], args.output)
    print(f"\n✓ HTML 报告已导出到: {path}\n")


def cmd_export_transactions(args):
    pf = get_portfolio_from_arg(args.portfolio)
    path = export_transactions_to_csv(pf['id'], args.output)
    print(f"\n✓ 交易记录已导出到: {path}\n")


def cmd_import_csv(args):
    pf = get_portfolio_from_arg(args.portfolio)
    imported, positions = import_from_csv(pf['id'], args.file, args.date)
    print(f"\n✓ 成功导入 {imported} 只股票:")
    for pos in positions[:10]:
        print(f"  - {pos['stock_code']} {pos['stock_name']}: {pos['shares']}股 @ {pos['cost_price']}")
    if len(positions) > 10:
        print(f"  ... 还有 {len(positions) - 10} 只")
    print()


def cmd_import_transactions(args):
    pf = get_portfolio_from_arg(args.portfolio)
    buy_count, sell_count = import_transactions_from_csv(pf['id'], args.file)
    print(f"\n✓ 成功导入 {buy_count} 笔买入, {sell_count} 笔卖出\n")


def cmd_snapshot(args):
    pf = get_portfolio_from_arg(args.portfolio)
    sid = create_snapshot(pf['id'], args.date, args.cash or 0.0)
    print(f"\n✓ 资产快照已创建: ID={sid}\n")


def cmd_snapshot_all(args):
    from .snapshots import create_all_portfolios_snapshot
    ids = create_all_portfolios_snapshot(args.date)
    print(f"\n✓ 已为 {len(ids)} 个投资组合创建快照\n")


def cmd_view_curve(args):
    pf = get_portfolio_from_arg(args.portfolio)
    growth = get_asset_growth(pf['id'], args.days)
    
    if growth:
        print_snapshot_summary(pf['id'], args.days)
        print_asset_curve(growth['snapshots'], f"{pf['name']} 资产曲线 (近{args.days}天)")
    else:
        print("\n暂无资产快照数据，请先使用 snapshot 命令创建\n")


def cmd_export_snapshots(args):
    pf = get_portfolio_from_arg(args.portfolio)
    path = export_snapshots_to_csv(pf['id'], args.output)
    print(f"\n✓ 资产快照已导出到: {path}\n")


def cmd_export_curve_image(args):
    pf = get_portfolio_from_arg(args.portfolio)
    try:
        path = generate_asset_curve_image(pf['id'], args.output, args.days)
        print(f"\n✓ 资产曲线图已导出到: {path}\n")
    except ImportError:
        print("\n错误: 需要安装 matplotlib 才能生成图片\n")
        print("  pip install matplotlib\n")


def cmd_delete_position(args):
    pf = get_portfolio_from_arg(args.portfolio)
    confirm = input(f"确认删除持仓 {args.code} 及其所有交易记录? (yes/no): ")
    if confirm.lower() == 'yes':
        delete_position(pf['id'], args.code)
        print(f"\n✓ 持仓已删除: {args.code}\n")
    else:
        print("\n操作已取消\n")


def cmd_price(args):
    code = normalize_stock_code(args.code)
    data = get_stock_price(code)
    if data:
        print(f"\n  {code}: {data.get('name', '')}")
        print(f"  当前价: {data['current']}")
        print(f"  昨收: {data['prev_close']}")
        print(f"  今开: {data['open']}")
        print(f"  最高: {data['high']}")
        print(f"  最低: {data['low']}\n")
    else:
        print(f"\n无法获取 {code} 的价格数据\n")


def cmd_pnl_summary(args):
    pf = get_portfolio_from_arg(args.portfolio)
    summary = get_realized_pnl_summary(pf['id'])
    
    print("\n" + "=" * 60)
    print(f"  {pf['name']} - 盈亏统计")
    print("=" * 60)
    
    def fmt(v):
        return f"¥{v:,.2f}"
    
    def col(v):
        if v > 0:
            return f"\033[91m{v}\033[0m"
        elif v < 0:
            return f"\033[92m{v}\033[0m"
        return str(v)
    
    print(f"  已实现盈亏: {col(fmt(summary['total_realized_pnl']))}")
    print(f"  未实现盈亏: {col(fmt(summary['total_unrealized_pnl']))}")
    print(f"  总盈亏:     {col(fmt(summary['total_pnl']))}")
    print()
    print(f"  交易次数: {summary['trade_count']}")
    print(f"  盈利次数: {summary['win_count']}")
    print(f"  亏损次数: {summary['loss_count']}")
    print(f"  胜率: {summary['win_rate']:.2f}%")
    print(f"  平均盈利: {col(fmt(summary['avg_win']))}")
    print(f"  平均亏损: {col(fmt(summary['avg_loss']))}")
    
    pf_factor = summary['profit_factor']
    if isinstance(pf_factor, float) and pf_factor > 999:
        print(f"  盈亏比: >999 (全胜)")
    elif isinstance(pf_factor, (int, float)):
        print(f"  盈亏比: {pf_factor:.2f}")
    else:
        print(f"  盈亏比: {pf_factor}")
    print()


def cmd_chart(args):
    pf = get_portfolio_from_arg(args.portfolio)
    print_portfolio_allocation_chart(pf['id'])


def cmd_list_actions(args):
    pf = get_portfolio_from_arg(args.portfolio)
    actions = list_corporate_actions(pf['id'], args.code)
    
    if not actions:
        print("\n暂无公司行动记录\n")
        return
    
    print("\n" + "=" * 100)
    print("  公司行动记录")
    print("=" * 100)
    print(f"  {'日期':<12} {'代码':<12} {'类型':<16} {'股数':>10} {'金额':>12} {'拆股比':>10} {'备注':<20}")
    print("-" * 100)
    
    type_names = {
        'DIVIDEND': '现金分红',
        'STOCK_DIVIDEND': '送股',
        'SPLIT': '拆股',
        'RIGHTS_ISSUE': '配股',
    }
    
    for act in actions:
        atype = type_names.get(act['action_type'], act['action_type'])
        print(f"  {act['action_date']:<12} {act['stock_code']:<12} {atype:<16} {act.get('shares', 0) or 0:>10,.0f} {act.get('amount', 0) or 0:>12,.2f} {act.get('split_ratio', '') or '':>10} {(act.get('notes', '') or '')[:18]:<20}")
    print()


def main():
    init_db()
    
    parser = argparse.ArgumentParser(
        description="📊 股票投资组合管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 创建投资组合
  %(prog)s create-portfolio --name A股 --description "我的A股账户"
  
  # 添加持仓
  %(prog)s add --portfolio A股 --code 600519 --shares 100 --price 1800
  
  # 查看持仓
  %(prog)s view --portfolio A股 --chart --pnl
  
  # 卖出股票
  %(prog)s sell --portfolio A股 --code 600519 --shares 50 --price 2000
  
  # 设置止盈止损
  %(prog)s alert --portfolio A股 --code 600519 --take-profit 2500 --stop-loss 1500
  
  # 检查预警
  %(prog)s check-alerts --portfolio A股
  
  # 记录分红
  %(prog)s dividend --portfolio A股 --code 600519 --amount 21.675
  
  # 导出报告
  %(prog)s export-csv --portfolio A股 --output .
  %(prog)s export-html --portfolio A股 --output report.html
  
  # 导入持仓（雪球/同花顺格式）
  %(prog)s import-csv --portfolio A股 --file xueqiu.csv
  
  # 创建资产快照
  %(prog)s snapshot --portfolio A股
  
  # 查看资产曲线
  %(prog)s curve --portfolio A股 --days 90
  
  # 查看交易记录
  %(prog)s transactions --portfolio A股
  
  # 盈亏统计
  %(prog)s pnl --portfolio A股
  
  # 查看实时股价
  %(prog)s price --code 600519
        """
    )
    
    parser.add_argument("--portfolio", "-p", help="投资组合ID或名称")
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    sp = subparsers.add_parser("list-portfolios", aliases=["lp"], help="列出所有投资组合")
    sp.set_defaults(func=cmd_list_portfolios)
    
    sp = subparsers.add_parser("create-portfolio", aliases=["cp"], help="创建投资组合")
    sp.add_argument("--name", required=True, help="组合名称")
    sp.add_argument("--description", help="组合描述")
    sp.set_defaults(func=cmd_create_portfolio)
    
    sp = subparsers.add_parser("delete-portfolio", aliases=["dp"], help="删除投资组合")
    sp.add_argument("--portfolio", required=True, help="要删除的投资组合")
    sp.set_defaults(func=cmd_delete_portfolio)
    
    sp = subparsers.add_parser("add", aliases=["buy"], help="添加/买入持仓")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--shares", required=True, type=float, help="股数")
    sp.add_argument("--price", required=True, type=float, help="买入价格")
    sp.add_argument("--name", help="股票名称")
    sp.add_argument("--fee", type=float, default=0.0, help="手续费")
    sp.add_argument("--date", help="交易日期 (YYYY-MM-DD HH:MM:SS)")
    sp.set_defaults(func=cmd_add_position)
    
    sp = subparsers.add_parser("sell", help="卖出持仓")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--shares", required=True, type=float, help="股数")
    sp.add_argument("--price", required=True, type=float, help="卖出价格")
    sp.add_argument("--fee", type=float, default=0.0, help="手续费")
    sp.add_argument("--date", help="交易日期")
    sp.add_argument("--notes", help="备注")
    sp.set_defaults(func=cmd_sell_position)
    
    sp = subparsers.add_parser("view", aliases=["v"], help="查看持仓")
    sp.add_argument("--chart", action="store_true", help="显示饼图")
    sp.add_argument("--pnl", action="store_true", help="显示盈亏统计")
    sp.set_defaults(func=cmd_view_portfolio)
    
    sp = subparsers.add_parser("alert", help="设置止盈止损")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--take-profit", type=float, help="止盈价")
    sp.add_argument("--stop-loss", type=float, help="止损价")
    sp.set_defaults(func=cmd_set_alert)
    
    sp = subparsers.add_parser("check-alerts", aliases=["ca"], help="检查预警")
    sp.set_defaults(func=cmd_check_alerts)
    
    sp = subparsers.add_parser("transactions", aliases=["tx"], help="查看交易记录")
    sp.add_argument("--code", help="股票代码过滤")
    sp.add_argument("--type", choices=["BUY", "SELL"], help="交易类型过滤")
    sp.add_argument("--limit", type=int, help="显示条数")
    sp.set_defaults(func=cmd_list_transactions)
    
    sp = subparsers.add_parser("dividend", help="记录现金分红")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--amount", required=True, type=float, help="每股派息金额")
    sp.add_argument("--date", help="分红日期")
    sp.add_argument("--notes", help="备注")
    sp.set_defaults(func=cmd_dividend)
    
    sp = subparsers.add_parser("stock-dividend", aliases=["sd"], help="记录送股")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--ratio", required=True, type=float, help="送股比例 (如0.5表示每10股送5股)")
    sp.add_argument("--date", help="日期")
    sp.add_argument("--notes", help="备注")
    sp.set_defaults(func=cmd_stock_dividend)
    
    sp = subparsers.add_parser("split", help="记录拆股")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.add_argument("--ratio", required=True, type=float, help="拆股比例 (如2表示1拆2)")
    sp.add_argument("--date", help="日期")
    sp.add_argument("--notes", help="备注")
    sp.set_defaults(func=cmd_stock_split)
    
    sp = subparsers.add_parser("export-csv", help="导出CSV报告")
    sp.add_argument("--output", "-o", default=".", help="输出路径")
    sp.set_defaults(func=cmd_export_csv)
    
    sp = subparsers.add_parser("export-html", help="导出HTML报告")
    sp.add_argument("--output", "-o", default=".", help="输出路径")
    sp.set_defaults(func=cmd_export_html)
    
    sp = subparsers.add_parser("export-transactions", help="导出交易记录CSV")
    sp.add_argument("--output", "-o", default=".", help="输出路径")
    sp.set_defaults(func=cmd_export_transactions)
    
    sp = subparsers.add_parser("import-csv", help="从CSV导入持仓")
    sp.add_argument("--file", "-f", required=True, help="CSV文件路径")
    sp.add_argument("--date", help="交易日期")
    sp.set_defaults(func=cmd_import_csv)
    
    sp = subparsers.add_parser("import-transactions", help="从CSV导入交易记录")
    sp.add_argument("--file", "-f", required=True, help="CSV文件路径")
    sp.set_defaults(func=cmd_import_transactions)
    
    sp = subparsers.add_parser("snapshot", help="创建资产快照")
    sp.add_argument("--date", help="快照日期")
    sp.add_argument("--cash", type=float, default=0.0, help="现金余额")
    sp.set_defaults(func=cmd_snapshot)
    
    sp = subparsers.add_parser("snapshot-all", help="为所有组合创建快照")
    sp.add_argument("--date", help="快照日期")
    sp.set_defaults(func=cmd_snapshot_all)
    
    sp = subparsers.add_parser("curve", help="查看资产曲线")
    sp.add_argument("--days", type=int, default=30, help="查看天数")
    sp.set_defaults(func=cmd_view_curve)
    
    sp = subparsers.add_parser("export-snapshots", help="导出资产快照CSV")
    sp.add_argument("--output", "-o", default=".", help="输出路径")
    sp.set_defaults(func=cmd_export_snapshots)
    
    sp = subparsers.add_parser("export-curve-image", help="导出资产曲线图PNG")
    sp.add_argument("--output", "-o", default=".", help="输出路径")
    sp.add_argument("--days", type=int, default=180, help="天数")
    sp.set_defaults(func=cmd_export_curve_image)
    
    sp = subparsers.add_parser("delete-position", help="删除持仓")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.set_defaults(func=cmd_delete_position)
    
    sp = subparsers.add_parser("price", help="查询实时股价")
    sp.add_argument("--code", required=True, help="股票代码")
    sp.set_defaults(func=cmd_price)
    
    sp = subparsers.add_parser("pnl", help="盈亏统计")
    sp.set_defaults(func=cmd_pnl_summary)
    
    sp = subparsers.add_parser("chart", help="持仓占比饼图")
    sp.set_defaults(func=cmd_chart)
    
    sp = subparsers.add_parser("list-actions", help="列出公司行动记录")
    sp.add_argument("--code", help="股票代码过滤")
    sp.set_defaults(func=cmd_list_actions)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\n\n操作已取消\n")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ 错误: {e}\n", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
