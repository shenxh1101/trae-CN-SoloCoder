#!/usr/bin/env python3
import sys
import os


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                    🧳 AI 旅行规划师                          ║
║          智能规划您的完美旅程，说走就走！                    ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_menu():
    menu = """
┌────────────────────────────────────────────────────────────┐
│  1. 🎯 生成新的旅行计划                                      │
│  2. ✏️  调整现有计划                                          │
│  3. 📄 导出计划 (Markdown/PDF)                               │
│  4. 🗺️  查看路线地图                                          │
│  5. 🧳 查看打包清单                                          │
│  6. 📊 查看预算明细                                          │
│  7. 🔊 语音播报行程                                          │
│  8. 🔗 分享计划 / 查看热门                                   │
│  9. 📋 查看可用城市和景点                                    │
│  10. ⚠️  节假日人流预警查询                                   │
│  0. 🚪 退出                                                  │
└────────────────────────────────────────────────────────────┘
    """
    print(menu)


def interactive_main():
    from .data_loader import DataLoader
    from .planner import TravelPlanner
    from .exporter import ExportManager
    from .share_manager import ShareManager
    from .voice import VoiceAnnouncer

    data_loader = DataLoader()
    planner = TravelPlanner(data_loader)
    exporter = ExportManager()
    share_manager = ShareManager()
    announcer = VoiceAnnouncer()

    current_plan = None

    print_banner()

    while True:
        print_menu()
        choice = input("\n请选择操作 (0-10): ").strip()

        if choice == "0":
            print("\n👋 感谢使用AI旅行规划师，祝您旅途愉快！")
            break

        elif choice == "1":
            print("\n" + "=" * 60)
            print("🎯 生成新的旅行计划")
            print("=" * 60)
            print(f"\n可用城市: {', '.join(data_loader.get_available_cities())}")
            print("支持多目的地，用空格或逗号分隔")
            print("示例输入: 成都3天2晚 美食 历史文化")
            print("         成都重庆5天 自然风光")

            user_input = input("\n请输入您的旅行需求: ").strip()
            if not user_input:
                print("❌ 输入不能为空")
                continue

            travel_month = input("旅行月份（如5月，可选，用于天气提示和节假日预警）: ").strip() or None

            try:
                destinations, days, preferences = planner.parse_user_input(user_input)
                print(f"\n📋 解析结果:")
                print(f"   目的地: {', '.join(destinations)}")
                print(f"   天数: {days}天")
                print(f"   偏好: {', '.join(preferences)}")

                confirm = input("\n确认生成计划？(y/n): ").strip().lower()
                if confirm != "y":
                    continue

                print("\n⏳ 正在生成旅行计划...")
                current_plan = planner.generate_travel_plan(
                    destinations, days, preferences, travel_month
                )

                print(f"\n✅ 计划生成成功！计划ID: {current_plan.plan_id}")
                display_plan_summary(current_plan)
                display_holiday_warnings(current_plan)
                display_booking_hints(current_plan)

            except Exception as e:
                print(f"❌ 生成计划失败: {e}")
                import traceback
                traceback.print_exc()

        elif choice == "2":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 70)
            print("✏️  调整旅行计划 - 智能重新规划")
            print("=" * 70)
            
            print("\n📋 当前各天步行强度:")
            original_day_details = get_day_walking_details(current_plan)
            for day_num, intensity in original_day_details.items():
                bar = "█" * ({"低": 1, "中": 3, "高": 5}.get(intensity, 3))
                print(f"   第{day_num}天: {intensity:2s} {bar:<5}")
            
            print("\n💡 支持的调整请求示例:")
            print("   • 第2天不要太多步行")
            print("   • 第3天少走路")
            print("   • 第二天尽量少走")
            print("   • 第1天不用走路")

            adjustment = input("\n请输入调整需求: ").strip()
            if not adjustment:
                print("❌ 输入不能为空")
                continue
            
            import re
            day_match = re.search(r"第?(\d+)[天日]", adjustment)
            target_day = int(day_match.group(1)) if day_match else None
            
            print(f"\n🔍 解析调整请求:")
            if target_day:
                print(f"   • 目标天数: 第{target_day}天")
            else:
                print(f"   • 目标天数: 未指定（将应用到全部天数）")
            
            if "不要太多步行" in adjustment or "少走路" in adjustment:
                print(f"   • 调整类型: 降低步行强度")
            elif "尽量少走" in adjustment or "不用走路" in adjustment:
                print(f"   • 调整类型: 最小化步行强度")
            
            try:
                print(f"\n⏳ 正在重新规划...")
                original_high_attractions = []
                if target_day and target_day <= len(current_plan.days):
                    original_day = current_plan.days[target_day - 1]
                    for activity in original_day.activities:
                        if activity.attraction and activity.attraction.walking_intensity in ["高", "极高"]:
                            original_high_attractions.append(activity.attraction.name)
                    if original_high_attractions:
                        print(f"   • 原计划高强度景点: {', '.join(original_high_attractions)}")

                current_plan = planner.adjust_plan(current_plan, adjustment)
                adjusted_day_details = get_day_walking_details(current_plan)
                
                print("\n" + "=" * 70)
                print("✅ 计划调整成功！")
                print("=" * 70)
                
                print("\n📊 调整前后对比:")
                for day_num in sorted(set(list(original_day_details.keys()) + list(adjusted_day_details.keys()))):
                    old = original_day_details.get(day_num, "N/A")
                    new = adjusted_day_details.get(day_num, "N/A")
                    
                    intensity_order = {"低": 1, "中": 2, "高": 3, "极高": 4}
                    old_level = intensity_order.get(old, 0)
                    new_level = intensity_order.get(new, 0)
                    
                    old_bar = "█" * old_level + "░" * (4 - old_level)
                    new_bar = "█" * new_level + "░" * (4 - new_level)
                    
                    if old != new:
                        if target_day == day_num:
                            if new_level < old_level:
                                marker = " ✅ 已降低"
                                verify_status = "✅ 验证通过：步行强度已降低"
                            else:
                                marker = " ⚠️  未降低"
                                verify_status = "❌ 验证失败：步行强度未降低"
                        else:
                            marker = " (非目标日)"
                            verify_status = ""
                    else:
                        if target_day == day_num:
                            marker = " ⚠️  未变化"
                            verify_status = "⚠️  注意：该天步行强度未变化"
                        else:
                            marker = ""
                            verify_status = ""
                    
                    print(f"   第{day_num}天: {old} {old_bar} → {new} {new_bar}{marker}")
                    if verify_status:
                        print(f"          {verify_status}")
                
                if target_day and target_day <= len(current_plan.days):
                    new_day = current_plan.days[target_day - 1]
                    new_high_attractions = []
                    new_low_attractions = []
                    for activity in new_day.activities:
                        if activity.attraction:
                            if activity.attraction.walking_intensity in ["高", "极高"]:
                                new_high_attractions.append(activity.attraction.name)
                            else:
                                new_low_attractions.append(activity.attraction.name)
                    
                    print(f"\n📍 调整后第{target_day}天景点安排:")
                    if new_low_attractions:
                        print(f"   ✅ 低/中强度景点: {', '.join(new_low_attractions)}")
                    if new_high_attractions:
                        print(f"   ⚠️  仍有高强度景点: {', '.join(new_high_attractions)}")
                    else:
                        print(f"   ✅ 无高强度景点，调整成功！")
                
                print("\n" + "=" * 70)
                display_plan_summary(current_plan)
                display_booking_hints(current_plan)

            except Exception as e:
                print(f"❌ 调整计划失败: {e}")
                import traceback
                traceback.print_exc()

        elif choice == "3":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 60)
            print("📄 导出旅行计划")
            print("=" * 60)
            print("\n导出格式:")
            print("  1. Markdown (.md) - 完整详细文档")
            print("  2. PDF (.pdf) - 自动选择可用的PDF引擎")
            print("  3. 预算表 (.csv)")
            print("  4. 预算表 (Markdown)")
            print("  5. 打包清单 (.txt)")

            fmt_choice = input("\n请选择导出格式 (1-5): ").strip()

            try:
                if fmt_choice == "1":
                    filepath = exporter.save_markdown(current_plan)
                    print(f"✅ Markdown文件已保存: {filepath}")
                    print(f"   包含: 完整行程、预算表、路线地图、打包清单")
                elif fmt_choice == "2":
                    print("⏳ 正在生成PDF（自动选择最佳导出引擎）...")
                    try:
                        filepath = exporter.save_pdf(current_plan)
                        import os
                        size = os.path.getsize(filepath) / 1024
                        print(f"✅ PDF文件已保存: {filepath}")
                        print(f"   文件大小: {size:.2f} KB")
                    except ImportError as e:
                        print(f"❌ {e}")
                        print("\n💡 提示: 可以先导出Markdown，然后用浏览器或Typora打开再打印为PDF")
                elif fmt_choice == "3":
                    filepath = exporter.save_budget_csv(current_plan)
                    print(f"✅ 预算表已保存: {filepath}")
                elif fmt_choice == "4":
                    filepath = exporter.save_budget_markdown(current_plan)
                    print(f"✅ 预算表(Markdown)已保存: {filepath}")
                    print("\n" + exporter.budget_to_markdown_table(current_plan))
                elif fmt_choice == "5":
                    filepath = exporter.save_packing_list(current_plan)
                    print(f"✅ 打包清单已保存: {filepath}")
                else:
                    print("❌ 无效的选择")
            except ImportError as e:
                print(f"❌ {e}")
            except Exception as e:
                print(f"❌ 导出失败: {e}")
                import traceback
                traceback.print_exc()

        elif choice == "4":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 70)
            print("🗺️  旅行路线地图")
            print("=" * 70)
            print(exporter.text_map_to_markdown(current_plan))

        elif choice == "5":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 60)
            print("🧳 行李打包清单")
            print("=" * 60)
            print(exporter.packing_list_to_markdown(current_plan))

        elif choice == "6":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 60)
            print("📊 行程预算明细")
            print("=" * 60)
            print(exporter.budget_to_markdown_table(current_plan))

        elif choice == "7":
            if not current_plan:
                print("❌ 请先生成或加载一个旅行计划")
                continue

            print("\n" + "=" * 60)
            print("🔊 语音播报行程")
            print("=" * 60)
            print(announcer.get_voice_status())

            if not announcer.is_available():
                continue

            print(f"\n📅 共 {len(current_plan.days)} 天行程")
            for day in current_plan.days:
                print(f"   第{day.day_number}天: {day.city} - {len([a for a in day.activities if a.attraction or a.restaurant])}个活动")
            
            day_choice = input("\n播报哪一天？(输入天数，回车播报全部): ").strip()

            verbose = input("详细模式？(y/n，默认简洁): ").strip().lower() == "y"

            try:
                day_num = int(day_choice) if day_choice else None
                if day_num and day_num > len(current_plan.days):
                    print(f"❌ 只有{len(current_plan.days)}天的行程")
                    continue
                announcer.announce_travel_plan(current_plan, day_num, verbose)
            except ValueError:
                print("❌ 请输入有效的数字")

        elif choice == "8":
            print("\n" + "=" * 60)
            print("🔗 计划分享与热门排行")
            print("=" * 60)
            print("\n1. 分享当前计划")
            print("2. 查看热门计划")
            print("3. 点赞某个计划")
            print("4. 查看分享详情")

            sub_choice = input("\n请选择 (1-4): ").strip()

            if sub_choice == "1":
                if not current_plan:
                    print("❌ 请先生成一个旅行计划")
                    continue
                share_id = share_manager.share_plan(current_plan)
                print(share_manager.display_share_link(share_id))

            elif sub_choice == "2":
                popular = share_manager.get_popular_plans(10)
                if not popular:
                    print("暂无分享的计划")
                else:
                    print("\n🏆 热门旅行计划排行:")
                    for i, plan in enumerate(popular, 1):
                        medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
                        print(f"   {medal} {i:2d}. 👍{plan.likes:3d} | {plan.plan_title} (ID: {plan.plan_id})")

            elif sub_choice == "3":
                plan_id = input("请输入计划ID: ").strip()
                if share_manager.like_plan(plan_id):
                    record = share_manager.get_share_by_id(plan_id)
                    print(f"✅ 点赞成功！当前点赞数: {record.likes} 👍")
                else:
                    print("❌ 未找到该计划")

            elif sub_choice == "4":
                plan_id = input("请输入计划ID: ").strip()
                print(share_manager.get_share_info(plan_id))

        elif choice == "9":
            print("\n" + "=" * 60)
            print("📋 可用城市和景点")
            print("=" * 60)

            cities = data_loader.get_available_cities()
            for city in cities:
                print(f"\n🏙️  {city}:")

                attractions = data_loader.get_top_rated_attractions(city, 5)
                print("   📍 热门景点:")
                for attr in attractions:
                    crowd_marker = "⚠️" if attr.holiday_crowd_level == "极高" else ""
                    print(f"      - {attr.name} {crowd_marker} ({attr.category}, ⭐{attr.rating}, ¥{attr.ticket_price})")
                    print(f"        💬 {attr.reviews[0] if attr.reviews else ''}")

                restaurants = data_loader.get_top_rated_restaurants(city, 3)
                print("   🍽️  推荐餐厅:")
                for rest in restaurants:
                    print(f"      - {rest.name} ({rest.cuisine}, ⭐{rest.rating}, 人均¥{rest.avg_price})")
                    print(f"        🥢 必点: {', '.join(rest.must_try[:3])}")

        elif choice == "10":
            print("\n" + "=" * 60)
            print("⚠️  节假日人流预警查询")
            print("=" * 60)
            
            holidays = data_loader.get_holidays()
            print("\n📅 全年节假日人流预警:")
            for holiday in holidays.get("holidays", []):
                level = holiday.get("crowd_level", "中")
                level_color = "🔴" if level == "极高" else "🟠" if level == "高" else "🟡"
                print(f"   {level_color} {holiday['name']} ({holiday['date']}): {holiday['duration_days']}天假期，人流量{level}")
                print(f"        💡 提示: {holiday['tip']}")
            
            month_query = input("\n查询具体月份的人流预警？(如5月，回车跳过): ").strip()
            if month_query:
                month_num = month_query.replace("月", "")
                for city in data_loader.get_available_cities():
                    city_specific = holidays.get("city_specific", {}).get(city, {})
                    if month_num in city_specific.get("peak_months", []):
                        print(f"\n⚠️  {city}{month_query}为旅游旺季:")
                        for event in city_specific.get("special_events", []):
                            if str(event.get("month")) == month_num:
                                print(f"   🎉 {event['name']}: {event['tip']}")

        else:
            print("❌ 无效的选择，请重新输入")

        if current_plan and choice in ["1", "2"]:
            show_detail = input("\n是否查看完整计划详情？(y/n): ").strip().lower()
            if show_detail == "y":
                display_full_plan(current_plan)
            
            voice_prompt = input("\n是否语音播报第1天行程摘要？(y/n): ").strip().lower()
            if voice_prompt == "y":
                if announcer.is_available():
                    try:
                        announcer.announce_first_day_summary(current_plan)
                    except Exception as e:
                        print(f"❌ 语音播报失败: {e}")
                else:
                    print("\n" + "="*50)
                    print("🔊 语音播报不可用")
                    print(announcer.get_voice_status())
                    print("="*50)


