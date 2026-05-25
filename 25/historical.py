from typing import Dict, List, Any, Optional
from datetime import datetime
from tabulate import tabulate
from api_client import StockAPIClient


class HistoricalData:
    def __init__(self, api_client: StockAPIClient):
        self.api_client = api_client

    def get_data(self, code: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        return self.api_client.get_historical_data(code, start_date, end_date)

    def analyze_period(self, code: str, start_date: str, end_date: str) -> Dict[str, Any]:
        data = self.get_data(code, start_date, end_date)
        
        if not data:
            return {"error": "无法获取历史数据"}
        
        close_prices = [item.get("close", 0) for item in data if item.get("close", 0) > 0]
        high_prices = [item.get("high", 0) for item in data if item.get("high", 0) > 0]
        low_prices = [item.get("low", 0) for item in data if item.get("low", 0) > 0]
        volumes = [item.get("volume", 0) for item in data]
        
        if len(close_prices) < 2:
            return {"error": "数据点不足"}
        
        start_price = close_prices[0]
        end_price = close_prices[-1]
        highest = max(high_prices)
        lowest = min(low_prices)
        avg_volume = sum(volumes) / len(volumes) if volumes else 0
        
        change = end_price - start_price
        change_percent = (change / start_price) * 100 if start_price > 0 else 0
        
        daily_changes = []
        for i in range(1, len(close_prices)):
            prev = close_prices[i - 1]
            curr = close_prices[i]
            if prev > 0:
                daily_changes.append(((curr - prev) / prev) * 100)
        
        max_gain = max(daily_changes) if daily_changes else 0
        max_loss = min(daily_changes) if daily_changes else 0
        avg_change = sum(daily_changes) / len(daily_changes) if daily_changes else 0
        
        up_days = sum(1 for c in daily_changes if c > 0)
        down_days = sum(1 for c in daily_changes if c < 0)
        flat_days = sum(1 for c in daily_changes if c == 0)
        
        return {
            "code": code,
            "start_date": start_date,
            "end_date": end_date,
            "trading_days": len(data),
            "open": start_price,
            "close": end_price,
            "high": highest,
            "low": lowest,
            "start_price": start_price,
            "end_price": end_price,
            "highest": highest,
            "lowest": lowest,
            "change_amount": change,
            "change": change,
            "change_percent": change_percent,
            "max_gain": max_gain,
            "max_loss": max_loss,
            "avg_daily_change": avg_change,
            "avg_volume": avg_volume,
            "total_volume": sum(volumes),
            "up_days": up_days,
            "down_days": down_days,
            "flat_days": flat_days,
            "volatility": self._calculate_volatility(daily_changes)
        }

    def _calculate_volatility(self, daily_changes: List[float]) -> float:
        if len(daily_changes) < 2:
            return 0.0
        
        mean = sum(daily_changes) / len(daily_changes)
        variance = sum((x - mean) ** 2 for x in daily_changes) / len(daily_changes)
        import math
        return math.sqrt(variance) * 100

    def display_analysis(self, code: str, start_date: str, end_date: str) -> str:
        analysis = self.analyze_period(code, start_date, end_date)
        
        if "error" in analysis:
            return f"错误: {analysis['error']}"
        
        output = [
            "\n" + "=" * 60,
            f"{'历史数据分析':^60}",
            "=" * 60,
            f"股票代码: {analysis['code']}",
            f"分析周期: {analysis['start_date']} 至 {analysis['end_date']}",
            f"交易天数: {analysis['trading_days']} 天",
            "=" * 60,
            f"开盘价: {analysis['start_price']:.2f}",
            f"收盘价: {analysis['end_price']:.2f}",
            f"最高价: {analysis['highest']:.2f}",
            f"最低价: {analysis['lowest']:.2f}",
            "=" * 60,
            f"区间涨跌: {analysis['change']:+.2f} ({analysis['change_percent']:+.2f}%)",
            f"最大单日涨幅: {analysis['max_gain']:+.2f}%",
            f"最大单日跌幅: {analysis['max_loss']:+.2f}%",
            f"平均日涨跌: {analysis['avg_daily_change']:+.2f}%",
            f"波动率: {analysis['volatility']:.2f}%",
            "=" * 60,
            f"上涨天数: {analysis['up_days']} 天",
            f"下跌天数: {analysis['down_days']} 天",
            f"平盘天数: {analysis['flat_days']} 天",
            f"累计成交量: {analysis['total_volume']:,}",
            f"日均成交量: {analysis['avg_volume']:,.0f}",
            "=" * 60,
            ""
        ]
        
        return "\n".join(output)

    def display_data_table(self, code: str, start_date: str, end_date: str, 
                          limit: int = 30) -> str:
        data = self.get_data(code, start_date, end_date)
        
        if not data:
            return "无数据可显示"
            
        display_data = data[-limit:] if limit else data
        
        headers = ["日期", "开盘", "最高", "最低", "收盘", "成交量", "MA5", "MA10", "MA20"]
        rows = []
        
        for item in display_data:
            prev_close = 0
            idx = data.index(item)
            if idx > 0:
                prev_close = data[idx - 1].get("close", 0)
            
            change_pct = 0.0
            if prev_close > 0:
                change_pct = ((item.get("close", 0) - prev_close) / prev_close) * 100
            
            row = [
                item.get("date", ""),
                f"{item.get('open', 0):.2f}",
                f"{item.get('high', 0):.2f}",
                f"{item.get('low', 0):.2f}",
                f"{item.get('close', 0):.2f} ({change_pct:+.2f}%)",
                f"{item.get('volume', 0):,}",
                f"{item.get('ma5', 0):.2f}" if item.get("ma5", 0) > 0 else "-",
                f"{item.get('ma10', 0):.2f}" if item.get("ma10", 0) > 0 else "-",
                f"{item.get('ma20', 0):.2f}" if item.get("ma20", 0) > 0 else "-",
            ]
            rows.append(row)
        
        output = [
            "\n" + "=" * 100,
            f"{'历史行情数据':^100}",
            "=" * 100,
            f"股票: {code} | 周期: {start_date} ~ {end_date} | 显示最近 {len(display_data)} 条",
            "=" * 100,
            tabulate(rows, headers=headers, tablefmt="simple"),
            ""
        ]
        
        return "\n".join(output)

    def compare_stocks(self, codes: List[str], start_date: str, end_date: str) -> str:
        results = []
        for code in codes:
            analysis = self.analyze_period(code, start_date, end_date)
            if "error" not in analysis:
                results.append(analysis)
        
        if not results:
            return "无有效数据可对比"
            
        headers = ["代码", "开盘", "收盘", "最高", "最低", "涨跌", "涨跌幅", "波动率", "上涨/下跌"]
        rows = []
        
        for r in results:
            rows.append([
                r["code"],
                f"{r['start_price']:.2f}",
                f"{r['end_price']:.2f}",
                f"{r['highest']:.2f}",
                f"{r['lowest']:.2f}",
                f"{r['change']:+.2f}",
                f"{r['change_percent']:+.2f}%",
                f"{r['volatility']:.2f}%",
                f"{r['up_days']}/{r['down_days']}"
            ])
        
        output = [
            "\n" + "=" * 90,
            f"{'多股票对比':^90}",
            "=" * 90,
            f"周期: {start_date} ~ {end_date}",
            "=" * 90,
            tabulate(rows, headers=headers, tablefmt="simple"),
            ""
        ]
        
        return "\n".join(output)
