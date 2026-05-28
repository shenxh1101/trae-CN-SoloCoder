#!/usr/bin/env python3

import json
import csv
import os
import sys
import uuid
import shutil
from datetime import datetime, date
from dataclasses import dataclass, field, asdict
from typing import Optional
from pathlib import Path


DATA_DIR = Path.home() / ".kanban_cli"
DATA_FILE = DATA_DIR / "data.json"
BACKUP_DIR = DATA_DIR / "backups"
CONFIG_FILE = DATA_DIR / "config.json"

DEFAULT_LIST_NAMES = ["待办", "进行中", "已完成"]
OVERDUE_LIST_NAME = "过期"

PRIORITY_MAP = {1: "低", 2: "较低", 3: "中", 4: "较高", 5: "高"}


class Theme:
    DARK = "dark"
    LIGHT = "light"

    PALETTES = {
        "dark": {
            "header": "\033[1;36m",
            "subheader": "\033[1;34m",
            "success": "\033[1;32m",
            "warning": "\033[1;33m",
            "error": "\033[1;31m",
            "muted": "\033[2;37m",
            "info": "\033[1;35m",
            "card_border": "\033[0;36m",
            "tag": "\033[0;33m",
            "priority_low": "\033[0;32m",
            "priority_mid": "\033[1;33m",
            "priority_high": "\033[1;31m",
            "reset": "\033[0m",
            "bold": "\033[1m",
            "dim": "\033[2m",
            "bg": "\033[48;5;235m",
            "input_prompt": "\033[1;32m",
        },
        "light": {
            "header": "\033[1;34m",
            "subheader": "\033[1;36m",
            "success": "\033[0;32m",
            "warning": "\033[0;33m",
            "error": "\033[1;31m",
            "muted": "\033[2;30m",
            "info": "\033[0;35m",
            "card_border": "\033[0;34m",
            "tag": "\033[0;35m",
            "priority_low": "\033[0;32m",
            "priority_mid": "\033[0;33m",
            "priority_high": "\033[1;31m",
            "reset": "\033[0m",
            "bold": "\033[1m",
            "dim": "\033[2m",
            "bg": "\033[47m",
            "input_prompt": "\033[1;34m",
        },
    }

    def __init__(self, mode="dark"):
        self.mode = mode
        self._p = self.PALETTES.get(mode, self.PALETTES["dark"])

    def toggle(self):
        self.mode = self.LIGHT if self.mode == self.DARK else self.DARK
        self._p = self.PALETTES[self.mode]

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._p.get(name, self._p["reset"])


@dataclass
class SubTask:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    title: str = ""
    completed: bool = False

@dataclass
class Task:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    title: str = ""
    description: str = ""
    priority: int = 3
    due_date: str = ""
    tags: list = field(default_factory=list)
    subtasks: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def is_overdue(self):
        if not self.due_date:
            return False
        try:
            due = datetime.strptime(self.due_date, "%Y-%m-%d").date()
            return due < date.today()
        except ValueError:
            return False

    def is_due_today(self):
        if not self.due_date:
            return False
        try:
            due = datetime.strptime(self.due_date, "%Y-%m-%d").date()
            return due == date.today()
        except ValueError:
            return False

    def priority_label(self):
        return PRIORITY_MAP.get(self.priority, "中")

    def subtask_progress(self):
        if not self.subtasks:
            return ""
        done = sum(1 for s in self.subtasks if s.completed)
        return f"[{done}/{len(self.subtasks)}]"

    def to_dict(self):
        d = asdict(self)
        return d

    @classmethod
    def from_dict(cls, d):
        subs = [SubTask(**s) if isinstance(s, dict) else s for s in d.get("subtasks", [])]
        return cls(
            id=d.get("id", uuid.uuid4().hex[:8]),
            title=d.get("title", ""),
            description=d.get("description", ""),
            priority=d.get("priority", 3),
            due_date=d.get("due_date", ""),
            tags=d.get("tags", []),
            subtasks=subs,
            created_at=d.get("created_at", datetime.now().isoformat()),
        )


@dataclass
class KanbanList:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = ""
    tasks: list = field(default_factory=list)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "tasks": [t.to_dict() if isinstance(t, Task) else t for t in self.tasks],
        }

    @classmethod
    def from_dict(cls, d):
        tasks = [Task.from_dict(t) if isinstance(t, dict) else t for t in d.get("tasks", [])]
        return cls(id=d.get("id", uuid.uuid4().hex[:8]), name=d.get("name", ""), tasks=tasks)


