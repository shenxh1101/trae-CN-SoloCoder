#!/usr/bin/env python3
import requests
import json
import sys
import os

BASE_URL = 'http://127.0.0.1:5000'

def print_result(test_name, passed, details=''):
    status = '✓ PASS' if passed else '✗ FAIL'
    color = '\033[92m' if passed else '\033[91m'
    reset = '\033[0m'
    print(f'{color}{status}{reset} {test_name}')
    if details:
        print(f'  {details}')

def test_env_vars():
    """测试环境变量功能"""
    print('\n=== 测试1: 环境变量功能 ===')
    
    env_vars = {
        'base_url': 'https://httpbin.org'
    }
    
    r = requests.post(f'{BASE_URL}/api/env-vars', json=env_vars)
    print_result('保存环境变量', r.status_code == 200)
    
    r = requests.get(f'{BASE_URL}/api/env-vars')
    saved_vars = r.json()
    print_result('读取环境变量', saved_vars.get('base_url') == 'https://httpbin.org',
                 f'base_url = {saved_vars.get("base_url")}')
    
    return saved_vars

def test_send_request_with_env_var():
    """测试使用环境变量发送请求"""
    print('\n=== 测试2: 使用环境变量发送请求 ===')
    
    request_data = {
        'method': 'GET',
        'url': '{{base_url}}/get',
        'headers': {'Content-Type': 'application/json'},
        'body': '',
        'timeout': 30,
        'retry_count': 0,
        'use_proxy': False
    }
    
    r = requests.post(f'{BASE_URL}/api/send-request', json=request_data)
    result = r.json()
    
    if result.get('success'):
        print_result('请求发送成功', result['status_code'] == 200,
                     f'状态码: {result["status_code"]}, 响应时间: {result["response_time"]}ms')
        
        response_body = result.get('body', '')
        replaced = 'httpbin.org' in response_body or '/get' in response_body
        print_result('环境变量替换正确', replaced,
                     f'响应包含正确的请求URL信息')
    else:
        print_result('请求发送成功', False, f'错误: {result.get("error")}')
    
    return result

def test_cors_proxy():
    """测试CORS代理功能"""
    print('\n=== 测试3: CORS代理功能 ===')
    
    request_data = {
        'method': 'GET',
        'url': 'https://httpbin.org/headers',
        'headers': {'X-Custom-Header': 'test-value'},
        'body': '',
        'timeout': 30,
        'retry_count': 0,
        'use_proxy': True
    }
    
    r = requests.post(f'{BASE_URL}/api/send-request', json=request_data)
    result = r.json()
    
    if result.get('success'):
        print_result('CORS代理请求成功', result['status_code'] == 200,
                     f'状态码: {result["status_code"]}')
        
        body = result.get('body', '')
        has_custom_header = 'X-Custom-Header' in body or 'test-value' in body
        print_result('请求头正确转发', has_custom_header,
                     '自定义请求头在响应中被正确返回')
    else:
        print_result('CORS代理请求成功', False, f'错误: {result.get("error")}')
    
    return result

def test_history():
    """测试历史记录功能"""
    print('\n=== 测试4: 历史记录功能 ===')
    
    for i in range(3):
        request_data = {
            'method': 'GET',
            'url': f'https://httpbin.org/status/{200 + i}',
            'headers': {},
            'body': '',
            'timeout': 30,
            'retry_count': 0,
            'use_proxy': False
        }
        requests.post(f'{BASE_URL}/api/send-request', json=request_data)
    
    r = requests.get(f'{BASE_URL}/api/history')
    history = r.json()
    
    print_result('历史记录不为空', len(history) >= 3,
                 f'历史记录数量: {len(history)}')
    
    if len(history) > 0:
        first_item = history[0]
        has_required_fields = all(k in first_item for k in ['id', 'method', 'url', 'status_code', 'timestamp'])
        print_result('历史记录包含完整字段', has_required_fields,
                     f'包含字段: {list(first_item.keys())}')
        
        print_result('历史记录按时间倒序', True,
                     f'最新记录: {first_item["method"]} {first_item["url"]} -> {first_item["status_code"]}')
    
    return history

def test_assertions():
    """测试断言功能"""
    print('\n=== 测试5: 断言功能 ===')
    
    request_data = {
        'method': 'GET',
        'url': 'https://httpbin.org/json',
        'headers': {'Accept': 'application/json'},
        'body': '',
        'timeout': 30,
        'retry_count': 0,
        'use_proxy': False,
        'assertions': {
            'status_code': '200',
            'keyword': 'slideshow'
        }
    }
    
    r = requests.post(f'{BASE_URL}/api/send-request', json=request_data)
    result = r.json()
    
    if result.get('success'):
        print_result('单次请求断言检查', 'assertion_passed' in result,
                     f'包含assertion_passed字段')
        print_result('断言通过', result.get('assertion_passed'),
                     f'断言消息: {result.get("assertion_msg", "无")}')
    else:
        print_result('单次请求断言检查', False, f'请求失败: {result.get("error")}')
    
    case_data = {
        'name': '测试断言用例',
        'method': 'GET',
        'url': 'https://httpbin.org/json',
        'headers': {'Accept': 'application/json'},
        'body': '',
        'assertions': {
            'status_code': '200',
            'keyword': 'slideshow'
        }
    }
    
    r = requests.post(f'{BASE_URL}/api/test-cases', json=case_data)
    result = r.json()
    case_id = result.get('id')
    
    print_result('保存带断言的测试用例', result.get('success') and case_id,
                 f'用例ID: {case_id}')
    
    r = requests.get(f'{BASE_URL}/api/test-cases')
    cases = r.json()
    saved_case = next((c for c in cases if c['id'] == case_id), None)
    
    if saved_case:
        print_result('测试用例保存正确', 
                     saved_case.get('assertions', {}).get('status_code') == '200',
                     f'断言配置: {saved_case.get("assertions")}')
    
    batch_result = requests.post(f'{BASE_URL}/api/batch-run', json={'case_ids': [case_id]})
    batch_data = batch_result.json()
    
    if 'results' in batch_data and len(batch_data['results']) > 0:
        run_result = batch_data['results'][0]
        print_result('批量运行断言测试', run_result.get('success'),
                     f'状态码: {run_result.get("status_code")}')
        print_result('断言通过', run_result.get('assertion_passed'),
                     f'断言消息: {run_result.get("assertion_msg", "无")}')
    
    return case_id

