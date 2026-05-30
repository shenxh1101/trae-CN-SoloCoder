#!/usr/bin/env python3
import requests
import json
import sys
import time

BASE_URL = "http://127.0.0.1:5001"
COOKIE_FILE = '/tmp/news_recommender_cookies.txt'

def print_sep(char='=', length=60):
    print("\n" + char * length)

def print_test(name):
    print_sep()
    print(f"🧪 测试: {name}")
    print_sep('-')

def print_success(msg):
    print(f"  ✅ {msg}")

def print_error(msg):
    print(f"  ❌ {msg}")

def print_warning(msg):
    print(f"  ⚠️  {msg}")

def print_info(msg):
    print(f"  ℹ️  {msg}")

def test_server_running():
    print_test("检查服务器是否运行")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5, allow_redirects=False)
        print_success(f"服务器响应正常，状态码: {response.status_code}")
        return True
    except requests.exceptions.ConnectionError:
        print_error("无法连接到服务器！")
        print_info(f"请确保Flask服务正在运行: python app.py")
        print_info(f"服务地址: {BASE_URL}")
        return False

def test_register_preferences():
    print_test("用户注册偏好保存")
    
    session = requests.Session()
    
    print_info("步骤1: 访问注册页面获取初始状态")
    response = session.get(f"{BASE_URL}/register")
    if response.status_code != 200:
        print_error(f"注册页面访问失败，状态码: {response.status_code}")
        return False, None
    print_success("注册页面访问成功")
    
    print_info("步骤2: 提交注册信息 - 只选择【科技】类别")
    register_data = {
        'categories': ['科技'],
        'keywords': []
    }
    
    response = session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=False)
    
    if response.status_code != 302:
        print_error(f"注册提交失败，状态码: {response.status_code}")
        return False, None
    print_success("注册提交成功，正确重定向")
    
    if 'session' not in session.cookies:
        print_error("Session cookie未设置")
        return False, None
    print_success("Session cookie已设置")
    
    print_info("步骤3: 访问推荐页面，验证偏好是否生效")
    response = session.get(f"{BASE_URL}/recommend")
    if response.status_code != 200:
        print_error(f"推荐页面访问失败，状态码: {response.status_code}")
        return False, None
    
    content = response.text
    
    categories_found = []
    for cat in ['科技', '体育', '娱乐', '财经', '健康', '教育']:
        if f'category-tag">{cat}' in content or f'>{cat}</span' in content:
            categories_found.append(cat)
    
    print_info(f"推荐结果中出现的类别: {categories_found}")
    
    if '科技' not in categories_found:
        print_error("推荐结果中未出现【科技】类新闻，偏好可能未生效")
        return False, session
    
    non_tech_cats = [c for c in categories_found if c != '科技']
    if len(non_tech_cats) > 0:
        print_warning(f"推荐结果中出现非偏好类别: {non_tech_cats}")
    else:
        print_success("推荐结果主要包含【科技】类新闻，偏好生效")
    
    return True, session

def test_recommendation_updates(session):
    print_test("推荐结果实时更新验证")
    
    if not session:
        print_error("没有有效的Session，跳过测试")
        return False
    
    print_info("步骤1: 获取初始推荐结果")
    response1 = session.get(f"{BASE_URL}/recommend")
    content1 = response1.text
    
    import re
    titles1 = re.findall(r'class="news-title">([^<]+)</div>', content1)
    print_info(f"初始推荐前5条:")
    for i, title in enumerate(titles1[:5], 1):
        print_info(f"  {i}. {title}")
    
    print_info("步骤2: 刷新页面，验证推荐结果稳定性")
    response2 = session.get(f"{BASE_URL}/recommend")
    content2 = response2.text
    
    titles2 = re.findall(r'class="news-title">([^<]+)</div>', content2)
    
    if titles1 == titles2:
        print_success("刷新页面后推荐结果稳定（无反馈时）")
    else:
        print_warning("刷新页面后推荐结果发生变化")
        common = set(titles1) & set(titles2)
        print_info(f"  相同新闻: {len(common)}/{len(titles1)}")
    
    return True

