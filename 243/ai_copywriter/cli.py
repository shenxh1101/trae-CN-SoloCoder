#!/usr/bin/env python3
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_copywriter.generator import CopyGenerator, PLATFORMS, TONES
from ai_copywriter.batch import BatchProcessor
from ai_copywriter.rating import RatingSystem
from ai_copywriter.ab_test import ABTester
from ai_copywriter.hashtags import HashtagRecommender
from ai_copywriter.competitor import CompetitorAnalyzer
from ai_copywriter.exporter import Exporter


def check_api_key(force_template: bool = False) -> tuple[bool, str]:
    if force_template:
        return True, "✅ 已启用模板模式（无需 API Key）"

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        setup_guide = (
            "\n"
            "⚠️  未检测到 OPENAI_API_KEY 环境变量\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "本工具默认使用 OpenAI API 进行智能文案生成。\n\n"
            "设置方法（任选其一）：\n"
            "  1. 临时设置（当前终端）：\n"
            "     export OPENAI_API_KEY=\"sk-xxxxxxxxxxxxxxxxxxxxxxxx\"\n\n"
            "  2. 永久设置（写入配置文件）：\n"
            "     echo 'export OPENAI_API_KEY=\"sk-xxxxxxxxxxxxxxxxxxxxxxxx\"' >> ~/.zshrc\n"
            "     source ~/.zshrc\n\n"
            "  3. 命令行参数指定：\n"
            "     python -m ai_copywriter.cli --api-key sk-xxxxxxxxxxxxxxxxxxxxxxxx ...\n\n"
            "  4. 使用模板模式（无需 API Key）：\n"
            "     python -m ai_copywriter.cli --force-template ...\n\n"
            "获取 API Key: https://platform.openai.com/account/api-keys\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        )
        return False, setup_guide

    return True, "✅ OpenAI API Key 检测成功"


def print_banner(force_template: bool = False):
    api_ok, msg = check_api_key(force_template)
    try:
        from rich.console import Console
        from rich.panel import Panel
        console = Console()
        banner = (
            "[bold cyan]🤖 AI营销文案生成器 v2.0[/bold cyan]\n"
            "[dim]支持平台：小红书 | 淘宝 | 朋友圈 | 抖音[/dim]\n"
            "[dim]语调风格：亲切 | 专业 | 幽默 | 紧迫[/dim]\n"
            f"{msg}"
        )
        console.print(Panel(banner, border_style="cyan"))
    except ImportError:
        print("=" * 60)
        print("  🤖 AI营销文案生成器 v2.0")
        print("  支持平台：小红书 | 淘宝 | 朋友圈 | 抖音")
        print("  语调风格：亲切 | 专业 | 幽默 | 紧迫")
        print(f"  {msg}")
        print("=" * 60)


def rich_print_copy(result, index=None, show_hashtag_reason: bool = False):
    try:
        from rich.console import Console
        from rich.panel import Panel
        from rich.table import Table
        console = Console()

        prefix = f"#{index} " if index else ""
        title = f"{prefix}{result['platform']} · {result['tone']}语调"
        source_tag = "🤖 AI生成" if result.get("source") == "ai" else "📝 模板生成"

        panel_content = result["copy"]
        if "ctr_data" in result:
            ctr = result["ctr_data"]
            panel_content += (
                f"\n\n📊 [dim]统计指标[/dim]\n"
                f"  预估CTR: [yellow]{ctr['estimated_ctr']}[/yellow]  "
                f"观测CTR: [cyan]{ctr['observed_ctr']}[/cyan]\n"
                f"  95%置信区间: [green]{ctr['confidence_interval_95']}[/green]\n"
                f"  标准误: [dim]{ctr['standard_error']}[/dim]  "
                f"95%误差范围: [dim]±{ctr['margin_of_error_95']}[/dim]\n"
                f"  CTR评级: {ctr['ctr_level']}"
            )

        console.print(Panel(
            panel_content,
            title=f"[bold]{title}[/bold] [{source_tag}]",
            border_style="green",
        ))

        if "rating" in result:
            stars = "⭐" * result["rating"]
            console.print(f"  评分: {stars} ({result['rating']}/5)")

        if "hashtags" in result and result["hashtags"]:
            hashtag_recommender = HashtagRecommender()
            console.print(f"  🏷️  推荐标签 (带语义评分):")
            for ht in result["hashtags"]:
                if isinstance(ht, dict):
                    tag_text = f"#{ht['tag']}"
                    score_pct = f"{ht['score']:.0%}"
                    reason = ht.get("reason", "")
                    source = ht.get("source", "")
                    console.print(f"     [cyan]{tag_text:20s}[/cyan] [green]({score_pct:>4s})[/green] [dim]{source}[/dim] - {reason}")
                else:
                    console.print(f"     #{ht}")
        console.print()
    except ImportError:
        plain_print_copy(result, index, show_hashtag_reason)


def plain_print_copy(result, index=None, show_hashtag_reason: bool = False):
    prefix = f"#{index} " if index else ""
    print(f"\n{'─' * 60}")
    print(f"  {prefix}{result['platform']} · {result['tone']}语调")
    source_tag = "AI生成" if result.get("source") == "ai" else "模板生成"
    print(f"  [{source_tag}]")
    print(f"{'─' * 60}")
    print(result["copy"])

    if "ctr_data" in result:
        ctr = result["ctr_data"]
        print(f"\n  📊 统计指标:")
        print(f"     预估CTR: {ctr['estimated_ctr']}  观测CTR: {ctr['observed_ctr']}")
        print(f"     95%置信区间: {ctr['confidence_interval_95']}")
        print(f"     标准误: {ctr['standard_error']}  95%误差范围: {ctr['margin_of_error_95']}")
        print(f"     CTR评级: {ctr['ctr_level']}")

    if "rating" in result:
        print(f"  评分: {'*' * result['rating']} ({result['rating']}/5)")

    if "hashtags" in result and result["hashtags"]:
        print(f"  🏷️  推荐标签:")
        for ht in result["hashtags"]:
            if isinstance(ht, dict):
                tag_text = f"#{ht['tag']}"
                score_pct = f"{ht['score']:.0%}"
                reason = ht.get("reason", "")
                print(f"     {tag_text:20s} ({score_pct:>4s}) - {reason}")
            else:
                print(f"     #{ht}")
    print()


def print_copy(result, index=None, show_hashtag_reason: bool = False):
    try:
        from rich.console import Console
        rich_print_copy(result, index, show_hashtag_reason)
    except ImportError:
        plain_print_copy(result, index, show_hashtag_reason)


def print_ab_test_result(ab_result: dict):
    try:
        from rich.console import Console
        from rich.table import Table
        from rich.panel import Panel

        console = Console()

        data_source_label = "基于真实实验数据" if ab_result.get("data_source") == "real" else "模拟数据"
        data_source_style = "green" if ab_result.get("data_source") == "real" else "yellow"

        table_title = f"📊 A/B测试结果 ({data_source_label}) - 统计显著性分析"
        table = Table(title=table_title, show_header=True, header_style="bold magenta")
        table.add_column("指标", style="cyan", width=22)
        table.add_column("文案 A", style="green", width=25)
        table.add_column("文案 B", style="yellow", width=25)

        table.add_row("平台", ab_result["copy_a"]["platform"], ab_result["copy_b"]["platform"])
        table.add_row("语调", ab_result["copy_a"]["tone"], ab_result["copy_b"]["tone"])
        table.add_row("样本量 (曝光)", str(ab_result["copy_a"]["impressions"]), str(ab_result["copy_b"]["impressions"]))
        table.add_row("点击量", str(ab_result["copy_a"]["clicks"]), str(ab_result["copy_b"]["clicks"]))
        table.add_row("观测CTR", f"{ab_result['copy_a']['observed_ctr_pct']}%", f"{ab_result['copy_b']['observed_ctr_pct']}%")
        table.add_row("预估CTR", f"{ab_result['copy_a']['estimated_ctr_pct']}%", f"{ab_result['copy_b']['estimated_ctr_pct']}%")
        table.add_row("95%置信区间", ab_result["copy_a"]["confidence_interval_str"], ab_result["copy_b"]["confidence_interval_str"])
        table.add_row("标准误", f"{ab_result['copy_a']['standard_error_pct']}%", f"{ab_result['copy_b']['standard_error_pct']}%")
        table.add_row("95%误差范围", ab_result["copy_a"]["conversion_range_95"], ab_result["copy_b"]["conversion_range_95"])

        console.print(table)

        stats_table = Table(title="📈 统计检验结果", show_header=True, header_style="bold blue")
        stats_table.add_column("统计指标", style="cyan", width=25)
        stats_table.add_column("数值", style="white", width=40)

        p_value_style = "green" if ab_result["p_value"] < 0.05 else "yellow"
        sig_style = "green" if ab_result["is_statistically_significant"] else "red"
        winner_style = "bold green" if ab_result["winner"] == "A" else "bold yellow" if ab_result["winner"] == "B" else "bold white"

        stats_table.add_row("置信水平", ab_result["confidence_level"])
        stats_table.add_row("P值", f"[{p_value_style}]{ab_result['p_value']}[/{p_value_style}]")
        stats_table.add_row("统计显著性", f"[{sig_style}]{'是 ✓' if ab_result['is_statistically_significant'] else '否 ✗'} ({ab_result['significance_level']})[/{sig_style}]")
        stats_table.add_row("效应量 (Cohen's h)", f"{ab_result['effect_size_cohen_h']} ({ab_result['effect_size_interpretation']})")
        stats_table.add_row("检验效能 (Power)", f"{ab_result['statistical_power']}% ({ab_result['power_interpretation']})")
        stats_table.add_row("相对提升", f"{ab_result['relative_uplift_pct']}%")
        stats_table.add_row("绝对差异", f"{ab_result['absolute_diff_pct']}%")
        stats_table.add_row("NNT (需曝光数)", f"{ab_result['nnt']} ({ab_result['nnt_interpretation']})")
        stats_table.add_row("获胜方", f"[{winner_style}]文案 {ab_result['winner']}[/{winner_style}]")

        ssr = ab_result["sample_size_result"]
        if isinstance(ssr, dict):
            stats_table.add_row("当前样本量", str(ssr["current_sample_size"]))
            stats_table.add_row("建议样本量 (80% power)", str(ssr["required_sample_size_80_power"]))
            stats_table.add_row("样本量充足性", ssr["adequacy"])
            if ssr["gap"] > 0:
                stats_table.add_row("样本缺口", f"还需 {ssr['gap']} 次曝光")

        console.print(stats_table)

        rec_panel = Panel(
            ab_result["recommendation"],
            title="[bold]💡 决策建议[/bold]",
            border_style="blue",
        )
        console.print(rec_panel)

    except ImportError:
        print("\n" + "=" * 60)
        print("  📊 A/B测试模拟结果 (统计显著性分析)")
        print("=" * 60)
        print(f"  文案A ({ab_result['copy_a']['platform']}·{ab_result['copy_a']['tone']}):")
        print(f"    曝光: {ab_result['copy_a']['impressions']}, 点击: {ab_result['copy_a']['clicks']}")
        print(f"    观测CTR: {ab_result['copy_a']['observed_ctr_pct']}%")
        print(f"    95%置信区间: {ab_result['copy_a']['confidence_interval_str']}")

        print(f"\n  文案B ({ab_result['copy_b']['platform']}·{ab_result['copy_b']['tone']}):")
        print(f"    曝光: {ab_result['copy_b']['impressions']}, 点击: {ab_result['copy_b']['clicks']}")
        print(f"    观测CTR: {ab_result['copy_b']['observed_ctr_pct']}%")
        print(f"    95%置信区间: {ab_result['copy_b']['confidence_interval_str']}")

        print(f"\n  统计检验:")
        print(f"    P值: {ab_result['p_value']} (显著性 {'是' if ab_result['is_statistically_significant'] else '否'})")
        print(f"    效应量 h={ab_result['effect_size_cohen_h']} ({ab_result['effect_size_interpretation']})")
        print(f"    检验效能: {ab_result['statistical_power']}% ({ab_result['power_interpretation']})")
        print(f"    获胜方: 文案 {ab_result['winner']}")
        print(f"    相对提升: {ab_result['relative_uplift_pct']}%")
        print(f"    NNT: {ab_result['nnt']} ({ab_result['nnt_interpretation']})")

        ssr = ab_result["sample_size_result"]
        if isinstance(ssr, dict):
            print(f"    样本量: 当前 {ssr['current_sample_size']}, 建议 {ssr['required_sample_size_80_power']} ({ssr['adequacy']})")
        print(f"\n  💡 建议: {ab_result['recommendation']}")


def print_competitor_analysis(analysis: dict, show_details: bool = True):
    try:
        from rich.console import Console
        from rich.table import Table
        from rich.panel import Panel

        console = Console()

        console.print(Panel(
            f"[bold]📊 竞品文案分析报告[/bold]\n"
            f"文案长度: {analysis['text_length']}字  |  有效词数: {analysis['word_count']}个  |  "
            f"风格: {analysis['writing_style']['style']}  |  情感类型: {analysis['sentiment']['sentiment_type']}",
            border_style="blue",
        ))

        if show_details:
            def make_keyword_table(title, items, max_items=8):
                if not items:
                    return None
                table = Table(title=title, show_header=True, header_style="bold magenta")
                table.add_column("关键词", style="cyan")
                table.add_column("频次", style="yellow", justify="center")
                for item in items[:max_items]:
                    table.add_row(item["word"], str(item["count"]))
                return table

            t1 = make_keyword_table("🔥 高频词", analysis["top_keywords"], 10)
            t2 = make_keyword_table("💹 营销词", analysis["marketing_keywords"], 8)
            t3 = make_keyword_table("💕 情感词", analysis["emotional_keywords"], 5)
            t4 = make_keyword_table("⏰ 紧迫感词", analysis["urgency_keywords"], 5)

            for t in [t1, t2, t3, t4]:
                if t is not None:
                    console.print(t)

            if analysis["product_features"]:
                ft = Table(title="📐 产品特性/数据指标", show_header=True, header_style="bold green")
                ft.add_column("类型", style="cyan")
                ft.add_column("数值", style="yellow")
                for f in analysis["product_features"]:
                    ft.add_row(f["type"], f["value"])
                console.print(ft)

            kd = analysis["keyword_density"]
            console.print(Panel(
                f"关键词密度: [yellow]{kd['density']}[/yellow] ({kd['count']}/{kd['total_words']}个词)\n"
                f"评价: {kd['recommendation']}",
                title="[bold]📝 内容质量评估[/bold]",
                border_style="cyan",
            ))

            ws = analysis["writing_style"]
            console.print(Panel(
                f"平均句长: {ws['avg_sentence_length']}字  |  句子数: {ws['sentence_count']}\n"
                f"表情符号: {ws['emoji_count']}个  |  感叹号: {ws['exclamation_count']}个  |  "
                f"话题标签: {ws['hashtag_count']}个",
                title="[bold]✍️ 写作风格分析[/bold]",
                border_style="magenta",
            ))

            if analysis["optimization_suggestions"]:
                os_table = Table(title="💡 优化建议", show_header=True, header_style="bold yellow")
                os_table.add_column("类别", style="cyan", width=12)
                os_table.add_column("优先级", style="red", width=8)
                os_table.add_column("建议", style="white")
                for sug in analysis["optimization_suggestions"]:
                    priority_color = "red" if sug["priority"] == "高" else "yellow" if sug["priority"] == "中" else "green"
                    os_table.add_row(sug["category"], f"[{priority_color}]{sug['priority']}[/{priority_color}]", sug["suggestion"])
                console.print(os_table)

            if analysis["suggested_keywords"]:
                console.print(Panel(
                    "[cyan]" + "  ".join(f"#{kw}" for kw in analysis["suggested_keywords"]) + "[/cyan]",
                    title="[bold]🔑 建议补充关键词[/bold]",
                    border_style="yellow",
                ))

    except ImportError:
        print("\n" + "=" * 60)
        print("  📊 竞品文案分析报告")
        print("=" * 60)
        print(f"  文案长度: {analysis['text_length']}字  |  有效词数: {analysis['word_count']}个")
        print(f"  风格: {analysis['writing_style']['style']}  |  情感类型: {analysis['sentiment']['sentiment_type']}")

        if analysis["top_keywords"]:
            print(f"\n  🔥 高频词: " + ", ".join(f"{w['word']}({w['count']})" for w in analysis["top_keywords"][:8]))
        if analysis["marketing_keywords"]:
            print(f"  💹 营销词: " + ", ".join(f"{w['word']}({w['count']})" for w in analysis["marketing_keywords"]))
        if analysis["emotional_keywords"]:
            print(f"  💕 情感词: " + ", ".join(f"{w['word']}({w['count']})" for w in analysis["emotional_keywords"]))
        if analysis["urgency_keywords"]:
            print(f"  ⏰ 紧迫感词: " + ", ".join(f"{w['word']}({w['count']})" for w in analysis["urgency_keywords"]))

        if analysis["product_features"]:
            print(f"\n  📐 产品特性: " + ", ".join(f"{f['type']}:{f['value']}" for f in analysis["product_features"]))

        print(f"\n  📝 关键词密度: {analysis['keyword_density']['density']} - {analysis['keyword_density']['recommendation']}")

        if analysis["optimization_suggestions"]:
            print(f"\n  💡 优化建议:")
            for sug in analysis["optimization_suggestions"]:
                print(f"     [{sug['priority']}] {sug['category']}: {sug['suggestion']}")

        if analysis["suggested_keywords"]:
            print(f"\n  🔑 建议补充关键词: " + ", ".join(analysis["suggested_keywords"]))


def print_optimization_comparison(comparison: dict):
    try:
        from rich.console import Console
        from rich.table import Table
        from rich.panel import Panel
        from rich.text import Text

        console = Console()

        console.print(Panel(
            f"[bold]🔄 文案优化前后对比[/bold]\n"
            f"文本相似度: {comparison['text_similarity']}%  |  "
            f"预估效果: {comparison['estimated_improvement']['improvement_level']}  |  "
            f"预估CTR提升: +{comparison['estimated_improvement']['estimated_ctr_improvement_pct']}%",
            border_style="cyan",
        ))

        def highlight_diff(text, additions, deletions, console_ref):
            result = Text()
            i = 0
            while i < len(text):
                matched = False
                for added in additions:
                    if text[i:i+len(added)] == added:
                        result.append(added, style="bold green on dark_green")
                        i += len(added)
                        matched = True
                        break
                for deleted in deletions:
                    if text[i:i+len(deleted)] == deleted:
                        result.append(deleted, style="strike red on dark_red")
                        i += len(deleted)
                        matched = True
                        break
                if not matched:
                    result.append(text[i])
                    i += 1
            return result

        console.print(Panel(
            highlight_diff(comparison["original_copy"], [], comparison["diff_highlight"]["removed"], console),
            title="[bold]📄 优化前文案[/bold] ([red]删除内容[/red])",
            border_style="red",
        ))
        console.print(Panel(
            highlight_diff(comparison["optimized_copy"], comparison["diff_highlight"]["added"], [], console),
            title="[bold]✨ 优化后文案[/bold] ([green]新增内容[/green])",
            border_style="green",
        ))

        stat_table = Table(title="📊 指标对比", show_header=True, header_style="bold magenta")
        stat_table.add_column("指标", style="cyan")
        stat_table.add_column("优化前", style="red", justify="right")
        stat_table.add_column("优化后", style="green", justify="right")
        stat_table.add_column("变化", style="yellow", justify="right")

        imp = comparison["improvement"]
        stat_table.add_row("总词数", str(comparison["original_stats"]["total_words"]), str(comparison["optimized_stats"]["total_words"]), str(comparison["optimized_stats"]["total_words"] - comparison["original_stats"]["total_words"]))
        stat_table.add_row("营销词数", str(comparison["original_stats"]["marketing_keywords"]), str(comparison["optimized_stats"]["marketing_keywords"]), f"+{imp['marketing_keywords_added']}")
        stat_table.add_row("情感词数", str(comparison["original_stats"]["emotional_keywords"]), str(comparison["optimized_stats"]["emotional_keywords"]), f"+{imp['emotional_keywords_added']}")
        stat_table.add_row("紧迫感词", str(comparison["original_stats"]["urgency_keywords"]), str(comparison["optimized_stats"]["urgency_keywords"]), f"+{imp['urgency_keywords_added']}")
        stat_table.add_row("竞品关键词匹配", comparison["original_stats"]["keyword_match_rate"], comparison["optimized_stats"]["keyword_match_rate"], imp["match_rate_improvement"])

        console.print(stat_table)

        if comparison["added_keywords"]:
            console.print(Panel(
                "[green]" + "  ".join(f"+{kw}" for kw in comparison["added_keywords"]) + "[/green]",
                title="[bold]➕ 新增关键词[/bold]",
                border_style="green",
            ))

        if comparison["removed_keywords"]:
            console.print(Panel(
                "[red]" + "  ".join(f"-{kw}" for kw in comparison["removed_keywords"]) + "[/red]",
                title="[bold]➖ 移除关键词[/bold]",
                border_style="red",
            ))

        console.print(Panel(
            comparison["estimated_improvement"]["expected_impact"],
            title="[bold]🎯 预估效果[/bold]",
            border_style="yellow",
        ))

    except ImportError:
        print("\n" + "=" * 60)
        print("  🔄 文案优化前后对比")
        print("=" * 60)
        print(f"  文本相似度: {comparison['text_similarity']}%")
        print(f"  预估效果: {comparison['estimated_improvement']['improvement_level']}")
        print(f"  预估CTR提升: +{comparison['estimated_improvement']['estimated_ctr_improvement_pct']}%")

        print(f"\n  📄 优化前:")
        print(f"    {comparison['original_copy']}")
        print(f"\n  ✨ 优化后:")
        print(f"    {comparison['optimized_copy']}")

        print(f"\n  📊 指标对比:")
        imp = comparison["improvement"]
        print(f"    营销词: {comparison['original_stats']['marketing_keywords']} → {comparison['optimized_stats']['marketing_keywords']} (+{imp['marketing_keywords_added']})")
        print(f"    情感词: {comparison['original_stats']['emotional_keywords']} → {comparison['optimized_stats']['emotional_keywords']} (+{imp['emotional_keywords_added']})")
        print(f"    紧迫感词: {comparison['original_stats']['urgency_keywords']} → {comparison['optimized_stats']['urgency_keywords']} (+{imp['urgency_keywords_added']})")
        print(f"    匹配率: {comparison['original_stats']['keyword_match_rate']} → {comparison['optimized_stats']['keyword_match_rate']} ({imp['match_rate_improvement']})")

        if comparison["added_keywords"]:
            print(f"\n  ➕ 新增: {', '.join(comparison['added_keywords'])}")
        if comparison["removed_keywords"]:
            print(f"  ➖ 移除: {', '.join(comparison['removed_keywords'])}")

        print(f"\n  🎯 {comparison['estimated_improvement']['expected_impact']}")


def interactive_mode(generator, rating_system, ab_tester, hashtag_recommender, competitor_analyzer, exporter):
    try:
        from rich.console import Console
        from rich.prompt import Prompt, IntPrompt, Confirm
        console = Console()
    except ImportError:
        console = None

    def ask(prompt_text, choices=None, default=None):
        if console:
            return Prompt.ask(prompt_text, choices=choices, default=default)
        if choices:
            print(f"{prompt_text} ({'/'.join(choices)}) [{'默认: ' + default if default else ''}]")
        else:
            print(f"{prompt_text} [{'默认: ' + default if default else ''}]")
        val = input("> ").strip()
        if not val and default:
            return default
        return val

    def ask_int(prompt_text, min_val=1, max_val=5, default=None):
        if console:
            return IntPrompt.ask(prompt_text, default=default)
        print(f"{prompt_text} ({min_val}-{max_val}) [{'默认: ' + str(default) if default else ''}]")
        val = input("> ").strip()
        try:
            return int(val)
        except ValueError:
            return default or 3

    def ask_confirm(prompt_text, default=True):
        if console:
            return Confirm.ask(prompt_text, default=default)
        print(f"{prompt_text} [{'Y/n' if default else 'y/N'}]")
        val = input("> ").strip().lower()
        if not val:
            return default
        return val in ("y", "yes", "是")

    all_results = []

    while True:
        print_banner(generator.force_template)
        product = ask("📦 请输入产品名称")
        if not product:
            print("产品名称不能为空！")
            continue

        selling_points_raw = ask("💡 请输入核心卖点（用/分隔，如：静音破壁/自动清洗/24小时预约）")
        selling_points = [p.strip() for p in selling_points_raw.split("/") if p.strip()]
        if not selling_points:
            selling_points = [p.strip() for p in selling_points_raw.split("、") if p.strip()]
        if not selling_points:
            selling_points = [selling_points_raw]

        competitor_analysis = None
        competitor_keywords = None
        original_copies_for_comparison = None

        if ask_confirm("🔍 是否提供竞品文案用于关键词优化？", default=False):
            competitor_text = ask("📝 请粘贴竞品文案")
            if competitor_text:
                competitor_analysis = competitor_analyzer.analyze(competitor_text)
                print_competitor_analysis(competitor_analysis)
                competitor_keywords = competitor_analyzer.get_optimized_keywords(competitor_text)
                if console:
                    console.print(f"\n✅ 已提取优化关键词: [yellow]{', '.join(competitor_keywords)}[/yellow]\n")
                else:
                    print(f"\n✅ 已提取优化关键词: {', '.join(competitor_keywords)}\n")

                if ask_confirm("📝 是否先生成无优化版文案用于对比？", default=True):
                    original_copies_for_comparison = []
                    print("\n📄 正在生成【优化前】文案...")

        platform = ask("📱 请选择平台", choices=["1", "2", "3", "4", "5"], default="5")
        platform_map = {"1": "小红书", "2": "淘宝", "3": "朋友圈", "4": "抖音", "5": "全部"}
        selected_platform = platform_map[platform]
        platforms = PLATFORMS if selected_platform == "全部" else [selected_platform]

        tone = ask("🎨 请选择语调", choices=["1", "2", "3", "4", "5"], default="5")
        tone_map = {"1": "亲切", "2": "专业", "3": "幽默", "4": "紧迫", "5": "全部"}
        selected_tone = tone_map[tone]
        tones = TONES if selected_tone == "全部" else [selected_tone]

        if original_copies_for_comparison is not None:
            for p in platforms:
                for t in tones:
                    orig_result = generator.generate(product, selling_points, p, t, None)
                    original_copies_for_comparison.append(orig_result)

        use_real_trending = ask_confirm("🔥 是否使用真实热门话题API？（需设置TWITTER_API_KEY）", default=False)

        results = []
        for p in platforms:
            for t in tones:
                result = generator.generate(product, selling_points, p, t, competitor_keywords)
                hashtags = hashtag_recommender.recommend(product, selling_points, p, 3, use_real_trending)
                result["hashtags"] = hashtags
                ctr_info = ab_tester.estimate_single_ctr(result)
                result["ctr_data"] = ctr_info
                result["estimated_ctr"] = ctr_info["estimated_ctr"]
                result["ctr_level"] = ctr_info["ctr_level"]
                results.append(result)
                all_results.append(result)

        print("\n")
        for i, result in enumerate(results, 1):
            if original_copies_for_comparison and i <= len(original_copies_for_comparison):
                orig = original_copies_for_comparison[i-1]
                if orig["platform"] == result["platform"] and orig["tone"] == result["tone"]:
                    comparison = competitor_analyzer.compare_copies(orig["copy"], result["copy"], competitor_analysis)
                    print_optimization_comparison(comparison)
            print_copy(result, i)

        if ask_confirm("⭐ 是否对文案进行评分？", default=True):
            for i, result in enumerate(results):
                rating = ask_int(f"  请为 #{i+1} ({result['platform']}·{result['tone']}) 评分 (1-5)", 1, 5, default=3)
                rated = rating_system.rate_copy(result, rating)
                result["rating"] = rating
            print(f"  ✅ 评分完成！高分文案(≥4分)已自动保存到模板库\n")

        if len(results) >= 2 and ask_confirm("🧪 是否进行A/B测试？", default=False):
            use_real_data = ask_confirm("  📊 是否使用真实实验数据？", default=False)
            idx_a = ask_int(f"  选择文案A编号 (1-{len(results)})", 1, len(results), default=1) - 1
            idx_b = ask_int(f"  选择文案B编号 (1-{len(results)})", 1, len(results), default=2) - 1
            idx_a = max(0, min(idx_a, len(results) - 1))
            idx_b = max(0, min(idx_b, len(results) - 1))

            if use_real_data:
                print("  📝 请输入真实实验数据:")
                impressions_a = ask_int("  文案A曝光量", 1, 9999999, default=10000)
                clicks_a = ask_int("  文案A点击量", 0, impressions_a, default=350)
                impressions_b = ask_int("  文案B曝光量", 1, 9999999, default=10000)
                clicks_b = ask_int("  文案B点击量", 0, impressions_b, default=420)
                try:
                    ab_result = ab_tester.analyze_real_data(
                        results[idx_a], results[idx_b],
                        impressions_a, impressions_b,
                        clicks_a, clicks_b
                    )
                    print_ab_test_result(ab_result)
                except ValueError as e:
                    print(f"  ❌ 数据校验失败: {e}")
            else:
                ab_result = ab_tester.simulate(results[idx_a], results[idx_b])
                print_ab_test_result(ab_result)

        if ask_confirm("💾 是否导出文案？", default=True):
            fmt = ask("📄 导出格式", choices=["1", "2", "3"], default="1")
            fmt_map = {"1": "markdown", "2": "excel", "3": "json"}
            output_dir = ask("📂 输出目录", default="./output")
            try:
                path = exporter.auto_export(results, output_dir, fmt_map[fmt])
                print(f"  ✅ 已导出到: {path}\n")
            except Exception as e:
                print(f"  ❌ 导出失败: {e}\n")

        if not ask_confirm("🔄 是否继续生成？", default=True):
            break

    template_count = rating_system.get_template_count()
    print(f"\n👋 感谢使用！本次共生成 {len(all_results)} 条文案，模板库已有 {template_count} 个高分模板。")


def main():
    parser = argparse.ArgumentParser(
        description="🤖 AI营销文案生成器 v2.0 - 支持多平台多语调文案生成",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "使用示例:\n"
            "  交互模式:          python -m ai_copywriter.cli\n"
            "  模板模式:          python -m ai_copywriter.cli --force-template ...\n"
            "  单条生成:          python -m ai_copywriter.cli -p 静音破壁机 -s 静音破壁/自动清洗/24小时预约\n"
            "  批量生成:          python -m ai_copywriter.cli --batch sample_products.csv\n"
            "  指定API Key:      python -m ai_copywriter.cli --api-key sk-xxx -p 产品 -s 卖点\n"
            "  竞品优化对比:     python -m ai_copywriter.cli -p 产品 -s 卖点 --competitor \"竞品文案\" --compare\n"
            "  A/B模拟测试:      python -m ai_copywriter.cli -p 产品 -s 卖点 --ab-test\n"
            "  A/B真实数据测试:  python -m ai_copywriter.cli -p 产品 -s 卖点 --ab-test --ab-real-data \\\n"
            "                   --ab-impressions-a 10000 --ab-clicks-a 350 \\\n"
            "                   --ab-impressions-b 10000 --ab-clicks-b 420\n"
            "  真实热门话题API:  export TWITTER_API_KEY=xxx && python -m ai_copywriter.cli -p 产品 -s 卖点 --use-real-trending\n"
            "  导出Excel:        python -m ai_copywriter.cli -p 产品 -s 卖点 --export excel\n"
        ),
    )

    parser.add_argument("-p", "--product", help="产品名称")
    parser.add_argument("-s", "--selling-points", help="核心卖点（用/分隔）")
    parser.add_argument("--platform", choices=PLATFORMS + ["全部"], default="全部", help="目标平台")
    parser.add_argument("--tone", choices=TONES + ["全部"], default="全部", help="语调风格")
    parser.add_argument("--batch", metavar="CSV_FILE", help="从CSV文件批量生成")
    parser.add_argument("--api-key", help="OpenAI API密钥（也可设置OPENAI_API_KEY环境变量）")
    parser.add_argument("--model", default="gpt-3.5-turbo", help="OpenAI模型名称")
    parser.add_argument("--force-template", action="store_true", help="强制使用模板模式（无需API Key）")
    parser.add_argument("--competitor", help="竞品文案文本（用于关键词优化）")
    parser.add_argument("--compare", action="store_true", help="对比展示优化前后文案差异")
    parser.add_argument("--export", choices=["markdown", "excel", "json"], help="导出格式")
    parser.add_argument("--output-dir", default="./output", help="导出目录")
    parser.add_argument("--no-hashtags", action="store_true", help="不推荐热门标签")
    parser.add_argument("--no-ctr", action="store_true", help="不计算点击率统计")
    parser.add_argument("--rate", action="store_true", help="交互式评分")
    parser.add_argument("--ab-test", action="store_true", help="进行A/B测试模拟")
    parser.add_argument("--ab-real-data", action="store_true", help="使用真实实验数据进行A/B测试")
    parser.add_argument("--ab-impressions-a", type=int, help="文案A的真实曝光量")
    parser.add_argument("--ab-impressions-b", type=int, help="文案B的真实曝光量")
    parser.add_argument("--ab-clicks-a", type=int, help="文案A的真实点击量")
    parser.add_argument("--ab-clicks-b", type=int, help="文案B的真实点击量")
    parser.add_argument("--use-real-trending", action="store_true", help="使用真实热门话题API（需设置TWITTER_API_KEY）")
    parser.add_argument("--confidence-level", type=float, default=0.95, help="置信水平 (默认: 0.95)")

    args = parser.parse_args()

    if not args.force_template:
        api_ok, api_msg = check_api_key(False)
        if not api_ok:
            print_banner(args.force_template)
            print("\n请先设置 API Key 后重试，或使用 --force-template 参数启用模板模式。")
            sys.exit(1)

    generator = CopyGenerator(api_key=args.api_key, model=args.model, force_template=args.force_template)
    batch_processor = BatchProcessor(generator)
    rating_system = RatingSystem()
    ab_tester = ABTester()
    hashtag_recommender = HashtagRecommender()
    competitor_analyzer = CompetitorAnalyzer()
    exporter = Exporter()

    if not args.product and not args.batch:
        interactive_mode(generator, rating_system, ab_tester, hashtag_recommender, competitor_analyzer, exporter)
        return

    print_banner(args.force_template)

    competitor_analysis = None
    competitor_keywords = None
    if args.competitor:
        competitor_analysis = competitor_analyzer.analyze(args.competitor)
        print_competitor_analysis(competitor_analysis)
        competitor_keywords = competitor_analyzer.get_optimized_keywords(args.competitor)
        print(f"\n✅ 已提取优化关键词: {', '.join(competitor_keywords)}\n")

    platforms = PLATFORMS if args.platform == "全部" else [args.platform]
    tones = TONES if args.tone == "全部" else [args.tone]

    if args.batch:
        print(f"📂 从CSV批量生成: {args.batch}")
        results = batch_processor.batch_generate(args.batch, platforms, tones, competitor_keywords)
    elif args.product and args.selling_points:
        selling_points = [p.strip() for p in args.selling_points.split("/") if p.strip()]
        if not selling_points:
            selling_points = [p.strip() for p in args.selling_points.split("、") if p.strip()]

        original_results_for_comparison = []
        if args.compare and competitor_keywords:
            print("\n📄 正在生成【优化前】文案...")
            for platform in platforms:
                for tone in tones:
                    orig_result = generator.generate(args.product, selling_points, platform, tone, None)
                    original_results_for_comparison.append(orig_result)

        results = []
        for platform in platforms:
            for tone in tones:
                result = generator.generate(args.product, selling_points, platform, tone, competitor_keywords)
                results.append(result)
    else:
        print("❌ 请提供产品名称(-p)和核心卖点(-s)，或使用--batch指定CSV文件")
        parser.print_help()
        return

    if args.compare and competitor_analysis and 'original_results_for_comparison' in locals() and original_results_for_comparison:
        for i, (orig, opt) in enumerate(zip(original_results_for_comparison, results)):
            comparison = competitor_analyzer.compare_copies(orig["copy"], opt["copy"], competitor_analysis)
            print_optimization_comparison(comparison)

    for result in results:
        if not args.no_hashtags:
            result["hashtags"] = hashtag_recommender.recommend(
                result["product"], result["selling_points"], result["platform"], 3, args.use_real_trending
            )
        if not args.no_ctr:
            ctr_info = ab_tester.estimate_single_ctr(result)
            result["ctr_data"] = ctr_info
            result["estimated_ctr"] = ctr_info["estimated_ctr"]
            result["ctr_level"] = ctr_info["ctr_level"]

    print(f"\n🚀 已生成 {len(results)} 条文案:\n")
    for i, result in enumerate(results, 1):
        print_copy(result, i, show_hashtag_reason=True)

    if args.rate:
        print("⭐ 评分模式 (1-5分):")
        for i, result in enumerate(results):
            try:
                rating = int(input(f"  #{i+1} ({result['platform']}·{result['tone']}) 评分: "))
                rating = max(1, min(5, rating))
            except (ValueError, EOFError):
                rating = 3
            rating_system.rate_copy(result, rating)
            result["rating"] = rating
        print("  ✅ 评分完成！高分文案已保存到模板库\n")

    if args.ab_test and len(results) >= 2:
        if args.ab_real_data:
            if args.ab_impressions_a is None or args.ab_impressions_b is None or args.ab_clicks_a is None or args.ab_clicks_b is None:
                print("⚠️  使用真实数据模式需要提供 --ab-impressions-a, --ab-impressions-b, --ab-clicks-a, --ab-clicks-b 参数")
                print("   例: --ab-real-data --ab-impressions-a 10000 --ab-clicks-a 350 --ab-impressions-b 10000 --ab-clicks-b 420")
            else:
                try:
                    ab_result = ab_tester.analyze_real_data(
                        results[0], results[1],
                        args.ab_impressions_a, args.ab_impressions_b,
                        args.ab_clicks_a, args.ab_clicks_b,
                        args.confidence_level
                    )
                    print_ab_test_result(ab_result)
                except ValueError as e:
                    print(f"❌ 真实数据校验失败: {e}")
        else:
            ab_result = ab_tester.simulate(results[0], results[1])
            print_ab_test_result(ab_result)

    if args.export:
        try:
            path = exporter.auto_export(results, args.output_dir, args.export)
            print(f"💾 已导出到: {path}")
        except Exception as e:
            print(f"❌ 导出失败: {e}")


if __name__ == "__main__":
    main()
