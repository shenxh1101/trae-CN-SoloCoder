#!/usr/bin/env python3

import requests
import json
import sys
import time

BASE_URL = "http://localhost:3000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def check_server():
    print_section("1. 服务器健康检查")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 服务器运行正常: {data.get('message', 'OK')}")
            return True
        else:
            print(f"❌ 服务器返回错误状态码: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 无法连接到服务器: {e}")
        print(f"   请确保服务器正在运行: node server.js")
        return False

def verify_features():
    print_section("2. 游戏功能验证")
    try:
        response = requests.get(f"{BASE_URL}/api/verify", timeout=5)
        if response.status_code == 200:
            data = response.json()
            features = data.get('features', {})
            
            all_passed = True
            for category, items in features.items():
                status = items.get('status', 'implemented')
                if isinstance(items, dict):
                    sub_items = {k: v for k, v in items.items() if k != 'status'}
                    icon = "✅" if all(v for v in sub_items.values()) else "❌"
                    print(f"{icon} {category.replace('_', ' ').title()}:")
                    for key, value in sub_items.items():
                        sub_icon = "✅" if value else "❌"
                        if not value:
                            all_passed = False
                        if isinstance(value, bool):
                            print(f"     {sub_icon} {key}: {'已实现' if value else '未实现'}")
                        elif isinstance(value, list):
                            print(f"     {sub_icon} {key}: {', '.join(value)}")
                        else:
                            print(f"     {sub_icon} {key}: {value}")
            
            if all_passed:
                print("\n🎉 所有游戏功能已实现！")
            else:
                print("\n⚠️  部分功能需要检查")
            
            return all_passed
        else:
            print(f"❌ 获取功能列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 验证功能时出错: {e}")
        return False

