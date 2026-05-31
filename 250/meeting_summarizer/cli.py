import os
import sys
import json
import click
from typing import List

from .models import MeetingType, Priority, MeetingSummary, ActionItem
from .extractor import MeetingExtractor
from .action_items import ActionItemProcessor
from .output_formats import OutputFormatter, BatchOutputFormatter
from .batch_processor import BatchProcessor
from .exporters import TodoistExporter, MicrosoftToDoExporter
from .tts import TTSGenerator
from .feedback import FeedbackManager
from .utils import read_file
from .llm_client import LLMClient


def get_feedback_manager():
    return FeedbackManager()


def get_extractor(feedback_manager=None):
    return MeetingExtractor(feedback_manager=feedback_manager)


@click.group()
@click.version_option()
def cli():
    """AI 会议纪要总结与行动点提取工具"""
    pass


@cli.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--meeting-type', '-t',
              type=click.Choice(['standup', 'review', 'brainstorm', 'general']),
              default='general',
              help='会议类型')
@click.option('--title', '-T', help='会议标题')
@click.option('--output', '-o', help='输出文件路径（不带扩展名）')
@click.option('--format', '-f', 'fmt',
              type=click.Choice(['markdown', 'json', 'csv', 'all']),
              default='markdown',
              help='输出格式')
@click.option('--force-rule', is_flag=True,
              help='强制使用规则引擎（不使用LLM）')
@click.option('--priority-sort', '-p', is_flag=True,
              help='按优先级排序行动点')
@click.option('--semantic-rank', '-s', is_flag=True,
              help='使用 LLM 进行语义级优先级排序')
@click.option('--deduplicate', '-d', is_flag=True,
              help='检测并标记重复行动点')
@click.option('--smart-merge', is_flag=True,
              help='智能合并重复行动点（合并描述、截止日期等信息）')
@click.option('--threshold', type=int, default=75,
              help='重复检测阈值 (0-100)，默认75')
@click.option('--apply-feedback/--no-feedback', default=True,
              help='是否应用用户反馈偏好')
def summarize(input_file, meeting_type, title, output, fmt, force_rule,
              priority_sort, semantic_rank, deduplicate, smart_merge,
              threshold, apply_feedback):
    """处理单个会议转录文件"""
    try:
        transcript = read_file(input_file)
        meeting_type_enum = MeetingType(meeting_type)

        feedback_manager = get_feedback_manager() if apply_feedback else None
        extractor = get_extractor(feedback_manager)

        llm_status = extractor.llm_client.get_status()
        if not force_rule and llm_status["available"]:
            click.echo(f"使用 LLM 后端: {llm_status['backend']} (模型: {llm_status.get('model', 'N/A')})")
        else:
            click.echo("使用规则引擎提取" + (" (LLM不可用)" if not force_rule else " (强制规则模式)"))

        summary = extractor.extract(
            transcript=transcript,
            meeting_type=meeting_type_enum,
            title=title,
            force_rule=force_rule
        )

        if deduplicate or smart_merge:
            if smart_merge:
                summary.action_items = ActionItemProcessor.find_duplicates(
                    summary.action_items, threshold=threshold
                )
                before_count = len(summary.action_items)
                summary.action_items = ActionItemProcessor.merge_duplicates(
                    summary.action_items, smart_merge=True
                )
                after_count = len(summary.action_items)
                if before_count > after_count:
                    click.echo(f"智能合并了 {before_count - after_count} 个重复行动点")
            else:
                summary.action_items = ActionItemProcessor.find_duplicates(
                    summary.action_items, threshold=threshold
                )

        if semantic_rank and extractor.llm_client.is_available():
            click.echo("正在进行语义级优先级排序...")
            summary = extractor.re_rank_action_items_with_llm(summary)
            click.echo("语义级优先级排序完成")
        elif semantic_rank and not extractor.llm_client.is_available():
            click.echo("警告: 未配置 LLM API，跳过语义级优先级排序")

        if priority_sort or semantic_rank:
            summary.action_items = ActionItemProcessor.prioritize(summary.action_items)

        base_output = output or os.path.splitext(input_file)[0]

        if fmt in ['markdown', 'all']:
            md_path = f"{base_output}.md"
            OutputFormatter.save_markdown(summary, md_path)
            click.echo(f"Markdown 报告已保存: {md_path}")

        if fmt in ['json', 'all']:
            json_path = f"{base_output}.json"
            OutputFormatter.save_json(summary, json_path)
            click.echo(f"JSON 数据已保存: {json_path}")

        if fmt in ['csv', 'all']:
            csv_path = f"{base_output}_action_items.csv"
            OutputFormatter.save_csv(summary.action_items, csv_path)
            click.echo(f"CSV 行动点列表已保存: {csv_path}")

        _print_summary_stats(summary)

    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('input_dir', type=click.Path(exists=True, file_okay=False))
