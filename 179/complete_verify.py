#!/usr/bin/env python3
"""完全自包含的验证脚本 - 所有操作在Python内部完成"""
import sys
import os
import tempfile
import shutil
import json
from pathlib import Path
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def install_package(package_name):
    """使用pip Python API安装包"""
    try:
        import pip
        from pip._internal import main as pip_main
    except ImportError:
        try:
            from pip import main as pip_main
        except ImportError:
            print(f"  ⚠️  无法导入pip API，跳过安装 {package_name}")
            return False
    
    try:
        result = pip_main(['install', package_name, '--quiet'])
        return result == 0
    except Exception as e:
        print(f"  ⚠️  安装 {package_name} 时出错: {e}")
        return False


def check_and_install_deps():
    """检查并安装依赖"""
    print("=" * 70)
    print("步骤 1: 检查并安装依赖")
    print("=" * 70)
    print()
    
    required = [
        ("click", "click"),
        ("jinja2", "jinja2"),
        ("python-dateutil", "dateutil"),
    ]
    
    all_ok = True
    for pkg_name, import_name in required:
        try:
            __import__(import_name)
            print(f"  ✓ {pkg_name} - 已安装")
        except ImportError:
            print(f"  ✗ {pkg_name} - 未安装，正在安装...")
            if install_package(pkg_name):
                try:
                    __import__(import_name)
                    print(f"    ✓ {pkg_name} - 安装成功")
                except ImportError:
                    print(f"    ✗ {pkg_name} - 安装后仍无法导入")
                    all_ok = False
            else:
                print(f"    ✗ {pkg_name} - 安装失败")
                all_ok = False
    
    print()
    if all_ok:
        print("✅ 所有必需依赖已就绪")
    else:
        print("⚠️  部分依赖可能未正确安装，但继续测试...")
    return all_ok


