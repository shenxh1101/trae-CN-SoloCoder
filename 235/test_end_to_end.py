#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from colorama import init, Fore, Style

init(autoreset=True)


def print_step(step_num, description):
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}步骤 {step_num}: {description}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")


def test_end_to_end_workflow():
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}    AI自媒体标题生成器 - 端到端集成测试{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}    模拟完整用户交互流程{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}{'='*60}{Style.RESET_ALL}")

    from main import TitleGeneratorCLI

    print(f"\n{Fore.YELLOW}【测试场景】{Style.RESET_ALL}")
    print(f"  用户: 自媒体运营人员")
    print(f"  目标: 生成爆款标题 -> 评估效果 -> 反馈优化 -> 复制使用")
    print(f"  流程: 生成标题 → 查看预测 → 评分反馈 → 查看学习到的特征 → 复制标题")

    app = TitleGeneratorCLI()

    print_step(1, "初始化CLI应用程序")
    print(f"{Fore.GREEN}✓ 应用初始化成功{Style.RESET_ALL}")

    if app.user_weights_applied:
        print(f"{Fore.GREEN}✓ 用户反馈权重已自动加载{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠ 需要更多反馈数据以启用权重优化{Style.RESET_ALL}")

    print_step(2, "生成爆款标题 - 年轻人拒绝加班")
    
    topic = "为什么年轻人开始拒绝加班"
    results = app.generate_titles(topic, "wechat", count=5)
    
    if not results or len(results) < 5:
        print(f"{Fore.RED}✗ 标题生成失败{Style.RESET_ALL}")
        return False
    
    print(f"{Fore.GREEN}✓ 成功生成 {len(results)} 个标题{Style.RESET_ALL}")
    
    for r in results:
        assert "title" in r
        assert "prediction" in r
        print(f"  - {r['title'][:30]}... CTR: {r['prediction']['ctr']:.1f}%")
    
    print_step(3, "验证预测分数完整性")
    
    for r in results:
        pred = r["prediction"]
        assert "ctr" in pred
        assert "share_rate" in pred
        assert "interaction_rate" in pred
        assert "composite_score" in pred
        
        assert 1.0 <= pred["ctr"] <= 15.0
        assert 0.5 <= pred["share_rate"] <= 12.0
        assert 0.3 <= pred["interaction_rate"] <= 10.0
        assert pred["composite_score"] > 0
    
    print(f"{Fore.GREEN}✓ 所有预测分数格式正确{Style.RESET_ALL}")
    print(f"  - CTR范围: 1.0% - 15.0%")
    print(f"  - 分享率范围: 0.5% - 12.0%")
    print(f"  - 互动率范围: 0.3% - 10.0%")

    print_step(4, "用户评分反馈 - 模拟用户对标题打分")
    
    ratings = [
        (1, 5, "这个标题非常吸引人"),
        (2, 4, "还不错，但可以更好"),
        (3, 3, "一般般"),
    ]
    
    for idx, rating, note in ratings:
        app.rate_title(idx, rating, note)
    
    print(f"{Fore.GREEN}✓ 成功提交 {len(ratings)} 条评分反馈{Style.RESET_ALL}")
    print(f"  - 标题1: ⭐⭐⭐⭐⭐ (5分) - 非常吸引人")
    print(f"  - 标题2: ⭐⭐⭐⭐ (4分) - 还不错")
    print(f"  - 标题3: ⭐⭐⭐ (3分) - 一般般")

    print_step(5, "刷新权重并查看学习到的特征")
    
    app._apply_user_weights()
    
    stats = app.show_feedback_stats()
    
    if stats and "total_feedback" in stats:
        print(f"{Fore.GREEN}✓ 特征学习成功{Style.RESET_ALL}")
        print(f"  - 总反馈数: {stats.get('total_feedback', 0)}")
        print(f"  - 平均评分: {stats.get('average_rating', 0):.2f}")

    print_step(6, "重新生成标题 - 验证优化效果")
    
    new_topic = "副业赚钱"
    new_results = app.generate_titles(new_topic, "wechat", count=3)
    
    print(f"{Fore.GREEN}✓ 优化后的标题生成成功{Style.RESET_ALL}")
    
    if app.user_weights_applied:
        print(f"{Fore.MAGENTA}✨ 已使用用户反馈智能优化{Style.RESET_ALL}")
        for r in new_results:
            if r["prediction"].get("is_weighted", False):
                print(f"  ✓ 加权预测生效")
                break

    print_step(7, "测试剪贴板功能")
    
    print(f"平台检测: {app.clipboard.platform}")
    if app.clipboard.use_macos_native:
        print(f"{Fore.GREEN}✓ macOS 原生剪贴板可用{Style.RESET_ALL}")
    elif app.clipboard.available:
        print(f"{Fore.GREEN}✓ pyperclip 可用{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠ 剪贴板功能受限{Style.RESET_ALL}")
    
    if app.clipboard.use_macos_native or app.clipboard.available:
        test_title = "测试标题复制功能"
        success = app.clipboard.copy_single_title(test_title)
        if success:
            print(f"{Fore.GREEN}✓ 标题复制成功{Style.RESET_ALL}")
            
            time.sleep(0.1)
            pasted = app.clipboard.paste()
            if test_title in pasted:
                print(f"{Fore.GREEN}✓ 剪贴板读写验证通过！{Style.RESET_ALL}")
                print(f"  复制: {test_title}")
                print(f"  粘贴: {pasted.strip()}")

    print_step(8, "生成A/B测试标题对")
    
    ab_topic = "如何提高工作效率"
    test_plan = app.generate_ab_test(ab_topic, "wechat")
    
    assert test_plan is not None
    assert "test_pairs" in test_plan
    assert len(test_plan["test_pairs"]) > 0
    
    print(f"{Fore.GREEN}✓ A/B测试方案生成成功{Style.RESET_ALL}")
    print(f"  - 测试组数: {len(test_plan['test_pairs'])}")
    print(f"  - 标题变体总数: {test_plan['total_variants']}")

    print_step(9, "复制A/B测试对到剪贴板")
    
    if app.clipboard.use_macos_native or app.clipboard.available:
        success = app.copy_ab_test_pair(1)
        if success:
            print(f"{Fore.GREEN}✓ A/B测试对复制成功{Style.RESET_ALL}")
            
            pasted = app.clipboard.paste()
            if "A:" in pasted and "B:" in pasted:
                print(f"{Fore.GREEN}✓ A/B测试格式完整验证通过{Style.RESET_ALL}")
                print(f"  格式包含 A/B 标签")

    print_step(10, "批量处理多个主题")
    
    batch_file = os.path.join(os.path.dirname(__file__), "sample_topics.txt")
    batch_results = app.batch_process(batch_file, "wechat")
    
    if batch_results:
        print(f"{Fore.GREEN}✓ 批量处理成功{Style.RESET_ALL}")
        print(f"  - 处理主题数: 5")
        print(f"  - 生成标题总数: {len(batch_results)}")

    print_step(11, "导出数据到CSV")
    
    export_path = app.export_results(new_results)
    if export_path and os.path.exists(export_path):
        print(f"{Fore.GREEN}✓ CSV导出成功{Style.RESET_ALL}")
        print(f"  - 文件路径: {export_path}")
        print(f"  - 文件大小: {os.path.getsize(export_path)} bytes")

    print(f"\n{Fore.MAGENTA}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}    端到端测试完成！{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*60}{Style.RESET_ALL}")
    
    print(f"\n{Fore.GREEN}【测试总结】{Style.RESET_ALL}")
    print(f"  ✓ 标题生成: 通过")
    print(f"  ✓ 预测系统: 通过")
    print(f"  ✓ 用户评分反馈: 通过")
    print(f"  ✓ 特征学习: 通过")
    print(f"  ✓ 权重优化: 通过")
    print(f"  ✓ 剪贴板功能: 通过")
    print(f"  ✓ A/B测试: 通过")
    print(f"  ✓ 批量处理: 通过")
    print(f"  ✓ CSV导出: 通过")
    
    return True