@click.option('--meeting-type', '-t',
              type=click.Choice(['standup', 'review', 'brainstorm', 'general']),
              default='general',
              help='会议类型')
@click.option('--pattern', '-p', default='*.txt',
              help='文件匹配模式')
@click.option('--output', '-o', required=True,
              help='输出文件路径（不带扩展名）')
@click.option('--force-rule', is_flag=True,
              help='强制使用规则引擎')
@click.option('--person', help='只显示特定人的行动点')
@click.option('--deduplicate', '-d', is_flag=True,
              help='检测并合并重复行动点')
@click.option('--apply-feedback/--no-feedback', default=True,
              help='是否应用用户反馈偏好')
def batch(input_dir, meeting_type, pattern, output, force_rule, person, deduplicate, apply_feedback):
    """批量处理目录下的多个会议记录"""
    try:
        meeting_type_enum = MeetingType(meeting_type)

        feedback_manager = get_feedback_manager() if apply_feedback else None
        extractor = get_extractor(feedback_manager)
        batch_processor = BatchProcessor(extractor=extractor)

        llm_status = extractor.llm_client.get_status()
        if not force_rule and llm_status["available"]:
            click.echo(f"使用 LLM 后端: {llm_status['backend']}")
        else:
            click.echo("使用规则引擎提取")

        click.echo(f"正在处理目录: {input_dir} (模式: {pattern})")
        summaries = batch_processor.process_directory(
            directory=input_dir,
            meeting_type=meeting_type_enum,
            pattern=pattern,
            use_llm=not force_rule
        )

        if not summaries:
            click.echo("未找到匹配的文件")
            return

        click.echo(f"已处理 {len(summaries)} 个会议")

        if deduplicate:
            all_items = []
            for summary in summaries:
                all_items.extend(summary.action_items)
            before_count = len(all_items)
            all_items = ActionItemProcessor.merge_duplicates(all_items, smart_merge=True)
            after_count = len(all_items)
            if before_count > after_count:
                click.echo(f"全局合并了 {before_count - after_count} 个重复行动点")

        if person:
            person_items = batch_processor.find_person_action_items(summaries, person)
            click.echo(f"\n{person} 的行动点 ({len(person_items)} 个):")
            for meeting, ai in person_items:
                click.echo(f"  - [{meeting.title}] {ai.task} (截止: {ai.due_date or '未设置'})")
            return

        analysis = batch_processor.analyze(summaries)

        md_path = f"{output}_analysis.md"
        BatchOutputFormatter.save_markdown(analysis, md_path)
        click.echo(f"汇总分析报告已保存: {md_path}")

        json_path = f"{output}_analysis.json"
        BatchOutputFormatter.save_json(analysis, json_path)
        click.echo(f"汇总分析 JSON 已保存: {json_path}")

        all_action_items = batch_processor.get_all_action_items(summaries)
        csv_path = f"{output}_all_action_items.csv"
        OutputFormatter.save_csv(all_action_items, csv_path)
        click.echo(f"所有行动点 CSV 已保存: {csv_path}")

        click.echo(f"\n=== 汇总统计 ===")
        click.echo(f"会议总数: {analysis.total_meetings}")
        click.echo(f"行动点总数: {analysis.total_action_items}")
        click.echo("\n行动点按负责人分布:")
        for assignee, count in sorted(analysis.action_items_by_assignee.items(), key=lambda x: -x[1]):
            click.echo(f"  {assignee}: {count} 个")

    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--platform', '-p',
              type=click.Choice(['todoist', 'microsoft']),
              required=True,
              help='目标任务管理平台')
