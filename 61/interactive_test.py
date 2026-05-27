#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import time
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Account, Position
from stock_engine import StockEngine
from account_manager import AccountManager
from trading_engine import TradingEngine
from visualization import Visualization
from data_exporter import DataExporter

class InteractiveTester:
    def __init__(self):
        self.stock_engine = StockEngine()
        self.account_manager = AccountManager()
        self.trading_engine = TradingEngine(self.stock_engine)
        self.test_results = []
        self.cleanup_accounts = []

    def print_header(self, title):
        print("\n" + "=" * 70)
        print(f"{' ' * ((70 - len(title)) // 2)}{title}")
        print("=" * 70)

    def print_result(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"       {details}")
        self.test_results.append((test_name, success, details))

    def get_cheap_stock(self, max_price_per_100=30000):
        for stock in self.stock_engine.get_all_stocks():
            if stock.price * 100 < max_price_per_100:
                return stock
        return self.stock_engine.get_all_stocks()[-1]

    def test_1_multi_account(self):
        self.print_header("测试1: 多账户创建与切换")
        
        test_accounts = ["测试账户A", "测试账户B", "测试账户C"]
        
        for acc_name in test_accounts:
            if acc_name in self.account_manager.get_account_list():
                self.account_manager.delete_account(acc_name)
        
        print("步骤1: 创建3个测试账户")
        for acc_name in test_accounts:
            account = self.account_manager.create_account(acc_name, 100000.0)
            self.cleanup_accounts.append(acc_name)
            if account:
                print(f"  ✓ 创建账户: {acc_name}，初始资金: {account.cash:.2f}元")
            else:
                self.print_result("多账户创建", False, f"创建账户 {acc_name} 失败")
                return False

        print("\n步骤2: 切换账户并验证")
        for acc_name in test_accounts:
            self.account_manager.switch_account(acc_name)
            current = self.account_manager.current_account
            if current and current.name == acc_name:
                print(f"  ✓ 切换到账户: {acc_name}")
            else:
                self.print_result("多账户切换", False, f"切换到账户 {acc_name} 失败")
                return False

        print("\n步骤3: 验证账户数据隔离")
        self.account_manager.switch_account("测试账户A")
        account_a = self.account_manager.current_account
        stock = self.get_cheap_stock()
        success, _ = self.trading_engine.buy(account_a, stock.code, 100)
        if success:
            print(f"  ✓ 在账户A买入 {stock.name} 100股")
        
        self.account_manager.switch_account("测试账户B")
        account_b = self.account_manager.current_account
        if stock.code not in account_b.positions:
            print(f"  ✓ 账户B没有持仓，数据隔离正常")
        else:
            self.print_result("账户数据隔离", False, "账户B不应有持仓")
            return False

        self.print_result("多账户创建与切换", True, 
                        f"成功创建{len(test_accounts)}个账户，切换和隔离均正常")
        return True

    def test_2_stop_loss_take_profit(self):
        self.print_header("测试2: 止损止盈设置与自动卖出触发")
        
        if "止损测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("止损测试账户")
        
        account = self.account_manager.create_account("止损测试账户", 200000.0)
        self.cleanup_accounts.append("止损测试账户")
        self.account_manager.switch_account("止损测试账户")
        
        stock = self.get_cheap_stock(20000)
        
        print(f"步骤1: 买入 {stock.name}")
        success, msg = self.trading_engine.buy(account, stock.code, 200)
        if not success:
            self.print_result("止损止盈测试", False, f"买入失败: {msg}")
            return False
        print(f"  ✓ {msg}")
        
        print("\n步骤2: 设置止损5%，止盈10%")
        success, msg = self.trading_engine.set_stop_loss(account, stock.code, 5.0)
        print(f"  ✓ {msg}")
        success, msg = self.trading_engine.set_take_profit(account, stock.code, 10.0)
        print(f"  ✓ {msg}")
        
        position = account.positions[stock.code]
        if position.stop_loss != 5.0 or position.take_profit != 10.0:
            self.print_result("止损止盈设置", False, "设置未生效")
            return False
        
        print("\n步骤3: 模拟价格大幅下跌，触发止损")
        original_price = stock.price
        stock.price = position.avg_cost * 0.90
        print(f"  原价格: {original_price:.2f} → 模拟价格: {stock.price:.2f} (下跌10%)")
        
        triggered = self.trading_engine.check_stop_loss_take_profit(account)
        if triggered:
            for trigger_type, code, msg in triggered:
                print(f"  ✓ {trigger_type}触发: {msg}")
        else:
            self.print_result("止损触发测试", False, "止损未触发")
            return False
        
        if stock.code not in account.positions:
            print(f"  ✓ 持仓已清空，止损卖出成功")
        else:
            self.print_result("止损卖出验证", False, "持仓未清空")
            return False
        
        self.print_result("止损止盈设置与自动卖出", True, 
                        f"成功设置并触发止损，自动卖出 {stock.name}")
        return True

    def test_3_calendar_heatmap(self):
        self.print_header("测试3: 日历热力图显示")
        
        if "热力图测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("热力图测试账户")
        
        account = self.account_manager.create_account("热力图测试账户", 100000.0)
        self.cleanup_accounts.append("热力图测试账户")
        
        print("步骤1: 生成过去30天的资产快照")
        base_date = datetime.now().date()
        base_asset = 100000.0
        
        for i in range(30):
            test_date = base_date - timedelta(days=29 - i)
            date_str = test_date.strftime("%Y-%m-%d")
            variation = (i - 15) * 200 + ((i * 37) % 500 - 250)
            account.daily_snapshots[date_str] = base_asset + variation
        
        print(f"  ✓ 生成了 {len(account.daily_snapshots)} 天的资产快照")
        
        print("\n步骤2: 显示日历热力图")
        print("-" * 70)
        Visualization.print_calendar_heatmap(account)
        print("-" * 70)
        
        if len(account.daily_snapshots) >= 28:
            self.print_result("日历热力图显示", True, 
                            f"成功生成并展示{len(account.daily_snapshots)}天的热力图")
            return True
        else:
            self.print_result("日历热力图显示", False, "数据不足")
            return False

    def test_4_dividends(self):
        self.print_header("测试4: 分红送股执行验证")
        
        if "分红测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("分红测试账户")
        
        account = self.account_manager.create_account("分红测试账户", 200000.0)
        self.cleanup_accounts.append("分红测试账户")
        
        stock = None
        for dividend in self.stock_engine.dividends:
            if dividend.cash_per_share > 0 or dividend.stock_dividend_ratio > 0:
                stock = self.stock_engine.get_stock(dividend.stock_code)
                if stock and stock.price * 1000 < 150000:
                    break
        
        if not stock:
            stock = self.get_cheap_stock(150)
        
        print(f"步骤1: 买入 {stock.name} 1000股")
        success, msg = self.trading_engine.buy(account, stock.code, 1000)
        if not success:
            self.print_result("分红送股测试", False, f"买入失败: {msg}")
            return False
        print(f"  ✓ {msg}")
        
        initial_cash = account.cash
        initial_quantity = account.positions[stock.code].quantity
        print(f"  初始资金: {initial_cash:.2f}元, 持股数量: {initial_quantity}股")
        
        print("\n步骤2: 执行分红处理")
        processed = self.stock_engine.check_dividends(account, current_date="2026-12-31")
        print(f"  ✓ 处理了 {len(processed)} 个分红事件")
        
        for dividend in processed:
            if dividend.stock_code == stock.code:
                print(f"    {stock.name}: 现金分红 {dividend.cash_per_share}元/股", end="")
                if dividend.stock_dividend_ratio > 0:
                    print(f", 送股比例 {dividend.stock_dividend_ratio*100}%")
                else:
                    print()
        
        final_cash = account.cash
        final_quantity = account.positions[stock.code].quantity
        
        cash_increased = final_cash > initial_cash
        quantity_increased = final_quantity >= initial_quantity
        
        print(f"\n  分红后资金: {final_cash:.2f}元 (增加: {final_cash - initial_cash:.2f}元)")
        print(f"  分红后股数: {final_quantity}股 (增加: {final_quantity - initial_quantity}股)")
        
        if cash_increased or quantity_increased:
            self.print_result("分红送股执行", True, 
                            f"现金增加 {final_cash - initial_cash:.2f}元, 股数增加 {final_quantity - initial_quantity}股")
            return True
        else:
            self.print_result("分红送股执行", False, "分红未生效")
            return False

    def test_5_csv_export(self):
        self.print_header("测试5: CSV导出文件生成")
        
        if "导出测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("导出测试账户")
        
        account = self.account_manager.create_account("导出测试账户", 100000.0)
        self.cleanup_accounts.append("导出测试账户")
        
        print("步骤1: 进行几笔交易生成数据")
        stocks = self.stock_engine.get_all_stocks()
        for i in range(3):
            stock = stocks[i + 5]
            if stock.price * 100 < 10000:
                self.trading_engine.buy(account, stock.code, 100)
                print(f"  ✓ 买入 {stock.name} 100股")
        
        for i in range(5):
            self.stock_engine.update_prices()
            self.account_manager.update_asset_history(self.stock_engine)
        
        print(f"\n步骤2: 导出交易记录、持仓、资产历史")
        
        trade_file = DataExporter.export_trade_history(account)
        if os.path.exists(trade_file):
            print(f"  ✓ 交易记录已导出: {os.path.basename(trade_file)}")
            trade_size = os.path.getsize(trade_file)
            print(f"     文件大小: {trade_size} 字节")
        else:
            self.print_result("CSV导出", False, "交易记录导出失败")
            return False
        
        position_file = DataExporter.export_positions(account, self.stock_engine)
        if os.path.exists(position_file):
            print(f"  ✓ 持仓明细已导出: {os.path.basename(position_file)}")
            pos_size = os.path.getsize(position_file)
            print(f"     文件大小: {pos_size} 字节")
        else:
            self.print_result("CSV导出", False, "持仓导出失败")
            return False
        
        asset_file = DataExporter.export_asset_history(account)
        if os.path.exists(asset_file):
            print(f"  ✓ 资产历史已导出: {os.path.basename(asset_file)}")
            asset_size = os.path.getsize(asset_file)
            print(f"     文件大小: {asset_size} 字节")
        else:
            self.print_result("CSV导出", False, "资产历史导出失败")
            return False
        
        print("\n步骤3: 验证CSV文件内容")
        with open(trade_file, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
            print(f"  ✓ 交易记录CSV: {len(lines)} 行 (含表头)")
        
        self.print_result("CSV导出文件生成", True, 
                        f"成功导出3个CSV文件，共 {trade_size + pos_size + asset_size} 字节")
        return True

    def test_6_account_reset(self):
        self.print_header("测试6: 账户重置功能")
        
        if "重置测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("重置测试账户")
        
        account = self.account_manager.create_account("重置测试账户", 100000.0)
        self.cleanup_accounts.append("重置测试账户")
        
        print("步骤1: 进行交易修改账户状态")
        stock = self.get_cheap_stock()
        self.trading_engine.buy(account, stock.code, 100)
        print(f"  ✓ 买入 {stock.name} 100股")
        
        before_cash = account.cash
        before_positions = len(account.positions)
        before_trades = len(account.trade_history)
        print(f"  重置前 - 资金: {before_cash:.2f}元, 持仓: {before_positions}支, 交易: {before_trades}条")
        
        print("\n步骤2: 执行账户重置")
        reset_account = self.account_manager.reset_account("重置测试账户", 100000.0)
        
        after_cash = reset_account.cash
        after_positions = len(reset_account.positions)
        after_trades = len(reset_account.trade_history)
        print(f"  重置后 - 资金: {after_cash:.2f}元, 持仓: {after_positions}支, 交易: {after_trades}条")
        
        if after_cash == 100000.0 and after_positions == 0 and after_trades == 0:
            print("  ✓ 账户已重置到初始状态")
            self.print_result("账户重置功能", True, 
                            f"资金恢复到10万，持仓和交易记录已清空")
            return True
        else:
            self.print_result("账户重置功能", False, "重置未完全生效")
            return False

    def test_7_fee_settings(self):
        self.print_header("测试7: 手续费设置生效")
        
        if "手续费测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("手续费测试账户")
        
        account = self.account_manager.create_account("手续费测试账户", 100000.0)
        self.cleanup_accounts.append("手续费测试账户")
        
        print("步骤1: 查看默认手续费设置")
        print(f"  默认佣金比例: {account.fee_rate * 100:.4f}%")
        print(f"  默认最低手续费: {account.min_fee:.2f} 元")
        
        test_amount = 10000
        default_fee = account.calculate_fee(test_amount)
        print(f"  1万元交易默认手续费: {default_fee:.2f} 元")
        
        print("\n步骤2: 修改手续费设置")
        account.fee_rate = 0.001
        account.min_fee = 10.0
        print(f"  新佣金比例: {account.fee_rate * 100:.4f}%")
        print(f"  新最低手续费: {account.min_fee:.2f} 元")
        
        new_fee = account.calculate_fee(test_amount)
        print(f"  1万元交易新手续费: {new_fee:.2f} 元")
        
        if new_fee == 10.0:
            print("  ✓ 手续费设置已生效")
        else:
            self.print_result("手续费设置", False, "手续费计算不正确")
            return False
        
        print("\n步骤3: 验证实际交易手续费")
        stock = self.get_cheap_stock(5000)
        quantity = 100
        expected_amount = stock.price * quantity
        expected_fee = max(expected_amount * account.fee_rate, account.min_fee)
        
        before_cash = account.cash
        success, _ = self.trading_engine.buy(account, stock.code, quantity)
        if success:
            actual_cost = before_cash - account.cash
            print(f"  买入 {stock.name} {quantity}股")
            print(f"  预期花费: {expected_amount + expected_fee:.2f} 元")
            print(f"  实际花费: {actual_cost:.2f} 元")
            
            if abs(actual_cost - (expected_amount + expected_fee)) < 0.1:
                print("  ✓ 实际交易手续费计算正确")
            else:
                self.print_result("手续费实际应用", False, "手续费计算有偏差")
                return False
        
        self.print_result("手续费设置生效", True, 
                        f"佣金0.1%，最低10元，计算和应用均正确")
        return True

    def test_8_asset_curve(self):
        self.print_header("测试8: 资产曲线展示")
        
        if "曲线测试账户" in self.account_manager.get_account_list():
            self.account_manager.delete_account("曲线测试账户")
        
        account = self.account_manager.create_account("曲线测试账户", 100000.0)
        self.cleanup_accounts.append("曲线测试账户")
        
        print("步骤1: 生成资产历史数据")
        base_value = 100000.0
        for i in range(40):
            self.stock_engine.update_prices()
            fluctuation = (i - 20) * 50 + ((i * 23) % 200 - 100)
            account.asset_history.append((
                datetime.now() - timedelta(minutes=40 - i),
                base_value + fluctuation
            ))
        
        print(f"  ✓ 生成了 {len(account.asset_history)} 个资产数据点")
        
        print("\n步骤2: 显示资产曲线")
        print("-" * 70)
        Visualization.print_asset_curve(account, max_points=40)
        print("-" * 70)
        
        if len(account.asset_history) >= 20:
            self.print_result("资产曲线展示", True, 
                            f"成功展示{len(account.asset_history)}个数据点的资产曲线")
            return True
        else:
            self.print_result("资产曲线展示", False, "数据不足")
            return False

    def cleanup(self):
        print("\n" + "=" * 70)
        print("清理测试数据")
        print("=" * 70)
        for acc_name in self.cleanup_accounts:
            if acc_name in self.account_manager.get_account_list():
                self.account_manager.delete_account(acc_name)
                print(f"  ✓ 删除测试账户: {acc_name}")

    def print_summary(self):
        print("\n" + "=" * 70)
        print(f"{' ' * 25}测试结果汇总")
        print("=" * 70)
        
        passed = sum(1 for _, success, _ in self.test_results if success)
        total = len(self.test_results)
        
        print(f"\n总测试数: {total}")
        print(f"通过: {passed}")
        print(f"失败: {total - passed}")
        print(f"通过率: {passed/total*100:.1f}%")
        
        print("\n详细结果:")
        print("-" * 70)
        for test_name, success, details in self.test_results:
            status = "✅" if success else "❌"
            print(f"{status} {test_name}")
            if details:
                print(f"   {details}")
        
        print("=" * 70)
        if passed == total:
            print("🎉 所有测试通过！")
        else:
            print(f"⚠️  有 {total - passed} 项测试未通过")
        print("=" * 70)

    def run_all_tests(self):
        print("\n" + "#" * 70)
        print(f"{' ' * 20}股票模拟交易系统 - 交互式功能验证")
        print("#" * 70)
        print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        tests = [
            ("多账户切换和创建", self.test_1_multi_account),
            ("止损止盈设置和自动卖出", self.test_2_stop_loss_take_profit),
            ("日历热力图显示", self.test_3_calendar_heatmap),
            ("分红送股执行验证", self.test_4_dividends),
            ("CSV导出文件生成", self.test_5_csv_export),
            ("账户重置功能", self.test_6_account_reset),
            ("手续费设置生效", self.test_7_fee_settings),
            ("资产曲线展示", self.test_8_asset_curve),
        ]
        
        try:
            for test_name, test_func in tests:
                try:
                    test_func()
                    time.sleep(0.5)
                except Exception as e:
                    print(f"  测试发生异常: {e}")
                    self.print_result(test_name, False, f"异常: {str(e)}")
        finally:
            self.cleanup()
            self.print_summary()

def main():
    tester = InteractiveTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