def get_day_walking_details(plan):
    details = {}
    for day in plan.days:
        details[day.day_number] = day.walking_intensity
    return details


def display_holiday_warnings(plan):
    has_warning = False
    for day in plan.days:
        if day.holiday_warning:
            if not has_warning:
                print("\n" + "=" * 60)
                print("⚠️  节假日人流预警")
                print("=" * 60)
                has_warning = True
            warnings = day.holiday_warning.split("\n")
            for warning in warnings:
                level = "🔴" if "极高" in warning else "🟠" if "高" in warning else "🟡"
                print(f"   {level} 第{day.day_number}天({day.city}): {warning}")
    
    if not has_warning:
        print("\n✅ 所选时间段无重大节假日，出行体验佳")


def display_booking_hints(plan):
    print("\n" + "=" * 60)
    print("🎟️  预订链接提示")
    print("=" * 60)
    
    booking_items = []
    for day in plan.days:
        for activity in day.activities:
            if activity.booking_hint:
                item_type = "景点" if activity.attraction else "餐厅" if activity.restaurant else "交通/住宿"
                item_name = activity.attraction.name if activity.attraction else (
                    activity.restaurant.name if activity.restaurant else activity.description
                )
                booking_items.append((day.day_number, item_type, item_name, activity.booking_hint))
    
    if booking_items:
        for day_num, item_type, item_name, hint in booking_items[:8]:
            platform = hint.split("去")[1].split("预订")[0] if "去" in hint and "预订" in hint else "平台"
            print(f"   📅 第{day_num}天 | {item_type}: {item_name}")
            print(f"      👉 {hint}")
        
        if len(booking_items) > 8:
            print(f"   ... 还有{len(booking_items)-8}个预订提示，请查看完整计划")
    else:
        print("   暂无预订提示")


