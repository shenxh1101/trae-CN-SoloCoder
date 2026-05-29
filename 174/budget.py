#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import csv
import os
import sys
import datetime
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path.home() / ".budget_manager"
BUDGET_FILE = DATA_DIR / "budgets.json"
EXPENSE_FILE = DATA_DIR / "expenses.json"
CONFIG_FILE = DATA_DIR / "config.json"
IMPORT_MAPPING_FILE = DATA_DIR / "import_mapping.json"

DEFAULT_CATEGORIES = {
    "餐饮": {"group": "必要支出", "color": "yellow"},
    "交通": {"group": "必要支出", "color": "blue"},
    "娱乐": {"group": "可选支出", "color": "magenta"},
    "购物": {"group": "可选支出", "color": "cyan"},
    "储蓄": {"group": "储蓄", "color": "green"}
}


class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

    @staticmethod
    def colorize(text, color):
        color_map = {
            "red": Colors.RED,
            "green": Colors.GREEN,
            "yellow": Colors.YELLOW,
            "blue": Colors.BLUE,
            "magenta": Colors.MAGENTA,
            "cyan": Colors.CYAN
        }
        return f"{color_map.get(color, '')}{text}{Colors.RESET}"


def bell():
    sys.stdout.write('\a')
    sys.stdout.flush()


def init_data():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for f in [BUDGET_FILE, EXPENSE_FILE, CONFIG_FILE, IMPORT_MAPPING_FILE]:
        if not f.exists():
            if f == CONFIG_FILE:
                default_config = {
                    "categories": DEFAULT_CATEGORIES,
                    "savings_target": 0,
                    "rollover_enabled": False,
                    "warning_threshold": 80,
                    "danger_threshold": 100
                }
                f.write_text(json.dumps(default_config, indent=2, ensure_ascii=False))
            elif f == IMPORT_MAPPING_FILE:
                default_mapping = {
                    "date_column": "日期",
                    "amount_column": "金额",
                    "category_column": "类别",
                    "desc_column": "描述",
                    "category_map": {}
                }
                f.write_text(json.dumps(default_mapping, indent=2, ensure_ascii=False))
            else:
                f.write_text("{}")


def load_json(filepath):
    if filepath.exists():
        return json.loads(filepath.read_text())
    return {}


def save_json(filepath, data):
    filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def load_config():
    return load_json(CONFIG_FILE)


def save_config(config):
    save_json(CONFIG_FILE, config)


def get_month_key(year, month):
    return f"{year}-{month:02d}"


def get_current_month():
    now = datetime.datetime.now()
    return get_month_key(now.year, now.month)


def parse_month_key(month_key):
    year, month = month_key.split("-")
    return int(year), int(month)


def get_previous_month(month_key):
    year, month = parse_month_key(month_key)
    month -= 1
    if month < 1:
        month = 12
        year -= 1
    return get_month_key(year, month)


def get_next_month(month_key):
    year, month = parse_month_key(month_key)
    month += 1
    if month > 12:
        month = 1
        year += 1
    return get_month_key(year, month)


def set_budget(month_key, category, amount):
    budgets = load_json(BUDGET_FILE)
    if month_key not in budgets:
        budgets[month_key] = {}
    budgets[month_key][category] = float(amount)
    save_json(BUDGET_FILE, budgets)
    print(f"已设置 {month_key} {category} 预算: ¥{amount:.2f}")


def get_budget(month_key, category=None):
    budgets = load_json(BUDGET_FILE)
    if month_key not in budgets:
        if category:
            return 0
        return {}
    if category:
        return budgets[month_key].get(category, 0)
    return budgets[month_key]


def add_expense(month_key, category, amount, description="", date=None):
    config = load_config()
    categories = config.get("categories", DEFAULT_CATEGORIES)
    
    if category not in categories:
        print(f"警告: 类别 '{category}' 不存在，已自动创建")
        categories[category] = {"group": "其他", "color": "white"}
        config["categories"] = categories
        save_config(config)
    
    expenses = load_json(EXPENSE_FILE)
    if month_key not in expenses:
        expenses[month_key] = []
    
    if date is None:
        date = datetime.datetime.now().strftime("%Y-%m-%d")
    
    expense = {
        "date": date,
        "category": category,
        "amount": float(amount),
        "description": description,
        "timestamp": datetime.datetime.now().isoformat()
    }
    expenses[month_key].append(expense)
    save_json(EXPENSE_FILE, expenses)
    
    check_budget_warning(month_key, category)
    
    return expense


def get_expenses(month_key, category=None):
    expenses = load_json(EXPENSE_FILE)
    if month_key not in expenses:
        return []
    month_expenses = expenses[month_key]
    if category:
        return [e for e in month_expenses if e["category"] == category]
    return month_expenses


