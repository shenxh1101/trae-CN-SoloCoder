import sys
import os
import subprocess
from io import StringIO

sys.path.insert(0, '/Users/mac/code/solo coder/179')
os.chdir('/Users/mac/code/solo coder/179')

# 捕获所有输出
output_capture = StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = output_capture
sys.stderr = output_capture

print("✈️  旅行日记工具 - 综合验证脚本")
print("=" * 60)

# 步骤 1: 检查并安装依赖
print("\n步骤 1: 检查并安装依赖...")
from install_deps import main as install_main
install_result = install_main()
if install_result != 0:
    print("\n❌ 依赖安装失败，尝试继续测试...")

all_passed = True

# 测试CLI帮助
print("\n" + "=" * 60)
print("测试 1: 查看CLI帮助信息")
print("=" * 60)

cmd = [sys.executable, "main.py", "--help"]
print(f"\n$ {' '.join(cmd)}")
print("-" * 60)
try:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd='/Users/mac/code/solo coder/179')
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr, file=sys.stderr)
    print("-" * 60)
    print(f"返回码: {result.returncode}")
    
    if result.returncode == 0 and "旅行日记" in result.stdout and "user" in result.stdout and "trip" in result.stdout:
        print("✅ CLI帮助测试通过")
    else:
        print("❌ CLI帮助测试失败")
        all_passed = False
except Exception as e:
    print(f"执行失败: {e}")
    all_passed = False

# 创建示例数据
print("\n" + "=" * 60)
print("测试 2: 创建示例数据")
print("=" * 60)

from pathlib import Path
import shutil
test_data = Path('/Users/mac/code/solo coder/179/test_data')
if test_data.exists():
    shutil.rmtree(test_data)
    print("已清理旧的测试数据")

cmd = [sys.executable, "create_sample_data.py"]
print(f"\n$ {' '.join(cmd)}")
print("-" * 60)
try:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd='/Users/mac/code/solo coder/179')
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr, file=sys.stderr)
    print("-" * 60)
    print(f"返回码: {result.returncode}")
    
    if result.returncode == 0 and "示例数据创建完成" in result.stdout:
        print("✅ 示例数据创建成功")
    else:
        print("❌ 示例数据创建失败")
        all_passed = False
except Exception as e:
    print(f"执行失败: {e}")
    all_passed = False

# 测试CLI命令和核心功能
print("\n" + "=" * 60)
print("测试 3: CLI命令测试")
print("=" * 60)

test_dir_cli = Path('/Users/mac/code/solo coder/179/test_data_cli')
if test_dir_cli.exists():
    shutil.rmtree(test_dir_cli)

print("\n测试: user list")
cmd = [sys.executable, "main.py", "user", "list"]
print(f"\n$ {' '.join(cmd)}")
print("-" * 60)
try:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd='/Users/mac/code/solo coder/179')
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr, file=sys.stderr)
    print("-" * 60)
    print(f"返回码: {result.returncode}")
except Exception as e:
    print(f"执行失败: {e}")

# 直接用Python API测试核心功能
print("\n" + "=" * 60)
print("测试 4: 直接调用Python API测试核心功能")
print("=" * 60)

