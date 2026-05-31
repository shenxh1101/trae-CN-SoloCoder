#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time

from smell_detector.analyzer import Analyzer
from smell_detector.detectors.base import Severity
from smell_detector.feedback import FeedbackStore
from smell_detector.rules.registry import RuleRegistry


def _print_results(results, verbose=False):
    if not results:
        print("✅ 未检测到代码异味！")
        return

    severity_icon = {
        Severity.LOW: "🟢",
        Severity.MEDIUM: "🟡",
        Severity.HIGH: "🔴",
        Severity.CRITICAL: "🟣",
    }
    severity_cn = {
        Severity.LOW: "低",
        Severity.MEDIUM: "中",
        Severity.HIGH: "高",
        Severity.CRITICAL: "严重",
    }

    print(f"\n{'='*80}")
    print(f"  检测到 {len(results)} 个代码异味")
    print(f"{'='*80}\n")

    for i, r in enumerate(results, 1):
        icon = severity_icon.get(r.severity, "⚪")
        sev = severity_cn.get(r.severity, r.severity.value)
        fp_tag = " [误报]" if r.is_false_positive else ""

        print(f"{icon} [{i}] {r.smell_type} ({sev}){fp_tag}")
        print(f"    📍 位置: {r.location}")
        print(f"    📝 {r.description}")
        if verbose:
            print(f"    ⚠️  维护问题: {r.maintenance_issue}")
            print(f"    💡 重构建议: {r.refactoring_suggestion}")
            snippet_lines = r.code_snippet.strip().split("\n")
            if len(snippet_lines) > 5:
                print(f"    📄 代码片段 (前5行):")
                for line in snippet_lines[:5]:
                    print(f"       {line}")
                print(f"       ... ({len(snippet_lines) - 5} more lines)")
            else:
                print(f"    📄 代码片段:")
                for line in snippet_lines:
                    print(f"       {line}")
        print()


def _print_statistics(stats, score, grade):
    print(f"\n{'='*80}")
    print(f"  📊 统计摘要")
    print(f"{'='*80}")
    print(f"  异味总数: {stats['total']}")
    print(f"  技术债务评分: {score:.1f}/100 (等级: {grade})")
    print()
    print(f"  按严重程度:")
    for sev, count in stats["by_severity"].items():
        sev_cn = {"low": "低", "medium": "中", "high": "高", "critical": "严重"}.get(sev, sev)
        print(f"    {sev_cn}: {count}")
    print()
    print(f"  按异味类型:")
    for smell_type, count in stats["by_type"].items():
        type_cn = {
            "long_function": "过长函数",
            "duplicate_code": "重复代码",
            "god_object": "上帝对象",
            "temporary_field": "临时字段",
        }.get(smell_type, smell_type)
        print(f"    {type_cn}: {count}")
    print()


def _print_heat_map(heat_map):
    if not heat_map:
        return
    print(f"\n{'='*80}")
    print(f"  📊 异味热力图")
    print(f"{'='*80}")
    max_count = max(heat_map.values()) if heat_map else 1
    bar_width = 40
    for file_path, count in heat_map.items():
        ratio = count / max_count if max_count > 0 else 0
        filled = int(ratio * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)
        short = os.path.basename(file_path)
        print(f"  {short:<30} {bar} {count}")
    print()


def cmd_analyze(args):
    analyzer = Analyzer(preset=args.preset, enabled_smells=args.smells)

    path = args.path
    if os.path.isfile(path):
        results = analyzer.analyze_file(path)
    elif os.path.isdir(path):
        results = analyzer.analyze_directory(path)
    else:
        print(f"错误: 路径不存在: {path}")
        sys.exit(1)

    _print_results(results, verbose=args.verbose)

    stats = analyzer.get_statistics(results)
    score, grade = analyzer.calculate_debt_score(results)

    if not args.quiet:
        _print_statistics(stats, score, grade)

    if os.path.isdir(path):
        heat_map = analyzer.get_file_heat_map(results)
        _print_heat_map(heat_map)

    if args.html:
        html_path = analyzer.generate_html_report(results, args.html, project_path=path)
        print(f"\n📄 HTML 报告已生成: {html_path}")

    if args.csv:
        csv_path = analyzer.generate_csv_report(results, args.csv)
        print(f"📊 CSV 报告已导出: {csv_path}")

    if score > 50:
        sys.exit(1)


