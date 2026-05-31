#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from colorama import init, Fore, Style

init(autoreset=True)

def test_title_generator():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试1: 标题生成器{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from title_generator import TitleGenerator
    
    generator = TitleGenerator()
    
    platforms = generator.get_platforms()
    print(f"支持的平台: {list(platforms.keys())}")
    
    topic = "为什么年轻人开始拒绝加班"
    
    for platform in platforms:
        print(f"\n{Fore.GREEN}平台: {platforms[platform]['name']}{Style.RESET_ALL}")
        titles = generator.generate_titles(topic, platform, count=3)
        for i, title in enumerate(titles, 1):
            print(f"  {i}. {title}")
    
    return True

def test_predictor():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试2: 点击率/分享率/互动率预测{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from predictor import PerformancePredictor
    
    predictor = PerformancePredictor()
    
    test_titles = [
        "震惊！年轻人拒绝加班的真相",
        "为什么年轻人开始拒绝加班？",
        "深度解析加班文化的底层逻辑",
        "干货｜5个方法让你远离无效加班",
    ]
    
    print(f"\n{'标题':<40} {'点击率':>8} {'分享率':>8} {'互动率':>8} {'综合':>8}")
    print("-" * 80)
    
    for title in test_titles:
        pred = predictor.predict(title, "wechat")
        color = Fore.GREEN if pred["composite_score"] >= 7 else (Fore.YELLOW if pred["composite_score"] >= 5 else Fore.RED)
        print(f"{title[:37] + '...' if len(title) > 37 else title:<40} "
              f"{color}{pred['ctr']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['share_rate']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['interaction_rate']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['composite_score']:>6.1f}{Style.RESET_ALL}")
    
    return True

def test_seo_analyzer():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试3: SEO关键词分析{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from seo_analyzer import SEOAnalyzer
    
    analyzer = SEOAnalyzer()
    
    topic = "为什么年轻人开始拒绝加班"
    analysis = analyzer.analyze_topic(topic)
    
    print(f"主题: {topic}")
    print(f"分词: {' / '.join(analysis['segments'])}")
    
    if analysis["hot_words"]:
        print(f"\n{Fore.GREEN}热门关键词:{Style.RESET_ALL}")
        for hw in analysis["hot_words"]:
            print(f"  • {hw['keyword']} ({hw['category']})")
    
    print(f"\n{Fore.GREEN}SEO标题推荐:{Style.RESET_ALL}")
    seo_titles = analyzer.generate_seo_titles(topic, count=5)
    for i, st in enumerate(seo_titles, 1):
        print(f"  {i}. {st['title']} (SEO评分: {st['seo_score']:.0f})")
    
    return True

def test_style_learner():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试4: 风格学习{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from style_learner import StyleLearner
    
    learner = StyleLearner()
    
    sample_file = os.path.join(os.path.dirname(__file__), "sample_high_performing_titles.txt")
    summary = learner.load_from_file(sample_file)
    
    print(f"{Fore.GREEN}风格分析结果:{Style.RESET_ALL}")
    print(f"  分析标题数量: {summary['total_titles']}")
    print(f"  平均标题长度: {summary['average_length']}")
    print(f"  疑问句比例: {summary['question_ratio']}%")
    print(f"  感叹句比例: {summary['exclamation_ratio']}%")
    print(f"  数字标题比例: {summary['number_ratio']}%")
    print(f"  高频关键词: {', '.join(summary['top_keywords'][:10])}")
    print(f"  学习到的模板数: {summary['template_count']}")
    
    from title_generator import TitleGenerator
    generator = TitleGenerator()
    
    print(f"\n{Fore.GREEN}使用学习到的风格生成标题:{Style.RESET_ALL}")
    titles = learner.generate_similar_titles("如何提高工作效率", generator, 5)
    for i, title in enumerate(titles, 1):
        print(f"  {i}. {title}")
    
    return True

def test_ab_test():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试5: A/B测试标题对生成{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from ab_test_generator import ABTestGenerator
    from title_generator import TitleGenerator
    from predictor import PerformancePredictor
    
    ab_gen = ABTestGenerator()
    generator = TitleGenerator()
    predictor = PerformancePredictor()
    
    topic = "副业赚钱"
    test_plan = ab_gen.generate_test_plan(topic, generator, predictor, "wechat")
    
    print(f"主题: {topic}")
    print(f"最佳预期标题: {test_plan['top_performer']['title']}")
    print(f"综合评分: {test_plan['top_performer']['prediction']['composite_score']:.2f}")
    
    for pair in test_plan["test_pairs"]:
        print(f"\n{Fore.YELLOW}测试 {pair['test_id']}: {pair['dimension']}{Style.RESET_ALL}")
        print(f"  A: {pair['title_a']}")
        print(f"     CTR:{pair['prediction_a']['ctr']:.1f}% 分享:{pair['prediction_a']['share_rate']:.1f}%")
        print(f"  B: {pair['title_b']}")
        print(f"     CTR:{pair['prediction_b']['ctr']:.1f}% 分享:{pair['prediction_b']['share_rate']:.1f}%")
        print(f"  建议: {pair['recommendation']}")
    
    return True

def test_data_exporter():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试6: CSV导出和反馈系统{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from data_exporter import DataExporter, FeedbackManager
    from predictor import PerformancePredictor
    
    exporter = DataExporter()
    predictor = PerformancePredictor()
    
    test_results = []
    titles = [
        "为什么年轻人开始拒绝加班？",
        "996正在毁掉这一代年轻人",
        "加班文化为何如此盛行？"
    ]
    
    for i, title in enumerate(titles, 1):
        pred = predictor.predict(title, "wechat")
        test_results.append({
            "title": title,
            "topic": "拒绝加班",
            "platform": "wechat",
            "prediction": pred,
            "user_rating": None
        })
    
    csv_path = exporter.export_to_csv(test_results)
    print(f"CSV导出成功: {csv_path}")
    
    json_path = exporter.export_to_json(test_results)
    print(f"JSON导出成功: {json_path}")
    
    feedback_manager = FeedbackManager()
    
    feedback = feedback_manager.add_feedback(
        titles[0], "拒绝加班", "wechat", 5, "这个标题很吸引人"
    )
    print(f"\n{Fore.GREEN}反馈已保存:{Style.RESET_ALL}")
    print(f"  ID: {feedback['id']}")
    print(f"  标题: {feedback['title']}")
    print(f"  评分: {'⭐' * feedback['rating']}")
    
    stats = feedback_manager.get_stats()
    if stats:
        print(f"\n{Fore.GREEN}反馈统计:{Style.RESET_ALL}")
        print(f"  总反馈数: {stats.get('total_feedback', 0)}")
        print(f"  平均评分: {stats.get('average_rating', 0):.2f}")
    
    return True

def test_batch_process():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试7: 批量处理{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from title_generator import TitleGenerator
    from predictor import PerformancePredictor
    from data_exporter import DataExporter
    
    generator = TitleGenerator()
    predictor = PerformancePredictor()
    exporter = DataExporter()
    
    sample_file = os.path.join(os.path.dirname(__file__), "sample_topics.txt")
    
    with open(sample_file, "r", encoding="utf-8") as f:
        topics = [line.strip() for line in f if line.strip()]
    
    print(f"批量处理 {len(topics)} 个主题...")
    
    all_results = []
    for i, topic in enumerate(topics, 1):
        print(f"  [{i}/{len(topics)}] {topic}")
        titles = generator.generate_titles(topic, "wechat", 5)
        for title in titles:
            pred = predictor.predict(title, "wechat")
            all_results.append({
                "title": title,
                "topic": topic,
                "platform": "wechat",
                "prediction": pred,
                "user_rating": None
            })
    
    output_path = exporter.export_to_csv(all_results, "batch_test_output.csv")
    print(f"\n{Fore.GREEN}批量处理完成！共生成 {len(all_results)} 个标题{Style.RESET_ALL}")
    print(f"结果已导出到: {output_path}")
    
    return True

def main():
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}    AI自媒体标题生成器 - 完整功能测试{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")
    
    tests = [
        ("标题生成器", test_title_generator),
        ("点击率预测", test_predictor),
        ("SEO分析", test_seo_analyzer),
        ("风格学习", test_style_learner),
        ("A/B测试", test_ab_test),
        ("数据导出", test_data_exporter),
        ("批量处理", test_batch_process),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                print(f"\n{Fore.GREEN}✓ {name} 测试通过{Style.RESET_ALL}")
                passed += 1
        except Exception as e:
            print(f"\n{Fore.RED}✗ {name} 测试失败: {str(e)}{Style.RESET_ALL}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print(f"\n{Fore.MAGENTA}{'='*60}{Style.RESET_ALL}")
    print(f"测试结果: {Fore.GREEN}{passed} 通过{Style.RESET_ALL}, {Fore.RED}{failed} 失败{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*60}{Style.RESET_ALL}\n")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
