#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

console = Console()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from storyboard_generator import StoryboardGenerator
from exporter import StoryboardExporter
from batch_processor import BatchProcessor
from image_analyzer import ImageStyleAnalyzer
from pace_analyzer import PaceAnalyzer
from storyboard_html import HTMLStoryboardGenerator


class StoryboardCLI:
    def __init__(self):
        self.generator = None
        self.exporter = StoryboardExporter()
        self.pace_analyzer = PaceAnalyzer()
        self.html_generator = HTMLStoryboardGenerator()
        self.image_analyzer = ImageStyleAnalyzer()
        self.batch_processor = None
        self.current_storyboard = None

    def init_generator(self):
        try:
            self.generator = StoryboardGenerator()
            self.batch_processor = BatchProcessor(self.generator, self.exporter)
            return True
        except Exception as e:
            console.print(f"[red]初始化失败: {e}[/red]")
            console.print("[yellow]请确保已配置 OPENAI_API_KEY 环境变量[/yellow]")
            return False

    def print_storyboard_table(self, storyboard):
        table = Table(show_header=True, header_style="bold magenta", title=f"🎬 {storyboard['title']}")
        table.add_column("镜头", style="dim", width=6)
        table.add_column("景别", width=8)
        table.add_column("画面描述", width=40)
        table.add_column("台词/旁白", width=25)
        table.add_column("时长", width=8)
        table.add_column("节奏", width=8)
        table.add_column("转场", width=10)

        for shot in storyboard['shots']:
            table.add_row(
                str(shot.shot_number),
                shot.shot_type,
                shot.description[:37] + "..." if len(shot.description) > 40 else shot.description,
                shot.dialogue[:22] + "..." if len(shot.dialogue) > 25 else shot.dialogue,
                f"{shot.duration}秒",
                shot.pace,
                shot.transition
            )

        console.print(table)
        console.print(f"\n[cyan]总时长: {storyboard['total_duration']}秒 | 镜头数: {len(storyboard['shots'])}个[/cyan]")


@click.group()
@click.pass_context
def cli(ctx):
    """🎬 AI 视频分镜脚本生成器 - 智能生成专业视频分镜"""
    ctx.ensure_object(StoryboardCLI)


@cli.command()
@click.argument('creative')
@click.option('--duration', '-d', default=30, help='视频总时长(秒)')
@click.option('--format', '-f', 'formats', multiple=True, default=['markdown'],
              type=click.Choice(['csv', 'markdown', 'pdf', 'html']),
              help='导出格式(可多选)')
@click.option('--output', '-o', default='output', help='输出目录')
@click.option('--image', '-i', help='参考图片路径(用于风格调整)')
@click.pass_obj
def generate(obj, creative, duration, formats, output, image):
    """生成单个分镜脚本"""
    console.print(Panel.fit("[bold cyan]🎬 开始生成分镜脚本[/bold cyan]"))

    if not obj.init_generator():
        return

    style_reference = None
    if image and os.path.exists(image):
        with console.status("[yellow]正在分析参考图片...[/]"):
            style_info = obj.image_analyzer.analyze_style(image)
            style_reference = style_info['style_description']
            console.print(f"[green]✓ 图片风格分析完成: {style_info['composition']} | {style_info['brightness']}[/green]")

    with console.status("[yellow]正在生成分镜...[/]"):
        try:
            storyboard = obj.generator.generate(creative, duration, style_reference)
            obj.current_storyboard = storyboard
        except Exception as e:
            console.print(f"[red]✗ 生成失败: {e}[/red]")
            return

    console.print("[green]✓ 分镜生成完成![/green]\n")
    obj.print_storyboard_table(storyboard)

    with console.status("[yellow]正在分析节奏曲线...[/]"):
        pace_analysis = obj.pace_analyzer.analyze_pace_curve(storyboard)
        obj.pace_analyzer.print_pace_analysis(pace_analysis)

    obj.exporter.output_dir = output
    obj.html_generator.output_dir = output

    filename = storyboard['title'].replace(' ', '_').replace('/', '_')[:30]
    exported_files = {}

    with console.status("[yellow]正在导出文件...[/]"):
        if 'csv' in formats:
            exported_files['csv'] = obj.exporter.to_csv(storyboard, filename)
        if 'markdown' in formats:
            exported_files['markdown'] = obj.exporter.to_markdown(storyboard, filename)
        if 'pdf' in formats:
            exported_files['pdf'] = obj.exporter.to_pdf(storyboard, filename)
        if 'html' in formats:
            exported_files['html'] = obj.html_generator.generate(storyboard, filename, pace_analysis)

    console.print("\n[green]✓ 文件导出完成:[/green]")
    for fmt, path in exported_files.items():
        console.print(f"  [{fmt.upper()}] {path}")

    if 'html' in exported_files:
        file_url = 'file://' + os.path.abspath(exported_files['html'])
        console.print(f"\n[cyan]💡 可在浏览器中打开 HTML 故事板:[/cyan]")
        console.print(f"  {file_url}")