def cmd_ci(args):
    analyzer = Analyzer(preset=args.preset, enabled_smells=args.smells)

    path = args.path
    if os.path.isfile(path):
        results = analyzer.analyze_file(path)
    elif os.path.isdir(path):
        results = analyzer.analyze_directory(path)
    else:
        print(f"CI 失败: 路径不存在: {path}")
        sys.exit(1)

    report = analyzer.ci_check(
        results,
        max_critical=args.max_critical,
        max_high=args.max_high,
        max_debt_score=args.max_debt,
    )

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        status = "✅ PASSED" if report["passed"] else "❌ FAILED"
        print(f"CI 状态: {status}")
        print(f"技术债务评分: {report['score']:.1f} (等级: {report['grade']})")
        print(f"严重异味: {report['critical_count']} / 阈值 {report['thresholds']['max_critical']}")
        print(f"高严重异味: {report['high_count']} / 阈值 {report['thresholds']['max_high']}")
        print(f"总异味数: {report['total_smells']}")

    sys.exit(0 if report["passed"] else 1)


def cmd_autofix(args):
    analyzer = Analyzer(preset=args.preset, enabled_smells=args.smells)

    path = args.path
    if os.path.isfile(path):
        results = analyzer.analyze_file(path)
    elif os.path.isdir(path):
        results = analyzer.analyze_directory(path)
    else:
        print(f"错误: 路径不存在: {path}")
        sys.exit(1)

    long_funcs = [r for r in results if r.smell_type == "long_function"]
    if not long_funcs:
        print("没有可自动修复的过长函数。")
        return

    print(f"发现 {len(long_funcs)} 个过长函数，尝试自动修复...")
    fixes = analyzer.autofix(results, dry_run=args.dry_run)

    for fix in fixes:
        if fix["status"] == "skipped":
            print(f"  ⚠️  跳过 {fix['function']} in {fix['file']}: {fix['reason']}")
        elif fix["status"] == "preview":
            print(f"  🔍 [预览] {fix['function']} ({fix['original_lines']}行) 拆分为:")
            for i, fn in enumerate(fix["new_functions"], 1):
                print(f"       {i}. {fn}")
            print(f"       in {fix['file']}")
        elif fix["status"] == "fixed":
            print(f"  ✅ 已修复 {fix['function']} ({fix['original_lines']}行) 拆分为:")
            for i, fn in enumerate(fix["new_functions"], 1):
                print(f"       {i}. {fn}")
            print(f"       in {fix['file']}")

    if args.dry_run:
        print("\n这是预览模式，未修改任何文件。使用 --no-dry-run 实际执行修复。")


def cmd_feedback(args):
    store = FeedbackStore()

    if args.action == "mark":
        store.mark_false_positive(args.file, args.smell_type, args.line, args.reason or "")
        print(f"已标记为误报: {args.file}:{args.line} ({args.smell_type})")

    elif args.action == "unmark":
        store.unmark_false_positive(args.file, args.smell_type, args.line)
        print(f"已取消误报标记: {args.file}:{args.line} ({args.smell_type})")

    elif args.action == "list":
        records = store.list_all()
        if not records:
            print("没有误报记录。")
        else:
            print(f"误报记录 ({len(records)} 条):\n")
            for i, r in enumerate(records, 1):
                print(f"  [{i}] {r['file_path']}:{r['start_line']} ({r['smell_type']})")
                if r.get("reason"):
                    print(f"      原因: {r['reason']}")
            print()

    elif args.action == "clear":
        store.clear_all()
        print("已清除所有误报记录。")


def cmd_rules(args):
    registry = RuleRegistry()

    if args.action == "list":
        print(registry.list_presets())

    elif args.action == "save":
        smells = args.smells.split(",") if args.smells else ["long_function", "duplicate_code", "god_object", "temporary_field"]
        registry.save_custom_preset(args.name, args.description or "", smells)
        print(f"规则集 '{args.name}' 已保存。")

    elif args.action == "show":
        preset = registry.get_preset(args.name)
        if preset:
            print(f"规则集: {args.name}")
            print(f"描述: {preset['description']}")
            print(f"启用的检测: {', '.join(preset['enabled_smells'])}")
            if preset.get("config"):
                print(f"配置: {json.dumps(preset['config'], ensure_ascii=False, indent=2)}")
        else:
            print(f"规则集 '{args.name}' 不存在。")


