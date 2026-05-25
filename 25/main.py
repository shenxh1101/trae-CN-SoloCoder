import os
import sys
import time
import platform
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from colorama import init, Fore, Style
from tabulate import tabulate

from config import ConfigManager
from api_client import StockAPIClient
from stock import Stock
from portfolio import Portfolio
from alerts import AlertManager
from chart import ASCIIChart
from indicators import TechnicalIndicators
from dragon_tiger import DragonTigerBoard
from historical import HistoricalData
from reports import ReportExporter

init()


class StockWatcher:
    def __init__(self):
        self.config_manager = ConfigManager()
        self.api_client = StockAPIClient()
        self.portfolio = Portfolio(self.config_manager)
        self.alert_manager = AlertManager(self.config_manager)
        self.indicators = TechnicalIndicators(self.api_client)
        self.dragon_tiger = DragonTigerBoard(self.api_client)
        self.historical = HistoricalData(self.api_client)
        self.chart = ASCIIChart()
        self.reporter = ReportExporter()
        
        self.running = False
        self.refresh_interval = self.config_manager.get_setting("refresh_interval", 5)

    def clear_screen(self):
        os.system('cls' if platform.system() == 'Windows' else 'clear')

    def print_header(self):
        print(f"\n{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'📈 股票盯盘系统 v1.0':^80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}当前配置: {self.config_manager.current_profile} | "
              f"刷新间隔: {self.refresh_interval}秒 | "
              f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}\n")

    def print_menu(self):
        print(f"""
{Fore.GREEN}=== 主菜单 ==={Style.RESET_ALL}
1. 实时盯盘
2. 自选股管理
3. 分组管理
4. 价格提醒设置
5. 查看分时图
6. 技术指标分析
7. 龙虎榜数据
8. 历史数据查询
9. 导出日报
10. 账户管理
11. 系统设置
0. 退出系统
        """)

    def refresh_stock_prices(self):
        codes = self.portfolio.get_stock_codes()
        if not codes:
            return
            
        quotes = self.api_client.get_stock_quotes(codes)
        
        for code, quote_data in quotes.items():
            stock = self.portfolio.get_stock(code)
            if stock:
                stock.update_price(quote_data)
                
                minute_data = self.api_client.get_minute_data(code, days=1)
                if minute_data:
                    stock.price_history = minute_data

    def update_indicators(self):
        for stock in self.portfolio.get_all_stocks():
            self.indicators.update_stock_indicators(stock)

    def format_number(self, num: float, decimals: int = 2) -> str:
        if num >= 100000000:
            return f"{num/100000000:.2f}亿"
        elif num >= 10000:
            return f"{num/10000:.2f}万"
        return f"{num:.{decimals}f}"

    def format_change(self, value: float, is_percent: bool = False) -> str:
        if is_percent:
            formatted = f"{value:+.2f}%"
        else:
            formatted = f"{value:+.2f}"
            
        if value > 0:
            return f"{Fore.RED}{formatted}{Style.RESET_ALL}"
        elif value < 0:
            return f"{Fore.GREEN}{formatted}{Style.RESET_ALL}"
        return f"{Fore.WHITE}{formatted}{Style.RESET_ALL}"

    def format_pl(self, value: float) -> str:
        if value > 0:
            return f"{Fore.RED}{value:+,.2f}{Style.RESET_ALL}"
        elif value < 0:
            return f"{Fore.GREEN}{value:+,.2f}{Style.RESET_ALL}"
        return f"{value:,.2f}"

    def display_realtime_data(self):
        self.refresh_stock_prices()
        self.update_indicators()
        self.clear_screen()
        self.print_header()

        total_value = self.portfolio.get_total_market_value()
        total_cost = self.portfolio.get_total_cost()
        total_pl = self.portfolio.get_total_profit_loss()
        total_pl_pct = self.portfolio.get_total_profit_loss_percent()

        print(f"""
{Fore.MAGENTA}【账户总览】{Style.RESET_ALL}
  总市值: {Fore.CYAN}¥{total_value:,.2f}{Style.RESET_ALL}
  总成本: {Fore.CYAN}¥{total_cost:,.2f}{Style.RESET_ALL}
  总盈亏: {self.format_pl(total_pl)}
  盈亏比: {self.format_change(total_pl_pct, True)}
  股票数: {Fore.CYAN}{len(self.portfolio)}{Style.RESET_ALL} 只
        """)

        groups = self.portfolio.get_groups()
        for group_name in groups:
            stocks = self.portfolio.get_stocks_by_group(group_name)
            if not stocks:
                continue

            group_summary = self.portfolio.get_group_summary(group_name)
            
            print(f"\n{Fore.BLUE}【{group_name}】{Style.RESET_ALL} "
                  f"({group_summary['stock_count']}只 | "
                  f"市值: ¥{group_summary['total_market_value']:,.2f} | "
                  f"盈亏: {self.format_pl(group_summary['total_profit_loss'])} "
                  f"({self.format_change(group_summary['profit_loss_percent'], True)})")

            headers = ["代码", "名称", "现价", "涨跌幅", "涨跌额", 
                      "今开", "最高", "最低", "成交量", "成交额",
                      "成本价", "盈亏", "盈亏%", "MA5", "MA10"]
            rows = []

            for stock in stocks:
                rows.append([
                    stock.code,
                    stock.name,
                    f"{stock.current_price:.2f}",
                    self.format_change(stock.change_percent, True),
                    self.format_change(stock.change_amount),
                    f"{stock.open_price:.2f}",
                    f"{stock.high_price:.2f}",
                    f"{stock.low_price:.2f}",
                    self.format_number(stock.volume),
                    self.format_number(stock.turnover),
                    f"{stock.cost_price:.2f}" if stock.cost_price > 0 else "-",
                    self.format_pl(stock.profit_loss) if stock.cost_price > 0 else "-",
                    self.format_change(stock.profit_loss_percent, True) if stock.cost_price > 0 else "-",
                    f"{stock.ma5:.2f}" if stock.ma5 > 0 else "-",
                    f"{stock.ma10:.2f}" if stock.ma10 > 0 else "-",
                ])

            print(tabulate(rows, headers=headers, tablefmt="grid"))

        triggered_alerts = self.alert_manager.check_alerts(
            {s.code: s for s in self.portfolio.get_all_stocks()}
        )
        
        for alert in triggered_alerts:
            stock = self.portfolio.get_stock(alert.stock_code)
            if stock:
                self.alert_manager.show_alert_popup(alert, stock)

        print(f"\n{Fore.YELLOW}按 Ctrl+C 返回主菜单{Style.RESET_ALL}")

    def realtime_monitor(self):
        self.running = True
        print(f"\n{Fore.GREEN}启动实时盯盘模式，每 {self.refresh_interval} 秒刷新一次...{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}按 Ctrl+C 退出盯盘模式{Style.RESET_ALL}\n")
        
        try:
            while self.running:
                self.display_realtime_data()
                for _ in range(self.refresh_interval):
                    if not self.running:
                        break
                    time.sleep(1)
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}已退出实时盯盘模式{Style.RESET_ALL}")
            self.running = False

    def manage_stocks(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 自选股管理 ==={Style.RESET_ALL}")
            print("1. 添加股票")
            print("2. 删除股票")
            print("3. 修改股票信息")
            print("4. 查看自选股列表")
            print("5. 搜索股票")
            print("0. 返回主菜单")
            
            choice = input("\n请选择操作: ").strip()
            
            if choice == "1":
                self.add_stock()
            elif choice == "2":
                self.remove_stock()
            elif choice == "3":
                self.edit_stock()
            elif choice == "4":
                self.list_stocks()
            elif choice == "5":
                self.search_stock()
            elif choice == "0":
                break
            else:
                print(f"{Fore.RED}无效选择，请重试{Style.RESET_ALL}")
                input("按回车继续...")

    def add_stock(self):
        print(f"\n{Fore.GREEN}--- 添加股票 ---{Style.RESET_ALL}")
        
        keyword = input("请输入股票代码或名称搜索 (直接输入代码可跳过搜索): ").strip()
        if not keyword:
            return
            
        search_results = self.api_client.search_stock(keyword)
        
        if search_results:
            print(f"\n搜索结果:")
            for idx, result in enumerate(search_results, 1):
                print(f"  {idx}. {result['code']} - {result['name']} ({result['market']})")
            
            choice = input("\n选择序号 (直接回车使用输入的代码): ").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(search_results):
                selected = search_results[int(choice) - 1]
                code = selected['code']
                name = selected['name']
            else:
                code = keyword
                name = ""
        else:
            code = keyword
            name = ""
            
        if code in self.portfolio:
            print(f"{Fore.RED}该股票已在自选股列表中{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        if not name:
            quote = self.api_client.get_stock_quote(code)
            name = quote.get("name", "") if quote else ""
            
        cost_price = input("请输入成本价 (0表示不计算盈亏): ").strip()
        try:
            cost_price = float(cost_price) if cost_price else 0.0
        except ValueError:
            cost_price = 0.0
            
        shares = input("请输入持仓数量 (可选): ").strip()
        try:
            shares = int(shares) if shares else 0
        except ValueError:
            shares = 0
            
        groups = self.portfolio.get_groups()
        print(f"\n可选分组:")
        for idx, g in enumerate(groups, 1):
            print(f"  {idx}. {g}")
        print(f"  {len(groups) + 1}. 创建新分组")
        
        group_choice = input("选择分组 (默认1): ").strip()
        if group_choice.isdigit():
            idx = int(group_choice) - 1
            if 0 <= idx < len(groups):
                group = groups[idx]
            elif idx == len(groups):
                group = input("请输入新分组名称: ").strip()
                if not group:
                    group = "默认"
            else:
                group = groups[0] if groups else "默认"
        else:
            group = groups[0] if groups else "默认"
            
        success = self.portfolio.add_stock(code, name, cost_price, group, shares)
        if success:
            print(f"{Fore.GREEN}成功添加股票: {code} {name}{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}添加失败{Style.RESET_ALL}")
            
        input("按回车继续...")

    def remove_stock(self):
        print(f"\n{Fore.GREEN}--- 删除股票 ---{Style.RESET_ALL}")
        self.list_stocks_simple()
        
        code = input("请输入要删除的股票代码: ").strip()
        if not code:
            return
            
        if code not in self.portfolio:
            print(f"{Fore.RED}未找到该股票{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        confirm = input(f"确认删除 {code}? (y/N): ").strip().lower()
        if confirm == 'y':
            success = self.portfolio.remove_stock(code)
            if success:
                print(f"{Fore.GREEN}删除成功{Style.RESET_ALL}")
            else:
                print(f"{Fore.RED}删除失败{Style.RESET_ALL}")
                
        input("按回车继续...")

    def edit_stock(self):
        print(f"\n{Fore.GREEN}--- 修改股票信息 ---{Style.RESET_ALL}")
        self.list_stocks_simple()
        
        code = input("请输入要修改的股票代码: ").strip()
        stock = self.portfolio.get_stock(code)
        
        if not stock:
            print(f"{Fore.RED}未找到该股票{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        print(f"\n当前信息:")
        print(f"  代码: {stock.code}")
        print(f"  名称: {stock.name}")
        print(f"  成本价: {stock.cost_price}")
        print(f"  持仓数: {stock.shares}")
        print(f"  分组: {stock.group}")
        
        updates = {}
        
        new_name = input(f"新名称 (回车保持'{stock.name}'): ").strip()
        if new_name:
            updates["name"] = new_name
            
        new_cost = input(f"新成本价 (回车保持{stock.cost_price}): ").strip()
        if new_cost:
            try:
                updates["cost_price"] = float(new_cost)
            except ValueError:
                print(f"{Fore.RED}成本价格式错误，跳过{Style.RESET_ALL}")
                
        new_shares = input(f"新持仓数 (回车保持{stock.shares}): ").strip()
        if new_shares:
            try:
                updates["shares"] = int(new_shares)
            except ValueError:
                print(f"{Fore.RED}持仓数格式错误，跳过{Style.RESET_ALL}")
                
        groups = self.portfolio.get_groups()
        print(f"\n可选分组:")
        for idx, g in enumerate(groups, 1):
            print(f"  {idx}. {g}")
            
        group_choice = input(f"选择新分组 (回车保持'{stock.group}'): ").strip()
        if group_choice.isdigit() and 1 <= int(group_choice) <= len(groups):
            updates["group"] = groups[int(group_choice) - 1]
            
        if updates:
            success = self.portfolio.update_stock(code, **updates)
            if success:
                print(f"{Fore.GREEN}修改成功{Style.RESET_ALL}")
            else:
                print(f"{Fore.RED}修改失败{Style.RESET_ALL}")
        else:
            print("没有修改内容")
            
        input("按回车继续...")

    def list_stocks_simple(self):
        stocks = self.portfolio.get_all_stocks()
        if not stocks:
            print("自选股列表为空")
            return
            
        print(f"\n当前自选股列表:")
        for idx, stock in enumerate(stocks, 1):
            print(f"  {idx:2d}. {stock.code} - {stock.name}")

    def list_stocks(self):
        self.refresh_stock_prices()
        stocks = self.portfolio.get_all_stocks()
        
        if not stocks:
            print("\n自选股列表为空")
            input("按回车继续...")
            return
            
        headers = ["代码", "名称", "市场", "分组", "现价", "涨跌幅", 
                  "成本价", "持仓", "盈亏", "盈亏%", "MA5", "MA10"]
        rows = []
        
        for stock in stocks:
            rows.append([
                stock.code,
                stock.name,
                stock.market,
                stock.group,
                f"{stock.current_price:.2f}",
                self.format_change(stock.change_percent, True),
                f"{stock.cost_price:.2f}" if stock.cost_price > 0 else "-",
                f"{stock.shares:,}" if stock.shares > 0 else "-",
                self.format_pl(stock.profit_loss) if stock.cost_price > 0 else "-",
                self.format_change(stock.profit_loss_percent, True) if stock.cost_price > 0 else "-",
                f"{stock.ma5:.2f}" if stock.ma5 > 0 else "-",
                f"{stock.ma10:.2f}" if stock.ma10 > 0 else "-",
            ])
            
        print(f"\n{Fore.GREEN}--- 自选股列表 ---{Style.RESET_ALL}")
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        
        input("\n按回车继续...")

    def search_stock(self):
        keyword = input("请输入搜索关键词: ").strip()
        if not keyword:
            return
            
        results = self.api_client.search_stock(keyword)
        if not results:
            print(f"{Fore.RED}未找到匹配的股票{Style.RESET_ALL}")
        else:
            print(f"\n搜索结果:")
            for idx, result in enumerate(results, 1):
                print(f"  {idx}. {result['code']} - {result['name']} ({result['market']})")
                
        input("\n按回车继续...")

    def manage_groups(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 分组管理 ==={Style.RESET_ALL}")
            
            groups = self.portfolio.get_groups()
            print(f"\n当前分组:")
            for idx, g in enumerate(groups, 1):
                count = len(self.portfolio.get_stocks_by_group(g))
                print(f"  {idx}. {g} ({count} 只股票)")
                
            print("\n1. 添加分组")
            print("2. 删除分组")
            print("3. 重命名分组")
            print("4. 查看分组详情")
            print("0. 返回主菜单")
            
            choice = input("\n请选择操作: ").strip()
            
            if choice == "1":
                name = input("请输入新分组名称: ").strip()
                if name:
                    success = self.portfolio.add_group(name)
                    if success:
                        print(f"{Fore.GREEN}分组添加成功{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}分组已存在{Style.RESET_ALL}")
            elif choice == "2":
                self.list_groups()
                idx = input("请输入要删除的分组序号: ").strip()
                if idx.isdigit() and 1 <= int(idx) <= len(groups):
                    group_name = groups[int(idx) - 1]
                    confirm = input(f"确认删除分组 '{group_name}'? 该组股票将移至默认分组 (y/N): ").strip().lower()
                    if confirm == 'y':
                        success = self.portfolio.remove_group(group_name)
                        if success:
                            print(f"{Fore.GREEN}分组删除成功{Style.RESET_ALL}")
                        else:
                            print(f"{Fore.RED}删除失败（默认分组不能删除）{Style.RESET_ALL}")
            elif choice == "3":
                self.list_groups()
                idx = input("请输入要重命名的分组序号: ").strip()
                if idx.isdigit() and 1 <= int(idx) <= len(groups):
                    old_name = groups[int(idx) - 1]
                    new_name = input("请输入新名称: ").strip()
                    if new_name:
                        print(f"{Fore.YELLOW}重命名功能正在实现中...{Style.RESET_ALL}")
            elif choice == "4":
                self.list_groups()
                idx = input("请输入要查看的分组序号: ").strip()
                if idx.isdigit() and 1 <= int(idx) <= len(groups):
                    group_name = groups[int(idx) - 1]
                    self.show_group_detail(group_name)
            elif choice == "0":
                break
                
            input("\n按回车继续...")

    def list_groups(self):
        groups = self.portfolio.get_groups()
        print(f"\n当前分组列表:")
        for idx, g in enumerate(groups, 1):
            count = len(self.portfolio.get_stocks_by_group(g))
            print(f"  {idx}. {g} ({count} 只)")

    def show_group_detail(self, group_name: str):
        summary = self.portfolio.get_group_summary(group_name)
        stocks = self.portfolio.get_stocks_by_group(group_name)
        
        print(f"\n{Fore.BLUE}=== 分组: {group_name} ==={Style.RESET_ALL}")
        print(f"  股票数量: {summary['stock_count']} 只")
        print(f"  总成本: ¥{summary['total_cost']:,.2f}")
        print(f"  总市值: ¥{summary['total_market_value']:,.2f}")
        print(f"  总盈亏: {self.format_pl(summary['total_profit_loss'])}")
        print(f"  盈亏比: {self.format_change(summary['profit_loss_percent'], True)}")
        
        if stocks:
            print(f"\n股票列表:")
            for stock in stocks:
                print(f"  {stock.code} - {stock.name}: "
                      f"{self.format_change(stock.change_percent, True)}")

    def manage_alerts(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 价格提醒管理 ==={Style.RESET_ALL}")
            
            alerts = self.alert_manager.get_all_alerts()
            if alerts:
                print(f"\n当前提醒列表:")
                headers = ["ID", "股票代码", "股票名称", "提醒类型", "目标值", "状态"]
                rows = []
                for alert in alerts:
                    status = ""
                    if not alert.enabled:
                        status = f"{Fore.YELLOW}已禁用{Style.RESET_ALL}"
                    elif alert.triggered:
                        status = f"{Fore.MAGENTA}已触发{Style.RESET_ALL}"
                    else:
                        status = f"{Fore.GREEN}监控中{Style.RESET_ALL}"
                        
                    type_desc = {
                        "price_ge": "价格≥",
                        "price_le": "价格≤",
                        "change_ge": "涨幅≥",
                        "change_le": "跌幅≥"
                    }.get(alert.alert_type, alert.alert_type)
                    
                    unit = "%" if alert.alert_type in ["change_ge", "change_le"] else ""
                    
                    rows.append([
                        alert.id,
                        alert.stock_code,
                        alert.stock_name,
                        type_desc,
                        f"{alert.target_value:.2f}{unit}",
                        status
                    ])
                print(tabulate(rows, headers=headers, tablefmt="simple"))
            
            print("\n1. 添加提醒")
            print("2. 删除提醒")
            print("3. 启用/禁用提醒")
            print("4. 重置已触发的提醒")
            print("5. 查看提醒类型说明")
            print("0. 返回主菜单")
            
            choice = input("\n请选择操作: ").strip()
            
            if choice == "1":
                self.add_alert()
            elif choice == "2":
                alert_id = input("请输入要删除的提醒ID: ").strip()
                if alert_id:
                    success = self.alert_manager.remove_alert(alert_id)
                    if success:
                        print(f"{Fore.GREEN}删除成功{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}未找到该提醒{Style.RESET_ALL}")
            elif choice == "3":
                alert_id = input("请输入提醒ID: ").strip()
                if alert_id:
                    alert = self.alert_manager.get_alert(alert_id)
                    if alert:
                        if alert.enabled:
                            self.alert_manager.disable_alert(alert_id)
                            print(f"{Fore.YELLOW}提醒已禁用{Style.RESET_ALL}")
                        else:
                            self.alert_manager.enable_alert(alert_id)
                            print(f"{Fore.GREEN}提醒已启用{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}未找到该提醒{Style.RESET_ALL}")
            elif choice == "4":
                alert_id = input("请输入要重置的提醒ID (回车重置所有): ").strip()
                if alert_id:
                    success = self.alert_manager.reset_alert(alert_id)
                    if success:
                        print(f"{Fore.GREEN}重置成功{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}未找到该提醒{Style.RESET_ALL}")
                else:
                    for alert in self.alert_manager.get_all_alerts():
                        self.alert_manager.reset_alert(alert.id)
                    print(f"{Fore.GREEN}所有提醒已重置{Style.RESET_ALL}")
            elif choice == "5":
                print(f"\n{Fore.CYAN}提醒类型说明:{Style.RESET_ALL}")
                for t, desc in self.alert_manager.get_alert_type_help().items():
                    print(f"  {t}: {desc}")
            elif choice == "0":
                break
                
            input("\n按回车继续...")

    def add_alert(self):
        print(f"\n{Fore.GREEN}--- 添加价格提醒 ---{Style.RESET_ALL}")
        
        self.list_stocks_simple()
        code = input("请输入股票代码: ").strip()
        
        stock = self.portfolio.get_stock(code)
        if not stock:
            print(f"{Fore.RED}未找到该股票，请先添加到自选股{Style.RESET_ALL}")
            return
            
        print(f"\n提醒类型:")
        print("  1. 价格大于等于")
        print("  2. 价格小于等于")
        print("  3. 涨跌幅大于等于%")
        print("  4. 涨跌幅小于等于%")
        
        type_choice = input("请选择提醒类型 (1-4): ").strip()
        
        type_map = {
            "1": "price_ge",
            "2": "price_le",
            "3": "change_ge",
            "4": "change_le"
        }
        
        alert_type = type_map.get(type_choice)
        if not alert_type:
            print(f"{Fore.RED}无效选择{Style.RESET_ALL}")
            return
            
        if alert_type in ["price_ge", "price_le"]:
            target_str = input(f"请输入目标价格 (当前价: {stock.current_price:.2f}): ").strip()
        else:
            target_str = input(f"请输入目标涨跌幅% (如 5 或 -5): ").strip()
            
        try:
            target_value = float(target_str)
        except ValueError:
            print(f"{Fore.RED}目标值格式错误{Style.RESET_ALL}")
            return
            
        alert = self.alert_manager.add_alert(code, stock.name, alert_type, target_value)
        if alert:
            print(f"{Fore.GREEN}成功添加提醒: {alert.get_description()}{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}添加失败{Style.RESET_ALL}")

    def show_chart(self):
        print(f"\n{Fore.GREEN}=== 分时趋势图 ==={Style.RESET_ALL}")
        self.list_stocks_simple()
        
        code = input("请输入股票代码: ").strip()
        if not code:
            return
            
        stock = self.portfolio.get_stock(code)
        if not stock:
            print(f"{Fore.RED}未找到该股票{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        minute_data = self.api_client.get_minute_data(code, days=1)
        if not minute_data:
            minute_data = stock.price_history
            
        if not minute_data:
            print(f"{Fore.RED}无分时数据{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        chart = self.chart.draw_minute_chart(
            minute_data, width=80, height=15,
            title=f"{stock.name} ({stock.code}) 分时走势"
        )
        
        print(f"\n{chart}\n")
        
        volume_chart = self.chart.draw_volume_bars(minute_data, width=80, height=5)
        print(f"{Fore.MAGENTA}成交量:{Style.RESET_ALL}")
        print(f"{volume_chart}\n")
        
        input("按回车继续...")

    def show_technical_analysis(self):
        print(f"\n{Fore.GREEN}=== 技术指标分析 ==={Style.RESET_ALL}")
        self.list_stocks_simple()
        
        code = input("请输入股票代码: ").strip()
        if not code:
            return
            
        stock = self.portfolio.get_stock(code)
        if not stock:
            quote = self.api_client.get_stock_quote(code)
            if quote:
                name = quote.get("name", code)
                stock = Stock(code=code, name=name)
            else:
                print(f"{Fore.RED}未找到该股票{Style.RESET_ALL}")
                input("按回车继续...")
                return
        
        print(f"\n正在获取技术指标数据，请稍候...")
        summary = self.indicators.get_technical_summary(code, days=100)
        
        if "error" in summary:
            print(f"{Fore.RED}{summary['error']}{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        print(f"\n{Fore.BLUE}=== {stock.name} ({stock.code}) 技术指标 ==={Style.RESET_ALL}")
        print(f"\n{Fore.CYAN}当前价格: {summary['current_price']:.2f}{Style.RESET_ALL}")
        
        print(f"\n{Fore.MAGENTA}--- 均线系统 ---{Style.RESET_ALL}")
        print(f"  MA5:  {summary['ma5']:.2f}  | {summary['signals']['ma5_position']}")
        print(f"  MA10: {summary['ma10']:.2f}  | {summary['signals']['ma10_position']}")
        print(f"  MA20: {summary['ma20']:.2f}")
        print(f"  MA60: {summary['ma60']:.2f}")
        
        print(f"\n{Fore.MAGENTA}--- 震荡指标 ---{Style.RESET_ALL}")
        print(f"  RSI(14): {summary['rsi_14']:.2f}  | {summary['signals']['rsi_signal']}")
        
        print(f"\n{Fore.MAGENTA}--- MACD指标 ---{Style.RESET_ALL}")
        print(f"  MACD:       {summary['macd']:.4f}")
        print(f"  Signal:     {summary['macd_signal']:.4f}")
        print(f"  Histogram:  {summary['macd_histogram']:.4f}")
        print(f"  信号:       {summary['signals']['macd_signal']}")
        
        print(f"\n{Fore.MAGENTA}--- 综合判断 ---{Style.RESET_ALL}")
        bullish = 0
        bearish = 0
        
        if summary['current_price'] > summary['ma5']:
            bullish += 1
        else:
            bearish += 1
            
        if summary['current_price'] > summary['ma10']:
            bullish += 1
        else:
            bearish += 1
            
        if summary['rsi_14'] > 70:
            bearish += 1
        elif summary['rsi_14'] < 30:
            bullish += 1
            
        if summary['macd'] > summary['macd_signal'] and summary['macd_histogram'] > 0:
            bullish += 1
        elif summary['macd'] < summary['macd_signal'] and summary['macd_histogram'] < 0:
            bearish += 1
            
        if bullish > bearish:
            signal = f"{Fore.RED}偏多{Style.RESET_ALL}"
        elif bearish > bullish:
            signal = f"{Fore.GREEN}偏空{Style.RESET_ALL}"
        else:
            signal = f"{Fore.YELLOW}中性{Style.RESET_ALL}"
            
        print(f"  技术面信号: {signal} (多:{bullish} 空:{bearish})")
        
        input("\n按回车继续...")

    def show_dragon_tiger(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 龙虎榜数据 ==={Style.RESET_ALL}")
            print("1. 涨停榜")
            print("2. 跌停榜")
            print("3. 振幅榜")
            print("4. 换手率榜")
            print("5. 全部榜单")
            print("6. 市场概览")
            print("0. 返回主菜单")
            
            choice = input("\n请选择: ").strip()
            
            limit = input("显示数量 (默认20): ").strip()
            try:
                limit = int(limit) if limit else 20
            except ValueError:
                limit = 20
            
            if choice == "1":
                data = self.dragon_tiger.get_limits_up(limit=limit)
                print(self.dragon_tiger.display_table(data, f"涨停榜 TOP{limit}", show_extra=False))
            elif choice == "2":
                data = self.dragon_tiger.get_limits_down(limit=limit)
                print(self.dragon_tiger.display_table(data, f"跌停榜 TOP{limit}", show_extra=False))
            elif choice == "3":
                data = self.dragon_tiger.get_top_amplitude(limit=limit)
                print(self.dragon_tiger.display_table(data, f"振幅榜 TOP{limit}"))
            elif choice == "4":
                data = self.dragon_tiger.get_top_turnover(limit=limit)
                print(self.dragon_tiger.display_table(data, f"换手率榜 TOP{limit}"))
            elif choice == "5":
                print(self.dragon_tiger.display_all(limit=min(limit, 10)))
            elif choice == "6":
                print(self.dragon_tiger.display_summary())
            elif choice == "0":
                break
            else:
                print(f"{Fore.RED}无效选择{Style.RESET_ALL}")
                
            input("\n按回车继续...")

    def show_historical_data(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 历史数据查询 ==={Style.RESET_ALL}")
            print("1. 单股数据分析")
            print("2. 历史行情表格")
            print("3. 多股对比分析")
            print("4. 导出历史数据CSV")
            print("0. 返回主菜单")
            
            choice = input("\n请选择: ").strip()
            
            if choice == "1":
                code = input("请输入股票代码: ").strip()
                start_date = input("开始日期 (YYYY-MM-DD): ").strip()
                end_date = input("结束日期 (YYYY-MM-DD): ").strip()
                
                if not start_date:
                    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = datetime.now().strftime("%Y-%m-%d")
                    
                if code:
                    print(self.historical.display_analysis(code, start_date, end_date))
                    
            elif choice == "2":
                code = input("请输入股票代码: ").strip()
                start_date = input("开始日期 (YYYY-MM-DD): ").strip()
                end_date = input("结束日期 (YYYY-MM-DD): ").strip()
                limit = input("显示条数 (默认30): ").strip()
                
                if not start_date:
                    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = datetime.now().strftime("%Y-%m-%d")
                try:
                    limit = int(limit) if limit else 30
                except ValueError:
                    limit = 30
                    
                if code:
                    print(self.historical.display_data_table(code, start_date, end_date, limit))
                    
            elif choice == "3":
                codes = input("请输入股票代码，多个用空格分隔: ").strip().split()
                start_date = input("开始日期 (YYYY-MM-DD): ").strip()
                end_date = input("结束日期 (YYYY-MM-DD): ").strip()
                
                if not start_date:
                    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = datetime.now().strftime("%Y-%m-%d")
                    
                if codes:
                    print(self.historical.compare_stocks(codes, start_date, end_date))
                    
            elif choice == "4":
                code = input("请输入股票代码: ").strip()
                start_date = input("开始日期 (YYYY-MM-DD): ").strip()
                end_date = input("结束日期 (YYYY-MM-DD): ").strip()
                
                if not start_date:
                    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = datetime.now().strftime("%Y-%m-%d")
                    
                if code:
                    data = self.historical.get_data(code, start_date, end_date)
                    if data:
                        filepath = self.reporter.export_historical_csv(data, code, start_date, end_date)
                        print(f"{Fore.GREEN}导出成功: {filepath}{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}无数据可导出{Style.RESET_ALL}")
                        
            elif choice == "0":
                break
                
            input("\n按回车继续...")

    def export_reports(self):
        self.refresh_stock_prices()
        self.update_indicators()
        
        print(f"\n{Fore.GREEN}=== 导出日报 ==={Style.RESET_ALL}")
        stocks = self.portfolio.get_all_stocks()
        
        if not stocks:
            print(f"{Fore.RED}自选股列表为空，无法导出{Style.RESET_ALL}")
            input("按回车继续...")
            return
            
        filepath = input("请输入CSV文件名 (回车使用默认): ").strip()
        csv_file = self.reporter.export_daily_csv(stocks, filepath or None)
        print(f"{Fore.GREEN}CSV导出成功: {csv_file}{Style.RESET_ALL}")
        
        filepath = input("请输入HTML文件名 (回车使用默认): ").strip()
        groups = dict(self.portfolio.groups)
        html_file = self.reporter.export_daily_html(stocks, filepath or None, groups)
        print(f"{Fore.GREEN}HTML导出成功: {html_file}{Style.RESET_ALL}")
        
        input("\n按回车继续...")

    def manage_profiles(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 账户管理 ==={Style.RESET_ALL}")
            
            profiles = self.config_manager.list_profiles()
            current = self.config_manager.current_profile
            
            print(f"\n现有账户:")
            for idx, p in enumerate(profiles, 1):
                marker = " <-- 当前" if p == current else ""
                print(f"  {idx}. {p}{marker}")
                
            print("\n1. 新建账户")
            print("2. 切换账户")
            print("3. 删除账户")
            print("0. 返回主菜单")
            
            choice = input("\n请选择操作: ").strip()
            
            if choice == "1":
                name = input("请输入新账户名称: ").strip()
                if name:
                    success = self.config_manager.create_profile(name)
                    if success:
                        print(f"{Fore.GREEN}账户创建成功{Style.RESET_ALL}")
                        confirm = input(f"是否切换到账户 '{name}'? (y/N): ").strip().lower()
                        if confirm == 'y':
                            self.config_manager.switch_profile(name)
                            self.__init__()
                    else:
                        print(f"{Fore.RED}账户已存在{Style.RESET_ALL}")
                        
            elif choice == "2":
                self.list_profiles()
                idx = input("请输入要切换的账户序号: ").strip()
                if idx.isdigit() and 1 <= int(idx) <= len(profiles):
                    profile_name = profiles[int(idx) - 1]
                    if profile_name != current:
                        self.config_manager.switch_profile(profile_name)
                        self.__init__()
                        print(f"{Fore.GREEN}已切换到账户: {profile_name}{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.YELLOW}已是当前账户{Style.RESET_ALL}")
                        
            elif choice == "3":
                self.list_profiles()
                idx = input("请输入要删除的账户序号: ").strip()
                if idx.isdigit() and 1 <= int(idx) <= len(profiles):
                    profile_name = profiles[int(idx) - 1]
                    if profile_name == "default":
                        print(f"{Fore.RED}默认账户不能删除{Style.RESET_ALL}")
                    else:
                        confirm = input(f"确认删除账户 '{profile_name}'? 所有数据将丢失 (y/N): ").strip().lower()
                        if confirm == 'y':
                            success = self.config_manager.delete_profile(profile_name)
                            if success:
                                if current == profile_name:
                                    self.__init__()
                                print(f"{Fore.GREEN}账户删除成功{Style.RESET_ALL}")
                            else:
                                print(f"{Fore.RED}删除失败{Style.RESET_ALL}")
                                
            elif choice == "0":
                break
                
            input("\n按回车继续...")

    def list_profiles(self):
        profiles = self.config_manager.list_profiles()
        print(f"\n账户列表:")
        for idx, p in enumerate(profiles, 1):
            print(f"  {idx}. {p}")

    def system_settings(self):
        while True:
            self.clear_screen()
            self.print_header()
            print(f"\n{Fore.GREEN}=== 系统设置 ==={Style.RESET_ALL}")
            
            interval = self.config_manager.get_setting("refresh_interval", 5)
            sound = self.config_manager.get_setting("alert_sound", True)
            popup = self.config_manager.get_setting("alert_popup", True)
            
            print(f"\n当前设置:")
            print(f"  1. 刷新间隔: {interval} 秒")
            print(f"  2. 提醒声音: {'开启' if sound else '关闭'}")
            print(f"  3. 提醒弹窗: {'开启' if popup else '关闭'}")
            
            print("\n请选择要修改的设置 (0返回): ")
            choice = input().strip()
            
            if choice == "1":
                new_interval = input("请输入新的刷新间隔秒数 (1-60): ").strip()
                try:
                    new_interval = int(new_interval)
                    if 1 <= new_interval <= 60:
                        self.config_manager.update_settings({"refresh_interval": new_interval})
                        self.refresh_interval = new_interval
                        print(f"{Fore.GREEN}刷新间隔已更新为 {new_interval} 秒{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}数值超出范围{Style.RESET_ALL}")
                except ValueError:
                    print(f"{Fore.RED}格式错误{Style.RESET_ALL}")
                    
            elif choice == "2":
                new_sound = not sound
                self.config_manager.update_settings({"alert_sound": new_sound})
                print(f"{Fore.GREEN}提醒声音已{'开启' if new_sound else '关闭'}{Style.RESET_ALL}")
                
            elif choice == "3":
                new_popup = not popup
                self.config_manager.update_settings({"alert_popup": new_popup})
                print(f"{Fore.GREEN}提醒弹窗已{'开启' if new_popup else '关闭'}{Style.RESET_ALL}")
                
            elif choice == "0":
                break
                
            input("\n按回车继续...")

    def run(self):
        while True:
            self.clear_screen()
            self.print_header()
            self.print_menu()
            
            choice = input("请选择操作: ").strip()
            
            if choice == "1":
                self.realtime_monitor()
            elif choice == "2":
                self.manage_stocks()
            elif choice == "3":
                self.manage_groups()
            elif choice == "4":
                self.manage_alerts()
            elif choice == "5":
                self.show_chart()
            elif choice == "6":
                self.show_technical_analysis()
            elif choice == "7":
                self.show_dragon_tiger()
            elif choice == "8":
                self.show_historical_data()
            elif choice == "9":
                self.export_reports()
            elif choice == "10":
                self.manage_profiles()
            elif choice == "11":
                self.system_settings()
            elif choice == "0":
                print(f"\n{Fore.YELLOW}感谢使用股票盯盘系统，再见！{Style.RESET_ALL}\n")
                sys.exit(0)
            else:
                print(f"{Fore.RED}无效选择，请重试{Style.RESET_ALL}")
                input("按回车继续...")


def main():
    try:
        app = StockWatcher()
        app.run()
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}程序已退出{Style.RESET_ALL}\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Fore.RED}程序发生错误: {e}{Style.RESET_ALL}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
