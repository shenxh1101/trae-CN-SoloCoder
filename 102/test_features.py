#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://127.0.0.1:8080"

def test_create_snippets():
    print("=" * 60)
    print("测试1: 创建测试代码片段")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "Python代码片段（永不过期，无密码）",
            "data": {
                "title": "Python Hello World",
                "author": "TestUser",
                "language": "python",
                "content": "def hello_world():\n    print('Hello, World!')\n    for i in range(5):\n        print(f'Count: {i}')",
                "expires": "never",
                "password": ""
            }
        },
        {
            "name": "JavaScript代码片段（1小时过期）",
            "data": {
                "title": "JavaScript Function",
                "author": "JS Dev",
                "language": "javascript",
                "content": "function greet(name) {\n    console.log(`Hello, ${name}!`);\n    return {\n        message: 'Welcome',\n        timestamp: Date.now()\n    };\n}",
                "expires": "1h",
                "password": ""
            }
        },
        {
            "name": "SQL代码片段（密码保护）",
            "data": {
                "title": "SQL Query Example",
                "author": "DBA",
                "language": "sql",
                "content": "SELECT \n    users.id,\n    users.name,\n    COUNT(orders.id) as order_count\nFROM users\nLEFT JOIN orders ON users.id = orders.user_id\nWHERE users.active = 1\nGROUP BY users.id, users.name\nHAVING COUNT(orders.id) > 5\nORDER BY order_count DESC;",
                "expires": "1d",
                "password": "test123"
            }
        },
        {
            "name": "Bash脚本（7天过期，带密码）",
            "data": {
                "title": "Backup Script",
                "author": "SysAdmin",
                "language": "bash",
                "content": "#!/bin/bash\n# Backup script\nDATE=$(date +%Y%m%d_%H%M%S)\nBACKUP_DIR=\"/backup/$DATE\"\n\nmkdir -p $BACKUP_DIR\ntar -czf $BACKUP_DIR/etc.tar.gz /etc\necho \"Backup completed: $BACKUP_DIR\"",
                "expires": "7d",
                "password": "secret"
            }
        }
    ]
    
    created_ids = []
    
    for test in test_cases:
        print(f"\n创建: {test['name']}")
        response = requests.post(f"{BASE_URL}/api/snippets", json=test["data"])
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"  ✓ 成功! ID: {result['id']}")
                print(f"  ✓ URL: {result['url']}")
                created_ids.append({
                    "id": result["id"],
                    "name": test["name"],
                    "has_password": bool(test["data"]["password"])
                })
            else:
                print(f"  ✗ 失败: {result.get('error')}")
        else:
            print(f"  ✗ HTTP错误: {response.status_code}")
    
    return created_ids

def test_access_snippets(created_ids):
    print("\n" + "=" * 60)
    print("测试2: 访问代码片段验证功能")
    print("=" * 60)
    
    for item in created_ids:
        snippet_id = item["id"]
        print(f"\n访问: {item['name']} (ID: {snippet_id})")
        
        response = requests.get(f"{BASE_URL}/s/{snippet_id}")
        
        if item["has_password"]:
            if "需要密码" in response.text or "password" in response.url.lower():
                print(f"  ✓ 密码保护正常工作 - 需要输入密码")
            else:
                print(f"  ⚠ 密码保护可能未生效")
        else:
            if response.status_code == 200:
                print(f"  ✓ 页面访问成功 (状态码: 200)")
                
                if "linenos" in response.text or "code-highlight" in response.text:
                    print(f"  ✓ 语法高亮和行号显示正常")
                else:
                    print(f"  ⚠ 可能缺少语法高亮")
                
                if "复制代码" in response.text:
                    print(f"  ✓ 复制按钮存在")
                else:
                    print(f"  ⚠ 复制按钮可能缺失")
                
                if "下载" in response.text:
                    print(f"  ✓ 下载按钮存在")
                else:
                    print(f"  ⚠ 下载按钮可能缺失")
            else:
                print(f"  ✗ 访问失败 (状态码: {response.status_code})")

def test_password_access(created_ids):
    print("\n" + "=" * 60)
    print("测试3: 密码保护功能")
    print("=" * 60)
    
    password_items = [item for item in created_ids if item["has_password"]]
    
    if not password_items:
        print("没有需要密码的测试片段")
        return
    
    session = requests.Session()
    
    for item in password_items:
        snippet_id = item["id"]
        print(f"\n测试密码访问: {item['name']} (ID: {snippet_id})")
        
        response = session.get(f"{BASE_URL}/s/{snippet_id}")
        if "password" in response.url.lower() or "需要密码" in response.text:
            print(f"  ✓ 首次访问需要密码验证")
            
            correct_password = "test123" if "SQL" in item["name"] else "secret"
            
            response = session.post(
                f"{BASE_URL}/password/{snippet_id}",
                data={"password": correct_password}
            )
            
            if response.status_code == 200 or response.url.endswith(f"/s/{snippet_id}"):
                print(f"  ✓ 密码验证成功")
                
                response = session.get(f"{BASE_URL}/s/{snippet_id}")
                if "code-highlight" in response.text:
                    print(f"  ✓ 验证后可以查看代码内容")
                else:
                    print(f"  ⚠ 验证后页面内容可能有问题")
            else:
                print(f"  ✗ 密码验证失败")
        else:
            print(f"  ⚠ 可能未触发密码验证")