@click.option('--output', '-o', help='输出 CSV 文件路径')
@click.option('--exclude-duplicates/--include-duplicates', default=True,
              help='是否排除重复行动点')
def export(input_file, platform, output, exclude_duplicates):
    """导出行动点为 Todoist 或 Microsoft To Do 格式"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        action_items = [ActionItem(**ai) for ai in data.get('action_items', [])]

        if exclude_duplicates:
            action_items = ActionItemProcessor.merge_duplicates(action_items, smart_merge=True)

        base_output = output or os.path.splitext(input_file)[0]

        if platform == 'todoist':
            out_path = f"{base_output}_todoist.csv"
            TodoistExporter.save(action_items, out_path)
            click.echo(f"Todoist 导入文件已保存: {out_path}")
            click.echo("请在 Todoist 中使用 '导入/导出' 功能导入此文件")
        else:
            out_path = f"{base_output}_microsoft_todo.csv"
            MicrosoftToDoExporter.save(action_items, out_path)
            click.echo(f"Microsoft To Do 导入文件已保存: {out_path}")
            click.echo("请在 Microsoft To Do 中导入此 CSV 文件")

    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--output', '-o', required=True, help='输出音频文件路径')
@click.option('--engine', '-e',
              type=click.Choice(['gtts', 'pyttsx3']),
              help='TTS 引擎 (gtts需要网络，pyttsx3离线可用)')
@click.option('--include-actions/--no-actions', default=True,
              help='是否包含行动点')
@click.option('--verbose', '-v', is_flag=True,
              help='显示详细信息')
def tts(input_file, output, engine, include_actions, verbose):
    """生成会议摘要的音频播报"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        summary = MeetingSummary(**data)

        if verbose:
            deps = TTSGenerator.check_dependencies()
            click.echo("TTS 依赖检查:")
            for name, info in deps.items():
                status = "✓ 可用" if info['available'] else "✗ 不可用"
                click.echo(f"  {name}: {status}")

        tts_gen = TTSGenerator(engine=engine)
        tts_gen.generate_summary_audio(summary, output, include_action_items=include_actions, verbose=verbose)
        click.echo(f"音频文件已生成: {output}")

    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command(name='check-tts')
def check_tts():
    """检查 TTS 依赖状态"""
    deps = TTSGenerator.check_dependencies()
    click.echo("TTS 依赖状态:")
    for name, info in deps.items():
        if info['available']:
            click.echo(f"  ✓ {name}: 可用 (版本: {info.get('version', 'unknown')})")
        else:
            click.echo(f"  ✗ {name}: 不可用 - {info.get('error', '')}")

    available = [k for k, v in deps.items() if v['available']]
    if available:
        click.echo(f"\n可用引擎: {', '.join(available)}")
    else:
        click.echo("\n没有可用的TTS引擎，请安装:")
        click.echo("  pip install gTTS     (需要网络)")
        click.echo("  pip install pyttsx3  (离线可用)")


