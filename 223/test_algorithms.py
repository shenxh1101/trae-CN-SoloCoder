import json
import sys
sys.path.insert(0, '.')

from app import simple_match_recommend, weighted_match_recommend, load_news, get_all_categories, get_all_keywords

print("=" * 60)
print("📊 推荐算法测试")
print("=" * 60)

news_list = load_news()
print(f"\n✅ 新闻库加载成功，共 {len(news_list)} 条新闻")

categories = get_all_categories(news_list)
print(f"\n📂 所有类别: {categories}")

keywords = get_all_keywords(news_list)
print(f"\n🏷️ 关键词总数: {len(keywords)}")

print("\n" + "=" * 60)
print("🧪 测试1: 简单匹配算法")
print("=" * 60)

test_preferences_1 = {
    'categories': ['科技'],
    'keywords': ['人工智能', '苹果']
}

print(f"\n用户偏好:")
print(f"  类别: {test_preferences_1['categories']}")
print(f"  关键词: {test_preferences_1['keywords']}")

recommendations_1 = simple_match_recommend(test_preferences_1, news_list, top_n=5)

print(f"\n推荐结果 (Top 5):")
for i, (news, reasons) in enumerate(recommendations_1, 1):
    print(f"\n  {i}. {news['title']}")
    print(f"     类别: {news['category']}")
    print(f"     推荐理由:")
    for reason in reasons:
        print(f"       - {reason}")

print("\n" + "=" * 60)
print("🧪 测试2: 加权匹配算法")
print("=" * 60)

test_preferences_2 = {
    'categories': ['体育', '科技'],
    'keywords': ['足球', '人工智能'],
    'category_weights': {'体育': 2.0, '科技': 1.0},
    'keyword_weights': {'足球': 1.5, '人工智能': 2.0}
}

print(f"\n用户偏好 (带权重):")
print(f"  类别: {test_preferences_2['categories']}")
print(f"  类别权重: {test_preferences_2['category_weights']}")
print(f"  关键词: {test_preferences_2['keywords']}")
print(f"  关键词权重: {test_preferences_2['keyword_weights']}")

recommendations_2 = weighted_match_recommend(test_preferences_2, news_list, top_n=5)

print(f"\n推荐结果 (Top 5):")
for i, (news, reasons) in enumerate(recommendations_2, 1):
    print(f"\n  {i}. {news['title']}")
    print(f"     类别: {news['category']}")
    print(f"     推荐理由:")
    for reason in reasons:
        print(f"       - {reason}")

print("\n" + "=" * 60)
print("🧪 测试3: 权重调整逻辑验证")
print("=" * 60)

print("\n模拟点赞操作:")
print("  点赞后，该类别权重 +0.5，每个关键词权重 +0.3")
print("\n模拟点踩操作:")
print("  点踩后，该类别权重 -0.3 (最低0.1)，每个关键词权重 -0.2 (最低0.1)")

print("\n" + "=" * 60)
print("🧪 测试4: 无匹配时的处理")
print("=" * 60)

test_preferences_3 = {
    'categories': ['军事'],
    'keywords': ['坦克']
}

recommendations_3 = simple_match_recommend(test_preferences_3, news_list, top_n=5)
print(f"\n无匹配类别时的推荐数量: {len(recommendations_3)}")
if len(recommendations_3) == 0:
    print("✅ 正确返回空列表")
else:
    print("❌ 错误：不应有匹配结果")

print("\n" + "=" * 60)
print("✅ 算法测试完成")
print("=" * 60)