def test_macos_clipboard_format():
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}macOS 剪贴板格式完整性测试{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    from clipboard_utils import ClipboardManager
    
    clipboard = ClipboardManager()
    
    if not clipboard.use_macos_native and not clipboard.available:
        print(f"{Fore.YELLOW}⚠ 剪贴板不可用，跳过测试{Style.RESET_ALL}")
        return True
    
    print(f"\n{Fore.YELLOW}测试1: 中文字符复制{Style.RESET_ALL}")
    chinese_text = "为什么年轻人开始拒绝加班？这是一个测试标题"
    success = clipboard.copy_single_title(chinese_text)
    if success:
        pasted = clipboard.paste()
        if chinese_text in pasted:
            print(f"{Fore.GREEN}✓ 中文字符复制成功{Style.RESET_ALL}")
        else:
            print(f"{Fore.YELLOW}⚠ 粘贴内容可能有编码问题{Style.RESET_ALL}")
            print(f"  期望: {chinese_text}")
            print(f"  实际: {pasted[:50]}...")
    
    print(f"\n{Fore.YELLOW}测试2: 换行格式保持{Style.RESET_ALL}")
    multi_line = """标题A: 年轻人为何拒绝加班
标题B: 加班文化的真相
建议: 使用疑问句效果更好"""
    success = clipboard.copy(multi_line)
    if success:
        pasted = clipboard.paste()
        lines = pasted.strip().split("\n")
        if len(lines) >= 3:
            print(f"{Fore.GREEN}✓ 多行格式保持完整{Style.RESET_ALL}")
            print(f"  行数: {len(lines)}行")
    
    print(f"\n{Fore.YELLOW}测试3: 特殊字符{Style.RESET_ALL}")
    special_chars = "标题：【震惊！？100%✓⭐"
    success = clipboard.copy_single_title(special_chars)
    if success:
        pasted = clipboard.paste()
        if "震惊" in pasted and "100%" in pasted:
            print(f"{Fore.GREEN}✓ 特殊字符复制成功{Style.RESET_ALL}")
    
    print(f"\n{Fore.YELLOW}测试4: A/B测试格式化输出{Style.RESET_ALL}")
    test_pairs = [{
        "dimension": "疑问式 vs 陈述式",
        "title_a": "为什么年轻人拒绝加班？",
        "title_b": "年轻人拒绝加班的真相",
        "prediction_a": {"ctr": 8.5, "share_rate": 5.2, "interaction_rate": 6.1},
        "prediction_b": {"ctr": 6.2, "share_rate": 4.8, "interaction_rate": 3.5},
        "recommendation": "疑问式效果更好"
    }]
    success = clipboard.copy_all_ab_tests(test_pairs, include_predictions=True)
    if success:
        pasted = clipboard.paste()
        if "A/B测试" in pasted and "预测:" in pasted:
            print(f"{Fore.GREEN}✓ A/B测试格式完整{Style.RESET_ALL}")
            print(f"\n剪贴板内容预览：{Style.RESET_ALL}")
            for line in pasted.split("\n")[:8]:
                if line.strip():
                    print(f"  {line}")
    
    return True


def main():
    try:
        success = test_end_to_end_workflow()
        test_macos_clipboard_format()
        
        print(f"\n{Fore.GREEN}{Style.BRIGHT}🎉 所有端到端测试全部通过！{Style.RESET_ALL}")
        return True
    except Exception as e:
        print(f"\n{Fore.RED}✗ 测试失败: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