def test_feedback_updates_preferences(session):
    print_test("点赞/点踩后偏好向量变化")
    
    if not session:
        print_error("没有有效的Session，跳过测试")
        return False
    
    print_info("先重新注册一个新用户用于精确测试")
    test_session = requests.Session()
    register_data = {
        'categories': ['科技', '体育'],
        'keywords': ['人工智能']
    }
    test_session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=False)
    
    print_info("步骤1: 导出偏好，查看初始权重")
    
    response = test_session.get(f"{BASE_URL}/export_preferences")
    initial_prefs = json.loads(response.text)
    
    print_info(f"初始类别权重: {initial_prefs['preferences']['category_weights']}")
    print_info(f"初始关键词权重: {initial_prefs['preferences']['keyword_weights']}")
    
    initial_tech_weight = initial_prefs['preferences']['category_weights'].get('科技', 1.0)
    initial_sport_weight = initial_prefs['preferences']['category_weights'].get('体育', 1.0)
    
    print_info("步骤2: 找到一条科技类新闻并点赞")
    
    response = test_session.get(f"{BASE_URL}/recommend")
    content = response.text
    
    import re
    news_ids = re.findall(r'feedback/(\d+)/like', content)
    
    if not news_ids:
        print_error("未找到可点赞的新闻")
        return False
    
    news_id_to_like = news_ids[0]
    print_info(f"将点赞新闻ID: {news_id_to_like}")
    
    test_session.get(f"{BASE_URL}/feedback/{news_id_to_like}/like")
    
    print_info("步骤3: 再次导出偏好，验证权重变化")
    
    response = test_session.get(f"{BASE_URL}/export_preferences")
    updated_prefs = json.loads(response.text)
    
    print_info(f"更新后类别权重: {updated_prefs['preferences']['category_weights']}")
    print_info(f"更新后关键词权重: {updated_prefs['preferences']['keyword_weights']}")
    
    updated_tech_weight = updated_prefs['preferences']['category_weights'].get('科技', 1.0)
    updated_sport_weight = updated_prefs['preferences']['category_weights'].get('体育', 1.0)
    
    tech_weight_change = updated_tech_weight - initial_tech_weight
    sport_weight_change = updated_sport_weight - initial_sport_weight
    
    print_info(f"科技类权重变化: {initial_tech_weight} -> {updated_tech_weight} (+{tech_weight_change})")
    print_info(f"体育类权重变化: {initial_sport_weight} -> {updated_sport_weight} (+{sport_weight_change})")
    
    if tech_weight_change > 0:
        print_success("点赞后科技类权重正确增加")
    else:
        print_error("点赞后科技类权重未增加！")
        return False
    
    if sport_weight_change == 0:
        print_success("体育类权重保持不变（正确）")
    else:
        print_error("体育类权重不应该变化！")
        return False
    
    print_info("步骤4: 测试点踩功能")
    
    response = test_session.get(f"{BASE_URL}/recommend")
    content = response.text
    news_ids = re.findall(r'feedback/(\d+)/dislike', content)
    
    if not news_ids:
        print_error("未找到可点踩的新闻")
        return False
    
    news_id_to_dislike = news_ids[1] if len(news_ids) > 1 else news_ids[0]
    print_info(f"将点踩新闻ID: {news_id_to_dislike}")
    
    response = test_session.get(f"{BASE_URL}/export_preferences")
    prefs_before_dislike = json.loads(response.text)
    
    test_session.get(f"{BASE_URL}/feedback/{news_id_to_dislike}/dislike")
    
    response = test_session.get(f"{BASE_URL}/export_preferences")
    prefs_after_dislike = json.loads(response.text)
    
    print_info(f"点踩后权重: {prefs_after_dislike['preferences']['category_weights']}")
    
    return True

def test_admin_pages():
    print_test("管理员页面测试")
    
    print_info("步骤1: 访问管理员统计页面")
    response = requests.get(f"{BASE_URL}/admin")
    if response.status_code != 200:
        print_error(f"管理员页面访问失败，状态码: {response.status_code}")
        return False
    
    content = response.text
    if '管理员控制台' not in content:
        print_error("管理员页面内容不正确")
        return False
    print_success("管理员统计页面访问成功")
    
    if '新闻总数' in content:
        print_success("新闻总数统计显示")
    
    if '体育' in content and '科技' in content:
        print_success("类别统计显示")
    
    print_info("步骤2: 访问添加新闻页面")
    response = requests.get(f"{BASE_URL}/admin/add_news")
    if response.status_code != 200:
        print_error(f"添加新闻页面访问失败，状态码: {response.status_code}")
        return False
    print_success("添加新闻页面访问成功")
    
    return True

