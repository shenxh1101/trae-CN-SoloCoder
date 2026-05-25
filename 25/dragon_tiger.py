from typing import Dict, List, Any
from tabulate import tabulate
from api_client import StockAPIClient


class DragonTigerBoard:
    def __init__(self, api_client: StockAPIClient):
        self.api_client = api_client

    def get_limits_up(self, market: str = "SH", limit: int = 20) -> List[Dict[str, Any]]:
        data = self.api_client.get_dragon_tiger_data(market, limit * 2)
        result = data.get("limit_up", [])
        
        filtered = []
        for item in result:
            if item.get("change_percent", 0) >= 9.9:
                filtered.append(item)
                
        return filtered[:limit]

    def get_limits_down(self, market: str = "SH", limit: int = 20) -> List[Dict[str, Any]]:
        data = self.api_client.get_dragon_tiger_data(market, limit * 2)
        return data.get("limit_down", [])[:limit]

    def get_top_amplitude(self, market: str = "SH", limit: int = 20) -> List[Dict[str, Any]]:
        data = self.api_client.get_dragon_tiger_data(market, limit)
        return data.get("amplitude", [])[:limit]

    def get_top_turnover(self, market: str = "SH", limit: int = 20) -> List[Dict[str, Any]]:
        data = self.api_client.get_dragon_tiger_data(market, limit)
        return data.get("turnover", [])[:limit]

    def display_table(self, data: List[Dict[str, Any]], title: str, 
                     show_extra: bool = True) -> str:
        if not data:
            return f"{title}: 暂无数据"
            
        headers = ["排名", "代码", "名称", "现价", "涨跌幅", "涨跌额", 
                   "今开", "最高", "最低"]
        if show_extra:
            headers.extend(["振幅", "换手率"])
            
        rows = []
        for idx, item in enumerate(data, 1):
            change_pct = item.get("change_percent", 0)
            change_str = f"{change_pct:+.2f}%"
            
            row = [
                idx,
                item.get("code", ""),
                item.get("name", ""),
                f"{item.get('current', 0):.2f}",
                change_str,
                f"{item.get('change_amount', 0):+.2f}",
                f"{item.get('open', 0):.2f}",
                f"{item.get('high', 0):.2f}",
                f"{item.get('low', 0):.2f}",
            ]
            if show_extra:
                row.extend([
                    f"{item.get('amplitude', 0):.2f}%",
                    f"{item.get('turnover_ratio', 0):.2f}%"
                ])
            rows.append(row)
        
        output = [f"\n{'=' * 60}", f"{title:^60}", f"{'=' * 60}"]
        output.append(tabulate(rows, headers=headers, tablefmt="simple"))
        output.append("")
        
        return "\n".join(output)

    def display_all(self, market: str = "SH", limit: int = 10) -> str:
        output = []
        
        limit_up = self.get_limits_up(market, limit)
        output.append(self.display_table(limit_up, "涨停股票", show_extra=False))
        
        limit_down = self.get_limits_down(market, limit)
        output.append(self.display_table(limit_down, "跌停股票", show_extra=False))
        
        amplitude = self.get_top_amplitude(market, limit)
        output.append(self.display_table(amplitude, "振幅榜 TOP{}".format(limit)))
        
        turnover = self.get_top_turnover(market, limit)
        output.append(self.display_table(turnover, "换手率榜 TOP{}".format(limit)))
        
        return "\n".join(output)

    def display_summary(self, market: str = "SH") -> str:
        limit_up = self.get_limits_up(market, 100)
        limit_down = self.get_limits_down(market, 100)
        
        output = [
            "\n" + "=" * 60,
            f"{'市场概览':^60}",
            "=" * 60,
            f"涨停股票数量: {len(limit_up)} 只",
            f"跌停股票数量: {len(limit_down)} 只",
            "=" * 60
        ]
        
        if limit_up:
            output.append("\n涨停前十:")
            for idx, item in enumerate(limit_up[:10], 1):
                output.append(f"  {idx:2d}. {item['code']} {item['name']} "
                             f"{item['change_percent']:+.2f}%")
        
        if limit_down:
            output.append("\n跌停前十:")
            for idx, item in enumerate(limit_down[:10], 1):
                output.append(f"  {idx:2d}. {item['code']} {item['name']} "
                             f"{item['change_percent']:+.2f}%")
        
        output.append("")
        return "\n".join(output)
