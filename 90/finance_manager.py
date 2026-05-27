#!/usr/bin/env python3
import json
import os
import csv
import shutil
from datetime import datetime, date
from collections import defaultdict
from copy import deepcopy

INCOME_CATEGORIES = ["工资", "奖金", "投资收益", "兼职", "礼金", "退款", "其他收入"]
EXPENSE_CATEGORIES = ["餐饮", "购物", "交通", "居住", "娱乐", "医疗", "教育", "通讯", "旅行", "人情", "其他支出"]
ALL_CATEGORIES = INCOME_CATEGORIES + EXPENSE_CATEGORIES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")


class Storage:
    def __init__(self, data_dir=DATA_DIR, backup_dir=BACKUP_DIR):
        self.data_dir = data_dir
        self.backup_dir = backup_dir
        os.makedirs(data_dir, exist_ok=True)
        os.makedirs(backup_dir, exist_ok=True)

    def _ledger_path(self, ledger):
        return os.path.join(self.data_dir, f"{ledger}.json")

    def load_ledger(self, ledger):
        path = self._ledger_path(ledger)
        if not os.path.exists(path):
            return {"records": [], "budgets": {}}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_ledger(self, ledger, data):
        path = self._ledger_path(ledger)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_ledgers(self):
        ledgers = []
        for f in os.listdir(self.data_dir):
            if f.endswith(".json"):
                ledgers.append(f[:-5])
        return sorted(ledgers)

    def delete_ledger(self, ledger):
        path = self._ledger_path(ledger)
        if os.path.exists(path):
            os.remove(path)

    def backup_ledger(self, ledger):
        src = self._ledger_path(ledger)
        if not os.path.exists(src):
            return None
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{ledger}_backup_{timestamp}.json"
        dst = os.path.join(self.backup_dir, backup_filename)
        shutil.copy2(src, dst)
        return backup_filename

    def list_backups(self, ledger=None):
        backups = []
        for f in os.listdir(self.backup_dir):
            if f.endswith(".json"):
                if ledger is None or f.startswith(ledger + "_"):
                    backups.append(f)
        return sorted(backups)

    def restore_from_backup(self, backup_filename):
        src = os.path.join(self.backup_dir, backup_filename)
        if not os.path.exists(src):
            return False
        ledger_name = backup_filename.rsplit("_backup_", 1)[0]
        dst = self._ledger_path(ledger_name)
        shutil.copy2(src, dst)
        return True

    def delete_backup(self, backup_filename):
        path = os.path.join(self.backup_dir, backup_filename)
        if os.path.exists(path):
            os.remove(path)


class RecordManager:
    def __init__(self, storage):
        self.storage = storage
        self.current_ledger = None
        self.data = {"records": [], "budgets": {}}

    def switch_ledger(self, ledger):
        self.current_ledger = ledger
        self.data = self.storage.load_ledger(ledger)

    def _save(self):
        if self.current_ledger:
            self.storage.save_ledger(self.current_ledger, self.data)

    def add_record(self, record_type, amount, category, rec_date, note=""):
        rid = 1
        if self.data["records"]:
            rid = max(r["id"] for r in self.data["records"]) + 1
        record = {
            "id": rid,
            "type": record_type,
            "amount": round(float(amount), 2),
            "category": category,
            "date": rec_date,
            "note": note,
        }
        self.data["records"].append(record)
        self._save()
        return record

    def delete_record(self, record_id):
        found = False
        self.data["records"] = [r for r in self.data["records"] if not (found := found or r["id"] == record_id)]
        if found:
            self._save()
        return found

    def update_record(self, record_id, **kwargs):
        for r in self.data["records"]:
            if r["id"] == record_id:
                for k, v in kwargs.items():
                    if k in r and v is not None:
                        r[k] = v
                self._save()
                return r
        return None

    def get_record(self, record_id):
        for r in self.data["records"]:
            if r["id"] == record_id:
                return r
        return None

    def get_all_records(self):
        return sorted(self.data["records"], key=lambda r: r["date"])

    def search(self, keyword=None, min_amount=None, max_amount=None, category=None, rec_type=None, date_from=None, date_to=None):
        results = []
        for r in self.data["records"]:
            if keyword and keyword.lower() not in (r.get("note", "") + " " + r["category"]).lower():
                continue
            if min_amount is not None and r["amount"] < min_amount:
                continue
            if max_amount is not None and r["amount"] > max_amount:
                continue
            if category and r["category"] != category:
                continue
            if rec_type and r["type"] != rec_type:
                continue
            if date_from and r["date"] < date_from:
                continue
            if date_to and r["date"] > date_to:
                continue
            results.append(r)
        return sorted(results, key=lambda r: r["date"])


