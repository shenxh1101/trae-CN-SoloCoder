#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import click
from colorama import init, Fore, Style
from tabulate import tabulate

from title_generator import TitleGenerator
from predictor import PerformancePredictor
from seo_analyzer import SEOAnalyzer
from style_learner import StyleLearner
from ab_test_generator import ABTestGenerator
from data_exporter import DataExporter, FeedbackManager
from clipboard_utils import ClipboardManager

init(autoreset=True)


class TitleGeneratorCLI:
    def __init__(self):
        self.generator = TitleGenerator()
        self.predictor = PerformancePredictor()
        self.seo_analyzer = SEOAnalyzer()
        self.style_learner = StyleLearner()
        self.ab_generator = ABTestGenerator()
        self.exporter = DataExporter()
        self.feedback_manager = FeedbackManager()
        self.clipboard = ClipboardManager()
        
        self.current_results = []
        self.current_ab_test = None
        self.learned_style = False
        self.user_weights_applied = False
        
        self._apply_user_weights()

    def _apply_user_weights(self):
        features = self.feedback_manager.get_weighted_features()
        if features["total_feedback"] >= 5:
            self.generator.apply_user_weights(features)
            self.predictor.enable_user_feedback(features)
            self.user_weights_applied = True

    def print_banner(self):
        banner = f"""
{Fore.CYAN}{Style.BRIGHT}
╔══════════════════════════════════════════════════════════════╗
║                    AI 自媒体标题生成器                        ║
║              AI Media Title Generator v2.0                   ║
║          ✨ 用户反馈优化版 | 智能权重学习                     ║
╚══════════════════════════════════════════════════════════════╝
{Style.RESET_ALL}
"""
        click.echo(banner)
        
        if self.user_weights_applied:
            features = self.feedback_manager.get_weighted_features()
            click.echo(f"{Fore.MAGENTA}📊 已加载用户反馈优化 ({features['total_feedback']}条反馈, {features['high_rated_count']}条高评分){Style.RESET_ALL}\n")

    def print_platforms(self):
        platforms = self.generator.get_platforms()
        click.echo(f"\n{Fore.YELLOW}【支持的平台】{Style.RESET_ALL}")
        for key, config in platforms.items():
            click.echo(f"  {Fore.GREEN}{key}{Style.RESET_ALL} - {config['name']}: {config['description']}")

    def generate_titles(
        self,
        topic: str,
        platform: str = "wechat",
        count: int = 5,
        use_style: bool = False,
        add_seo: bool = False,
    ):
        click.echo(f"\n{Fore.CYAN}正在生成标题...{Style.RESET_ALL}")
        click.echo(f"主题: {Fore.GREEN}{topic}{Style.RESET_ALL}")
        click.echo(f"平台: {Fore.GREEN}{self.generator.templates[platform]['name']}{Style.RESET_ALL}")
        click.echo(f"数量: {Fore.GREEN}{count}{Style.RESET_ALL}")
        
        if self.user_weights_applied:
            click.echo(f"{Fore.MAGENTA}✨ 已启用用户反馈智能优化{Style.RESET_ALL}")

        if use_style and self.learned_style:
            click.echo(f"{Fore.MAGENTA}已启用自定义风格生成{Style.RESET_ALL}")
            titles = self.style_learner.generate_similar_titles(
                topic, self.generator, count
            )
        else:
            titles = self.generator.generate_titles(topic, platform, count)

        results = []
        for i, title in enumerate(titles, 1):
            prediction = self.predictor.predict(title, platform)
            
            seo_data = None
            if add_seo:
                seo_analysis = self.seo_analyzer.analyze_topic(topic)
                seo_data = {
                    "keywords": [hw["keyword"] for hw in seo_analysis["hot_words"]][:3],
                    "score": self.seo_analyzer._calculate_seo_score(title, topic)
                }
                title, inserted = self.seo_analyzer.insert_keywords(title, topic)
                if inserted:
                    click.echo(f"  {Fore.YELLOW}已插入SEO关键词: {', '.join(inserted)}{Style.RESET_ALL}")

            result = {
                "index": i,
                "title": title,
                "topic": topic,
                "platform": platform,
                "prediction": prediction,
                "seo": seo_data,
                "user_rating": None
            }
            results.append(result)

        self.current_results = results
        self._display_results(results)
        return results

    def _display_results(self, results):
        click.echo(f"\n{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}")
        header = f"{'序号':<4} {'标题':<45} {'点击率':>6} {'分享率':>6} {'互动率':>6} {'综合':>6}"
        if self.user_weights_applied:
            header += f" {'优化':>4}"
        click.echo(f"{Fore.CYAN}{header}{Style.RESET_ALL}")
        click.echo(f"{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}")

        for r in results:
            pred = r["prediction"]
            stars = ""
            if r["user_rating"]:
                stars = f" {'⭐' * r['user_rating']}"
            
            title_display = r["title"]
            if len(title_display) > 43:
                title_display = title_display[:40] + "..."
            
            color = Fore.GREEN if pred["composite_score"] >= 7 else (Fore.YELLOW if pred["composite_score"] >= 5 else Fore.RED)
            
            weighted_marker = " ✓" if pred.get("is_weighted", False) else ""
            
            click.echo(
                f"{r['index']:<4} {title_display:<45} "
                f"{color}{pred['ctr']:>5.1f}%{Style.RESET_ALL} "
                f"{color}{pred['share_rate']:>5.1f}%{Style.RESET_ALL} "
                f"{color}{pred['interaction_rate']:>5.1f}%{Style.RESET_ALL} "
                f"{color}{pred['composite_score']:>5.1f}{Style.RESET_ALL}"
                f"{weighted_marker}"
                f"{stars}"
            )

        click.echo(f"{Fore.CYAN}{'=' * 80}{Style.RESET_ALL}")

    def learn_style_from_file(self, filepath: str):
        if not os.path.exists(filepath):
            click.echo(f"{Fore.RED}错误: 文件不存在 {filepath}{Style.RESET_ALL}")
            return False

        try:
            click.echo(f"\n{Fore.CYAN}正在分析标题风格...{Style.RESET_ALL}")
            summary = self.style_learner.load_from_file(filepath)
            
            click.echo(f"\n{Fore.GREEN}风格分析完成！{Style.RESET_ALL}")
            click.echo(f"分析标题数量: {summary['total_titles']}")
            click.echo(f"平均标题长度: {summary['average_length']}")
            click.echo(f"疑问句比例: {summary['question_ratio']}%")
            click.echo(f"感叹句比例: {summary['exclamation_ratio']}%")
            click.echo(f"数字标题比例: {summary['number_ratio']}%")
            click.echo(f"提取高频关键词: {', '.join(summary['top_keywords'][:10])}")
            click.echo(f"学习到的模板数量: {summary['template_count']}")
            
            self.learned_style = True
            self.generator.learn_style(
                [line.strip() for line in open(filepath, "r", encoding="utf-8") if line.strip()]
            )
            
            return True
        except Exception as e:
            click.echo(f"{Fore.RED}分析失败: {str(e)}{Style.RESET_ALL}")
            return False

    def generate_ab_test(self, topic: str, platform: str = "wechat"):
        click.echo(f"\n{Fore.CYAN}正在生成A/B测试标题对...{Style.RESET_ALL}")
        
        test_plan = self.ab_generator.generate_test_plan(
            topic, self.generator, self.predictor, platform
        )

        self.current_ab_test = test_plan

        click.echo(f"\n{Fore.YELLOW}【A/B测试方案】{Style.RESET_ALL}")
        click.echo(f"主题: {topic}")
        click.echo(f"测试维度数: {len(test_plan['test_pairs'])}")
        click.echo(f"标题变体总数: {test_plan['total_variants']}")
        
        click.echo(f"\n{Fore.GREEN}预计表现最佳: {test_plan['top_performer']['title']}{Style.RESET_ALL}")
        click.echo(f"综合评分: {test_plan['top_performer']['prediction']['composite_score']:.2f}")

        for i, pair in enumerate(test_plan["test_pairs"], 1):
            click.echo(f"\n{Fore.CYAN}{'─' * 80}{Style.RESET_ALL}")
            click.echo(f"测试 {pair['test_id']}: {pair['dimension']} {Fore.LIGHTBLACK_EX}[输入 'copy {i}' 复制此对]{Style.RESET_ALL}")
            click.echo(f"{Fore.GREEN}A: {pair['title_a']}{Style.RESET_ALL}")
            click.echo(f"   CTR:{pair['prediction_a']['ctr']:.1f}% 分享:{pair['prediction_a']['share_rate']:.1f}% 互动:{pair['prediction_a']['interaction_rate']:.1f}%")
            click.echo(f"{Fore.MAGENTA}B: {pair['title_b']}{Style.RESET_ALL}")
            click.echo(f"   CTR:{pair['prediction_b']['ctr']:.1f}% 分享:{pair['prediction_b']['share_rate']:.1f}% 互动:{pair['prediction_b']['interaction_rate']:.1f}%")
            click.echo(f"{Fore.YELLOW}💡 建议: {pair['recommendation']}{Style.RESET_ALL}")

        click.echo(f"\n{Fore.CYAN}{test_plan['testing_guide']}{Style.RESET_ALL}")
        
        return test_plan

    def copy_ab_test_pair(self, test_id: int = None):
        if not self.current_ab_test:
            click.echo(f"{Fore.RED}没有可复制的A/B测试，请先生成A/B测试{Style.RESET_ALL}")
            return False

        if not self.clipboard.available and not self.clipboard.use_macos_native:
            click.echo(f"{Fore.YELLOW}⚠️  剪贴板功能不可用（需要安装pyperclip）{Style.RESET_ALL}")
            click.echo(f"{Fore.YELLOW}   请运行: pip install pyperclip{Style.RESET_ALL}")
            return False

        if test_id is None:
            success = self.clipboard.copy_all_ab_tests(
                self.current_ab_test["test_pairs"],
                include_predictions=True
            )
            if success:
                click.echo(f"{Fore.GREEN}✅ 已将所有A/B测试方案复制到剪贴板！{Style.RESET_ALL}")
                return True
        else:
            for pair in self.current_ab_test["test_pairs"]:
                if pair["test_id"] == test_id:
                    success = self.clipboard.copy_ab_test_pair(
                        pair["title_a"], pair["title_b"]
                    )
                    if success:
                        click.echo(f"{Fore.GREEN}✅ 已将测试 {test_id} 标题对复制到剪贴板！{Style.RESET_ALL}")
                        click.echo(f"  A: {pair['title_a']}")
                        click.echo(f"  B: {pair['title_b']}")
                        return True
            click.echo(f"{Fore.RED}找不到测试ID: {test_id}{Style.RESET_ALL}")
        
        return False

    def copy_title(self, index: int):
        if not self.current_results:
            click.echo(f"{Fore.RED}没有可复制的标题，请先生成标题{Style.RESET_ALL}")
            return False

        if not self.clipboard.available and not self.clipboard.use_macos_native:
            click.echo(f"{Fore.YELLOW}⚠️  剪贴板功能不可用（需要安装pyperclip）{Style.RESET_ALL}")
            return False

        if index < 1 or index > len(self.current_results):
            click.echo(f"{Fore.RED}无效的序号，请输入1-{len(self.current_results)}{Style.RESET_ALL}")
            return False

        title = self.current_results[index - 1]["title"]
        success = self.clipboard.copy_single_title(title)
        
        if success:
            click.echo(f"{Fore.GREEN}✅ 已复制到剪贴板！{Style.RESET_ALL}")
            click.echo(f"  {title}")
            
            if self.clipboard.use_macos_native:
                click.echo(f"{Fore.LIGHTBLACK_EX}   (使用 macOS 原生剪贴板){Style.RESET_ALL}")
            return True
        else:
            click.echo(f"{Fore.RED}复制失败{Style.RESET_ALL}")
            return False

    def seo_analysis(self, topic: str):
        click.echo(f"\n{Fore.CYAN}正在进行SEO关键词分析...{Style.RESET_ALL}")
        
        analysis = self.seo_analyzer.analyze_topic(topic)
        
        click.echo(f"\n{Fore.YELLOW}【SEO分析报告】{Style.RESET_ALL}")
        click.echo(f"主题: {topic}")
        click.echo(f"分词结果: {' / '.join(analysis['segments'])}")
        
        if analysis["hot_words"]:
            click.echo(f"\n{Fore.GREEN}发现的热门关键词:{Style.RESET_ALL}")
            for hw in analysis["hot_words"]:
                click.echo(f"  • {hw['keyword']} ({hw['category']})")
        else:
            click.echo(f"\n{Fore.YELLOW}未发现匹配的热门关键词，建议使用通用关键词{Style.RESET_ALL}")

        if analysis["recommendations"]:
            click.echo(f"\n{Fore.GREEN}SEO标题推荐:{Style.RESET_ALL}")
            for i, rec in enumerate(analysis["recommendations"][:5], 1):
                click.echo(f"  {i}. {rec['title']} (SEO评分: {rec['seo_score']:.0f})")

        seo_titles = self.seo_analyzer.generate_seo_titles(topic, 5)
        click.echo(f"\n{Fore.GREEN}SEO优化标题:{Style.RESET_ALL}")
        for i, st in enumerate(seo_titles, 1):
            click.echo(f"  {i}. {st['title']} (关键词: {st['keyword']}, 评分: {st['seo_score']:.0f})")
        
        return analysis

    def batch_process(self, input_file: str, platform: str = "wechat", output_file: str = None):
        if not os.path.exists(input_file):
            click.echo(f"{Fore.RED}错误: 输入文件不存在 {input_file}{Style.RESET_ALL}")
            return

        try:
            with open(input_file, "r", encoding="utf-8") as f:
                topics = [line.strip() for line in f if line.strip()]

            if not topics:
                click.echo(f"{Fore.RED}错误: 输入文件中没有有效主题{Style.RESET_ALL}")
                return

            click.echo(f"\n{Fore.CYAN}开始批量处理 {len(topics)} 个主题...{Style.RESET_ALL}")

            all_results = []
            for i, topic in enumerate(topics, 1):
                click.echo(f"\n{Fore.YELLOW}[{i}/{len(topics)}] 处理主题: {topic}{Style.RESET_ALL}")
                
                titles = self.generator.generate_titles(topic, platform, 5)
                for title in titles:
                    pred = self.predictor.predict(title, platform)
                    all_results.append({
                        "title": title,
                        "topic": topic,
                        "platform": platform,
                        "prediction": pred,
                        "user_rating": None
                    })

            click.echo(f"\n{Fore.GREEN}批量处理完成！共生成 {len(all_results)} 个标题{Style.RESET_ALL}")

            if output_file:
                csv_path = self.exporter.export_to_csv(all_results, output_file)
                click.echo(f"{Fore.GREEN}结果已导出到: {csv_path}{Style.RESET_ALL}")
            else:
                export_path = self.exporter.export_to_csv(all_results)
                click.echo(f"{Fore.GREEN}结果已导出到: {export_path}{Style.RESET_ALL}")

            return all_results

        except Exception as e:
            click.echo(f"{Fore.RED}批量处理失败: {str(e)}{Style.RESET_ALL}")
            return None

    def export_results(self, results=None, format: str = "csv", ab_test_plan=None):
        if results is None:
            results = self.current_results

        if not results and not ab_test_plan:
            click.echo(f"{Fore.RED}没有可导出的数据，请先生成标题{Style.RESET_ALL}")
            return

        try:
            if ab_test_plan:
                filepath = self.exporter.export_ab_test_to_csv(ab_test_plan)
            elif format == "csv":
                filepath = self.exporter.export_to_csv(results)
            else:
                filepath = self.exporter.export_to_json(results)

            click.echo(f"{Fore.GREEN}数据已导出到: {filepath}{Style.RESET_ALL}")
            return filepath
        except Exception as e:
            click.echo(f"{Fore.RED}导出失败: {str(e)}{Style.RESET_ALL}")
            return None

    def rate_title(self, index: int, rating: int, note: str = ""):
        if not self.current_results:
            click.echo(f"{Fore.RED}没有可评分的标题，请先生成标题{Style.RESET_ALL}")
            return

        if index < 1 or index > len(self.current_results):
            click.echo(f"{Fore.RED}无效的序号，请输入1-{len(self.current_results)}{Style.RESET_ALL}")
            return

        if not 1 <= rating <= 5:
            click.echo(f"{Fore.RED}评分必须在1-5之间{Style.RESET_ALL}")
            return

        result = self.current_results[index - 1]
        result["user_rating"] = rating

        feedback = self.feedback_manager.add_feedback(
            result["title"],
            result["topic"],
            result["platform"],
            rating,
            note
        )

        click.echo(f"{Fore.GREEN}评分已保存！{Style.RESET_ALL}")
        click.echo(f"标题: {result['title']}")
        click.echo(f"评分: {'⭐' * rating} ({rating}/5)")
        if note:
            click.echo(f"备注: {note}")

        self._apply_user_weights()
        if self.user_weights_applied:
            click.echo(f"{Fore.MAGENTA}✨ 用户反馈权重已更新，下次生成将使用优化后的算法{Style.RESET_ALL}")

        return feedback

    def show_feedback_stats(self):
        stats = self.feedback_manager.get_stats()
        features = self.feedback_manager.get_weighted_features()
        
        if not stats:
            click.echo(f"{Fore.YELLOW}暂无用户反馈数据{Style.RESET_ALL}")
            return

        click.echo(f"\n{Fore.YELLOW}【用户反馈统计】{Style.RESET_ALL}")
        click.echo(f"总反馈数: {stats.get('total_feedback', 0)}")
        click.echo(f"平均评分: {stats.get('average_rating', 0):.2f}")
        click.echo(f"高评分标题数: {features.get('high_rated_count', 0)}")
        
        if features.get("total_feedback", 0) >= 5:
            click.echo(f"\n{Fore.MAGENTA}📊 已学习到的特征:{Style.RESET_ALL}")
            click.echo(f"  最佳标题长度: {features['avg_length']:.1f} 字")
            click.echo(f"  疑问句偏好: {features['question_ratio']*100:.0f}%")
            click.echo(f"  感叹号偏好: {features['exclamation_ratio']*100:.0f}%")
            click.echo(f"  数字偏好: {features['number_ratio']*100:.0f}%")
            click.echo(f"  主导结构: {features['dominant_structure']}")
            
            if features["word_weights"]:
                top_words = sorted(
                    features["word_weights"].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:8]
                click.echo(f"  高权重关键词: {', '.join([f'{w}({s:.1f})' for w, s in top_words])}")

        if "platform_stats" in stats:
            click.echo(f"\n{Fore.GREEN}各平台表现:{Style.RESET_ALL}")
            for platform, data in stats["platform_stats"].items():
                click.echo(f"  {platform}: {data['count']}条反馈, 平均{data['avg_rating']:.2f}分")

        if "high_rated_templates" in stats and stats["high_rated_templates"]:
            click.echo(f"\n{Fore.GREEN}高评分模板（已应用到生成器）:{Style.RESET_ALL}")
            for template in stats["high_rated_templates"][:5]:
                click.echo(f"  • {template}")

        return stats

    def interactive_mode(self):
        self.print_banner()
        self.print_platforms()

        click.echo(f"\n{Fore.CYAN}欢迎使用交互式模式！输入 'help' 查看命令，输入 'quit' 退出{Style.RESET_ALL}")

        current_platform = "wechat"

        while True:
            try:
                platform_name = self.generator.templates[current_platform]['name']
                weight_indicator = " ✨" if self.user_weights_applied else ""
                click.echo(f"\n{Fore.CYAN}{Style.BRIGHT}[{platform_name}]{weight_indicator} > {Style.RESET_ALL}", nl=False)
                cmd = input().strip()

                if not cmd:
                    continue

                if cmd.lower() in ["quit", "exit", "q"]:
                    click.echo(f"{Fore.GREEN}感谢使用，再见！{Style.RESET_ALL}")
                    break

                if cmd.lower() == "help":
                    self._print_help()
                    continue

                if cmd.lower() == "platforms":
                    self.print_platforms()
                    continue

                if cmd.lower().startswith("platform "):
                    new_platform = cmd.split(" ", 1)[1].strip()
                    if new_platform in self.generator.templates:
                        current_platform = new_platform
                        click.echo(f"{Fore.GREEN}已切换到平台: {self.generator.templates[current_platform]['name']}{Style.RESET_ALL}")
                    else:
                        click.echo(f"{Fore.RED}不支持的平台，可用平台: {list(self.generator.templates.keys())}{Style.RESET_ALL}")
                    continue

                if cmd.lower().startswith("learn "):
                    filepath = cmd.split(" ", 1)[1].strip()
                    self.learn_style_from_file(filepath)
                    continue

                if cmd.lower().startswith("seo "):
                    topic = cmd.split(" ", 1)[1].strip()
                    self.seo_analysis(topic)
                    continue

                if cmd.lower().startswith("ab "):
                    topic = cmd.split(" ", 1)[1].strip()
                    self.generate_ab_test(topic, current_platform)
                    continue

                if cmd.lower().startswith("copy "):
                    parts = cmd.split(" ")
                    if len(parts) >= 2:
                        if parts[1].lower() == "ab":
                            test_id = int(parts[2]) if len(parts) >= 3 else None
                            self.copy_ab_test_pair(test_id)
                        else:
                            try:
                                index = int(parts[1])
                                self.copy_title(index)
                            except ValueError:
                                click.echo(f"{Fore.RED}用法: copy <序号> 或 copy ab [测试ID]{Style.RESET_ALL}")
                    continue

                if cmd.lower() == "copy ab":
                    self.copy_ab_test_pair()
                    continue

                if cmd.lower().startswith("batch "):
                    parts = cmd.split(" ")
                    if len(parts) >= 2:
                        input_file = parts[1]
                        output_file = parts[2] if len(parts) >= 3 else None
                        self.batch_process(input_file, current_platform, output_file)
                    continue

                if cmd.lower().startswith("rate "):
                    parts = cmd.split(" ")
                    if len(parts) >= 3:
                        try:
                            index = int(parts[1])
                            rating = int(parts[2])
                            note = " ".join(parts[3:]) if len(parts) > 3 else ""
                            self.rate_title(index, rating, note)
                        except ValueError:
                            click.echo(f"{Fore.RED}用法: rate <序号> <评分1-5> [备注]{Style.RESET_ALL}")
                    continue

                if cmd.lower() == "export":
                    self.export_results()
                    continue

                if cmd.lower() == "stats":
                    self.show_feedback_stats()
                    continue

                if cmd.lower() == "show":
                    if self.current_results:
                        self._display_results(self.current_results)
                    else:
                        click.echo(f"{Fore.YELLOW}暂无生成结果{Style.RESET_ALL}")
                    continue

                if cmd.lower() == "refresh":
                    self._apply_user_weights()
                    if self.user_weights_applied:
                        click.echo(f"{Fore.GREEN}已重新加载用户反馈权重{Style.RESET_ALL}")
                    else:
                        click.echo(f"{Fore.YELLOW}用户反馈不足，需要至少5条反馈才能启用权重优化{Style.RESET_ALL}")
                    continue

                self.generate_titles(cmd, current_platform, count=5)

            except KeyboardInterrupt:
                click.echo(f"\n{Fore.YELLOW}输入 'quit' 退出程序{Style.RESET_ALL}")
            except Exception as e:
                click.echo(f"{Fore.RED}错误: {str(e)}{Style.RESET_ALL}")
                import traceback
                traceback.print_exc()

    def _print_help(self):
        help_text = f"""
{Fore.YELLOW}【可用命令】{Style.RESET_ALL}
  {Fore.GREEN}<主题>{Style.RESET_ALL}              直接输入主题生成标题
  {Fore.GREEN}platforms{Style.RESET_ALL}            查看支持的平台列表
  {Fore.GREEN}platform <平台>{Style.RESET_ALL}      切换当前平台 (wechat/toutiao/bilibili)
  {Fore.GREEN}learn <文件路径>{Style.RESET_ALL}    从文件学习标题风格
  {Fore.GREEN}seo <主题>{Style.RESET_ALL}          进行SEO关键词分析
  {Fore.GREEN}ab <主题>{Style.RESET_ALL}           生成A/B测试标题对
  {Fore.GREEN}copy <序号>{Style.RESET_ALL}         复制指定序号的标题
  {Fore.GREEN}copy ab [测试ID]{Style.RESET_ALL}    复制A/B测试标题对
  {Fore.GREEN}batch <输入文件> [输出文件]{Style.RESET_ALL}  批量处理主题
  {Fore.GREEN}rate <序号> <评分> [备注]{Style.RESET_ALL}  为标题评分(1-5星)
  {Fore.GREEN}show{Style.RESET_ALL}                 显示上次生成结果
  {Fore.GREEN}export{Style.RESET_ALL}               导出当前结果为CSV
  {Fore.GREEN}stats{Style.RESET_ALL}                查看用户反馈统计
  {Fore.GREEN}refresh{Style.RESET_ALL}              刷新用户反馈权重
  {Fore.GREEN}help{Style.RESET_ALL}                 显示帮助信息
  {Fore.GREEN}quit/exit/q{Style.RESET_ALL}         退出程序

{Fore.CYAN}【示例】{Style.RESET_ALL}
  > 为什么年轻人开始拒绝加班
  > platform bilibili
  > learn my_titles.txt
  > seo 人工智能
  > ab 副业赚钱
  > copy 1
  > copy ab 2
  > batch topics.txt output.csv
  > rate 1 5 这个标题很吸引人
  > refresh

{Fore.MAGENTA}✨ 新功能{Style.RESET_ALL}
  • 用户反馈智能优化: 评分高的标题风格会被优先使用
  • 一键复制: 直接复制标题到剪贴板
  • 加权预测: 基于历史反馈调整预测分数
"""
        click.echo(help_text)


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """AI自媒体标题生成器 v2.0 - 智能生成爆款标题，支持用户反馈优化"""
    if ctx.invoked_subcommand is None:
        app = TitleGeneratorCLI()
        app.interactive_mode()