def get_total_spent(month_key, category=None):
    expenses = get_expenses(month_key, category)
    return sum(e["amount"] for e in expenses)


def get_remaining_budget(month_key, category):
    budget = get_budget(month_key, category)
    spent = get_total_spent(month_key, category)
    return budget - spent


def check_budget_warning(month_key, category):
    config = load_config()
    warning_threshold = config.get("warning_threshold", 80)
    danger_threshold = config.get("danger_threshold", 100)
    
    budget = get_budget(month_key, category)
    if budget <= 0:
        return
    
    spent = get_total_spent(month_key, category)
    percentage = (spent / budget) * 100
    
    if percentage >= danger_threshold:
        bell()
        print(Colors.colorize(f"\n⚠️  警告: {category} 已超支! 预算: ¥{budget:.2f}, 已支出: ¥{spent:.2f}", "red"))
    elif percentage >= warning_threshold:
        print(Colors.colorize(f"\n⚠️  提醒: {category} 已使用 {percentage:.1f}% 的预算", "yellow"))


def progress_bar(percentage, width=30):
    percentage = min(100, max(0, percentage))
    filled = int(width * percentage / 100)
    bar = "█" * filled + "░" * (width - filled)
    
    if percentage >= 100:
        color = "red"
    elif percentage >= 80:
        color = "yellow"
    else:
        color = "green"
    
    return Colors.colorize(f"[{bar}] {percentage:5.1f}%", color)


def show_monthly_status(month_key):
    config = load_config()
    categories = config.get("categories", DEFAULT_CATEGORIES)
    
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{month_key} 预算执行情况{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
    
    group_totals = defaultdict(lambda: {"budget": 0, "spent": 0})
    
    for category, info in categories.items():
        if category == "储蓄":
            continue
        
        budget = get_budget(month_key, category)
        spent = get_total_spent(month_key, category)
        remaining = budget - spent
        
        if budget > 0:
            percentage = (spent / budget) * 100
        else:
            percentage = 0
        
        group = info.get("group", "其他")
        group_totals[group]["budget"] += budget
        group_totals[group]["spent"] += spent
        
        cat_color = info.get("color", "white")
        print(f"\n{Colors.colorize(category, cat_color)}:")
        print(f"  预算: ¥{budget:.2f} | 已支出: ¥{spent:.2f} | 剩余: ¥{remaining:.2f}")
        print(f"  {progress_bar(percentage)}")
    
    print(f"\n{Colors.BOLD}{'-'*60}{Colors.RESET}")
    print(f"{Colors.BOLD}类别分组统计:{Colors.RESET}")
    
    total_budget = sum(g["budget"] for g in group_totals.values())
    total_spent = sum(g["spent"] for g in group_totals.values())
    
    for group, totals in group_totals.items():
        budget = totals["budget"]
        spent = totals["spent"]
        if budget > 0:
            ratio = (spent / budget) * 100
        else:
            ratio = 0
        if total_budget > 0:
            budget_ratio = (budget / total_budget) * 100
        else:
            budget_ratio = 0
        
        print(f"\n{Colors.colorize(group, 'cyan')}:")
        print(f"  总预算: ¥{budget:.2f} (占总预算 {budget_ratio:.1f}%)")
        print(f"  已支出: ¥{spent:.2f} | 使用率: {ratio:.1f}%")
    
    print(f"\n{Colors.BOLD}{'-'*60}{Colors.RESET}")
    print(f"总预算: ¥{total_budget:.2f}")
    print(f"总支出: ¥{total_spent:.2f}")
    print(f"总剩余: ¥{total_budget - total_spent:.2f}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")


def show_expense_list(month_key, category=None):
    expenses = get_expenses(month_key, category)
    
    if not expenses:
        print("暂无支出记录")
        return
    
    print(f"\n{Colors.BOLD}{month_key} 支出记录{Colors.RESET}")
    if category:
        print(f"类别: {category}")
    print(f"{'-'*60}")
    print(f"{'日期':<12} {'类别':<8} {'金额':>10} {'描述'}")
    print(f"{'-'*60}")
    
    total = 0
    for e in sorted(expenses, key=lambda x: x["date"]):
        print(f"{e['date']:<12} {e['category']:<8} ¥{e['amount']:>8.2f} {e['description']}")
        total += e["amount"]
    
    print(f"{'-'*60}")
    print(f"{'总计':<12} {'':<8} ¥{total:>8.2f}")
    print()


def export_csv(output_file):
    budgets = load_json(BUDGET_FILE)
    expenses = load_json(EXPENSE_FILE)
    config = load_config()
    categories = config.get("categories", DEFAULT_CATEGORIES)
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["月份", "类别", "分组", "预算金额", "实际支出", "差额", "使用率(%)"])
        
        for month_key in sorted(budgets.keys()):
            for category in categories.keys():
                budget = get_budget(month_key, category)
                spent = get_total_spent(month_key, category)
                diff = budget - spent
                usage = (spent / budget * 100) if budget > 0 else 0
                group = categories[category].get("group", "其他")
                
                writer.writerow([
                    month_key, category, group,
                    f"{budget:.2f}", f"{spent:.2f}", f"{diff:.2f}",
                    f"{usage:.1f}"
                ])
    
    print(f"报表已导出到: {output_file}")


