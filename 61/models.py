from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
import json
import os

@dataclass
class Stock:
    code: str
    name: str
    price: float
    industry: str = ""
    volatility: float = 0.03

@dataclass
class Position:
    stock_code: str
    quantity: int
    avg_cost: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@dataclass
class TradeRecord:
    timestamp: datetime
    trade_type: str
    stock_code: str
    stock_name: str
    quantity: int
    price: float
    amount: float
    fee: float
    profit_loss: float = 0.0

@dataclass
class Dividend:
    stock_code: str
    ex_date: str
    cash_per_share: float = 0.0
    stock_dividend_ratio: float = 0.0
    processed: bool = False

@dataclass
class Account:
    name: str
    cash: float
    positions: Dict[str, Position] = field(default_factory=dict)
    trade_history: List[TradeRecord] = field(default_factory=list)
    asset_history: List[tuple] = field(default_factory=list)
    daily_snapshots: Dict[str, float] = field(default_factory=dict)
    fee_rate: float = 0.0003
    min_fee: float = 5.0
    created_at: datetime = field(default_factory=datetime.now)

    def calculate_fee(self, amount: float) -> float:
        fee = amount * self.fee_rate
        return max(fee, self.min_fee)

    def save(self, filepath: str):
        data = {
            "name": self.name,
            "cash": self.cash,
            "positions": {
                code: {
                    "stock_code": pos.stock_code,
                    "quantity": pos.quantity,
                    "avg_cost": pos.avg_cost,
                    "stop_loss": pos.stop_loss,
                    "take_profit": pos.take_profit
                } for code, pos in self.positions.items()
            },
            "trade_history": [
                {
                    "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "trade_type": t.trade_type,
                    "stock_code": t.stock_code,
                    "stock_name": t.stock_name,
                    "quantity": t.quantity,
                    "price": t.price,
                    "amount": t.amount,
                    "fee": t.fee,
                    "profit_loss": t.profit_loss
                } for t in self.trade_history
            ],
            "asset_history": [
                (ts.strftime("%Y-%m-%d %H:%M:%S"), value) for ts, value in self.asset_history
            ],
            "daily_snapshots": self.daily_snapshots,
            "fee_rate": self.fee_rate,
            "min_fee": self.min_fee,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, filepath: str) -> 'Account':
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        account = cls(
            name=data["name"],
            cash=data["cash"],
            fee_rate=data.get("fee_rate", 0.0003),
            min_fee=data.get("min_fee", 5.0),
            created_at=datetime.strptime(data["created_at"], "%Y-%m-%d %H:%M:%S")
        )
        account.positions = {
            code: Position(
                stock_code=pos["stock_code"],
                quantity=pos["quantity"],
                avg_cost=pos["avg_cost"],
                stop_loss=pos.get("stop_loss"),
                take_profit=pos.get("take_profit")
            ) for code, pos in data["positions"].items()
        }
        account.trade_history = [
            TradeRecord(
                timestamp=datetime.strptime(t["timestamp"], "%Y-%m-%d %H:%M:%S"),
                trade_type=t["trade_type"],
                stock_code=t["stock_code"],
                stock_name=t["stock_name"],
                quantity=t["quantity"],
                price=t["price"],
                amount=t["amount"],
                fee=t["fee"],
                profit_loss=t.get("profit_loss", 0.0)
            ) for t in data["trade_history"]
        ]
        account.asset_history = [
            (datetime.strptime(ts, "%Y-%m-%d %H:%M:%S"), value) for ts, value in data["asset_history"]
        ]
        account.daily_snapshots = data.get("daily_snapshots", {})
        return account
