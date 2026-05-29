import csv
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from .portfolio import add_position
from .transactions import sell_position
from .price_fetcher import normalize_stock_code


def detect_csv_format(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        first_line = f.readline().strip()
        headers = [h.strip() for h in first_line.split(',')]
        
        header_str = ','.join(headers)
        
        xueqiu_headers = ['股票代码', '股票名称', '持仓', '成本价', '现价', '市值', '盈亏', '盈亏比例']
        if any(h in header_str for h in xueqiu_headers):
            return 'xueqiu'
        
        tonghuashun_headers = ['代码', '名称', '持仓数量', '成本价', '现价', '市值', '盈亏', '盈亏比(%)']
        if any(h in header_str for h in tonghuashun_headers):
            return 'tonghuashun'
        
        generic_headers = ['stock_code', 'code', '股票代码', '代码']
        if any(h in headers for h in generic_headers):
            return 'generic'
        
        return 'unknown'


def parse_xueqiu_csv(file_path: str) -> List[Dict]:
    positions = []
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stock_code = row.get('股票代码', '').strip()
            if not stock_code:
                continue
            
            stock_code = normalize_stock_code(stock_code)
            
            try:
                shares = float(row.get('持仓', '0').replace(',', ''))
                cost_price = float(row.get('成本价', '0').replace(',', ''))
                current_price = float(row.get('现价', '0').replace(',', ''))
            except (ValueError, TypeError):
                continue
            
            if shares <= 0:
                continue
            
            positions.append({
                'stock_code': stock_code,
                'stock_name': row.get('股票名称', '').strip(),
                'shares': shares,
                'cost_price': cost_price,
                'current_price': current_price,
                'market_value': current_price * shares,
            })
    
    return positions


def parse_tonghuashun_csv(file_path: str) -> List[Dict]:
    positions = []
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stock_code = row.get('代码', '').strip()
            if not stock_code:
                continue
            
            stock_code = normalize_stock_code(stock_code)
            
            try:
                shares = float(row.get('持仓数量', '0').replace(',', ''))
                cost_price = float(row.get('成本价', '0').replace(',', ''))
                current_price = float(row.get('现价', '0').replace(',', ''))
            except (ValueError, TypeError):
                continue
            
            if shares <= 0:
                continue
            
            positions.append({
                'stock_code': stock_code,
                'stock_name': row.get('名称', '').strip(),
                'shares': shares,
                'cost_price': cost_price,
                'current_price': current_price,
                'market_value': current_price * shares,
            })
    
    return positions


def parse_generic_csv(file_path: str) -> List[Dict]:
    positions = []
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stock_code = row.get('stock_code', row.get('code', row.get('股票代码', row.get('代码', '')))).strip()
            if not stock_code:
                continue
            
            stock_code = normalize_stock_code(stock_code)
            
            shares_str = row.get('shares', row.get('quantity', row.get('持仓', row.get('持仓数量', '0')))).replace(',', '')
            cost_str = row.get('cost_price', row.get('cost', row.get('成本价', '0'))).replace(',', '')
            price_str = row.get('current_price', row.get('price', row.get('现价', '0'))).replace(',', '')
            
            try:
                shares = float(shares_str)
                cost_price = float(cost_str)
                current_price = float(price_str)
            except (ValueError, TypeError):
                continue
            
            if shares <= 0:
                continue
            
            positions.append({
                'stock_code': stock_code,
                'stock_name': row.get('stock_name', row.get('name', row.get('股票名称', row.get('名称', '')))).strip(),
                'shares': shares,
                'cost_price': cost_price,
                'current_price': current_price,
                'market_value': current_price * shares,
            })
    
    return positions


def import_from_csv(portfolio_id: int, file_path: str, 
                    transaction_date: str = None) -> Tuple[int, List[Dict]]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    fmt = detect_csv_format(file_path)
    
    if fmt == 'xueqiu':
        positions = parse_xueqiu_csv(file_path)
    elif fmt == 'tonghuashun':
        positions = parse_tonghuashun_csv(file_path)
    elif fmt == 'generic':
        positions = parse_generic_csv(file_path)
    else:
        raise ValueError(f"Unknown CSV format. File: {file_path}")
    
    if transaction_date is None:
        transaction_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    imported = 0
    imported_positions = []
    
    for pos in positions:
        try:
            add_position(
                portfolio_id=portfolio_id,
                stock_code=pos['stock_code'],
                shares=pos['shares'],
                price=pos['cost_price'],
                stock_name=pos['stock_name'],
                fee=0.0,
                transaction_date=transaction_date
            )
            imported += 1
            imported_positions.append(pos)
        except Exception as e:
            print(f"Warning: Failed to import {pos['stock_code']}: {e}")
    
    return imported, imported_positions


def parse_transactions_csv(file_path: str) -> List[Dict]:
    transactions = []
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            stock_code = row.get('股票代码', row.get('code', row.get('stock_code', ''))).strip()
            if not stock_code:
                continue
            
            stock_code = normalize_stock_code(stock_code)
            
            tx_type = row.get('类型', row.get('type', row.get('transaction_type', ''))).strip().upper()
            if tx_type in ['买入', 'BUY']:
                tx_type = 'BUY'
            elif tx_type in ['卖出', 'SELL']:
                tx_type = 'SELL'
            else:
                continue
            
            try:
                shares = float(row.get('股数', row.get('shares', '0')).replace(',', ''))
                price = float(row.get('价格', row.get('price', '0')).replace(',', ''))
                fee = float(row.get('手续费', row.get('fee', '0')).replace(',', ''))
            except (ValueError, TypeError):
                continue
            
            tx_date = row.get('日期', row.get('date', row.get('transaction_date', ''))).strip()
            if not tx_date:
                tx_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            if shares <= 0:
                continue
            
            transactions.append({
                'stock_code': stock_code,
                'transaction_type': tx_type,
                'shares': shares,
                'price': price,
                'fee': fee,
                'transaction_date': tx_date,
                'notes': row.get('备注', row.get('notes', '')).strip(),
            })
    
    return transactions


def import_transactions_from_csv(portfolio_id: int, file_path: str) -> Tuple[int, int]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    transactions = parse_transactions_csv(file_path)
    
    buy_count = 0
    sell_count = 0
    
    for tx in transactions:
        try:
            if tx['transaction_type'] == 'BUY':
                add_position(
                    portfolio_id=portfolio_id,
                    stock_code=tx['stock_code'],
                    shares=tx['shares'],
                    price=tx['price'],
                    fee=tx['fee'],
                    transaction_date=tx['transaction_date']
                )
                buy_count += 1
            else:
                sell_position(
                    portfolio_id=portfolio_id,
                    stock_code=tx['stock_code'],
                    shares=tx['shares'],
                    price=tx['price'],
                    fee=tx['fee'],
                    transaction_date=tx['transaction_date'],
                    notes=tx['notes']
                )
                sell_count += 1
        except Exception as e:
            print(f"Warning: Failed to import transaction for {tx['stock_code']}: {e}")
    
    return buy_count, sell_count