@dataclass
class Board:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = ""
    lists: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "lists": [l.to_dict() if isinstance(l, KanbanList) else l for l in self.lists],
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, d):
        lists = [KanbanList.from_dict(l) if isinstance(l, dict) else l for l in d.get("lists", [])]
        return cls(
            id=d.get("id", uuid.uuid4().hex[:8]),
            name=d.get("name", ""),
            lists=lists,
            created_at=d.get("created_at", datetime.now().isoformat()),
        )

    def get_list_by_name(self, name):
        for kl in self.lists:
            if kl.name == name:
                return kl
        return None

    def get_list_by_id(self, lid):
        for kl in self.lists:
            if kl.id == lid:
                return kl
        return None

    def all_tasks(self):
        tasks = []
        for kl in self.lists:
            for t in kl.tasks:
                tasks.append((kl, t))
        return tasks

    def total_tasks(self):
        return sum(len(kl.tasks) for kl in self.lists)

    def done_tasks(self):
        done_list = self.get_list_by_name("已完成")
        return len(done_list.tasks) if done_list else 0

    def completion_pct(self):
        total = self.total_tasks()
        if total == 0:
            return 0.0
        return round(self.done_tasks() / total * 100, 1)


class Storage:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    def load_data(self):
        if not DATA_FILE.exists():
            return {"boards": []}
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"boards": []}

    def save_data(self, data):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_boards(self):
        data = self.load_data()
        return [Board.from_dict(b) for b in data.get("boards", [])]

    def save_boards(self, boards):
        data = {"boards": [b.to_dict() for b in boards]}
        self.save_data(data)

    def load_config(self):
        if not CONFIG_FILE.exists():
            return {"theme": "dark"}
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"theme": "dark"}

    def save_config(self, config):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

    def create_backup(self, boards):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"backup_{timestamp}.json"
        data = {"boards": [b.to_dict() for b in boards], "backup_time": timestamp}
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return backup_file

    def list_backups(self):
        if not BACKUP_DIR.exists():
            return []
        files = sorted(BACKUP_DIR.glob("backup_*.json"), reverse=True)
        return files

    def restore_backup(self, backup_path):
        with open(backup_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        boards = [Board.from_dict(b) for b in data.get("boards", [])]
        return boards


class UI:
    CLEAR = "\033[2J\033[H"

    def __init__(self, theme):
        self.theme = theme

    def clear(self):
        print(self.CLEAR, end="")

    def header(self, text):
        print(f"\n{self.theme.header}{'=' * 60}{self.theme.reset}")
        print(f"{self.theme.header}  {text}{self.theme.reset}")
        print(f"{self.theme.header}{'=' * 60}{self.theme.reset}\n")

    def subheader(self, text):
        print(f"\n{self.theme.subheader}--- {text} ---{self.theme.reset}\n")

    def success(self, text):
        print(f"{self.theme.success}✓ {text}{self.theme.reset}")

    def warning(self, text):
        print(f"{self.theme.warning}⚠ {text}{self.theme.reset}")

    def error(self, text):
        print(f"{self.theme.error}✗ {text}{self.theme.reset}")

    def info(self, text):
        print(f"{self.theme.info}ℹ {text}{self.theme.reset}")

    def muted(self, text):
        print(f"{self.theme.muted}{text}{self.theme.reset}")

    def prompt(self, text=""):
        return input(f"{self.theme.input_prompt}{text}{self.theme.reset}")

    def divider(self):
        print(f"{self.theme.muted}{'─' * 60}{self.theme.reset}")

    def menu(self, title, options, per_row=3):
        print(f"\n{self.theme.subheader}{title}{self.theme.reset}")
        cols = []
        for i, opt in enumerate(options, 1):
            cols.append(f"  {self.theme.bold}{i}{self.theme.reset}. {opt}")
        while cols:
            row = cols[:per_row]
            print("  ".join(row))
            cols = cols[per_row:]
        print()

    def render_task_card(self, task, index=None, list_name=""):
        prefix = f"  [{index}]" if index is not None else "  [*]"
        pri = task.priority
        if pri <= 2:
            pri_color = self.theme.priority_low
        elif pri <= 3:
            pri_color = self.theme.priority_mid
        else:
            pri_color = self.theme.priority_high

        title_line = f"{prefix} {pri_color}●{self.theme.reset} {self.theme.bold}{task.title}{self.theme.reset}"
        if list_name:
            title_line += f" {self.theme.muted}({list_name}){self.theme.reset}"

        print(title_line)

        if task.description:
            desc = task.description[:60] + ("..." if len(task.description) > 60 else "")
            print(f"      {self.theme.muted}{desc}{self.theme.reset}")

        details = []
        details.append(f"{pri_color}优先级:{task.priority_label()}{self.theme.reset}")
        if task.due_date:
            if task.is_overdue():
                details.append(f"{self.theme.error}截止:{task.due_date}(已过期){self.theme.reset}")
            elif task.is_due_today():
                details.append(f"{self.theme.warning}截止:{task.due_date}(今天){self.theme.reset}")
            else:
                details.append(f"截止:{task.due_date}")

        if task.tags:
            tag_str = " ".join(f"{self.theme.tag}#{t}{self.theme.reset}" for t in task.tags)
            details.append(tag_str)

        prog = task.subtask_progress()
        if prog:
            details.append(f"{self.theme.info}子任务{prog}{self.theme.reset}")

        if details:
            print(f"      {' | '.join(details)}")
        print()

    def render_kanban_list(self, kanban_list, show_index=True):
        self.subheader(f"{kanban_list.name} ({len(kanban_list.tasks)})")
        if not kanban_list.tasks:
            self.muted("    (空)")
            print()
            return
        for i, task in enumerate(kanban_list.tasks):
            idx = i if show_index else None
            self.render_task_card(task, index=idx)

    def render_board(self, board):
        self.header(f"看板: {board.name}")
        for kl in board.lists:
            self.render_kanban_list(kl)

    def render_stats(self, board):
        self.subheader(f"📊 统计 - {board.name}")
        total = board.total_tasks()
        done = board.done_tasks()
        pct = board.completion_pct()
        print(f"  总任务数: {total}")
        for kl in board.lists:
            print(f"  {kl.name}: {len(kl.tasks)} 个任务")
        bar_len = 30
        filled = int(bar_len * pct / 100)
        bar = "█" * filled + "░" * (bar_len - filled)
        print(f"\n  完成进度: {self.theme.success}{bar}{self.theme.reset} {pct}%\n")

    def render_reminders(self, tasks):
        if not tasks:
            return
        self.header("⏰ 今日到期任务提醒")
        for kl_name, task in tasks:
            print(f"  {self.theme.warning}● {task.title}{self.theme.reset} {self.theme.muted}({kl_name}){self.theme.reset}")
            if task.description:
                print(f"    {self.theme.muted}{task.description[:50]}{self.theme.reset}")
        print()

    def confirm(self, text):
        ans = self.prompt(f"{text} (y/N): ").strip().lower()
        return ans in ("y", "yes")


class App:
    def __init__(self):
        self.storage = Storage()
        self.config = self.storage.load_config()
        self.theme = Theme(self.config.get("theme", "dark"))
        self.ui = UI(self.theme)
        self.boards = self.storage.load_boards()
        self.current_board = None
        self.sort_by_priority = False
        self.filter_tag = None

    def save(self):
        self.storage.save_boards(self.boards)

    def save_config(self):
        self.storage.save_config(self.config)

    def run(self):
        self._check_overdue()
        self._show_reminders()
        while True:
            if self.current_board:
                self._board_menu()
            else:
                self._main_menu()

    def _check_overdue(self):
        any_moved = False
        for board in self.boards:
            overdue_list = board.get_list_by_name(OVERDUE_LIST_NAME)
            if not overdue_list:
                overdue_list = KanbanList(name=OVERDUE_LIST_NAME)
                board.lists.append(overdue_list)
            move_tasks = []
            for kl in board.lists:
                if kl.name == OVERDUE_LIST_NAME:
                    continue
                for task in kl.tasks:
                    if task.is_overdue() and kl.name != "已完成":
                        move_tasks.append((kl, task))
            for kl, task in move_tasks:
                kl.tasks.remove(task)
                overdue_list.tasks.append(task)
                any_moved = True
        if any_moved:
            self.save()

    def _show_reminders(self):
        reminders = []
        for board in self.boards:
            for kl, task in board.all_tasks():
                if task.is_due_today() and kl.name != "已完成":
                    reminders.append((kl.name, task))
        if reminders:
            self.ui.render_reminders(reminders)
            self.ui.prompt("按回车继续...")

    def _main_menu(self):
        self.ui.clear()
        self.ui.header("📋 命令行看板工具")
        if self.boards:
            print(f"  {'序号':<6}{'看板名称':<20}{'任务数':<10}{'完成率'}")
            self.ui.divider()
            for i, b in enumerate(self.boards, 1):
                pct = b.completion_pct()
                print(f"  {i:<6}{b.name:<20}{b.total_tasks():<10}{pct}%")
        else:
            self.ui.muted("  还没有看板，请创建一个新看板。")

        options = ["创建看板", "进入看板", "删除看板", "搜索任务", "备份管理", "切换主题", "退出"]
        self.ui.menu("操作", options, per_row=4)
        choice = self.ui.prompt("请选择: ").strip()

        if choice == "1":
            self._create_board()
        elif choice == "2":
            self._enter_board()
        elif choice == "3":
            self._delete_board()
        elif choice == "4":
            self._search_tasks()
        elif choice == "5":
            self._backup_menu()
        elif choice == "6":
            self._toggle_theme()
        elif choice == "7":
            self.ui.success("再见！")
            sys.exit(0)

    def _create_board(self):
        name = self.ui.prompt("看板名称: ").strip()
        if not name:
            self.ui.error("名称不能为空")
            return
        board = Board(name=name)
        for ln in DEFAULT_LIST_NAMES:
            board.lists.append(KanbanList(name=ln))
        board.lists.append(KanbanList(name=OVERDUE_LIST_NAME))
        self.boards.append(board)
        self.save()
        self.ui.success(f"看板 '{name}' 已创建")

    def _enter_board(self):
        if not self.boards:
            self.ui.error("没有可用的看板")
            return
        self.ui.subheader("选择看板")
        for i, b in enumerate(self.boards, 1):
            print(f"  {i}. {b.name} ({b.total_tasks()} 个任务)")
        choice = self.ui.prompt("请选择: ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(self.boards):
                self.current_board = self.boards[idx]
                self.sort_by_priority = False
                self.filter_tag = None
            else:
                self.ui.error("无效选择")
        except ValueError:
            self.ui.error("请输入数字")

    def _delete_board(self):
        if not self.boards:
            self.ui.error("没有可用的看板")
            return
        self.ui.subheader("删除看板")
        for i, b in enumerate(self.boards, 1):
            print(f"  {i}. {b.name}")
        choice = self.ui.prompt("请选择要删除的看板: ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(self.boards):
                name = self.boards[idx].name
                if self.ui.confirm(f"确定删除看板 '{name}'？"):
                    self.boards.pop(idx)
                    self.save()
                    self.ui.success(f"看板 '{name}' 已删除")
            else:
                self.ui.error("无效选择")
        except ValueError:
            self.ui.error("请输入数字")

    def _search_tasks(self):
        keyword = self.ui.prompt("搜索关键词: ").strip()
        if not keyword:
            return
        self.ui.subheader(f"搜索结果: '{keyword}'")
        found = False
        for board in self.boards:
            for kl, task in board.all_tasks():
                if keyword.lower() in task.title.lower() or keyword.lower() in task.description.lower():
                    self.ui.render_task_card(task, list_name=f"{board.name}/{kl.name}")
                    found = True
                else:
                    for tag in task.tags:
                        if keyword.lower() in tag.lower():
                            self.ui.render_task_card(task, list_name=f"{board.name}/{kl.name}")
                            found = True
                            break
        if not found:
            self.ui.muted("  未找到匹配的任务")
        self.ui.prompt("按回车继续...")

    def _backup_menu(self):
        self.ui.clear()
        self.ui.header("💾 备份管理")
        options = ["创建备份", "恢复备份", "返回"]
        self.ui.menu("操作", options)
        choice = self.ui.prompt("请选择: ").strip()
        if choice == "1":
            self._create_backup()
        elif choice == "2":
            self._restore_backup()
        elif choice == "3":
            return

    def _create_backup(self):
        path = self.storage.create_backup(self.boards)
        self.ui.success(f"备份已创建: {path}")
        self.ui.prompt("按回车继续...")

    def _restore_backup(self):
        backups = self.storage.list_backups()
        if not backups:
            self.ui.warning("没有可用的备份")
            self.ui.prompt("按回车继续...")
            return
        self.ui.subheader("可用备份")
        for i, b in enumerate(backups, 1):
            name = b.stem.replace("backup_", "")
            size = b.stat().st_size
            print(f"  {i}. {name} ({size} bytes)")
        choice = self.ui.prompt("选择要恢复的备份 (0取消): ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(backups):
                if self.ui.confirm("恢复将覆盖当前数据，确定？"):
                    self.boards = self.storage.restore_backup(backups[idx])
                    self.save()
                    self.current_board = None
                    self.ui.success("备份已恢复")
            elif idx == -1:
                return
            else:
                self.ui.error("无效选择")
        except ValueError:
            self.ui.error("请输入数字")
        self.ui.prompt("按回车继续...")

    def _toggle_theme(self):
        self.theme.toggle()
        self.config["theme"] = self.theme.mode
        self.save_config()
        mode_name = "暗色" if self.theme.mode == "dark" else "亮色"
        self.ui.success(f"已切换到{mode_name}主题")

    def _board_menu(self):
        self.ui.clear()
        board = self.current_board

        display_board = Board(name=board.name, lists=[])
        for kl in board.lists:
            new_kl = KanbanList(id=kl.id, name=kl.name)
            tasks = list(kl.tasks)
            if self.filter_tag:
                tasks = [t for t in tasks if self.filter_tag in t.tags]
            if self.sort_by_priority:
                tasks.sort(key=lambda t: t.priority, reverse=True)
            new_kl.tasks = tasks
            display_board.lists.append(new_kl)

        self.ui.render_board(display_board)

        if self.filter_tag:
            self.ui.info(f"标签筛选: #{self.filter_tag}")
        if self.sort_by_priority:
            self.ui.info("按优先级排序: 开启")

        options = [
            "添加任务", "查看/编辑任务", "移动任务", "删除任务",
            "子任务管理", "按优先级排序", "标签筛选",
            "统计", "导出", "导入", "返回主菜单",
        ]
        self.ui.menu("看板操作", options, per_row=4)
        choice = self.ui.prompt("请选择: ").strip()

        actions = {
            "1": self._add_task,
            "2": self._view_task,
            "3": self._move_task,
            "4": self._delete_task,
            "5": self._subtask_menu,
            "6": self._toggle_sort,
            "7": self._tag_filter,
            "8": self._show_stats,
            "9": self._export,
            "10": self._import,
            "11": self._back_to_main,
        }
        action = actions.get(choice)
        if action:
            action()

    def _add_task(self):
        title = self.ui.prompt("任务标题: ").strip()
        if not title:
            self.ui.error("标题不能为空")
            return
        description = self.ui.prompt("描述 (可选): ").strip()
        priority = self.ui.prompt("优先级 1-5 [3]: ").strip()
        try:
            priority = int(priority) if priority else 3
            priority = max(1, min(5, priority))
        except ValueError:
            priority = 3
        due_date = self.ui.prompt("截止日期 YYYY-MM-DD (可选): ").strip()
        if due_date:
            try:
                datetime.strptime(due_date, "%Y-%m-%d")
            except ValueError:
                self.ui.error("日期格式无效")
                return
        tags_str = self.ui.prompt("标签 (逗号分隔, 可选): ").strip()
        tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []

        task = Task(
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            tags=tags,
        )

        target_list = self.current_board.get_list_by_name("待办")
        if target_list:
            target_list.tasks.append(task)
            self.save()
            self.ui.success(f"任务 '{title}' 已添加到待办列表")

    def _select_list(self, prompt_text="选择列表"):
        board = self.current_board
        print(f"\n  {self.theme.subheader}{prompt_text}:{self.theme.reset}")
        for i, kl in enumerate(board.lists, 1):
            print(f"  {i}. {kl.name} ({len(kl.tasks)} 个任务)")
        choice = self.ui.prompt("请选择: ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(board.lists):
                return board.lists[idx]
        except ValueError:
            pass
        self.ui.error("无效选择")
        return None

    def _select_task(self, kl):
        if not kl.tasks:
            self.ui.warning("该列表为空")
            return None
        for i, t in enumerate(kl.tasks):
            self.ui.render_task_card(t, index=i)
        choice = self.ui.prompt("选择任务序号: ").strip()
        try:
            idx = int(choice)
            if 0 <= idx < len(kl.tasks):
                return kl.tasks[idx]
        except ValueError:
            pass
        self.ui.error("无效选择")
        return None

    def _view_task(self):
        kl = self._select_list("选择列表查看任务")
        if not kl:
            return
        task = self._select_task(kl)
        if not task:
            return

        self.ui.clear()
        self.ui.header(f"📝 {task.title}")
        print(f"  描述: {task.description or '(无)'}")
        print(f"  优先级: {task.priority_label()}")
        print(f"  截止日期: {task.due_date or '(无)'}")
        print(f"  标签: {', '.join(task.tags) if task.tags else '(无)'}")
        print(f"  创建时间: {task.created_at}")
        if task.subtasks:
            print(f"  子任务:")
            for st in task.subtasks:
                mark = "☑" if st.completed else "☐"
                print(f"    {mark} {st.title}")
        else:
            print(f"  子任务: (无)")

        print()
        options = ["编辑标题", "编辑描述", "编辑优先级", "编辑截止日期", "编辑标签", "返回"]
        self.ui.menu("编辑操作", options, per_row=3)
        choice = self.ui.prompt("请选择: ").strip()

        if choice == "1":
            new_val = self.ui.prompt(f"新标题 [{task.title}]: ").strip()
            if new_val:
                task.title = new_val
                self.save()
                self.ui.success("标题已更新")
        elif choice == "2":
            new_val = self.ui.prompt(f"新描述 [{task.description}]: ").strip()
            task.description = new_val
            self.save()
            self.ui.success("描述已更新")
        elif choice == "3":
            new_val = self.ui.prompt(f"新优先级 1-5 [{task.priority}]: ").strip()
            try:
                p = int(new_val)
                task.priority = max(1, min(5, p))
                self.save()
                self.ui.success("优先级已更新")
            except ValueError:
                self.ui.error("无效输入")
        elif choice == "4":
            new_val = self.ui.prompt(f"新截止日期 [{task.due_date}]: ").strip()
            if new_val:
                try:
                    datetime.strptime(new_val, "%Y-%m-%d")
                    task.due_date = new_val
                    self.save()
                    self.ui.success("截止日期已更新")
                except ValueError:
                    self.ui.error("日期格式无效")
            else:
                task.due_date = ""
                self.save()
                self.ui.success("截止日期已清除")
        elif choice == "5":
            new_val = self.ui.prompt(f"新标签 (逗号分隔) [{','.join(task.tags)}]: ").strip()
            task.tags = [t.strip() for t in new_val.split(",") if t.strip()]
            self.save()
            self.ui.success("标签已更新")

    def _move_task(self):
        self.ui.subheader("移动任务")
        src_list = self._select_list("从哪个列表")
        if not src_list:
            return
        task = self._select_task(src_list)
        if not task:
            return
        dst_list = self._select_list("移到哪个列表")
        if not dst_list:
            return
        if src_list.id == dst_list.id:
            self.ui.warning("源列表和目标列表相同")
            return
        src_list.tasks.remove(task)
        dst_list.tasks.append(task)
        self.save()
        self.ui.success(f"任务 '{task.title}' 已从 {src_list.name} 移到 {dst_list.name}")

    def _delete_task(self):
        kl = self._select_list("从哪个列表删除任务")
        if not kl:
            return
        task = self._select_task(kl)
        if not task:
            return
        if self.ui.confirm(f"确定删除任务 '{task.title}'？"):
            kl.tasks.remove(task)
            self.save()
            self.ui.success(f"任务 '{task.title}' 已删除")

    def _subtask_menu(self):
        kl = self._select_list("选择列表")
        if not kl:
            return
        task = self._select_task(kl)
        if not task:
            return

        while True:
            self.ui.clear()
            self.ui.header(f"子任务 - {task.title}")
            if task.subtasks:
                for i, st in enumerate(task.subtasks):
                    mark = "☑" if st.completed else "☐"
                    status = f"{self.theme.success}已完成{self.theme.reset}" if st.completed else f"未完成"
                    print(f"  {i}. {mark} {st.title} - {status}")
            else:
                self.ui.muted("  没有子任务")

            options = ["添加子任务", "勾选/取消子任务", "删除子任务", "返回"]
            self.ui.menu("子任务操作", options, per_row=4)
            choice = self.ui.prompt("请选择: ").strip()

            if choice == "1":
                title = self.ui.prompt("子任务标题: ").strip()
                if title:
                    task.subtasks.append(SubTask(title=title))
                    self.save()
                    self.ui.success("子任务已添加")
            elif choice == "2":
                if not task.subtasks:
                    self.ui.warning("没有子任务")
                    continue
                idx_str = self.ui.prompt("子任务序号: ").strip()
                try:
                    idx = int(idx_str)
                    if 0 <= idx < len(task.subtasks):
                        task.subtasks[idx].completed = not task.subtasks[idx].completed
                        self.save()
                        state = "完成" if task.subtasks[idx].completed else "未完成"
                        self.ui.success(f"子任务已标记为{state}")
                except ValueError:
                    self.ui.error("无效输入")
            elif choice == "3":
                if not task.subtasks:
                    self.ui.warning("没有子任务")
                    continue
                idx_str = self.ui.prompt("子任务序号: ").strip()
                try:
                    idx = int(idx_str)
                    if 0 <= idx < len(task.subtasks):
                        removed = task.subtasks.pop(idx)
                        self.save()
                        self.ui.success(f"子任务 '{removed.title}' 已删除")
                except ValueError:
                    self.ui.error("无效输入")
            elif choice == "4":
                break

    def _toggle_sort(self):
        self.sort_by_priority = not self.sort_by_priority
        state = "开启" if self.sort_by_priority else "关闭"
        self.ui.success(f"按优先级排序: {state}")

    def _tag_filter(self):
        board = self.current_board
        all_tags = set()
        for kl in board.lists:
            for task in kl.tasks:
                all_tags.update(task.tags)
        if not all_tags:
            self.ui.warning("没有标签可用")
            return
        self.ui.subheader("可用标签")
        tags_list = sorted(all_tags)
        for i, tag in enumerate(tags_list, 1):
            print(f"  {i}. #{tag}")
        print(f"  0. 清除筛选")
        choice = self.ui.prompt("选择标签: ").strip()
        try:
            idx = int(choice)
            if idx == 0:
                self.filter_tag = None
                self.ui.success("标签筛选已清除")
            elif 1 <= idx <= len(tags_list):
                self.filter_tag = tags_list[idx - 1]
                self.ui.success(f"筛选标签: #{self.filter_tag}")
            else:
                self.ui.error("无效选择")
        except ValueError:
            self.ui.error("请输入数字")

    def _show_stats(self):
        self.ui.clear()
        self.ui.render_stats(self.current_board)
        self.ui.prompt("按回车继续...")

    def _export(self):
        board = self.current_board
        self.ui.subheader("导出看板")
        options = ["JSON", "CSV", "取消"]
        self.ui.menu("导出格式", options)
        choice = self.ui.prompt("请选择: ").strip()
        if choice == "1":
            path = self.ui.prompt(f"文件路径 [{board.name}.json]: ").strip()
            if not path:
                path = f"{board.name}.json"
            data = board.to_dict()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self.ui.success(f"已导出到 {path}")
        elif choice == "2":
            path = self.ui.prompt(f"文件路径 [{board.name}.csv]: ").strip()
            if not path:
                path = f"{board.name}.csv"
            with open(path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["列表", "标题", "描述", "优先级", "截止日期", "标签", "子任务完成", "子任务总数"])
                for kl in board.lists:
                    for task in kl.tasks:
                        sub_done = sum(1 for s in task.subtasks if s.completed)
                        writer.writerow([
                            kl.name, task.title, task.description,
                            task.priority_label(), task.due_date,
                            ",".join(task.tags), sub_done, len(task.subtasks),
                        ])
            self.ui.success(f"已导出到 {path}")
        self.ui.prompt("按回车继续...")

    def _import(self):
        path = self.ui.prompt("JSON 文件路径: ").strip()
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            self.ui.error("文件不存在")
            self.ui.prompt("按回车继续...")
            return
        except json.JSONDecodeError:
            self.ui.error("JSON 格式无效")
            self.ui.prompt("按回车继续...")
            return

        import_board = Board.from_dict(data)

        for imp_list in import_board.lists:
            existing = self.current_board.get_list_by_name(imp_list.name)
            if existing:
                for task in imp_list.tasks:
                    existing.tasks.append(task)
            else:
                self.current_board.lists.append(imp_list)

        self.save()
        self.ui.success(f"已从 {path} 导入任务到当前看板")
        self.ui.prompt("按回车继续...")

    def _back_to_main(self):
        self.current_board = None


def main():
    try:
        app = App()
        app.run()
    except KeyboardInterrupt:
        print("\n再见！")
        sys.exit(0)
    except EOFError:
        print("\n输入已结束，再见！")
        sys.exit(0)


if __name__ == "__main__":
    main()
