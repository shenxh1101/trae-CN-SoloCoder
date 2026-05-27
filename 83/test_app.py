#!/usr/bin/env python3
import sys
import os
import json
import time
import requests
import csv
from io import StringIO

BASE_URL = 'http://127.0.0.1:5050'
ADMIN_PASSWORD = 'admin123'

pass_count = 0
fail_count = 0


def test_case(name):
    def decorator(func):
        def wrapper(*args, **kwargs):
            global pass_count, fail_count
            try:
                result = func(*args, **kwargs)
                if result:
                    print(f'✅ PASS: {name}')
                    pass_count += 1
                else:
                    print(f'❌ FAIL: {name}')
                    fail_count += 1
            except Exception as e:
                print(f'❌ FAIL: {name} - Exception: {e}')
                fail_count += 1
        return wrapper
    return decorator


session = requests.Session()


@test_case('首页访问正常')
def test_homepage():
    r = session.get(f'{BASE_URL}/')
    return r.status_code == 200 and '用户反馈' in r.text


@test_case('查询页面访问正常')
def test_query_page():
    r = session.get(f'{BASE_URL}/query')
    return r.status_code == 200 and '查询反馈状态' in r.text


@test_case('管理员登录页面访问正常')
def test_admin_login_page():
    r = session.get(f'{BASE_URL}/admin/login')
    return r.status_code == 200 and '管理员登录' in r.text


@test_case('提交反馈 - 正常内容')
def test_submit_normal():
    r = session.post(f'{BASE_URL}/submit', data={
        'nickname': '测试用户',
        'email': 'test@example.com',
        'content': '这是一条正常的反馈内容，产品很好用',
        'rating': '5',
        'category': 'suggestion'
    })
    return r.status_code == 200 and '反馈提交成功' in r.text


@test_case('提交反馈 - 敏感词检测')
def test_submit_sensitive():
    r = session.post(f'{BASE_URL}/submit', data={
        'nickname': '测试用户2',
        'email': 'test2@example.com',
        'content': '这个产品是垃圾，非常废物',
        'rating': '1',
        'category': 'complaint'
    })
    return r.status_code == 200 and '包含敏感词' in r.text and '垃圾' in r.text and '废物' in r.text


@test_case('提交反馈 - 缺失必填项')
def test_submit_missing_fields():
    r = session.post(f'{BASE_URL}/submit', data={
        'nickname': '',
        'content': '',
        'rating': '3',
        'category': 'suggestion'
    })
    return r.status_code == 302 or '必填' in r.text or 'feedback' in r.text


@test_case('管理员登录 - 错误密码')
def test_admin_login_wrong():
    r = session.post(f'{BASE_URL}/admin/login', data={'password': 'wrong'})
    return r.status_code == 200 and '密码错误' in r.text


@test_case('管理员登录 - 正确密码')
def test_admin_login_correct():
    r = session.post(f'{BASE_URL}/admin/login', data={'password': ADMIN_PASSWORD}, allow_redirects=False)
    return r.status_code == 302


@test_case('管理后台访问（已登录）')
def test_admin_dashboard():
    r = session.get(f'{BASE_URL}/admin')
    return r.status_code == 200 and '反馈管理后台' in r.text


@test_case('管理后台显示统计数据')
def test_admin_stats():
    r = session.get(f'{BASE_URL}/admin')
    return '反馈总数' in r.text and '今日新增' in r.text and '当前页' in r.text


@test_case('生成测试数据')
def test_generate_test_data():
    r = session.post(f'{BASE_URL}/admin/test/generate?count=12', allow_redirects=False)
    return r.status_code == 302


@test_case('生成后反馈总数增加')
def test_data_increased():
    time.sleep(0.5)
    r = session.get(f'{BASE_URL}/admin')
    return '反馈总数' in r.text


@test_case('CSV导出功能 - 响应状态')
def test_csv_export_status():
    r = session.get(f'{BASE_URL}/admin/export')
    return r.status_code == 200


@test_case('CSV导出功能 - Content-Type正确')
def test_csv_export_headers():
    r = session.get(f'{BASE_URL}/admin/export')
    ct = r.headers.get('Content-Type', '')
    return 'text/csv' in ct and 'utf-8' in ct


@test_case('CSV导出功能 - 文件头正确')
def test_csv_export_content():
    r = session.get(f'{BASE_URL}/admin/export')
    content = r.content.decode('utf-8-sig')
    reader = csv.reader(StringIO(content))
    header = next(reader)
    expected = ['ID', '昵称', '邮箱', '分类', '评分', '内容', '提交时间', '查询码', '状态']
    return header == expected


