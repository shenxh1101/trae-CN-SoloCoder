#!/usr/bin/env python3
import argparse
import os
import sys
import json
import datetime
from typing import List, Optional

from codedoc.config import Config, ScanResult, Diagnosis, find_config
from codedoc.python_analyzer import PythonAnalyzer
from codedoc.js_analyzer import JavaScriptAnalyzer
from codedoc.complexity import ComplexityCalculator
from codedoc.reporter import JSONReporter, MarkdownReporter, HTMLReporter
from codedoc.fixer import AutoFixer
from codedoc.feedback import FeedbackStore
from codedoc.git_hooks import install_pre_commit_hook, uninstall_pre_commit_hook, is_hook_installed
from codedoc.email_sender import EmailSender


SEVERITY_EMOJI = {"error": "🔴", "warning": "🟡", "info": "🔵"}
SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}

SUPPORTED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs"}


def _is_code_file(filepath: str) -> bool:
    ext = os.path.splitext(filepath)[1].lower()
    return ext in SUPPORTED_EXTENSIONS


def _collect_files(path: str, config: Config) -> List[str]:
    files = []
    abs_path = os.path.abspath(path)

    if os.path.isfile(abs_path):
        if _is_code_file(abs_path) and not config.should_ignore_file(abs_path):
            return [abs_path]
        return []

    for root, dirs, filenames in os.walk(abs_path):
        dirs[:] = [d for d in dirs if not config.should_ignore_file(os.path.join(root, d))]
        for fname in sorted(filenames):
            fpath = os.path.join(root, fname)
            if _is_code_file(fpath) and not config.should_ignore_file(fpath):
                files.append(fpath)

    return files


def _scan_file(filepath: str, config: Config, include_complexity: bool = True) -> ScanResult:
    ext = os.path.splitext(filepath)[1].lower()
    diagnoses = []

    if ext == ".py":
        analyzer = PythonAnalyzer(config)
        diagnoses = analyzer.analyze(filepath)
    elif ext in (".js", ".jsx", ".mjs", ".ts", ".tsx"):
        analyzer = JavaScriptAnalyzer(config)
        diagnoses = analyzer.analyze(filepath)

    complexity_results = []
    if include_complexity:
        calc = ComplexityCalculator(config)
        complexity_results = calc.analyze_file(filepath)

    return ScanResult(
        file=filepath,
        diagnoses=diagnoses,
        complexity_results=complexity_results,
    )


def _scan_files(files: List[str], config: Config, include_complexity: bool = True) -> List[ScanResult]:
    results = []
    total = len(files)
    for i, f in enumerate(files, 1):
        short = os.path.relpath(f)
        print(f"\r  扫描 [{i}/{total}] {short}           ", end="", flush=True)
        results.append(_scan_file(f, config, include_complexity))
    print()
    return results


def _print_results(results: List[ScanResult], severity: str = "info"):
    threshold = SEVERITY_ORDER.get(severity, 2)
    total_issues = 0

    for r in results:
        filtered = [d for d in r.diagnoses if SEVERITY_ORDER.get(d.severity, 2) <= threshold]
        if not filtered:
            continue

        print(f"\n  📄 {os.path.relpath(r.file)}")
        print(f"  {'─' * 60}")

        sorted_diags = sorted(filtered, key=lambda d: (SEVERITY_ORDER.get(d.severity, 99), d.line))
        for d in sorted_diags:
            emoji = SEVERITY_EMOJI.get(d.severity, "")
            total_issues += 1
            print(f"  {emoji} L{d.line:>4} │ {d.rule_id:<20} │ {d.message}")
            if d.suggestion:
                print(f"  {'':>8} │ 💡 {d.suggestion}")

        for c in r.complexity_results:
            if c.level == "high":
                total_issues += 1
                print(f"  🔴 复杂度 │ {c.function_name} (L{c.line_start}-L{c.line_end}) │ 复杂度={c.complexity}")
                print(f"  {'':>8} │ 💡 {c.suggestion}")

    print(f"\n  {'═' * 60}")
    errors = sum(1 for r in results for d in r.diagnoses if d.severity == "error")
    warnings = sum(1 for r in results for d in r.diagnoses if d.severity == "warning")
    infos = sum(1 for r in results for d in r.diagnoses if d.severity == "info")
    print(f"  总计: 🔴 {errors} 错误 │ 🟡 {warnings} 警告 │ 🔵 {infos} 提示 │ 共 {len(results)} 文件")
    return total_issues