@cli.command(name='check-llm')
def check_llm():
    """检查 LLM 后端配置状态"""
    from .llm_client import LLMClient
    client = LLMClient()

    click.echo("LLM 后端状态:")
    status = client.get_status()
    backend = status.get("backend", "unknown")
    available = status.get("available", False)

    if backend == "openai":
        click.echo(f"  后端: OpenAI API")
        click.echo(f"  模型: {status.get('model', 'N/A')}")
        click.echo(f"  Base URL: {status.get('base_url', 'N/A')}")
        click.echo(f"  API Key: {'已设置' if status.get('api_key_set') else '未设置'}")
        click.echo(f"  可用: {'✓ 是' if available else '✗ 否'}")
    elif backend == "ollama":
        click.echo(f"  后端: Ollama (本地模型)")
        click.echo(f"  模型: {status.get('model', 'N/A')}")
        click.echo(f"  Base URL: {status.get('base_url', 'N/A')}")
        click.echo(f"  可用: {'✓ 是' if available else '✗ 否'}")
        if not available:
            click.echo("\n  请确保:")
            click.echo("    1. Ollama 已安装并运行 (ollama serve)")
            click.echo("    2. 模型已下载 (ollama pull qwen2.5:7b)")
    else:
        click.echo(f"  后端: 无可用后端")
        click.echo("\n  请配置以下任一方式:")
        click.echo("    方式1 - OpenAI API:")
        click.echo("      在 .env 中设置 OPENAI_API_KEY=sk-xxx")
        click.echo("    方式2 - 兼容 OpenAI 的 API (如 DeepSeek, Moonshot):")
        click.echo("      在 .env 中设置:")
        click.echo("        OPENAI_API_KEY=your_key")
        click.echo("        OPENAI_BASE_URL=https://api.deepseek.com/v1")
        click.echo("        OPENAI_MODEL=deepseek-chat")
        click.echo("    方式3 - Ollama 本地模型:")
        click.echo("      在 .env 中设置 LLM_BACKEND=ollama")
        click.echo("      然后启动 Ollama: ollama serve")
        click.echo("      下载模型: ollama pull qwen2.5:7b")


@cli.group()
def feedback():
    """管理用户反馈和偏好设置"""
    pass


@feedback.command(name='rate')
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--score', '-s', type=click.IntRange(1, 5), required=True,
              help='准确性评分 (1-5)')
