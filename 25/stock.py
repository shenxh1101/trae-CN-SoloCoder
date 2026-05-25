from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class Stock:
    code: str
    name: str
    cost_price: float = 0.0
    group: str = "默认"
    shares: int = 0
    
    current_price: float = 0.0
    change_percent: float = 0.0
    change_amount: float = 0.0
    open_price: float = 0.0
    high_price: float = 0.0
    low_price: float = 0.0
    prev_close: float = 0.0
    volume: int = 0
    turnover: float = 0.0
    
    ma5: float = 0.0
    ma10: float = 0.0
    
    last_update: datetime = field(default_factory=datetime.now)
    price_history: List[Dict[str, Any]] = field(default_factory=list)
    
    market: str = field(init=False)
    
    def __post_init__(self):
        self.market = self._detect_market()
    
    def _detect_market(self) -> str:
        code = self.code.upper()
        if code.startswith("SH") or code.startswith("SZ"):
            return "A股"
        elif code.startswith("HK"):
            return "港股"
        elif len(code) == 6:
            if code.startswith("6"):
                return "A股"
            elif code.startswith("0") or code.startswith("3"):
                return "A股"
        elif len(code) == 5 and code.isdigit():
            return "港股"
        return "未知"
    
    @property
    def profit_loss(self) -> float:
        if self.cost_price <= 0 or self.current_price <= 0:
            return 0.0
        return (self.current_price - self.cost_price) * max(self.shares, 1)
    
    @property
    def profit_loss_percent(self) -> float:
        if self.cost_price <= 0 or self.current_price <= 0:
            return 0.0
        return ((self.current_price - self.cost_price) / self.cost_price) * 100
    
    @property
    def market_value(self) -> float:
        return self.current_price * max(self.shares, 1)
    
    @property
    def cost_value(self) -> float:
        return self.cost_price * max(self.shares, 1)
    
    @property
    def position_vs_ma5(self) -> str:
        if self.ma5 <= 0 or self.current_price <= 0:
            return "未知"
        diff = ((self.current_price - self.ma5) / self.ma5) * 100
        if self.current_price > self.ma5:
            return f"高于MA5 {diff:.2f}%"
        elif self.current_price < self.ma5:
            return f"低于MA5 {abs(diff):.2f}%"
        return "等于MA5"
    
    @property
    def position_vs_ma10(self) -> str:
        if self.ma10 <= 0 or self.current_price <= 0:
            return "未知"
        diff = ((self.current_price - self.ma10) / self.ma10) * 100
        if self.current_price > self.ma10:
            return f"高于MA10 {diff:.2f}%"
        elif self.current_price < self.ma10:
            return f"低于MA10 {abs(diff):.2f}%"
        return "等于MA10"
    
    def update_price(self, price_data: Dict[str, Any]) -> None:
        self.current_price = float(price_data.get("current", self.current_price))
        self.change_percent = float(price_data.get("change_percent", self.change_percent))
        self.change_amount = float(price_data.get("change_amount", self.change_amount))
        self.open_price = float(price_data.get("open", self.open_price))
        self.high_price = float(price_data.get("high", self.high_price))
        self.low_price = float(price_data.get("low", self.low_price))
        self.prev_close = float(price_data.get("prev_close", self.prev_close))
        self.volume = int(price_data.get("volume", self.volume))
        self.turnover = float(price_data.get("turnover", self.turnover))
        self.name = price_data.get("name", self.name)
        self.last_update = datetime.now()
        
        minute_data = price_data.get("minute_data", [])
        if minute_data:
            self.price_history = minute_data
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "cost_price": self.cost_price,
            "group": self.group,
            "shares": self.shares
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Stock":
        return cls(
            code=data["code"],
            name=data.get("name", ""),
            cost_price=data.get("cost_price", 0.0),
            group=data.get("group", "默认"),
            shares=data.get("shares", 0)
        )
    
    def __str__(self) -> str:
        return f"{self.code} {self.name} {self.current_price:.2f} ({self.change_percent:+.2f}%)"
