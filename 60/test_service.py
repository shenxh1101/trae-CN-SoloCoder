#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
关键词提取服务 - 完整测试脚本
测试所有功能模块的正确性和可用性
"""

import os
import sys
import json
import time
import requests
import csv
import io

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
    UNDERLINE = '\033[4m'

def print_test(name, passed, details=""):
    if passed:
        print(f"{bcolors.OKGREEN}✓ PASS{bcolors.ENDC}: {name}")
    else:
        print(f"{bcolors.FAIL}✗ FAIL{bcolors.ENDC}: {name}")
        if details:
            print(f"   {bcolors.WARNING}{details}{bcolors.ENDC}")

class KeywordExtractionTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def run(self):
        print(f"\n{bcolors.HEADER}{bcolors.BOLD}="*60)
        print("  关键词提取服务 - 完整测试套件")
        print("="*60 + f"{bcolors.ENDC}\n")

        tests = [
            ("1. 服务可用性测试", self.test_server_alive),
            ("2. API单条提取测试", self.test_api_extract),
            ("3. API批量提取测试", self.test_api_batch_extract),
            ("4. 文本分析接口测试", self.test_analyze),
            ("5. CSV批量上传下载测试", self.test_csv_upload),
            ("6. TXT文件上传测试", self.test_txt_upload),
            ("7. 历史记录功能测试", self.test_history),
            ("8. 停用词上传测试", self.test_stopwords),
            ("9. 词云生成与下载测试", self.test_wordcloud),
            ("10. 错误处理测试", self.test_error_handling),
            ("11. 参数验证测试", self.test_param_validation),
        ]

        for test_name, test_func in tests:
            print(f"\n{bcolors.BOLD}{test_name}{bcolors.ENDC}")
            print("-" * 40)
            try:
                test_func()
            except Exception as e:
                print_test(test_name, False, f"异常: {str(e)}")
                self.failed += 1

        self.print_summary()

    def test_server_alive(self):
        """测试服务是否正常运行"""
        try:
            response = requests.get(f'{BASE_URL}/', timeout=5)
            if response.status_code == 200:
                print_test("首页访问", True)
                self.passed += 1
            else:
                print_test("首页访问", False, f"状态码: {response.status_code}")
                self.failed += 1
        except requests.exceptions.RequestException as e:
            print_test("首页访问", False, f"连接失败: {e}")
            self.failed += 1

    def test_api_extract(self):
        """测试单条关键词提取API"""
        test_cases = [
            {
                "text": "人工智能是计算机科学的一个分支，它研究如何使计算机模拟人类的智能行为。",
                "top_n": 5,
                "expect": "返回5个关键词"
            },
            {
                "text": "Python是一种高级编程语言，广泛应用于数据分析和人工智能领域。",
                "top_n": 3,
                "expect": "返回3个关键词"
            }
        ]

        for i, case in enumerate(test_cases):
            try:
                response = requests.post(
                    f'{BASE_URL}/api/extract',
                    json=case,
                    timeout=10
                )
                data = response.json()
                
                if data.get('code') == 200 and 'data' in data:
                    keywords = data['data'].get('keywords', [])
                    stats = data['data'].get('stats', {})
                    sentiment = data['data'].get('sentiment', {})
                    
                    checks = [
                        (len(keywords) == case['top_n'], f"关键词数量: {len(keywords)}/{case['top_n']}"),
                        ('char_count' in stats, "包含字数统计"),
                        ('polarity' in sentiment, "包含情感分析"),
                    ]
                    
                    all_passed = all(check[0] for check in checks)
                    if all_passed:
                        print_test(f"用例{i+1}: {case['expect']}", True)
                        self.passed += 1
                    else:
                        failures = [c[1] for c in checks if not c[0]]
                        print_test(f"用例{i+1}", False, "; ".join(failures))
                        self.failed += 1
                else:
                    print_test(f"用例{i+1}", False, f"API返回错误: {data}")
                    self.failed += 1
            except Exception as e:
                print_test(f"用例{i+1}", False, f"请求异常: {e}")
                self.failed += 1

    def test_api_batch_extract(self):
        """测试批量关键词提取API"""
        payload = {
            "texts": [
                "机器学习是人工智能的核心技术之一。",
                "深度学习使用神经网络进行特征学习。",
                "自然语言处理让计算机能够理解人类语言。"
            ],
            "top_n": 3
        }

        try:
            response = requests.post(
                f'{BASE_URL}/api/batch_extract',
                json=payload,
                timeout=10
            )
            data = response.json()
            
            if data.get('code') == 200 and len(data.get('data', [])) == 3:
                all_have_keywords = all('keywords' in item for item in data['data'])
                if all_have_keywords:
                    print_test("批量提取API", True, f"成功处理 {len(data['data'])} 条文本")
                    self.passed += 1
                else:
                    print_test("批量提取API", False, "部分结果缺少关键词")
                    self.failed += 1
            else:
                print_test("批量提取API", False, f"返回数据格式错误: {data}")
                self.failed += 1
        except Exception as e:
            print_test("批量提取API", False, f"请求异常: {e}")
            self.failed += 1

    def test_analyze(self):
        """测试Web表单分析接口"""
        test_text = "数据科学是一个跨学科领域，它使用科学方法从数据中提取知识。"
        
        try:
            response = requests.post(
                f'{BASE_URL}/analyze',
                data={'text': test_text, 'top_n': 5},
                timeout=10
            )
            data = response.json()
            
            required_fields = ['keywords', 'stats', 'sentiment']
            has_all_fields = all(field in data for field in required_fields)
            
            if has_all_fields:
                wordcloud = data.get('wordcloud')
                history_id = data.get('history_id')
                
                info = []
                if wordcloud:
                    info.append(f"生成词云: {wordcloud}")
                if history_id is not None:
                    info.append(f"历史记录ID: {history_id}")
                
                print_test("文本分析接口", True, "; ".join(info) if info else "成功")
                self.passed += 1
            else:
                missing = [f for f in required_fields if f not in data]
                print_test("文本分析接口", False, f"缺少字段: {', '.join(missing)}")
                self.failed += 1
        except Exception as e:
            print_test("文本分析接口", False, f"请求异常: {e}")
            self.failed += 1

    def test_csv_upload(self):
        """测试CSV批量上传下载功能"""
        csv_content = """机器学习是人工智能的核心技术
