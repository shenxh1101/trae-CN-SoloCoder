#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing basic imports...")
try:
    from stock_portfolio.database import init_db, get_db_path
    from stock_portfolio.price_fetcher import normalize_stock_code, get_sina_symbol
    from stock_portfolio.portfolio import create_portfolio, list_portfolios
    print("✓ All modules imported successfully")
except Exception as e:
    print(f"✗ Import failed: {e}")
    sys.exit(1)

print(f"\nDatabase path: {get_db_path()}")

print("\nTesting normalize_stock_code...")
test_codes = ["600519", "000001", "00700", "SH600519", "sz000001"]
for code in test_codes:
    result = normalize_stock_code(code)
    print(f"  {code} -> {result}")

print("\nTesting get_sina_symbol...")
for code in test_codes:
    normalized = normalize_stock_code(code)
    result = get_sina_symbol(normalized)
    print(f"  {normalized} -> {result}")

print("\n✓ Basic tests passed!")
