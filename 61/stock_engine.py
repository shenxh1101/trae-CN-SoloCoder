import random
import time
from datetime import datetime
from typing import Dict, List
from models import Stock, Dividend

class StockEngine:
    def __init__(self):
        self.stocks: Dict[str, Stock] = {}
        self.price_history: Dict[str, List[tuple]] = {}
        self.dividends: List[Dividend] = []
        self._init_stocks()
        self._init_dividends()

    def _init_stocks(self):
        preset_stocks = [
            Stock("600519", "贵州茅台", 1680.00, "白酒", 0.02),
            Stock("000858", "五粮液", 158.50, "白酒", 0.025),
            Stock("300750", "宁德时代", 215.80, "新能源", 0.035),
            Stock("002594", "比亚迪", 268.00, "新能源汽车", 0.03),
            Stock("601318", "中国平安", 45.20, "保险", 0.02),
            Stock("600036", "招商银行", 38.50, "银行", 0.018),
            Stock("000333", "美的集团", 62.30, "家电", 0.022),
            Stock("600900", "长江电力", 32.80, "电力", 0.015),
            Stock("300059", "东方财富", 21.50, "证券", 0.03),
            Stock("600570", "恒生电子", 85.60, "金融科技", 0.028),
        ]
        for stock in preset_stocks:
            self.stocks[stock.code] = stock
            self.price_history[stock.code] = [(datetime.now(), stock.price)]

    def _init_dividends(self):
        self.dividends = [
            Dividend("600519", "2026-06-15", cash_per_share=28.50),
            Dividend("000858", "2026-06-20", cash_per_share=8.50),
            Dividend("300750", "2026-07-01", cash_per_share=12.00, stock_dividend_ratio=0.1),
            Dividend("002594", "2026-06-25", cash_per_share=5.80),
            Dividend("601318", "2026-06-10", cash_per_share=3.20),
            Dividend("600036", "2026-06-05", cash_per_share=6.20),
            Dividend("000333", "2026-06-18", cash_per_share=10.50),
            Dividend("600900", "2026-06-12", cash_per_share=4.80),
            Dividend("300059", "2026-06-22", cash_per_share=1.50),
            Dividend("600570", "2026-06-30", cash_per_share=2.80, stock_dividend_ratio=0.15),
        ]

    def update_prices(self):
        current_time = datetime.now()
        for code, stock in self.stocks.items():
            change = random.uniform(-stock.volatility, stock.volatility)
            new_price = stock.price * (1 + change)
            new_price = max(new_price, round(new_price, 2))
            stock.price = new_price
            self.price_history[code].append((current_time, new_price))
            if len(self.price_history[code]) > 1000:
                self.price_history[code] = self.price_history[code][-1000:]

    def get_stock(self, code: str) -> Stock:
        return self.stocks.get(code)

    def get_all_stocks(self) -> List[Stock]:
        return list(self.stocks.values())

    def get_price_history(self, code: str) -> List[tuple]:
        return self.price_history.get(code, [])

    def check_dividends(self, account, current_date=None):
        if current_date is None:
            current_date = datetime.now().strftime("%Y-%m-%d")
        processed = []
        for dividend in self.dividends:
            if dividend.processed:
                continue
            if dividend.ex_date <= current_date:
                if dividend.stock_code in account.positions:
                    position = account.positions[dividend.stock_code]
                    if dividend.cash_per_share > 0:
                        cash_dividend = position.quantity * dividend.cash_per_share
                        account.cash += cash_dividend
                    if dividend.stock_dividend_ratio > 0:
                        new_shares = int(position.quantity * dividend.stock_dividend_ratio)
                        position.quantity += new_shares
                dividend.processed = True
                processed.append(dividend)
        return processed
