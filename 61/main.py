#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import threading
import time
from datetime import datetime
from typing import Optional

from models import Account
from stock_engine import StockEngine
from account_manager import AccountManager
from trading_engine import TradingEngine
from visualization import Visualization
from data_exporter import DataExporter

class StockTradingSimulator:
    def __init__(self):
        self.stock_engine = StockEngine()
        self.account_manager = AccountManager()
        self.trading_engine = TradingEngine(self.stock_engine)
        self.running = True
        self.price_update_thread: Optional[threading.Thread] = None
        self.last_update_time = 0

        accounts = self.account_manager.get_account_list()
        if not accounts:
            print("检测到首次运行，正在创建默认账户...")
            self.account_manager.create_account("默认账户", 100000.0)
            self.account_manager.switch_account("默认账户")
        else:
            self.account_manager.switch_account(accounts[0])

        self._start_price_updater()

    def _start_price_updater(self):
        def update_loop():
            while self.running:
                self.stock_engine.update_prices()
                self.last_update_time = time.time()
                if self.account_manager.current_account:
                    self.account_manager.update_asset_history(self.stock_engine)
                    triggered = self.trading_engine.check_stop_loss_take_profit(
                        self.account_manager.current_account
                    )
                    if triggered:
                        for trigger_type, code, msg in triggered:
                            print(f"\n[{'='*10} {trigger_type}触发 {'='*10}]")
                            print(msg)
                            print(f"[{'='*28}]\n")
                    self.account_manager.take_daily_snapshot()
                    self.account_manager.save_current_account()
                self.stock_engine.check_dividends(self.account_manager.current_account)
                time.sleep(5)

        self.price_update_thread = threading.Thread(target=update_loop, daemon=True)
        self.price_update_thread.start()

    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def print_header(self):
        account = self.account_manager.current_account
        total_asset = self.trading_engine.calculate_total_asset(account) if account else 0
        profit_loss = total_asset - 100000
        profit_percent = (profit_loss / 100000) * 100

        print("=" * 70)
        print(" "*20 + "📈 股票模拟交易系统 📉")
        print("=" * 70)
        if account:
            profit_color = "\033[32m" if profit_loss >= 0 else "\033[31m"
            reset_color = "\033[0m"
            print(f"当前账户: {account.name} | 可用资金: {account.cash:.2f} 元")
            print(f"总资产: {total_asset:.2f} 元 | {profit_color}盈亏: {profit_loss:+.2f} 元 ({profit_percent:+.2f}%){reset_color}")
            print(f"持仓数量: {len(account.positions)} 支 | 交易记录: {len(account.trade_history)} 条")
        print("-" * 70)

    def print_menu(self):
        print("\n【主菜单】")
        print(" 1. 查看股票行情")
        print(" 2. 查看持仓明细")
        print(" 3. 买入股票")
        print(" 4. 卖出股票")
        print(" 5. 查看交易记录")
        print(" 6. 设置止损止盈")
        print(" 7. 查看资产曲线")
        print(" 8. 查看日历热力图")
        print(" 9. 账户管理")
        print("10. 导出数据")
        print("11. 手续费设置")
        print("12. 重置账户")
        print(" 0. 退出系统")
        print("-" * 70)

    def show_stock_list(self):
        self.clear_screen()
        self.print_header()
        print("\n【股票行情列表】")
        print("-" * 70)
        print(f"{'代码':<10}{'名称':<12}{'当前价格':<12}{'涨跌幅':<12}{'行业':<15}")
        print("-" * 70)

        stocks = self.stock_engine.get_all_stocks()
        for stock in stocks:
            history = self.stock_engine.get_price_history(stock.code)
            if len(history) >= 2:
                prev_price = history[-2][1]
                change = ((stock.price - prev_price) / prev_price) * 100
                change_str = f"{change:+.2f}%"
                if change > 0:
                    change_str = "\033[31m" + change_str + "\033[0m"
                elif change < 0:
                    change_str = "\033[32m" + change_str + "\033[0m"
            else:
                change_str = "-"

            print(f"{stock.code:<10}{stock.name:<12}{stock.price:<12.2f}{change_str:<20}{stock.industry:<15}")

        print("-" * 70)
        print(f"股票价格每5秒自动刷新，上次更新: {datetime.fromtimestamp(self.last_update_time).strftime('%H:%M:%S') if self.last_update_time > 0 else '未更新'}")

        while True:
            choice = input("\n输入股票代码查看走势图(回车返回): ").strip()
            if not choice:
                break
            if self.stock_engine.get_stock(choice):
                Visualization.print_price_history(self.stock_engine, choice)
            else:
                print("股票代码不存在！")

    def show_positions(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【持仓明细】")
        print("-" * 90)
        print(f"{'代码':<10}{'名称':<12}{'持仓':<8}{'成本价':<10}{'当前价':<10}{'市值':<12}{'盈亏':<12}{'盈亏%':<10}{'止损/止盈':<15}")
        print("-" * 90)

        positions = self.trading_engine.get_position_summary(account)
        if not positions:
            print("暂无持仓")
        else:
            for pos in positions:
                profit_color = "\033[32m" if pos["profit_loss"] >= 0 else "\033[31m"
                reset_color = "\033[0m"

                sl_tp = ""
                if pos["stop_loss"] is not None:
                    sl_tp += f"止损{pos['stop_loss']:.1f}% "
                if pos["take_profit"] is not None:
                    sl_tp += f"止盈{pos['take_profit']:.1f}%"

                print(f"{pos['code']:<10}{pos['name']:<12}{pos['quantity']:<8}"
                      f"{pos['avg_cost']:<10.2f}{pos['current_price']:<10.2f}"
                      f"{pos['current_value']:<12.2f}"
                      f"{profit_color}{pos['profit_loss']:<+12.2f}{reset_color}"
                      f"{profit_color}{pos['profit_percent']:<+10.2f}%{reset_color}"
                      f"{sl_tp:<15}")

            print("-" * 90)
            total_market = sum(p["current_value"] for p in positions)
            total_cost = sum(p["cost_value"] for p in positions)
            total_profit = total_market - total_cost
            total_profit_percent = ((total_market - total_cost) / total_cost) * 100 if total_cost > 0 else 0
            print(f"{'':<34}合计: {total_market:<12.2f}{total_profit:<+12.2f}{total_profit_percent:<+10.2f}%")

        input("\n按回车返回...")

    def buy_stock(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【买入股票】")
        print("-" * 70)

        stocks = self.stock_engine.get_all_stocks()
        print(f"{'代码':<10}{'名称':<12}{'当前价格':<12}")
        print("-" * 34)
        for stock in stocks:
            print(f"{stock.code:<10}{stock.name:<12}{stock.price:<12.2f}")
        print("-" * 34)

        stock_code = input("请输入股票代码: ").strip()
        if not self.stock_engine.get_stock(stock_code):
            print("股票代码不存在！")
            input("按回车返回...")
            return

        try:
            quantity = int(input("请输入买入数量(100的整数倍): ").strip())
        except ValueError:
            print("请输入有效的数字！")
            input("按回车返回...")
            return

        success, msg = self.trading_engine.buy(account, stock_code, quantity)
        print("\n" + msg)
        if success:
            self.account_manager.save_current_account()
        input("\n按回车返回...")

    def sell_stock(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        if not account.positions:
            print("当前没有持仓！")
            input("按回车返回...")
            return

        print("\n【卖出股票】")
        print("-" * 70)
        positions = self.trading_engine.get_position_summary(account)
        print(f"{'代码':<10}{'名称':<12}{'可卖数量':<12}{'成本价':<10}{'当前价':<10}")
        print("-" * 54)
        for pos in positions:
            print(f"{pos['code']:<10}{pos['name']:<12}{pos['quantity']:<12}{pos['avg_cost']:<10.2f}{pos['current_price']:<10.2f}")
        print("-" * 54)

        stock_code = input("请输入股票代码: ").strip()
        if stock_code not in account.positions:
            print("未持有该股票！")
            input("按回车返回...")
            return

        try:
            quantity = int(input("请输入卖出数量(100的整数倍): ").strip())
        except ValueError:
            print("请输入有效的数字！")
            input("按回车返回...")
            return

        success, msg = self.trading_engine.sell(account, stock_code, quantity)
        print("\n" + msg)
        if success:
            self.account_manager.save_current_account()
        input("\n按回车返回...")

    def show_trade_history(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【交易记录】")
        print("-" * 90)
        print(f"{'时间':<20}{'类型':<6}{'代码':<10}{'名称':<12}{'数量':<8}{'成交价':<10}{'金额':<12}{'盈亏':<12}")
        print("-" * 90)

        if not account.trade_history:
            print("暂无交易记录")
        else:
            for trade in reversed(account.trade_history[-50:]):
                profit_color = "\033[32m" if trade.profit_loss >= 0 else "\033[31m"
                reset_color = "\033[0m"
                type_color = "\033[31m" if trade.trade_type == "买入" else "\033[32m"
                print(f"{trade.timestamp.strftime('%Y-%m-%d %H:%M'):<20}"
                      f"{type_color}{trade.trade_type:<6}{reset_color}"
                      f"{trade.stock_code:<10}{trade.stock_name:<12}"
                      f"{trade.quantity:<8}{trade.price:<10.2f}"
                      f"{trade.amount:<12.2f}"
                      f"{profit_color}{trade.profit_loss:<+12.2f}{reset_color}")

        print("-" * 90)
        print(f"共 {len(account.trade_history)} 条交易记录")
        input("\n按回车返回...")

    def set_stop_loss_take_profit(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        if not account.positions:
            print("当前没有持仓！")
            input("按回车返回...")
            return

        print("\n【设置止损止盈】")
        print("-" * 70)
        positions = self.trading_engine.get_position_summary(account)
        print(f"{'代码':<10}{'名称':<12}{'当前盈亏%':<12}{'当前止损':<12}{'当前止盈':<12}")
        print("-" * 58)
        for pos in positions:
            sl = f"{pos['stop_loss']:.1f}%" if pos['stop_loss'] is not None else "无"
            tp = f"{pos['take_profit']:.1f}%" if pos['take_profit'] is not None else "无"
            print(f"{pos['code']:<10}{pos['name']:<12}{pos['profit_percent']:<+12.2f}%{sl:<12}{tp:<12}")
        print("-" * 58)

        stock_code = input("请输入股票代码: ").strip()
        if stock_code not in account.positions:
            print("未持有该股票！")
            input("按回车返回...")
            return

        try:
            stop_loss = input("请输入止损百分比(回车跳过): ").strip()
            if stop_loss:
                stop_loss = float(stop_loss)
                success, msg = self.trading_engine.set_stop_loss(account, stock_code, stop_loss)
                print(msg)

            take_profit = input("请输入止盈百分比(回车跳过): ").strip()
            if take_profit:
                take_profit = float(take_profit)
                success, msg = self.trading_engine.set_take_profit(account, stock_code, take_profit)
                print(msg)

            self.account_manager.save_current_account()
        except ValueError:
            print("请输入有效的数字！")

        input("\n按回车返回...")

    def show_asset_curve(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return
        Visualization.print_asset_curve(account)
        input("按回车返回...")

    def show_calendar_heatmap(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return
        Visualization.print_calendar_heatmap(account)
        input("按回车返回...")

    def account_management(self):
        while True:
            self.clear_screen()
            self.print_header()
            print("\n【账户管理】")
            print("-" * 50)
            accounts = self.account_manager.get_account_list()
            print("现有账户:")
            for i, name in enumerate(accounts, 1):
                current = " (当前)" if self.account_manager.current_account and self.account_manager.current_account.name == name else ""
                print(f"  {i}. {name}{current}")
            print("-" * 50)
            print("1. 创建新账户")
            print("2. 切换账户")
            print("3. 删除账户")
            print("0. 返回主菜单")
            print("-" * 50)

            choice = input("请选择操作: ").strip()

            if choice == "1":
                name = input("请输入新账户名称: ").strip()
                if name:
                    account = self.account_manager.create_account(name)
                    if account:
                        print(f"账户 {name} 创建成功！")
                        self.account_manager.switch_account(name)
                else:
                    print("账户名称不能为空！")
                time.sleep(1)

            elif choice == "2":
                if accounts:
                    try:
                        idx = int(input("请输入账户编号: ").strip()) - 1
                        if 0 <= idx < len(accounts):
                            self.account_manager.switch_account(accounts[idx])
                            print(f"已切换到账户: {accounts[idx]}")
                            time.sleep(1)
                        else:
                            print("无效的编号！")
                    except ValueError:
                        print("请输入有效的数字！")
                else:
                    print("暂无账户！")
                time.sleep(1)

            elif choice == "3":
                if accounts:
                    try:
                        idx = int(input("请输入要删除的账户编号: ").strip()) - 1
                        if 0 <= idx < len(accounts):
                            confirm = input(f"确定要删除账户 {accounts[idx]} 吗？(y/n): ").strip().lower()
                            if confirm == 'y':
                                self.account_manager.delete_account(accounts[idx])
                                print(f"账户 {accounts[idx]} 已删除！")
                            time.sleep(1)
                        else:
                            print("无效的编号！")
                    except ValueError:
                        print("请输入有效的数字！")
                else:
                    print("暂无账户！")
                time.sleep(1)

            elif choice == "0":
                break

    def export_data(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【数据导出】")
        print("-" * 50)
        print("1. 导出交易记录为CSV")
        print("2. 导出持仓明细为CSV")
        print("3. 导出资产历史为CSV")
        print("0. 返回主菜单")
        print("-" * 50)

        choice = input("请选择操作: ").strip()

        if choice == "1":
            filepath = DataExporter.export_trade_history(account)
            print(f"交易记录已导出到: {filepath}")
        elif choice == "2":
            filepath = DataExporter.export_positions(account, self.stock_engine)
            print(f"持仓明细已导出到: {filepath}")
        elif choice == "3":
            filepath = DataExporter.export_asset_history(account)
            print(f"资产历史已导出到: {filepath}")

        input("\n按回车返回...")

    def fee_settings(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【手续费设置】")
        print("-" * 50)
        print(f"当前佣金比例: {account.fee_rate * 100:.4f}%")
        print(f"当前最低手续费: {account.min_fee:.2f} 元")
        print("-" * 50)

        try:
            new_rate = input("请输入新的佣金比例(%, 回车保持不变): ").strip()
            if new_rate:
                account.fee_rate = float(new_rate) / 100

            new_min_fee = input("请输入新的最低手续费(元, 回车保持不变): ").strip()
            if new_min_fee:
                account.min_fee = float(new_min_fee)

            print(f"\n设置已更新！")
            print(f"佣金比例: {account.fee_rate * 100:.4f}%")
            print(f"最低手续费: {account.min_fee:.2f} 元")
            self.account_manager.save_current_account()
        except ValueError:
            print("请输入有效的数字！")

        input("\n按回车返回...")

    def reset_account(self):
        self.clear_screen()
        self.print_header()
        account = self.account_manager.current_account
        if not account:
            print("请先选择账户！")
            return

        print("\n【重置账户】")
        print("-" * 50)
        print(f"警告: 这将清空账户 {account.name} 的所有交易记录和持仓！")
        print("资金将重置为10万元。")
        confirm = input("确定要重置吗？(输入 yes 确认): ").strip().lower()

        if confirm == "yes":
            self.account_manager.reset_account(account.name)
            print(f"账户 {account.name} 已重置！")
        else:
            print("已取消重置。")

        input("\n按回车返回...")

    def run(self):
        while self.running:
            try:
                self.clear_screen()
                self.print_header()
                self.print_menu()

                choice = input("请选择操作: ").strip()

                if choice == "1":
                    self.show_stock_list()
                elif choice == "2":
                    self.show_positions()
                elif choice == "3":
                    self.buy_stock()
                elif choice == "4":
                    self.sell_stock()
                elif choice == "5":
                    self.show_trade_history()
                elif choice == "6":
                    self.set_stop_loss_take_profit()
                elif choice == "7":
                    self.show_asset_curve()
                elif choice == "8":
                    self.show_calendar_heatmap()
                elif choice == "9":
                    self.account_management()
                elif choice == "10":
                    self.export_data()
                elif choice == "11":
                    self.fee_settings()
                elif choice == "12":
                    self.reset_account()
                elif choice == "0":
                    print("\n正在保存数据...")
                    self.running = False
                    if self.price_update_thread:
                        self.price_update_thread.join(timeout=1)
                    self.account_manager.save_current_account()
                    print("感谢使用股票模拟交易系统，再见！")
                    break
                else:
                    print("无效的选择，请重新输入！")
                    time.sleep(1)

            except KeyboardInterrupt:
                print("\n\n检测到退出信号，正在保存数据...")
                self.running = False
                self.account_manager.save_current_account()
                print("感谢使用股票模拟交易系统，再见！")
                break
            except Exception as e:
                print(f"\n发生错误: {e}")
                input("按回车继续...")

def main():
    simulator = StockTradingSimulator()
    simulator.run()

if __name__ == "__main__":
    main()