def test_import_export():
    print_test("偏好导入导出功能")
    
    session = requests.Session()
    
    print_info("步骤1: 注册测试用户")
    register_data = {
        'categories': ['娱乐', '财经'],
        'keywords': ['电影', '股票']
    }
    session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=False)
    
    print_info("步骤2: 导出偏好")
    response = session.get(f"{BASE_URL}/export_preferences")
    if response.status_code != 200:
        print_error(f"导出失败，状态码: {response.status_code}")
        return False
    
    try:
        export_data = json.loads(response.text)
        print_success("导出数据JSON格式正确")
    except json.JSONDecodeError:
        print_error("导出数据不是有效的JSON")
        return False
    
    if 'preferences' not in export_data:
        print_error("导出数据缺少preferences字段")
        return False
    print_success("导出数据包含preferences字段")
    
    if 'ab_group' not in export_data:
        print_error("导出数据缺少ab_group字段")
        return False
    print_success("导出数据包含ab_group字段")
    
    print_info(f"导出的类别: {export_data['preferences']['categories']}")
    print_info(f"A/B分组: {export_data['ab_group']}")
    
    print_info("步骤3: 导入偏好到新Session")
    session2 = requests.Session()
    
    files = {
        'preferences_file': (
            'preferences.json',
            json.dumps(export_data),
            'application/json'
        )
    }
    
    response = session2.post(f"{BASE_URL}/import_preferences", files=files, allow_redirects=False)
    
    if response.status_code != 302:
        print_error(f"导入失败，状态码: {response.status_code}")
        return False
    print_success("偏好导入成功")
    
    response = session2.get(f"{BASE_URL}/export_preferences")
    imported_data = json.loads(response.text)
    
    if imported_data['preferences']['categories'] == export_data['preferences']['categories']:
        print_success("导入后类别偏好正确恢复")
    else:
        print_error("导入后类别偏好不正确")
        return False
    
    return True

def test_weekly_report():
    print_test("新闻周报功能")
    
    session = requests.Session()
    
    register_data = {
        'categories': ['科技', '体育'],
        'keywords': []
    }
    session.post(f"{BASE_URL}/register", data=register_data, allow_redirects=False)
    
    print_info("步骤1: 访问周报页面")
    response = session.get(f"{BASE_URL}/weekly_report")
    if response.status_code != 200:
        print_error(f"周报页面访问失败，状态码: {response.status_code}")
        return False
    
    content = response.text
    
    checks = [
        ('个性化新闻周报', '周报标题'),
        ('打印周报', '打印按钮'),
        ('@media print', '打印样式'),
        ('推荐原因', '推荐原因显示')
    ]
    
    all_ok = True
    for check_str, desc in checks:
        if check_str in content:
            print_success(f"包含{desc}")
        else:
            print_error(f"缺少{desc}")
            all_ok = False
    
    return all_ok

def main():
    print("🚀 开始实际端到端测试")
    print(f"📡 测试目标: {BASE_URL}")
    
    all_passed = True
    
    if not test_server_running():
        print("\n❌ 服务器未运行，测试终止")
        sys.exit(1)
    
    tests = [
        ('用户注册偏好保存', test_register_preferences),
        ('推荐结果实时更新', test_recommendation_updates),
        ('点赞点踩偏好变化', test_feedback_updates_preferences),
        ('管理员页面', test_admin_pages),
        ('偏好导入导出', test_import_export),
        ('新闻周报功能', test_weekly_report),
    ]
    
    session = None
    for test_name, test_func in tests:
        try:
            if test_name == '推荐结果实时更新':
                result = test_func(session)
            elif test_name == '点赞点踩偏好变化':
                result = test_func(session)
            elif test_name == '用户注册偏好保存':
                result, session = test_func()
            else:
                result = test_func()
            
            if not result:
                all_passed = False
                print_error(f"{test_name} 测试失败")
            else:
                print_success(f"{test_name} 测试通过")
        except Exception as e:
            print_error(f"{test_name} 测试异常: {e}")
            import traceback
            traceback.print_exc()
            all_passed = False
    
    print_sep()
    if all_passed:
        print("🎉 所有端到端测试通过！")
    else:
        print("⚠️  部分测试未通过，请检查上述错误")
    print_sep()
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