import tempfile
try:
    from travel_diary.storage import StorageManager
    from travel_diary.manager import DiaryManager
    from travel_diary.models import Location
    from travel_diary.report import ReportGenerator
    from travel_diary.map_generator import MapGenerator
    from travel_diary.statistics import StatisticsAnalyzer
    from travel_diary.zip_utils import ZipManager
    
    print("✅ 所有模块导入成功")
    
    test_dir = tempfile.mkdtemp(prefix="travel_diary_cli_test_")
    print(f"测试目录: {test_dir}")
    
    storage = StorageManager(base_dir=test_dir)
    manager = DiaryManager(storage=storage)
    report_gen = ReportGenerator(manager=manager)
    map_gen = MapGenerator(manager=manager)
    stats = StatisticsAnalyzer(manager=manager)
    zip_mgr = ZipManager(storage=storage)
    
    print("\n1. 创建用户...")
    user = manager.create_user("testuser", "测试用户", "test@example.com")
    assert user.username == "testuser"
    print("   ✅ 用户创建成功")
    
    print("\n2. 创建旅行...")
    trip = manager.create_trip(
        username="testuser",
        name="测试旅行-北京",
        destination="中国北京",
        start_date="2024-05-01",
        end_date="2024-05-03",
        description="北京3日游"
    )
    assert trip.destination == "中国北京"
    assert trip.get_duration_days() == 3
    print(f"   ✅ 旅行创建成功 (ID: {trip.id})")
    
    print("\n3. 添加日记...")
    locations = [
        ("2024-05-01", "天安门广场", 39.9042, 116.4074, "到达北京，参观天安门广场", "兴奋"),
        ("2024-05-02", "故宫博物院", 39.9163, 116.3972, "游览故宫，感受历史的厚重", "震撼"),
        ("2024-05-03", "八达岭长城", 40.3576, 116.0199, "不到长城非好汉！", "激动"),
    ]
    
    for date, loc_name, lat, lng, content, mood in locations:
        manager.add_diary_entry(
            "testuser", trip.id, date,
            content=content,
            mood=mood,
            location=Location(name=loc_name, latitude=lat, longitude=lng)
        )
    print("   ✅ 3篇日记添加成功")
    
    print("\n4. 添加开销...")
    expenses = [
        ("2024-05-01", "交通", 500, "高铁票"),
        ("2024-05-01", "住宿", 800, "酒店"),
        ("2024-05-01", "餐饮", 200, "北京烤鸭"),
        ("2024-05-02", "门票", 60, "故宫门票"),
        ("2024-05-02", "餐饮", 150, "午餐"),
        ("2024-05-02", "交通", 50, "地铁打车"),
        ("2024-05-03", "门票", 40, "长城门票"),
        ("2024-05-03", "交通", 300, "返程高铁"),
        ("2024-05-03", "购物", 500, "纪念品"),
    ]
    
    for date, category, amount, desc in expenses:
        manager.add_expense("testuser", trip.id, date, category, amount, desc)
    print(f"   ✅ {len(expenses)}笔开销添加成功")
    
    print("\n5. 验证数据...")
    trip_loaded = manager.get_trip("testuser", trip.id)
    assert len(trip_loaded.diary_entries) == 3
    assert len(trip_loaded.get_all_expenses()) == 9
    total_expense = trip_loaded.get_total_expenses()
    assert total_expense == 2600
    print(f"   ✅ 数据验证通过 (总开销: ¥{total_expense:.2f})")
    
    print("\n6. 生成日记全文...")
    diary_text = manager.get_diary_text("testuser", trip.id)
    assert "测试旅行-北京" in diary_text
    assert "天安门广场" in diary_text
    assert "八达岭长城" in diary_text
    assert "¥2600.00" in diary_text
    print("   ✅ 日记全文生成成功")
    
    print("\n7. 开销统计...")
    summary = stats.print_summary("testuser", trip.id)
    assert "总开销: ¥2600.00" in summary
    assert "日均开销: ¥866.67" in summary
    assert "住宿" in summary
    assert "交通" in summary
    print("   ✅ 开销统计成功")
    print("\n" + summary[:200] + "...")
    
    print("\n8. 生成Markdown报告...")
    md_path = report_gen.generate_markdown_report("testuser", trip.id)
    assert Path(md_path).exists()
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
    assert "# 旅行报告: 测试旅行-北京" in md_content
    assert "天安门广场" in md_content
    assert "八达岭长城" in md_content
    print(f"   ✅ Markdown报告生成成功: {md_path}")
    
    print("\n9. 生成Leaflet地图...")
    map_path = map_gen.generate_map("testuser", trip.id)
    assert Path(map_path).exists()
    with open(map_path, "r", encoding="utf-8") as f:
        map_content = f.read()
    assert "leaflet" in map_content.lower()
    assert "天安门广场" in map_content
    assert "故宫博物院" in map_content
    assert "八达岭长城" in map_content
    assert "39.9042" in map_content
    print(f"   ✅ 交互式地图生成成功: {map_path}")
    
    print("\n10. 导出Zip包...")
    trip_zip = zip_mgr.export_trip("testuser", trip.id)
    assert Path(trip_zip).exists()
    assert Path(trip_zip).suffix == ".zip"
    print(f"   ✅ 旅行数据导出成功: {trip_zip}")
    
    user_zip = zip_mgr.export_user_data("testuser")
    assert Path(user_zip).exists()
    print(f"   ✅ 用户数据导出成功: {user_zip}")
    
    print("\n11. 测试Zip导入...")
    import_test_dir = tempfile.mkdtemp(prefix="travel_diary_import_test_")
    import_storage = StorageManager(base_dir=import_test_dir)
    import_zip_mgr = ZipManager(storage=import_storage)
    
    result = import_zip_mgr.import_data(user_zip)
    assert "testuser" in result
    assert import_storage.user_exists("testuser")
    
    imported_trips = import_storage.list_trips("testuser")
    assert len(imported_trips) == 1
    assert imported_trips[0].name == "测试旅行-北京"
    print(f"   ✅ 数据导入成功: {import_test_dir}")
    
    shutil.rmtree(import_test_dir)
    
    print("\n" + "=" * 60)
    print("🎉 所有核心功能测试通过!")
    print("=" * 60)
    print(f"\n测试数据保存在: {test_dir}")
    print(f"\n生成的文件:")
    print(f"  - Markdown报告: {md_path}")
    print(f"  - 交互式地图: {map_path}")
    print(f"  - 旅行Zip: {trip_zip}")
    print(f"  - 用户Zip: {user_zip}")
    
    print("\n" + "=" * 60)
    print("📄 Markdown报告预览 (前30行):")
    print("=" * 60)
    with open(md_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i < 30:
                print(line.rstrip())
            else:
                break
        print("...")
    
    print("\n" + "=" * 60)
    print("🗺️  HTML地图预览 (前20行):")
    print("=" * 60)
    with open(map_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i < 20:
                print(line.rstrip())
            else:
                break
        print("...")
    
except Exception as e:
    print(f"\n❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    all_passed = False

print("\n" + "=" * 60)
if all_passed:
    print("🎉 所有测试通过! 旅行日记工具运行正常。")
    print("=" * 60)
    print("\n现在可以使用以下命令开始使用:")
    print("  python main.py --help                    # 查看帮助")
    print("  python create_sample_data.py             # 创建示例数据")
    print("  python main.py user list                 # 查看用户")
    print("  python main.py trip traveler list        # 查看旅行")
    print("  python main.py trip traveler stats <ID>  # 查看统计")
    print("  python main.py trip traveler report <ID> # 生成报告")
    print("  python main.py trip traveler map <ID>    # 生成地图")
    exit_code = 0
else:
    print("❌ 部分测试失败，请检查上述错误信息。")
    print("=" * 60)
    exit_code = 1

sys.stdout = old_stdout
sys.stderr = old_stderr

captured = output_capture.getvalue()
with open('/Users/mac/code/solo coder/179/verify_output.txt', 'w', encoding='utf-8') as f:
    f.write(captured)

print(captured)
sys.exit(exit_code)
