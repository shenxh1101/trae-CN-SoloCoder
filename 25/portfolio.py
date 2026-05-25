from typing import Dict, List, Any, Optional
from collections import defaultdict
from stock import Stock
from config import ConfigManager


class Portfolio:
    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.stocks: Dict[str, Stock] = {}
        self.groups: Dict[str, List[str]] = defaultdict(list)
        self._load_from_config()

    def _load_from_config(self) -> None:
        config = self.config_manager.get_config()
        
        stocks_data = config.get("stocks", [])
        for stock_data in stocks_data:
            try:
                stock = Stock.from_dict(stock_data)
                self.stocks[stock.code] = stock
            except Exception as e:
                print(f"加载股票数据失败: {e}")
        
        groups_data = config.get("groups", {"默认": []})
        for group_name, stock_codes in groups_data.items():
            self.groups[group_name] = stock_codes
            
        for code, stock in self.stocks.items():
            found = False
            for group_name, codes in self.groups.items():
                if code in codes:
                    stock.group = group_name
                    found = True
                    break
            if not found:
                stock.group = "默认"
                self.groups["默认"].append(code)

    def _save_to_config(self) -> None:
        config = self.config_manager.get_config()
        
        config["stocks"] = [stock.to_dict() for stock in self.stocks.values()]
        config["groups"] = dict(self.groups)
        
        self.config_manager.save_config(config)

    def add_stock(self, code: str, name: str = "", cost_price: float = 0.0, 
                  group: str = "默认", shares: int = 0) -> bool:
        if code in self.stocks:
            return False
            
        stock = Stock(code=code, name=name, cost_price=cost_price, 
                     group=group, shares=shares)
        self.stocks[code] = stock
        
        if group not in self.groups:
            self.groups[group] = []
        if code not in self.groups[group]:
            self.groups[group].append(code)
            
        self._save_to_config()
        return True

    def remove_stock(self, code: str) -> bool:
        if code not in self.stocks:
            return False
            
        stock = self.stocks[code]
        group = stock.group
        
        if group in self.groups and code in self.groups[group]:
            self.groups[group].remove(code)
            
        del self.stocks[code]
        self._save_to_config()
        return True

    def update_stock(self, code: str, **kwargs) -> bool:
        if code not in self.stocks:
            return False
            
        stock = self.stocks[code]
        
        if "cost_price" in kwargs:
            stock.cost_price = float(kwargs["cost_price"])
        if "name" in kwargs:
            stock.name = kwargs["name"]
        if "shares" in kwargs:
            stock.shares = int(kwargs["shares"])
        if "group" in kwargs:
            new_group = kwargs["group"]
            old_group = stock.group
            
            if old_group in self.groups and code in self.groups[old_group]:
                self.groups[old_group].remove(code)
            
            if new_group not in self.groups:
                self.groups[new_group] = []
            if code not in self.groups[new_group]:
                self.groups[new_group].append(code)
                
            stock.group = new_group
            
        self._save_to_config()
        return True

    def add_group(self, group_name: str) -> bool:
        if group_name in self.groups:
            return False
        self.groups[group_name] = []
        self._save_to_config()
        return True

    def remove_group(self, group_name: str) -> bool:
        if group_name == "默认" or group_name not in self.groups:
            return False
            
        stock_codes = self.groups[group_name]
        for code in stock_codes:
            if code in self.stocks:
                self.stocks[code].group = "默认"
                if code not in self.groups["默认"]:
                    self.groups["默认"].append(code)
                    
        del self.groups[group_name]
        self._save_to_config()
        return True

    def get_stock(self, code: str) -> Optional[Stock]:
        return self.stocks.get(code)

    def get_all_stocks(self) -> List[Stock]:
        return list(self.stocks.values())

    def get_stocks_by_group(self, group_name: str) -> List[Stock]:
        codes = self.groups.get(group_name, [])
        return [self.stocks[code] for code in codes if code in self.stocks]

    def get_groups(self) -> List[str]:
        return list(self.groups.keys())

    def get_total_profit_loss(self) -> float:
        return sum(stock.profit_loss for stock in self.stocks.values())

    def get_total_profit_loss_percent(self) -> float:
        total_cost = sum(stock.cost_value for stock in self.stocks.values())
        total_market = sum(stock.market_value for stock in self.stocks.values())
        if total_cost <= 0:
            return 0.0
        return ((total_market - total_cost) / total_cost) * 100

    def get_total_cost(self) -> float:
        return sum(stock.cost_value for stock in self.stocks.values())

    def get_total_market_value(self) -> float:
        return sum(stock.market_value for stock in self.stocks.values())

    def get_group_summary(self, group_name: str) -> Dict[str, Any]:
        stocks = self.get_stocks_by_group(group_name)
        total_cost = sum(stock.cost_value for stock in stocks)
        total_market = sum(stock.market_value for stock in stocks)
        total_pl = sum(stock.profit_loss for stock in stocks)
        pl_percent = ((total_market - total_cost) / total_cost) * 100 if total_cost > 0 else 0.0
        
        return {
            "group_name": group_name,
            "stock_count": len(stocks),
            "total_cost": total_cost,
            "total_market_value": total_market,
            "total_profit_loss": total_pl,
            "profit_loss_percent": pl_percent
        }

    def get_stock_codes(self) -> List[str]:
        return list(self.stocks.keys())

    def __len__(self) -> int:
        return len(self.stocks)

    def __contains__(self, code: str) -> bool:
        return code in self.stocks