Python编程语言非常适合数据分析
云计算提供了强大的计算能力
区块链是分布式数据存储技术
物联网连接了各种智能设备"""

        try:
            files = {'file': ('test.csv', csv_content.encode('utf-8'), 'text/csv')}
            data = {'top_n': 3}
            
            response = requests.post(
                f'{BASE_URL}/upload_csv',
                files=files,
                data=data,
                timeout=15
            )
            
            content_disposition = response.headers.get('Content-Disposition', '')
            
            if 'attachment' in content_disposition and 'keywords_result.csv' in content_disposition:
                content = response.content.decode('utf-8-sig')
                lines = content.strip().split('\n')
                
                has_header = lines[0].startswith('序号')
                has_data = len(lines) >= 5
                
                if has_header and has_data:
                    print_test("CSV批量上传下载", True, f"返回 {len(lines)-1} 条结果")
                    
                    print(f"   {bcolors.OKCYAN}CSV内容预览:{bcolors.ENDC}")
                    for line in lines[:3]:
                        print(f"   {line[:80]}...")
                    
                    self.passed += 1
                else:
                    print_test("CSV批量上传下载", False, f"CSV格式不正确，行数: {len(lines)}")
                    self.failed += 1
            else:
                print_test("CSV批量上传下载", False, f"响应不是文件下载: {response.headers}")
                self.failed += 1
        except Exception as e:
            print_test("CSV批量上传下载", False, f"请求异常: {e}")
            self.failed += 1

    def test_txt_upload(self):
        """测试TXT文件上传功能"""
        txt_content = "这是一个测试文本文件。它包含了一些关于人工智能和机器学习的内容。我们希望能够正确提取出关键词。"
        
        try:
            files = {'file': ('test.txt', txt_content.encode('utf-8'), 'text/plain')}
            data = {'top_n': 5}
            
            response = requests.post(
                f'{BASE_URL}/upload_txt',
                files=files,
                data=data,
                timeout=10
            )
            data = response.json()
            
            if 'keywords' in data and len(data['keywords']) > 0:
                print_test("TXT文件上传", True, f"提取到 {len(data['keywords'])} 个关键词")
                self.passed += 1
            else:
                print_test("TXT文件上传", False, "未提取到关键词或返回格式错误")
                self.failed += 1
        except Exception as e:
            print_test("TXT文件上传", False, f"请求异常: {e}")
            self.failed += 1

    def test_history(self):
        """测试历史记录功能"""
        test_text = f"历史记录测试文本 {time.time()}"
        
        try:
            response = requests.post(
                f'{BASE_URL}/analyze',
                data={'text': test_text, 'top_n': 3},
                timeout=10
            )
            data = response.json()
            
            history_id = data.get('history_id')
            
            if history_id is not None:
                time.sleep(0.5)
                
                history_response = requests.get(
                    f'{BASE_URL}/history/{history_id}',
                    timeout=5
                )
                history_data = history_response.json()
                
                if 'full_text' in history_data and 'keywords' in history_data:
                    print_test("历史记录查询", True, f"成功加载历史记录 {history_id}")
                    self.passed += 1
                else:
                    print_test("历史记录查询", False, "历史记录数据不完整")
                    self.failed += 1
            else:
                print_test("历史记录查询", False, "未获取到history_id")
                self.failed += 1
        except Exception as e:
            print_test("历史记录查询", False, f"请求异常: {e}")
            self.failed += 1

    def test_stopwords(self):
        """测试自定义停用词功能"""
        stopwords_content = """人工智能
