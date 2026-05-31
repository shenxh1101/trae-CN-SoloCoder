import requests
import json

BASE_URL = "http://127.0.0.1:5001"

def test_api():
    print("=" * 50)
    print("Testing AI Email Classifier API")
    print("=" * 50)
    
    print("\n1. Testing Health Check...")
    r = requests.get(f"{BASE_URL}/api/health")
    print(f"   Status: {r.status_code}, Response: {r.json()}")
    
    print("\n2. Testing Get Categories...")
    r = requests.get(f"{BASE_URL}/api/categories")
    print(f"   Status: {r.status_code}")
    print(f"   Categories: {r.json()['categories']}")
    
    print("\n3. Testing Single Classification (咨询)...")
    r = requests.post(f"{BASE_URL}/api/classify", 
                     json={"content": "您好，请问你们产品的价格是多少？我想咨询一下详细的报价信息。"})
    data = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Category: {data['data']['category']}, Priority: {data['data']['priority']}")
    print(f"   Sentiment: {data['data']['sentiment']}")
    print(f"   Explanation: {data['data']['category_explanation']}")
    
    print("\n4. Testing Single Classification (投诉)...")
    r = requests.post(f"{BASE_URL}/api/classify",
                     json={"content": "我要投诉！你们的产品质量太差了，客服态度也不好，用了三天就坏了，要求立即退款！"})
    data = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Category: {data['data']['category']}, Priority: {data['data']['priority']}")
    print(f"   Sentiment: {data['data']['sentiment']}")
    
    print("\n5. Testing Batch Classification...")
    r = requests.post(f"{BASE_URL}/api/classify/batch",
                     json={"emails": [
                         "您好，请问如何使用你们的API接口？",
                         "感谢你们的快速响应，服务非常好！",
                         "紧急！我的账户无法登录，已经影响到我的工作了，请立即处理！"
                     ]})
    data = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Total: {data['total']}, Processed: {data['processed']}")
    for i, result in enumerate(data['data']):
        print(f"   Email {i+1}: {result['category']} / {result['priority']} / {result['sentiment']}")
    
    print("\n6. Testing Statistics...")
    r = requests.get(f"{BASE_URL}/api/statistics")
    data = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Total Emails: {data['data']['total_emails']}")
    print(f"   High Priority: {data['data']['high_priority_count']} ({data['data']['high_priority_ratio']}%)")
    print(f"   By Category: {data['data']['by_category']}")
    
    print("\n7. Testing Feedback Submission...")
    email_id = data['data']['total_emails']
    r = requests.post(f"{BASE_URL}/api/feedback",
                     json={
                         "email_id": "test_123",
                         "original_category": "咨询",
                         "corrected_category": "投诉",
                         "original_priority": "低",
                         "corrected_priority": "高",
                         "email_content": "测试反馈邮件内容",
                         "note": "这个应该是投诉"
                     })
    print(f"   Status: {r.status_code}, Success: {r.json()['success']}")
    
    print("\n8. Testing Get Feedbacks...")
    r = requests.get(f"{BASE_URL}/api/feedback")
    print(f"   Status: {r.status_code}, Count: {r.json()['count']}")
    
    print("\n9. Testing Custom Keywords...")
    r = requests.post(f"{BASE_URL}/api/keywords",
                     json={
                         "category": "技术支持",
                         "keywords": ["bug", "故障", "无法登录", "报错", "异常"],
                         "weight": 1.5
                     })
    print(f"   Status: {r.status_code}, Success: {r.json().get('success', False)}")
    
    print("\n10. Testing Get Keywords...")
    r = requests.get(f"{BASE_URL}/api/keywords")
    data = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Categories with custom keywords: {list(data['data'].keys())}")
    
    print("\n11. Testing Training from Examples...")
    r = requests.post(f"{BASE_URL}/api/train",
                     json={
                         "category": "售后支持",
                         "examples": [
                             "我的快递什么时候到？物流信息没有更新",
                             "收到的商品有破损，如何退换货？",
                             "申请退款后多久能到账？",
                             "售后申请已经提交了，什么时候处理？"
                         ]
                     })
    print(f"   Status: {r.status_code}, Success: {r.json().get('success', False)}")
    
    print("\n12. Testing Get Updated Categories...")
    r = requests.get(f"{BASE_URL}/api/categories")
    print(f"   Status: {r.status_code}")
    print(f"   Categories: {r.json()['categories']}")
    
    print("\n13. Testing Webhook Config...")
    r = requests.get(f"{BASE_URL}/api/webhook/config")
    print(f"   Status: {r.status_code}")
    print(f"   Dingtalk enabled: {r.json()['data']['dingtalk']['enabled']}")
    
    print("\n14. Testing CSV Template Download...")
    r = requests.get(f"{BASE_URL}/api/csv/template")
    print(f"   Status: {r.status_code}, Content-Type: {r.headers['Content-Type']}")
    
    print("\n15. Testing Report Generation...")
    r = requests.get(f"{BASE_URL}/api/report")
    print(f"   Status: {r.status_code}")
    print(f"   Report preview:\n{r.text[:200]}...")
    
    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)
    
    print("\n" + "Web Interface: http://127.0.0.1:5001/")
    print("\nAPI Endpoints:")
    print("  POST /api/classify - 单封邮件分类")
    print("  POST /api/classify/batch - 批量邮件分类")
    print("  POST /api/classify/csv - CSV批量分类")
    print("  GET  /api/csv/template - 下载CSV模板")
    print("  GET  /api/logs - 查询分类日志")
    print("  GET  /api/logs/export - 导出分类日志CSV")
    print("  GET  /api/statistics - 获取统计数据")
    print("  GET  /api/report - 生成统计报告")
    print("  POST /api/feedback - 提交分类反馈")
    print("  GET  /api/feedback - 获取反馈列表")
    print("  POST /api/train - 训练分类器")
    print("  POST /api/keywords - 添加自定义关键词")
    print("  GET  /api/keywords - 获取关键词配置")
    print("  GET  /api/webhook/config - 获取Webhook配置")
    print("  POST /api/webhook/config - 保存Webhook配置")
    print("  POST /api/webhook/test - 测试Webhook")

if __name__ == "__main__":
    test_api()