class Statistics:
    @staticmethod
    def monthly_summary(records, year, month):
        prefix = f"{year}-{month:02d}"
        income_total = 0.0
        expense_total = 0.0
        for r in records:
            if r["date"].startswith(prefix):
                if r["type"] == "收入":
                    income_total += r["amount"]
                elif r["type"] == "支出":
                    expense_total += r["amount"]
        return {
            "收入": round(income_total, 2),
            "支出": round(expense_total, 2),
            "结余": round(income_total - expense_total, 2),
        }

    @staticmethod
    def category_breakdown(records, year, month):
        prefix = f"{year}-{month:02d}"
        cat_totals = defaultdict(float)
        expense_total = 0.0
        for r in records:
            if r["date"].startswith(prefix) and r["type"] == "支出":
                cat_totals[r["category"]] += r["amount"]
                expense_total += r["amount"]
        breakdown = {}
        for cat, total in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True):
            pct = (total / expense_total * 100) if expense_total > 0 else 0
            breakdown[cat] = {"amount": round(total, 2), "percent": round(pct, 1)}
        return breakdown, round(expense_total, 2)

    @staticmethod
    def ascii_pie_chart(breakdown, expense_total, width=30):
        if not breakdown or expense_total == 0:
            return "无支出数据。"
        lines = []
        for cat, info in breakdown.items():
            filled = int(info["percent"] / 100 * width)
            bar = "█" * filled + "░" * (width - filled)
            lines.append(f"  {cat:8s} |{bar}| {info['amount']:>8.2f} ({info['percent']:>5.1f}%)")
        return "\n".join(lines)

    @staticmethod
    def six_month_chart(records):
        today = date.today()
        months_data = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            if m <= 0:
                m += 12
                y -= 1
            summary = Statistics.monthly_summary(records, y, m)
            months_data.append((f"{y}-{m:02d}", summary["收入"], summary["支出"]))
        if not months_data:
            return "无数据。"
        max_val = max(max(r[1], r[2]) for r in months_data) if months_data else 1
        if max_val == 0:
            max_val = 1
        scale = 30
        lines = ["\n  最近6个月收支对比图:\n"]
        for label, income, expense in months_data:
            income_bar = "█" * int(income / max_val * scale)
            expense_bar = "▓" * int(expense / max_val * scale)
            lines.append(f"  {label}")
            lines.append(f"    收入 |{income_bar:<{scale}}| {income:>10.2f}")
            lines.append(f"    支出 |{expense_bar:<{scale}}| {expense:>10.2f}")
        lines.append(f"\n  图例: █ 收入  ▓ 支出")
        return "\n".join(lines)


class BudgetManager:
    def __init__(self, record_manager):
        self.rm = record_manager

    def set_budget(self, category, amount, year, month):
        key = f"{year}-{month:02d}"
        if key not in self.rm.data["budgets"]:
            self.rm.data["budgets"][key] = {}
        self.rm.data["budgets"][key][category] = round(float(amount), 2)
        self.rm._save()

    def get_budgets(self, year, month):
        key = f"{year}-{month:02d}"
        return self.rm.data["budgets"].get(key, {})

    def delete_budget(self, category, year, month):
        key = f"{year}-{month:02d}"
        if key in self.rm.data["budgets"] and category in self.rm.data["budgets"][key]:
            del self.rm.data["budgets"][key][category]
            self.rm._save()
            return True
        return False

    def check_budgets(self, year, month):
        budgets = self.get_budgets(year, month)
        if not budgets:
            return []
        prefix = f"{year}-{month:02d}"
        cat_spent = defaultdict(float)
        for r in self.rm.data["records"]:
            if r["date"].startswith(prefix) and r["type"] == "支出":
                cat_spent[r["category"]] += r["amount"]
        warnings = []
        for cat, budget_amt in budgets.items():
            spent = cat_spent.get(cat, 0)
            if budget_amt > 0:
                ratio = spent / budget_amt
                if ratio >= 1.0:
                    warnings.append(("red", cat, spent, budget_amt, ratio))
                elif ratio >= 0.8:
                    warnings.append(("yellow", cat, spent, budget_amt, ratio))
        return warnings