@cli.command()
@click.argument('shot_number', type=int)
@click.argument('modification')
@click.option('--creative', '-c', help='原始创意描述(可选)')
@click.pass_obj
def modify(obj, shot_number, modification, creative):
    """修改指定镜头 (交互式修改)"""
    if not obj.current_storyboard and not creative:
        console.print("[red]请先使用 generate 命令生成分镜，或提供 --creative 参数[/red]")
        return

    if not obj.generator:
        if not obj.init_generator():
            return

    if creative and not obj.current_storyboard:
        with console.status("[yellow]正在生成分镜...[/]"):
            obj.current_storyboard = obj.generator.generate(creative, 30)

    storyboard = obj.current_storyboard
    shot_index = shot_number - 1

    if shot_index < 0 or shot_index >= len(storyboard['shots']):
        console.print(f"[red]镜头号超出范围，共有 {len(storyboard['shots'])} 个镜头[/red]")
        return

    console.print(Panel.fit(f"[bold cyan]✏️  修改镜头 {shot_number}[/bold cyan]"))
    console.print(f"\n[yellow]原始镜头:[/yellow]")
    original_shot = storyboard['shots'][shot_index]
    console.print(f"  景别: {original_shot.shot_type}")
    console.print(f"  画面: {original_shot.description}")
    console.print(f"  台词: {original_shot.dialogue}")
    console.print(f"\n[yellow]修改要求: {modification}[/yellow]")

    with console.status("[yellow]正在修改镜头...[/]"):
        try:
            modified_shot = obj.generator.modify_shot(storyboard, shot_index, modification)
            storyboard['shots'][shot_index] = modified_shot
        except Exception as e:
            console.print(f"[red]✗ 修改失败: {e}[/red]")
            return

    console.print("\n[green]✓ 镜头修改完成![/green]")
    console.print(f"\n[yellow]修改后镜头:[/yellow]")
    console.print(f"  景别: {modified_shot.shot_type}")
    console.print(f"  画面: {modified_shot.description}")
    console.print(f"  台词: {modified_shot.dialogue}")

    console.print("\n[cyan]更新后的分镜表:[/cyan]")
    obj.print_storyboard_table(storyboard)


@cli.command()
@click.argument('input_file')
@click.option('--duration', '-d', default=30, help='视频总时长(秒)')
@click.option('--format', '-f', 'formats', multiple=True, default=['markdown'],
              type=click.Choice(['csv', 'markdown', 'pdf', 'html']),
              help='导出格式(可多选)')