机器学习
数据
"""
        try:
            files = {'file': ('stopwords.txt', stopwords_content.encode('utf-8'), 'text/plain')}
            
            response = requests.post(
                f'{BASE_URL}/upload_stopwords',
                files=files,
                timeout=10
            )
            data = response.json()
            
            if data.get('success') and data.get('count') == 3:
                print_test("停用词上传", True, f"成功加载 {data['count']} 个停用词")
                self.passed += 1
            else:
                print_test("停用词上传", False, f"返回结果: {data}")
                self.failed += 1
            
            test_text = "人工智能和机器学习是数据科学的重要组成部分。"
            response2 = requests.post(
                f'{BASE_URL}/analyze',
                data={'text': test_text, 'top_n': 5},
                timeout=10
            )
            data2 = response2.json()
            keywords = [k[0] for k in data2.get('keywords', [])]
            
            custom_words = ['人工智能', '机器学习', '数据']
            excluded = all(w not in keywords for w in custom_words)
            
            if excluded:
                print_test("停用词生效验证", True, "自定义停用词已正确排除")
                self.passed += 1
            else:
                present = [w for w in custom_words if w in keywords]
                print_test("停用词生效验证", False, f"停用词未排除: {present}")
                self.failed += 1
            
            clear_response = requests.post(f'{BASE_URL}/clear_stopwords', timeout=5)
            if clear_response.json().get('success'):
                print_test("停用词清除", True)
                self.passed += 1
            else:
                print_test("停用词清除", False)
                self.failed += 1
                
        except Exception as e:
            print_test("停用词功能", False, f"请求异常: {e}")
            self.failed += 1

    def test_wordcloud(self):
        """测试词云生成与下载功能"""
        test_text = "人工智能机器学习深度学习神经网络自然语言处理计算机视觉数据科学大数据"
        
        try:
            response = requests.post(
                f'{BASE_URL}/analyze',
                data={'text': test_text, 'top_n': 8},
                timeout=15
            )
            data = response.json()
            
            wordcloud_file = data.get('wordcloud')
            
            if wordcloud_file:
                print_test("词云生成", True, f"生成词云文件: {wordcloud_file}")
                self.passed += 1
                
                download_response = requests.get(
                    f'{BASE_URL}/wordcloud/download/{wordcloud_file}',
                    timeout=10
                )
                
                if download_response.status_code == 200 and len(download_response.content) > 1000:
                    print_test("词云下载", True, f"文件大小: {len(download_response.content)} 字节")
                    self.passed += 1
                else:
                    print_test("词云下载", False, f"状态码: {download_response.status_code}")
                    self.failed += 1
            else:
                print_test("词云生成", False, "未生成词云文件")
                self.failed += 1
        except Exception as e:
            print_test("词云功能", False, f"请求异常: {e}")
            self.failed += 1

    def test_error_handling(self):
        """测试错误处理"""
        test_cases = [
            {
                "url": "/api/extract",
                "method": "POST",
                "json": {},
                "expect_code": 400,
                "desc": "空请求体"
            },
            {
                "url": "/api/extract",
                "method": "POST",
                "json": {"text": ""},
                "expect_code": 400,
                "desc": "空文本"
            },
            {
                "url": "/history/999999",
                "method": "GET",
                "expect_code": 404,
                "desc": "不存在的历史记录"
            },
            {
                "url": "/nonexistent",
                "method": "GET",
                "expect_code": 404,
                "desc": "不存在的路由"
            }
        ]

        for case in test_cases:
            try:
                if case['method'] == 'POST':
                    response = requests.post(
                        f'{BASE_URL}{case["url"]}',
                        json=case.get('json'),
                        timeout=5
                    )
                else:
                    response = requests.get(
                        f'{BASE_URL}{case["url"]}',
                        timeout=5
                    )
                
                if response.status_code == case['expect_code']:
                    print_test(f"错误处理: {case['desc']}", True)
                    self.passed += 1
                else:
                    print_test(
                        f"错误处理: {case['desc']}",
                        False,
                        f"期望状态码 {case['expect_code']}, 实际 {response.status_code}"
                    )
                    self.failed += 1
            except Exception as e:
                print_test(f"错误处理: {case['desc']}", False, f"异常: {e}")
                self.failed += 1

    def test_param_validation(self):
        """测试参数验证"""
        test_cases = [
            {
                "text": "测试文本",
                "top_n": 0,
                "expect_code": 400,
                "desc": "top_n为0"
            },
            {
                "text": "测试文本",
                "top_n": 21,
                "expect_code": 400,
                "desc": "top_n超过20"
            },
            {
                "text": "测试文本",
                "top_n": 10,
                "expect_code": 200,
                "desc": "top_n在有效范围内"
            }
        ]

        for case in test_cases:
            try:
                response = requests.post(
                    f'{BASE_URL}/analyze',
                    data={'text': case['text'], 'top_n': case['top_n']},
                    timeout=5
                )
                
                if response.status_code == case['expect_code']:
                    print_test(f"参数验证: {case['desc']}", True)
                    self.passed += 1
                else:
                    print_test(
                        f"参数验证: {case['desc']}",
                        False,
                        f"期望状态码 {case['expect_code']}, 实际 {response.status_code}"
                    )
                    self.failed += 1
            except Exception as e:
                print_test(f"参数验证: {case['desc']}", False, f"异常: {e}")
                self.failed += 1

    def print_summary(self):
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        print(f"\n{bcolors.HEADER}{bcolors.BOLD}="*60)
        print("  测试结果汇总")
        print("="*60 + f"{bcolors.ENDC}")
        print(f"\n  总测试数: {total}")
        print(f"  {bcolors.OKGREEN}通过: {self.passed}{bcolors.ENDC}")
        print(f"  {bcolors.FAIL}失败: {self.failed}{bcolors.ENDC}")
        print(f"  通过率: {pass_rate:.1f}%")
        
        if pass_rate >= 90:
            print(f"\n  {bcolors.OKGREEN}{bcolors.BOLD}✓ 测试结果优秀！{bcolors.ENDC}")
        elif pass_rate >= 70:
            print(f"\n  {bcolors.WARNING}{bcolors.BOLD}⚠ 测试结果良好，建议修复失败项{bcolors.ENDC}")
        else:
            print(f"\n  {bcolors.FAIL}{bcolors.BOLD}✗ 测试结果较差，请检查代码{bcolors.ENDC}")
        
        print(f"\n{bcolors.HEADER}="*60 + f"{bcolors.ENDC}\n")


if __name__ == '__main__':
    tester = KeywordExtractionTester()
    tester.run()
