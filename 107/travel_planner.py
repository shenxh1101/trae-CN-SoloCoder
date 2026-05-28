#!/usr/bin/env python3
import sys
from datetime import date, datetime
from travel_manager import TravelManager
from packing_list import PackingListGenerator
from exporter import Exporter
from weather_api import WeatherAPI
from share_generator import ShareGenerator
from map_marker import MapMarker


class TravelPlannerCLI:
    def __init__(self):
        self.manager = TravelManager()
        self.packing_generator = PackingListGenerator()
        self.exporter = Exporter()
        self.weather_api = WeatherAPI()
        self.share_generator = ShareGenerator()
        self.map_marker = MapMarker()
        self.exchange_rate = 7.0

    def print_menu(self):
        print("\n" + "=" * 60)
        print("✈️  旅行行程规划工具 v1.0")
        print("=" * 60)
        print("1. 查看所有旅行计划 (时间线)")
        print("2. 创建新旅行计划")
        print("3. 查看/编辑旅行计划详情")
        print("4. 删除旅行计划")
        print("5. 导出旅行计划 (PDF/文本)")
        print("6. 导入/导出 JSON")
        print("7. 天气查询")
        print("8. 生成行程分享文本")
        print("9. 地图位置标记")
        print("10. 设置汇率 (当前: 1 USD = " + str(self.exchange_rate) + " CNY)")
        print("0. 退出")
        print("=" * 60)

    def input_date(self, prompt: str) -> date:
        while True:
            date_str = input(prompt + " (YYYY-MM-DD): ")
            try:
                return datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                print("日期格式错误，请重试!")

    def select_plan(self):
        plans = self.manager.get_all_plans()
        if not plans:
            print("\n暂无旅行计划!")
            return None

        print("\n选择旅行计划:")
        for i, plan in enumerate(plans, 1):
            print(f"  {i}. [{plan.id}] {plan.name} - {plan.destination}")

        while True:
            try:
                idx = int(input("\n请输入编号: ")) - 1
                if 0 <= idx < len(plans):
                    return plans[idx]
                print("无效编号!")
            except ValueError:
                print("请输入数字!")

    def view_timeline(self):
        plans = self.manager.get_all_plans()
        print("\n" + "=" * 60)
        print("📅 旅行计划时间线")
        print("=" * 60)

        if not plans:
            print("\n暂无旅行计划")
            return

        for plan in plans:
            status = "🔴" if date.today() > plan.end_date else "🟢" if date.today() < plan.start_date else "🟡"
            print(f"\n{status} [{plan.id}] {plan.name}")
            print(f"   📍 {plan.destination}")
            print(f"   📅 {plan.start_date} 至 {plan.end_date} ({plan.duration}天)")
            if plan.daily_itineraries:
                print(f"   📝 {len(plan.daily_itineraries)} 个行程安排")
            if plan.budget_items:
                total = plan.total_budget("CNY", self.exchange_rate)
                print(f"   💰 预算 ¥{total:.2f}")
        print("\n" + "=" * 60)

    def create_plan(self):
        print("\n" + "=" * 60)
        print("📝 创建新旅行计划")
        print("=" * 60)

        name = input("计划名称: ")
        destination = input("目的地: ")
        start_date = self.input_date("开始日期")
        end_date = self.input_date("结束日期")

        while end_date < start_date:
            print("结束日期不能早于开始日期!")
            end_date = self.input_date("结束日期")

        plan = self.manager.create_plan(name, destination, start_date, end_date)
        print(f"\n✅ 旅行计划创建成功! ID: {plan.id}")

        auto_packing = input("\n是否自动生成行李清单? (y/n): ").lower()
        if auto_packing == "y":
            items = self.packing_generator.generate_packing_list(destination)
            for item in items:
                self.manager.add_packing_item(plan.id, item)
            print(f"✅ 已添加 {len(items)} 件行李物品")

    def view_plan_detail(self, plan):
        while True:
            print("\n" + "=" * 60)
            print(f"📋 {plan.name} - 详情")
            print("=" * 60)
            print(f"目的地: {plan.destination}")
            print(f"日期: {plan.start_date} 至 {plan.end_date} ({plan.duration}天)")
            print(f"行程数: {len(plan.daily_itineraries)} | 预算项: {len(plan.budget_items)} | 行李数: {len(plan.packing_list)}")
            print("-" * 60)
            print("1. 管理每日行程")
            print("2. 管理预算")
            print("3. 管理行李清单")
            print("4. 编辑基本信息")
            print("0. 返回主菜单")
            print("-" * 60)

            choice = input("请选择: ")

            if choice == "1":
                self.manage_itineraries(plan)
            elif choice == "2":
                self.manage_budget(plan)
            elif choice == "3":
                self.manage_packing_list(plan)
            elif choice == "4":
                self.edit_plan_info(plan)
            elif choice == "0":
                break

    def manage_itineraries(self, plan):
        while True:
            print(f"\n--- {plan.name} - 每日行程 ---")
            if plan.daily_itineraries:
                for i, it in enumerate(plan.daily_itineraries, 1):
                    print(f"  {i}. 第{it.day}天 {it.time} - {it.location}")
                    if it.notes:
                        print(f"     备注: {it.notes}")
            else:
                print("  暂无行程安排")

            print("\n1. 添加行程")
            print("2. 删除行程")
            print("0. 返回")

            choice = input("请选择: ")

            if choice == "1":
                try:
                    day = int(input(f"第几天 (1-{plan.duration}): "))
                    if 1 <= day <= plan.duration:
                        time = input("时间 (如 09:00): ")
                        location = input("地点: ")
                        notes = input("备注 (可选): ")
                        self.manager.add_itinerary(plan.id, day, time, location, notes)
                        print("✅ 行程已添加!")
                except ValueError:
                    print("无效输入!")
            elif choice == "2":
                try:
                    idx = int(input("要删除的行程编号: ")) - 1
                    if self.manager.delete_itinerary(plan.id, idx):
                        print("✅ 行程已删除!")
                except ValueError:
                    print("无效输入!")
            elif choice == "0":
                break

    def manage_budget(self, plan):
        while True:
            print(f"\n--- {plan.name} - 预算管理 ---")
            if plan.budget_items:
                for i, item in enumerate(plan.budget_items, 1):
                    status = "✓" if item.is_spent else "○"
                    print(f"  {i}. [{status}] {item.category}: {item.description} - {item.amount:.2f} {item.currency}")
            total_cny = plan.total_budget("CNY", self.exchange_rate)
            total_usd = plan.total_budget("USD", self.exchange_rate)
            spent_cny = plan.total_spent("CNY", self.exchange_rate)
            print(f"\n总预算: ¥{total_cny:.2f} / ${total_usd:.2f}")
            print(f"已花费: ¥{spent_cny:.2f} | 剩余: ¥{total_cny - spent_cny:.2f}")

            print("\n1. 添加预算项")
            print("2. 删除预算项")
            print("3. 标记为已花费/未花费")
            print("0. 返回")

            choice = input("请选择: ")

            if choice == "1":
                category = input("分类 (交通/住宿/餐饮/门票/其他): ")
                description = input("描述: ")
                try:
                    amount = float(input("金额: "))
                    currency = input("币种 (CNY/USD, 默认CNY): ") or "CNY"
                    self.manager.add_budget_item(plan.id, category, description, amount, currency.upper())
                    print("✅ 预算项已添加!")
                except ValueError:
                    print("无效金额!")
            elif choice == "2":
                try:
                    idx = int(input("要删除的预算项编号: ")) - 1
                    if self.manager.delete_budget_item(plan.id, idx):
                        print("✅ 预算项已删除!")
                except ValueError:
                    print("无效输入!")
            elif choice == "3":
                try:
                    idx = int(input("预算项编号: ")) - 1
                    spent = input("标记为已花费? (y/n): ").lower() == "y"
                    if self.manager.mark_budget_spent(plan.id, idx, spent):
                        print("✅ 状态已更新!")
                except ValueError:
                    print("无效输入!")
            elif choice == "0":
                break

    def manage_packing_list(self, plan):
        while True:
            print(f"\n--- {plan.name} - 行李清单 ---")
            if plan.packing_list:
                for i, item in enumerate(plan.packing_list, 1):
                    print(f"  {i}. [ ] {item}")
            else:
                print("  暂无行李物品")

            print("\n1. 添加物品")
            print("2. 删除物品")
            print("3. 根据目的地自动推荐")
            print("0. 返回")

            choice = input("请选择: ")

            if choice == "1":
                item = input("物品名称: ")
                self.manager.add_packing_item(plan.id, item)
                print("✅ 已添加!")
            elif choice == "2":
                try:
                    idx = int(input("要删除的物品编号: ")) - 1
                    if 0 <= idx < len(plan.packing_list):
                        self.manager.remove_packing_item(plan.id, plan.packing_list[idx])
                        print("✅ 已删除!")
                except ValueError:
                    print("无效输入!")
            elif choice == "3":
                items = self.packing_generator.generate_packing_list(plan.destination)
                for item in items:
                    self.manager.add_packing_item(plan.id, item)
                print(f"✅ 已添加 {len(items)} 件推荐物品!")
            elif choice == "0":
                break

    def edit_plan_info(self, plan):
        print(f"\n--- 编辑 {plan.name} ---")
        name = input(f"新名称 (回车保持 '{plan.name}'): ") or plan.name
        dest = input(f"新目的地 (回车保持 '{plan.destination}'): ") or plan.destination

        start_str = input(f"新开始日期 (回车保持 {plan.start_date}): ")
        if start_str:
            try:
                start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            except ValueError:
                start_date = plan.start_date
        else:
            start_date = plan.start_date

        end_str = input(f"新结束日期 (回车保持 {plan.end_date}): ")
        if end_str:
            try:
                end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            except ValueError:
                end_date = plan.end_date
        else:
            end_date = plan.end_date

        self.manager.update_plan(plan.id, name=name, destination=dest,
                                  start_date=start_date, end_date=end_date)
        print("✅ 计划已更新!")

    def export_plan(self):
        plan = self.select_plan()
        if not plan:
            return

        print("\n1. 导出为文本文件")
        print("2. 导出为PDF")
        choice = input("请选择: ")

        filename = input("文件名 (不带扩展名): ") or plan.name

        if choice == "1":
            if self.exporter.export_to_text(plan, f"{filename}.txt"):
                print(f"✅ 已导出到 {filename}.txt")
        elif choice == "2":
            if self.exporter.export_to_pdf(plan, f"{filename}.pdf"):
                print(f"✅ 已导出到 {filename}.pdf")

    def import_export_json(self):
        print("\n1. 导出计划为JSON")
        print("2. 从JSON导入计划")
        choice = input("请选择: ")

        if choice == "1":
            plan = self.select_plan()
            if plan:
                filename = input("文件名: ") or f"{plan.id}.json"
                if self.manager.export_to_json(plan.id, filename):
                    print(f"✅ 已导出到 {filename}")
        elif choice == "2":
            filename = input("JSON文件名: ")
            plan = self.manager.import_from_json(filename)
            if plan:
                print(f"✅ 已导入计划: {plan.name}")
            else:
                print("❌ 导入失败!")

    def query_weather(self):
        plan = self.select_plan()
        if not plan:
            return

        print(f"\n正在查询 {plan.destination} 的天气...")
        forecast = self.weather_api.get_weather_forecast(
            plan.destination, plan.start_date, plan.end_date
        )
        if forecast:
            self.weather_api.print_forecast(forecast)

    def generate_share(self):
        plan = self.select_plan()
        if not plan:
            return
        self.share_generator.print_share_text(plan)

    def show_map_links(self):
        plan = self.select_plan()
        if not plan:
            return

        locations = list(dict.fromkeys([i.location for i in plan.daily_itineraries]))
        self.map_marker.print_map_links(locations, plan.destination)

    def set_exchange_rate(self):
        try:
            rate = float(input("请输入 1 USD = ? CNY: "))
            if rate > 0:
                self.exchange_rate = rate
                self.exporter.exchange_rate = rate
                self.share_generator.exchange_rate = rate
                print(f"✅ 汇率已设置为 1 USD = {rate} CNY")
        except ValueError:
            print("无效输入!")

    def run(self):
        while True:
            self.print_menu()
            choice = input("\n请选择: ")

            if choice == "1":
                self.view_timeline()
            elif choice == "2":
                self.create_plan()
            elif choice == "3":
                plan = self.select_plan()
                if plan:
                    self.view_plan_detail(plan)
            elif choice == "4":
                plan = self.select_plan()
                if plan:
                    confirm = input(f"确定要删除 '{plan.name}'? (y/n): ").lower()
                    if confirm == "y" and self.manager.delete_plan(plan.id):
                        print("✅ 计划已删除!")
            elif choice == "5":
                self.export_plan()
            elif choice == "6":
                self.import_export_json()
            elif choice == "7":
                self.query_weather()
            elif choice == "8":
                self.generate_share()
            elif choice == "9":
                self.show_map_links()
            elif choice == "10":
                self.set_exchange_rate()
            elif choice == "0":
                print("\n👋 再见! 祝您旅途愉快!")
                sys.exit(0)
            else:
                print("无效选择，请重试!")


def main():
    cli = TravelPlannerCLI()
    cli.run()


if __name__ == "__main__":
    main()
