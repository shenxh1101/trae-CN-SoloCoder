from datetime import datetime
from typing import Optional, Tuple
from models import Account, Position, TradeRecord
from stock_engine import StockEngine

class TradingEngine:
    def __init__(self, stock_engine: StockEngine):
        self.stock_engine = stock_engine

    def buy(self, account: Account, stock_code: str, quantity: int) -> Tuple[bool, str]:
        stock = self.stock_engine.get_stock(stock_code)
        if not stock:
            return False, f"股票 {stock_code} 不存在"

        if quantity <= 0 or quantity % 100 != 0:
            return False, "买入数量必须为正且是100的整数倍"

        total_amount = stock.price * quantity
        fee = account.calculate_fee(total_amount)
        total_cost = total_amount + fee

        if account.cash < total_cost:
            return False, f"资金不足！需要 {total_cost:.2f} 元，当前 {account.cash:.2f} 元"

        account.cash -= total_cost

        if stock_code in account.positions:
            position = account.positions[stock_code]
            total_quantity = position.quantity + quantity
            total_cost_value = position.avg_cost * position.quantity + stock.price * quantity
            position.avg_cost = total_cost_value / total_quantity
            position.quantity = total_quantity
        else:
            account.positions[stock_code] = Position(
                stock_code=stock_code,
                quantity=quantity,
                avg_cost=stock.price
            )

        trade_record = TradeRecord(
            timestamp=datetime.now(),
            trade_type="买入",
            stock_code=stock_code,
            stock_name=stock.name,
            quantity=quantity,
            price=stock.price,
            amount=total_amount,
            fee=fee
        )
        account.trade_history.append(trade_record)

        return True, f"成功买入 {stock.name} {quantity} 股，成交价 {stock.price:.2f} 元，花费 {total_cost:.2f} 元"

    def sell(self, account: Account, stock_code: str, quantity: int) -> Tuple[bool, str]:
        stock = self.stock_engine.get_stock(stock_code)
        if not stock:
            return False, f"股票 {stock_code} 不存在"

        if stock_code not in account.positions:
            return False, f"未持有 {stock_code} 的股票"

        position = account.positions[stock_code]
        if quantity > position.quantity:
            return False, f"持仓不足！当前持有 {position.quantity} 股，尝试卖出 {quantity} 股"

        if quantity <= 0 or quantity % 100 != 0:
            return False, "卖出数量必须为正且是100的整数倍"

        total_amount = stock.price * quantity
        fee = account.calculate_fee(total_amount)
        net_income = total_amount - fee

        profit_loss = (stock.price - position.avg_cost) * quantity

        account.cash += net_income
        position.quantity -= quantity

        if position.quantity == 0:
            del account.positions[stock_code]

        trade_record = TradeRecord(
            timestamp=datetime.now(),
            trade_type="卖出",
            stock_code=stock_code,
            stock_name=stock.name,
            quantity=quantity,
            price=stock.price,
            amount=total_amount,
            fee=fee,
            profit_loss=profit_loss
        )
        account.trade_history.append(trade_record)

        profit_str = f"盈利 {profit_loss:.2f} 元" if profit_loss >= 0 else f"亏损 {abs(profit_loss):.2f} 元"
        return True, f"成功卖出 {stock.name} {quantity} 股，成交价 {stock.price:.2f} 元，{profit_str}，净收入 {net_income:.2f} 元"

    def set_stop_loss(self, account: Account, stock_code: str, stop_loss_percent: float) -> Tuple[bool, str]:
        if stock_code not in account.positions:
            return False, f"未持有 {stock_code} 的股票"
        position = account.positions[stock_code]
        position.stop_loss = stop_loss_percent
        return True, f"已为 {stock_code} 设置止损线 {stop_loss_percent:.2f}%"

    def set_take_profit(self, account: Account, stock_code: str, take_profit_percent: float) -> Tuple[bool, str]:
        if stock_code not in account.positions:
            return False, f"未持有 {stock_code} 的股票"
        position = account.positions[stock_code]
        position.take_profit = take_profit_percent
        return True, f"已为 {stock_code} 设置止盈线 {take_profit_percent:.2f}%"

    def check_stop_loss_take_profit(self, account: Account) -> list:
        triggered_trades = []
        for stock_code in list(account.positions.keys()):
            position = account.positions[stock_code]
            stock = self.stock_engine.get_stock(stock_code)
            if not stock:
                continue

            current_profit_percent = ((stock.price - position.avg_cost) / position.avg_cost) * 100

            if position.stop_loss is not None and current_profit_percent <= -position.stop_loss:
                success, msg = self.sell(account, stock_code, position.quantity)
                if success:
                    triggered_trades.append(("止损", stock_code, msg))

            elif position.take_profit is not None and current_profit_percent >= position.take_profit:
                success, msg = self.sell(account, stock_code, position.quantity)
                if success:
                    triggered_trades.append(("止盈", stock_code, msg))

        return triggered_trades

    def calculate_total_asset(self, account: Account) -> float:
        total = account.cash
        for code, position in account.positions.items():
            stock = self.stock_engine.get_stock(code)
            if stock:
                total += position.quantity * stock.price
        return total

    def get_position_summary(self, account: Account) -> list:
        summary = []
        for code, position in account.positions.items():
            stock = self.stock_engine.get_stock(code)
            if stock:
                current_value = position.quantity * stock.price
                cost_value = position.quantity * position.avg_cost
                profit_loss = current_value - cost_value
                profit_percent = ((stock.price - position.avg_cost) / position.avg_cost) * 100
                summary.append({
                    "code": code,
                    "name": stock.name,
                    "quantity": position.quantity,
                    "avg_cost": position.avg_cost,
                    "current_price": stock.price,
                    "current_value": current_value,
                    "cost_value": cost_value,
                    "profit_loss": profit_loss,
                    "profit_percent": profit_percent,
                    "stop_loss": position.stop_loss,
                    "take_profit": position.take_profit
                })
        return sorted(summary, key=lambda x: x["profit_percent"], reverse=True)