def test_report_function(created_ids):
    print("\n" + "=" * 60)
    print("测试4: 举报功能")
    print("=" * 60)
    
    if not created_ids:
        print("没有可举报的片段")
        return
    
    snippet_id = created_ids[0]["id"]
    print(f"\n举报片段 ID: {snippet_id}")
    
    response = requests.post(
        f"{BASE_URL}/s/{snippet_id}/report",
        data={"reason": "这是一个测试举报，包含不当内容"}
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print(f"  ✓ 举报提交成功")
        else:
            print(f"  ✗ 举报失败")
    else:
        print(f"  ✗ HTTP错误: {response.status_code}")

def test_admin_functions():
    print("\n" + "=" * 60)
    print("测试5: 管理后台功能")
    print("=" * 60)
    
    session = requests.Session()
    
    print("\n测试管理员登录 (密码: admin123)")
    response = session.post(
        f"{BASE_URL}/admin",
        data={"password": "admin123"}
    )
    
    if "被举报" in response.text or "report" in response.text.lower():
        print(f"  ✓ 管理员登录成功")
        
        if "暂无被举报" not in response.text:
            print(f"  ✓ 显示被举报的片段列表")
            
            if "删除" in response.text:
                print(f"  ✓ 删除按钮存在")
            else:
                print(f"  ⚠ 删除按钮可能缺失")
        else:
            print(f"  ℹ 当前没有被举报的片段")
    else:
        print(f"  ✗ 登录可能失败或页面内容不正确")

def test_view_stats(created_ids):
    print("\n" + "=" * 60)
    print("测试6: 访问统计功能")
    print("=" * 60)
    
    if not created_ids:
        print("没有可测试的片段")
        return
    
    public_id = next((item["id"] for item in created_ids if not item["has_password"]), None)
    
    if public_id:
        print(f"\n测试访问统计 (ID: {public_id})")
        
        initial_response = requests.get(f"{BASE_URL}/s/{public_id}")
        
        import re
        initial_match = re.search(r'(\d+)\s*次访问', initial_response.text)
        initial_views = int(initial_match.group(1)) if initial_match else 0
        print(f"  初始访问次数: {initial_views}")
        
        for i in range(3):
            requests.get(f"{BASE_URL}/s/{public_id}")
        
        final_response = requests.get(f"{BASE_URL}/s/{public_id}")
        final_match = re.search(r'(\d+)\s*次访问', final_response.text)
        final_views = int(final_match.group(1)) if final_match else 0
        
        if final_views > initial_views:
            print(f"  ✓ 访问统计正常工作 (当前: {final_views} 次)")
        else:
            print(f"  ⚠ 访问统计可能未更新")
    else:
        print("没有公开的测试片段")

def test_recent_snippets():
    print("\n" + "=" * 60)
    print("测试7: 最近片段列表和搜索")
    print("=" * 60)
    
    response = requests.get(BASE_URL)
    
    if "最近片段" in response.text or "snippet-item" in response.text:
        print(f"  ✓ 最近片段列表存在")
    else:
        print(f"  ⚠ 最近片段列表可能缺失")
    
    if "搜索" in response.text:
        print(f"  ✓ 搜索功能存在")
    else:
        print(f"  ⚠ 搜索功能可能缺失")
    
    response = requests.get(f"{BASE_URL}/?search=Hello")
    if response.status_code == 200:
        print(f"  ✓ 搜索请求成功")

def main():
    print("CodeShare 功能测试套件")
    print("=" * 60)
    
    try:
        created_ids = test_create_snippets()
        test_access_snippets(created_ids)
        test_password_access(created_ids)
        test_report_function(created_ids)
        test_admin_functions()
        test_view_stats(created_ids)
        test_recent_snippets()
        
        print("\n" + "=" * 60)
        print("测试完成!")
        print("=" * 60)
        print(f"\n共创建了 {len(created_ids)} 个测试片段")
        print("请在浏览器中查看详细效果: http://127.0.0.1:8080")
        
    except requests.exceptions.ConnectionError:
        print("\n✗ 错误: 无法连接到服务器")
        print("请确保Flask应用正在运行: python app.py")
    except Exception as e:
        print(f"\n✗ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