def display_plan_summary(plan):
    print(f"\n📌 {plan.title}")
    print(f"   总预算: ¥{plan.total_budget:.2f}")
    print(f"   天数: {len(plan.days)}天")
    print(f"   目的地: {', '.join(plan.destinations)}")
    print(f"   偏好: {', '.join(plan.preferences)}")

    for day in plan.days:
        print(f"\n   第{day.day_number}天 ({day.city}):")
        print(f"      步行强度: {day.walking_intensity} | 当日预算: ¥{day.total_cost:.2f}")
        for activity in day.activities:
            if activity.attraction:
                crowd_marker = "⚠️" if activity.attraction.holiday_crowd_level == "极高" else ""
                print(f"      📍 {activity.time_slot}: {activity.attraction.name} {crowd_marker}")
            elif activity.restaurant:
                print(f"      🍽️  {activity.time_slot}: {activity.restaurant.name}")
            elif activity.transport and "跨城" in activity.time_slot:
                print(f"      🚄 {activity.time_slot}: {activity.description}")


def display_full_plan(plan):
    print("\n" + "=" * 70)
    print(f"📋 {plan.title} 详细行程")
    print("=" * 70)

    for day in plan.days:
        print(f"\n{'='*65}")
        print(f"📅 第{day.day_number}天 - {day.city}")
        print(f"   步行强度: {day.walking_intensity} | 当日花费: ¥{day.total_cost:.2f}")
        if day.weather_hint:
            print(f"   🌤️  天气提示: {day.weather_hint}")
        if day.holiday_warning:
            for warning in day.holiday_warning.split("\n"):
                print(f"   ⚠️  {warning}")
        print(f"{'='*65}")

        for activity in day.activities:
            print(f"\n⏰ {activity.time_slot}")

            if activity.description:
                print(f"  📝 {activity.description}")

            if activity.attraction:
                attr = activity.attraction
                crowd_marker = "⚠️" if attr.holiday_crowd_level == "极高" else ""
                print(f"  📍 {attr.name} {crowd_marker}")
                print(f"     ⭐ 评分: {attr.rating}/5.0 | 🎫 门票: ¥{attr.ticket_price} | ⏱️ {attr.avg_visit_time}小时")
                print(f"     📍 位置: {attr.location_hint}")
                if attr.reviews:
                    print(f"     💬 热门评价: {attr.reviews[0]}")
                    if len(attr.reviews) > 1:
                        print(f"     💬 更多评价: {attr.reviews[1]}")

            if activity.restaurant:
                rest = activity.restaurant
                print(f"  🍽️  {rest.name}")
                print(f"     🍴 菜系: {rest.cuisine} | 💰 人均: ¥{rest.avg_price} | ⏰ {rest.business_hours}")
                if rest.must_try:
                    print(f"     🥢 必点: {', '.join(rest.must_try)}")
                if rest.reviews:
                    print(f"     💬 评价: {rest.reviews[0]}")

            if activity.transport:
                trans = activity.transport
                print(f"  🚇 {trans.transport_type.value}")
                print(f"     从 {trans.from_place} → {trans.to_place}")
                print(f"     ⏱️ 时长: {trans.duration} | 💰 费用: ¥{trans.cost:.2f}")
                if trans.tip:
                    print(f"     💡 提示: {trans.tip}")

            if activity.booking_hint:
                print(f"  🎟️  {activity.booking_hint}")


