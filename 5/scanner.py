#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能仓库库存预警与自动补货系统
仅使用Python标准库，Python 3.10+
"""

import json
import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# =============================================================================
# 常量配置
# =============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"

INVENTORY_FILE = DATA_DIR / "inventory.json"
DAILY_LOG_FILE = DATA_DIR / "daily_log.json"
ERROR_LOG_FILE = DATA_DIR / "error.log"
AUDIT_LOG_FILE = DATA_DIR / "audit.log"

STATES = {
    "NORMAL": "正常",
    "LOW_STOCK": "低库存",
    "OUT_OF_STOCK": "缺货",
    "ORDERED": "已下单"
}

START_DATE = datetime(2025, 1, 1)

# =============================================================================
# 工具函数
# =============================================================================

def ensure_data_dir() -> None:
    """确保data目录存在"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_current_sim_date() -> datetime:
    """获取当前模拟日期"""
    state = load_system_state()
    return datetime.fromisoformat(state["current_date"])


def set_current_sim_date(new_date: datetime) -> None:
    """设置当前模拟日期"""
    state = load_system_state()
    state["current_date"] = new_date.isoformat()
    save_system_state(state)


def load_system_state() -> dict:
    """加载系统状态（包括模拟日期）"""
    if not INVENTORY_FILE.exists():
        return {
            "current_date": START_DATE.isoformat(),
            "products": []
        }
    with open(INVENTORY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "current_date" not in data:
        data["current_date"] = START_DATE.isoformat()
    return data


def save_system_state(state: dict) -> None:
    """保存系统状态"""
    ensure_data_dir()
    with open(INVENTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def log_error(message: str) -> None:
    """记录错误日志"""
    ensure_data_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(ERROR_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")


def log_audit(message: str) -> None:
    """记录审计日志"""
    ensure_data_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")


# =============================================================================
# 数据初始化
# =============================================================================

def create_sample_products() -> list:
    """创建示例商品数据"""
    return [
        {
            "code": "P001",
            "name": "无线蓝牙耳机",
            "stock": 150,
            "safety_threshold": 50,
            "reorder_threshold": 30,
            "standard_reorder": 100,
            "status": "NORMAL",
            "expected_arrival": None
        },
        {
            "code": "P002",
            "name": "机械键盘",
            "stock": 45,
            "safety_threshold": 40,
            "reorder_threshold": 20,
            "standard_reorder": 80,
            "status": "NORMAL",
            "expected_arrival": None
        },
        {
            "code": "P003",
            "name": "无线鼠标",
            "stock": 25,
            "safety_threshold": 30,
            "reorder_threshold": 15,
            "standard_reorder": 60,
            "status": "LOW_STOCK",
            "expected_arrival": None
        },
        {
            "code": "P004",
            "name": "显示器支架",
            "stock": 0,
            "safety_threshold": 20,
            "reorder_threshold": 10,
            "standard_reorder": 40,
            "status": "OUT_OF_STOCK",
            "expected_arrival": None
        },
        {
            "code": "P005",
            "name": "USB-C 数据线",
            "stock": 200,
            "safety_threshold": 100,
            "reorder_threshold": 50,
            "standard_reorder": 150,
            "status": "NORMAL",
            "expected_arrival": None
        }
    ]


def initialize_inventory() -> None:
    """初始化库存数据"""
    if not INVENTORY_FILE.exists():
        state = {
            "current_date": START_DATE.isoformat(),
            "products": create_sample_products()
        }
        save_system_state(state)
        print(f"已创建初始库存数据，包含 {len(state['products'])} 个示例商品。")


# =============================================================================
# 商品管理
# =============================================================================

def load_products() -> list:
    """加载所有商品"""
    state = load_system_state()
    return state.get("products", [])


def save_products(products: list) -> None:
    """保存所有商品"""
    state = load_system_state()
    state["products"] = products
    save_system_state(state)


def find_product(code: str) -> Optional[dict]:
    """根据商品编码查找商品"""
    products = load_products()
    for product in products:
        if product["code"] == code:
            return product
    return None


def update_product(updated_product: dict) -> None:
    """更新单个商品"""
    products = load_products()
    for i, product in enumerate(products):
        if product["code"] == updated_product["code"]:
            products[i] = updated_product
            break
    save_products(products)


# =============================================================================
# 状态机逻辑
# =============================================================================

def evaluate_status(product: dict) -> str:
    """根据库存评估商品状态（不考虑已下单状态）"""
    stock = product["stock"]
    safety = product["safety_threshold"]
    
    if stock >= safety:
        return "NORMAL"
    elif stock > 0:
        return "LOW_STOCK"
    else:
        return "OUT_OF_STOCK"


def reevaluate_all_status() -> None:
    """重新评估所有商品的状态"""
    products = load_products()
    for product in products:
        if product["status"] != "ORDERED":
            new_status = evaluate_status(product)
            if new_status != product["status"]:
                product["status"] = new_status
    save_products(products)


def trigger_reorder(product: dict) -> bool:
    """触发补货下单"""
    if product["status"] == "ORDERED":
        print(f"商品 {product['code']} ({product['name']}) 已有补货订单在途，请等待到货。")
        return False
    
    current_date = get_current_sim_date()
    replenish_days = random.randint(3, 5)
    expected_arrival = current_date + timedelta(days=replenish_days)
    
    product["status"] = "ORDERED"
    product["expected_arrival"] = expected_arrival.isoformat()
    
    update_product(product)
    
    log_audit(f"触发补货 - 商品 {product['code']} ({product['name']})：补货量 {product['standard_reorder']}，预计到货 {expected_arrival.strftime('%Y-%m-%d')}")
    
    print(f"已为商品 {product['code']} ({product['name']}) 触发补货："
          f"补货量 {product['standard_reorder']}，预计到货日期 {expected_arrival.strftime('%Y-%m-%d')}")
    
    return True


def check_and_trigger_reorders() -> None:
    """检查所有商品，对需要补货的触发下单"""
    products = load_products()
    for product in products:
        if product["status"] != "ORDERED":
            if product["stock"] <= product["reorder_threshold"]:
                trigger_reorder(product)


# =============================================================================
# 库存操作
# =============================================================================

def increase_stock(code: str, amount: int) -> bool:
    """增加库存"""
    if amount <= 0:
        print("错误：增加数量必须大于 0。")
        return False
    
    product = find_product(code)
    if not product:
        print(f"错误：商品编码 {code} 不存在。")
        return False
    
    product["stock"] += amount
    
    if product["status"] == "ORDERED":
        pass
    else:
        new_status = evaluate_status(product)
        product["status"] = new_status
    
    update_product(product)
    print(f"成功：商品 {code} 库存增加 {amount}，当前库存 {product['stock']}。")
    
    check_and_trigger_reorders()
    return True


def decrease_stock(code: str, amount: int) -> bool:
    """减少库存"""
    if amount <= 0:
        print("错误：减少数量必须大于 0。")
        return False
    
    product = find_product(code)
    if not product:
        print(f"错误：商品编码 {code} 不存在。")
        return False
    
    if product["stock"] < amount:
        print(f"错误：商品 {code} 库存不足（当前 {product['stock']}，尝试减少 {amount}）。")
        return False
    
    product["stock"] -= amount
    
    if product["status"] != "ORDERED":
        new_status = evaluate_status(product)
        product["status"] = new_status
    
    update_product(product)
    print(f"成功：商品 {code} 库存减少 {amount}，当前库存 {product['stock']}。")
    
    check_and_trigger_reorders()
    return True


# =============================================================================
# 时间推进与收货
# =============================================================================

def advance_time(days: int) -> list:
    """推进时间，返回到货的商品列表"""
    if days <= 0:
        print("错误：推进天数必须大于 0，时间不能倒退。")
        return []
    
    current_date = get_current_sim_date()
    new_date = current_date + timedelta(days=days)
    
    products = load_products()
    arrived_products = []
    
    for product in products:
        if product["status"] == "ORDERED" and product["expected_arrival"]:
            expected = datetime.fromisoformat(product["expected_arrival"])
            if new_date >= expected:
                product["stock"] += product["standard_reorder"]
                product["expected_arrival"] = None
                product["status"] = evaluate_status(product)
                arrived_products.append(product)
    
    save_products(products)
    set_current_sim_date(new_date)
    
    if arrived_products:
        print(f"\n📦 以下商品已到货：")
        for p in arrived_products:
            print(f"  - {p['code']} ({p['name']})：补货 {p['standard_reorder']}，当前库存 {p['stock']}，状态：{STATES[p['status']]}")
    else:
        print("\n本次时间推进没有商品到货。")
    
    print(f"当前模拟日期：{new_date.strftime('%Y-%m-%d')}")
    
    check_and_trigger_reorders()
    
    return arrived_products


# =============================================================================
# 每日报告与日志
# =============================================================================

def append_daily_log() -> None:
    """追加每日库存快照"""
    ensure_data_dir()
    
    current_date = get_current_sim_date().strftime("%Y-%m-%d")
    products = load_products()
    
    snapshot = {p["code"]: p["stock"] for p in products}
    
    log_entry = {
        "date": current_date,
        "snapshot": snapshot
    }
    
    existing_logs = []
    if DAILY_LOG_FILE.exists():
        with open(DAILY_LOG_FILE, "r", encoding="utf-8") as f:
            existing_logs = json.load(f)
    
    existing_logs.append(log_entry)
    
    with open(DAILY_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_logs, f, ensure_ascii=False, indent=2)


def generate_daily_report() -> None:
    """生成并显示每日库存报告"""
    current_date = get_current_sim_date().strftime("%Y-%m-%d")
    products = load_products()
    
    print(f"\n📊 库存日报 - {current_date}")
    print("=" * 80)
    print(f"{'编码':<8} {'名称':<15} {'库存':>8} {'安全阈值':>10} {'补货阈值':>10} {'状态':<10} {'预计到货':<12}")
    print("-" * 80)
    
    for p in products:
        arrival = p["expected_arrival"]
        if arrival:
            arrival_str = datetime.fromisoformat(arrival).strftime("%Y-%m-%d")
        else:
            arrival_str = "-"
        print(f"{p['code']:<8} {p['name']:<15} {p['stock']:>8} {p['safety_threshold']:>10} "
              f"{p['reorder_threshold']:>10} {STATES[p['status']]:<10} {arrival_str:<12}")
    
    print("=" * 80)
    
    append_daily_log()


# =============================================================================
# 分析功能
# =============================================================================

def analyze_history() -> None:
    """分析历史数据"""
    if not DAILY_LOG_FILE.exists():
        print("没有历史数据可供分析。")
        return
    
    with open(DAILY_LOG_FILE, "r", encoding="utf-8") as f:
        logs = json.load(f)
    
    if len(logs) == 0:
        print("没有历史数据可供分析。")
        return
    
    products = load_products()
    product_map = {p["code"]: p for p in products}
    
    recent_logs = logs[-7:] if len(logs) >= 7 else logs
    total_days = len(recent_logs)
    
    print(f"\n📈 库存分析报告（最近 {total_days} 天）")
    print("=" * 80)
    print(f"{'编码':<8} {'名称':<15} {'低库存天数':>10} {'缺货天数':>10} {'异常占比':>10}")
    print("-" * 80)
    
    for code, product in product_map.items():
        low_stock_days = 0
        out_of_stock_days = 0
        
        for log in recent_logs:
            stock = log["snapshot"].get(code, 0)
            if stock == 0:
                out_of_stock_days += 1
            elif stock < product["safety_threshold"]:
                low_stock_days += 1
        
        abnormal_days = low_stock_days + out_of_stock_days
        ratio = (abnormal_days / total_days * 100) if total_days > 0 else 0
        
        print(f"{code:<8} {product['name']:<15} {low_stock_days:>10} {out_of_stock_days:>10} {ratio:>9.1f}%")
    
    print("-" * 80)
    
    reorder_count = 0
    if AUDIT_LOG_FILE.exists():
        with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if "触发补货" in line:
                    reorder_count += 1
    
    print(f"补货下单总次数：{reorder_count}")
    print("=" * 80)


# =============================================================================
# 阈值调整向导
# =============================================================================

def adjust_thresholds() -> None:
    """阈值调整向导"""
    products = load_products()
    
    print("\n⚙️  库存阈值调整向导")
    print("=" * 60)
    
    for product in products:
        print(f"\n商品：{product['code']} - {product['name']}")
        print(f"  当前安全库存阈值：{product['safety_threshold']}")
        print(f"  当前补货触发阈值：{product['reorder_threshold']}")
        
        try:
            new_safety = input(f"  请输入新的安全库存阈值（回车保持不变）：").strip()
            if new_safety:
                new_safety_val = int(new_safety)
                if new_safety_val < 0:
                    print("  错误：阈值不能为负数，跳过。")
                else:
                    old_val = product["safety_threshold"]
                    product["safety_threshold"] = new_safety_val
                    log_audit(f"阈值调整 - 商品 {product['code']}：安全阈值 {old_val} → {new_safety_val}")
                    print(f"  已更新安全库存阈值为 {new_safety_val}")
        except ValueError:
            print("  错误：输入无效，跳过安全阈值修改。")
        
        try:
            new_reorder = input(f"  请输入新的补货触发阈值（回车保持不变）：").strip()
            if new_reorder:
                new_reorder_val = int(new_reorder)
                if new_reorder_val < 0:
                    print("  错误：阈值不能为负数，跳过。")
                else:
                    old_val = product["reorder_threshold"]
                    product["reorder_threshold"] = new_reorder_val
                    log_audit(f"阈值调整 - 商品 {product['code']}：补货阈值 {old_val} → {new_reorder_val}")
                    print(f"  已更新补货触发阈值为 {new_reorder_val}")
        except ValueError:
            print("  错误：输入无效，跳过补货阈值修改。")
    
    save_products(products)
    reevaluate_all_status()
    print("\n✅ 所有阈值调整完成，已重新评估商品状态。")


# =============================================================================
# 命令解析与执行
# =============================================================================

def execute_command(command: str, batch_mode: bool = False) -> tuple[bool, str]:
    """执行单个命令，返回 (成功, 消息)"""
    command = command.strip()
    if not command or command.startswith("#"):
        return True, ""
    
    parts = command.split()
    cmd = parts[0].upper()
    
    try:
        if cmd == "INCREASE":
            if len(parts) != 3:
                return False, "INCREASE 命令格式错误，应为：INCREASE <商品编码> <数量>"
            code, amount = parts[1], int(parts[2])
            success = increase_stock(code, amount)
            if success:
                append_daily_log()
            return success, ""
        
        elif cmd == "DECREASE":
            if len(parts) != 3:
                return False, "DECREASE 命令格式错误，应为：DECREASE <商品编码> <数量>"
            code, amount = parts[1], int(parts[2])
            success = decrease_stock(code, amount)
            if success:
                append_daily_log()
            return success, ""
        
        elif cmd == "LIST":
            generate_daily_report()
            return True, ""
        
        elif cmd == "NEXT":
            if len(parts) != 2:
                return False, "NEXT 命令格式错误，应为：NEXT <天数>"
            days = int(parts[1])
            arrived = advance_time(days)
            append_daily_log()
            return True, f"推进 {days} 天，{len(arrived)} 个商品到货"
        
        elif cmd == "REPORT":
            generate_daily_report()
            return True, ""
        
        elif cmd == "ADJUST":
            if batch_mode:
                return False, "ADJUST 命令不能在批量模式下使用"
            adjust_thresholds()
            append_daily_log()
            return True, ""
        
        elif cmd == "ANALYZE":
            analyze_history()
            return True, ""
        
        elif cmd == "HELP":
            print_help()
            return True, ""
        
        elif cmd == "QUIT" or cmd == "EXIT":
            return True, "QUIT"
        
        else:
            return False, f"未知命令：{cmd}"
    
    except ValueError as e:
        return False, f"参数格式错误：{str(e)}"
    except Exception as e:
        return False, f"执行错误：{str(e)}"


def print_help() -> None:
    """打印帮助信息"""
    print("\n📖 可用命令：")
    print("  INCREASE <编码> <数量>  - 增加商品库存")
    print("  DECREASE <编码> <数量>  - 减少商品库存")
    print("  LIST                    - 查看所有商品列表")
    print("  NEXT <天数>             - 推进 N 天时间")
    print("  REPORT                  - 生成并显示库存报告")
    print("  ADJUST                  - 进入阈值调整向导")
    print("  ANALYZE                 - 分析历史库存数据")
    print("  HELP                    - 显示此帮助")
    print("  QUIT / EXIT             - 退出程序")
    print()


# =============================================================================
# 交互模式
# =============================================================================

def interactive_mode() -> None:
    """交互式命令行模式"""
    print("\n" + "=" * 60)
    print("🤖 智能仓库库存预警与自动补货系统")
    print("=" * 60)
    print(f"当前模拟日期：{get_current_sim_date().strftime('%Y-%m-%d')}")
    print("输入 HELP 查看可用命令，输入 QUIT 退出。")
    
    while True:
        try:
            command = input("\n> ").strip()
            if not command:
                continue
            
            success, result = execute_command(command, batch_mode=False)
            
            if result == "QUIT":
                print("👋 再见！")
                break
            
            if not success and result:
                print(f"❌ {result}")
        
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 发生错误：{e}")


# =============================================================================
# 批量模式
# =============================================================================

def batch_mode(batch_file: str) -> None:
    """批量处理模式"""
    batch_path = Path(batch_file)
    if not batch_path.exists():
        print(f"错误：批量文件 {batch_file} 不存在。")
        return
    
    print(f"\n📋 开始执行批量文件：{batch_file}")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    with open(batch_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        print(f"\n[{line_num}] 执行：{line}")
        success, result = execute_command(line, batch_mode=True)
        
        if success:
            success_count += 1
            if result and result != "QUIT":
                print(f"  ✅ {result}")
            else:
                print("  ✅ 执行成功")
        else:
            fail_count += 1
            error_msg = f"批量命令第 {line_num} 行失败：{line} - 错误：{result}"
            log_error(error_msg)
            print(f"  ❌ {result}（已记录到 error.log）")
    
    print("\n" + "=" * 60)
    print("📊 批量执行摘要")
    print(f"  总命令数：{success_count + fail_count}")
    print(f"  成功：{success_count}")
    print(f"  失败：{fail_count}")
    print("=" * 60)


# =============================================================================
# 主函数
# =============================================================================

def main() -> None:
    """主函数"""
    ensure_data_dir()
    initialize_inventory()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--batch":
            if len(sys.argv) < 3:
                print("错误：请指定批量文件路径。用法：python scanner.py --batch <文件路径>")
                return
            batch_mode(sys.argv[2])
        
        elif sys.argv[1] == "--analyze":
            analyze_history()
        
        elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print("\n智能仓库库存预警与自动补货系统")
            print("\n用法：")
            print("  python scanner.py              启动交互模式")
            print("  python scanner.py --batch <文件>  执行批量命令文件")
            print("  python scanner.py --analyze    分析历史库存数据")
            print("  python scanner.py --help       显示此帮助")
            print()
        
        else:
            print(f"未知参数：{sys.argv[1]}")
            print("使用 --help 查看帮助。")
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
