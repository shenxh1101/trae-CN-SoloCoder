import os
import csv
from datetime import datetime
from typing import Dict, List, Any
from stock import Stock


class ReportExporter:
    @staticmethod
    def export_daily_csv(stocks: List[Stock], filepath: str = None) -> str:
        if filepath is None:
            today = datetime.now().strftime("%Y%m%d")
            filepath = f"stock_report_{today}.csv"
        
        headers = [
            "代码", "名称", "市场", "分组", "当前价", "涨跌幅%", "涨跌额",
            "今开", "最高", "最低", "昨收", "成交量", "成交额",
            "成本价", "持仓数", "市值", "成本", "持仓盈亏", "盈亏%",
            "MA5", "MA10", "MA5位置", "MA10位置"
        ]
        
        try:
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                
                for stock in stocks:
                    writer.writerow({
                        "代码": stock.code,
                        "名称": stock.name,
                        "市场": stock.market,
                        "分组": stock.group,
                        "当前价": stock.current_price,
                        "涨跌幅%": round(stock.change_percent, 2),
                        "涨跌额": round(stock.change_amount, 2),
                        "今开": stock.open_price,
                        "最高": stock.high_price,
                        "最低": stock.low_price,
                        "昨收": stock.prev_close,
                        "成交量": stock.volume,
                        "成交额": stock.turnover,
                        "成本价": stock.cost_price,
                        "持仓数": stock.shares,
                        "市值": round(stock.market_value, 2),
                        "成本": round(stock.cost_value, 2),
                        "持仓盈亏": round(stock.profit_loss, 2),
                        "盈亏%": round(stock.profit_loss_percent, 2),
                        "MA5": round(stock.ma5, 2),
                        "MA10": round(stock.ma10, 2),
                        "MA5位置": stock.position_vs_ma5,
                        "MA10位置": stock.position_vs_ma10
                    })
            
            return filepath
        except Exception as e:
            return f"导出失败: {e}"

    @staticmethod
    def export_daily_html(stocks: List[Stock], filepath: str = None, 
                          groups: Dict[str, List[str]] = None) -> str:
        if filepath is None:
            today = datetime.now().strftime("%Y%m%d")
            filepath = f"stock_report_{today}.html"
        
        total_value = sum(s.market_value for s in stocks)
        total_cost = sum(s.cost_value for s in stocks)
        total_pl = sum(s.profit_loss for s in stocks)
        total_pl_pct = ((total_value - total_cost) / total_cost) * 100 if total_cost > 0 else 0
        
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>股票盯盘日报 - {datetime.now().strftime('%Y-%m-%d')}</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        h1 {{ color: #333; text-align: center; }}
        .summary {{ background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .summary-item {{ display: inline-block; margin-right: 40px; font-size: 16px; }}
        .summary-value {{ font-size: 24px; font-weight: bold; }}
        .profit {{ color: #e74c3c; }}
        .loss {{ color: #27ae60; }}
        table {{ width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }}
        th, td {{ padding: 12px; text-align: right; border-bottom: 1px solid #ddd; }}
        th {{ background: #3498db; color: white; text-align: center; }}
        td:first-child, td:nth-child(2) {{ text-align: left; }}
        tr:hover {{ background: #f9f9f9; }}
        .group-title {{ background: #2c3e50; color: white; padding: 10px; border-radius: 4px; margin-top: 20px; margin-bottom: 10px; }}
        .time {{ text-align: center; color: #666; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <h1>📈 股票盯盘日报</h1>
    <div class="time">生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
    
    <div class="summary">
        <div class="summary-item">
            <div>持仓市值</div>
            <div class="summary-value">¥{total_value:,.2f}</div>
        </div>
        <div class="summary-item">
            <div>持仓成本</div>
            <div class="summary-value">¥{total_cost:,.2f}</div>
        </div>
        <div class="summary-item">
            <div>总盈亏</div>
            <div class="summary-value {'profit' if total_pl >= 0 else 'loss'}">¥{total_pl:+,.2f}</div>
        </div>
        <div class="summary-item">
            <div>盈亏比例</div>
            <div class="summary-value {'profit' if total_pl_pct >= 0 else 'loss'}">{total_pl_pct:+,.2f}%</div>
        </div>
        <div class="summary-item">
            <div>股票数量</div>
            <div class="summary-value">{len(stocks)} 只</div>
        </div>
    </div>
"""
        
        if groups:
            for group_name, stock_codes in groups.items():
                group_stocks = [s for s in stocks if s.code in stock_codes]
                if not group_stocks:
                    continue
                    
                group_value = sum(s.market_value for s in group_stocks)
                group_cost = sum(s.cost_value for s in group_stocks)
                group_pl = sum(s.profit_loss for s in group_stocks)
                group_pl_pct = ((group_value - group_cost) / group_cost) * 100 if group_cost > 0 else 0
                
                html += f"""
    <div class="group-title">
        📊 {group_name} (市值: ¥{group_value:,.2f} | 盈亏: <span class="{'profit' if group_pl >= 0 else 'loss'}">{group_pl:+,.2f} ({group_pl_pct:+,.2f}%)</span>)
    </div>
    <table>
        <tr>
            <th>代码</th>
            <th>名称</th>
            <th>当前价</th>
            <th>涨跌幅</th>
            <th>涨跌额</th>
            <th>今开</th>
            <th>最高</th>
            <th>最低</th>
            <th>昨收</th>
            <th>成交量</th>
            <th>成交额</th>
            <th>成本价</th>
            <th>持仓盈亏</th>
            <th>盈亏%</th>
            <th>MA5</th>
            <th>MA10</th>
        </tr>
"""
                for stock in group_stocks:
                    change_class = "profit" if stock.change_percent >= 0 else "loss"
                    pl_class = "profit" if stock.profit_loss >= 0 else "loss"
                    
                    html += f"""
        <tr>
            <td>{stock.code}</td>
            <td>{stock.name}</td>
            <td>{stock.current_price:.2f}</td>
            <td class="{change_class}">{stock.change_percent:+.2f}%</td>
            <td class="{change_class}">{stock.change_amount:+.2f}</td>
            <td>{stock.open_price:.2f}</td>
            <td>{stock.high_price:.2f}</td>
            <td>{stock.low_price:.2f}</td>
            <td>{stock.prev_close:.2f}</td>
            <td>{stock.volume:,}</td>
            <td>{stock.turnover:,.0f}</td>
            <td>{stock.cost_price:.2f}</td>
            <td class="{pl_class}">{stock.profit_loss:+,.2f}</td>
            <td class="{pl_class}">{stock.profit_loss_percent:+.2f}%</td>
            <td>{stock.ma5:.2f}</td>
            <td>{stock.ma10:.2f}</td>
        </tr>
"""
                html += "    </table>\n"
        else:
            html += """
    <table>
        <tr>
            <th>代码</th>
            <th>名称</th>
            <th>当前价</th>
            <th>涨跌幅</th>
            <th>涨跌额</th>
            <th>今开</th>
            <th>最高</th>
            <th>最低</th>
            <th>昨收</th>
            <th>成交量</th>
            <th>成交额</th>
            <th>成本价</th>
            <th>持仓盈亏</th>
            <th>盈亏%</th>
        </tr>
"""
            for stock in stocks:
                change_class = "profit" if stock.change_percent >= 0 else "loss"
                pl_class = "profit" if stock.profit_loss >= 0 else "loss"
                
                html += f"""
        <tr>
            <td>{stock.code}</td>
            <td>{stock.name}</td>
            <td>{stock.current_price:.2f}</td>
            <td class="{change_class}">{stock.change_percent:+.2f}%</td>
            <td class="{change_class}">{stock.change_amount:+.2f}</td>
            <td>{stock.open_price:.2f}</td>
            <td>{stock.high_price:.2f}</td>
            <td>{stock.low_price:.2f}</td>
            <td>{stock.prev_close:.2f}</td>
            <td>{stock.volume:,}</td>
            <td>{stock.turnover:,.0f}</td>
            <td>{stock.cost_price:.2f}</td>
            <td class="{pl_class}">{stock.profit_loss:+,.2f}</td>
            <td class="{pl_class}">{stock.profit_loss_percent:+.2f}%</td>
        </tr>
"""
            html += "    </table>\n"
        
        html += """
</body>
</html>
"""
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html)
            return filepath
        except Exception as e:
            return f"导出失败: {e}"

    @staticmethod
    def export_historical_csv(data: List[Dict[str, Any]], code: str, 
                               start_date: str, end_date: str) -> str:
        today = datetime.now().strftime("%Y%m%d")
        filepath = f"{code}_historical_{start_date}_{end_date}.csv".replace("-", "")
        
        headers = ["日期", "开盘", "最高", "最低", "收盘", "成交量", "MA5", "MA10", "MA20"]
        
        try:
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                
                for item in data:
                    writer.writerow({
                        "日期": item.get("date", ""),
                        "开盘": item.get("open", 0),
                        "最高": item.get("high", 0),
                        "最低": item.get("low", 0),
                        "收盘": item.get("close", 0),
                        "成交量": item.get("volume", 0),
                        "MA5": item.get("ma5", ""),
                        "MA10": item.get("ma10", ""),
                        "MA20": item.get("ma20", "")
                    })
            
            return filepath
        except Exception as e:
            return f"导出失败: {e}"