def import_csv(input_file):
    mapping = load_json(IMPORT_MAPPING_FILE)
    config = load_config()
    categories = config.get("categories", DEFAULT_CATEGORIES)
    
    date_col = mapping.get("date_column", "日期")
    amount_col = mapping.get("amount_column", "金额")
    category_col = mapping.get("category_column", "类别")
    desc_col = mapping.get("desc_column", "描述")
    category_map = mapping.get("category_map", {})
    
    imported_count = 0
    skipped_count = 0
    
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                date_str = row.get(date_col, "")
                amount_str = row.get(amount_col, "0")
                category = row.get(category_col, "其他")
                description = row.get(desc_col, "")
                
                category = category_map.get(category, category)
                
                if category not in categories:
                    categories[category] = {"group": "其他", "color": "white"}
                
                date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
                month_key = get_month_key(date_obj.year, date_obj.month)
                
                amount = float(amount_str.replace(",", ""))
                
                if amount > 0:
                    add_expense(month_key, category, amount, description, date_str)
                    imported_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                skipped_count += 1
                continue
    
    config["categories"] = categories
    save_config(config)
    
    print(f"导入完成: 成功 {imported_count} 条, 跳过 {skipped_count} 条")


def configure_import_mapping():
    mapping = load_json(IMPORT_MAPPING_FILE)
    
    print("\n配置CSV导入映射规则:")
    mapping["date_column"] = input(f"日期列名 (当前: {mapping['date_column']}): ") or mapping["date_column"]
    mapping["amount_column"] = input(f"金额列名 (当前: {mapping['amount_column']}): ") or mapping["amount_column"]
    mapping["category_column"] = input(f"类别列名 (当前: {mapping['category_column']}): ") or mapping["category_column"]
    mapping["desc_column"] = input(f"描述列名 (当前: {mapping['desc_column']}): ") or mapping["desc_column"]
    
    print("\n配置类别映射 (输入空值结束):")
    category_map = mapping.get("category_map", {})
    while True:
        source = input("银行原始类别名: ")
        if not source:
            break
        target = input(f"映射到预算类别: ")
        if target:
            category_map[source] = target
    mapping["category_map"] = category_map
    
    save_json(IMPORT_MAPPING_FILE, mapping)
    print("映射规则已保存")


def set_savings_target(month_key, target_amount, income):
    config = load_config()
    config["savings_target"] = float(target_amount)
    config["monthly_income"] = float(income)
    save_config(config)
    
    savings_amount = float(target_amount)
    set_budget(month_key, "储蓄", savings_amount)
    
    print(f"已设置储蓄目标: ¥{target_amount:.2f} (月收入: ¥{income:.2f})")


def apply_budget_rollover(current_month):
    config = load_config()
    if not config.get("rollover_enabled", False):
        return
    
    prev_month = get_previous_month(current_month)
    budgets = load_json(BUDGET_FILE)
    
    if current_month not in budgets:
        budgets[current_month] = {}
    
    categories = config.get("categories", DEFAULT_CATEGORIES)
    for category in categories.keys():
        if category == "储蓄":
            continue
        
        prev_remaining = get_remaining_budget(prev_month, category)
        if prev_remaining > 0:
            current_budget = get_budget(current_month, category)
            new_budget = current_budget + prev_remaining
            budgets[current_month][category] = new_budget
            print(f"{category} 预算结转: ¥{prev_remaining:.2f}")
    
    save_json(BUDGET_FILE, budgets)