def cmd_scan(args):
    config = _load_config(args)
    path = args.path or "."
    files = _collect_files(path, config)

    if not files:
        print("  ℹ️  未找到支持的代码文件 (.py, .js, .jsx, .ts, .tsx)")
        return 0

    print(f"  🔍 CodeDoc: 扫描 {len(files)} 个文件...")

    include_complexity = not args.no_complexity
    results = _scan_files(files, config, include_complexity)

    if args.feedback:
        store = FeedbackStore(os.path.abspath(path) if os.path.isdir(path) else os.path.dirname(os.path.abspath(path)))
        for r in results:
            r.diagnoses = store.mark_interactive(r.diagnoses)

    severity = args.severity or "info"
    total = _print_results(results, severity)

    if args.output:
        _export_report(results, args.output, args.format)

    if args.email:
        _send_email(results, config, args)

    return 1 if any(d.severity == "error" for r in results for d in r.diagnoses) else 0


def cmd_fix(args):
    config = _load_config(args)
    path = args.path or "."
    files = _collect_files(path, config)

    if not files:
        print("  ℹ️  未找到支持的代码文件")
        return 0

    print(f"  🔧 CodeDoc: 检查可修复的问题 ({len(files)} 个文件)...")

    fixer = AutoFixer(dry_run=args.dry_run)
    total_fixed = 0

    for f in files:
        result = _scan_file(f, config, include_complexity=False)
        fixable = [d for d in result.diagnoses if d.fixable]

        if not fixable:
            continue

        print(f"\n  📄 {os.path.relpath(f)} — 发现 {len(fixable)} 个可修复项:")
        for d in fixable:
            emoji = SEVERITY_EMOJI.get(d.severity, "")
            print(f"    {emoji} L{d.line} │ {d.rule_id} │ {d.message}")
            if d.suggestion:
                print(f"         💡 {d.suggestion}")

        if not args.yes:
            response = input(f"\n  是否修复 {os.path.relpath(f)} 中的问题? [y/n/a(全部)/q(退出)]: ").strip().lower()
            if response == "q":
                break
            elif response == "a":
                args.yes = True
            elif response != "y":
                print("    ⏭️  跳过")
                continue

        results = fixer.fix(f, fixable)
        for diag, success, msg in results:
            if success:
                total_fixed += 1
                print(f"    ✅ {msg}")
            else:
                print(f"    ❌ {msg}")

    print(f"\n  {'═' * 60}")
    print(f"  ✅ 共修复 {total_fixed} 个问题")
    if args.dry_run:
        print("  ℹ️  试运行模式，未实际修改文件")
    return 0


def cmd_complexity(args):
    config = _load_config(args)
    path = args.path or "."
    files = _collect_files(path, config)

    if not files:
        print("  ℹ️  未找到支持的代码文件")
        return 0

    calc = ComplexityCalculator(config)
    print(f"  📊 CodeDoc: 圈复杂度分析 ({len(files)} 个文件)\n")

    all_results = []
    for f in files:
        results = calc.analyze_file(f)
        all_results.extend(results)

    if not all_results:
        print("  未检测到函数/方法")
        return 0

    high = [r for r in all_results if r.level == "high"]
    medium = [r for r in all_results if r.level == "medium"]
    low = [r for r in all_results if r.level == "low"]

    print(f"  {'函数':<40} {'行号':<14} {'复杂度':<8} {'等级'}")
    print(f"  {'─' * 70}")

    for level, items in [("🔴 高", high), ("🟡 中", medium), ("🟢 低", low)]:
        for r in sorted(items, key=lambda x: -x.complexity):
            func_display = f"{os.path.basename(r.file)}::{r.function_name}"
            if len(func_display) > 38:
                func_display = "..." + func_display[-35:]
            print(f"  {func_display:<40} L{r.line_start}-L{r.line_end:<8} {r.complexity:<8} {level}")

    print(f"\n  {'═' * 70}")
    print(f"  总计: {len(all_results)} 个函数 │ 🔴 {len(high)} 高 │ 🟡 {len(medium)} 中 │ 🟢 {len(low)} 低")

    if high:
        print(f"\n  ⚠️  重构建议:")
        for r in high[:5]:
            func_display = f"{os.path.basename(r.file)}::{r.function_name}"
            print(f"    • {func_display} (复杂度={r.complexity}): {r.suggestion[:80]}")

    if args.output:
        scan_results = []
        for f in files:
            r = _scan_file(f, config, include_complexity=True)
            r.diagnoses = []
            scan_results.append(r)
        _export_report(scan_results, args.output, args.format)

    return 0


