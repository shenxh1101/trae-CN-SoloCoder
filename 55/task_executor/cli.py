import argparse
import sys
import os
import json
from typing import Dict, List

from .models import (
    Task,
    TaskGroup,
    ScheduledTask,
    ExecutionMode,
    OnFailure,
    TaskStatus
)
from .task_manager import TaskManager
from .executor import TaskExecutor
from .scheduler import TaskScheduler


class TaskCLI:
    def __init__(self):
        self.task_manager = TaskManager()
        self.executor = TaskExecutor(self.task_manager)
        self.scheduler = TaskScheduler(self.task_manager, self.executor)
        self.parser = self._create_parser()

    def _create_parser(self) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(
            prog="task-executor",
            description="命令行任务执行工具 - 定义和执行自定义任务脚本"
        )
        subparsers = parser.add_subparsers(dest="command", help="可用命令")

        task_parser = subparsers.add_parser("task", help="任务管理")
        task_subparsers = task_parser.add_subparsers(dest="task_command", help="任务操作")

        add_parser = task_subparsers.add_parser("add", help="添加新任务")
        add_parser.add_argument("--name", required=True, help="任务名称")
        add_parser.add_argument("--commands", nargs="+", required=True, help="命令列表")
        add_parser.add_argument("--working-dir", default=".", help="工作目录")
        add_parser.add_argument("--mode", choices=["sequential", "parallel"], default="sequential", help="执行模式")
        add_parser.add_argument("--on-failure", choices=["stop", "continue"], default="stop", help="失败时处理")
        add_parser.add_argument("--deps", nargs="*", default=[], help="依赖任务")
        add_parser.add_argument("--env", nargs="*", default=[], help="环境变量 KEY=VALUE")
        add_parser.add_argument("--params", nargs="*", default=[], help="默认参数 KEY=VALUE")
        add_parser.add_argument("--backup", nargs="*", default=[], help="备份路径")
        add_parser.add_argument("--description", default="", help="任务描述")

        edit_parser = task_subparsers.add_parser("edit", help="编辑任务")
        edit_parser.add_argument("--name", required=True, help="任务名称")
        edit_parser.add_argument("--commands", nargs="+", help="命令列表")
        edit_parser.add_argument("--working-dir", help="工作目录")
        edit_parser.add_argument("--mode", choices=["sequential", "parallel"], help="执行模式")
        edit_parser.add_argument("--on-failure", choices=["stop", "continue"], help="失败时处理")
        edit_parser.add_argument("--deps", nargs="*", help="依赖任务")
        edit_parser.add_argument("--env", nargs="*", help="环境变量 KEY=VALUE")
        edit_parser.add_argument("--params", nargs="*", help="默认参数 KEY=VALUE")
        edit_parser.add_argument("--backup", nargs="*", help="备份路径")
        edit_parser.add_argument("--description", help="任务描述")

        delete_parser = task_subparsers.add_parser("delete", help="删除任务")
        delete_parser.add_argument("--name", required=True, help="任务名称")

        list_parser = task_subparsers.add_parser("list", help="列出所有任务")
        list_parser.add_argument("--verbose", action="store_true", help="显示详细信息")

        show_parser = task_subparsers.add_parser("show", help="显示任务详情")
        show_parser.add_argument("--name", required=True, help="任务名称")

        run_parser = task_subparsers.add_parser("run", help="执行任务")
        run_parser.add_argument("--name", required=True, help="任务名称")
        run_parser.add_argument("--params", nargs="*", default=[], help="参数 KEY=VALUE")
        run_parser.add_argument("--no-deps", action="store_true", help="不执行依赖")

        group_parser = subparsers.add_parser("group", help="任务组管理")
        group_subparsers = group_parser.add_subparsers(dest="group_command", help="组操作")

        add_group_parser = group_subparsers.add_parser("add", help="添加任务组")
        add_group_parser.add_argument("--name", required=True, help="组名称")
        add_group_parser.add_argument("--tasks", nargs="+", required=True, help="任务列表")
        add_group_parser.add_argument("--description", default="", help="组描述")

        group_subparsers.add_parser("list", help="列出所有任务组")

        edit_group_parser = group_subparsers.add_parser("edit", help="编辑任务组")
        edit_group_parser.add_argument("--name", required=True, help="组名称")
        edit_group_parser.add_argument("--tasks", nargs="+", help="任务列表")
        edit_group_parser.add_argument("--description", help="组描述")

        delete_group_parser = group_subparsers.add_parser("delete", help="删除任务组")
        delete_group_parser.add_argument("--name", required=True, help="组名称")

        show_group_parser = group_subparsers.add_parser("show", help="显示任务组详情")
        show_group_parser.add_argument("--name", required=True, help="组名称")

        run_group_parser = group_subparsers.add_parser("run", help="执行任务组")
        run_group_parser.add_argument("--name", required=True, help="组名称")
        run_group_parser.add_argument("--params", nargs="*", default=[], help="参数 KEY=VALUE")

        schedule_parser = subparsers.add_parser("schedule", help="定时任务管理")
        schedule_subparsers = schedule_parser.add_subparsers(dest="schedule_command", help="定时操作")

        add_schedule_parser = schedule_subparsers.add_parser("add", help="添加定时任务")
        add_schedule_parser.add_argument("--task", required=True, help="任务名称")
        add_schedule_parser.add_argument("--cron", required=True, help="Cron表达式 (5字段)")
        add_schedule_parser.add_argument("--params", nargs="*", default=[], help="参数 KEY=VALUE")

        schedule_subparsers.add_parser("list", help="列出所有定时任务")

        delete_schedule_parser = schedule_subparsers.add_parser("delete", help="删除定时任务")
        delete_schedule_parser.add_argument("--name", required=True, help="定时任务名称")

        start_schedule_parser = schedule_subparsers.add_parser("start", help="启动定时任务调度器")
        start_schedule_parser.add_argument("--once", action="store_true", help="只执行一次检查")

        log_parser = subparsers.add_parser("log", help="查看执行日志")
        log_parser.add_argument("--task", help="任务名称")
        log_parser.add_argument("--limit", type=int, default=50, help="显示条数")
        log_parser.add_argument("--full", action="store_true", help="显示完整输出")

        stats_parser = subparsers.add_parser("stats", help="查看执行统计")
        stats_parser.add_argument("--task", help="任务名称")

        export_parser = subparsers.add_parser("export", help="导出任务配置")
        export_parser.add_argument("--file", required=True, help="导出文件路径")
        export_parser.add_argument("--tasks", nargs="*", help="指定任务名称导出")

        import_parser = subparsers.add_parser("import", help="导入任务配置")
        import_parser.add_argument("--file", required=True, help="导入文件路径")
        import_parser.add_argument("--overwrite", action="store_true", help="覆盖已存在的任务")

        return parser

    def _parse_key_value(self, items: List[str]) -> Dict[str, str]:
        result = {}
        for item in items:
            if "=" in item:
                key, value = item.split("=", 1)
                result[key] = value
        return result

    def run(self):
        args = self.parser.parse_args()

        if args.command is None:
            self.parser.print_help()
            return

        try:
            if args.command == "task":
                self._handle_task_command(args)
            elif args.command == "group":
                self._handle_group_command(args)
            elif args.command == "schedule":
                self._handle_schedule_command(args)
            elif args.command == "log":
                self._handle_log_command(args)
            elif args.command == "stats":
                self._handle_stats_command(args)
            elif args.command == "export":
                self._handle_export_command(args)
            elif args.command == "import":
                self._handle_import_command(args)
        except Exception as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(1)

    def _handle_task_command(self, args):
        if args.task_command == "add":
            task = Task(
                name=args.name,
                commands=args.commands,
                working_dir=args.working_dir,
                execution_mode=ExecutionMode(args.mode),
                on_failure=OnFailure(args.on_failure),
                dependencies=args.deps,
                env_vars=self._parse_key_value(args.env),
                parameters=self._parse_key_value(args.params),
                backup_paths=args.backup,
                description=args.description
            )
            if self.task_manager.add_task(task):
                print(f"任务 '{args.name}' 已添加")
            else:
                print(f"任务 '{args.name}' 已存在")

        elif args.task_command == "edit":
            task = self.task_manager.get_task(args.name)
            if not task:
                print(f"任务 '{args.name}' 不存在")
                return

            if args.commands:
                task.commands = args.commands
            if args.working_dir:
                task.working_dir = args.working_dir
            if args.mode:
                task.execution_mode = ExecutionMode(args.mode)
            if args.on_failure:
                task.on_failure = OnFailure(args.on_failure)
            if args.deps is not None:
                task.dependencies = args.deps
            if args.env is not None:
                task.env_vars = self._parse_key_value(args.env)
            if args.params is not None:
                task.parameters = self._parse_key_value(args.params)
            if args.backup is not None:
                task.backup_paths = args.backup
            if args.description:
                task.description = args.description

            self.task_manager.update_task(task)
            print(f"任务 '{args.name}' 已更新")

        elif args.task_command == "delete":
            if self.task_manager.delete_task(args.name):
                print(f"任务 '{args.name}' 已删除")
            else:
                print(f"任务 '{args.name}' 不存在")

        elif args.task_command == "list":
            tasks = self.task_manager.list_tasks()
            if not tasks:
                print("没有任务")
                return
            print(f"共有 {len(tasks)} 个任务:")
            for task in tasks:
                mode = "串行" if task.execution_mode == ExecutionMode.SEQUENTIAL else "并行"
                print(f"  - {task.name}: {mode}执行, {len(task.commands)}条命令")
                if args.verbose:
                    print(f"    描述: {task.description}")
                    print(f"    工作目录: {task.working_dir}")
                    print(f"    命令: {task.commands}")
                    if task.dependencies:
                        print(f"    依赖: {', '.join(task.dependencies)}")

        elif args.task_command == "show":
            task = self.task_manager.get_task(args.name)
            if not task:
                print(f"任务 '{args.name}' 不存在")
                return
            print(f"任务名称: {task.name}")
            print(f"描述: {task.description}")
            print(f"工作目录: {task.working_dir}")
            print(f"执行模式: {'串行' if task.execution_mode == ExecutionMode.SEQUENTIAL else '并行'}")
            print(f"失败处理: {'停止' if task.on_failure == OnFailure.STOP else '继续'}")
            print(f"命令列表:")
            for i, cmd in enumerate(task.commands, 1):
                print(f"  {i}. {cmd}")
            if task.dependencies:
                print(f"依赖任务: {', '.join(task.dependencies)}")
            if task.env_vars:
                print(f"环境变量: {task.env_vars}")
            if task.parameters:
                print(f"默认参数: {task.parameters}")
            if task.backup_paths:
                print(f"备份路径: {', '.join(task.backup_paths)}")
            print(f"创建时间: {task.created_at}")

        elif args.task_command == "run":
            params = self._parse_key_value(args.params)
            log = self.executor.execute_task(args.name, params, execute_dependencies=not args.no_deps)
            if log.status == TaskStatus.SUCCESS:
                print(f"任务执行成功")
            else:
                print(f"任务执行失败，退出码: {log.exit_code}")
                sys.exit(log.exit_code)

    def _handle_group_command(self, args):
        if args.group_command == "add":
            for task_name in args.tasks:
                if not self.task_manager.get_task(task_name):
                    print(f"错误: 任务 '{task_name}' 不存在")
                    return
            group = TaskGroup(
                name=args.name,
                tasks=args.tasks,
                description=args.description
            )
            if self.task_manager.add_group(group):
                print(f"任务组 '{args.name}' 已添加")
            else:
                print(f"任务组 '{args.name}' 已存在")

        elif args.group_command == "edit":
            group = self.task_manager.get_group(args.name)
            if not group:
                print(f"任务组 '{args.name}' 不存在")
                return

            if args.tasks:
                for task_name in args.tasks:
                    if not self.task_manager.get_task(task_name):
                        print(f"错误: 任务 '{task_name}' 不存在")
                        return
                group.tasks = args.tasks
            if args.description is not None:
                group.description = args.description

            self.task_manager.update_group(group)
            print(f"任务组 '{args.name}' 已更新")

        elif args.group_command == "list":
            groups = self.task_manager.list_groups()
            if not groups:
                print("没有任务组")
                return
            print(f"共有 {len(groups)} 个任务组:")
            for group in groups:
                print(f"  - {group.name}: {len(group.tasks)} 个任务")
                if group.description:
                    print(f"    描述: {group.description}")

        elif args.group_command == "show":
            group = self.task_manager.get_group(args.name)
            if not group:
                print(f"任务组 '{args.name}' 不存在")
                return
            print(f"任务组名称: {group.name}")
            print(f"描述: {group.description}")
            print(f"包含任务 ({len(group.tasks)} 个):")
            for i, task_name in enumerate(group.tasks, 1):
                task = self.task_manager.get_task(task_name)
                if task:
                    print(f"  {i}. {task_name} - {task.description or '无描述'}")
                else:
                    print(f"  {i}. {task_name} - [任务不存在]")
            print(f"创建时间: {group.created_at}")

        elif args.group_command == "delete":
            if self.task_manager.delete_group(args.name):
                print(f"任务组 '{args.name}' 已删除")
            else:
                print(f"任务组 '{args.name}' 不存在")

        elif args.group_command == "run":
            params = self._parse_key_value(args.params)
            logs = self.executor.execute_group(args.name, params)
            failed = [log for log in logs if log.status != TaskStatus.SUCCESS]
            if failed:
                print(f"任务组执行完成，{len(failed)} 个任务失败")
                sys.exit(1)
            else:
                print(f"任务组执行成功")

    def _handle_schedule_command(self, args):
        if args.schedule_command == "add":
            schedule = ScheduledTask(
                task_name=args.task,
                cron_expression=args.cron,
                parameters=self._parse_key_value(args.params)
            )
            self.task_manager.add_schedule(schedule)
            print(f"定时任务已添加: {args.task} @ {args.cron}")

        elif args.schedule_command == "list":
            schedules = self.task_manager.list_schedules()
            if not schedules:
                print("没有定时任务")
                return
            print(f"共有 {len(schedules)} 个定时任务:")
            for i, schedule in enumerate(schedules, 1):
                print(f"  {i}. {schedule.task_name} @ {schedule.cron_expression}")
                print(f"     状态: {'启用' if schedule.enabled else '禁用'}")
                if schedule.parameters:
                    print(f"     参数: {schedule.parameters}")

        elif args.schedule_command == "delete":
            if self.task_manager.delete_schedule(args.name):
                print(f"定时任务 '{args.name}' 已删除")
            else:
                print(f"定时任务 '{args.name}' 不存在")

        elif args.schedule_command == "start":
            if args.once:
                print("执行一次定时任务检查...")
                self.scheduler.run_once()
            else:
                print("启动定时任务调度器 (Ctrl+C 停止)...")
                self.scheduler.start(daemon=False)
                try:
                    while True:
                        import time
                        time.sleep(1)
                except KeyboardInterrupt:
                    self.scheduler.stop()

    def _handle_log_command(self, args):
        logs = self.task_manager.get_logs(args.task, args.limit)
        if not logs:
            print("没有执行日志")
            return

        for log in logs:
            status_icon = "✅" if log.status == TaskStatus.SUCCESS else "❌"
            print(f"{status_icon} [{log.start_time}] {log.task_name} - {log.status.value}")
            if args.full:
                print(f"  输出:")
                for line in log.output.strip().split("\n"):
                    print(f"    {line}")
                print()

    def _handle_stats_command(self, args):
        stats = self.task_manager.get_stats(args.task)
        if not stats:
            print("没有统计数据")
            return

        print(f"{'任务名称':<20} {'成功':<6} {'失败':<6} {'最后执行':<25} {'总耗时(s)':<10}")
        print("-" * 75)
        for stat in stats:
            last_exec = stat.last_execution or "-"
            print(f"{stat.task_name:<20} {stat.success_count:<6} {stat.failure_count:<6} {last_exec:<25} {stat.total_duration:<10.2f}")

    def _handle_export_command(self, args):
        self.task_manager.export_tasks(args.file, args.tasks)
        if args.tasks:
            print(f"已导出 {len(args.tasks)} 个任务到 {args.file}")
        else:
            print(f"已导出所有配置到 {args.file}")

    def _handle_import_command(self, args):
        result = self.task_manager.import_tasks(args.file, args.overwrite)
        print(f"导入完成:")
        print(f"  任务添加: {result['tasks_added']}")
        print(f"  任务跳过: {result['tasks_skipped']}")
        print(f"  任务组添加: {result['groups_added']}")
        print(f"  任务组跳过: {result['groups_skipped']}")


def main():
    cli = TaskCLI()
    cli.run()


if __name__ == "__main__":
    main()