def interactive_mode():
    current_month = get_current_month()
    
    while True:
        print(f"\n{Colors.BOLD}=== 个人预算管理器 ==={Colors.RESET}")
        print(f"当前月份: {current_month}")
        print("\n1. 查看预算状态")
        print("2. 记录支出")
        print("3. 设置预算")
        print("4. 查看支出明细")
        print("5. 切换月份")
        print("6. 导出报表 (CSV)")
        print("7. 导入银行对账单")
        print("8. 配置导入映射")
        print("9. 设置储蓄目标")
        print("10. 系统设置")
        print("0. 退出")
        
        choice = input("\n请选择操作: ").strip()
        
        if choice == "0":
            print("再见!")
            break
        elif choice == "1":
            show_monthly_status(current_month)
        elif choice == "2":
            category = input("类别: ").strip()
            amount = input("金额: ").strip()
            description = input("描述 (可选): ").strip()
            try:
                add_expense(current_month, category, float(amount), description)
                print("支出已记录")
            except ValueError:
                print("金额无效")
        elif choice == "3":
            category = input("类别: ").strip()
            amount = input("预算金额: ").strip()
            try:
                set_budget(current_month, category, float(amount))
            except ValueError:
                print("金额无效")
        elif choice == "4":
            category = input("类别 (留空查看全部): ").strip() or None
            show_expense_list(current_month, category)
        elif choice == "5":
            print(f"当前月份: {current_month}")
            print("1. 上月")
            print("2. 下月")
            print("3. 指定月份 (YYYY-MM)")
            sub = input("选择: ").strip()
            if sub == "1":
                current_month = get_previous_month(current_month)
            elif sub == "2":
                current_month = get_next_month(current_month)
            elif sub == "3":
                target = input("输入月份 (YYYY-MM): ").strip()
                try:
                    datetime.datetime.strptime(target, "%Y-%m")
                    current_month = target
                except ValueError:
                    print("无效的月份格式")
        elif choice == "6":
            filename = input("输出文件名 (默认: budget_report.csv): ").strip() or "budget_report.csv"
            export_csv(filename)
        elif choice == "7":
            filename = input("银行CSV文件路径: ").strip()
            if os.path.exists(filename):
                import_csv(filename)
            else:
                print("文件不存在")
        elif choice == "8":
            configure_import_mapping()
        elif choice == "9":
            target = input("储蓄目标金额: ").strip()
            income = input("月收入: ").strip()
            try:
                set_savings_target(current_month, float(target), float(income))
            except ValueError:
                print("金额无效")
        elif choice == "10":
            config = load_config()
            print("\n系统设置:")
            rollover = input(f"启用预算结转 ({'是' if config.get('rollover_enabled') else '否'}) [y/n]: ").strip().lower()
            if rollover == 'y':
                config["rollover_enabled"] = True
            elif rollover == 'n':
                config["rollover_enabled"] = False
            save_config(config)
            print("设置已保存")


def main():
    init_data()
    
    if len(sys.argv) < 2:
        interactive_mode()
        return
    
    command = sys.argv[1]
    
    if command == "add" and len(sys.argv) >= 4:
        category = sys.argv[2]
        amount = float(sys.argv[3])
        description = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else ""
        current_month = get_current_month()
        add_expense(current_month, category, amount, description)
        print("支出已记录")
    
    elif command == "status":
        month_key = sys.argv[2] if len(sys.argv) > 2 else get_current_month()
        show_monthly_status(month_key)
    
    elif command == "set":
        if len(sys.argv) >= 4:
            month_key = get_current_month()
            category = sys.argv[2]
            amount = float(sys.argv[3])
            if len(sys.argv) > 4:
                month_key = sys.argv[4]
            set_budget(month_key, category, amount)
    
    elif command == "list":
        month_key = get_current_month()
        category = None
        if len(sys.argv) > 2:
            category = sys.argv[2]
        if len(sys.argv) > 3:
            month_key = sys.argv[3]
        show_expense_list(month_key, category)
    
    elif command == "export":
        filename = sys.argv[2] if len(sys.argv) > 2 else "budget_report.csv"
        export_csv(filename)
    
    elif command == "import":
        if len(sys.argv) > 2:
            import_csv(sys.argv[2])
        else:
            print("用法: budget import <csv_file>")
    
    elif command == "config-import":
        configure_import_mapping()
    
    elif command == "savings":
        if len(sys.argv) >= 4:
            target = float(sys.argv[2])
            income = float(sys.argv[3])
            month_key = get_current_month()
            set_savings_target(month_key, target, income)
    
    elif command in ["help", "--help", "-h"]:
        print("""
个人预算管理器 - 使用帮助:

交互模式:
  budget                    启动交互模式

单命令模式:
  budget add <类别> <金额> [描述]  记录一笔支出
  budget status [月份]             查看预算状态 (月份格式: YYYY-MM)
  budget set <类别> <金额> [月份]   设置某类别的预算
  budget list [类别] [月份]         查看支出明细
  budget export [文件名]           导出CSV报表
  budget import <csv_file>          导入银行对账单
  budget config-import             配置导入映射规则
  budget savings <目标> <收入>      设置储蓄目标

示例:
  budget add 餐饮 25.5 午餐
  budget status 2024-01
  budget set 交通 500 2024-02
""")
    
    elif command == "test":
        print("✅ 测试命令执行成功！预算管理器运行正常。")
        print(f"数据目录: {DATA_DIR}")
        print(f"当前月份: {get_current_month()}")
    
    else:
        print(f"未知命令: {command}")
        print("输入 'budget help' 查看帮助")


if __name__ == "__main__":
    main()
