#!/usr/bin/env python3
import requests
import json
import os
import sys

BASE_URL = 'http://127.0.0.1:5001'

def test_batch_compare():
    print('\n' + '='*60)
    print('=== 测试1: 批量比对功能 ===')
    print('='*60)
    
    url = f'{BASE_URL}/api/batch-compare'
    
    files = [
        ('base_contract', ('test_contract_a.txt', open('test_contract_a.txt', 'rb'))),
        ('compare_files', ('contract_b.txt', open('test_batch/contract_b.txt', 'rb'))),
        ('compare_files', ('contract_c.txt', open('test_batch/contract_c.txt', 'rb'))),
    ]
    
    data = {
        'threshold': '0.7',
        'ignore_patterns': r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?' + '\n' + r'￥\s?\d+'
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        result = response.json()
        
        print('Success:', result.get('success'))
        
        if result.get('success'):
            r = result['result']
            print(f'基准合同: {r["base_contract"]}')
            print(f'比对数量: {r["total_compared"]}')
            print(f'成功数量: {r["success_count"]}')
            print(f'失败数量: {r["error_count"]}')
            print(f'平均相似度: {r["average_similarity"]:.1%}')
            
            print('\n各合同结果:')
            for cr in r['results']:
                if 'error' not in cr:
                    print(f'  ✅ {cr["contract_name"]}: {cr["overall_similarity"]:.1%}')
                    print(f'     新增:{cr["stats"]["added"]}, 删除:{cr["stats"]["deleted"]}, 修改:{cr["stats"]["modified"]}, 未变化:{cr["stats"]["unchanged"]}')
                    if cr.get('detail_file'):
                        print(f'     详情链接: {cr["detail_file"]["download_url"]}')
                else:
                    print(f'  ❌ {cr["contract_name"]}: {cr["error"]}')
            
            print(f'\n汇总报告: {r.get("summary_file", {}).get("download_url")}')
            print('✅ 批量比对测试通过!')
            return True
        else:
            print('❌ 失败:', result.get('error'))
            if result.get('traceback'):
                print('Traceback:', result['traceback'])
            return False
    except Exception as e:
        print('❌ 异常:', str(e))
        return False

def test_ignore_patterns():
    print('\n' + '='*60)
    print('=== 测试2: 自定义忽略规则 ===')
    print('='*60)
    
    url = f'{BASE_URL}/api/compare'
    
    # 不使用忽略规则
    print('\n2.1 不使用忽略规则:')
    files1 = {
        'contract_a': open('test_contract_a.txt', 'rb'),
        'contract_b': open('test_contract_b.txt', 'rb'),
    }
    response1 = requests.post(url, files=files1, data={'threshold': '0.7'})
    result1 = response1.json()
    
    if result1.get('success'):
        sim1 = result1['result']['overall_similarity']
        modified1 = result1['result']['stats']['modified']
        print(f'  相似度: {sim1:.1%}, 修改条款: {modified1}')
    
    # 使用忽略规则
    print('\n2.2 使用忽略规则 (日期+金额):')
    files2 = {
        'contract_a': open('test_contract_a.txt', 'rb'),
        'contract_b': open('test_contract_b.txt', 'rb'),
    }
    data2 = {
        'threshold': '0.7',
        'ignore_patterns': '\n'.join([
            r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?',
            r'￥\s?\d+(?:,\d+)*(?:\.\d+)?',
            r'\d+(?:,\d+)*(?:\.\d+)?\s*元'
        ])
    }
    
    response2 = requests.post(url, files=files2, data=data2)
    result2 = response2.json()
    
    if result2.get('success'):
        sim2 = result2['result']['overall_similarity']
        modified2 = result2['result']['stats']['modified']
        print(f'  相似度: {sim2:.1%}, 修改条款: {modified2}')
        
        if sim2 > sim1:
            print(f'  ✅ 忽略规则生效! 相似度从 {sim1:.1%} 提升到 {sim2:.1%}')
            return True
        else:
            print(f'  ⚠️  相似度变化不大，可能需要调整忽略规则')
            return True
    
    print('❌ 测试失败')
    return False

def test_export_functions():
    print('\n' + '='*60)
    print('=== 测试3: 导出功能 ===')
    print('='*60)
    
    # 先进行一次比对
    compare_url = f'{BASE_URL}/api/compare'
    files = {
        'contract_a': open('test_contract_a.txt', 'rb'),
        'contract_b': open('test_contract_b.txt', 'rb'),
    }
    response = requests.post(compare_url, files=files, data={'threshold': '0.7'})
    compare_result = response.json()
    
    if not compare_result.get('success'):
        print('❌ 比对失败，无法测试导出')
        return False
    
    export_data = {
        'result': compare_result['result'],
        'contract_a_name': compare_result['contract_a_name'],
        'contract_b_name': compare_result['contract_b_name'],
        'focus_categories': ['违约责任', '保密条款']
    }
    
    # 测试HTML导出
    print('\n3.1 测试HTML导出:')
    html_url = f'{BASE_URL}/api/export/html'
    response = requests.post(html_url, json=export_data)
    result = response.json()
    
    if result.get('success'):
        print(f'  ✅ 导出成功: {result["download_url"]}')
        
        # 验证文件可以访问
        file_url = f'{BASE_URL}{result["download_url"]}'
        head = requests.head(file_url)
        if head.status_code == 200:
            print(f'  ✅ 文件可正常访问')
        else:
            print(f'  ❌ 文件无法访问: {head.status_code}')
    else:
        print('❌ HTML导出失败:', result.get('error'))
        return False
    
    # 测试Excel导出
    print('\n3.2 测试Excel导出:')
    excel_url = f'{BASE_URL}/api/export/excel'
    response = requests.post(excel_url, json=export_data)
    result = response.json()
    
    if result.get('success'):
        print(f'  ✅ 导出成功: {result["download_url"]}')
        
        file_url = f'{BASE_URL}{result["download_url"]}'
        head = requests.head(file_url)
        if head.status_code == 200:
            print(f'  ✅ 文件可正常访问')
            return True
        else:
            print(f'  ❌ 文件无法访问: {head.status_code}')
            return False
    else:
        print('❌ Excel导出失败:', result.get('error'))
        return False

def test_template_functions():
    print('\n' + '='*60)
    print('=== 测试4: 模板比对功能 ===')
    print('='*60)
    
    # 先获取模板列表
    list_url = f'{BASE_URL}/api/templates'
    response = requests.get(list_url)
    result = response.json()
    
    if not result.get('success'):
        print('❌ 获取模板列表失败')
        return False
    
    templates = result['templates']
    print(f'当前模板数量: {len(templates)}')
    
    if len(templates) == 0:
        # 先保存一个模板
        print('4.1 保存模板:')
        save_url = f'{BASE_URL}/api/templates'
        files = {
            'file': ('test_contract_a.txt', open('test_contract_a.txt', 'rb')),
        }
        data = {
            'name': '测试模板-标准租房合同',
            'description': '用于测试的标准租房合同模板'
        }
        response = requests.post(save_url, files=files, data=data)
        result = response.json()
        
        if result.get('success'):
            print(f'  ✅ 模板保存成功: {result["template"]["name"]}')
            template_id = result['template']['id']
        else:
            print('❌ 模板保存失败:', result.get('error'))
            return False
    else:
        template_id = templates[0]['id']
        print(f'使用现有模板: {templates[0]["name"]}')
    
    # 测试获取模板内容
    print('\n4.2 获取模板内容:')
    content_url = f'{BASE_URL}/api/templates/{template_id}/content'
    response = requests.get(content_url)
    result = response.json()
    
    if result.get('success'):
        content = result['content']
        print(f'  ✅ 获取成功，内容长度: {len(content)} 字符')
    else:
        print('❌ 获取模板内容失败:', result.get('error'))
        return False
    
    # 测试使用模板比对
    print('\n4.3 使用模板比对:')
    compare_url = f'{BASE_URL}/api/compare/templates'
    files = {
        'contract_b': ('test_contract_b.txt', open('test_contract_b.txt', 'rb')),
    }
    data = {
        'template_a': template_id,
        'threshold': '0.7'
    }
    response = requests.post(compare_url, files=files, data=data)
    result = response.json()
    
    if result.get('success'):
        print(f'  ✅ 比对成功!')
        print(f'     合同A: {result["contract_a_name"]}')
        print(f'     合同B: {result["contract_b_name"]}')
        print(f'     相似度: {result["result"]["overall_similarity"]:.1%}')
        return True
    else:
        print('❌ 模板比对失败:', result.get('error'))
        return False

def test_generate_revised():
    print('\n' + '='*60)
    print('=== 测试5: 生成修订版合同 ===')
    print('='*60)
    
    # 先进行比对
    compare_url = f'{BASE_URL}/api/compare'
    files = {
        'contract_a': open('test_contract_a.txt', 'rb'),
        'contract_b': open('test_contract_b.txt', 'rb'),
    }
    response = requests.post(compare_url, files=files, data={'threshold': '0.7'})
    compare_result = response.json()
    
    if not compare_result.get('success'):
        print('❌ 比对失败')
        return False
    
    # 测试生成修订版
    print('\n5.1 生成修订版合同 (prefer_new策略):')
    revise_url = f'{BASE_URL}/api/generate-revised'
    data = {
        'text_a': open('test_contract_a.txt').read(),
        'diff_results': compare_result['result']['diff_results'],
        'merge_strategy': 'prefer_new',
        'format': 'txt'
    }
    response = requests.post(revise_url, json=data)
    result = response.json()
    
    if result.get('success'):
        print(f'  ✅ 生成成功!')
        print(f'     修订版长度: {len(result["revised_text"])} 字符')
        print(f'     下载链接: {result["download_url"]}')
        
        # 验证文件
        file_url = f'{BASE_URL}{result["download_url"]}'
        head = requests.head(file_url)
        if head.status_code == 200:
            print(f'  ✅ 文件可正常访问')
            return True
        else:
            print(f'  ❌ 文件无法访问: {head.status_code}')
            return False
    else:
        print('❌ 生成失败:', result.get('error'))
        return False

def test_api_routes():
    print('\n' + '='*60)
    print('=== 测试6: API路由可用性 ===')
    print('='*60)
    
    routes = [
        ('/api/categories', 'GET', '获取条款类别'),
        ('/api/ignore-patterns', 'GET', '获取默认忽略规则'),
        ('/api/templates', 'GET', '获取模板列表'),
        ('/', 'GET', '首页'),
        ('/batch', 'GET', '批量比对页面'),
        ('/templates', 'GET', '模板管理页面'),
    ]
    
    all_ok = True
    for path, method, desc in routes:
        url = f'{BASE_URL}{path}'
        try:
            if method == 'GET':
                response = requests.get(url)
            else:
                response = requests.post(url)
            
            if response.status_code == 200:
                print(f'  ✅ {desc}: {path} [{response.status_code}]')
            else:
                print(f'  ❌ {desc}: {path} [{response.status_code}]')
                all_ok = False
        except Exception as e:
            print(f'  ❌ {desc}: {path} - {str(e)}')
            all_ok = False
    
    return all_ok

def main():
    print('🚀 开始全面功能测试')
    print(f'服务地址: {BASE_URL}')
    
    results = []
    
    try:
        results.append(('API路由', test_api_routes()))
        results.append(('批量比对', test_batch_compare()))
        results.append(('忽略规则', test_ignore_patterns()))
        results.append(('导出功能', test_export_functions()))
        results.append(('模板功能', test_template_functions()))
        results.append(('生成修订版', test_generate_revised()))
    except Exception as e:
        print(f'\n❌ 测试过程中发生异常: {str(e)}')
        import traceback
        traceback.print_exc()
    
    print('\n' + '='*60)
    print('=== 测试结果汇总 ===')
    print('='*60)
    
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for name, ok in results:
        status = '✅ 通过' if ok else '❌ 失败'
        print(f'  {name}: {status}')
    
    print(f'\n总计: {passed}/{total} 项测试通过')
    
    if passed == total:
        print('\n🎉 所有测试通过!')
        return 0
    else:
        print(f'\n⚠️  有 {total - passed} 项测试失败')
        return 1

if __name__ == '__main__':
    sys.exit(main())
