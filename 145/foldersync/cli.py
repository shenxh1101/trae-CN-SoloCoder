import argparse
import os
import subprocess
import sys

from .config import SyncConfig, SyncRule, DEFAULT_EXCLUDES, load_config
from .report import SyncReport, preview_actions
from .scheduler import Scheduler
from .sync_engine import SyncEngine, ActionType


def interactive_conflict_resolver(rel_path: str) -> str:
    print(f"\n  Conflict detected for: {rel_path}")
    print("  Both sides have been modified.")
    print("  [s] Keep source   [t] Keep target   [r] Rename (keep both)")
    while True:
        choice = input("  Choose (s/t/r): ").strip().lower()
        if choice == "s":
            return "source"
        elif choice == "t":
            return "target"
        elif choice == "r":
            return "rename"
        print("  Invalid choice. Please enter s, t, or r.")


def run_rule(rule: SyncRule, args: argparse.Namespace) -> None:
    print(f"\n{'=' * 60}")
    print(f"Rule: {rule.name}")
    print(f"Source: {rule.source}")
    print(f"Target: {rule.target}")
    print(f"Mode: {rule.mode}")
    print(f"{'=' * 60}")

    if not os.path.isdir(rule.source):
        print(f"Error: Source directory does not exist: {rule.source}")
        return
    if not os.path.isdir(rule.target):
        os.makedirs(rule.target, exist_ok=True)
        print(f"Created target directory: {rule.target}")

    resolver = interactive_conflict_resolver
    if rule.conflict_strategy in ("source", "target", "rename"):
        resolver = lambda _path: rule.conflict_strategy

    engine = SyncEngine(rule=rule, conflict_resolver=resolver)

    actions = engine.plan()

    copy_count = sum(1 for a in actions if a.action_type == ActionType.COPY)
    overwrite_count = sum(1 for a in actions if a.action_type == ActionType.OVERWRITE)
    delete_count = sum(1 for a in actions if a.action_type == ActionType.DELETE)
    rename_count = sum(1 for a in actions if a.action_type == ActionType.RENAME_AND_COPY)

    if not any(a.action_type != ActionType.SKIP for a in actions):
        print("Nothing to sync. All files are up to date.")
        return

    print(preview_actions(actions))

    if args.preview:
        print("Preview mode. No changes made.")
        report = SyncReport(rule.name, engine.result, actions)
        print(report.to_text())
        return

    if not args.yes:
        answer = input("Proceed with sync? [y/N]: ").strip().lower()
        if answer != "y":
            print("Sync cancelled.")
            return

    result = engine.sync(actions)

    report = SyncReport(rule.name, result, actions)
    print(report.to_text())

    report_dir = args.report_dir or os.path.join(rule.source, ".foldersync_reports")
    report_path = report.save(report_dir)
    print(f"Report saved to: {report_path}")

    if rule.post_sync_command:
        try:
            subprocess.run(rule.post_sync_command, shell=True, check=True)
            print(f"Post-sync command executed: {rule.post_sync_command}")
        except subprocess.CalledProcessError as e:
            print(f"Post-sync command failed: {e}")


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="foldersync",
        description="A command-line folder synchronization tool with unidirectional and bidirectional sync support.",
    )

    parser.add_argument("-s", "--source", help="Source directory path")
    parser.add_argument("-t", "--target", help="Target directory path")
    parser.add_argument(
        "-m", "--mode",
        choices=["unidirectional", "bidirectional"],
        default="unidirectional",
        help="Sync mode (default: unidirectional)",
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=list(DEFAULT_EXCLUDES),
        help=f"Exclude patterns (default: {DEFAULT_EXCLUDES})",
    )
    parser.add_argument(
        "--extension",
        nargs="*",
        default=None,
        help="Only sync files with these extensions (e.g. .py .txt)",
    )
    parser.add_argument(
        "--no-md5",
        action="store_true",
        help="Disable MD5-based diff, use mtime only",
    )
    parser.add_argument(
        "--conflict",
        choices=["source", "target", "rename", "ask"],
        default="ask",
        help="Conflict resolution strategy (default: ask)",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Enable incremental sync (only sync changed files since last sync)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of threads for parallel sync (default: 4)",
    )
    parser.add_argument(
        "--post-command",
        default=None,
        help="Command to run after sync completes",
    )
    parser.add_argument(
        "-p", "--preview",
        action="store_true",
        help="Preview mode: show actions without executing",
    )
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Skip confirmation prompt",
    )
    parser.add_argument(
        "--report-dir",
        default=None,
        help="Directory to save sync reports",
    )
    parser.add_argument(
        "-c", "--config",
        default=None,
        help="Path to YAML config file with sync rules",
    )
    parser.add_argument(
        "--schedule-interval",
        type=int,
        default=0,
        help="Run sync in a loop with this interval in seconds",
    )
    parser.add_argument(
        "--schedule-cron",
        default=None,
        help="Cron expression for scheduled sync (e.g. '0 */2 * * *')",
    )
    parser.add_argument(
        "--setup-cron",
        action="store_true",
        help="Install cron job for scheduled sync",
    )
    parser.add_argument(
        "--remove-cron",
        action="store_true",
        help="Remove foldersync cron jobs",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0",
    )

    return parser


def main(argv=None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    if args.remove_cron:
        scheduler = Scheduler(sync_func=lambda: None)
        result = scheduler.remove_cron()
        print(result)
        return 0

    if args.config:
        try:
            config = load_config(args.config)
        except FileNotFoundError as e:
            print(f"Error: {e}")
            return 1
        except Exception as e:
            print(f"Error loading config: {e}")
            return 1

        if args.setup_cron and config.schedule:
            scheduler = Scheduler(
                sync_func=lambda: None,
                schedule=config.schedule,
            )
            script_path = os.path.abspath(__file__)
            result = scheduler.setup_cron(script_path)
            print(result)
            return 0

        def run_all():
            for rule in config.rules:
                run_rule(rule, args)

        if args.schedule_interval > 0:
            scheduler = Scheduler(sync_func=run_all, interval=args.schedule_interval)
            scheduler.run_loop()
        else:
            run_all()
    else:
        if not args.source or not args.target:
            parser.error("Source and target directories are required when not using --config")

        rule = SyncRule(
            name="cli-sync",
            source=os.path.expanduser(args.source),
            target=os.path.expanduser(args.target),
            mode=args.mode,
            excludes=args.exclude,
            extensions=args.extension,
            use_md5=not args.no_md5,
            conflict_strategy=args.conflict,
            post_sync_command=args.post_command,
            incremental=args.incremental,
            max_workers=args.workers,
        )

        def run_single():
            run_rule(rule, args)

        if args.schedule_interval > 0:
            scheduler = Scheduler(sync_func=run_single, interval=args.schedule_interval)
            scheduler.run_loop()
        else:
            run_single()

    return 0


if __name__ == "__main__":
    sys.exit(main())
