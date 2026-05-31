import os
import sys
from typing import List

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.text import Text
from rich.columns import Columns

from models import GenerationRequest, BatchGenerationRequest
from topic_generator import TopicGenerator
from output_formatter import OutputFormatter
from config import config

console = Console()


class PodcastCLI:
    def __init__(self):
        self.generator = TopicGenerator()
        self.current_topics = []
        self.current_keywords = ""

    def _mode_badge(self) -> str:
        if self.generator.is_mock_mode:
            return "[yellow][MOCK][/yellow]"
        return "[green][LLM][/green]"

    def _print_header(self):
        mode_str = "Mock模拟模式" if self.generator.is_mock_mode else "LLM API模式"
        mode_style = "yellow" if self.generator.is_mock_mode else "green"

        console.print(Panel.fit(
            f"[bold cyan]AI 播客选题生成器[/bold cyan]\n"
            f"运行模式: [{mode_style}]{mode_str}[/{mode_style}]",
            border_style="cyan"
        ))

        if self.generator.is_mock_mode:
            console.print(
                "[dim yellow]提示: 未配置API Key，使用Mock模拟数据。"
                "配置 .env 文件中的 OPENAI_API_KEY 可切换到真实LLM。[/dim yellow]"
            )

    def print_topics_table(self, topics=None, show_details=False):
        topics = topics or self.current_topics
        if not topics:
            console.print("[yellow]没有可显示的选题[/yellow]")
            return

        table = Table(title="播客选题列表", show_lines=True)
        table.add_column("#", style="cyan", width=3)
        table.add_column("ID", style="dim", width=8)
        table.add_column("标题", style="green", width=36)
        table.add_column("嘉宾类型", style="magenta", width=18)
        table.add_column("时长", style="yellow", width=12)
        table.add_column("反馈", style="blue", width=6)

        for i, topic in enumerate(topics, 1):
            feedback_icon = {
                'like': '👍',
                'dislike': '👎',
                'none': '⚪'
            }.get(topic.feedback, '⚪')

            table.add_row(
                str(i),
                topic.id,
                topic.title[:34] + ".." if len(topic.title) > 36 else topic.title,
                topic.guest_type,
                topic.duration,
                feedback_icon
            )

        console.print(table)

        if show_details:
            for i, topic in enumerate(topics, 1):
                outline_text = "\n".join(f"  • {item}" for item in topic.outline)
                console.print(Panel(
                    f"[bold]讨论大纲:[/bold]\n{outline_text}",
                    title=f"{i}. {topic.title}",
                    expand=False
                ))

    def interactive_generate(self):
        console.print(Panel.fit(
            f"{self._mode_badge()} [bold cyan]生成播客选题[/bold cyan]\n"
            "输入播客信息，生成选题方案",
            border_style="cyan"
        ))

        position = Prompt.ask("播客定位", default="科技趋势访谈")
        audience = Prompt.ask("目标听众", default="程序员、产品经理")
        keywords = Prompt.ask("热点关键词", default="大模型、AI Agent")
        count = int(Prompt.ask("生成数量", default="10"))

        style_file = Prompt.ask("历史高播放量选题文件(留空跳过)", default="")
        style_ref = style_file.strip() if style_file.strip() else None

        with console.status(f"[bold green]正在生成选题 {self._mode_badge()}..."):
            request = GenerationRequest(
                position=position,
                audience=audience,
                keywords=keywords,
                count=count,
                style_reference=style_ref
            )
            self.current_topics = self.generator.generate(request)
            self.current_keywords = keywords

        console.print(f"[green]✓ 成功生成 {len(self.current_topics)} 个选题[/green]")
        self.print_topics_table(show_details=True)
        self._post_generate_menu()

    def _post_generate_menu(self):
        while True:
            console.print(f"\n{self._mode_badge()} [bold]可选操作:[/bold]")
            console.print("  [1] 标记喜欢/不喜欢")
            console.print("  [2] 生成播出时间窗口")
            console.print("  [3] 生成任务清单")
            console.print("  [4] 导出选题")
            console.print("  [5] 重新生成")
            console.print("  [6] 返回主菜单")

            choice = Prompt.ask("请选择操作", choices=['1', '2', '3', '4', '5', '6'])

            if choice == '1':
                self._feedback_menu()
            elif choice == '2':
                self._add_broadcast_windows()
            elif choice == '3':
                self._add_tasks()
            elif choice == '4':
                self._export_menu()
            elif choice == '5':
                self.interactive_generate()
                break
            elif choice == '6':
                break

    def _feedback_menu(self):
        self.print_topics_table()
        idx = Prompt.ask("输入选题编号(0返回)", default="0")
        if idx == '0':
            return

        try:
            topic_idx = int(idx) - 1
            if 0 <= topic_idx < len(self.current_topics):
                topic = self.current_topics[topic_idx]
                feedback = Prompt.ask(
                    f"对 '{topic.title}' 的反馈",
                    choices=['like', 'dislike', 'none'],
                    default='none'
                )
                self.generator.set_feedback(topic.id, feedback)
                topic.feedback = feedback
                console.print(f"[green]✓ 已记录反馈: {feedback}[/green]")

                stats = self.generator.get_feedback_stats()
                if stats['style_learned']:
                    pref = self.generator.feedback_history.style_preference
                    console.print(f"[dim green]  风格已学习: {pref.tone}/{pref.structure} "
                                  f"标签: {', '.join(pref.preferred_tags[:3])}[/dim green]")
        except ValueError:
            console.print("[red]无效编号[/red]")

    def _add_broadcast_windows(self):
        with console.status(f"[bold green]正在计算播出时间窗口 {self._mode_badge()}..."):
            self.generator.add_broadcast_windows(self.current_keywords)

        console.print("[green]✓ 已生成播出时间窗口[/green]")
        table = Table(title="选题播出时间窗口", show_lines=True)
        table.add_column("#", style="cyan", width=3)
        table.add_column("标题", style="green", width=36)
        table.add_column("推荐播出窗口", style="magenta", width=28)

        for i, topic in enumerate(self.current_topics, 1):
            title = topic.title[:34] + ".." if len(topic.title) > 36 else topic.title
            table.add_row(str(i), title, topic.broadcast_window)

        console.print(table)

    def _add_tasks(self):
        with console.status(f"[bold green]正在生成任务清单 {self._mode_badge()}..."):
            self.generator.add_tasks()

        console.print("[green]✓ 已生成任务清单[/green]")
        for i, topic in enumerate(self.current_topics, 1):
            console.print(f"\n[bold]{i}. {topic.title}[/bold]")
            for task in topic.tasks:
                if task.startswith("[联系嘉宾]"):
                    icon = "📞"
                elif task.startswith("[查资料]"):
                    icon = "📚"
                elif task.startswith("[录制]"):
                    icon = "🎙️"
                else:
                    icon = "○"
                console.print(f"  {icon} [ ] {task}")

    def _export_menu(self):
        console.print("\n[bold]导出格式:[/bold]")
        console.print("  [1] Markdown 表格")
        console.print("  [2] JSON")
        console.print("  [3] Shownotes 草稿")
        console.print("  [4] 任务清单")
        console.print("  [5] 全部导出")

        fmt = Prompt.ask("请选择格式", choices=['1', '2', '3', '4', '5'])
        filename = Prompt.ask("输出文件名(不含扩展名)", default="podcast_topics")

        if fmt in ['1', '5']:
            md_content = OutputFormatter.to_markdown_table(self.current_topics)
            OutputFormatter.save_to_file(md_content, f"{filename}.md")
            console.print(f"[green]✓ 已导出 Markdown: {filename}.md[/green]")

        if fmt in ['2', '5']:
            json_content = OutputFormatter.to_json(self.current_topics)
            OutputFormatter.save_to_file(json_content, f"{filename}.json")
            console.print(f"[green]✓ 已导出 JSON: {filename}.json[/green]")

        if fmt in ['3', '5']:
            shownotes = OutputFormatter.to_shownotes(self.current_topics)
            OutputFormatter.save_to_file(shownotes, f"{filename}_shownotes.md")
            console.print(f"[green]✓ 已导出 Shownotes: {filename}_shownotes.md[/green]")

        if fmt in ['4', '5']:
            tasks = OutputFormatter.to_task_list(self.current_topics)
            OutputFormatter.save_to_file(tasks, f"{filename}_tasks.md")
            console.print(f"[green]✓ 已导出任务清单: {filename}_tasks.md[/green]")

    def batch_generate(self):
        console.print(Panel.fit(
            f"{self._mode_badge()} [bold cyan]批量生成选题方案[/bold cyan]\n"
            "输入多个定位，生成对比方案",
            border_style="cyan"
        ))

        requests = []
        num_schemes = int(Prompt.ask("要生成几套方案?", default="3"))

        default_positions = ["科技趋势访谈", "商业深度对话", "文化生活漫谈"]
        default_audiences = ["程序员、产品经理", "创业者、投资人", "文艺青年、城市白领"]
        default_keywords = ["大模型、AI Agent", "创业融资、出海", "数字游民、极简生活"]

        for i in range(num_schemes):
            console.print(f"\n[bold]方案 {i + 1}:[/bold]")
            dp = default_positions[i] if i < len(default_positions) else f"方案{i + 1}"
            da = default_audiences[i] if i < len(default_audiences) else "泛听众"
            dk = default_keywords[i] if i < len(default_keywords) else "热点话题"

            position = Prompt.ask(f"  播客定位", default=dp)
            audience = Prompt.ask(f"  目标听众", default=da)
            keywords = Prompt.ask(f"  热点关键词", default=dk)
            requests.append(GenerationRequest(
                position=position,
                audience=audience,
                keywords=keywords,
                count=5
            ))

        with console.status(f"[bold green]正在批量生成 {self._mode_badge()}..."):
            batch_req = BatchGenerationRequest(requests=requests, compare=True)
            all_topics, comparisons = self.generator.batch_generate(batch_req)

        console.print(f"[green]✓ 已生成 {len(all_topics)} 组方案[/green]")

        for i, topics in enumerate(all_topics):
            console.print(f"\n[bold]方案 {i + 1}: {requests[i].position}[/bold]")
            self.print_topics_table(topics=topics)

        if comparisons:
            report = OutputFormatter.comparison_report(comparisons)
            OutputFormatter.save_to_file(report, "comparison_report.md")
            console.print("[green]✓ 对比报告已保存到 comparison_report.md[/green]")

            console.print("\n[bold]评分汇总:[/bold]")
            score_table = Table(show_lines=True)
            score_table.add_column("方案", style="cyan")
            score_table.add_column("关键词匹配", style="green")
            score_table.add_column("听众适配", style="magenta")
            score_table.add_column("综合评分", style="yellow")
            for comp in comparisons:
                score_table.add_row(
                    comp.position,
                    str(comp.keyword_match_score),
                    str(comp.audience_fit_score),
                    str(comp.overall_score)
                )
            console.print(score_table)

    def load_history_style(self):
        default_path = os.path.join(os.path.dirname(__file__), "examples", "history_topics.json")
        prompt_default = default_path if os.path.exists(default_path) else ""

        history_file = Prompt.ask("历史高播放量选题文件路径", default=prompt_default)
        if not history_file.strip():
            console.print("[yellow]未输入文件路径，跳过[/yellow]")
            return
        if not os.path.exists(history_file):
            console.print(f"[red]文件不存在: {history_file}[/red]")
            return

        try:
            with console.status(f"[bold green]正在分析历史风格 {self._mode_badge()}..."):
                style_pref = self.generator.load_style_from_history(history_file)

            console.print("[green]✓ 已学习历史选题风格[/green]")
            style_table = Table(title="风格分析结果")
            style_table.add_column("维度", style="cyan")
            style_table.add_column("结果", style="green")
            style_table.add_row("标题偏好", style_pref.title_length)
            style_table.add_row("语气风格", style_pref.tone)
            style_table.add_row("结构偏好", style_pref.structure)
            style_table.add_row("偏好标签", ", ".join(style_pref.preferred_tags))
            console.print(style_table)
        except Exception as e:
            console.print(f"[red]分析失败: {e}[/red]")

    def show_stats(self):
        stats = self.generator.get_feedback_stats()
        table = Table(title="反馈统计", show_lines=True)
        table.add_column("统计项", style="cyan")
        table.add_column("数值", style="green")
        table.add_row("运行模式", "Mock模拟" if stats['mock_mode'] else "LLM API")
        table.add_row("喜欢的选题", str(stats['liked']))
        table.add_row("不喜欢的选题", str(stats['disliked']))
        table.add_row("风格学习完成", "是" if stats['style_learned'] else "否")
        console.print(table)

        if stats['style_learned']:
            pref = self.generator.feedback_history.style_preference
            console.print(f"[dim]当前风格偏好: {pref.tone}/{pref.structure} "
                          f"标签: {', '.join(pref.preferred_tags)}[/dim]")

    def main_menu(self):
        while True:
            console.clear()
            self._print_header()

            console.print("\n[bold]主菜单:[/bold]")
            console.print("  [1] 生成选题（交互式）")
            console.print("  [2] 批量生成并对比（默认3套方案）")
            console.print("  [3] 从历史选题学习风格")
            console.print("  [4] 查看反馈统计")
            console.print("  [5] 退出")

            choice = Prompt.ask("请选择", choices=['1', '2', '3', '4', '5'])

            if choice == '1':
                self.interactive_generate()
            elif choice == '2':
                self.batch_generate()
            elif choice == '3':
                self.load_history_style()
                Prompt.ask("\n按回车继续...")
            elif choice == '4':
                self.show_stats()
                Prompt.ask("\n按回车继续...")
            elif choice == '5':
                console.print("[green]再见！[/green]")
                break


@click.command()
@click.option('--position', '-p', help='播客定位')
@click.option('--audience', '-a', help='目标听众')
@click.option('--keywords', '-k', help='热点关键词')
@click.option('--count', '-n', default=10, help='生成数量')
@click.option('--format', '-f', 'fmt', type=click.Choice(['md', 'json', 'shownotes']), help='输出格式')
@click.option('--output', '-o', help='输出文件')
def main(position, audience, keywords, count, fmt, output):
    cli = PodcastCLI()

    if all([position, audience, keywords]):
        request = GenerationRequest(
            position=position,
            audience=audience,
            keywords=keywords,
            count=count
        )
        topics = cli.generator.generate(request)

        if fmt == 'md':
            content = OutputFormatter.to_markdown_table(topics)
        elif fmt == 'json':
            content = OutputFormatter.to_json(topics)
        elif fmt == 'shownotes':
            content = OutputFormatter.to_shownotes(topics)
        else:
            content = OutputFormatter.to_markdown_table(topics)

        if output:
            OutputFormatter.save_to_file(content, output)
            click.echo(f"已导出到 {output}")
        else:
            click.echo(content)
        return

    cli.main_menu()


if __name__ == '__main__':
    main()
