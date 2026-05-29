#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整功能验证脚本 - 清理数据后逐条运行命令并记录输出
"""
import subprocess
import sys
import os
import shutil
import io

# 清理旧数据
data_dir = os.path.expanduser("~/.budget_manager")
if os.path.exists(data_dir):
    shutil.rmtree(data_dir)

script_dir = os.path.dirname(os.path.abspath(__file__))
budget_py = os.path.join(script_dir, "budget.py")
result_file = os.path.join(script_dir, "test_output.txt")

def run_cmd(desc, args):
    result = subprocess.run(
        [sys.executable, budget_py] + args,
        capture_output=True,
        text=True,
        cwd=script_dir
    )
    output = ""
    output += f"{'='*70}\n"
    output += f"  {desc}\n"
    output += f"  命令: python3 budget.py {' '.join(args)}\n"
    output += f"{'='*70}\n"
    if result.stdout.strip():
        output += result.stdout.strip() + "\n"
    if result.stderr.strip():
        output += f"STDERR: {result.stderr.strip()}\n"
    output += f"返回码: {result.returncode}\n\n"
    return output

full_output = ""
full_output += "=" * 70 + "\n"
full_output += "  个人预算管理器 - 实际命令运行测试\n"
full_output += "=" * 70 + "\n\n"

full_output += run_cmd("1. python3 budget.py help", ["help"])
full_output += run_cmd("2. python3 budget.py set 餐饮 1500", ["set", "餐饮", "1500"])
full_output += run_cmd("3. python3 budget.py add 餐饮 25.5 午餐", ["add", "餐饮", "25.5", "午餐"])
full_output += run_cmd("4. python3 budget.py status", ["status"])
full_output += run_cmd("5. python3 budget.py export test.csv", ["export", "test.csv"])

csv_path = os.path.join(script_dir, "test.csv")
if os.path.exists(csv_path):
    full_output += "=" * 70 + "\n"
    full_output += "  CSV文件内容\n"
    full_output += "=" * 70 + "\n"
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        full_output += f.read() + "\n"

full_output += run_cmd("6. python3 budget.py list", ["list"])

full_output += "=" * 70 + "\n"
full_output += "  所有命令执行完毕\n"
full_output += "=" * 70 + "\n"

with open(result_file, 'w', encoding='utf-8') as f:
    f.write(full_output)

print(full_output)
print(f"\n结果已保存到: {result_file}")
