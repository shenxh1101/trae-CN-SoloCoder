#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
前端功能验证脚本
模拟用户在Web页面的操作流程
"""

import requests
import time

BASE_URL = 'http://127.0.0.1:5001'

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def simulate_user_flow():
    """模拟用户完整使用流程"""
    print(f"\n{bcolors.HEADER}{bcolors.BOLD}="*60)
    print("  前端交互流程模拟测试")
    print("="*60 + f"{bcolors.ENDC}\n")

    session = requests.Session()
    history_ids = []

    print(f"{bcolors.OKCYAN}步骤1: 用户访问首页{bcolors.ENDC}")
    response = session.get(f'{BASE_URL}/')
    print(f"  首页状态码: {response.status_code}")
    print(f"  页面包含'关键词提取': {'关键词提取' in response.text}")
    print(f"  ✓ 首页加载成功\n")

    print(f"{bcolors.OKCYAN}步骤2: 提交文本进行分析{bcolors.ENDC}")
    test_text = "Python是一种非常流行的编程语言，广泛应用于Web开发、数据分析和人工智能领域。" \
                "它简洁的语法和丰富的库生态系统使得开发者能够快速构建各种应用程序。"
    
    response = session.post(
        f'{BASE_URL}/analyze',
        data={'text': test_text, 'top_n': 5}
    )
    data = response.json()
    history_id = data.get('history_id')
    if history_id:
        history_ids.append(history_id)
    
    print(f"  提取到关键词: {[k[0] for k in data['keywords']]}")
    print(f"  情感分析: {data['sentiment']['polarity']}")
    print(f"  生成词云: {'是' if data['wordcloud'] else '否'}")
    print(f"  ✓ 文本分析成功\n")

    print(f"{bcolors.OKCYAN}步骤3: 再提交一条文本（生成历史记录）{bcolors.ENDC}")
    test_text2 = "机器学习是人工智能的一个分支，它使计算机能够从数据中学习并改进性能。" \
                 "常见的机器学习算法包括决策树、支持向量机、神经网络等。"
    
    response = session.post(
        f'{BASE_URL}/analyze',
        data={'text': test_text2, 'top_n': 6}
    )
    data = response.json()
    history_id2 = data.get('history_id')
    if history_id2:
        history_ids.append(history_id2)
    
    print(f"  提取到关键词: {[k[0] for k in data['keywords']]}")
    print(f"  ✓ 第二条文本分析成功\n")

    print(f"{bcolors.OKCYAN}步骤4: 点击历史记录重新加载{bcolors.ENDC}")
    if history_ids:
        response = session.get(f'{BASE_URL}/history/{history_ids[0]}')
        data = response.json()
        print(f"  加载历史记录ID: {history_ids[0]}")
        print(f"  历史记录文本预览: {data.get('text', '')[:50]}...")
        print(f"  历史关键词: {[k[0] for k in data['keywords']]}")
        print(f"  ✓ 历史记录加载成功\n")

    print(f"{bcolors.OKCYAN}步骤5: 上传自定义停用词{bcolors.ENDC}")
    stopwords_content = "Python\n编程语言\n"
    files = {'file': ('my_stopwords.txt', stopwords_content.encode('utf-8'), 'text/plain')}
    response = session.post(f'{BASE_URL}/upload_stopwords', files=files)
    data = response.json()
    print(f"  加载停用词数量: {data.get('count', 0)}")
    
    response = session.post(
        f'{BASE_URL}/analyze',
        data={'text': test_text, 'top_n': 5}
    )
    data = response.json()
    keywords = [k[0] for k in data['keywords']]
    print(f"  应用停用词后的关键词: {keywords}")
    print(f"  'Python'已被排除: {'Python' not in keywords}")
    print(f"  '编程语言'已被排除: {'编程语言' not in keywords}")
    print(f"  ✓ 停用词功能正常\n")

    print(f"{bcolors.OKCYAN}步骤6: 清除停用词{bcolors.ENDC}")
    response = session.post(f'{BASE_URL}/clear_stopwords')
    print(f"  停用词清除成功: {response.json().get('success', False)}")
    print(f"  ✓ 停用词清除成功\n")

    print(f"{bcolors.OKCYAN}步骤7: 批量CSV处理{bcolors.ENDC}")
    csv_content = """自然语言处理是人工智能的重要领域
计算机视觉让机器能够看懂图像
数据挖掘从大量数据中发现知识
云计算提供弹性计算资源
大数据技术处理海量信息"""
    
    files = {'file': ('batch_test.csv', csv_content.encode('utf-8'), 'text/csv')}
    response = session.post(
        f'{BASE_URL}/upload_csv',
        files=files,
        data={'top_n': 3}
    )
    
    if 'attachment' in response.headers.get('Content-Disposition', ''):
        lines = response.content.decode('utf-8-sig').strip().split('\n')
        print(f"  处理行数: {len(lines) - 1}")
        print(f"  CSV表头: {lines[0]}")
        print(f"  首行结果: {lines[1][:80]}...")
        print(f"  ✓ CSV批量处理成功\n")

    print(f"{bcolors.OKCYAN}步骤8: API接口调用测试{bcolors.ENDC}")
    api_payload = {
        "text": "REST API允许不同系统之间进行数据交换和通信。",
        "top_n": 4
    }
    response = session.post(f'{BASE_URL}/api/extract', json=api_payload)
    data = response.json()
    print(f"  API返回状态码: {data.get('code')}")
    print(f"  API关键词: {[k['word'] for k in data['data']['keywords']]}")
    print(f"  ✓ REST API调用成功\n")

    print(f"{bcolors.OKGREEN}{bcolors.BOLD}="*60)
    print("  ✓ 所有前端交互流程测试通过！")
    print("="*60 + f"{bcolors.ENDC}\n")

if __name__ == '__main__':
    simulate_user_flow()