@click.option('--comment', '-c', help='评价评论')
def rate_accuracy(input_file, score, comment):
    """对提取结果进行准确性评分"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        summary = MeetingSummary(**data)

        manager = get_feedback_manager()
        manager.rate_accuracy(summary, score, comment)
        click.echo(f"已保存评分: {score}/5")

        stats = manager.get_accuracy_stats()
        click.echo(f"平均评分: {stats['average']:.1f}/5 (共 {stats['count']} 次)")

    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)


@feedback.command(name='alias')
@click.argument('alias')
@click.argument('canonical_name')
def add_alias(alias, canonical_name):
    """添加人名别名映射 (alias 将会被映射为 canonical_name)"""
    manager = get_feedback_manager()
    manager.add_name_alias(alias, canonical_name)
    click.echo(f"已添加人名别名映射: {alias} -> {canonical_name}")
    click.echo("后续提取中将自动应用此映射")


@feedback.command(name='priority-keyword')
@click.argument('keyword')
@click.argument('priority', type=click.Choice(['high', 'medium', 'low']))
def add_priority_keyword(keyword, priority):
    """添加优先级关键词"""
    manager = get_feedback_manager()
    manager.add_priority_keyword(keyword, Priority(priority))
    click.echo(f"已添加优先级关键词: {keyword} -> {priority}")
    click.echo("后续提取中包含此关键词的任务将被自动标记为该优先级")


@feedback.command(name='action-keyword')
@click.argument('keyword')
def add_action_keyword(keyword):
    """添加行动点识别关键词"""
    manager = get_feedback_manager()
    manager.add_action_keyword(keyword)
    click.echo(f"已添加行动点关键词: {keyword}")


@feedback.command(name='stats')
def show_stats():
    """显示反馈统计信息"""
    manager = get_feedback_manager()

    click.echo("=== 反馈统计 ===")
    stats = manager.get_accuracy_stats()
    click.echo(f"准确性评分:")
    click.echo(f"  平均: {stats['average']:.1f}/5")
    click.echo(f"  次数: {stats['count']}")
    if 'distribution' in stats:
        for score in range(1, 6):
            count = stats['distribution'].get(str(score), 0)
            click.echo(f"  {score} 星: {count} 次")

    prefs = manager.get_preferences()
    click.echo(f"\n人名别名: {len(prefs.get('name_aliases', {}))} 个")
    for alias, name in prefs.get('name_aliases', {}).items():
        click.echo(f"  {alias} -> {name}")

    click.echo(f"\n优先级关键词: {len(prefs.get('priority_keywords', {}))} 个")
    for kw, prio in prefs.get('priority_keywords', {}).items():
        click.echo(f"  {kw} -> {prio}")

    click.echo(f"\n行动点关键词: {len(prefs.get('action_keywords', []))} 个")
    for kw in prefs.get('action_keywords', []):
        click.echo(f"  - {kw}")


@feedback.command(name='clear')
@click.confirmation_option(prompt='确定要清除所有反馈数据吗？')
def clear_feedback():
    """清除所有反馈数据"""
    import shutil
    manager = get_feedback_manager()
    feedback_dir = manager.feedback_dir
    shutil.rmtree(feedback_dir)
    click.echo("已清除所有反馈数据")


@feedback.command(name='export')
@click.argument('output_file', type=click.Path())
def export_feedback(output_file):
    """导出反馈配置到文件"""
    manager = get_feedback_manager()
    manager.export_feedback(output_file)
    click.echo(f"反馈配置已导出到: {output_file}")


@feedback.command(name='import')
@click.argument('input_file', type=click.Path(exists=True))
def import_feedback(input_file):
    """从文件导入反馈配置"""
    manager = get_feedback_manager()
    manager.import_feedback(input_file)
    click.echo(f"已从 {input_file} 导入反馈配置")


def _print_summary_stats(summary: MeetingSummary):
    click.echo(f"\n=== 会议摘要 ===")
    click.echo(f"标题: {summary.title}")
    click.echo(f"主题: {summary.main_topic}")
    click.echo(f"参会人: {', '.join(summary.participants) if summary.participants else '未识别'}")
    click.echo(f"讨论点: {len(summary.key_discussion_points)} 个")
    click.echo(f"争议问题: {len(summary.controversial_issues)} 个")
    click.echo(f"决议: {len(summary.decisions)} 个")
    click.echo(f"行动点: {len(summary.action_items)} 个")

    stats = ActionItemProcessor.get_statistics(summary.action_items)
    click.echo(f"\n行动点统计:")
    click.echo(f"  有负责人: {stats['with_assignee']}/{stats['total']}")
    click.echo(f"  有截止日期: {stats['with_due_date']}/{stats['total']}")
    click.echo(f"  优先级分布: HIGH={stats['by_priority']['high']}, "
               f"MEDIUM={stats['by_priority']['medium']}, "
               f"LOW={stats['by_priority']['low']}")

    duplicates = [a for a in summary.action_items if a.is_duplicate]
    if duplicates:
        click.echo(f"\n检测到 {len(duplicates)} 个重复行动点")

    by_assignee = ActionItemProcessor.group_by_assignee(summary.action_items)
    click.echo("\n行动点按负责人:")
    for assignee, items in sorted(by_assignee.items(), key=lambda x: -len(x[1])):
        click.echo(f"  {assignee}: {len(items)} 个")

    conflicts = ActionItemProcessor.detect_conflicts(summary.action_items)
    if conflicts:
        click.echo(f"\n⚠️  检测到 {len(conflicts)} 个潜在冲突:")
        for item1, item2, reason in conflicts[:3]:
            click.echo(f"  - {reason}")


if __name__ == '__main__':
    cli()
