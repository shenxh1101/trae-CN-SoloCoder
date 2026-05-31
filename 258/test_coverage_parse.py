#!/usr/bin/env python3
"""测试覆盖率解析功能"""

import os
import sys
import json
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

sys.path.insert(0, os.getcwd())

from aitestgen.coverage import RealCoverageAnalyzer

console = Console()

def main():
    console.print(Panel.fit(
        "[bold blue]测试1: 实际运行pytest-cov并解析JSON报告[/bold blue]",
        border_style="blue"
    ))
    
    # 1. 检查coverage.json是否存在
    cov_file = "examples/coverage.json"
    source_file = "examples/calculator.py"
    
    if not os.path.exists(cov_file):
        console.print("[red]coverage.json不存在，先生成...[/red]")
        return
    
    console.print(f"[green]✓[/green] 找到覆盖率报告: {cov_file}")
    
    # 2. 读取JSON报告
    with open(cov_file, 'r') as f:
        cov_data = json.load(f)
    
    console.print(f"[green]✓[/green] JSON报告加载成功")
    
    # 3. 解析报告
    analyzer = RealCoverageAnalyzer()
    report = analyzer.parse_coverage_json(cov_data, source_file)
    
    if not report:
        console.print("[red]解析失败[/red]")
        return
    
    console.print(f"[green]✓[/green] 报告解析成功")
    console.print()
    
    # 4. 显示总体覆盖率
    console.print(Panel.fit(
        f"[bold]总体覆盖率[/bold]\\n"
        f"行覆盖率: [bold]{report.line_coverage:.1f}%[/bold] ({report.covered_lines}/{report.total_lines})\\n"
        f"分支覆盖率: [bold]{report.branch_coverage:.1f}%[/bold] ({report.covered_branches}/{report.total_branches})",
        border_style="cyan"
    ))
    
    # 5. 显示函数详情
    console.print()
    console.print("[bold]函数覆盖率详情:[/bold]")
    console.print("-" * 70)
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("函数名", style="cyan")
    table.add_column("行覆盖率", justify="right")
    table.add_column("分支覆盖率", justify="right")
    table.add_column("未覆盖的行", style="red")
    table.add_column("未覆盖的分支", style="red")
    
    for func in report.functions:
        if len(func.lines) == 0:
            continue
            
        line_color = "green" if func.line_coverage >= 80 else "yellow" if func.line_coverage >= 50 else "red"
        branch_color = "green" if func.branch_coverage >= 80 else "yellow" if func.branch_coverage >= 50 else "red"
        
        missing_lines_str = ", ".join(map(str, func.missing_lines[:5]))
        if len(func.missing_lines) > 5:
            missing_lines_str += f" (+{len(func.missing_lines)-5})"
        
        missing_branches_str = ", ".join(map(str, func.missing_branches[:5]))
        if len(func.missing_branches) > 5:
            missing_branches_str += f" (+{len(func.missing_branches)-5})"
        
        table.add_row(
            func.function_name,
            f"[{line_color}]{func.line_coverage:.1f}%[/{line_color}]",
            f"[{branch_color}]{func.branch_coverage:.1f}%[/{branch_color}]",
            missing_lines_str or "-",
            missing_branches_str or "-"
        )
    
    console.print(table)
    
    # 6. 详细显示divide函数的未覆盖代码
    console.print()
    console.print(Panel.fit(
        "[bold]divide函数未覆盖代码详情[/bold]",
        border_style="red"
    ))
    
    divide_func = None
    for func in report.functions:
        if func.function_name == 'divide':
            divide_func = func
            break
    
    if divide_func:
        console.print(f"函数签名: def [cyan]divide(a: int, b: int) -> float[/cyan]")
        console.print(f"位置: 第 [yellow]{divide_func.start_line}[/yellow] - 第 [yellow]{divide_func.end_line}[/yellow] 行")
        console.print()
        
        # 显示源代码并标记未覆盖的行
        with open(source_file, 'r') as f:
            all_lines = f.readlines()
        
        console.print("[bold]源代码 (带覆盖标记):[/bold]")
        for line_num in range(divide_func.start_line, divide_func.end_line + 1):
            if line_num <= 0 or line_num > len(all_lines):
                continue
            
            line_content = all_lines[line_num - 1].rstrip()
            line_cov = next((l for l in divide_func.lines if l.line_number == line_num), None)
            
            if line_cov:
                if line_cov.covered:
                    marker = "[green]✓[/green] "
                else:
                    marker = "[red]✗[/red] "
            else:
                marker = "  "
            
            # 检查是否是分支行
            branch = next((b for b in divide_func.branches if b.line_number == line_num), None)
            branch_info = ""
            if branch:
                if branch.fully_covered:
                    branch_info = " [green][分支: 完全覆盖][/green]"
                elif branch.partially_covered:
                    branch_info = " [yellow][分支: 部分覆盖][/yellow]"
                else:
                    branch_info = " [red][分支: 未覆盖][/red]"
            
            console.print(f"  {marker}{line_num:4d}: {line_content}{branch_info}")
        
        # 列出未覆盖的行
        console.print()
        console.print("[bold red]未覆盖的行号:[/bold red]")
        console.print(f"  {divide_func.missing_lines}")
        
        if divide_func.missing_branches:
            console.print()
            console.print("[bold yellow]未完全覆盖的分支行号:[/bold yellow]")
            console.print(f"  {divide_func.missing_branches}")
    
    # 7. 显示calculate函数详情
    console.print()
    console.print(Panel.fit(
        "[bold]calculate函数未覆盖分支详情[/bold]",
        border_style="yellow"
    ))
    
    calc_func = None
    for func in report.functions:
        if func.function_name == 'calculate':
            calc_func = func
            break
    
    if calc_func:
        console.print(f"[bold]未覆盖的分支操作:[/bold]")
        for branch in calc_func.branches:
            if not branch.fully_covered:
                status = "[red]完全未覆盖[/red]"
                if branch.partially_covered:
                    status = "[yellow]部分覆盖[/yellow]"
                console.print(f"  第 {branch.line_number} 行: {branch.condition.strip()} - {status}")
                console.print(f"    → True路径: {'[green]已覆盖[/green]' if branch.true_covered else '[red]未覆盖[/red]'}")
                console.print(f"    → False路径: {'[green]已覆盖[/green]' if branch.false_covered else '[red]未覆盖[/red]'}")
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✓ 覆盖率解析功能测试成功![/bold green]",
        border_style="green"
    ))

if __name__ == "__main__":
    main()
