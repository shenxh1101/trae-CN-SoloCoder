import csv
import os
from datetime import datetime
from models import Account

class DataExporter:
    @staticmethod
    def export_trade_history(account: Account, output_dir: str = None) -> str:
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "exports")
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{account.name}_交易记录_{timestamp}.csv"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '交易时间', '交易类型', '股票代码', '股票名称',
                '数量', '成交价', '成交金额', '手续费', '盈亏'
            ])

            for trade in account.trade_history:
                writer.writerow([
                    trade.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    trade.trade_type,
                    trade.stock_code,
                    trade.stock_name,
                    trade.quantity,
                    f"{trade.price:.2f}",
                    f"{trade.amount:.2f}",
                    f"{trade.fee:.2f}",
                    f"{trade.profit_loss:.2f}"
                ])

        return filepath

    @staticmethod
    def export_positions(account: Account, stock_engine, output_dir: str = None) -> str:
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "exports")
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{account.name}_持仓_{timestamp}.csv"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '股票代码', '股票名称', '持仓数量', '成本价',
                '当前价', '市值', '盈亏金额', '盈亏百分比'
            ])

            for code, position in account.positions.items():
                stock = stock_engine.get_stock(code)
                if stock:
                    current_value = position.quantity * stock.price
                    cost_value = position.quantity * position.avg_cost
                    profit_loss = current_value - cost_value
                    profit_percent = ((stock.price - position.avg_cost) / position.avg_cost) * 100

                    writer.writerow([
                        code,
                        stock.name,
                        position.quantity,
                        f"{position.avg_cost:.2f}",
                        f"{stock.price:.2f}",
                        f"{current_value:.2f}",
                        f"{profit_loss:.2f}",
                        f"{profit_percent:.2f}%"
                    ])

        return filepath

    @staticmethod
    def export_asset_history(account: Account, output_dir: str = None) -> str:
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "exports")
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{account.name}_资产历史_{timestamp}.csv"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['时间', '总资产', '收益率(%)'])

            initial_value = 100000.0
            for ts, value in account.asset_history:
                return_rate = ((value - initial_value) / initial_value) * 100
                writer.writerow([
                    ts.strftime("%Y-%m-%d %H:%M:%S"),
                    f"{value:.2f}",
                    f"{return_rate:.2f}"
                ])

        return filepath