def test_cli_help():
    """测试CLI帮助信息 - 内部调用Click"""
    print()
    print("=" * 70)
    print("步骤 2: 验证CLI帮助信息")
    print("=" * 70)
    print()
    
    try:
        from click.testing import CliRunner
        from travel_diary.cli import cli
        
        runner = CliRunner()
        result = runner.invoke(cli, ['--help'])
        
        print("命令: python main.py --help")
        print("-" * 70)
        print(result.output)
        print("-" * 70)
        print(f"返回码: {result.exit_code}")
        
        if result.exit_code == 0 and "旅行日记" in result.output and "user" in result.output and "trip" in result.output:
            print()
            print("✅ CLI帮助信息验证通过")
            return True
        else:
            print()
            print("❌ CLI帮助信息验证失败")
            if result.exception:
                print(f"异常: {result.exception}")
            return False
    except Exception as e:
        print(f"❌ 测试CLI时出错: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_sample_data_internal():
    """内部调用创建示例数据"""
    print()
    print("=" * 70)
    print("步骤 3: 创建示例数据")
    print("=" * 70)
    print()
    
    # 清理旧数据
    test_data = Path(__file__).parent / "test_data"
    if test_data.exists():
        shutil.rmtree(test_data)
        print("已清理旧的测试数据")
    
    try:
        from travel_diary.storage import StorageManager
        from travel_diary.manager import DiaryManager
        from travel_diary.models import Location
        
        base_dir = str(test_data)
        storage = StorageManager(base_dir=base_dir)
        manager = DiaryManager(storage=storage)
        
        username = "traveler"
        print(f"创建用户: {username}")
        user = manager.create_user(username, "旅行爱好者", "travel@example.com")
        print(f"  ✓ 用户创建成功: {user.username} ({user.display_name})")
        
        trip_name = "2024东京之旅"
        print(f"\n创建旅行: {trip_name}")
        trip = manager.create_trip(
            username=username,
            name=trip_name,
            destination="日本东京",
            start_date="2024-04-01",
            end_date="2024-04-05",
            description="东京5日游，探索现代与传统交融的魅力都市"
        )
        print(f"  ✓ 旅行创建成功 (ID: {trip.id})")
        
        print("\n添加日记...")
        diaries = [
            ("2024-04-01", "今天抵达东京成田机场，乘坐N'EX快车前往新宿。下午在新宿逛街，晚上去了新宿御苑散步。东京的繁华超出想象，霓虹灯照亮了整个街区。", "兴奋", "新宿", 35.6895, 139.6917),
            ("2024-04-02", "早上前往浅草寺，雷门的巨大灯笼非常震撼。之后去了秋叶原，逛了很多动漫店和电器店。晚上在涩谷十字路口看人潮，太壮观了！", "开心", "浅草寺", 35.7148, 139.7967),
            ("2024-04-03", "今天去了迪士尼乐园！虽然人很多，但每个项目都很精彩。晚上的烟花表演太梦幻了，一天走了3万步但是完全不觉得累。", "狂喜", "东京迪士尼", 35.6329, 139.8804),
            ("2024-04-04", "上午参观了明治神宫，在闹市区中的一片宁静绿洲。下午在原宿逛街，看到了很多时尚的年轻人。晚上去台场看彩虹大桥夜景。", "平静", "明治神宫", 35.6764, 139.6993),
            ("2024-04-05", "最后一天，上午去了银座购物，买了很多伴手礼。下午乘坐机场快线返回成田机场。这次东京之旅非常完美，期待下次再来！", "依依不舍", "银座", 35.6721, 139.7636),
        ]
        
        for date, content, mood, loc_name, lat, lng in diaries:
            manager.add_diary_entry(
                username, trip.id, date,
                content=content,
                mood=mood,
                location=Location(name=loc_name, latitude=lat, longitude=lng)
            )
        print(f"  ✓ {len(diaries)} 篇日记添加成功")
        
        print("\n添加开销记录...")
        expenses = [
            ("2024-04-01", "交通", 12000, "成田机场到新宿车票"),
            ("2024-04-01", "住宿", 15000, "新宿酒店"),
            ("2024-04-01", "餐饮", 3500, "一兰拉面"),
            ("2024-04-02", "交通", 1500, "地铁一日券"),
            ("2024-04-02", "门票", 500, "浅草寺"),
            ("2024-04-02", "餐饮", 4000, "寿司早餐"),
            ("2024-04-02", "购物", 8000, "动漫周边"),
            ("2024-04-03", "门票", 7900, "迪士尼门票"),
            ("2024-04-03", "餐饮", 5500, "园内餐饮"),
            ("2024-04-03", "交通", 2000, "往返迪士尼"),
            ("2024-04-03", "购物", 3000, "迪士尼纪念品"),
            ("2024-04-04", "餐饮", 3000, "原宿可丽饼+晚餐"),
            ("2024-04-04", "交通", 1500, "地铁"),
            ("2024-04-04", "娱乐", 2000, "台场摩天轮"),
            ("2024-04-05", "交通", 12000, "到机场"),
            ("2024-04-05", "购物", 25000, "银座伴手礼"),
            ("2024-04-05", "餐饮", 2500, "机场午餐"),
        ]
        
        for date, category, amount, desc in expenses:
            manager.add_expense(username, trip.id, date, category, amount, desc)
        print(f"  ✓ {len(expenses)} 笔开销添加成功")
        
        # 验证数据
        trip_loaded = manager.get_trip(username, trip.id)
        total = trip_loaded.get_total_expenses()
        
        print()
        print("=" * 70)
        print("📊 示例数据概览")
        print("=" * 70)
        print(f"  用户: {username}")
        print(f"  旅行: {trip.name}")
        print(f"  目的地: {trip.destination}")
        print(f"  日期: {trip.start_date} ~ {trip.end_date}")
        print(f"  日记数: {len(trip_loaded.diary_entries)}")
        print(f"  总开销: ¥{total:.2f}")
        
        summary = manager.get_expense_summary(username, trip.id)
        print(f"\n  💰 开销统计:")
        print(f"    日均开销: ¥{summary['daily_average']:.2f}")
        for cat, amount in sorted(summary['by_category'].items()):
            pct = summary['category_percentages'][cat]
            print(f"    {cat}: ¥{amount:.2f} ({pct:.1f}%)")
        
        print(f"\n  📍 数据存储位置: {base_dir}")
        print()
        print("✅ 示例数据创建成功!")
        
        return username, trip.id, base_dir
        
    except Exception as e:
        print(f"❌ 创建示例数据失败: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None


def run_full_tests(username, trip_id, base_dir):
    """运行完整功能测试"""
    print()
    print("=" * 70)
    print("步骤 4: 完整功能测试")
    print("=" * 70)
    print()
    
    try:
        from travel_diary.storage import StorageManager
        from travel_diary.manager import DiaryManager
        from travel_diary.models import Location
        from travel_diary.report import ReportGenerator
        from travel_diary.map_generator import MapGenerator
        from travel_diary.statistics import StatisticsAnalyzer
        from travel_diary.zip_utils import ZipManager
        
        storage = StorageManager(base_dir=base_dir)
        manager = DiaryManager(storage=storage)
        report_gen = ReportGenerator(manager=manager)
        map_gen = MapGenerator(manager=manager)
        stats = StatisticsAnalyzer(manager=manager)
        zip_mgr = ZipManager(storage=storage)
        
        tests_passed = 0
        tests_total = 0
        
        # 测试1: 验证数据读取
        tests_total += 1
        print("测试 1: 验证数据读取...")
        trip = manager.get_trip(username, trip_id)
        if trip and trip.name == "2024东京之旅" and len(trip.diary_entries) == 5:
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试2: 日记全文输出
        tests_total += 1
        print("测试 2: 生成日记全文...")
        diary_text = manager.get_diary_text(username, trip_id)
        if "2024东京之旅" in diary_text and "浅草寺" in diary_text and "迪士尼" in diary_text:
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试3: 开销统计
        tests_total += 1
        print("测试 3: 开销统计分析...")
        summary = stats.get_detailed_summary(username, trip_id)
        if (summary['total'] == 108900 and 
            summary['duration_days'] == 5 and 
            summary['daily_average'] == 21780):
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print(f"  ❌ 失败 (total={summary.get('total')}, expected=108900)")
        
        # 测试4: 统计打印输出
        tests_total += 1
        print("测试 4: 统计输出格式化...")
        summary_text = stats.print_summary(username, trip_id)
        if "总开销: ¥108900.00" in summary_text and "住宿" in summary_text and "购物" in summary_text:
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试5: Markdown报告生成
        tests_total += 1
        print("测试 5: 生成Markdown报告...")
        md_path = report_gen.generate_markdown_report(username, trip_id)
        if Path(md_path).exists():
            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            if ("# 旅行报告: 2024东京之旅" in md_content and 
                "浅草寺" in md_content and 
                "## 开销统计" in md_content):
                print(f"  ✅ 通过 ({md_path})")
                tests_passed += 1
            else:
                print("  ❌ 失败 (内容不正确)")
        else:
            print("  ❌ 失败 (文件不存在)")
        
        # 测试6: Leaflet地图生成
        tests_total += 1
        print("测试 6: 生成Leaflet交互式地图...")
        map_path = map_gen.generate_map(username, trip_id)
        if Path(map_path).exists():
            with open(map_path, "r", encoding="utf-8") as f:
                map_content = f.read()
            if ("leaflet" in map_content.lower() and 
                "浅草寺" in map_content and 
                "新宿" in map_content and
                "35.6895" in map_content):
                print(f"  ✅ 通过 ({map_path})")
                tests_passed += 1
            else:
                print("  ❌ 失败 (内容不正确)")
        else:
            print("  ❌ 失败 (文件不存在)")
        
        # 测试7: 导出单个旅行Zip
        tests_total += 1
        print("测试 7: 导出单个旅行Zip...")
        trip_zip = zip_mgr.export_trip(username, trip_id)
        if Path(trip_zip).exists() and Path(trip_zip).suffix == ".zip":
            print(f"  ✅ 通过 ({trip_zip})")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试8: 导出用户全部数据Zip
        tests_total += 1
        print("测试 8: 导出用户全部数据Zip...")
        user_zip = zip_mgr.export_user_data(username)
        if Path(user_zip).exists() and Path(user_zip).suffix == ".zip":
            print(f"  ✅ 通过 ({user_zip})")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试9: Zip导入功能
        tests_total += 1
        print("测试 9: Zip导入功能...")
        import_test_dir = tempfile.mkdtemp(prefix="travel_diary_import_")
        import_storage = StorageManager(base_dir=import_test_dir)
        import_zip_mgr = ZipManager(storage=import_storage)
        
        try:
            result = import_zip_mgr.import_data(user_zip)
            if ("traveler" in result and 
                import_storage.user_exists("traveler") and
                len(import_storage.list_trips("traveler")) == 1):
                imported_trip = import_storage.list_trips("traveler")[0]
                if imported_trip.name == "2024东京之旅":
                    print(f"  ✅ 通过 (导入到 {import_test_dir})")
                    tests_passed += 1
                else:
                    print("  ❌ 失败 (导入数据不正确)")
            else:
                print("  ❌ 失败")
        except Exception as e:
            print(f"  ❌ 失败: {e}")
        finally:
            shutil.rmtree(import_test_dir)
        
        # 测试10: 测试新旅行创建
        tests_total += 1
        print("测试 10: 创建新旅行...")
        new_trip = manager.create_trip(
            username=username,
            name="测试旅行-北京",
            destination="中国北京",
            start_date="2024-05-01",
            end_date="2024-05-03"
        )
        if new_trip and new_trip.destination == "中国北京":
            print(f"  ✅ 通过 (ID: {new_trip.id})")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试11: 添加新日记
        tests_total += 1
        print("测试 11: 添加新日记...")
        new_entry = manager.add_diary_entry(
            username, new_trip.id, "2024-05-01",
            content="测试日记内容",
            mood="开心",
            location=Location(name="天安门", latitude=39.9042, longitude=116.4074)
        )
        if new_entry and new_entry.mood == "开心":
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试12: 添加新开销
        tests_total += 1
        print("测试 12: 添加新开销...")
        new_expense = manager.add_expense(
            username, new_trip.id, "2024-05-01",
            "餐饮", 100.0, "测试餐费"
        )
        if new_expense and new_expense.amount == 100.0:
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        # 测试13: 用户总体统计
        tests_total += 1
        print("测试 13: 用户总体统计...")
        overall = stats.get_user_overall_stats(username)
        if (overall['total_trips'] == 2 and 
            overall['unique_destinations'] == 2):
            print(f"  ✅ 通过 (总旅行: {overall['total_trips']}, 总开销: ¥{overall['total_expense']:.2f})")
            tests_passed += 1
        else:
            print(f"  ❌ 失败 (trips={overall.get('total_trips')})")
        
        # 测试14: 删除旅行
        tests_total += 1
        print("测试 14: 删除旅行...")
        delete_result = manager.delete_trip(username, new_trip.id)
        remaining_trips = manager.list_trips(username)
        if delete_result and len(remaining_trips) == 1:
            print("  ✅ 通过")
            tests_passed += 1
        else:
            print("  ❌ 失败")
        
        print()
        print("=" * 70)
        print("📊 测试结果")
        print("=" * 70)
        print(f"  通过: {tests_passed}/{tests_total}")
        print(f"  成功率: {tests_passed/tests_total*100:.1f}%")
        print()
        
        # 显示生成的文件预览
        print("=" * 70)
        print("📄 生成的文件预览")
        print("=" * 70)
        
        print(f"\n1. Markdown报告 ({md_path}):")
        print("-" * 70)
        with open(md_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for i, line in enumerate(lines[:30]):
                print(f"  {line.rstrip()}")
            if len(lines) > 30:
                print(f"  ... (共 {len(lines)} 行)")
        
        print(f"\n2. 交互式地图 ({map_path}):")
        print("-" * 70)
        with open(map_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for i, line in enumerate(lines[:20]):
                print(f"  {line.rstrip()}")
            if len(lines) > 20:
                print(f"  ... (共 {len(lines)} 行)")
        
        print(f"\n3. 统计输出预览:")
        print("-" * 70)
        print(summary_text[:500] + "..." if len(summary_text) > 500 else summary_text)
        
        print()
        print("=" * 70)
        if tests_passed == tests_total:
            print("🎉 所有测试通过! 旅行日记工具运行正常。")
            print("=" * 70)
            print(f"\n📂 测试数据位置: {base_dir}")
            print(f"\n📋 可用文件:")
            print(f"  - Markdown报告: {md_path}")
            print(f"  - 交互式地图: {map_path}")
            print(f"  - 旅行Zip: {trip_zip}")
            print(f"  - 用户Zip: {user_zip}")
            print(f"\n💡 提示: 在浏览器中打开地图HTML文件即可查看交互式地图")
            return True
        else:
            print(f"❌ {tests_total - tests_passed} 个测试失败")
            print("=" * 70)
            return False
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print()
    print("✈️" + "=" * 68)
    print("✈️  旅行日记工具 - 完整验证脚本")
    print("✈️" + "=" * 68)
    print()
    
    # 步骤1: 安装依赖
    check_and_install_deps()
    
    # 步骤2: 测试CLI帮助
    cli_ok = test_cli_help()
    
    # 步骤3: 创建示例数据
    username, trip_id, base_dir = create_sample_data_internal()
    
    if username and trip_id and base_dir:
        # 步骤4: 运行完整测试
        test_ok = run_full_tests(username, trip_id, base_dir)
        
        if cli_ok and test_ok:
            print()
            print("🎊" + "=" * 68)
            print("🎊  恭喜! 所有验证已通过，旅行日记工具完全正常工作!")
            print("🎊" + "=" * 68)
            print()
            print("下一步操作建议:")
            print("  1. 查看示例数据:")
            print(f"     python main.py trip {username} show {trip_id}")
            print()
            print("  2. 查看开销统计:")
            print(f"     python main.py trip {username} stats {trip_id}")
            print()
            print("  3. 生成新报告:")
            print(f"     python main.py trip {username} report {trip_id}")
            print()
            print("  4. 开始您自己的旅行:")
            print(f"     python main.py user create <您的用户名>")
            return 0
        else:
            print()
            print("⚠️  部分验证未通过，请检查上述错误信息")
            return 1
    else:
        print()
        print("❌ 无法创建示例数据，验证终止")
        return 1


if __name__ == "__main__":
    sys.exit(main())
