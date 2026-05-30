#!/usr/bin/env python3
"""完整功能测试脚本 - 测试所有模块"""
import sys
import os
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from travel_diary.storage import StorageManager
from travel_diary.manager import DiaryManager
from travel_diary.models import Location, User, Trip, DiaryEntry, Expense
from travel_diary.report import ReportGenerator
from travel_diary.map_generator import MapGenerator
from travel_diary.statistics import StatisticsAnalyzer
from travel_diary.zip_utils import ZipManager


def run_tests():
    test_dir = tempfile.mkdtemp(prefix="travel_diary_test_")
    print(f"🧪 测试目录: {test_dir}")
    
    try:
        print("\n" + "="*60)
        print("1. 测试数据模型")
        print("="*60)
        
        exp = Expense(date="2024-01-01", category="餐饮", amount=100.0, description="测试")
        assert exp.amount == 100.0
        assert exp.category == "餐饮"
        print("✓ Expense 模型测试通过")
        
        loc = Location(name="北京", latitude=39.9042, longitude=116.4074)
        assert loc.latitude == 39.9042
        print("✓ Location 模型测试通过")
        
        entry = DiaryEntry(
            date="2024-01-01",
            content="测试日记",
            mood="开心",
            location=loc
        )
        entry.add_expense(exp)
        assert entry.get_total_expenses() == 100.0
        assert len(entry.expenses) == 1
        print("✓ DiaryEntry 模型测试通过")
        
        trip = Trip(
            name="测试旅行",
            destination="测试目的地",
            start_date="2024-01-01",
            end_date="2024-01-03"
        )
        trip.add_diary_entry(entry)
        assert trip.get_total_expenses() == 100.0
        assert trip.get_duration_days() == 3
        assert len(trip.diary_entries) == 1
        print("✓ Trip 模型测试通过")
        
        user = User(username="testuser", display_name="测试用户")
        assert user.username == "testuser"
        print("✓ User 模型测试通过")

        print("\n" + "="*60)
        print("2. 测试存储管理器")
        print("="*60)
        
        storage = StorageManager(base_dir=test_dir)
        assert storage.base_dir == Path(test_dir)
        print("✓ StorageManager 初始化通过")
        
        user = User(username="testuser", display_name="测试用户")
        result = storage.create_user(user)
        assert result == True
        assert storage.user_exists("testuser") == True
        print("✓ 创建用户通过")
        
        loaded_user = storage.get_user("testuser")
        assert loaded_user.username == "testuser"
        assert loaded_user.display_name == "测试用户"
        print("✓ 读取用户通过")
        
        trip = Trip(
            name="测试旅行",
            destination="北京",
            start_date="2024-01-01",
            end_date="2024-01-03"
        )
        result = storage.save_trip("testuser", trip)
        assert result == True
        trips = storage.list_trips("testuser")
        assert len(trips) == 1
        assert trips[0].name == "测试旅行"
        print("✓ 保存旅行通过")
        
        loaded_trip = storage.get_trip("testuser", trip.id)
        assert loaded_trip.id == trip.id
        assert loaded_trip.destination == "北京"
        print("✓ 读取旅行通过")

        print("\n" + "="*60)
        print("3. 测试业务管理器")
        print("="*60)
        
        manager = DiaryManager(storage=storage)
        
        user2 = manager.create_user("user2", "用户二", "user2@test.com")
        assert user2.username == "user2"
        users = manager.list_users()
        assert "testuser" in users
        assert "user2" in users
        print("✓ 用户管理通过")
        
        trip2 = manager.create_trip(
            username="user2",
            name="东京之旅",
            destination="日本东京",
            start_date="2024-04-01",
            end_date="2024-04-05",
            description="东京5日游"
        )
        assert trip2.destination == "日本东京"
        assert trip2.get_duration_days() == 5
        print("✓ 创建旅行通过")
        
        manager.add_diary_entry(
            "user2", trip2.id, "2024-04-01",
            content="第一天到达东京，很兴奋！",
            mood="兴奋",
            location=Location(name="成田机场", latitude=35.7720, longitude=140.3929)
        )
        manager.add_diary_entry(
            "user2", trip2.id, "2024-04-02",
            content="浅草寺之行",
            mood="开心",
            location=Location(name="浅草寺", latitude=35.7148, longitude=139.7967)
        )
        print("✓ 添加日记通过")
        
        manager.add_expense("user2", trip2.id, "2024-04-01", "交通", 1200, "机场大巴")
        manager.add_expense("user2", trip2.id, "2024-04-01", "住宿", 5000, "酒店")
        manager.add_expense("user2", trip2.id, "2024-04-02", "餐饮", 3000, "寿司")
        manager.add_expense("user2", trip2.id, "2024-04-02", "门票", 500, "浅草寺")
        print("✓ 添加开销通过")
        
        trip2_loaded = manager.get_trip("user2", trip2.id)
        assert len(trip2_loaded.diary_entries) == 2
        assert trip2_loaded.get_total_expenses() == 9700
        print("✓ 数据验证通过")
        
        diary_text = manager.get_diary_text("user2", trip2.id)
        assert "东京之旅" in diary_text
        assert "浅草寺" in diary_text
        assert "¥9700" in diary_text
        print("✓ 日记输出通过")
        
        summary = manager.get_expense_summary("user2", trip2.id)
        assert summary["total"] == 9700
        assert summary["duration_days"] == 5
        assert summary["daily_average"] == 1940
        assert summary["by_category"]["交通"] == 1200
        assert summary["category_percentages"]["住宿"] > 50
        print("✓ 开销统计通过")

        print("\n" + "="*60)
        print("4. 测试报告生成器")
        print("="*60)
        
        report_gen = ReportGenerator(manager=manager)
        md_path = report_gen.generate_markdown_report("user2", trip2.id)
        assert Path(md_path).exists()
        with open(md_path, "r", encoding="utf-8") as f:
            md_content = f.read()
        assert "# 旅行报告: 东京之旅" in md_content
        assert "## 开销统计" in md_content
        assert "浅草寺" in md_content
        print(f"✓ Markdown报告生成通过: {md_path}")

        print("\n" + "="*60)
        print("5. 测试地图生成器")
        print("="*60)
        
        map_gen = MapGenerator(manager=manager)
        map_path = map_gen.generate_map("user2", trip2.id)
        assert Path(map_path).exists()
        with open(map_path, "r", encoding="utf-8") as f:
            map_content = f.read()
        assert "leaflet" in map_content.lower()
        assert "成田机场" in map_content
        assert "浅草寺" in map_content
        assert "35.7720" in map_content
        print(f"✓ 地图生成通过: {map_path}")

        print("\n" + "="*60)
        print("6. 测试统计分析器")
        print("="*60)
        
        stats = StatisticsAnalyzer(manager=manager)
        detailed = stats.get_detailed_summary("user2", trip2.id)
        assert detailed["top_category"] == "住宿"
        assert detailed["diary_entries_count"] == 2
        assert detailed["locations_count"] == 2
        assert detailed["completion_rate"] == 40.0
        print("✓ 详细统计通过")
        
        summary_text = stats.print_summary("user2", trip2.id)
        assert "旅行开销统计" in summary_text
        assert "总开销: ¥9700.00" in summary_text
        assert "住宿" in summary_text
        print("✓ 统计打印通过")
        
        overall = stats.get_user_overall_stats("user2")
        assert overall["total_trips"] == 1
        assert overall["total_expense"] == 9700
        assert overall["unique_destinations"] == 1
        print("✓ 用户总体统计通过")

        print("\n" + "="*60)
        print("7. 测试Zip导入导出")
        print("="*60)
        
        zip_mgr = ZipManager(storage=storage)
        
        # 导出单个旅行
        trip_zip = zip_mgr.export_trip("user2", trip2.id)
        assert Path(trip_zip).exists()
        assert Path(trip_zip).suffix == ".zip"
        print(f"✓ 旅行导出通过: {trip_zip}")
        
        # 导出整个用户
        user_zip = zip_mgr.export_user_data("user2")
        assert Path(user_zip).exists()
        print(f"✓ 用户导出通过: {user_zip}")
        
        # 测试导入到新的存储
        new_test_dir = tempfile.mkdtemp(prefix="travel_diary_import_")
        new_storage = StorageManager(base_dir=new_test_dir)
        new_zip_mgr = ZipManager(storage=new_storage)
        
        result = new_zip_mgr.import_data(user_zip)
        assert "user2" in result
        assert new_storage.user_exists("user2")
        imported_trips = new_storage.list_trips("user2")
        assert len(imported_trips) == 1
        assert imported_trips[0].name == "东京之旅"
        print("✓ 数据导入通过")
        
        shutil.rmtree(new_test_dir)

        print("\n" + "="*60)
        print("🎉 所有测试通过!")
        print("="*60)
        print(f"\n测试数据保存在: {test_dir}")
        print("可以手动检查生成的文件:")
        print(f"  - Markdown报告: {md_path}")
        print(f"  - 交互式地图: {map_path}")
        print(f"  - 导出Zip: {user_zip}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # 可选：清理测试数据
        # shutil.rmtree(test_dir)
        pass


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
