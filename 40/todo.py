#!/usr/bin/env python3
import json
import os
import sys
import argparse
from datetime import datetime, date
from colorama import init, Fore

init(autoreset=True)

DATA_FILE = os.path.join(os.path.dirname(__file__), "todo.json")


def load_data():
    if not os.path.exists(DATA_FILE):
        return {"tasks": [], "completed": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_priority_order(priority):
    priority_map = {"高": 1, "中": 2, "低": 3}
    return priority_map.get(priority, 2)


def is_overdue(due_date):
    if not due_date:
        return False
    try:
        due = datetime.strptime(due_date, "%Y-%m-%d").date()
        return due < date.today()
    except ValueError:
        return False


def add_task(title, priority="中", note="", due_date=None, repeat=False):
    data = load_data()
    task = {
        "id": max([t["id"] for t in data["tasks"]] + [0]) + 1,
        "title": title,
        "priority": priority,
        "note": note,
        "due_date": due_date,
        "repeat": repeat,
        "created_at": datetime.now().isoformat(),
        "completed": False,
    }
    data["tasks"].append(task)
    save_data(data)
    print(f"{Fore.GREEN}任务已添加: {title}")


def list_tasks(show_completed=False):
    data = load_data()
    tasks = data["completed"] if show_completed else data["tasks"]
    if not show_completed:
        tasks = sorted(tasks, key=lambda x: get_priority_order(x["priority"]))

    if not tasks:
        print("没有任务。")
        return

    for task in tasks:
        line = f"[{task['id']}] {task['title']} - 优先级: {task['priority']}"
        if task["note"]:
            line += f" - 备注: {task['note']}"
        if task["due_date"]:
            line += f" - 截止: {task['due_date']}"
        if task["repeat"]:
            line += " (重复)"
        if not show_completed and is_overdue(task["due_date"]):
            print(f"{Fore.RED}{line} - 已过期!")
        else:
            print(line)


def complete_task(task_id):
    data = load_data()
    for task in data["tasks"]:
        if task["id"] == task_id:
            if task["repeat"]:
                new_task = task.copy()
                new_task["id"] = max([t["id"] for t in data["tasks"]] + [0]) + 1
                new_task["created_at"] = datetime.now().isoformat()
                if task["due_date"]:
                    try:
                        due = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
                        from datetime import timedelta
                        new_due = due + timedelta(days=1)
                        new_task["due_date"] = new_due.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                data["tasks"].append(new_task)
                print(f"{Fore.BLUE}重复任务已生成新副本。")

            completed_task = task.copy()
            completed_task["completed_at"] = datetime.now().isoformat()
            completed_task["completed"] = True
            data["completed"].append(completed_task)
            data["tasks"].remove(task)
            save_data(data)
            print(f"{Fore.GREEN}任务已标记为完成: {task['title']}")
            return

    print(f"{Fore.RED}未找到任务 {task_id}")


def edit_task(task_id, field, value):
    data = load_data()
    for task in data["tasks"]:
        if task["id"] == task_id:
            if field in ["标题", "title"]:
                task["title"] = value
            elif field in ["优先级", "priority"]:
                task["priority"] = value
            elif field in ["备注", "note"]:
                task["note"] = value
            elif field in ["截止日期", "due_date"]:
                task["due_date"] = value if value else None
            elif field in ["重复", "repeat"]:
                task["repeat"] = value.lower() in ["true", "1", "是"]
            else:
                print(f"{Fore.RED}不支持的字段: {field}")
                return
            save_data(data)
            print(f"{Fore.GREEN}任务已更新。")
            return
    print(f"{Fore.RED}未找到任务 {task_id}")


def delete_task(task_id):
    data = load_data()
    for task in data["tasks"]:
        if task["id"] == task_id:
            confirm = input(f"确定要删除任务 '{task['title']}' 吗? (y/N): ")
            if confirm.lower() == "y":
                data["tasks"].remove(task)
                save_data(data)
                print(f"{Fore.GREEN}任务已删除。")
            else:
                print("已取消。")
            return
    for task in data["completed"]:
        if task["id"] == task_id:
            confirm = input(f"确定要删除已完成任务 '{task['title']}' 吗? (y/N): ")
            if confirm.lower() == "y":
                data["completed"].remove(task)
                save_data(data)
                print(f"{Fore.GREEN}任务已删除。")
            else:
                print("已取消。")
            return
    print(f"{Fore.RED}未找到任务 {task_id}")


def search_tasks(keyword):
    data = load_data()
    all_tasks = data["tasks"] + data["completed"]
    results = [
        t for t in all_tasks
        if keyword.lower() in t["title"].lower() or keyword.lower() in t["note"].lower()
    ]

    if not results:
        print("未找到匹配的任务。")
        return

    print(f"找到 {len(results)} 个匹配的任务:")
    for task in results:
        status = "已完成" if task["completed"] else "进行中"
        line = f"[{task['id']}] {task['title']} ({status}) - 优先级: {task['priority']}"
        if task["note"]:
            line += f" - 备注: {task['note']}"
        print(line)


def show_stats():
    data = load_data()
    total = len(data["tasks"]) + len(data["completed"])
    completed = len(data["completed"])
    pending = len(data["tasks"])
    print(f"{Fore.CYAN}=== 统计信息 ===")
    print(f"总任务数: {total}")
    print(f"已完成: {completed}")
    print(f"未完成: {pending}")
    if total > 0:
        print(f"完成率: {completed/total*100:.1f}%")


def clear_completed():
    data = load_data()
    if not data["completed"]:
        print("没有已完成的任务。")
        return
    confirm = input(f"确定要清空所有 {len(data['completed'])} 个已完成任务吗? (y/N): ")
    if confirm.lower() == "y":
        data["completed"] = []
        save_data(data)
        print(f"{Fore.GREEN}已清空所有已完成任务。")
    else:
        print("已取消。")


def export_tasks(filename):
    data = load_data()
    with open(filename, "w", encoding="utf-8") as f:
        for task in data["tasks"]:
            line = f"[{task['priority']}] {task['title']}"
            if task["note"]:
                line += f" | {task['note']}"
            if task["due_date"]:
                line += f" | 截止: {task['due_date']}"
            f.write(line + "\n")
    print(f"{Fore.GREEN}任务已导出到 {filename}")


def import_tasks(filename):
    if not os.path.exists(filename):
        print(f"{Fore.RED}文件不存在: {filename}")
        return

    data = load_data()
    count = 0
    with open(filename, "r", encoding="utf-8") as f:
        for line in f:
            title = line.strip()
            if title:
                task = {
                    "id": max([t["id"] for t in data["tasks"]] + [0]) + 1,
                    "title": title,
                    "priority": "中",
                    "note": "",
                    "due_date": None,
                    "repeat": False,
                    "created_at": datetime.now().isoformat(),
                    "completed": False,
                }
                data["tasks"].append(task)
                count += 1

    save_data(data)
    print(f"{Fore.GREEN}已导入 {count} 个任务。")


def main():
    parser = argparse.ArgumentParser(description="待办事项管理工具")
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    add_parser = subparsers.add_parser("add", help="添加任务")
    add_parser.add_argument("title", help="任务标题")
    add_parser.add_argument("-p", "--priority", default="中", choices=["高", "中", "低"], help="优先级")
    add_parser.add_argument("-n", "--note", default="", help="备注")
    add_parser.add_argument("-d", "--due", help="截止日期 (YYYY-MM-DD)")
    add_parser.add_argument("-r", "--repeat", action="store_true", help="重复任务")

    subparsers.add_parser("list", help="列出未完成任务")
    subparsers.add_parser("completed", help="列出已完成任务")

    done_parser = subparsers.add_parser("done", help="标记任务为完成")
    done_parser.add_argument("id", type=int, help="任务ID")

    edit_parser = subparsers.add_parser("edit", help="编辑任务")
    edit_parser.add_argument("id", type=int, help="任务ID")
    edit_parser.add_argument("field", help="字段: title/标题, priority/优先级, note/备注, due_date/截止日期, repeat/重复")
    edit_parser.add_argument("value", help="新值")

    del_parser = subparsers.add_parser("delete", help="删除任务")
    del_parser.add_argument("id", type=int, help="任务ID")

    search_parser = subparsers.add_parser("search", help="搜索任务")
    search_parser.add_argument("keyword", help="关键字")

    subparsers.add_parser("stats", help="显示统计信息")
    subparsers.add_parser("clear", help="清空所有已完成任务")

    export_parser = subparsers.add_parser("export", help="导出任务")
    export_parser.add_argument("filename", help="输出文件名")

    import_parser = subparsers.add_parser("import", help="批量导入任务")
    import_parser.add_argument("filename", help="输入文件名")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "add":
        add_task(args.title, args.priority, args.note, args.due, args.repeat)
    elif args.command == "list":
        list_tasks()
    elif args.command == "completed":
        list_tasks(show_completed=True)
    elif args.command == "done":
        complete_task(args.id)
    elif args.command == "edit":
        edit_task(args.id, args.field, args.value)
    elif args.command == "delete":
        delete_task(args.id)
    elif args.command == "search":
        search_tasks(args.keyword)
    elif args.command == "stats":
        show_stats()
    elif args.command == "clear":
        clear_completed()
    elif args.command == "export":
        export_tasks(args.filename)
    elif args.command == "import":
        import_tasks(args.filename)


if __name__ == "__main__":
    main()
