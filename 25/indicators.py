from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from stock import Stock
from api_client import StockAPIClient


class TechnicalIndicators:
    def __init__(self, api_client: StockAPIClient = None):
        self.api_client = api_client

    @staticmethod
    def sma(prices, period: int) -> List[float]:
        prices_list = list(prices) if hasattr(prices, '__iter__') else [prices]
        if len(prices_list) < period:
            return []
        
        result = []
        for i in range(len(prices_list) - period + 1):
            window = prices_list[i:i + period]
            if all(v > 0 for v in window):
                result.append(sum(window) / period)
            else:
                result.append(0.0)
        
        return result

    @staticmethod
    def ema(prices, period: int) -> List[float]:
        prices_list = list(prices) if hasattr(prices, '__iter__') else [prices]
        if len(prices_list) < period:
            return []
        
        multiplier = 2 / (period + 1)
        result = [0.0] * len(prices_list)
        
        valid_prices = [p for p in prices_list if p > 0]
        if len(valid_prices) < period:
            return result
        
        sma_val = sum(valid_prices[:period]) / period
        first_valid_idx = next((i for i, p in enumerate(prices_list) if p > 0), 0)
        result[first_valid_idx + period - 1] = sma_val
        
        for i in range(first_valid_idx + period, len(prices_list)):
            if prices_list[i] > 0 and result[i - 1] > 0:
                result[i] = ((prices_list[i] - result[i - 1]) * multiplier) + result[i - 1]
            else:
                result[i] = result[i - 1]
        
        return result

    @staticmethod
    def rsi(prices, period: int = 14) -> List[float]:
        prices_list = list(prices) if hasattr(prices, '__iter__') else [prices]
        if len(prices_list) < period + 1:
            return []
        
        result = [0.0] * len(prices_list)
        gains = []
        losses = []
        
        for i in range(1, len(prices_list)):
            diff = prices_list[i] - prices_list[i - 1]
            gains.append(max(0, diff))
            losses.append(max(0, -diff))
        
        if len(gains) >= period:
            avg_gain = sum(gains[:period]) / period
            avg_loss = sum(losses[:period]) / period
            
            if avg_loss == 0:
                result[period] = 100.0
            else:
                rs = avg_gain / avg_loss
                result[period] = 100 - (100 / (1 + rs))
            
            for i in range(period, len(gains)):
                avg_gain = (avg_gain * (period - 1) + gains[i]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i]) / period
                
                if avg_loss == 0:
                    result[i + 1] = 100.0
                else:
                    rs = avg_gain / avg_loss
                    result[i + 1] = 100 - (100 / (1 + rs))
        
        return result

    @staticmethod
    def macd(prices, fast: int = 12, slow: int = 26, signal: int = 9):
        prices_list = list(prices) if hasattr(prices, '__iter__') else [prices]
        if len(prices_list) < slow:
            return [0.0] * len(prices_list), [0.0] * len(prices_list), [0.0] * len(prices_list)
        
        ema_fast = TechnicalIndicators.ema(prices_list, fast)
        ema_slow = TechnicalIndicators.ema(prices_list, slow)
        
        macd_line = [0.0] * len(prices_list)
        for i in range(len(prices_list)):
            if ema_fast[i] > 0 and ema_slow[i] > 0:
                macd_line[i] = ema_fast[i] - ema_slow[i]
        
        signal_line = [0.0] * len(prices_list)
        macd_valid = [v for v in macd_line if v != 0]
        
        if len(macd_valid) >= signal:
            ema_signal = TechnicalIndicators.ema([v for v in macd_line if v != 0], signal)
            idx = 0
            for i in range(len(macd_line)):
                if macd_line[i] != 0:
                    if idx < len(ema_signal):
                        signal_line[i] = ema_signal[idx]
                    idx += 1
        
        histogram = [0.0] * len(prices_list)
        for i in range(len(prices_list)):
            if macd_line[i] != 0 and signal_line[i] != 0:
                histogram[i] = macd_line[i] - signal_line[i]
        
        return macd_line, signal_line, histogram

    def calculate_sma(self, prices: List[float], period: int) -> List[float]:
        if len(prices) < period:
            return []
        
        sma = []
        for i in range(len(prices) - period + 1):
            window = prices[i:i + period]
            if all(v > 0 for v in window):
                sma.append(sum(window) / period)
            else:
                sma.append(0.0)
        
        return sma

    def calculate_ema(self, prices: List[float], period: int) -> List[float]:
        if len(prices) < period:
            return []
        
        multiplier = 2 / (period + 1)
        ema = [0.0] * len(prices)
        
        valid_prices = [p for p in prices if p > 0]
        if len(valid_prices) < period:
            return ema
        
        sma = sum(valid_prices[:period]) / period
        first_valid_idx = next((i for i, p in enumerate(prices) if p > 0), 0)
        ema[first_valid_idx + period - 1] = sma
        
        for i in range(first_valid_idx + period, len(prices)):
            if prices[i] > 0 and ema[i - 1] > 0:
                ema[i] = ((prices[i] - ema[i - 1]) * multiplier) + ema[i - 1]
            else:
                ema[i] = ema[i - 1]
        
        return ema

    def calculate_rsi(self, prices: List[float], period: int = 14) -> List[float]:
        if len(prices) < period + 1:
            return []
        
        rsi = [0.0] * len(prices)
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i - 1]
            gains.append(max(0, diff))
            losses.append(max(0, -diff))
        
        if len(gains) >= period:
            avg_gain = sum(gains[:period]) / period
            avg_loss = sum(losses[:period]) / period
            
            if avg_loss == 0:
                rsi[period] = 100.0
            else:
                rs = avg_gain / avg_loss
                rsi[period] = 100 - (100 / (1 + rs))
            
            for i in range(period, len(gains)):
                avg_gain = (avg_gain * (period - 1) + gains[i]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i]) / period
                
                if avg_loss == 0:
                    rsi[i + 1] = 100.0
                else:
                    rs = avg_gain / avg_loss
                    rsi[i + 1] = 100 - (100 / (1 + rs))
        
        return rsi

    def calculate_macd(self, prices: List[float], 
                       fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, List[float]]:
        if len(prices) < slow:
            return {"macd": [], "signal": [], "histogram": []}
        
        ema_fast = self.calculate_ema(prices, fast)
        ema_slow = self.calculate_ema(prices, slow)
        
        macd = [0.0] * len(prices)
        for i in range(len(prices)):
            if ema_fast[i] > 0 and ema_slow[i] > 0:
                macd[i] = ema_fast[i] - ema_slow[i]
        
        macd_valid = [v for v in macd if v != 0]
        signal_line = [0.0] * len(prices)
        
        if len(macd_valid) >= signal:
            ema_signal = self.calculate_ema([v for v in macd if v != 0], signal)
            idx = 0
            for i in range(len(macd)):
                if macd[i] != 0:
                    if idx < len(ema_signal):
                        signal_line[i] = ema_signal[idx]
                    idx += 1
        
        histogram = [0.0] * len(prices)
        for i in range(len(prices)):
            if macd[i] != 0 and signal_line[i] != 0:
                histogram[i] = macd[i] - signal_line[i]
        
        return {
            "macd": macd,
            "signal": signal_line,
            "histogram": histogram
        }

    def get_moving_averages(self, code: str, periods: List[int] = [5, 10, 20, 60],
                            days: int = 100) -> Dict[int, float]:
        from datetime import datetime, timedelta
        
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        history = self.api_client.get_historical_data(code, start_date, end_date)
        
        result = {}
        if not history:
            return {p: 0.0 for p in periods}
        
        close_prices = [item.get("close", 0) for item in history if item.get("close", 0) > 0]
        
        for period in periods:
            if len(close_prices) >= period:
                result[period] = sum(close_prices[-period:]) / period
            else:
                result[period] = 0.0
        
        return result

    def update_stock_indicators(self, stock: Stock) -> None:
        ma = self.get_moving_averages(stock.code, [5, 10], days=30)
        stock.ma5 = ma.get(5, 0.0)
        stock.ma10 = ma.get(10, 0.0)

    @staticmethod
    def analyze_prices(prices) -> Dict[str, Any]:
        prices_list = list(prices) if hasattr(prices, '__iter__') else [prices]
        
        if len(prices_list) < 2:
            return {"error": "数据点不足"}
        
        close_prices = [p for p in prices_list if p > 0]
        if len(close_prices) < 2:
            return {"error": "有效数据点不足"}
            
        current_price = close_prices[-1]
        
        ma5 = TechnicalIndicators.sma(close_prices, 5)
        ma10 = TechnicalIndicators.sma(close_prices, 10)
        ma20 = TechnicalIndicators.sma(close_prices, 20)
        ma60 = TechnicalIndicators.sma(close_prices, min(60, len(close_prices)))
        
        rsi = TechnicalIndicators.rsi(close_prices, 14)
        macd_line, signal_line, hist = TechnicalIndicators.macd(close_prices)
        
        summary = {
            "current_price": current_price,
            "ma5": ma5[-1] if ma5 else 0.0,
            "ma10": ma10[-1] if ma10 else 0.0,
            "ma20": ma20[-1] if ma20 else 0.0,
            "ma60": ma60[-1] if ma60 else 0.0,
            "rsi_14": rsi[-1] if rsi else 0.0,
            "macd": macd_line[-1] if macd_line else 0.0,
            "macd_signal": signal_line[-1] if signal_line else 0.0,
            "macd_histogram": hist[-1] if hist else 0.0,
        }
        
        position_ma5 = "高于MA5" if current_price > summary["ma5"] else "低于MA5"
        position_ma10 = "高于MA10" if current_price > summary["ma10"] else "低于MA10"
        
        if summary["rsi_14"] > 70:
            rsi_signal = "超买"
        elif summary["rsi_14"] < 30:
            rsi_signal = "超卖"
        else:
            rsi_signal = "中性"
        
        if summary["macd"] > summary["macd_signal"] and summary["macd_histogram"] > 0:
            macd_signal = "金叉，多头信号"
        elif summary["macd"] < summary["macd_signal"] and summary["macd_histogram"] < 0:
            macd_signal = "死叉，空头信号"
        else:
            macd_signal = "震荡"
        
        summary["signals"] = {
            "ma5_position": position_ma5,
            "ma10_position": position_ma10,
            "rsi_signal": rsi_signal,
            "macd_signal": macd_signal
        }
        
        return summary

    def get_technical_summary(self, code: str, days: int = 100) -> Dict[str, Any]:
        from datetime import datetime, timedelta
        
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        history = self.api_client.get_historical_data(code, start_date, end_date)
        
        if not history:
            return {"error": "无法获取历史数据"}
        
        close_prices = [item.get("close", 0) for item in history if item.get("close", 0) > 0]
        
        if len(close_prices) < 2:
            return {"error": "数据点不足"}
        
        current_price = close_prices[-1]
        
        ma5 = self.calculate_sma(close_prices, 5)
        ma10 = self.calculate_sma(close_prices, 10)
        ma20 = self.calculate_sma(close_prices, 20)
        ma60 = self.calculate_sma(close_prices, min(60, len(close_prices)))
        
        rsi = self.calculate_rsi(close_prices, 14)
        macd = self.calculate_macd(close_prices)
        
        summary = {
            "current_price": current_price,
            "ma5": ma5[-1] if ma5 else 0.0,
            "ma10": ma10[-1] if ma10 else 0.0,
            "ma20": ma20[-1] if ma20 else 0.0,
            "ma60": ma60[-1] if ma60 else 0.0,
            "rsi_14": rsi[-1] if rsi else 0.0,
            "macd": macd["macd"][-1] if macd["macd"] else 0.0,
            "macd_signal": macd["signal"][-1] if macd["signal"] else 0.0,
            "macd_histogram": macd["histogram"][-1] if macd["histogram"] else 0.0,
        }
        
        position_ma5 = "高于MA5" if current_price > summary["ma5"] else "低于MA5"
        position_ma10 = "高于MA10" if current_price > summary["ma10"] else "低于MA10"
        
        if summary["rsi_14"] > 70:
            rsi_signal = "超买"
        elif summary["rsi_14"] < 30:
            rsi_signal = "超卖"
        else:
            rsi_signal = "中性"
        
        if summary["macd"] > summary["macd_signal"] and summary["macd_histogram"] > 0:
            macd_signal = "金叉，多头信号"
        elif summary["macd"] < summary["macd_signal"] and summary["macd_histogram"] < 0:
            macd_signal = "死叉，空头信号"
        else:
            macd_signal = "震荡"
        
        summary["signals"] = {
            "ma5_position": position_ma5,
            "ma10_position": position_ma10,
            "rsi_signal": rsi_signal,
            "macd_signal": macd_signal
        }
        
        return summary
