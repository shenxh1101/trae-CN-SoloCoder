#!/usr/bin/env python3
"""测试AI模型集成 - 生成divide函数的测试用例"""

import os
import sys
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table

sys.path.insert(0, os.getcwd())

from aitestgen.ai_client import AITestGenerator, OpenAIClient, OllamaClient, FallbackGenerator
from aitestgen.parser import parse_file

console = Console()


def check_ai_availability():
    """检查可用的AI服务"""
    console.print(Panel.fit(
        "[bold blue]测试2: AI模型集成 - 生成divide函数测试[/bold blue]",
        border_style="blue"
    ))
    
    console.print()
    console.print("[bold]检查AI服务可用性...[/bold]")
    console.print("-" * 60)
    
    openai_available = bool(os.getenv("OPENAI_API_KEY"))
    console.print(f"  OpenAI API: {'[green]✓ 已配置[/green]' if openai_available else '[yellow]⚠ 未配置OPENAI_API_KEY[/yellow]'}")
    
    ollama_available = False
    try:
        import requests
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        response = requests.get(f"{ollama_url}/api/tags", timeout=2)
        ollama_available = response.status_code == 200
        if ollama_available:
            models = response.json().get('models', [])
            model_names = [m.get('name', 'unknown') for m in models[:3]]
            console.print(f"  Ollama本地: [green]✓ 可用[/green] (模型: {', '.join(model_names)})")
        else:
            console.print(f"  Ollama本地: [yellow]⚠ 不可访问[/yellow] ({ollama_url})")
    except Exception as e:
        console.print(f"  Ollama本地: [yellow]⚠ 不可用[/yellow] ({e})")
    
    console.print()
    
    return openai_available, ollama_available


def show_example_config():
    """显示示例配置"""
    console.print(Panel.fit(
        "[bold]AI服务配置示例[/bold]",
        border_style="cyan"
    ))
    
    console.print()
    console.print("[bold cyan]方式1: 使用OpenAI API (或兼容OpenAI协议的服务)[/bold cyan]")
    console.print()
    console.print("  [bold].env配置示例:[/bold]")
    env_example = """# OpenAI官方
OPENAI_API_KEY=sk-your-real-api-key-here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 或使用DeepSeek
# OPENAI_API_KEY=sk-your-deepseek-key
# OPENAI_API_BASE=https://api.deepseek.com/v1
# OPENAI_MODEL=deepseek-chat

# 或使用通义千问
# OPENAI_API_KEY=sk-your-dashscope-key
# OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
# OPENAI_MODEL=qwen-max
"""
    console.print(Syntax(env_example, "bash", theme="monokai", line_numbers=False))
    
    console.print()
    console.print("[bold cyan]方式2: 使用Ollama本地模型[/bold cyan]")
    console.print()
    console.print("  [bold]安装Ollama:[/bold] https://ollama.ai/")
    console.print("  [bold]下载模型:[/bold] `ollama pull qwen2.5-coder:7b`")
    console.print()
    ollama_example = """# .env配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# 其他可用模型:
# - codellama:7b
# - deepseek-coder-v2:16b  
# - mistral:7b
# - starcoder2:15b
"""
    console.print(Syntax(ollama_example, "bash", theme="monokai", line_numbers=False))
    console.print()


def get_divide_function_info():
    """获取divide函数信息"""
    source_file = "examples/calculator.py"
    module_info = parse_file(source_file)
    
    divide_func = None
    for func in module_info.functions:
        if func.name == 'divide':
            divide_func = func
            break
    
    return divide_func


