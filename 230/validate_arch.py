#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
代码架构验证脚本 - 验证所有模块可正常导入和初始化
"""

import os
import sys
from dotenv import load_dotenv

print("=" * 60)
print("🔍 AI 视频分镜生成器 - 代码架构验证")
print("=" * 60)

# 1. 加载环境变量
print("\n1️⃣  加载环境变量...")
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")
model = os.getenv("OPENAI_MODEL")
vision_model = os.getenv("OPENAI_VISION_MODEL")
print(f"   API Key: {'✅ 已设置' if api_key else '❌ 未设置'}")
print(f"   Base URL: {base_url or '默认'}")
print(f"   Model: {model or '默认'}")
print(f"   Vision Model: {vision_model or '默认'}")

# 2. 验证依赖包
print("\n2️⃣  验证依赖包安装...")
deps = [
    ("openai", "OpenAI SDK"),
    ("reportlab", "ReportLab (PDF导出)"),
    ("PIL", "Pillow (图片处理)"),
    ("click", "Click (CLI框架)"),
    ("rich", "Rich (终端美化)"),
    ("tqdm", "tqdm (进度条)"),
    ("dotenv", "python-dotenv (环境变量)"),
]

all_ok = True
for dep, desc in deps:
    try:
        __import__(dep)
        print(f"   ✅ {desc}")
    except ImportError as e:
        print(f"   ❌ {desc}: {e}")
        all_ok = False

# 3. 导入所有模块
print("\n3️⃣  导入所有模块...")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

modules = [
    ("storyboard_generator", "分镜生成引擎"),
    ("exporter", "文件导出模块"),
    ("batch_processor", "批量处理模块"),
    ("image_analyzer", "图片分析模块"),
    ("pace_analyzer", "节奏分析模块"),
    ("storyboard_html", "HTML故事板模块"),
]

for mod_name, desc in modules:
    try:
        __import__(mod_name)
        print(f"   ✅ {desc}")
    except Exception as e:
        print(f"   ❌ {desc}: {e}")
        all_ok = False

# 4. 测试数据类和基础功能
print("\n4️⃣  测试核心类初始化...")
try:
    from storyboard_generator import Shot
    shot = Shot(
        shot_number=1,
        shot_type="近景",
        description="测试画面描述",
        dialogue="测试台词",
        duration=5.0,
        pace="正常",
        transition="切"
    )
    print(f"   ✅ Shot 数据类: {shot}")
except Exception as e:
    print(f"   ❌ Shot 数据类: {e}")
    all_ok = False

# 5. 测试导出模块
print("\n5️⃣  测试导出模块...")
try:
    from exporter import StoryboardExporter
    exporter = StoryboardExporter(output_dir="/tmp/test_export")
    print(f"   ✅ StoryboardExporter 初始化成功")
except Exception as e:
    print(f"   ❌ StoryboardExporter: {e}")
    all_ok = False

# 6. 测试图片分析 (基础颜色提取)
print("\n6️⃣  测试图片分析 (基础模式)...")
try:
    from image_analyzer import ImageStyleAnalyzer
    analyzer = ImageStyleAnalyzer()
    test_img = "examples/test_image.jpg"
    if os.path.exists(test_img):
        result = analyzer.analyze_style(test_img, use_vision=False)
        print(f"   ✅ 基础图片分析成功")
        print(f"      - 主色调: {result['dominant_colors']}")
        print(f"      - 构图: {result['composition']}")
        print(f"      - 亮度: {result['brightness']}")
    else:
        print(f"   ⚠️  测试图片不存在，跳过")
except Exception as e:
    print(f"   ❌ ImageStyleAnalyzer: {e}")
    all_ok = False

# 7. 测试节奏分析
print("\n7️⃣  测试节奏分析...")
try:
    from pace_analyzer import PaceAnalyzer
    from storyboard_generator import Shot

    pace_analyzer = PaceAnalyzer()
    test_shots = [
        Shot(1, "近景", "", "", 5, "紧张", "切"),
        Shot(2, "中景", "", "", 5, "正常", "淡入淡出"),
        Shot(3, "远景", "", "", 5, "舒缓", "切"),
    ]
    test_storyboard = {"shots": test_shots}
    result = pace_analyzer.analyze_pace_curve(test_storyboard)
    print(f"   ✅ 节奏分析成功")
    print(f"      - 整体节奏: {result['overall_pace_level']}")
    print(f"      - 平均节奏值: {result['average_pace']:.2f}")
except Exception as e:
    print(f"   ❌ PaceAnalyzer: {e}")
    all_ok = False

# 8. 测试HTML生成
print("\n8️⃣  测试HTML故事板生成...")
try:
    from storyboard_html import generate_storyboard_html
    from storyboard_generator import Shot

    test_shots = [
        Shot(1, "近景", "测试画面1", "台词1", 5, "紧张", "切"),
        Shot(2, "中景", "测试画面2", "台词2", 5, "正常", "淡入淡出"),
    ]
    test_storyboard = {
        "title": "测试视频",
        "creative": "测试创意",
        "total_duration": 10,
        "shots": test_shots,
        "overall_pace_analysis": "测试分析",
        "transition_suggestions": "测试建议"
    }

    output_path = "/tmp/test_storyboard.html"
    result = generate_storyboard_html(test_storyboard, output_path)
    if os.path.exists(result):
        size = os.path.getsize(result)
        print(f"   ✅ HTML生成成功: {size} 字节")
    else:
        print(f"   ❌ HTML文件未生成")
except Exception as e:
    print(f"   ❌ HTML生成: {e}")
    all_ok = False

# 9. 总结
print("\n" + "=" * 60)
if all_ok:
    print("✅ 所有架构验证通过！")
    print("\n📋 下一步:")
    print("   1. 在 .env 文件中配置有效的 OPENAI_API_KEY")
    print("   2. 运行: python main.py generate \"创意描述\"")
    print("   3. 获取API Key: https://platform.openai.com/api-keys")
    print("      或 DeepSeek: https://platform.deepseek.com")
else:
    print("⚠️  部分验证失败，请检查依赖安装")
print("=" * 60)