def cmd_feedback(args):
    project_root = os.path.abspath(args.path or ".")

    if args.action == "mark":
        store = FeedbackStore(project_root)
        rule_id = args.rule_id
        feedback_type = args.type

        if feedback_type not in ("false_positive", "helpful"):
            print("  ❌ 类型必须是 'false_positive' 或 'helpful'")
            return 1

        diag = Diagnosis(
            file=args.file or "unknown",
            line=int(args.line or 0),
            rule_id=rule_id,
            message="",
        )
        success = store.mark_feedback(diag, feedback_type, args.comment or "")
        if success:
            print(f"  ✅ 已标记规则 '{rule_id}' 为 {feedback_type}")
            suppressed = store.get_suppressed_rules()
            if rule_id in suppressed:
                print(f"  ⚠️  规则 '{rule_id}' 已被自动抑制（误报率超过60%）")
        return 0

    elif args.action == "stats":
        store = FeedbackStore(project_root)
        stats = store.get_stats()
        if not stats:
            print("  ℹ️  暂无反馈数据")
            return 0

        print("  📊 反馈统计:\n")
        print(f"  {'规则ID':<25} {'误报':<8} {'有帮助':<8} {'状态'}")
        print(f"  {'─' * 55}")
        suppressed = store.get_suppressed_rules()
        for rule_id, s in sorted(stats.items()):
            status = "🚫 已抑制" if rule_id in suppressed else "✅ 活跃"
            print(f"  {rule_id:<25} {s.get('false_positive', 0):<8} {s.get('helpful', 0):<8} {status}")
        return 0

    elif args.action == "list":
        store = FeedbackStore(project_root)
        entries = store.list_entries(
            rule_id=args.rule_id,
            feedback_type=args.type,
        )
        if not entries:
            print("  ℹ️  暂无反馈记录")
            return 0

        print(f"  📋 反馈记录 ({len(entries)} 条):\n")
        for e in entries[-20:]:
            fb = "🚫 误报" if e["feedback"] == "false_positive" else "✅ 有帮助"
            print(f"  {fb} │ {e['rule_id']:<20} │ {e['file']}:{e['line']}")
        return 0

    elif args.action == "reset":
        store = FeedbackStore(project_root)
        if store.reset_suppressed(args.rule_id):
            print(f"  ✅ 规则 '{args.rule_id}' 的抑制已重置")
        else:
            print(f"  ℹ️  规则 '{args.rule_id}' 未被抑制")
        return 0

    else:
        print("  ❌ 未知操作。支持: mark, stats, list, reset")
        return 1


def cmd_hook(args):
    project_root = os.path.abspath(args.path or ".")

    if args.action == "install":
        result = install_pre_commit_hook(project_root, args.config)
        print(f"  {result}")
    elif args.action == "uninstall":
        result = uninstall_pre_commit_hook(project_root)
        print(f"  {result}")
    elif args.action == "status":
        if is_hook_installed(project_root):
            print("  ✅ CodeDoc pre-commit 钩子已安装")
        else:
            print("  ℹ️  CodeDoc pre-commit 钩子未安装")
    else:
        print("  ❌ 未知操作。支持: install, uninstall, status")
        return 1
    return 0


