#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
import json
import io

print("=" * 60)
print("测试 OPML 导出功能")
print("=" * 60)

client = app.test_client()

# 测试导出
response = client.get('/api/opml/export')
if response.status_code == 200:
    print("✓ OPML导出成功")
    opml_content = response.data.decode('utf-8')
    print(f"  - 内容长度: {len(opml_content)} 字符")
    print(f"  - Content-Type: {response.content_type}")
    print("\n导出的OPML内容:")
    print("-" * 40)
    print(opml_content)

    # 保存到文件用于测试导入
    with open('/tmp/test_subscriptions.opml', 'w') as f:
        f.write(opml_content)
    print("\n✓ 已保存到 /tmp/test_subscriptions.opml")
else:
    print(f"✗ 导出失败: {response.status_code}")

print("\n" + "=" * 60)
print("测试 OPML 导入功能")
print("=" * 60)

# 创建一个测试OPML文件
test_opml = '''<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Test Subscriptions</title>
  </head>
  <body>
    <outline type="rss" text="CNN News" title="CNN News" xmlUrl="http://rss.cnn.com/rss/edition.rss"/>
    <outline type="rss" text="Reuters" title="Reuters" xmlUrl="http://feeds.reuters.com/reuters/topNews"/>
  </body>
</opml>'''

# 测试导入
data = {'file': (io.BytesIO(test_opml.encode('utf-8')), 'test.opml')}
response = client.post('/api/opml/import', data=data, content_type='multipart/form-data')

if response.status_code == 200:
    result = json.loads(response.data)
    if result.get('success'):
        print(f"✓ OPML导入成功，导入了 {result.get('imported', 0)} 个订阅源")
    else:
        print(f"✗ 导入失败: {result.get('error')}")
else:
    print(f"✗ 导入失败: {response.status_code}")
    print(response.data.decode('utf-8'))

print("\n" + "=" * 60)
print("测试 二维码生成功能")
print("=" * 60)

test_url = "https://www.bbc.com/news"
response = client.get(f'/api/qrcode?url={test_url}')
if response.status_code == 200:
    result = json.loads(response.data)
    if result.get('qrcode'):
        qr_data = result['qrcode']
        print(f"✓ 二维码生成成功")
        print(f"  - Base64数据长度: {len(qr_data)} 字符")
        print(f"  - 数据格式正确: {qr_data.startswith('iVBOR')}")
    else:
        print("✗ 二维码数据为空")
else:
    print(f"✗ 二维码生成失败: {response.status_code}")

print("\n" + "=" * 60)
print("测试 收藏功能 API")
print("=" * 60)

# 获取所有文章
response = client.get('/api/articles')
articles = json.loads(response.data)['articles']

if articles:
    test_article = articles[0]
    print(f"测试文章: {test_article['title'][:50]}...")
    
    # 添加收藏
    response = client.post('/api/favorites', 
                           json={'id': test_article['id']},
                           content_type='application/json')
    if response.status_code == 200:
        result = json.loads(response.data)
        if result.get('success'):
            print(f"✓ 添加收藏成功，当前收藏数: {len(result.get('favorites', []))}")
        else:
            print(f"✗ 添加收藏失败: {result.get('error')}")
    
    # 获取收藏列表
    response = client.get('/api/favorites')
    if response.status_code == 200:
        favs = json.loads(response.data)
        print(f"✓ 获取收藏列表成功，共 {len(favs)} 条")
    
    # 删除收藏
    response = client.delete(f'/api/favorites/{test_article["id"]}')
    if response.status_code == 200:
        result = json.loads(response.data)
        print(f"✓ 删除收藏成功，剩余收藏数: {len(result.get('favorites', []))}")

print("\n" + "=" * 60)
print("测试 关键词过滤和时间筛选")
print("=" * 60)

# 关键词过滤
response = client.get('/api/articles?keyword=AI')
result = json.loads(response.data)
print(f"✓ 关键词 'AI' 过滤: 找到 {result['total']} 篇文章")

# 时间筛选
response = client.get('/api/articles?days=1')
result = json.loads(response.data)
print(f"✓ 最近1天筛选: 找到 {result['total']} 篇文章")

response = client.get('/api/articles?days=7')
result = json.loads(response.data)
print(f"✓ 最近7天筛选: 找到 {result['total']} 篇文章")

print("\n" + "=" * 60)
print("所有API测试完成!")
print("=" * 60)