def cmd_debt(args):
    analyzer = Analyzer(preset=args.preset, enabled_smells=args.smells)

    path = args.path
    if os.path.isfile(path):
        results = analyzer.analyze_file(path)
    elif os.path.isdir(path):
        results = analyzer.analyze_directory(path)
    else:
        print(f"错误: 路径不存在: {path}")
        sys.exit(1)

    score, grade = analyzer.calculate_debt_score(results)
    stats = analyzer.get_statistics(results)

    grade_emoji = {"A": "🟢", "B": "🟢", "C": "🟡", "D": "🟠", "E": "🔴", "F": "🟣"}

    print(f"\n{'='*50}")
    print(f"  技术债务评估")
    print(f"{'='*50}")
    print(f"  等级: {grade_emoji.get(grade, '⚪')} {grade}")
    print(f"  评分: {score:.1f} / 100")
    print(f"  异味总数: {stats['total']}")
    print(f"  严重: {stats['by_severity'].get('critical', 0)}")
    print(f"  高: {stats['by_severity'].get('high', 0)}")
    print(f"  中: {stats['by_severity'].get('medium', 0)}")
    print(f"  低: {stats['by_severity'].get('low', 0)}")
    print(f"{'='*50}\n")


def main():
    parser = argparse.ArgumentParser(
        prog="smell-detector",
        description="🔍 代码异味检测与解释器 - 检测 Python/JavaScript 代码中的异味并提供重构建议",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="分析代码文件或目录")
    p_analyze.add_argument("path", help="文件或目录路径")
    p_analyze.add_argument("--preset", default="all", help="规则集名称 (默认: all)")
    p_analyze.add_argument("--smells", nargs="+", help="只检测指定的异味类型")
    p_analyze.add_argument("--html", metavar="FILE", help="生成 HTML 报告")
    p_analyze.add_argument("--csv", metavar="FILE", help="导出 CSV 报表")
    p_analyze.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")
    p_analyze.add_argument("-q", "--quiet", action="store_true", help="简洁输出")
    p_analyze.set_defaults(func=cmd_analyze)

    # ci
    p_ci = subparsers.add_parser("ci", help="CI 模式检查")
    p_ci.add_argument("path", help="文件或目录路径")
    p_ci.add_argument("--preset", default="all", help="规则集名称")
    p_ci.add_argument("--smells", nargs="+", help="只检测指定的异味类型")
    p_ci.add_argument("--max-critical", type=int, default=0, help="最大严重异味数 (默认: 0)")
    p_ci.add_argument("--max-high", type=int, default=5, help="最大高严重异味数 (默认: 5)")
    p_ci.add_argument("--max-debt", type=float, default=50.0, help="最大技术债务评分 (默认: 50)")
    p_ci.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    p_ci.set_defaults(func=cmd_ci)

    # autofix
    p_fix = subparsers.add_parser("autofix", help="自动修复代码异味")
    p_fix.add_argument("path", help="文件或目录路径")
    p_fix.add_argument("--preset", default="all", help="规则集名称")
    p_fix.add_argument("--smells", nargs="+", help="只检测指定的异味类型")
    p_fix.add_argument("--dry-run", action="store_true", default=True, help="预览模式 (默认)")
    p_fix.add_argument("--no-dry-run", action="store_false", dest="dry_run", help="实际执行修复")
    p_fix.set_defaults(func=cmd_autofix)

    # feedback
    p_fb = subparsers.add_parser("feedback", help="管理误报反馈")
    p_fb.add_argument("action", choices=["mark", "unmark", "list", "clear"], help="操作")
    p_fb.add_argument("--file", help="文件路径")
    p_fb.add_argument("--smell-type", help="异味类型")
    p_fb.add_argument("--line", type=int, help="起始行号")
    p_fb.add_argument("--reason", help="误报原因")
    p_fb.set_defaults(func=cmd_feedback)

    # rules
    p_rules = subparsers.add_parser("rules", help="管理检测规则集")
    p_rules.add_argument("action", choices=["list", "save", "show"], help="操作")
    p_rules.add_argument("--name", help="规则集名称")
    p_rules.add_argument("--description", help="规则集描述")
    p_rules.add_argument("--smells", help="启用的异味类型 (逗号分隔)")
    p_rules.set_defaults(func=cmd_rules)

    # debt
    p_debt = subparsers.add_parser("debt", help="显示技术债务评分")
    p_debt.add_argument("path", help="文件或目录路径")
    p_debt.add_argument("--preset", default="all", help="规则集名称")
    p_debt.add_argument("--smells", nargs="+", help="只检测指定的异味类型")
    p_debt.set_defaults(func=cmd_debt)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
