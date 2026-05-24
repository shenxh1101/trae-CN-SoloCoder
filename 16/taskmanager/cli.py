import argparse
import sys
import os
from datetime import datetime, date
from typing import Optional, List

from .models import Task, TaskStatus, Priority, RepeatFrequency
from .task_manager import TaskManager, SortField
from .storage import Storage
from .ui import UIRenderer
from .exporter import DataExporter
from .notifier import Notifier
from .completion import CompletionGenerator
from .global_shortcut import GlobalShortcutManager
from .daemon import TaskDaemon


class TaskCLI:
    def __init__(self):
        self.storage = Storage()
        config = self.storage.get_config()
        self.theme_name = config.get("theme", "dark")
        self.ui = UIRenderer(self.theme_name)
        self.tm = TaskManager(self.storage)
        self.notifier = Notifier(self.ui)
        self.exporter = DataExporter()
        self.shortcut_manager = GlobalShortcutManager()

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"日期格式错误，请使用 YYYY-MM-DD 格式: {date_str}")

    def _parse_datetime(self, datetime_str: Optional[str]) -> Optional[datetime]:
        if not datetime_str:
            return None
        try:
            return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
        except ValueError:
            try:
                return datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M")
            except ValueError:
                raise ValueError(
                    f"时间格式错误，请使用 YYYY-MM-DD HH:MM 格式: {datetime_str}"
                )

    def _parse_tags(self, tags_str: Optional[str]) -> List[str]:
        if not tags_str:
            return []
        return [t.strip() for t in tags_str.split(",") if t.strip()]

    def cmd_add(self, args):
        try:
            due_date = self._parse_date(args.due_date)
            reminder_time = self._parse_datetime(args.reminder_time)
            tags = self._parse_tags(args.tags)
            dependencies = args.dependencies or []

            task = self.tm.add_task(
                title=args.title,
                description=args.description or "",
                priority=Priority(args.priority),
                tags=tags,
                due_date=due_date,
                dependencies=dependencies,
                repeat_frequency=RepeatFrequency(args.repeat),
                reminder_time=reminder_time,
            )

            print(self.ui.render_success(f"任务已创建: {task.title} (ID: {task.id})"))
            if args.verbose:
                all_tasks = self.storage.load_tasks()
                print(self.ui.render_task_detail(task, all_tasks))
        except Exception as e:
            print(self.ui.render_error(f"创建任务失败: {e}"))
            sys.exit(1)

    def cmd_list(self, args):
        if args.all_ids:
            tasks = self.storage.load_tasks()
            print(" ".join(t.id for t in tasks))
            return

        try:
            status = TaskStatus(args.status) if args.status else None
            sort_by = SortField(args.sort) if args.sort else SortField.PRIORITY

            tasks = self.tm.list_tasks(
                status=status,
                sort_by=sort_by,
                reverse=not args.no_reverse,
            )

            print(self.ui.render_task_table(tasks, show_details=args.verbose))
        except Exception as e:
            print(self.ui.render_error(f"列出任务失败: {e}"))
            sys.exit(1)

    def cmd_show(self, args):
        task = self.storage.get_task_by_id(args.task_id)
        if not task:
            print(self.ui.render_error(f"任务不存在: {args.task_id}"))
            sys.exit(1)

        all_tasks = self.storage.load_tasks()
        print(self.ui.render_task_detail(task, all_tasks))

    def cmd_edit(self, args):
        task = self.storage.get_task_by_id(args.task_id)
        if not task:
            print(self.ui.render_error(f"任务不存在: {args.task_id}"))
            sys.exit(1)

        try:
            updates = {}
            if args.title is not None:
                updates["title"] = args.title
            if args.description is not None:
                updates["description"] = args.description
            if args.priority is not None:
                updates["priority"] = Priority(args.priority)
            if args.tags is not None:
                updates["tags"] = self._parse_tags(args.tags)
            if args.due_date is not None:
                updates["due_date"] = self._parse_date(args.due_date)
            if args.repeat is not None:
                updates["repeat_frequency"] = RepeatFrequency(args.repeat)

            updated = self.tm.update_task(args.task_id, **updates)
            if updated:
                print(self.ui.render_success(f"任务已更新: {updated.title}"))
                if args.verbose:
                    all_tasks = self.storage.load_tasks()
                    print(self.ui.render_task_detail(updated, all_tasks))
            else:
                print(self.ui.render_error("更新任务失败"))
                sys.exit(1)
        except Exception as e:
            print(self.ui.render_error(f"编辑任务失败: {e}"))
            sys.exit(1)

    def cmd_delete(self, args):
        task = self.tm.delete_task(args.task_id)
        if task:
            print(self.ui.render_success(f"任务已删除: {task.title} (已备份到回收站)"))
        else:
            print(self.ui.render_error(f"任务不存在: {args.task_id}"))
            sys.exit(1)

    def cmd_status(self, args):
        try:
            task = self.tm.set_status(args.task_id, TaskStatus(args.status))
            if task:
                print(
                    self.ui.render_success(
                        f"任务状态已更新: {task.title} → {args.status}"
                    )
                )
            else:
                print(self.ui.render_error(f"任务不存在: {args.task_id}"))
                sys.exit(1)
        except ValueError as e:
            print(self.ui.render_error(str(e)))
            sys.exit(1)

    def cmd_start(self, args):
        try:
            task = self.tm.mark_in_progress(args.task_id)
            if task:
                print(self.ui.render_success(f"任务已开始: {task.title}"))
            else:
                print(self.ui.render_error(f"任务不存在: {args.task_id}"))
                sys.exit(1)
        except ValueError as e:
            print(self.ui.render_error(str(e)))
            sys.exit(1)

    def cmd_complete(self, args):
        task = self.tm.mark_completed(args.task_id)
        if task:
            print(self.ui.render_success(f"任务已完成: {task.title}"))
        else:
            print(self.ui.render_error(f"任务不存在: {args.task_id}"))
            sys.exit(1)

    def cmd_hold(self, args):
        task = self.tm.mark_on_hold(args.task_id)
        if task:
            print(self.ui.render_success(f"任务已搁置: {task.title}"))
        else:
            print(self.ui.render_error(f"任务不存在: {args.task_id}"))
            sys.exit(1)

    def cmd_search(self, args):
        if not args.tags:
            print(self.ui.render_error("请指定至少一个标签"))
            sys.exit(1)

        tags = self._parse_tags(args.tags)
        tasks = self.tm.search_by_tags(tags, match_all=not args.any)

        title = f"搜索结果 (标签: {', '.join(tags)}, {'全部匹配' if not args.any else '任意匹配'})"
        print(self.ui.render_task_table(tasks, title=title, show_details=args.verbose))

    def cmd_report(self, args):
        report = self.tm.get_today_report()
        print(self.ui.render_daily_report(report))

        due_reminders = self.tm.check_reminders()
        if due_reminders:
            print()
            self.notifier.check_and_notify(due_reminders)

    def cmd_depend(self, args):
        if args.action == "add":
            if not args.dependency_id:
                print(self.ui.render_error("请指定依赖任务ID"))
                sys.exit(1)
            try:
                task = self.tm.add_dependency(args.task_id, args.dependency_id)
                if task:
                    print(self.ui.render_success(f"已添加依赖: {args.task_id} → {args.dependency_id}"))
                else:
                    print(self.ui.render_error("任务不存在"))
                    sys.exit(1)
            except ValueError as e:
                print(self.ui.render_error(str(e)))
                sys.exit(1)

        elif args.action == "remove":
            if not args.dependency_id:
                print(self.ui.render_error("请指定依赖任务ID"))
                sys.exit(1)
            task = self.tm.remove_dependency(args.task_id, args.dependency_id)
            if task:
                print(self.ui.render_success(f"已移除依赖: {args.task_id} → {args.dependency_id}"))
            else:
                print(self.ui.render_error("任务不存在"))
                sys.exit(1)

        elif args.action == "show":
            deps = self.tm.get_task_dependencies(args.task_id)
            blocked = self.tm.get_blocked_tasks(args.task_id)

            if deps:
                print(self.ui.render_info("依赖任务:"))
                for dep in deps:
                    print(f"  • {dep.title} (ID: {dep.id})")
            else:
                print(self.ui.render_info("无依赖任务"))

            if blocked:
                print(self.ui.render_info("\n被阻塞的任务:"))
                for b in blocked:
                    print(f"  • {b.title} (ID: {b.id})")

    def cmd_export(self, args):
        tasks = self.storage.load_tasks()
        filepath = args.output or f"tasks_export.{args.format}"

        try:
            if args.format == "csv":
                self.exporter.export_to_csv(tasks, filepath)
            elif args.format == "html":
                self.exporter.export_to_html(tasks, filepath)
            elif args.format == "json":
                self.exporter.export_to_json(tasks, filepath)
            else:
                print(self.ui.render_error(f"不支持的导出格式: {args.format}"))
                sys.exit(1)

            print(self.ui.render_success(f"已导出 {len(tasks)} 个任务到 {filepath}"))
        except Exception as e:
            print(self.ui.render_error(f"导出失败: {e}"))
            sys.exit(1)

    def cmd_import(self, args):
        try:
            tasks_data = self.exporter.import_from_json(args.file)
            count = self.storage.import_tasks(tasks_data, merge=not args.replace)
            print(self.ui.render_success(f"已导入 {count} 个任务"))
        except Exception as e:
            print(self.ui.render_error(f"导入失败: {e}"))
            sys.exit(1)

    def cmd_theme(self, args):
        self.storage.update_config("theme", args.theme)
        self.ui.set_theme(args.theme)
        print(self.ui.render_success(f"主题已切换为: {args.theme}"))

    def cmd_reminder(self, args):
        try:
            reminder_time = self._parse_datetime(args.time)
            task = self.tm.update_task(
                args.task_id,
                reminder_time=reminder_time,
                reminder_sent=False,
            )
            if task:
                print(
                    self.ui.render_success(
                        f"已设置提醒: {task.title} - {reminder_time.strftime('%Y-%m-%d %H:%M')}"
                    )
                )
            else:
                print(self.ui.render_error(f"任务不存在: {args.task_id}"))
                sys.exit(1)
        except Exception as e:
            print(self.ui.render_error(f"设置提醒失败: {e}"))
            sys.exit(1)

    def cmd_trash(self, args):
        if args.action == "list":
            tasks = self.storage.list_trash()
            print(self.ui.render_trash_list(tasks))

        elif args.action == "restore":
            if not args.task_id:
                print(self.ui.render_error("请指定要恢复的任务ID"))
                sys.exit(1)
            task = self.storage.restore_task(args.task_id)
            if task:
                print(self.ui.render_success(f"任务已恢复: {task.title}"))
            else:
                print(self.ui.render_error(f"回收站中没有该任务: {args.task_id}"))
                sys.exit(1)

        elif args.action == "empty":
            count = self.storage.empty_trash()
            print(self.ui.render_success(f"回收站已清空，删除了 {count} 个任务"))

    def cmd_completion(self, args):
        if args.instructions:
            print(CompletionGenerator.get_install_instructions(args.shell))
            return

        try:
            content = CompletionGenerator.generate(args.shell, args.output_dir)
            if args.output_dir:
                print(self.ui.render_success(f"补全脚本已生成: {content}"))
            else:
                print(content)
        except Exception as e:
            print(self.ui.render_error(f"生成补全脚本失败: {e}"))
            sys.exit(1)

    def cmd_daemon(self, args):
        daemon = TaskDaemon(interval=args.interval)
        daemon.start(background=not args.foreground)

    def cmd_shortcut(self, args):
        if args.setup:
            self.shortcut_manager.setup()
        elif args.show:
            report = self.tm.get_today_report()
            self.notifier.show_today_overview(report)
        else:
            print(self.shortcut_manager.get_setup_instructions())

    def cmd_tags(self, args):
        tags = self.tm.get_all_tags()
        print(self.ui.render_tag_list(list(tags)))

    def run(self):
        parser = argparse.ArgumentParser(
            prog="task",
            description="命令行任务管理工具",
            formatter_class=argparse.RawDescriptionHelpFormatter,
        )
        subparsers = parser.add_subparsers(dest="command", help="可用命令")

        # add
        p_add = subparsers.add_parser("add", help="添加新任务")
        p_add.add_argument("--title", required=True, help="任务标题")
        p_add.add_argument("--description", help="任务描述")
        p_add.add_argument(
            "--priority",
            default="medium",
            choices=["low", "medium", "high", "urgent"],
            help="优先级",
        )
        p_add.add_argument("--tags", help="标签，用逗号分隔")
        p_add.add_argument("--due-date", help="截止日期 (YYYY-MM-DD)")
        p_add.add_argument(
            "--dependencies",
            nargs="*",
            help="依赖的任务ID列表",
        )
        p_add.add_argument(
            "--repeat",
            default="none",
            choices=["none", "daily", "weekly", "monthly"],
            help="重复频率",
        )
        p_add.add_argument("--reminder-time", help="提醒时间 (YYYY-MM-DD HH:MM)")
        p_add.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")

        # list
        p_list = subparsers.add_parser("list", help="列出所有任务")
        p_list.add_argument(
            "--status",
            choices=["pending", "in_progress", "completed", "on_hold"],
            help="按状态筛选",
        )
        p_list.add_argument(
            "--sort",
            default="priority",
            choices=["priority", "due_date", "created_at", "updated_at", "status", "title"],
            help="排序方式",
        )
        p_list.add_argument("--no-reverse", action="store_true", help="不反转排序")
        p_list.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")
        p_list.add_argument("--all-ids", action="store_true", help=argparse.SUPPRESS)

        # show
        p_show = subparsers.add_parser("show", help="显示任务详情")
        p_show.add_argument("task_id", help="任务ID")

        # edit
        p_edit = subparsers.add_parser("edit", help="编辑任务")
        p_edit.add_argument("task_id", help="任务ID")
        p_edit.add_argument("--title", help="任务标题")
        p_edit.add_argument("--description", help="任务描述")
        p_edit.add_argument(
            "--priority",
            choices=["low", "medium", "high", "urgent"],
            help="优先级",
        )
        p_edit.add_argument("--tags", help="标签，用逗号分隔")
        p_edit.add_argument("--due-date", help="截止日期 (YYYY-MM-DD)")
        p_edit.add_argument(
            "--repeat",
            choices=["none", "daily", "weekly", "monthly"],
            help="重复频率",
        )
        p_edit.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")

        # delete
        p_delete = subparsers.add_parser("delete", help="删除任务")
        p_delete.add_argument("task_id", help="任务ID")

        # status
        p_status = subparsers.add_parser("status", help="设置任务状态")
        p_status.add_argument("task_id", help="任务ID")
        p_status.add_argument(
            "status",
            choices=["pending", "in_progress", "completed", "on_hold"],
            help="新状态",
        )

        # start
        p_start = subparsers.add_parser("start", help="标记任务为进行中")
        p_start.add_argument("task_id", help="任务ID")

        # complete
        p_complete = subparsers.add_parser("complete", help="标记任务为已完成")
        p_complete.add_argument("task_id", help="任务ID")

        # hold
        p_hold = subparsers.add_parser("hold", help="标记任务为已搁置")
        p_hold.add_argument("task_id", help="任务ID")

        # search
        p_search = subparsers.add_parser("search", help="按标签搜索任务")
        p_search.add_argument("--tags", required=True, help="标签列表，用逗号分隔")
        p_search.add_argument(
            "--any",
            action="store_true",
            help="匹配任意标签（默认匹配全部）",
        )
        p_search.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")

        # report
        subparsers.add_parser("report", help="生成每日任务报告")

        # depend
        p_depend = subparsers.add_parser("depend", help="管理任务依赖")
        p_depend.add_argument(
            "action",
            choices=["add", "remove", "show"],
            help="操作",
        )
        p_depend.add_argument("task_id", help="任务ID")
        p_depend.add_argument("dependency_id", nargs="?", help="依赖任务ID")

        # export
        p_export = subparsers.add_parser("export", help="导出任务数据")
        p_export.add_argument(
            "--format",
            default="json",
            choices=["csv", "html", "json"],
            help="导出格式",
        )
        p_export.add_argument("--output", help="输出文件路径")

        # import
        p_import = subparsers.add_parser("import", help="导入任务数据")
        p_import.add_argument("--file", required=True, help="导入文件路径")
        p_import.add_argument(
            "--replace",
            action="store_true",
            help="替换现有任务（默认合并）",
        )

        # theme
        p_theme = subparsers.add_parser("theme", help="切换主题")
        p_theme.add_argument("theme", choices=["dark", "light"], help="主题名称")

        # reminder
        p_reminder = subparsers.add_parser("reminder", help="设置任务提醒")
        p_reminder.add_argument("task_id", help="任务ID")
        p_reminder.add_argument(
            "--time",
            required=True,
            help="提醒时间 (YYYY-MM-DD HH:MM)",
        )

        # trash
        p_trash = subparsers.add_parser("trash", help="回收站管理")
        p_trash.add_argument(
            "action",
            choices=["list", "restore", "empty"],
            help="操作",
        )
        p_trash.add_argument("task_id", nargs="?", help="任务ID（用于restore）")

        # completion
        p_completion = subparsers.add_parser("completion", help="生成自动补全脚本")
        p_completion.add_argument(
            "shell",
            choices=["zsh", "bash", "fish"],
            help="Shell类型",
        )
        p_completion.add_argument("--output-dir", help="输出目录")
        p_completion.add_argument(
            "--instructions",
            action="store_true",
            help="显示安装说明",
        )

        # daemon
        p_daemon = subparsers.add_parser("daemon", help="启动后台守护进程")
        p_daemon.add_argument(
            "--interval",
            type=int,
            default=60,
            help="检查间隔（秒）",
        )
        p_daemon.add_argument(
            "-f",
            "--foreground",
            action="store_true",
            help="前台运行",
        )

        # shortcut
        p_shortcut = subparsers.add_parser("shortcut", help="全局快捷键管理")
        p_shortcut.add_argument("--setup", action="store_true", help="配置全局快捷键")
        p_shortcut.add_argument("--show", action="store_true", help="显示今日任务概览")

        # tags
        subparsers.add_parser("tags", help="列出所有标签")

        args = parser.parse_args()

        if not args.command:
            parser.print_help()
            sys.exit(0)

        command_map = {
            "add": self.cmd_add,
            "list": self.cmd_list,
            "show": self.cmd_show,
            "edit": self.cmd_edit,
            "delete": self.cmd_delete,
            "status": self.cmd_status,
            "start": self.cmd_start,
            "complete": self.cmd_complete,
            "hold": self.cmd_hold,
            "search": self.cmd_search,
            "report": self.cmd_report,
            "depend": self.cmd_depend,
            "export": self.cmd_export,
            "import": self.cmd_import,
            "theme": self.cmd_theme,
            "reminder": self.cmd_reminder,
            "trash": self.cmd_trash,
            "completion": self.cmd_completion,
            "daemon": self.cmd_daemon,
            "shortcut": self.cmd_shortcut,
            "tags": self.cmd_tags,
        }

        handler = command_map.get(args.command)
        if handler:
            handler(args)
        else:
            parser.print_help()
            sys.exit(1)


def main():
    cli = TaskCLI()
    cli.run()


if __name__ == "__main__":
    main()