@cli.command()
@click.argument("topic")
@click.option("--platform", "-p", default="wechat", help="平台: wechat/toutiao/bilibili")
@click.option("--count", "-n", default=5, help="生成标题数量")
@click.option("--style", "-s", is_flag=True, help="使用学习到的风格")
@click.option("--seo", is_flag=True, help="添加SEO关键词")
@click.option("--export", "-e", is_flag=True, help="导出为CSV")
def generate(topic, platform, count, style, seo, export):
    """生成标题"""
    app = TitleGeneratorCLI()
    results = app.generate_titles(topic, platform, count, style, seo)
    
    if export and results:
        app.export_results(results)


@cli.command()
@click.argument("filepath")
def learn(filepath):
    """从文件学习标题风格"""
    app = TitleGeneratorCLI()
    app.learn_style_from_file(filepath)


@cli.command()
@click.argument("topic")
def seo(topic):
    """SEO关键词分析"""
    app = TitleGeneratorCLI()
    app.seo_analysis(topic)


@cli.command()
@click.argument("topic")
@click.option("--platform", "-p", default="wechat", help="平台")
@click.option("--copy", "-c", is_flag=True, help="直接复制到剪贴板")
def abtest(topic, platform, copy):
    """生成A/B测试标题对"""
    app = TitleGeneratorCLI()
    test_plan = app.generate_ab_test(topic, platform)
    
    if copy:
        app.copy_ab_test_pair()
    else:
        click.echo("\n是否导出A/B测试方案? (y/n): ", nl=False)
        if input().strip().lower() == "y":
            app.export_results(ab_test_plan=test_plan)


@cli.command()
@click.argument("input_file")
@click.option("--platform", "-p", default="wechat", help="平台")
@click.option("--output", "-o", help="输出文件路径")
def batch(input_file, platform, output):
    """批量处理主题文件"""
    app = TitleGeneratorCLI()
    app.batch_process(input_file, platform, output)


@cli.command()
@click.argument("index", type=int)
@click.argument("rating", type=int)
@click.argument("topic")
@click.argument("title")
@click.argument("platform", default="wechat")
@click.option("--note", default="", help="备注")
def rate(index, rating, topic, title, platform, note):
    """为标题评分（用于交互式后的离线评分）"""
    app = TitleGeneratorCLI()
    app.feedback_manager.add_feedback(title, topic, platform, rating, note)
    click.echo(f"{Fore.GREEN}评分已保存！{Style.RESET_ALL}")


@cli.command()
def stats():
    """查看用户反馈统计"""
    app = TitleGeneratorCLI()
    app.show_feedback_stats()


if __name__ == "__main__":
    cli()
