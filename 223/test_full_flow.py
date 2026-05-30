import json
import requests
import sys
import time

BASE_URL = "http://127.0.0.1:5001"

def print_header(text):
    print("\n" + "=" * 60)
    print(f"🧪 {text}")
    print("=" * 60)

def test_register_and_flow():
    print_header("测试用户注册和完整流程")
    
    session = requests.Session()
    
    print("\n1️⃣ 访问注册页面...")
    response = session.get(f"{BASE_URL}/register")
    if response.status_code == 200:
        print("   ✅ 注册页面加载成功")
    else:
        print(f"   ❌ 注册页面加载失败: {response.status_code}")
        return False
    
    print("\n2️⃣ 提交注册信息（选择科技和体育类别）...")
    register_data = {
        'categories': ['科技', '体育'],
        'keywords': ['人工智能', '足球', '苹果']
    }
    response = session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=False)
    
    if response.status_code == 302:
        print("   ✅ 注册成功，重定向到推荐页面")
        if 'session' in response.cookies or 'session' in session.cookies:
            print("   ✅ Session已设置")
    else:
        print(f"   ❌ 注册失败: {response.status_code}")
        print(f"   响应: {response.text[:200]}")
        return False
    
    print("\n3️⃣ 访问推荐页面...")
    response = session.get(f"{BASE_URL}/recommend")
    if response.status_code == 200:
        print("   ✅ 推荐页面加载成功")
        content = response.text
        if '为您推荐的新闻' in content:
            print("   ✅ 推荐页面内容正确")
        if '简单匹配' in content or '加权匹配' in content:
            ab_group = '简单匹配' if '简单匹配' in content else '加权匹配'
            print(f"   ✅ A/B测试分组: {ab_group}")
        if '科技' in content or '体育' in content:
            print("   ✅ 推荐内容包含用户偏好类别")
        if '推荐理由' in content:
            print("   ✅ 推荐理由显示正确")
    else:
        print(f"   ❌ 推荐页面加载失败: {response.status_code}")
        return False
    
    print("\n4️⃣ 测试点赞功能（点击第1条新闻）...")
    response = session.get(f"{BASE_URL}/feedback/1/like", allow_redirects=True)
    if response.status_code == 200:
        print("   ✅ 点赞成功，页面重定向正确")
    else:
        print(f"   ❌ 点赞失败: {response.status_code}")
    
    print("\n5️⃣ 测试点踩功能（点击第2条新闻）...")
    response = session.get(f"{BASE_URL}/feedback/2/dislike", allow_redirects=True)
    if response.status_code == 200:
        print("   ✅ 点踩成功，页面重定向正确")
    else:
        print(f"   ❌ 点踩失败: {response.status_code}")
    
    return True

def test_admin():
    print_header("测试管理员功能")
    
    print("\n1️⃣ 访问管理员页面...")
    response = requests.get(f"{BASE_URL}/admin")
    if response.status_code == 200:
        content = response.text
        if '管理员控制台' in content:
            print("   ✅ 管理员页面加载成功")
        if '新闻总数' in content:
            print("   ✅ 新闻总数统计显示")
        if '体育' in content and '科技' in content:
            print("   ✅ 类别统计显示正确")
    else:
        print(f"   ❌ 管理员页面加载失败: {response.status_code}")
        return False
    
    print("\n2️⃣ 访问添加新闻页面...")
    response = requests.get(f"{BASE_URL}/admin/add_news")
    if response.status_code == 200:
        if '添加新闻' in response.text:
            print("   ✅ 添加新闻页面加载成功")
    else:
        print(f"   ❌ 添加新闻页面加载失败: {response.status_code}")
        return False
    
    print("\n3️⃣ 测试添加新闻（JSON格式）...")
    new_news = {
        "title": "测试新闻标题",
        "summary": "这是一条测试新闻的摘要内容",
        "category": "科技",
        "keywords": ["测试", "人工智能"]
    }
    response = requests.post(f"{BASE_URL}/admin/add_news", 
                            data={'news_json': json.dumps(new_news)})
    if response.status_code == 302 or (response.status_code == 200 and '管理员' in response.text):
        print("   ✅ 新闻添加成功")
    else:
        print(f"   ⚠️  添加新闻响应: {response.status_code}")
    
    return True

