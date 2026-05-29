import csv
from datetime import datetime
from typing import Dict, List
from pathlib import Path
from .portfolio import get_portfolio_summary, get_portfolio_by_id
from .transactions import list_transactions, get_realized_pnl_summary
from .price_fetcher import normalize_stock_code


def export_portfolio_to_csv(portfolio_id: int, output_path: str) -> str:
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise ValueError(f"Portfolio not found: {portfolio_id}")
    
    summary = get_portfolio_summary(portfolio_id)
    positions = summary["positions"]
    
    path = Path(output_path)
    if path.is_dir():
        filename = f"portfolio_{portfolio['name']}_{datetime.now().strftime('%Y%m%d')}.csv"
        path = path / filename
    
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        
        writer.writerow([f"投资组合: {portfolio['name']}"])
        writer.writerow([f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([f"总成本: ¥{summary['total_cost']:,.2f}"])
        writer.writerow([f"总市值: ¥{summary['total_value']:,.2f}"])
        writer.writerow([f"总盈亏: ¥{summary['total_pnl']:,.2f} ({summary['total_pnl_percent']:.2f}%)"])
        writer.writerow([])
        
        writer.writerow([
            "股票代码", "股票名称", "持仓股数", "平均成本", "当前价格",
            "市值", "成本金额", "浮动盈亏", "盈亏比例(%)", "今日涨跌幅(%)",
            "止盈价", "止损价"
        ])
        
        for pos in positions:
            writer.writerow([
                pos["stock_code"],
                pos["stock_name"],
                pos["total_shares"],
                f"{pos['avg_cost']:.4f}",
                f"{pos['current_price']:.4f}",
                f"{pos['market_value']:.2f}",
                f"{pos['cost_basis']:.2f}",
                f"{pos['unrealized_pnl']:.2f}",
                f"{pos['pnl_percent']:.2f}",
                f"{pos['change_today']:.2f}",
                pos.get("take_profit_price", "") if pos.get("take_profit_price") else "",
                pos.get("stop_loss_price", "") if pos.get("stop_loss_price") else "",
            ])
    
    return str(path)


def export_portfolio_to_html(portfolio_id: int, output_path: str) -> str:
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise ValueError(f"Portfolio not found: {portfolio_id}")
    
    summary = get_portfolio_summary(portfolio_id)
    positions = summary["positions"]
    pnl_summary = get_realized_pnl_summary(portfolio_id)
    transactions = list_transactions(portfolio_id, limit=50)
    
    path = Path(output_path)
    if path.is_dir():
        filename = f"portfolio_{portfolio['name']}_{datetime.now().strftime('%Y%m%d')}.html"
        path = path / filename
    
    def format_number(n, decimals=2):
        if isinstance(n, float) and n != n:
            return "0.00"
        if n >= 0:
            return f"{n:,.{decimals}f}"
        else:
            return f"-{abs(n):,.{decimals}f}"
    
    def pnl_class(n):
        if n > 0:
            return "profit"
        elif n < 0:
            return "loss"
        return ""
    
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投资组合报告 - {portfolio['name']}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f5f7fa; color: #333; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .header .meta {{ opacity: 0.9; font-size: 14px; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }}
        .summary-card {{ background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .summary-card .label {{ font-size: 13px; color: #666; margin-bottom: 8px; }}
        .summary-card .value {{ font-size: 24px; font-weight: 600; }}
        .summary-card .value.profit {{ color: #e74c3c; }}
        .summary-card .value.loss {{ color: #27ae60; }}
        .section {{ background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .section h2 {{ font-size: 20px; margin-bottom: 20px; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 12px 15px; text-align: right; border-bottom: 1px solid #ecf0f1; }}
        th {{ background: #f8f9fa; font-weight: 600; color: #555; font-size: 13px; }}
        td:first-child, th:first-child {{ text-align: left; }}
        tr:hover {{ background: #f8f9fa; }}
        .profit {{ color: #e74c3c; }}
        .loss {{ color: #27ae60; }}
        .tx-type-buy {{ color: #27ae60; }}
        .tx-type-sell {{ color: #e74c3c; }}
        .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 投资组合报告 - {portfolio['name']}</h1>
            <div class="meta">
                导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 
                描述: {portfolio.get('description', '无')}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">持仓数量</div>
                <div class="value">{summary['total_positions']}</div>
            </div>
            <div class="summary-card">
                <div class="label">总成本</div>
                <div class="value">¥{format_number(summary['total_cost'])}</div>
            </div>
            <div class="summary-card">
                <div class="label">总市值</div>
                <div class="value">¥{format_number(summary['total_value'])}</div>
            </div>
            <div class="summary-card">
                <div class="label">浮动盈亏</div>
                <div class="value {pnl_class(summary['total_pnl'])}">¥{format_number(summary['total_pnl'])}</div>
            </div>
            <div class="summary-card">
                <div class="label">盈亏比例</div>
                <div class="value {pnl_class(summary['total_pnl_percent'])}">{format_number(summary['total_pnl_percent'])}%</div>
            </div>
            <div class="summary-card">
                <div class="label">已实现盈亏</div>
                <div class="value {pnl_class(pnl_summary['total_realized_pnl'])}">¥{format_number(pnl_summary['total_realized_pnl'])}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📈 持仓明细</h2>
            <table>
                <thead>
                    <tr>
                        <th>股票代码</th>
                        <th>股票名称</th>
                        <th>持仓股数</th>
                        <th>平均成本</th>
                        <th>当前价格</th>
                        <th>市值</th>
                        <th>成本金额</th>
                        <th>浮动盈亏</th>
                        <th>盈亏比例</th>
                        <th>今日涨跌幅</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    for pos in positions:
        html += f"""
                    <tr>
                        <td>{pos['stock_code']}</td>
                        <td>{pos['stock_name']}</td>
                        <td>{pos['total_shares']:,}</td>
                        <td>{pos['avg_cost']:.4f}</td>
                        <td>{pos['current_price']:.4f}</td>
                        <td>¥{format_number(pos['market_value'])}</td>
                        <td>¥{format_number(pos['cost_basis'])}</td>
                        <td class="{pnl_class(pos['unrealized_pnl'])}">¥{format_number(pos['unrealized_pnl'])}</td>
                        <td class="{pnl_class(pos['pnl_percent'])}">{format_number(pos['pnl_percent'])}%</td>
                        <td class="{pnl_class(pos['change_today'])}">{format_number(pos['change_today'])}%</td>
                    </tr>
"""
    
    html += f"""
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>💰 交易统计</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="label">交易次数</div>
                    <div class="value">{pnl_summary['trade_count']}</div>
                </div>
                <div class="summary-card">
                    <div class="label">盈利次数</div>
                    <div class="value profit">{pnl_summary['win_count']}</div>
                </div>
                <div class="summary-card">
                    <div class="label">亏损次数</div>
                    <div class="value loss">{pnl_summary['loss_count']}</div>
                </div>
                <div class="summary-card">
                    <div class="label">胜率</div>
                    <div class="value">{format_number(pnl_summary['win_rate'])}%</div>
                </div>
                <div class="summary-card">
                    <div class="label">平均盈利</div>
                    <div class="value profit">¥{format_number(pnl_summary['avg_win'])}</div>
                </div>
                <div class="summary-card">
                    <div class="label">平均亏损</div>
                    <div class="value loss">¥{format_number(pnl_summary['avg_loss'])}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📝 最近交易记录</h2>
            <table>
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>股票代码</th>
                        <th>类型</th>
                        <th>股数</th>
                        <th>价格</th>
                        <th>金额</th>
                        <th>手续费</th>
                        <th>实现盈亏</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    for tx in transactions:
        tx_type = tx['transaction_type']
        tx_class = 'tx-type-buy' if tx_type == 'BUY' else 'tx-type-sell'
        tx_type_cn = '买入' if tx_type == 'BUY' else '卖出'
        html += f"""
                    <tr>
                        <td>{tx['transaction_date']}</td>
                        <td>{tx['stock_code']}</td>
                        <td class="{tx_class}">{tx_type_cn}</td>
                        <td>{tx['shares']:,}</td>
                        <td>{tx['price']:.4f}</td>
                        <td>¥{format_number(tx['amount'])}</td>
                        <td>¥{format_number(tx['fee'] or 0)}</td>
                        <td class="{pnl_class(tx.get('realized_pnl', 0) or 0)}">{f'¥{format_number(tx["realized_pnl"])}' if tx.get('realized_pnl') is not None else '-'}</td>
                    </tr>
"""
    
    html += f"""
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            由 Stock Portfolio Manager 生成 | © {datetime.now().year}
        </div>
    </div>
</body>
</html>
"""
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return str(path)


def export_transactions_to_csv(portfolio_id: int, output_path: str) -> str:
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise ValueError(f"Portfolio not found: {portfolio_id}")
    
    transactions = list_transactions(portfolio_id, limit=10000)
    
    path = Path(output_path)
    if path.is_dir():
        filename = f"transactions_{portfolio['name']}_{datetime.now().strftime('%Y%m%d')}.csv"
        path = path / filename
    
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["日期", "股票代码", "类型", "股数", "价格", "金额", "手续费", "实现盈亏", "备注"])
        
        for tx in transactions:
            tx_type_cn = '买入' if tx['transaction_type'] == 'BUY' else '卖出'
            writer.writerow([
                tx['transaction_date'],
                tx['stock_code'],
                tx_type_cn,
                tx['shares'],
                tx['price'],
                tx['amount'],
                tx.get('fee', 0) or 0,
                tx.get('realized_pnl', '') if tx.get('realized_pnl') is not None else '',
                tx.get('notes', ''),
            ])
    
    return str(path)