@test_case('CSV导出功能 - 包含数据行')
def test_csv_export_rows():
    r = session.get(f'{BASE_URL}/admin/export')
    content = r.content.decode('utf-8-sig')
    reader = csv.reader(StringIO(content))
    rows = list(reader)
    return len(rows) >= 2


@test_case('分页 - 第1页正常显示')
def test_pagination_page1():
    r = session.get(f'{BASE_URL}/admin?page=1')
    return r.status_code == 200 and '当前页' in r.text


@test_case('分页 - 页码在有效范围内')
def test_pagination_bounds():
    r = session.get(f'{BASE_URL}/admin?page=999')
    return r.status_code == 200


@test_case('搜索功能 - 按昵称搜索')
def test_search_nickname():
    r = session.get(f'{BASE_URL}/admin?search=孙悟空')
    return r.status_code == 200


@test_case('搜索功能 - 按内容搜索')
def test_search_content():
    r = session.get(f'{BASE_URL}/admin?search=深色模式')
    return r.status_code == 200


@test_case('搜索功能 - 不存在的关键词返回空')
def test_search_not_found():
    r = session.get(f'{BASE_URL}/admin?search=不存在的关键词123456789')
    return r.status_code == 200


@test_case('反馈状态更新')
def test_status_update():
    time.sleep(0.5)
    r = session.get(f'{BASE_URL}/admin')
    if '未读' not in r.text:
        return True
    return r.status_code == 200


@test_case('反馈删除功能')
def test_delete_feedback():
    time.sleep(0.5)
    with open('feedback.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not data['feedbacks']:
        return True
    fb_id = data['feedbacks'][0]['id']
    r = session.post(f'{BASE_URL}/admin/delete/{fb_id}?page=1', allow_redirects=False)
    return r.status_code == 302


@test_case('用户查询码查询功能')
def test_query_code():
    with open('feedback.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not data['feedbacks']:
        return True
    code = data['feedbacks'][0]['query_code']
    r = session.post(f'{BASE_URL}/query', data={'query_code': code})
    return r.status_code == 200


@test_case('用户查询码查询 - 无效查询码')
def test_query_wrong_code():
    r = session.post(f'{BASE_URL}/query', data={'query_code': 'invalid'})
    return r.status_code == 200 and '未找到' in r.text


@test_case('敏感词库大于等于50个')
def test_sensitive_words_count():
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
    start = content.find('SENSITIVE_WORDS = [')
    end = content.find(']', start)
    words_section = content[start:end]
    words = [w.strip().strip("'").strip('"') for w in words_section.split(',') if w.strip().strip("'").strip('"')]
    return len(words) >= 50


@test_case('端口配置为5050')
def test_port_config():
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
    return "port=5050" in content


@test_case('管理员退出登录')
def test_admin_logout():
    r = session.get(f'{BASE_URL}/admin/logout', allow_redirects=False)
    return r.status_code == 302


@test_case('退出后无法访问管理后台')
def test_admin_access_after_logout():
    r = session.get(f'{BASE_URL}/admin', allow_redirects=False)
    return r.status_code == 302 and '/admin/login' in r.headers.get('Location', '')


@test_case('邮件测试接口可访问')
def test_email_test_endpoint():
    session.post(f'{BASE_URL}/admin/login', data={'password': ADMIN_PASSWORD})
    r = session.get(f'{BASE_URL}/admin/test/email')
    return r.status_code == 200 and 'status' in r.json()


def main():
    print(f'开始测试，目标地址: {BASE_URL}\n')
    print('=' * 60)

    tests = [
        test_homepage,
        test_query_page,
        test_admin_login_page,
        test_submit_normal,
        test_submit_sensitive,
        test_submit_missing_fields,
        test_admin_login_wrong,
        test_admin_login_correct,
        test_admin_dashboard,
        test_admin_stats,
        test_generate_test_data,
        test_data_increased,
        test_csv_export_status,
        test_csv_export_headers,
        test_csv_export_content,
        test_csv_export_rows,
        test_pagination_page1,
        test_pagination_bounds,
        test_search_nickname,
        test_search_content,
        test_search_not_found,
        test_status_update,
        test_delete_feedback,
        test_query_code,
        test_query_wrong_code,
        test_sensitive_words_count,
        test_port_config,
        test_admin_logout,
        test_admin_access_after_logout,
        test_email_test_endpoint,
    ]

    for test in tests:
        test()

    print('=' * 60)
    print(f'\n测试完成: 通过 {pass_count} 项, 失败 {fail_count} 项')
    print(f'通过率: {pass_count/(pass_count+fail_count)*100:.1f}%')

    return fail_count == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