@click.option('--output', '-o', default='output', help='输出目录')
@click.option('--yes', '-y', is_flag=True, help='跳过确认直接生成')
@click.pass_obj
def batch(obj, input_file, duration, formats, output, yes):
    """批量生成 (从文本文件读取创意)"""
    console.print(Panel.fit("[bold cyan]📦 批量生成模式[/bold cyan]"))

    if not obj.init_generator():
        return

    if not os.path.exists(input_file):
        console.print(f"[red]文件不存在: {input_file}[/red]")
        return

    try:
        creatives = obj.batch_processor.read_creatives_from_file(input_file)
        console.print(f"[green]读取到 {len(creatives)} 个创意[/green]")
        for i, c in enumerate(creatives, 1):
            console.print(f"  {i}. {c[:50]}..." if len(c) > 50 else f"  {i}. {c}")
    except Exception as e:
        console.print(f"[red]读取文件失败: {e}[/red]")
        return

    if not creatives:
        console.print("[yellow]没有找到有效的创意描述[/yellow]")
        return

    if not yes:
        if not click.confirm(f"\n确认开始批量生成 {len(creatives)} 个分镜脚本?"):
            return

    result = obj.batch_processor.process_batch(input_file, output, duration, formats)

    console.print(f"\n[green]✓ 批量生成完成![/green]")
    console.print(f"  总数量: {result['total']}")
    console.print(f"  成功: {result['success_count']}")
    console.print(f"  失败: {result['total'] - result['success_count']}")
    console.print(f"  输出目录: {result['batch_dir']}")


@cli.command()
@click.argument('image_path')
@click.pass_obj
def analyze_image(obj, image_path):
    """分析参考图片的风格信息"""
    if not os.path.exists(image_path):
        console.print(f"[red]图片不存在: {image_path}[/red]")
        return

    with console.status("[yellow]正在分析图片...[/]"):
        analysis = obj.image_analyzer.analyze_style(image_path)

    console.print(Panel.fit("[bold cyan]🖼️  图片风格分析[/bold cyan]"))
    console.print(f"\n[green]主色调:[/green]")
    for color in analysis['dominant_colors']:
        console.print(f"  [on {color}]  [/] {color}")
    console.print(f"\n[green]构图类型:[/green] {analysis['composition']}")
    console.print(f"[green]画面亮度:[/green] {analysis['brightness']}")
    console.print(f"[green]分辨率:[/green] {analysis['resolution']}")
    console.print(f"[green]宽高比:[/green] {analysis['aspect_ratio']:.2f}")
    console.print(f"\n[green]风格描述:[/green]\n{analysis['style_description']}")


@cli.command()
@click.pass_obj
def config(obj):
    """显示配置信息"""
    console.print(Panel.fit("[bold cyan]⚙️  配置信息[/bold cyan]"))

    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    console.print(f"\n[green]API Key:[/green] {'***' + api_key[-4:] if api_key else '[red]未设置[/red]'}")
    console.print(f"[green]Base URL:[/green] {base_url}")
    console.print(f"[green]Model:[/green] {model}")

    if not api_key:
        console.print("\n[yellow]请设置环境变量 OPENAI_API_KEY[/yellow]")
        console.print("或复制 .env.example 为 .env 并填写配置")


@cli.command()
def examples():
    """显示使用示例"""
    examples_text = """
[bold cyan]📖 使用示例[/bold cyan]

[bold]1. 生成单个分镜:[/bold]
  storyboard generate "一个程序员深夜修复bug" --duration 30 --format markdown html

[bold]2. 使用参考图片风格:[/bold]
  storyboard generate "浪漫的日落海滩" -i reference.jpg -f html pdf

[bold]3. 修改指定镜头:[/bold]
  storyboard modify 3 "将景别改为特写" --creative "程序员深夜写代码"

[bold]4. 批量生成:[/bold]
  storyboard batch creatives.txt --duration 60 --format markdown csv

[bold]5. 分析参考图片:[/bold]
  storyboard analyze-image reference.jpg

[bold]6. 查看配置:[/bold]
  storyboard config
"""
    console.print(Panel.fit(examples_text))


def main():
    console.print("\n[bold cyan]🎬 AI 视频分镜脚本生成器[/bold cyan]")
    console.print("输入 storyboard --help 查看帮助\n")
    cli(obj=StoryboardCLI())


if __name__ == '__main__':
    main()
