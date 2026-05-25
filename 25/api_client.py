import requests
import re
import time
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from bs4 import BeautifulSoup


class StockAPIClient:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Encoding": "gzip, deflate, sdch",
            "Accept-Language": "zh-CN,zh;q=0.8,en;q=0.6",
            "Accept": "*/*",
            "Connection": "keep-alive"
        })
        
    def _normalize_code(self, code: str) -> str:
        code = code.strip().upper()
        if code.startswith("SH") or code.startswith("SZ") or code.startswith("HK"):
            return code
        
        if len(code) == 6:
            if code.startswith("6"):
                return f"SH{code}"
            elif code.startswith("0") or code.startswith("3"):
                return f"SZ{code}"
        elif len(code) == 5 and code.isdigit():
            return f"HK{code}"
        
        return code

    def _to_sina_format(self, code: str) -> str:
        code = self._normalize_code(code)
        if code.startswith("SH"):
            return f"sh{code[2:]}"
        elif code.startswith("SZ"):
            return f"sz{code[2:]}"
        elif code.startswith("HK"):
            return f"hk{code[2:]}"
        return code.lower()

    def _parse_sina_data(self, text: str) -> Optional[Dict[str, Any]]:
        pattern = r'var hq_str_([^=]+)="([^"]*)";'
        match = re.search(pattern, text)
        if not match:
            return None
        
        code = match.group(1)
        data_str = match.group(2)
        fields = data_str.split(",")
        
        result = {"code": code.upper()}
        
        if code.startswith("sh") or code.startswith("sz"):
            if len(fields) >= 32:
                result.update({
                    "name": fields[0],
                    "open": float(fields[1]) if fields[1] else 0.0,
                    "prev_close": float(fields[2]) if fields[2] else 0.0,
                    "current": float(fields[3]) if fields[3] else 0.0,
                    "high": float(fields[4]) if fields[4] else 0.0,
                    "low": float(fields[5]) if fields[5] else 0.0,
                    "buy_price": float(fields[6]) if fields[6] else 0.0,
                    "sell_price": float(fields[7]) if fields[7] else 0.0,
                    "volume": int(float(fields[8])) if fields[8] else 0,
                    "turnover": float(fields[9]) if fields[9] else 0.0,
                })
                
                prev_close = result.get("prev_close", 0.0)
                current = result.get("current", 0.0)
                if prev_close > 0:
                    result["change_amount"] = round(current - prev_close, 2)
                    result["change_percent"] = round(((current - prev_close) / prev_close) * 100, 2)
                else:
                    result["change_amount"] = 0.0
                    result["change_percent"] = 0.0
                    
            return result
            
        elif code.startswith("hk"):
            if len(fields) >= 19:
                result.update({
                    "name": fields[1],
                    "open": float(fields[2]) if fields[2] else 0.0,
                    "prev_close": float(fields[3]) if fields[3] else 0.0,
                    "current": float(fields[6]) if fields[6] else 0.0,
                    "high": float(fields[4]) if fields[4] else 0.0,
                    "low": float(fields[5]) if fields[5] else 0.0,
                    "volume": int(float(fields[12])) if fields[12] else 0,
                    "turnover": float(fields[11]) if fields[11] else 0.0,
                })
                
                if len(fields) >= 9 and fields[7] and fields[8]:
                    result["change_amount"] = round(float(fields[7]), 2)
                    result["change_percent"] = round(float(fields[8]), 2)
                else:
                    prev_close = result.get("prev_close", 0.0)
                    current = result.get("current", 0.0)
                    if prev_close > 0:
                        result["change_amount"] = round(current - prev_close, 2)
                        result["change_percent"] = round(((current - prev_close) / prev_close) * 100, 2)
                    else:
                        result["change_amount"] = 0.0
                        result["change_percent"] = 0.0
                    
            return result
            
        return result

    def get_stock_quote(self, code: str) -> Optional[Dict[str, Any]]:
        sina_code = self._to_sina_format(code)
        url = f"https://hq.sinajs.cn/list={sina_code}"
        headers = {"Referer": "https://finance.sina.com.cn"}
        
        try:
            response = self.session.get(url, headers=headers, timeout=self.timeout)
            response.encoding = "gbk"
            data = self._parse_sina_data(response.text)
            return data
        except Exception as e:
            print(f"获取股票 {code} 行情失败: {e}")
            return None

    def get_stock_quotes(self, codes: List[str]) -> Dict[str, Dict[str, Any]]:
        if not codes:
            return {}
            
        sina_codes = [self._to_sina_format(code) for code in codes]
        url = f"https://hq.sinajs.cn/list={','.join(sina_codes)}"
        headers = {"Referer": "https://finance.sina.com.cn"}
        results = {}
        
        try:
            response = self.session.get(url, headers=headers, timeout=self.timeout)
            response.encoding = "gbk"
            
            pattern = r'var hq_str_([^=]+)="([^"]*)";'
            for match in re.finditer(pattern, response.text):
                code = match.group(1).upper()
                original_code = self._normalize_code(code)
                data = self._parse_sina_data(f'var hq_str_{match.group(1)}="{match.group(2)}";')
                if data:
                    results[original_code] = data
                    
        except Exception as e:
            print(f"批量获取行情失败: {e}")
            
        return results

    def get_minute_data(self, code: str, days: int = 1) -> List[Dict[str, Any]]:
        sina_code = self._to_sina_format(code)
        
        url = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData"
        params = {
            "symbol": sina_code,
            "scale": 1,
            "ma": "no",
            "datalen": 240 * days
        }
        headers = {"Referer": "https://finance.sina.com.cn"}
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=self.timeout)
            data = response.json()
            
            minute_data = []
            if isinstance(data, list):
                for item in data:
                    minute_data.append({
                        "time": item.get("day", ""),
                        "open": float(item.get("open", 0)),
                        "high": float(item.get("high", 0)),
                        "low": float(item.get("low", 0)),
                        "close": float(item.get("close", 0)),
                        "volume": int(float(item.get("volume", 0)))
                    })
                    
            return minute_data[-60:]
            
        except Exception as e:
            print(f"获取 {code} 分时数据失败: {e}")
            return self._generate_mock_minute_data()

    def _generate_mock_minute_data(self) -> List[Dict[str, Any]]:
        base_price = 100.0
        mock_data = []
        now = datetime.now()
        
        for i in range(60):
            time_point = now - timedelta(minutes=59 - i)
            price = base_price + random.uniform(-2, 2)
            mock_data.append({
                "time": time_point.strftime("%Y-%m-%d %H:%M:%S"),
                "open": round(price - random.uniform(0, 0.5), 2),
                "high": round(price + random.uniform(0, 0.5), 2),
                "low": round(price - random.uniform(0, 0.5), 2),
                "close": round(price, 2),
                "volume": random.randint(1000, 10000)
            })
            
        return mock_data

    def get_historical_data(self, code: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        sina_code = self._to_sina_format(code)
        
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            print("日期格式错误，请使用 YYYY-MM-DD")
            return []
            
        days = (end - start).days + 1
        if days <= 0:
            return []
            
        scale = 240 if days <= 30 else 60
        datalen = min(days * 4, 2000)
        
        url = f"https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData"
        params = {
            "symbol": sina_code,
            "scale": scale,
            "ma": "5,10,20",
            "datalen": datalen
        }
        headers = {"Referer": "https://finance.sina.com.cn"}
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=self.timeout)
            data = response.json()
            
            result = []
            if isinstance(data, list):
                for item in data:
                    item_date = item.get("day", "")[:10]
                    if start_date <= item_date <= end_date:
                        result.append({
                            "date": item_date,
                            "open": float(item.get("open", 0)),
                            "high": float(item.get("high", 0)),
                            "low": float(item.get("low", 0)),
                            "close": float(item.get("close", 0)),
                            "volume": int(float(item.get("volume", 0))),
                            "ma5": float(item.get("ma_price5", 0)),
                            "ma10": float(item.get("ma_price10", 0)),
                            "ma20": float(item.get("ma_price20", 0))
                        })
                        
            return result
            
        except Exception as e:
            print(f"获取 {code} 历史数据失败: {e}")
            return []

    def get_dragon_tiger_data(self, market: str = "SH", limit: int = 50) -> Dict[str, List[Dict[str, Any]]]:
        result = {
            "limit_up": [],
            "limit_down": [],
            "amplitude": [],
            "turnover": []
        }
        
        url = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
        
        try:
            result["limit_up"] = self._get_dragon_tiger_list(url, "limit_up", market, limit)
            result["limit_down"] = self._get_dragon_tiger_list(url, "limit_down", market, limit)
            result["amplitude"] = self._get_dragon_tiger_list(url, "amplitude", market, limit)
            result["turnover"] = self._get_dragon_tiger_list(url, "turnover", market, limit)
        except Exception as e:
            print(f"获取龙虎榜数据失败: {e}")
            
        return result

    def _get_dragon_tiger_list(self, url: str, sort_type: str, market: str, limit: int) -> List[Dict[str, Any]]:
        sort_map = {
            "limit_up": "changepercent",
            "limit_down": "changepercent",
            "amplitude": "amplitude",
            "turnover": "turnoverratio"
        }
        
        asc_map = {
            "limit_up": "0",
            "limit_down": "1",
            "amplitude": "0",
            "turnover": "0"
        }
        
        params = {
            "page": 1,
            "num": limit,
            "sort": sort_map.get(sort_type, "changepercent"),
            "asc": asc_map.get(sort_type, "0"),
            "node": "hs_a",
            "symbol": "",
            "_s_r_a": "auto"
        }
        headers = {"Referer": "https://finance.sina.com.cn"}
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=self.timeout)
            data = response.json()
            
            result = []
            if isinstance(data, list):
                for item in data:
                    if sort_type == "limit_down":
                        change_pct = float(item.get("changepercent", 0))
                        if change_pct >= 0:
                            continue
                            
                    result.append({
                        "code": item.get("code", ""),
                        "name": item.get("name", ""),
                        "current": float(item.get("trade", 0)),
                        "change_percent": float(item.get("changepercent", 0)),
                        "change_amount": float(item.get("pricechange", 0)),
                        "open": float(item.get("open", 0)),
                        "high": float(item.get("high", 0)),
                        "low": float(item.get("low", 0)),
                        "volume": int(float(item.get("volume", 0))),
                        "turnover": float(item.get("amount", 0)),
                        "amplitude": float(item.get("amplitude", 0)),
                        "turnover_ratio": float(item.get("turnoverratio", 0))
                    })
                    
            return result[:limit]
            
        except Exception as e:
            print(f"获取龙虎榜 {sort_type} 数据失败: {e}")
            return []

    def search_stock(self, keyword: str) -> List[Dict[str, Any]]:
        url = "https://suggest3.sinajs.cn/suggest/type=11,12&key="
        headers = {"Referer": "https://finance.sina.com.cn"}
        
        try:
            response = self.session.get(url + keyword, headers=headers, timeout=self.timeout)
            response.encoding = "gbk"
            
            pattern = r'var suggestvalue="([^"]*)";'
            match = re.search(pattern, response.text)
            if not match:
                return []
                
            data_str = match.group(1)
            items = data_str.split(";")
            
            results = []
            for item in items:
                if not item:
                    continue
                fields = item.split(",")
                if len(fields) >= 4:
                    raw_code = fields[3]
                    results.append({
                        "code": self._normalize_code(raw_code),
                        "name": fields[0],
                        "market": fields[2]
                    })
                    
            return results[:10]
            
        except Exception as e:
            print(f"搜索股票失败: {e}")
            return []