def test_preferences_import_export():
    print_header("测试偏好导入导出功能")
    
    session = requests.Session()
    
    print("\n1️⃣ 先注册一个测试用户...")
    register_data = {
        'categories': ['娱乐', '财经'],
        'keywords': ['电影', '股票']
    }
    session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=True)
    
    print("\n2️⃣ 导出偏好配置...")
    response = session.get(f"{BASE_URL}/export_preferences")
    if response.status_code == 200:
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' in content_type or response.text.strip().startswith('{'):
            try:
                data = json.loads(response.text)
                print("   ✅ 导出成功，JSON格式正确")
                if 'preferences' in data:
                    print(f"   ✅ 包含偏好数据: {data['preferences']['categories']}")
                if 'ab_group' in data:
                    print(f"   ✅ 包含A/B分组: {data['ab_group']}")
                
                export_data = response.text
            except json.JSONDecodeError:
                print("   ❌ JSON格式错误")
                return False
        else:
            print(f"   ⚠️  Content-Type: {content_type}")
            export_data = response.text
    else:
        print(f"   ❌ 导出失败: {response.status_code}")
        return False
    
    print("\n3️⃣ 测试导入偏好配置...")
    session2 = requests.Session()
    files = {'preferences_file': ('preferences.json', export_data, 'application/json')}
    response = session2.post(f"{BASE_URL}/import_preferences", files=files, allow_redirects=True)
    if response.status_code == 200:
        print("   ✅ 导入成功，重定向到推荐页面")
    else:
        print(f"   ⚠️  导入响应状态: {response.status_code}")
    
    return True

def test_ab_test():
    print_header("测试A/B测试功能")
    
    print("\n1️⃣ 访问A/B测试统计页面...")
    response = requests.get(f"{BASE_URL}/ab_stats")
    if response.status_code == 200:
        content = response.text
        if 'A/B测试统计面板' in content:
            print("   ✅ A/B测试页面加载成功")
        if '简单匹配算法' in content and '加权匹配算法' in content:
            print("   ✅ 两组算法统计显示正确")
        if '点击率' in content:
            print("   ✅ 点击率统计显示")
    else:
        print(f"   ❌ A/B测试页面加载失败: {response.status_code}")
        return False
    
    print("\n2️⃣ 验证随机分配机制...")
    groups = []
    for i in range(10):
        session = requests.Session()
        register_data = {'categories': ['科技'], 'keywords': []}
        session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=True)
        response = session.get(f"{BASE_URL}/recommend")
        if '简单匹配' in response.text:
            groups.append('simple')
        elif '加权匹配' in response.text:
            groups.append('weighted')
    
    simple_count = groups.count('simple')
    weighted_count = groups.count('weighted')
    print(f"   10次注册的分组结果: 简单匹配={simple_count}, 加权匹配={weighted_count}")
    if simple_count > 0 and weighted_count > 0:
        print("   ✅ 随机分配机制正常工作")
    else:
        print("   ⚠️  可能需要更多样本来验证随机性")
    
    return True

def test_weekly_report():
    print_header("测试新闻周报功能")
    
    session = requests.Session()
    
    print("\n1️⃣ 注册测试用户...")
    register_data = {
        'categories': ['科技', '体育', '娱乐'],
        'keywords': ['人工智能', '足球']
    }
    session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=True)
    
    print("\n2️⃣ 生成新闻周报...")
    response = session.get(f"{BASE_URL}/weekly_report")
    if response.status_code == 200:
        content = response.text
        if '个性化新闻周报' in content:
            print("   ✅ 周报页面加载成功")
        if '打印周报' in content:
            print("   ✅ 打印按钮显示")
        if '科技' in content and '体育' in content:
            print("   ✅ 按类别分组显示")
        if '@media print' in content:
            print("   ✅ 包含打印样式")
        if '推荐原因' in content:
            print("   ✅ 推荐原因显示")
    else:
        print(f"   ❌ 周报生成失败: {response.status_code}")
        return False
    
    return True

def main():
    print("🚀 开始完整功能测试")
    print(f"📡 测试地址: {BASE_URL}")
    
    all_passed = True
    
    try:
        all_passed &= test_register_and_flow()
        all_passed &= test_admin()
        all_passed &= test_preferences_import_export()
        all_passed &= test_ab_test()
        all_passed &= test_weekly_report()
        
        print("\n" + "=" * 60)
        if all_passed:
            print("🎉 所有测试通过！系统功能正常")
        else:
            print("⚠️  部分测试需要关注")
        print("=" * 60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请确保Flask服务正在运行！")
        print(f"   请在终端运行: python app.py")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