def validate_maze_generation():
    print_section("3. 迷宫生成算法验证")
    
    test_seeds = [12345, 98765, 42, 100000, 777]
    all_passed = True
    
    for seed in test_seeds:
        try:
            response = requests.post(
                f"{BASE_URL}/api/validate/maze",
                json={"seed": seed, "size": 11},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                valid = data.get('valid', False)
                reachable = data.get('reachableCells', 0)
                total = data.get('totalEmptyCells', 0)
                
                icon = "✅" if valid else "❌"
                print(f"{icon} Seed {seed}:")
                print(f"     可达单元格: {reachable}/{total}")
                print(f"     迷宫有效: {valid}")
                
                if not valid:
                    all_passed = False
            else:
                print(f"❌ 验证 Seed {seed} 失败: {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"❌ 验证 Seed {seed} 时出错: {e}")
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有迷宫均成功生成，且所有单元格均可到达！")
    else:
        print("\n⚠️  部分迷宫生成存在问题")
    
    return all_passed

def test_score_system():
    print_section("4. 分数系统测试")
    
    test_scores = [
        {"difficulty": "easy", "time": 45.5, "steps": 120, "stars": 5, "playerName": "TestPlayer1"},
        {"difficulty": "normal", "time": 60.0, "steps": 150, "stars": 6, "playerName": "TestPlayer2"},
        {"difficulty": "hard", "time": 90.0, "steps": 200, "stars": 7, "playerName": "TestPlayer3"},
    ]
    
    all_passed = True
    
    for score in test_scores:
        try:
            response = requests.post(
                f"{BASE_URL}/api/score",
                json=score,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {score['difficulty'].title()} 难度:")
                print(f"     玩家: {score['playerName']}")
                print(f"     时间: {score['time']}s, 步数: {score['steps']}, 星星: {score['stars']}")
                print(f"     排名: {data.get('message', 'N/A')}")
            else:
                print(f"❌ 提交分数失败 ({score['difficulty']}): {response.status_code}")
                print(f"   {response.json().get('error', '')}")
                all_passed = False
                
        except Exception as e:
            print(f"❌ 测试分数系统时出错: {e}")
            all_passed = False
    
    print("\n📋 获取排行榜:")
    for diff in ['easy', 'normal', 'hard']:
        try:
            response = requests.get(f"{BASE_URL}/api/scores/{diff}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                scores = data.get('scores', [])
                print(f"   {diff.title()}: {len(scores)} 条记录")
            else:
                print(f"   {diff.title()}: 获取失败")
                all_passed = False
        except Exception as e:
            print(f"   {diff.title()}: 出错 - {e}")
            all_passed = False
    
    return all_passed

def validate_game_files():
    print_section("5. 游戏文件验证")
    
    import os
    
    required_files = [
        ('index.html', 'HTML入口文件'),
        ('styles.css', 'CSS样式文件'),
        ('game.js', '游戏主逻辑'),
        ('server.js', '后端服务器'),
        ('package.json', '项目配置'),
    ]
    
    all_passed = True
    for filename, description in required_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"✅ {description}:")
            print(f"     文件名: {filename}")
            print(f"     文件大小: {size} bytes")
            
            if size == 0:
                print(f"     ⚠️  文件为空！")
                all_passed = False
        else:
            print(f"❌ 缺少文件: {filename} ({description})")
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有必需文件都已存在！")
    
    return all_passed

def check_game_features_in_code():
    print_section("6. 代码功能检查")
    
    import os
    
    game_js = 'game.js'
    if not os.path.exists(game_js):
        print("❌ 无法找到 game.js 文件")
        return False
    
    with open(game_js, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = [
        ('MazeGenerator', '迷宫生成类'),
        ('recursive', '递归回溯算法'),
        ('WASD', 'WASD控制'),
        ('gravity', '重力系统'),
        ('collision', '碰撞检测'),
        ('SpotLight', '手电筒聚光灯'),
        ('flashlight', '手电筒功能'),
        ('enemy', '敌人系统'),
        ('patrol', '敌人巡逻'),
        ('chase', '敌人追逐'),
        ('minimap', '小地图'),
        ('timer', '计时器'),
        ('steps', '步数统计'),
        ('localStorage', '本地存储'),
        ('particles', '粒子特效'),
        ('collectKey', '钥匙收集'),
        ('collectStar', '星星收集'),
        ('easy', '简单难度'),
        ('normal', '普通难度'),
        ('hard', '困难难度'),
        ('saveGame', '保存游戏'),
        ('loadGame', '加载游戏'),
        ('PointerLock', '鼠标锁定'),
    ]
    
    all_passed = True
    for keyword, description in checks:
        found = keyword.lower() in content.lower()
        icon = "✅" if found else "❌"
        if not found:
            all_passed = False
        print(f"{icon} {description}: {'找到' if found else '未找到'}")
    
    if all_passed:
        print("\n🎉 所有核心功能在代码中均已实现！")
    else:
        print("\n⚠️  部分功能在代码中未找到")
    
    return all_passed

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║           3D迷宫漫游游戏 - REST API 验证脚本                ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    results.append(('服务器连接', check_server()))
    
    if not results[0][1]:
        print("\n❌ 无法连接到服务器，请先启动服务器:")
        print("   1. 安装依赖: npm install")
        print("   2. 启动服务器: npm start")
        sys.exit(1)
    
    time.sleep(0.5)
    results.append(('功能列表验证', verify_features()))
    
    time.sleep(0.5)
    results.append(('迷宫生成验证', validate_maze_generation()))
    
    time.sleep(0.5)
    results.append(('分数系统测试', test_score_system()))
    
    time.sleep(0.5)
    results.append(('游戏文件检查', validate_game_files()))
    
    time.sleep(0.5)
    results.append(('代码功能检查', check_game_features_in_code()))
    
    print_section("测试总结")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        icon = "✅" if result else "❌"
        print(f"{icon} {name}: {'通过' if result else '失败'}")
    
    print(f"\n总计: {passed}/{total} 项测试通过")
    
    if passed == total:
        print("\n🎉🎉🎉 所有测试通过！游戏已准备就绪！🎉🎉🎉")
        print(f"\n🎮 在浏览器中打开 {BASE_URL} 开始游戏！")
        return 0
    else:
        print(f"\n⚠️  有 {total - passed} 项测试未通过，请检查相关功能")
        return 1

if __name__ == "__main__":
    sys.exit(main())