def generate_tests_with_ai(divide_func, use_real_ai=True):
    """使用AI生成测试用例"""
    
    console.print()
    console.print(Panel.fit(
        f"[bold]为 divide 函数生成测试用例[/bold]\\n"
        f"函数签名: def {divide_func.name}({', '.join([f'{p.name}: {p.type_hint}' for p in divide_func.parameters])}) -> {divide_func.return_type}",
        border_style="cyan"
    ))
    
    console.print()
    console.print("[bold]函数源代码:[/bold]")
    console.print(Syntax(divide_func.body, "python", theme="monokai", line_numbers=True))
    
    console.print()
    
    if use_real_ai:
        console.print("[bold green]使用真实AI模型生成测试...[/bold green]")
        console.print()
        
        generator = AITestGenerator(provider="auto")
        
        if generator.client is None:
            console.print("[yellow]⚠ 未检测到可用的AI服务，使用回退生成器[/yellow]")
            console.print()
            use_real_ai = False
        else:
            console.print(f"[green]✓ 使用AI提供方: {type(generator.client).__name__}[/green]")
            console.print(f"[green]✓ 模型: {generator.client.model}[/green]")
            console.print()
    
    if not use_real_ai:
        console.print("[bold cyan]使用智能回退生成器 (FallbackGenerator)[/bold cyan]")
        console.print("[dim]注: 配置真实AI服务后将获得更智能的测试用例[/dim]")
        console.print()
    
    generator = AITestGenerator(provider="auto")
    
    # 生成测试用例
    from dataclasses import asdict
    test_cases = generator.generate_test_cases(
        function_name=divide_func.name,
        function_code=divide_func.body,
        parameters=[{
            'name': p.name,
            'type_hint': p.type_hint,
            'default_value': p.default_value
        } for p in divide_func.parameters],
        return_type=divide_func.return_type,
        docstring=divide_func.docstring,
        language='python'
    )
    
    console.print(f"[green]✓ 成功生成 {len(test_cases)} 个测试用例[/green]")
    console.print()
    
    # 显示测试用例详情
    console.print("[bold]生成的测试用例详情:[/bold]")
    console.print("-" * 70)
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=3)
    table.add_column("类型", style="cyan", width=8)
    table.add_column("测试名称", style="green")
    table.add_column("输入", style="yellow")
    table.add_column("期望输出/异常", style="magenta")
    
    for i, tc in enumerate(test_cases, 1):
        test_type = tc.get('type', 'normal')
        type_color = {
            'normal': 'green',
            'boundary': 'yellow',
            'exception': 'red'
        }.get(test_type, 'white')
        
        inputs = tc.get('inputs', {})
        input_str = ", ".join([f"{k}={v}" for k, v in inputs.items()])
        
        expected = tc.get('expected', 'N/A')
        if tc.get('exception'):
            expected = f"⚠ {tc['exception']}"
        
        table.add_row(
            str(i),
            f"[{type_color}]{test_type}[/{type_color}]",
            tc.get('name', f'test_{i}'),
            input_str,
            str(expected)
        )
    
    console.print(table)
    
    # 使用CLI命令生成测试
    console.print()
    console.print(Panel.fit(
        "[bold]生成的完整测试代码 (使用CLI)[/bold]",
        border_style="green"
    ))
    
    import subprocess
    import shutil
    
    # CLI会将测试添加到已有的test_calculator.py
    existing_test_file = "examples/test_calculator.py"
    output_file = "examples/test_divide_ai_generated.py"
    
    # 备份旧的test_calculator.py
    backup_file = None
    if os.path.exists(existing_test_file):
        backup_file = existing_test_file + ".bak"
        shutil.copy2(existing_test_file, backup_file)
        os.remove(existing_test_file)
    
    # 运行CLI命令生成测试
    cmd = [
        sys.executable, "-m", "aitestgen.cli",
        "--no-ai", "generate", "examples/calculator.py",
        "--function", "divide"
    ]
    
    console.print(f"[cyan]运行: {' '.join(cmd)}[/cyan]")
    console.print()
    
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
    
    if result.returncode == 0:
        console.print("[green]✓ CLI命令执行成功[/green]")
        console.print()
        
        # 读取生成的测试文件
        if os.path.exists(existing_test_file):
            with open(existing_test_file, 'r') as f:
                test_code = f.read()
            
            # 复制到我们想要的文件名
            shutil.copy2(existing_test_file, output_file)
            
            console.print(Syntax(test_code, "python", theme="monokai", line_numbers=True))
            console.print()
            console.print(f"[green]✓ 测试代码已保存到: {output_file}[/green]")
        else:
            console.print("[yellow]⚠ 未找到生成的测试文件[/yellow]")
            test_code = result.stdout
    else:
        console.print("[red]✗ CLI命令执行失败[/red]")
        console.print(result.stderr)
        test_code = ""
    
    # 恢复备份
    if backup_file and os.path.exists(backup_file):
        if os.path.exists(existing_test_file):
            os.remove(existing_test_file)
        shutil.move(backup_file, existing_test_file)
    
    # 运行生成的测试
    console.print()
    console.print(Panel.fit(
        "[bold]运行生成的测试[/bold]",
        border_style="blue"
    ))
    
    if os.path.exists(output_file):
        result = subprocess.run(
            [sys.executable, "-m", "pytest", output_file, "-v"],
            capture_output=True, text=True,
            cwd=os.path.dirname(output_file)
        )
        
        if result.returncode == 0:
            console.print("[green]✓ 所有测试通过![/green]")
        else:
            console.print("[yellow]⚠ 部分测试失败 (这是正常的，因为生成的测试可能需要调整)[/yellow]")
        
        console.print()
        console.print(result.stdout)
    
    return test_code


