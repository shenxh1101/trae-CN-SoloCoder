#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import fetch_feed, load_feeds, save_feeds, fetch_all_feeds, get_all_articles, analyze_sentiment, generate_daily_report
import json

print("=" * 60)
print("测试 1: RSS解析功能 - BBC News")
print("=" * 60)
bbc_url = "https://feeds.bbci.co.uk/news/rss.xml"
parsed = fetch_feed(bbc_url)
if parsed and parsed.entries:
    print(f"✓ 成功获取BBC RSS源")
    print(f"  - 标题: {parsed.feed.get('title', 'N/A')}")
    print(f"  - 文章数量: {len(parsed.entries)}")
    if parsed.entries:
        entry = parsed.entries[0]
        print(f"  - 第一篇文章: {entry.get('title', 'N/A')[:50]}...")
else:
    print("✗ 获取失败")

print("\n" + "=" * 60)
print("测试 2: 科技类RSS源 - TechCrunch")
print("=" * 60)
tech_url = "https://techcrunch.com/feed/"
parsed_tech = fetch_feed(tech_url)
if parsed_tech and parsed_tech.entries:
    print(f"✓ 成功获取TechCrunch RSS源")
    print(f"  - 标题: {parsed_tech.feed.get('title', 'N/A')}")
    print(f"  - 文章数量: {len(parsed_tech.entries)}")
else:
    print("✗ 获取失败")

print("\n" + "=" * 60)
print("测试 3: 情感分析")
print("=" * 60)
test_titles = [
    "Amazing breakthrough in AI technology announced today",
    "Stock market crashes amid economic crisis",
    "Regular weather forecast for tomorrow",
    "优秀！中国科技创新取得重大突破",
    "危机！公司业绩大幅下滑"
]
for title in test_titles:
    sentiment = analyze_sentiment(title)
    print(f"  {title[:40]}... -> {sentiment}")

print("\n" + "=" * 60)
print("测试 4: 添加RSS源到系统并抓取")
print("=" * 60)
feeds = [
    {'name': 'BBC News', 'url': bbc_url, 'last_update': '-', 'article_count': 0},
    {'name': 'TechCrunch', 'url': tech_url, 'last_update': '-', 'article_count': 0},
]
save_feeds(feeds)
print("✓ 已保存RSS源")

print("\n正在抓取所有RSS源...")
feeds_result, cache_result = fetch_all_feeds()
print(f"✓ 抓取完成，共 {len(feeds_result)} 个源")
for f in feeds_result:
    print(f"  - {f['name']}: {f['article_count']} 篇, 更新于 {f['last_update']}")

articles = get_all_articles()
print(f"\n✓ 总共抓取到 {len(articles)} 篇文章")
if articles:
    print(f"  最新文章: {articles[0]['title'][:60]}...")
    print(f"  来源: {articles[0]['source']}")
    print(f"  发布时间: {articles[0]['published']}")
    print(f"  情感: {articles[0]['sentiment']}")
    print(f"  摘要: {articles[0]['summary'][:80]}..." if len(articles[0]['summary']) > 80 else f"  摘要: {articles[0]['summary']}")

print("\n" + "=" * 60)
print("测试 5: 日报生成")
print("=" * 60)
report = generate_daily_report()
if report:
    print("✓ 日报生成成功")
    print("-" * 40)
    print(report[:500] + "..." if len(report) > 500 else report)

print("\n" + "=" * 60)
print("测试 6: 数据文件验证")
print("=" * 60)
for f in ['data/feeds.json', 'data/cache.json']:
    if os.path.exists(f):
        size = os.path.getsize(f)
        print(f"✓ {f} 存在 ({size} 字节)")
    else:
        print(f"✗ {f} 不存在")

print("\n" + "=" * 60)
print("所有测试完成!")
print("=" * 60)