def cmd_init(args):
    config_path = args.output or ".codedoc.json"
    if os.path.isfile(config_path) and not args.force:
        print(f"  ⚠️  配置文件已存在: {config_path}，使用 --force 覆盖")
        return 1

    config = Config()
    config.save(config_path)
    print(f"  ✅ 配置文件已创建: {config_path}")
    return 0


def cmd_export(args):
    config = _load_config(args)
    path = args.path or "."
    files = _collect_files(path, config)

    if not files:
        print("  ℹ️  未找到支持的代码文件")
        return 0

    print(f"  📤 CodeDoc: 导出报告 ({len(files)} 个文件)...")
    results = _scan_files(files, config, include_complexity=True)

    if args.feedback:
        store = FeedbackStore(os.path.abspath(path) if os.path.isdir(path) else os.path.dirname(os.path.abspath(path)))
        for r in results:
            r.diagnoses = store.mark_interactive(r.diagnoses)

    _export_report(results, args.output, args.format)

    if args.email:
        _send_email(results, config, args)

    return 0


def _load_config(args) -> Config:
    config_path = getattr(args, "config", None)
    if not config_path:
        search_dir = os.path.abspath(args.path or ".")
        if os.path.isfile(search_dir):
            search_dir = os.path.dirname(search_dir)
        config_path = find_config(search_dir)
    return Config(config_path)


def _export_report(results: List[ScanResult], output_path: str, fmt: str):
    ext = fmt or os.path.splitext(output_path)[1].lstrip(".")
    if ext == "json":
        JSONReporter().generate(results, output_path)
    elif ext == "html":
        HTMLReporter().generate(results, output_path)
    elif ext in ("md", "markdown"):
        MarkdownReporter().generate(results, output_path)
    else:
        print(f"  ⚠️  不支持的格式: {ext}，使用 json/html/markdown")
        return

    print(f"  📄 报告已导出: {output_path}")


