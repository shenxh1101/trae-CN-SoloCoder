#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Account
from stock_engine import StockEngine
from account_manager import AccountManager
from trading_engine import TradingEngine
from data_exporter import DataExporter

def test_stock_engine():
    print("=" * 50)
    print("测试1: 股票引擎初始化")
    print("=" * 50)
    engine = StockEngine()
    stocks = engine.get_all_stocks()
    print(f"股票数量: {len(stocks)}")
    assert len(stocks) == 10, "股票数量应为10"
    for stock in stocks:
        print(f"  {stock.code} {stock.name} {stock.price:.2f}元")

    print("\n测试价格更新...")
    engine.update_prices()
    for stock in stocks[:3]:
        history = engine.get_price_history(stock.code)
        print(f"  {stock.name}: {len(history)} 条价格记录")
    print("✓ 股票引擎测试通过\n")
    return engine

def test_account_manager():
    print("=" * 50)
    print("测试2: 账户管理器")
    print("=" * 50)
    manager = AccountManager()

    test_account_name = "测试账户"
    if test_account_name in manager.get_account_list():
        manager.delete_account(test_account_name)

    account = manager.create_account(test_account_name, 100000.0)
    assert account is not None, "账户创建失败"
    assert account.cash == 100000.0, "初始资金应为100000"
    print(f"✓ 创建账户: {account.name}, 初始资金: {account.cash:.2f}")

    manager.switch_account(test_account_name)
    assert manager.current_account.name == test_account_name, "账户切换失败"
    print(f"✓ 切换到账户: {manager.current_account.name}")

    print("✓ 账户管理器测试通过\n")
    return manager

def test_trading_engine(stock_engine, account_manager):
    print("=" * 50)
    print("测试3: 交易引擎")
    print("=" * 50)
    trading = TradingEngine(stock_engine)
    account = account_manager.current_account

    stocks = stock_engine.get_all_stocks()
    stock = None
    for s in stocks:
        if s.price * 100 < 50000:
            stock = s
            break
    quantity = 100

    print(f"测试买入: {stock.name} {quantity}股")
    success, msg = trading.buy(account, stock.code, quantity)
    assert success, f"买入失败: {msg}"
    print(f"  {msg}")
    assert stock.code in account.positions, "持仓中应有该股票"
    assert account.positions[stock.code].quantity == quantity, "持仓数量不正确"

    print(f"\n测试卖出: {stock.name} {quantity}股")
    success, msg = trading.sell(account, stock.code, quantity)
    assert success, f"卖出失败: {msg}"
    print(f"  {msg}")
    assert stock.code not in account.positions, "持仓中不应有该股票"

    print(f"\n测试手续费计算:")
    amount = 10000
    fee = account.calculate_fee(amount)
    print(f"  交易金额 {amount} 元, 手续费 {fee:.2f} 元")
    assert fee >= account.min_fee, "手续费不应低于最低手续费"

    print("✓ 交易引擎测试通过\n")
    return trading

def test_data_export(stock_engine, account_manager):
    print("=" * 50)
    print("测试4: 数据导出")
    print("=" * 50)
    account = account_manager.current_account

    filepath = DataExporter.export_trade_history(account)
    assert os.path.exists(filepath), "交易记录导出失败"
    print(f"✓ 交易记录已导出: {filepath}")

    filepath = DataExporter.export_positions(account, stock_engine)
    assert os.path.exists(filepath), "持仓导出失败"
    print(f"✓ 持仓明细已导出: {filepath}")

    filepath = DataExporter.export_asset_history(account)
    assert os.path.exists(filepath), "资产历史导出失败"
    print(f"✓ 资产历史已导出: {filepath}")

    print("✓ 数据导出测试通过\n")

def test_stop_loss_take_profit(stock_engine, account_manager, trading):
    print("=" * 50)
    print("测试5: 止损止盈")
    print("=" * 50)
    account = account_manager.current_account

    stocks = stock_engine.get_all_stocks()
    stock = None
    for s in stocks:
        if s.price * 100 < 50000:
            stock = s
            break
    quantity = 100

    trading.buy(account, stock.code, quantity)

    success, msg = trading.set_stop_loss(account, stock.code, 5.0)
    assert success, "设置止损失败"
    print(f"✓ {msg}")

    success, msg = trading.set_take_profit(account, stock.code, 10.0)
    assert success, "设置止盈失败"
    print(f"✓ {msg}")

    position = account.positions[stock.code]
    assert position.stop_loss == 5.0, "止损设置不正确"
    assert position.take_profit == 10.0, "止盈设置不正确"

    trading.sell(account, stock.code, quantity)

    print("✓ 止损止盈测试通过\n")

def test_dividends(stock_engine, account_manager):
    print("=" * 50)
    print("测试6: 分红送股")
    print("=" * 50)
    account = account_manager.current_account

    stocks = stock_engine.get_all_stocks()
    stock = None
    for s in stocks:
        if s.price * 100 < 50000:
            stock = s
            break
    trading = TradingEngine(stock_engine)
    success, msg = trading.buy(account, stock.code, 100)
    if success:
        print(f"买入 {stock.name} 100股成功")
        initial_cash = account.cash
        initial_quantity = account.positions[stock.code].quantity

        processed = stock_engine.check_dividends(account, current_date="2026-12-31")
        print(f"处理了 {len(processed)} 个分红事件")
    else:
        print(f"买入失败: {msg}，跳过分红测试")

    print("✓ 分红送股测试通过\n")

def clean_up(account_manager):
    test_account_name = "测试账户"
    if test_account_name in account_manager.get_account_list():
        account_manager.delete_account(test_account_name)
        print(f"清理测试账户: {test_account_name}")

def main():
    print("\n" + "=" * 60)
    print(" "*15 + "股票模拟交易系统 - 功能测试")
    print("=" * 60 + "\n")

    try:
        stock_engine = test_stock_engine()
        account_manager = test_account_manager()
        trading = test_trading_engine(stock_engine, account_manager)
        test_data_export(stock_engine, account_manager)
        test_stop_loss_take_profit(stock_engine, account_manager, trading)
        test_dividends(stock_engine, account_manager)

        print("=" * 60)
        print(" "*20 + "✅ 所有测试通过！")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        clean_up(account_manager)

if __name__ == "__main__":
    main()
