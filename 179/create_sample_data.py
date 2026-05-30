#!/usr/bin/env python3
"""创建示例旅行数据用于演示"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
from travel_diary.storage import StorageManager
from travel_diary.manager import DiaryManager
from travel_diary.models import Location

def main():
    base_dir = Path(__file__).parent / "test_data"
    storage = StorageManager(base_dir=str(base_dir))
    manager = DiaryManager(storage=storage)

    username = "traveler"
    if not storage.user_exists(username):
        print(f"创建用户: {username}")
        manager.create_user(username, "旅行爱好者", "travel@example.com")
    else:
        print(f"用户已存在: {username}")

    trip_name = "2024东京之旅"
    existing_trips = manager.list_trips(username)
    trip = next((t for t in existing_trips if t.name == trip_name), None)

    if not trip:
        print(f"创建旅行: {trip_name}")
        trip = manager.create_trip(
            username=username,
            name=trip_name,
            destination="日本东京",
            start_date="2024-04-01",
            end_date="2024-04-05",
            description="东京5日游，探索现代与传统交融的魅力都市"
        )
        print(f"  旅行ID: {trip.id}")

        print("\n添加日记...")
        
        manager.add_diary_entry(
            username, trip.id, "2024-04-01",
            content="今天抵达东京成田机场，乘坐N'EX快车前往新宿。下午在新宿逛街，晚上去了新宿御苑散步。东京的繁华超出想象，霓虹灯照亮了整个街区。",
            mood="兴奋",
            location=Location(name="新宿", latitude=35.6895, longitude=139.6917)
        )
        print("  ✓ 4月1日日记已添加")

        manager.add_diary_entry(
            username, trip.id, "2024-04-02",
            content="早上前往浅草寺，雷门的巨大灯笼非常震撼。之后去了秋叶原，逛了很多动漫店和电器店。晚上在涩谷十字路口看人潮，太壮观了！",
            mood="开心",
            location=Location(name="浅草寺", latitude=35.7148, longitude=139.7967)
        )
        print("  ✓ 4月2日日记已添加")

        manager.add_diary_entry(
            username, trip.id, "2024-04-03",
            content="今天去了迪士尼乐园！虽然人很多，但每个项目都很精彩。晚上的烟花表演太梦幻了，一天走了3万步但是完全不觉得累。",
            mood="狂喜",
            location=Location(name="东京迪士尼", latitude=35.6329, longitude=139.8804)
        )
        print("  ✓ 4月3日日记已添加")

        manager.add_diary_entry(
            username, trip.id, "2024-04-04",
            content="上午参观了明治神宫，在闹市区中的一片宁静绿洲。下午在原宿逛街，看到了很多时尚的年轻人。晚上去台场看彩虹大桥夜景。",
            mood="平静",
            location=Location(name="明治神宫", latitude=35.6764, longitude=139.6993)
        )
        print("  ✓ 4月4日日记已添加")

        manager.add_diary_entry(
            username, trip.id, "2024-04-05",
            content="最后一天，上午去了银座购物，买了很多伴手礼。下午乘坐机场快线返回成田机场。这次东京之旅非常完美，期待下次再来！",
            mood="依依不舍",
            location=Location(name="银座", latitude=35.6721, longitude=139.7636)
        )
        print("  ✓ 4月5日日记已添加")

        print("\n添加开销记录...")
        
        manager.add_expense(username, trip.id, "2024-04-01", "交通", 12000, "成田机场到新宿车票", "JPY")
        manager.add_expense(username, trip.id, "2024-04-01", "住宿", 15000, "新宿酒店", "JPY")
        manager.add_expense(username, trip.id, "2024-04-01", "餐饮", 3500, "一兰拉面", "JPY")
        
        manager.add_expense(username, trip.id, "2024-04-02", "交通", 1500, "地铁一日券", "JPY")
        manager.add_expense(username, trip.id, "2024-04-02", "门票", 500, "浅草寺", "JPY")
        manager.add_expense(username, trip.id, "2024-04-02", "餐饮", 4000, "寿司早餐", "JPY")
        manager.add_expense(username, trip.id, "2024-04-02", "购物", 8000, "动漫周边", "JPY")
        
        manager.add_expense(username, trip.id, "2024-04-03", "门票", 7900, "迪士尼门票", "JPY")
        manager.add_expense(username, trip.id, "2024-04-03", "餐饮", 5500, "园内餐饮", "JPY")
        manager.add_expense(username, trip.id, "2024-04-03", "交通", 2000, "往返迪士尼", "JPY")
        manager.add_expense(username, trip.id, "2024-04-03", "购物", 3000, "迪士尼纪念品", "JPY")
        
        manager.add_expense(username, trip.id, "2024-04-04", "餐饮", 3000, "原宿可丽饼+晚餐", "JPY")
        manager.add_expense(username, trip.id, "2024-04-04", "交通", 1500, "地铁", "JPY")
        manager.add_expense(username, trip.id, "2024-04-04", "娱乐", 2000, "台场摩天轮", "JPY")
        
        manager.add_expense(username, trip.id, "2024-04-05", "交通", 12000, "到机场", "JPY")
        manager.add_expense(username, trip.id, "2024-04-05", "购物", 25000, "银座伴手礼", "JPY")
        manager.add_expense(username, trip.id, "2024-04-05", "餐饮", 2500, "机场午餐", "JPY")
        
        print("  ✓ 开销记录已添加")
    else:
        print(f"旅行已存在: {trip.name} (ID: {trip.id})")

    print("\n" + "="*60)
    print("📊 旅行数据概览")
    print("="*60)
    print(f"用户: {username}")
    print(f"旅行: {trip.name}")
    print(f"目的地: {trip.destination}")
    print(f"日期: {trip.start_date} ~ {trip.end_date}")
    print(f"日记数: {len(trip.diary_entries)}")
    print(f"总开销: ¥{trip.get_total_expenses():.2f}")
    
    summary = manager.get_expense_summary(username, trip.id)
    print(f"\n💰 开销统计:")
    print(f"  日均开销: ¥{summary['daily_average']:.2f}")
    for cat, amount in summary['by_category'].items():
        print(f"  {cat}: ¥{amount:.2f} ({summary['category_percentages'][cat]:.1f}%)")

    print(f"\n📍 数据存储位置: {base_dir}")
    print(f"\n🎉 示例数据创建完成!")
    print(f"\n接下来可以运行:")
    print(f"  # 查看旅行详情")
    print(f"  python main.py trip {username} show {trip.id}")
    print(f"\n  # 查看开销统计")
    print(f"  python main.py trip {username} stats {trip.id}")
    print(f"\n  # 生成Markdown报告")
    print(f"  python main.py trip {username} report {trip.id}")
    print(f"\n  # 生成交互式地图")
    print(f"  python main.py trip {username} map {trip.id}")
    print(f"\n  # 导出为Zip")
    print(f"  python main.py user export {username}")

    return trip.id

if __name__ == "__main__":
    main()