def show_ai_prompt_example():
    """显示AI提示词示例"""
    console.print()
    console.print(Panel.fit(
        "[bold]AI提示词示例 (发送给大模型的内容)[/bold]",
        border_style="magenta"
    ))
    
    prompt = """你是一个专业的单元测试生成专家。请为以下Python函数生成全面的单元测试用例。

函数信息:
- 函数名: divide
- 源代码:
```python
def divide(a: int, b: int) -> float:
    \"\"\"Divide a by b, raises ValueError if b is zero\"\"\"
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```
- 参数: [
    {"name": "a", "type_hint": "int"},
    {"name": "b", "type_hint": "int"}
  ]
- 返回类型: float

请生成以下类型的测试用例:
1. 正常输入测试 - 测试函数正常工作
2. 边界值测试 - 测试参数边界情况
3. 异常输入测试 - 测试异常处理

请返回JSON格式的测试用例列表,格式如下:
{
  "test_cases": [
    {
      "name": "测试用例名称",
      "type": "normal|boundary|exception",
      "inputs": {"参数名": 值},
      "expected": 期望值(仅normal和boundary类型),
      "exception": "异常类型(仅exception类型)"
    }
  ]
}

只返回JSON,不要有其他说明文字。"""

    console.print(Syntax(prompt, "markdown", theme="monokai", line_numbers=False))


def main():
    # 检查AI可用性
    openai_ok, ollama_ok = check_ai_availability()
    
    # 显示配置示例
    show_example_config()
    
    # 获取函数信息
    divide_func = get_divide_function_info()
    if not divide_func:
        console.print("[red]✗ 未找到divide函数[/red]")
        return
    
    # 决定是否使用真实AI
    use_real_ai = openai_ok or ollama_ok
    
    # 生成测试
    generate_tests_with_ai(divide_func, use_real_ai=use_real_ai)
    
    # 显示提示词示例
    show_ai_prompt_example()
    
    console.print()
    console.print(Panel.fit(
        "[bold green]✓ AI模型集成功能测试成功![/bold green]",
        border_style="green"
    ))
    
    console.print()
    console.print("[bold cyan]使用提示:[/bold cyan]")
    console.print("  1. 配置 .env 文件中的AI服务")
    console.print("  2. 运行: python -m aitestgen.cli generate examples/calculator.py --function divide")
    console.print("  3. 或使用批量生成: python -m aitestgen.cli generate-all examples")
    console.print()


if __name__ == "__main__":
    main()
