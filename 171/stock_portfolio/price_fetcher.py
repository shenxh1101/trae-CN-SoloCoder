import requests
import re
from typing import Dict, Optional


def normalize_stock_code(stock_code: str) -> str:
    stock_code = stock_code.strip().upper()
    
    if stock_code.startswith("SH") or stock_code.startswith("SZ") or stock_code.startswith("HK"):
        return stock_code
    
    if stock_code.startswith("60") or stock_code.startswith("688"):
        return f"SH{stock_code}"
    elif stock_code.startswith("00") or stock_code.startswith("30"):
        return f"SZ{stock_code}"
    elif stock_code.isdigit() and len(stock_code) == 5:
        return f"HK{stock_code}"
    
    return stock_code


def get_sina_symbol(stock_code: str) -> str:
    code = normalize_stock_code(stock_code)
    
    if code.startswith("SH"):
        return f"sh{code[2:]}"
    elif code.startswith("SZ"):
        return f"sz{code[2:]}"
    elif code.startswith("HK"):
        return f"hk{code[2:]}"
    elif code.startswith("BJ"):
        return f"bj{code[2:]}"
    
    return code.lower()


def fetch_from_sina(stock_codes: list) -> Dict[str, Dict]:
    results = {}
    
    if not stock_codes:
        return results
    
    symbols = [get_sina_symbol(code) for code in stock_codes]
    symbol_str = ",".join(symbols)
    
    url = f"https://hq.sinajs.cn/list={symbol_str}"
    headers = {
        "Referer": "https://finance.sina.com.cn",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = "gbk"
        content = response.text
        
        lines = content.strip().split("\n")
        code_to_symbol = {get_sina_symbol(code): code for code in stock_codes}
        
        for i, line in enumerate(lines):
            if not line or "=" not in line:
                continue
            
            match = re.match(r'var hq_str_([^=]+)="(.*)";', line)
            if not match:
                continue
            
            symbol = match.group(1)
            data = match.group(2).split(",")
            
            original_code = code_to_symbol.get(symbol, stock_codes[i] if i < len(stock_codes) else "")
            
            if symbol.startswith("sh") or symbol.startswith("sz"):
                if len(data) >= 32:
                    results[original_code] = {
                        "name": data[0],
                        "open": float(data[1]) if data[1] else 0,
                        "prev_close": float(data[2]) if data[2] else 0,
                        "current": float(data[3]) if data[3] else 0,
                        "high": float(data[4]) if data[4] else 0,
                        "low": float(data[5]) if data[5] else 0,
                        "volume": float(data[8]) if data[8] else 0,
                        "amount": float(data[9]) if data[9] else 0,
                        "date": data[30] if len(data) > 30 else "",
                        "time": data[31] if len(data) > 31 else "",
                    }
            elif symbol.startswith("hk"):
                if len(data) >= 27:
                    results[original_code] = {
                        "name": data[1] if len(data) > 1 else "",
                        "open": float(data[2]) if data[2] else 0,
                        "prev_close": float(data[3]) if data[3] else 0,
                        "current": float(data[6]) if data[6] else 0,
                        "high": float(data[4]) if data[4] else 0,
                        "low": float(data[5]) if data[5] else 0,
                        "volume": float(data[12]) if data[12] else 0,
                        "amount": float(data[11]) if data[11] else 0,
                        "date": data[17] if len(data) > 17 else "",
                        "time": data[18] if len(data) > 18 else "",
                    }
    
    except Exception as e:
        print(f"Error fetching from Sina: {e}")
    
    return results


def fetch_from_tencent(stock_codes: list) -> Dict[str, Dict]:
    results = {}
    
    if not stock_codes:
        return results
    
    for stock_code in stock_codes:
        code = normalize_stock_code(stock_code)
        if code.startswith("SH"):
            qt_code = f"sh{code[2:]}"
        elif code.startswith("SZ"):
            qt_code = f"sz{code[2:]}"
        elif code.startswith("HK"):
            qt_code = f"hk{code[2:]}"
        else:
            qt_code = code.lower()
        
        url = f"https://qt.gtimg.cn/q={qt_code}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=5)
            response.encoding = "gbk"
            content = response.text
            
            match = re.match(r'v_([^=]+)="(.*)";', content)
            if match:
                data = match.group(2).split("~")
                
                if code.startswith("HK"):
                    if len(data) >= 40:
                        results[stock_code] = {
                            "name": data[1] if len(data) > 1 else "",
                            "current": float(data[3]) if data[3] else 0,
                            "prev_close": float(data[4]) if data[4] else 0,
                            "open": float(data[5]) if data[5] else 0,
                            "high": float(data[33]) if data[33] else 0,
                            "low": float(data[34]) if data[34] else 0,
                            "volume": float(data[6]) if data[6] else 0,
                            "amount": float(data[37]) if data[37] else 0,
                            "date": "",
                            "time": data[30] if len(data) > 30 else "",
                        }
                else:
                    if len(data) >= 40:
                        results[stock_code] = {
                            "name": data[1] if len(data) > 1 else "",
                            "current": float(data[3]) if data[3] else 0,
                            "prev_close": float(data[4]) if data[4] else 0,
                            "open": float(data[5]) if data[5] else 0,
                            "high": float(data[33]) if data[33] else 0,
                            "low": float(data[34]) if data[34] else 0,
                            "volume": float(data[6]) if data[6] else 0,
                            "amount": float(data[37]) if data[37] else 0,
                            "date": data[30].split(" ")[0] if len(data) > 30 else "",
                            "time": data[30].split(" ")[1] if len(data) > 30 and " " in data[30] else "",
                        }
        except Exception as e:
            continue
    
    return results


def fetch_stock_prices(stock_codes: list) -> Dict[str, Dict]:
    if not stock_codes:
        return {}
    
    unique_codes = list(set(stock_codes))
    
    results = fetch_from_sina(unique_codes)
    
    missing = [code for code in unique_codes if code not in results]
    if missing:
        fallback = fetch_from_tencent(missing)
        results.update(fallback)
    
    return results


def get_stock_price(stock_code: str) -> Optional[Dict]:
    results = fetch_stock_prices([stock_code])
    return results.get(stock_code)


def get_current_price(stock_code: str) -> float:
    data = get_stock_price(stock_code)
    if data and data["current"] > 0:
        return data["current"]
    return 0.0