class ImportExport:
    @staticmethod
    def export_csv(records, filepath, year=None):
        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["ID", "类型", "金额", "类别", "日期", "备注"])
            for r in records:
                if year and not r["date"].startswith(str(year)):
                    continue
                writer.writerow([r["id"], r["type"], r["amount"], r["category"], r["date"], r.get("note", "")])
        return filepath

    @staticmethod
    def import_alipay_csv(filepath, record_manager):
        records_added = 0
        with open(filepath, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()
        start_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith("交易号") or line.strip().startswith("交易创建时间"):
                start_idx = i
                break
        reader = csv.DictReader(lines[start_idx:])
        for row in reader:
            try:
                trans_date = None
                amount = None
                rec_type = None
                note = ""
                if "交易创建时间" in row:
                    trans_date = row["交易创建时间"].strip()[:10]
                elif "交易时间" in row:
                    trans_date = row["交易时间"].strip()[:10]
                elif "付款时间" in row:
                    trans_date = row["付款时间"].strip()[:10]
                if not trans_date:
                    continue
                for key in ["金额（元）", "金额", "交易金额", "订单金额"]:
                    if key in row and row[key].strip():
                        amount_str = row[key].strip().replace("¥", "").replace("￥", "").replace(",", "")
                        try:
                            amount = float(amount_str)
                            break
                        except ValueError:
                            continue
                if amount is None:
                    continue
                for key in ["资金状态", "收/支", "交易类型"]:
                    if key in row:
                        val = row[key].strip()
                        if "收入" in val or val in ["收"]:
                            rec_type = "收入"
                        elif "支出" in val or val in ["支"]:
                            rec_type = "支出"
                        break
                if rec_type is None:
                    rec_type = "支出"
                note_parts = []
                for key in ["商品名称", "交易对方", "交易说明", "备注", "商品 & 服务"]:
                    if key in row and row[key].strip():
                        note_parts.append(row[key].strip())
                note = " | ".join(note_parts)
                category = "其他收入" if rec_type == "收入" else "其他支出"
                record_manager.add_record(rec_type, amount, category, trans_date, note)
                records_added += 1
            except (ValueError, KeyError):
                continue
        return records_added

    @staticmethod
    def import_wechat_csv(filepath, record_manager):
        records_added = 0
        with open(filepath, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()
        start_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith("交易时间"):
                start_idx = i
                break
        reader = csv.DictReader(lines[start_idx:])
        for row in reader:
            try:
                trans_date = None
                amount = None
                rec_type = None
                if "交易时间" in row:
                    trans_date = row["交易时间"].strip()[:10]
                if not trans_date:
                    continue
                for key in ["金额(元)", "金额", "收/支金额"]:
                    if key in row and row[key].strip():
                        amount_str = row[key].strip().replace("¥", "").replace("￥", "").replace(",", "")
                        try:
                            amount = float(amount_str)
                            break
                        except ValueError:
                            continue
                if amount is None:
                    continue
                for key in ["收/支", "收支"]:
                    if key in row:
                        val = row[key].strip()
                        if "收入" in val:
                            rec_type = "收入"
                        elif "支出" in val:
                            rec_type = "支出"
                        break
                if rec_type is None:
                    rec_type = "支出"
                note_parts = []
                for key in ["交易类型", "交易对方", "商品", "备注"]:
                    if key in row and row[key].strip():
                        note_parts.append(row[key].strip())
                note = " | ".join(note_parts)
                category = "其他收入" if rec_type == "收入" else "其他支出"
                record_manager.add_record(rec_type, amount, category, trans_date, note)
                records_added += 1
            except (ValueError, KeyError):
                continue
        return records_added


class FinanceCLI:
    def __init__(self):
        self.storage = Storage()
        self.rm = RecordManager(self.storage)
        self.bm = BudgetManager(self.rm)
        self.current_ledger = None

    def _color(self, text, color):
        colors = {"red": "\033[91m", "yellow": "\033[93m", "green": "\033[92m", "cyan": "\033[96m", "bold": "\033[1m", "reset": "\033[0m"}
        return f"{colors.get(color, '')}{text}{colors['reset']}"

    def _print_menu(self):
        print("\n" + "=" * 50)
        print("  个人财务管理工具")
        if self.current_ledger:
            print(f"  当前账本: {self._color(self.current_ledger, 'cyan')}")
        else:
            print(f"  {self._color('请先选择或创建一个账本', 'yellow')}")
        print("=" * 50)
        print("  1.  管理账本 (创建/切换/删除)")
        print("  2.  添加记录")
        print("  3.  查看记录 (按月)")
        print("  4.  编辑记录")
        print("  5.  删除记录")
        print("  6.  搜索记录")
        print("  7.  收支汇总 (月度)")
        print("  8.  类别统计 (ASCII饼图)")
        print("  9.  6个月收支对比图")
        print("  10. 预算管理")
        print("  11. 导出 CSV")
        print("  12. 导入账单 (支付宝/微信)")
        print("  13. 数据备份")
        print("  14. 数据恢复")
        print("  0.  退出")
        print("=" * 50)

    def _select_ledger(self):
        ledgers = self.storage.list_ledgers()
        if not ledgers:
            print("  暂无账本，请先创建。")
            choice = input("  创建新账本名称: ").strip()
            if choice:
                self.storage.save_ledger(choice, {"records": [], "budgets": {}})
                self.current_ledger = choice
                self.rm.switch_ledger(choice)
                print(f"  已创建并切换到账本: {choice}")
        else:
            print("\n  可用账本:")
            for i, l in enumerate(ledgers, 1):
                print(f"    {i}. {l}")
            print(f"    {len(ledgers) + 1}. 创建新账本")
            try:
                choice = int(input("  选择编号: ").strip())
                if 1 <= choice <= len(ledgers):
                    self.current_ledger = ledgers[choice - 1]
                    self.rm.switch_ledger(self.current_ledger)
                    print(f"  已切换到账本: {self.current_ledger}")
                elif choice == len(ledgers) + 1:
                    name = input("  新账本名称: ").strip()
                    if name:
                        self.storage.save_ledger(name, {"records": [], "budgets": {}})
                        self.current_ledger = name
                        self.rm.switch_ledger(name)
                        print(f"  已创建并切换到账本: {name}")
            except ValueError:
                print("  无效输入。")

    def _manage_ledgers(self):
        while True:
            print("\n  --- 账本管理 ---")
            ledgers = self.storage.list_ledgers()
            print(f"  现有账本 ({len(ledgers)}):")
            for l in ledgers:
                marker = " ◀ 当前" if l == self.current_ledger else ""
                print(f"    - {l}{marker}")
            print("\n  1. 切换账本")
            print("  2. 创建新账本")
            print("  3. 删除账本")
            print("  0. 返回主菜单")
            try:
                choice = int(input("  选择: ").strip())
                if choice == 0:
                    return
                elif choice == 1:
                    self._select_ledger()
                elif choice == 2:
                    name = input("  新账本名称: ").strip()
                    if name:
                        self.storage.save_ledger(name, {"records": [], "budgets": {}})
                        print(f"  已创建账本: {name}")
                elif choice == 3:
                    name = input("  要删除的账本名称: ").strip()
                    if name in ledgers:
                        confirm = input(f"  确认删除账本 '{name}'? (y/N): ").strip().lower()
                        if confirm == "y":
                            self.storage.delete_ledger(name)
                            if self.current_ledger == name:
                                self.current_ledger = None
                            print(f"  已删除账本: {name}")
                    else:
                        print(f"  账本 '{name}' 不存在。")
            except ValueError:
                print("  无效输入。")

    def _add_record(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        print("\n  --- 添加记录 ---")
        while True:
            t = input("  类型 (收入/支出, 回车取消): ").strip()
            if not t:
                return
            if t not in ("收入", "支出"):
                print("  请输入 '收入' 或 '支出'")
                continue
            break
        try:
            amount = float(input("  金额: ").strip())
        except ValueError:
            print("  金额无效。")
            return
        cats = INCOME_CATEGORIES if t == "收入" else EXPENSE_CATEGORIES
        print(f"  类别可选: {', '.join(cats)}")
        category = input("  类别: ").strip()
        if category not in cats:
            print(f"  类别不在列表中，将保存为自定义类别。")
        default_date = date.today().strftime("%Y-%m-%d")
        rec_date = input(f"  日期 (回车默认 {default_date}): ").strip() or default_date
        note = input("  备注 (可留空): ").strip()
        r = self.rm.add_record(t, amount, category, rec_date, note)
        print(f"  已添加记录 #{r['id']}: {t} ¥{r['amount']} [{r['category']}] {r['date']}")
        self._check_budget_warnings(date.today().year, date.today().month)

    def _view_records(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        records = self.rm.get_all_records()
        if not records:
            print("  暂无记录。")
            return
        try:
            y = int(input("  年份 (回车=本年): ").strip() or date.today().year)
            m = int(input("  月份 (1-12, 回车=本月): ").strip() or date.today().month)
        except ValueError:
            print("  无效输入。")
            return
        prefix = f"{y}-{m:02d}"
        month_records = [r for r in records if r["date"].startswith(prefix)]
        if not month_records:
            print(f"  {y}年{m}月 暂无记录。")
            return
        print(f"\n  {y}年{m}月 记录列表:")
        print("  " + "-" * 70)
        for r in month_records:
            t_color = "green" if r["type"] == "收入" else "red"
            print(f"  #{r['id']:4d} | {self._color(r['type'], t_color)} | ¥{r['amount']:>10.2f} | {r['category']:8s} | {r['date']} | {r.get('note', '')}")
        print("  " + "-" * 70)
        summary = Statistics.monthly_summary(records, y, m)
        print(f"  收入: ¥{summary['收入']:.2f}  支出: ¥{summary['支出']:.2f}  结余: ¥{summary['结余']:.2f}")
        self._check_budget_warnings(y, m)

    def _edit_record(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        try:
            rid = int(input("  要编辑的记录 ID: ").strip())
        except ValueError:
            print("  无效 ID。")
            return
        r = self.rm.get_record(rid)
        if not r:
            print(f"  记录 #{rid} 不存在。")
            return
        print(f"  当前: #{r['id']} {r['type']} ¥{r['amount']} [{r['category']}] {r['date']} {r.get('note', '')}")
        print("  直接回车保留原值。")
        new_type = input(f"  类型 ({r['type']}): ").strip() or r["type"]
        new_amt = input(f"  金额 ({r['amount']}): ").strip()
        new_amt = float(new_amt) if new_amt else r["amount"]
        new_cat = input(f"  类别 ({r['category']}): ").strip() or r["category"]
        new_date = input(f"  日期 ({r['date']}): ").strip() or r["date"]
        new_note = input(f"  备注 ({r.get('note', '')}): ").strip()
        if new_note == "":
            new_note = r.get("note", "")
        updated = self.rm.update_record(rid, type=new_type, amount=new_amt, category=new_cat, date=new_date, note=new_note)
        if updated:
            print(f"  已更新: #{updated['id']} {updated['type']} ¥{updated['amount']} [{updated['category']}] {updated['date']}")

    def _delete_record(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        try:
            rid = int(input("  要删除的记录 ID: ").strip())
        except ValueError:
            print("  无效 ID。")
            return
        r = self.rm.get_record(rid)
        if not r:
            print(f"  记录 #{rid} 不存在。")
            return
        confirm = input(f"  确认删除 #{rid} ¥{r['amount']} [{r['category']}]? (y/N): ").strip().lower()
        if confirm == "y":
            self.rm.delete_record(rid)
            print(f"  已删除记录 #{rid}。")

    def _search_records(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        print("\n  --- 搜索记录 ---")
        print("  留空表示不使用该条件。")
        keyword = input("  关键词 (备注/类别): ").strip() or None
        min_a = input("  最小金额: ").strip()
        min_a = float(min_a) if min_a else None
        max_a = input("  最大金额: ").strip()
        max_a = float(max_a) if max_a else None
        print(f"  支出类别: {', '.join(EXPENSE_CATEGORIES)}")
        print(f"  收入类别: {', '.join(INCOME_CATEGORIES)}")
        category = input("  类别: ").strip() or None
        rec_type = input("  类型 (收入/支出): ").strip() or None
        date_from = input("  起始日期 (YYYY-MM-DD): ").strip() or None
        date_to = input("  结束日期 (YYYY-MM-DD): ").strip() or None
        results = self.rm.search(keyword=keyword, min_amount=min_a, max_amount=max_a, category=category, rec_type=rec_type, date_from=date_from, date_to=date_to)
        if not results:
            print("  未找到匹配记录。")
            return
        print(f"\n  找到 {len(results)} 条记录:")
        for r in results:
            t_color = "green" if r["type"] == "收入" else "red"
            print(f"  #{r['id']:4d} | {self._color(r['type'], t_color)} | ¥{r['amount']:>10.2f} | {r['category']:8s} | {r['date']} | {r.get('note', '')}")

    def _monthly_summary(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        try:
            y = int(input("  年份 (回车=本年): ").strip() or date.today().year)
            m = int(input("  月份 (1-12, 回车=本月): ").strip() or date.today().month)
        except ValueError:
            print("  无效输入。")
            return
        summary = Statistics.monthly_summary(self.rm.get_all_records(), y, m)
        income_str = f"¥{summary['收入']:.2f}"
        expense_str = f"¥{summary['支出']:.2f}"
        balance_str = f"¥{summary['结余']:.2f}"
        print(f"\n  {y}年{m}月 收支汇总:")
        print(f"  总收入: {self._color(income_str, 'green')}")
        print(f"  总支出: {self._color(expense_str, 'red')}")
        balance_color = "green" if summary["结余"] >= 0 else "red"
        print(f"  结余:   {self._color(balance_str, balance_color)}")
        self._check_budget_warnings(y, m)

    def _category_breakdown(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        try:
            y = int(input("  年份 (回车=本年): ").strip() or date.today().year)
            m = int(input("  月份 (1-12, 回车=本月): ").strip() or date.today().month)
        except ValueError:
            print("  无效输入。")
            return
        breakdown, expense_total = Statistics.category_breakdown(self.rm.get_all_records(), y, m)
        print(f"\n  {y}年{m}月 支出类别统计 (总支出 ¥{expense_total:.2f}):")
        if not breakdown:
            print("  无支出数据。")
            return
        chart = Statistics.ascii_pie_chart(breakdown, expense_total)
        print(chart)
        self._check_budget_warnings(y, m)

    def _six_month_chart(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        chart = Statistics.six_month_chart(self.rm.get_all_records())
        print(chart)

    def _check_budget_warnings(self, year, month):
        warnings = self.bm.check_budgets(year, month)
        for level, cat, spent, budget_amt, ratio in warnings:
            pct = ratio * 100
            if level == "red":
                msg = self._color(f"  ⚠ 警告: [{cat}] 支出 ¥{spent:.2f} 已超预算 ¥{budget_amt:.2f} ({pct:.1f}%)", "red")
            else:
                msg = self._color(f"  ⚡ 提醒: [{cat}] 支出 ¥{spent:.2f} 已达预算 ¥{budget_amt:.2f} 的 {pct:.1f}%", "yellow")
            print(msg)

    def _budget_management(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        while True:
            print("\n  --- 预算管理 ---")
            print("  1. 设置月度预算")
            print("  2. 查看月度预算")
            print("  3. 删除预算")
            print("  0. 返回")
            try:
                choice = int(input("  选择: ").strip())
                if choice == 0:
                    return
                elif choice == 1:
                    y = int(input("  年份 (回车=本年): ").strip() or date.today().year)
                    m = int(input("  月份 (1-12): ").strip() or date.today().month)
                    print(f"  支出类别: {', '.join(EXPENSE_CATEGORIES)}")
                    cat = input("  类别: ").strip()
                    if cat not in EXPENSE_CATEGORIES:
                        print("  类别不在标准列表中，但仍可保存。")
                    try:
                        amt = float(input("  预算金额: ").strip())
                        self.bm.set_budget(cat, amt, y, m)
                        print(f"  已设置 {y}年{m}月 [{cat}] 预算 ¥{amt:.2f}")
                    except ValueError:
                        print("  金额无效。")
                elif choice == 2:
                    y = int(input("  年份 (回车=本年): ").strip() or date.today().year)
                    m = int(input("  月份 (1-12, 回车=本月): ").strip() or date.today().month)
                    budgets = self.bm.get_budgets(y, m)
                    if not budgets:
                        print("  无预算设置。")
                    else:
                        print(f"\n  {y}年{m}月 预算:")
                        for cat, amt in sorted(budgets.items()):
                            print(f"    {cat}: ¥{amt:.2f}")
                        self._check_budget_warnings(y, m)
                elif choice == 3:
                    y = int(input("  年份: ").strip() or date.today().year)
                    m = int(input("  月份 (1-12): ").strip() or date.today().month)
                    cat = input("  类别: ").strip()
                    if self.bm.delete_budget(cat, y, m):
                        print(f"  已删除 {y}年{m}月 [{cat}] 预算。")
                    else:
                        print("  未找到该预算。")
            except ValueError:
                print("  无效输入。")

    def _export_csv(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        print("\n  --- 导出 CSV ---")
        year_str = input("  导出年份 (回车=全部数据): ").strip()
        year = int(year_str) if year_str else None
        default_name = f"{self.current_ledger}_export_{datetime.now().strftime('%Y%m%d')}.csv"
        filename = input(f"  文件名 (回车={default_name}): ").strip() or default_name
        if not filename.endswith(".csv"):
            filename += ".csv"
        filepath = os.path.join(BASE_DIR, filename)
        count = ImportExport.export_csv(self.rm.get_all_records(), filepath, year)
        print(f"  已导出 {len(self.rm.get_all_records()) if not year else '指定年份'} 条记录到: {filepath}")

    def _import_bill(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        print("\n  --- 导入账单 ---")
        print("  1. 支付宝账单 CSV")
        print("  2. 微信账单 CSV")
        try:
            choice = int(input("  选择来源: ").strip())
            filepath = input("  CSV 文件路径: ").strip()
            if not os.path.exists(filepath):
                print("  文件不存在。")
                return
            if choice == 1:
                count = ImportExport.import_alipay_csv(filepath, self.rm)
            elif choice == 2:
                count = ImportExport.import_wechat_csv(filepath, self.rm)
            else:
                print("  无效选择。")
                return
            print(f"  成功导入 {count} 条记录。")
        except ValueError:
            print("  无效输入。")

    def _backup(self):
        if not self.current_ledger:
            print("  请先选择账本。")
            return
        backup_name = self.storage.backup_ledger(self.current_ledger)
        if backup_name:
            print(f"  已创建备份: {backup_name}")
        else:
            print("  备份失败。")
        print("\n  所有备份文件:")
        for b in self.storage.list_backups():
            print(f"    - {b}")

    def _restore(self):
        backups = self.storage.list_backups()
        if not backups:
            print("  暂无备份文件。")
            return
        print("\n  可用备份文件:")
        for i, b in enumerate(backups, 1):
            print(f"    {i}. {b}")
        try:
            choice = int(input("  选择要恢复的备份编号: ").strip())
            if 1 <= choice <= len(backups):
                backup_name = backups[choice - 1]
                if self.storage.restore_from_backup(backup_name):
                    ledger_name = backup_name.rsplit("_backup_", 1)[0]
                    print(f"  已恢复账本 '{ledger_name}' 从备份 '{backup_name}'")
                    if self.current_ledger == ledger_name:
                        self.rm.switch_ledger(ledger_name)
                else:
                    print("  恢复失败。")
            else:
                print("  无效选择。")
        except ValueError:
            print("  无效输入。")

    def run(self):
        print(self._color("欢迎使用个人财务管理工具!", "bold"))
        while True:
            self._print_menu()
            try:
                choice = input("  请选择功能: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n  再见!")
                break
            if choice == "0":
                print("  再见!")
                break
            elif choice == "1":
                self._manage_ledgers()
            elif choice == "2":
                self._add_record()
            elif choice == "3":
                self._view_records()
            elif choice == "4":
                self._edit_record()
            elif choice == "5":
                self._delete_record()
            elif choice == "6":
                self._search_records()
            elif choice == "7":
                self._monthly_summary()
            elif choice == "8":
                self._category_breakdown()
            elif choice == "9":
                self._six_month_chart()
            elif choice == "10":
                self._budget_management()
            elif choice == "11":
                self._export_csv()
            elif choice == "12":
                self._import_bill()
            elif choice == "13":
                self._backup()
            elif choice == "14":
                self._restore()
            else:
                print("  无效选择，请重新输入。")


if __name__ == "__main__":
    app = FinanceCLI()
    app.run()
