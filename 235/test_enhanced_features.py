#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from colorama import init, Fore, Style

init(autoreset=True)


def test_user_weighted_generation():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试1: 基于用户评分的生成算法优化{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from title_generator import TitleGenerator
    from data_exporter import FeedbackManager
    
    generator = TitleGenerator()
    feedback_manager = FeedbackManager()
    
    features = feedback_manager.get_weighted_features()
    print(f"当前反馈数量: {features['total_feedback']}")
    print(f"高评分标题数: {features['high_rated_count']}")
    
    generator.apply_user_weights(features)
    print(f"\n{Fore.GREEN}✓ 权重已应用到生成器{Style.RESET_ALL}")
    
    topic = "为什么年轻人开始拒绝加班"
    titles = generator.generate_titles(topic, "wechat", count=3, use_weighted=True)
    
    print(f"\n使用加权模板生成的标题:")
    for i, title in enumerate(titles, 1):
        print(f"  {i}. {title}")
    
    return True


def test_weighted_prediction():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试2: 加权评分预测系统{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from predictor import PerformancePredictor
    from data_exporter import FeedbackManager
    
    predictor = PerformancePredictor()
    feedback_manager = FeedbackManager()
    
    features = feedback_manager.get_weighted_features()
    
    if features["total_feedback"] >= 5:
        predictor.enable_user_feedback(features)
        print(f"{Fore.GREEN}✓ 已启用用户反馈加权预测{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠  用户反馈不足5条，暂未启用加权预测{Style.RESET_ALL}")
    
    test_titles = [
        "为什么年轻人开始拒绝加班？",
        "震惊！年轻人拒绝加班的真相",
        "深度解析加班文化的底层逻辑",
    ]
    
    print(f"\n{'标题':<40} {'点击率':>8} {'分享率':>8} {'互动率':>8} {'综合':>8} {'加权':>6}")
    print("-" * 90)
    
    for title in test_titles:
        pred = predictor.predict(title, "wechat")
        color = Fore.GREEN if pred["composite_score"] >= 7 else (Fore.YELLOW if pred["composite_score"] >= 5 else Fore.RED)
        weighted_marker = " ✓" if pred.get("is_weighted", False) else ""
        print(f"{title[:37] + '...' if len(title) > 37 else title:<40} "
              f"{color}{pred['ctr']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['share_rate']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['interaction_rate']:>6.1f}%{Style.RESET_ALL} "
              f"{color}{pred['composite_score']:>6.1f}{Style.RESET_ALL}"
              f"{weighted_marker:>6}")
    
    return True


def test_clipboard_functionality():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试3: 剪贴板复制功能{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from clipboard_utils import ClipboardManager
    
    clipboard = ClipboardManager()
    
    if not clipboard.available:
        print(f"{Fore.YELLOW}⚠  pyperclip不可用，请安装: pip install pyperclip{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}   将跳过剪贴板实际复制测试{Style.RESET_ALL}")
    else:
        print(f"{Fore.GREEN}✓ 剪贴板功能可用{Style.RESET_ALL}")
        
        test_text = "AI自媒体标题生成器测试"
        success = clipboard.copy(test_text)
        if success:
            print(f"{Fore.GREEN}✓ 文本复制成功{Style.RESET_ALL}")
            
            pasted = clipboard.paste()
            if pasted == test_text:
                print(f"{Fore.GREEN}✓ 剪贴板读写验证成功{Style.RESET_ALL}")
        
        test_titles = ["标题A：年轻人为何拒绝加班", "标题B：加班文化的真相"]
        success = clipboard.copy_titles(test_titles)
        if success:
            print(f"{Fore.GREEN}✓ 多标题复制成功{Style.RESET_ALL}")
        
        success = clipboard.copy_ab_test_pair("A测试标题", "B测试标题")
        if success:
            print(f"{Fore.GREEN}✓ A/B测试对复制成功{Style.RESET_ALL}")
    
    return True


def test_feedback_weight_features():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试4: 用户反馈权重特征提取{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from data_exporter import FeedbackManager
    
    feedback_manager = FeedbackManager()
    
    test_titles = [
        ("为什么年轻人开始拒绝加班？", "拒绝加班", "wechat", 5, "很好的标题"),
        ("996正在毁掉这一代年轻人", "拒绝加班", "wechat", 4, ""),
        ("加班文化为何如此盛行？", "拒绝加班", "wechat", 5, "疑问句效果好"),
        ("年轻人拒绝加班，是任性还是觉醒？", "拒绝加班", "wechat", 4, ""),
        ("深度解析：加班背后的职场逻辑", "拒绝加班", "wechat", 3, ""),
    ]
    
    print(f"添加测试反馈...")
    for title, topic, platform, rating, note in test_titles:
        feedback_manager.add_feedback(title, topic, platform, rating, note)
    
    features = feedback_manager.get_weighted_features()
    
    print(f"\n{Fore.GREEN}提取的特征:{Style.RESET_ALL}")
    print(f"  总反馈数: {features['total_feedback']}")
    print(f"  高评分标题数: {features['high_rated_count']}")
    print(f"  最佳标题长度: {features['avg_length']:.1f} 字")
    print(f"  疑问句偏好: {features['question_ratio']*100:.0f}%")
    print(f"  感叹号偏好: {features['exclamation_ratio']*100:.0f}%")
    print(f"  数字偏好: {features['number_ratio']*100:.0f}%")
    print(f"  主导结构: {features['dominant_structure']}")
    
    if features["word_weights"]:
        top_words = sorted(
            features["word_weights"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        print(f"  高权重关键词: {', '.join([f'{w}({s:.1f})' for w, s in top_words])}")
    
    if features["template_weights"]:
        top_templates = sorted(
            features["template_weights"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        print(f"  高权重模板数: {len(features['template_weights'])}")
    
    return True


def test_prediction_boost():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试5: 预测分数Boost功能{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from data_exporter import FeedbackManager
    
    feedback_manager = FeedbackManager()
    
    test_title = "为什么年轻人开始拒绝加班？"
    boost = feedback_manager.get_prediction_boost(test_title)
    
    print(f"测试标题: {test_title}")
    print(f"CTR Boost: +{boost['ctr_boost']:.2f}")
    print(f"Share Boost: +{boost['share_boost']:.2f}")
    print(f"Interaction Boost: +{boost['interaction_boost']:.2f}")
    
    total_boost = boost["ctr_boost"] * 0.4 + boost["share_boost"] * 0.3 + boost["interaction_boost"] * 0.3
    print(f"综合Boost: +{total_boost:.2f}")
    
    return True


def test_integrated_workflow():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}测试6: 完整工作流集成测试{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from main import TitleGeneratorCLI
    
    app = TitleGeneratorCLI()
    
    print(f"{Fore.GREEN}✓ CLI初始化成功{Style.RESET_ALL}")
    
    if app.user_weights_applied:
        print(f"{Fore.GREEN}✓ 用户权重已自动应用{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠  等待更多用户反馈以启用权重优化{Style.RESET_ALL}")
    
    topic = "副业赚钱"
    print(f"\n生成标题: {topic}")
    results = app.generate_titles(topic, "wechat", count=3)
    
    if results:
        print(f"{Fore.GREEN}✓ 标题生成成功{Style.RESET_ALL}")
        
        if results[0]["prediction"].get("is_weighted", False):
            print(f"{Fore.GREEN}✓ 预测已使用用户反馈加权{Style.RESET_ALL}")
    
    print(f"\n生成A/B测试:")
    test_plan = app.generate_ab_test(topic, "wechat")
    
    if test_plan:
        print(f"{Fore.GREEN}✓ A/B测试生成成功{Style.RESET_ALL}")
        
        print(f"\n尝试复制A/B测试...")
        if app.clipboard.available:
            success = app.copy_ab_test_pair(1)
            if success:
                print(f"{Fore.GREEN}✓ A/B测试对复制成功{Style.RESET_ALL}")
    
    return True


def main():
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}    AI自媒体标题生成器 v2.0 - 增强功能测试{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")
    
    tests = [
        ("用户权重生成", test_user_weighted_generation),
        ("加权评分预测", test_weighted_prediction),
        ("剪贴板功能", test_clipboard_functionality),
        ("反馈特征提取", test_feedback_weight_features),
        ("预测Boost功能", test_prediction_boost),
        ("完整工作流", test_integrated_workflow),
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