def _send_email(results: List[ScanResult], config: Config, args):
    import tempfile

    email_cfg = {
        "smtp_host": getattr(args, "smtp_host", None) or config.get("email.smtp_host", ""),
        "smtp_port": int(getattr(args, "smtp_port", None) or config.get("email.smtp_port", 587)),
        "smtp_user": getattr(args, "smtp_user", None) or config.get("email.smtp_user", ""),
        "smtp_password": getattr(args, "smtp_password", None) or config.get("email.smtp_password", ""),
        "from_addr": getattr(args, "from_addr", None) or config.get("email.from_addr", ""),
        "to_addr": getattr(args, "to_addr", None) or config.get("email.to_addr", ""),
    }

    sender = EmailSender(**email_cfg, use_tls=True)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        MarkdownReporter().generate(results, f.name)
        md_path = f.name

    try:
        with open(md_path, "r", encoding="utf-8") as f:
            body = f.read()

        subject = f"CodeDoc 诊断报告 - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
        success, msg = sender.send_report(subject, body, attachment_path=md_path)
        if success:
            print(f"  📧 {msg}")
        else:
            print(f"  ❌ {msg}")
    finally:
        os.unlink(md_path)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="codedoc",
        description="🔍 CodeDoc - AI代码错误诊断与修复建议工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  codedoc scan ./src                扫描目录下所有代码文件
  codedoc scan app.py               扫描单个文件
  codedoc scan . --severity error   只显示错误级别的问题
  codedoc scan . -o report.json     扫描并导出JSON报告
  codedoc fix ./src                 自动修复可修复的问题
  codedoc complexity ./src          分析圈复杂度
  codedoc feedback mark --rule-id PY-UNDEF --type false_positive  标记误报
  codedoc hook install              安装Git pre-commit钩子
  codedoc export . -o report.html   导出HTML报告
        """,
    )

    parser.add_argument("--config", help="配置文件路径", default=None)

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    scan_parser = subparsers.add_parser("scan", help="扫描代码文件并诊断问题")
    scan_parser.add_argument("path", nargs="?", default=".", help="文件或目录路径")
    scan_parser.add_argument("-s", "--severity", choices=["error", "warning", "info"], default="info", help="最低显示严重度")
    scan_parser.add_argument("-o", "--output", help="报告输出路径")
    scan_parser.add_argument("-f", "--format", choices=["json", "html", "markdown"], help="报告格式")
    scan_parser.add_argument("--no-complexity", action="store_true", help="不计算圈复杂度")
    scan_parser.add_argument("--feedback", action="store_true", help="根据反馈数据过滤误报")
    scan_parser.add_argument("--email", action="store_true", help="通过邮件发送报告")

    fix_parser = subparsers.add_parser("fix", help="自动修复代码问题")
    fix_parser.add_argument("path", nargs="?", default=".", help="文件或目录路径")
    fix_parser.add_argument("-y", "--yes", action="store_true", help="跳过确认直接修复")
    fix_parser.add_argument("--dry-run", action="store_true", help="试运行，不实际修改文件")

    complexity_parser = subparsers.add_parser("complexity", help="分析圈复杂度")
    complexity_parser.add_argument("path", nargs="?", default=".", help="文件或目录路径")
    complexity_parser.add_argument("-o", "--output", help="报告输出路径")
    complexity_parser.add_argument("-f", "--format", choices=["json", "html", "markdown"], help="报告格式")

    feedback_parser = subparsers.add_parser("feedback", help="管理诊断反馈")
    feedback_parser.add_argument("path", nargs="?", default=".", help="项目根目录")
    feedback_sub = feedback_parser.add_subparsers(dest="action", help="反馈操作")

    mark_parser = feedback_sub.add_parser("mark", help="标记诊断结果")
    mark_parser.add_argument("--rule-id", required=True, help="规则ID")
    mark_parser.add_argument("--type", required=True, choices=["false_positive", "helpful"], help="反馈类型")
    mark_parser.add_argument("--file", help="文件路径")
    mark_parser.add_argument("--line", help="行号")
    mark_parser.add_argument("--comment", help="备注")

    feedback_sub.add_parser("stats", help="查看反馈统计")

    list_parser = feedback_sub.add_parser("list", help="列出反馈记录")
    list_parser.add_argument("--rule-id", help="按规则ID过滤")
    list_parser.add_argument("--type", choices=["false_positive", "helpful"], help="按类型过滤")

    reset_parser = feedback_sub.add_parser("reset", help="重置被抑制的规则")
    reset_parser.add_argument("--rule-id", required=True, help="规则ID")

    hook_parser = subparsers.add_parser("hook", help="管理Git钩子")
    hook_parser.add_argument("path", nargs="?", default=".", help="项目根目录")
    hook_parser.add_argument("--config", help="配置文件路径", default=None)
    hook_sub = hook_parser.add_subparsers(dest="action", help="钩子操作")
    hook_sub.add_parser("install", help="安装pre-commit钩子")
    hook_sub.add_parser("uninstall", help="卸载pre-commit钩子")
    hook_sub.add_parser("status", help="查看钩子状态")

    init_parser = subparsers.add_parser("init", help="初始化配置文件")
    init_parser.add_argument("-o", "--output", default=".codedoc.json", help="配置文件输出路径")
    init_parser.add_argument("--force", action="store_true", help="覆盖已有配置文件")

    export_parser = subparsers.add_parser("export", help="导出诊断报告")
    export_parser.add_argument("path", nargs="?", default=".", help="文件或目录路径")
    export_parser.add_argument("-o", "--output", required=True, help="报告输出路径")
    export_parser.add_argument("-f", "--format", choices=["json", "html", "markdown"], help="报告格式（默认根据扩展名判断）")
    export_parser.add_argument("--feedback", action="store_true", help="根据反馈数据过滤误报")
    export_parser.add_argument("--email", action="store_true", help="通过邮件发送报告")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "scan": cmd_scan,
        "fix": cmd_fix,
        "complexity": cmd_complexity,
        "feedback": cmd_feedback,
        "hook": cmd_hook,
        "init": cmd_init,
        "export": cmd_export,
    }

    handler = commands.get(args.command)
    if handler:
        exit_code = handler(args)
        sys.exit(exit_code or 0)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
