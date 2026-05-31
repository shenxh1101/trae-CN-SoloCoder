import click
import uuid
import sys
from pathlib import Path
from typing import List, Optional

from .config import Config
from .llm_client import LLMClient
from .report_generator import ReportGenerator
from .data_parser import DataParser
from .exporter import Exporter
from .preference_learner import PreferenceLearner
from .analyzer import WorkAnalyzer


def parse_work_items(ctx, param, value) -> List[str]:
    if not value:
        return []
    items = [item.strip() for item in value.split('、') if item.strip()]
    return items


@click.group()
@click.version_option(version="1.0.0")
@click.pass_context
def cli(ctx):
    """AI周报自动生成器 - 智能生成结构化周报"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = Config()


@cli.command()
@click.option('--items', '-i', 'work_items_str', type=str, 
              help='工作要点，用顿号分隔，如：修复登录bug、上线推荐模块')
@click.option('--style', '-s', 'style', type=click.Choice(['brief', 'detailed']), 
              default=None, help='周报风格：简要版(brief)或详细版(detailed)')
@click.option('--detail', 'detail_level', type=click.Choice(['brief', 'detailed']), 
              default=None, help='同--style，指定周报详略程度')
@click.option('--name', '-n', type=str, default='', help='报告人姓名')
@click.option('--format', '-f', 'output_format', 
              type=click.Choice(['markdown', 'html', 'text', 'console']), 
              default='console', help='输出格式')
@click.option('--output', '-o', type=str, help='输出文件路径')
@click.option('--context', '-c', type=str, default='', help='额外上下文信息')
@click.option('--no-ask-rating', is_flag=True, help='不询问评分')
@click.option('--mock/--no-mock', 'mock', default=None, 
              help='使用/禁用Mock模式（默认根据环境变量自动判断）')
@click.pass_context
def generate(ctx, work_items_str, style, detail_level, name, output_format, output, context, no_ask_rating, mock):
    """从工作要点生成周报"""
    try:
        if work_items_str:
            work_items = parse_work_items(None, None, work_items_str)
        else:
            click.echo("请输入本周工作要点（用顿号分隔，或每行一个，空行结束）：")
            items = []
            while True:
                line = click.get_text_stream('stdin').readline().strip()
                if not line:
                    break
                if '、' in line:
                    items.extend([x.strip() for x in line.split('、') if x.strip()])
                else:
                    items.append(line)
            work_items = items
        
        if not work_items:
            click.echo("错误：请提供至少一个工作要点", err=True)
            sys.exit(1)
        
        final_style = style or detail_level
        
        config = ctx.obj['config']
        llm = LLMClient(use_mock=mock)
        
        if not final_style:
            learner = PreferenceLearner(config)
            final_style = learner.get_suggested_style()
            click.echo(f"根据历史偏好，自动选择 {final_style} 风格")
        
        style = final_style
        
        generator = ReportGenerator(llm, config)
        
        with click.progressbar(length=1, label='正在生成周报') as bar:
            report = generator.generate(work_items, style, name, context)
            bar.update(1)
        
        if not report.get("time_analysis"):
            report["time_analysis"] = WorkAnalyzer.analyze_time_distribution(work_items)
        
        if not report.get("todo_list") and report.get("sections"):
            report["todo_list"] = WorkAnalyzer.extract_todos(report["sections"])
        
        report_id = str(uuid.uuid4())[:8]
        report["report_id"] = report_id
        
        if output_format == 'console':
            output_content = Exporter.to_markdown(report)
            click.echo("\n" + output_content)
        elif output_format == 'markdown':
            output_content = Exporter.to_markdown(report)
        elif output_format == 'html':
            output_content = Exporter.to_html(report)
        elif output_format == 'text':
            output_content = Exporter.to_plain_text(report)
        
        if output:
            output_path = Path(output)
            if output_path.is_dir():
                output_path = output_path / f"weekly_report_{report_id}.{output_format}"
            Exporter.export(report, str(output_path), output_format)
            click.echo(f"\n周报已保存至: {output_path}")
        
        if not no_ask_rating:
            click.echo("\n" + "="*50)
            if click.confirm("是否为本次生成的周报评分？", default=True):
                rating = click.prompt("请输入评分（1-5分，5分为最佳）", type=int)
                while rating < 1 or rating > 5:
                    click.echo("评分必须在1-5之间")
                    rating = click.prompt("请输入评分（1-5分，5分为最佳）", type=int)
                
                feedback = click.prompt("请输入评价反馈（可选，直接回车跳过）", default="", show_default=False)
                
                learner = PreferenceLearner(config)
                learner.add_rating(report_id, rating, feedback, style)
                click.echo("评分已保存，感谢您的反馈！")
    
    except ValueError as e:
        click.echo(f"配置错误: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"生成失败: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--csv', '-c', required=True, type=str, help='CSV文件路径')
@click.option('--style', '-s', type=click.Choice(['brief', 'detailed']), 
              default='detailed', help='周报风格')
@click.option('--format', '-f', 'output_format', 
              type=click.Choice(['markdown', 'html', 'text']), 
              default='markdown', help='输出格式')
@click.option('--output-dir', '-o', type=str, default='./reports', 
              help='输出目录')
@click.option('--generate-summary', is_flag=True, help='生成团队汇总报告')
@click.option('--mock/--no-mock', 'mock', default=None, 
              help='使用/禁用Mock模式（默认根据环境变量自动判断）')
@click.pass_context
def batch(ctx, csv, style, output_format, output_dir, generate_summary, mock):
    """从CSV批量生成团队周报"""
    try:
        config = ctx.obj['config']
        llm = LLMClient(use_mock=mock)
        generator = ReportGenerator(llm, config)
        data_parser = DataParser()
        
        team_members = data_parser.parse_csv(csv)
        click.echo(f"读取到 {len(team_members)} 位团队成员的数据")
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        reports = []
        
        with click.progressbar(team_members, label='正在生成团队周报') as members:
            for member in members:
                name = member.get("name", "")
                work_items = member.get("work_items", [])
                extra_context = member.get("extra_context", "")
                
                if not work_items:
                    click.echo(f"跳过 {name}：无工作要点")
                    continue
                
                report = generator.generate(work_items, style, name, extra_context)
                report_id = str(uuid.uuid4())[:8]
                report["report_id"] = report_id
                
                if not report.get("time_analysis"):
                    report["time_analysis"] = WorkAnalyzer.analyze_time_distribution(work_items)
                
                if not report.get("todo_list") and report.get("sections"):
                    report["todo_list"] = WorkAnalyzer.extract_todos(report["sections"])
                
                safe_name = name.replace(" ", "_") if name else report_id
                filename = f"{safe_name}_weekly_report.{output_format}"
                file_path = output_path / filename
                
                Exporter.export(report, str(file_path), output_format)
                reports.append(report)
        
        click.echo(f"\n成功生成 {len(reports)} 份周报，保存至: {output_path.resolve()}")
        
        if generate_summary and reports:
            summary = WorkAnalyzer.generate_summary_report(reports)
            
            summary_report = {
                "title": "团队周报汇总",
                "date": reports[0].get("date", ""),
                "sections": {
                    "团队概况": [
                        f"团队成员数：{summary['total_members']}",
                        f"本周完成事项总数：{summary['total_achievements']}",
                        f"下周待办事项总数：{summary['total_todos']}"
                    ],
                    "整体耗时分布": [f"{cat}: {pct}%" for cat, pct in summary['avg_time_distribution'].items()],
                    "主要成果": summary['all_achievements'][:10]
                },
                "time_analysis": summary['avg_time_distribution'],
                "todo_list": summary['all_todos'][:10]
            }
            
            summary_path = output_path / f"team_summary.{output_format}"
            Exporter.export(summary_report, str(summary_path), output_format)
            click.echo(f"团队汇总报告已生成: {summary_path}")
    
    except FileNotFoundError as e:
        click.echo(f"文件不存在: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"批量生成失败: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--log-file', '-l', required=True, type=str, help='git log文件路径')
@click.option('--author', '-a', type=str, help='按作者过滤')
@click.option('--days', '-d', type=int, default=7, help='分析最近N天的提交')
@click.option('--style', '-s', type=click.Choice(['brief', 'detailed']), 
              default='detailed', help='周报风格')
@click.option('--name', '-n', type=str, default='', help='报告人姓名')
@click.option('--format', '-f', 'output_format', 
              type=click.Choice(['markdown', 'html', 'text', 'console']), 
              default='console', help='输出格式')
@click.option('--output', '-o', type=str, help='输出文件路径')
@click.option('--mock/--no-mock', 'mock', default=None, 
              help='使用/禁用Mock模式（默认根据环境变量自动判断）')
@click.pass_context
def git(ctx, log_file, author, days, style, name, output_format, output, mock):
    """从git commit日志生成周报"""
    try:
        config = ctx.obj['config']
        llm = LLMClient(use_mock=mock)
        generator = ReportGenerator(llm, config)
        
        git_log_content = DataParser.parse_git_log(log_file, author, days)
        if not git_log_content:
            click.echo("未找到符合条件的git提交记录", err=True)
            sys.exit(1)
        
        click.echo(f"解析到 {git_log_content.count(chr(10)) + 1} 条提交记录")
        
        with click.progressbar(length=1, label='正在从git日志生成周报') as bar:
            report = generator.generate_from_git_log(git_log_content, style, name)
            bar.update(1)
        
        report_id = str(uuid.uuid4())[:8]
        report["report_id"] = report_id
        
        if output_format == 'console':
            output_content = Exporter.to_markdown(report)
            click.echo("\n" + output_content)
        elif output_format == 'markdown':
            output_content = Exporter.to_markdown(report)
        elif output_format == 'html':
            output_content = Exporter.to_html(report)
        elif output_format == 'text':
            output_content = Exporter.to_plain_text(report)
        
        if output:
            output_path = Path(output)
            if output_path.is_dir():
                output_path = output_path / f"git_weekly_report_{report_id}.{output_format}"
            Exporter.export(report, str(output_path), output_format)
            click.echo(f"\n周报已保存至: {output_path}")
    
    except FileNotFoundError as e:
        click.echo(f"文件不存在: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"生成失败: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--output', '-o', type=str, help='导出偏好数据到文件')
@click.option('--clear', is_flag=True, help='清除评分历史')
@click.pass_context
def preference(ctx, output, clear):
    """管理用户偏好和评分历史"""
    config = ctx.obj['config']
    learner = PreferenceLearner(config)
    
    if clear:
        if click.confirm("确定要清除所有评分历史吗？此操作不可恢复", abort=True):
            learner.clear_history()
            click.echo("评分历史已清除")
        return
    
    stats = learner.get_statistics()
    prefs = learner.get_preferences()
    
    click.echo("\n" + "="*50)
    click.echo("偏好和评分统计")
    click.echo("="*50)
    click.echo(f"总评分数: {stats['total_ratings']}")
    click.echo(f"平均评分: {stats['average_rating']}")
    
    if stats['total_ratings'] > 0:
        click.echo("\n评分分布:")
        for rating, count in stats['rating_distribution'].items():
            bar = "█" * count
            click.echo(f"  {rating}分: {bar} ({count})")
        
        click.echo("\n风格表现:")
        for style, avg_rating in stats['style_performance'].items():
            click.echo(f"  {style}: {avg_rating}分")
    
    click.echo("\n当前偏好:")
    click.echo(f"  语气: {prefs.get('tone', 'N/A')}")
    click.echo(f"  详细程度: {prefs.get('detail_level', 'N/A')}")
    click.echo(f"  偏好置信度: {int(prefs.get('confidence', 0) * 100)}%")
    
    if output:
        learner.export_preferences(output)
        click.echo(f"\n偏好数据已导出至: {output}")


@cli.command()
def example():
    """显示使用示例"""
    examples = """
使用示例:

1. 交互式生成周报:
   weekly-report generate

2. 直接指定工作要点生成:
   weekly-report generate -i "修复登录bug、上线推荐模块、参加需求评审"

3. 生成简要版并导出为HTML:
   weekly-report generate -i "修复bug" -s brief -f html -o report.html

4. 从CSV批量生成团队周报:
   weekly-report batch -c team.csv -o ./reports --generate-summary

5. 从git日志生成:
   git log --since="7 days ago" > git.log
   weekly-report git -l git.log -a "张三"

6. 查看偏好统计:
   weekly-report preference

CSV文件格式示例:
姓名,工作要点,备注
张三,修复登录bug、上线推荐模块,负责用户模块
李四,参加需求评审、设计数据库架构,负责后端架构
"""
    click.echo(examples)


def main():
    cli(obj={})


if __name__ == '__main__':
    main()
