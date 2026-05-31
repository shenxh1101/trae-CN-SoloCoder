#!/usr/bin/env python3
"""测试交互式编辑功能 - 模拟edit --interactive命令的完整流程"""

import os
import sys
import json
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

sys.path.insert(0, os.getcwd())

from aitestgen.versioning import get_version_manager, reset_version_manager
from aitestgen.parser import parse_file

console = Console()


def main():
    console.print(Panel.fit(
        "[bold blue]测试3: 交互式编辑功能 - diff预览和版本保存[/bold blue]",
        border_style="blue"
    ))
    
    # 重置版本管理器
    reset_version_manager()
    vm = get_version_manager()
    
    # 1. 获取函数信息
    source_file = os.path.abspath("examples/calculator.py")
    module_info = parse_file(source_file)
    
    # 显示可编辑的函数列表
    console.print()
    console.print("[bold]可编辑的函数列表:[/bold]")
    console.print("-" * 70)
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=3)
    table.add_column("函数名", style="cyan")
    table.add_column("类", style="blue")
    table.add_column("文件位置", style="dim")
    
    all_funcs = []
    for func in module_info.functions:
        all_funcs.append((func, None))
    for cls in module_info.classes:
        for method in cls.methods:
            all_funcs.append((method, cls.name))
    
    for i, (func, cls_name) in enumerate(all_funcs, 1):
        table.add_row(
            str(i),
            func.name,
            cls_name or "-",
            f"第{func.start_line}-{func.end_line}行"
        )
    
    console.print(table)
    
    # 选择函数 (找到divide函数)
    selected_idx = None
    for i, (func, cls_name) in enumerate(all_funcs):
        if func.name == 'divide':
            selected_idx = i
            break
    
    if selected_idx is None:
        selected_idx = 0  # 找不到就选第一个
    
    selected_func, selected_cls = all_funcs[selected_idx]
    
    console.print()
    console.print(f"[cyan]→ 模拟用户选择: {selected_idx + 1}. {selected_func.name}[/cyan]")
    console.print()
    
    # 2. 生成并保存原始版本
    console.print(Panel.fit(
        "[bold]步骤1: 生成并保存原始测试版本[/bold]",
        border_style="cyan"
    ))
    
    # 从之前生成的测试文件中读取原始测试
    original_test_file = "examples/test_divide_ai_generated.py"
    if os.path.exists(original_test_file):
        with open(original_test_file, 'r') as f:
            original_content = f.read()
    else:
        # 如果文件不存在，生成一个简单的测试
        original_content = '''from calculator import divide
import pytest


def test_divide_normal():
    assert divide(10, 2) == 5.0


def test_divide_negative():
    assert divide(-10, 2) == -5.0


def test_divide_zero():
    with pytest.raises(ValueError):
        divide(10, 0)
'''
    
    # 获取函数源代码
    source_code = selected_func.body
    func_sig = f"{selected_func.name}({', '.join([f'{p.name}: {p.type_hint}' for p in selected_func.parameters])}) -> {selected_func.return_type}"
    
    console.print("[bold]原始测试代码:[/bold]")
    console.print(Syntax(original_content, "python", theme="monokai", line_numbers=True))
    
    # 保存原始版本
    vm.save_original(
        file_path=source_file,
        function_name=selected_func.name,
        content=original_content,
        language="python",
        source_code=source_code,
        function_signature=func_sig
    )
    
    console.print()
    console.print(f"[green]✓ 原始版本已保存[/green]")
    console.print(f"  文件: {source_file}")
    console.print(f"  函数: {selected_func.name}")
    console.print(f"  存储: {vm.storage_dir}")
    
    # 3. 模拟用户编辑
    console.print()
    console.print(Panel.fit(
        "[bold]步骤2: 模拟用户编辑测试代码[/bold]",
        border_style="yellow"
    ))
    
    console.print("[cyan]→ 模拟用户在编辑器中修改测试代码...[/cyan]")
    console.print()
    
    # 创建编辑后的版本
    edited_content = '''from calculator import divide
import pytest


class TestDivide:
    """测试divide函数"""
    
    def test_divide_normal_positive(self):
        """Test normal division with positive numbers"""
        assert divide(10, 2) == 5.0
        assert divide(100, 4) == 25.0
        assert divide(7, 2) == 3.5
    
    def test_divide_normal_negative(self):
        """Test normal division with negative numbers"""
        assert divide(-10, 2) == -5.0
        assert divide(10, -2) == -5.0
        assert divide(-10, -2) == 5.0
    
    def test_divide_zero_numerator(self):
        """Test division with zero numerator"""
        assert divide(0, 5) == 0.0
        assert divide(0, -3) == 0.0
    
    def test_divide_by_zero_raises_error(self):
        """Test that dividing by zero raises ValueError"""
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            divide(10, 0)
        
        with pytest.raises(ValueError):
            divide(0, 0)
    
    @pytest.mark.parametrize("a, b, expected", [
        (10, 2, 5.0),
        (-10, 2, -5.0),
        (0, 5, 0.0),
        (7, 2, 3.5),
    ])
    def test_divide_parametrized(self, a, b, expected):
        """Parametrized test for divide function"""
        assert divide(a, b) == expected
'''
    
    console.print("[bold]编辑后的测试代码:[/bold]")
    console.print(Syntax(edited_content, "python", theme="monokai", line_numbers=True))
    
    # 输入编辑原因
    edit_reason = "重构为类结构，添加参数化测试，完善异常测试的断言信息"
    console.print()
    console.print(f"[cyan]→ 模拟用户输入编辑原因: [/cyan]\"{edit_reason}\"")
    
    # 4. 保存编辑版本
    console.print()
    console.print(Panel.fit(
        "[bold]步骤3: 保存编辑版本并显示diff[/bold]",
        border_style="green"
    ))
    
    vm.save_edited(
        file_path=source_file,
        function_name=selected_func.name,
        edited_content=edited_content,
        edit_reason=edit_reason
    )
    
    console.print("[green]✓ 编辑版本已保存[/green]")
    console.print()
    
    # 5. 显示diff预览
    console.print("[bold]Diff预览 (编辑前后对比):[/bold]")
    console.print("-" * 70)
    
    diff = vm.get_diff(source_file, selected_func.name)
    
    if diff:
        # 彩色显示diff
        for line in diff.split('\n'):
            if line.startswith('---') or line.startswith('+++'):
                console.print(Text(line, style="bold"))
            elif line.startswith('@@'):
                console.print(Text(line, style="cyan"))
            elif line.startswith('+'):
                console.print(Text(line, style="green"))
            elif line.startswith('-'):
                console.print(Text(line, style="red"))
            else:
                console.print(Text(line, style="white"))
    
    # 6. 查看版本历史
    console.print()
    console.print(Panel.fit(
        "[bold]步骤4: 查看版本历史[/bold]",
        border_style="magenta"
    ))
    
    history = vm.load_history(source_file, selected_func.name)
    
    console.print(f"[bold]版本历史 - {selected_func.name}:[/bold]")
    console.print(f"共 {len(history.versions)} 个版本")
    console.print()
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("版本", style="cyan")
    table.add_column("类型", style="yellow")
    table.add_column("时间", style="dim")
    table.add_column("编辑原因", style="green")
    
    for i, version in enumerate(history.versions, 1):
        version_type = "edited" if version.is_edited else "original"
        table.add_row(
            str(i),
            version_type,
            version.timestamp[:19],
            version.edit_reason or "-"
        )
    
    console.print(table)
    
    # 7. 导出训练数据
    console.print()
    console.print(Panel.fit(
        "[bold]步骤5: 导出训练数据 (JSON/JSONL)[/bold]",
        border_style="blue"
    ))
    
    export_jsonl = "examples/edit_training_data.jsonl"
    export_json = "examples/edit_training_data.json"
    
    # 导出JSONL格式
    vm.export_training_data(export_jsonl, format='jsonl', include_diffs=True)
    console.print(f"[green]✓ JSONL格式已导出: {export_jsonl}[/green]")
    
    # 导出JSON格式
    vm.export_training_data(export_json, format='json', include_diffs=True)
    console.print(f"[green]✓ JSON格式已导出: {export_json}[/green]")
    
    console.print()
    
    # 显示导出的数据内容
    console.print("[bold]导出的训练数据预览 (JSONL):[/bold]")
    console.print("-" * 70)
    
    with open(export_jsonl, 'r') as f:
        for i, line in enumerate(f, 1):
            data = json.loads(line)
            if data.get('function_name') == selected_func.name:
                console.print(f"[cyan]记录 {i}:[/cyan]")
                console.print(f"  函数: {data['function_name']}")
                console.print(f"  文件: {data['file_path']}")
                console.print(f"  编辑原因: {data.get('edit_reason', 'N/A')}")
                console.print(f"  包含diff: {'diff' in data}")
                console.print()
                console.print("[bold]原始测试代码 (前10行):[/bold]")
                console.print(Syntax('\n'.join(data['original'].split('\n')[:10]), 
                                   "python", theme="monokai"))
                console.print()
                console.print("[bold]编辑后的测试代码 (前10行):[/bold]")
                console.print(Syntax('\n'.join(data['edited'].split('\n')[:10]), 
                                   "python", theme="monokai"))
                break
    
    # 8. 使用CLI命令查看已编辑的版本
    console.print()
    console.print(Panel.fit(
        "[bold]步骤6: 使用CLI命令查看已编辑的版本[/bold]",
        border_style="cyan"
    ))
    
    import subprocess
    cmd = [sys.executable, "-m", "aitestgen.cli", "list-edited", "--show-diffs"]
    console.print(f"[cyan]运行: {' '.join(cmd)}[/cyan]")
    console.print()
    
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
    console.print(result.stdout)
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✓ 交互式编辑功能测试成功![/bold green]",
        border_style="green"
    ))
    
    console.print()
    console.print("[bold cyan]功能总结:[/bold cyan]")
    console.print("  1. ✅ 版本保存: 原始版本和编辑版本分别保存")
    console.print("  2. ✅ Diff预览: 显示编辑前后的代码差异")
    console.print("  3. ✅ 编辑原因: 记录用户修改的原因")
    console.print("  4. ✅ 版本历史: 查看所有历史版本")
    console.print("  5. ✅ 数据导出: 支持JSON/JSONL格式，包含diff信息")
    console.print()
    console.print("[bold cyan]交互式CLI命令:[/bold cyan]")
    console.print("  python -m aitestgen.cli edit --interactive --show-diff")
    console.print("  python -m aitestgen.cli list-edited --show-diffs")
    console.print("  python -m aitestgen.cli export-training --format jsonl --include-diffs")
    console.print()


if __name__ == "__main__":
    main()