def main():
    if len(sys.argv) > 1:
        from .data_loader import DataLoader
        from .planner import TravelPlanner
        from .exporter import ExportManager

        command = sys.argv[1]

        if command == "--help" or command == "-h":
            print_help()
            return

        if command == "generate" and len(sys.argv) >= 3:
            user_input = " ".join(sys.argv[2:])
            data_loader = DataLoader()
            planner = TravelPlanner(data_loader)
            exporter = ExportManager()

            destinations, days, preferences = planner.parse_user_input(user_input)
            plan = planner.generate_travel_plan(destinations, days, preferences)

            filepath = exporter.save_markdown(plan)
            print(f"✅ 计划已生成并保存到: {filepath}")
            display_plan_summary(plan)
            display_holiday_warnings(plan)
            return

        if command == "export-pdf" and len(sys.argv) >= 3:
            user_input = " ".join(sys.argv[2:])
            data_loader = DataLoader()
            planner = TravelPlanner(data_loader)
            exporter = ExportManager()

            destinations, days, preferences = planner.parse_user_input(user_input)
            plan = planner.generate_travel_plan(destinations, days, preferences)

            try:
                pdf_path = exporter.save_pdf(plan)
                print(f"✅ PDF已生成: {pdf_path}")
            except ImportError as e:
                md_path = exporter.save_markdown(plan)
                print(f"❌ {e}")
                print(f"💡 已生成Markdown文件: {md_path}")
                print("   可以用浏览器打开后打印为PDF")
            return

    interactive_main()


def print_help():
    help_text = """
╔══════════════════════════════════════════════════════════════╗
║                    AI 旅行规划师 - 使用说明                   ║
╚══════════════════════════════════════════════════════════════╝

交互模式:
    python main.py

命令行模式:
    python main.py generate "成都3天2晚 美食 历史文化"
    python main.py export-pdf "成都3天2晚 美食"

支持的功能:
    ✅ 根据目的地、天数、偏好智能生成旅行计划
    ✅ 每日行程安排（上午/下午/晚上）
    ✅ 餐厅推荐（基于真实评价数据）
    ✅ 景点间交通建议和花费估算
    ✅ 计划调整功能（如减少步行）
    ✅ 导出 Markdown / PDF（支持多种PDF引擎自动选择）
    ✅ 详细的文本路线地图
    ✅ 多目的地串联规划
    ✅ 行李打包清单（基于天气和活动）
    ✅ 详细的Markdown格式预算表格
    ✅ 分享计划和点赞功能
    ✅ 节假日人流预警
    ✅ 语音播报每日行程
    ✅ 预订链接模拟提示

支持的城市: 成都、北京、西安、重庆
    """
    print(help_text)


if __name__ == "__main__":
    main()