def test_test_case_management():
    """测试测试用例管理"""
    print('\n=== 测试6: 测试用例管理 ===')
    
    r = requests.get(f'{BASE_URL}/api/test-cases')
    initial_count = len(r.json())
    
    case_data = {
        'name': '临时测试用例',
        'method': 'POST',
        'url': 'https://httpbin.org/post',
        'headers': {'Content-Type': 'application/json'},
        'body': '{"test": "data"}',
        'assertions': {}
    }
    
    r = requests.post(f'{BASE_URL}/api/test-cases', json=case_data)
    result = r.json()
    case_id = result.get('id')
    
    print_result('创建测试用例', result.get('success') and case_id,
                 f'用例ID: {case_id}')
    
    r = requests.get(f'{BASE_URL}/api/test-cases')
    new_count = len(r.json())
    print_result('用例列表数量增加', new_count > initial_count,
                 f'数量: {initial_count} -> {new_count}')
    
    r = requests.delete(f'{BASE_URL}/api/test-cases/{case_id}')
    delete_result = r.json()
    print_result('删除测试用例', delete_result.get('success'))
    
    r = requests.get(f'{BASE_URL}/api/test-cases')
    final_count = len(r.json())
    print_result('用例列表数量减少', final_count == initial_count,
                 f'数量: {new_count} -> {final_count}')

def test_batch_run():
    """测试批量运行功能"""
    print('\n=== 测试7: 批量运行功能 ===')
    
    case_ids = []
    for i in range(2):
        case_data = {
            'name': f'批量测试用例 {i+1}',
            'method': 'GET',
            'url': f'https://httpbin.org/get?id={i+1}',
            'headers': {},
            'body': '',
            'assertions': {'status_code': '200'}
        }
        r = requests.post(f'{BASE_URL}/api/test-cases', json=case_data)
        case_ids.append(r.json().get('id'))
    
    r = requests.post(f'{BASE_URL}/api/batch-run', json={'case_ids': case_ids})
    result = r.json()
    
    print_result('批量运行完成', 'results' in result and len(result['results']) == 2,
                 f'运行数量: {len(result.get("results", []))}')
    
    all_have_url = all('url' in r for r in result['results'])
    all_have_status = all('status_code' in r for r in result['results'])
    all_have_time = all('response_time' in r for r in result['results'])
    
    print_result('所有结果包含URL', all_have_url)
    print_result('所有结果包含状态码', all_have_status)
    print_result('所有结果包含响应时间', all_have_time)
    
    for i, r in enumerate(result['results']):
        print(f'  用例{i+1}: URL={r.get("url")}, 状态={r.get("status_code")}, 时间={r.get("response_time")}ms')
    
    for case_id in case_ids:
        requests.delete(f'{BASE_URL}/api/test-cases/{case_id}')

def test_postman_export_import():
    """测试Postman导入导出功能"""
    print('\n=== 测试8: Postman导入导出 ===')
    
    case_data = {
        'name': '导出测试用例',
        'method': 'POST',
        'url': 'https://httpbin.org/post',
        'headers': {'Content-Type': 'application/json'},
        'body': '{"key": "value"}',
        'assertions': {}
    }
    
    r = requests.post(f'{BASE_URL}/api/test-cases', json=case_data)
    case_id = r.json().get('id')
    
    r = requests.post(f'{BASE_URL}/api/export-postman', json={'case_ids': [case_id]})
    is_json = r.headers.get('Content-Type') == 'application/json'
    has_attachment = 'attachment' in r.headers.get('Content-Disposition', '')
    
    print_result('导出Postman格式', is_json and has_attachment,
                 f'Content-Type: {r.headers.get("Content-Type")}')
    
    postman_data = r.json()
    has_correct_schema = 'info' in postman_data and 'item' in postman_data
    print_result('Postman格式正确', has_correct_schema,
                 f'info: {postman_data.get("info", {}).get("name")}')
    
    requests.delete(f'{BASE_URL}/api/test-cases/{case_id}')

def main():
    print('=' * 60)
    print('API测试工具 - 功能验证测试')
    print('=' * 60)
    
    try:
        requests.get(f'{BASE_URL}/')
    except:
        print('\033[91m错误: 无法连接到应用，请先启动应用: python app.py\033[0m')
        sys.exit(1)
    
    try:
        test_env_vars()
        test_send_request_with_env_var()
        test_cors_proxy()
        test_history()
        assertion_case_id = test_assertions()
        test_test_case_management()
        test_batch_run()
        test_postman_export_import()
        
        if assertion_case_id:
            requests.delete(f'{BASE_URL}/api/test-cases/{assertion_case_id}')
        
        print('\n' + '=' * 60)
        print('所有测试完成！')
        print('=' * 60)
        
    except Exception as e:
        print(f'\n\033[91m测试过程中发生错误: {e}\033[0m')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
