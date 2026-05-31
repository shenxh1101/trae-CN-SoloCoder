#!/usr/bin/env python3
"""
综合测试脚本 - 验证所有功能
包括：AI生成、编辑功能、覆盖率报告、风格分析、导出功能
"""

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path

# 添加当前目录到路径
sys.path.insert(0, os.getcwd())

from rich.console import Console
from rich.panel import Panel

console = Console()


def test_1_ai_integration():
    """测试1: AI模型集成"""
    console.print(Panel.fit("[bold blue]Test 1: AI 模型集成[/bold blue]", border_style="blue"))
    
    print("\n1. 测试AI客户端初始化...")
    from aitestgen.ai_client import AITestGenerator, OpenAIClient, OllamaClient, FallbackGenerator
    
    # 测试FallbackGenerator（确保在没有AI时也能工作）
    print("   ✓ FallbackGenerator 可用")
    fallback = FallbackGenerator()
    
    # 测试生成测试用例
    test_cases = fallback.generate_test_cases(
        "add",
        [{"name": "a", "type_hint": "int"}, {"name": "b", "type_hint": "int"}],
        "int",
        "python"
    )
    print(f"   ✓ 生成了 {len(test_cases)} 个测试用例")
    assert len(test_cases) > 0, "应该至少生成一个测试用例"
    
    # 测试AITestGenerator初始化（自动检测AI）
    print("\n2. 测试AITestGenerator自动检测...")
    generator = AITestGenerator(provider="auto")
    if generator.client:
        print(f"   ✓ 检测到AI提供方: {type(generator.client).__name__}")
    else:
        print("   ⚠ 未检测到AI服务，使用回退生成器（正常现象）")
    
    # 测试环境变量支持
    print("\n3. 测试环境变量配置支持...")
    assert os.path.exists('.env.example'), "应该存在.env.example文件"
    with open('.env.example', 'r') as f:
        env_content = f.read()
    assert 'OPENAI_API_KEY' in env_content
    assert 'OLLAMA_BASE_URL' in env_content
    print("   ✓ .env.example配置文件完整")
    
    print("\n[green]✓ Test 1 完成: AI模型集成正常[/green]")
    return True


def test_2_version_management():
    """测试2: 版本管理和编辑功能"""
    console.print(Panel.fit("[bold blue]Test 2: 版本管理和编辑功能[/bold blue]", border_style="blue"))
    
    print("\n1. 测试VersionManager...")
    from aitestgen.versioning import VersionManager, TestVersion, VersionHistory
    
    # 使用临时目录测试
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ['AITESTGEN_HOME'] = tmpdir
        
        # 重置并重新创建VersionManager
        from aitestgen.versioning import get_version_manager, reset_version_manager
        reset_version_manager()
        
        vm = get_version_manager()
        print(f"   ✓ VersionManager初始化成功")
        print(f"     存储目录: {vm.storage_dir}")
        
        # 保存原始版本
        print("\n2. 测试保存版本...")
        original_content = """
def test_add():
    assert add(1, 2) == 3
"""
        edited_content = """
def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
"""
        
        file_path = os.path.abspath("examples/calculator.py")
        
        vm.save_original(
            file_path=file_path,
            function_name="add",
            content=original_content,
            language="python",
            source_code="def add(a: int, b: int) -> int:\\n    return a + b",
            function_signature="add(a: int, b: int) -> int"
        )
        print("   ✓ 原始版本保存成功")
        
        # 保存编辑版本
        vm.save_edited(
            file_path=file_path,
            function_name="add",
            edited_content=edited_content,
            edit_reason="添加了更多测试用例"
        )
        print("   ✓ 编辑版本保存成功")
        
        # 加载历史
        history = vm.load_history(file_path, "add")
        assert len(history.versions) == 2, "应该有2个版本"
        print(f"   ✓ 版本历史加载成功，共 {len(history.versions)} 个版本")
        
        # 获取diff
        diff = vm.get_diff(file_path, "add")
        assert diff is not None, "diff应该存在"
        print("   ✓ Diff生成成功")
        print(f"     Diff预览: {diff[:100]}...")
        
        # 测试导出训练数据
        print("\n3. 测试导出训练数据...")
        export_json = os.path.join(tmpdir, "training_data.json")
        export_jsonl = os.path.join(tmpdir, "training_data.jsonl")
        export_yaml = os.path.join(tmpdir, "training_data.yaml")
        
        vm.export_training_data(export_json, format='json', include_diffs=True)
        assert os.path.exists(export_json), "JSON导出文件应该存在"
        print("   ✓ JSON格式导出成功")
        
        vm.export_training_data(export_jsonl, format='jsonl', include_diffs=True)
        assert os.path.exists(export_jsonl), "JSONL导出文件应该存在"
        print("   ✓ JSONL格式导出成功")
        
        vm.export_training_data(export_yaml, format='yaml', include_diffs=True)
        assert os.path.exists(export_yaml), "YAML导出文件应该存在"
        print("   ✓ YAML格式导出成功")
        
        # 验证JSONL格式（每行一个JSON对象）
        with open(export_jsonl, 'r') as f:
            lines = f.readlines()
            for line in lines:
                json.loads(line)  # 应该能解析
        print("   ✓ JSONL格式验证通过")
        
        # 验证diff包含在导出中
        with open(export_json, 'r') as f:
            data = json.load(f)
        assert len(data) > 0
        assert 'diff' in data[0]
        print("   ✓ 导出数据包含diff信息")
    
    # 恢复默认存储目录
    if 'AITESTGEN_HOME' in os.environ:
        del os.environ['AITESTGEN_HOME']
    
    print("\n[green]✓ Test 2 完成: 版本管理和编辑功能正常[/green]")
    return True


def test_3_coverage_analysis():
    """测试3: 覆盖率报告分析"""
    console.print(Panel.fit("[bold blue]Test 3: 覆盖率报告分析[/bold blue]", border_style="blue"))
    
    print("\n1. 测试CoverageAnalyzer类结构...")
    from aitestgen.coverage import (
        CoverageAnalyzer, LineCoverage, BranchCoverage, 
        FunctionCoverage, CoverageReport
    )
    
    # 测试数据类
    lc = LineCoverage(line_number=1, line_content="def foo():", covered=True)
    assert lc.covered == True
    print("   ✓ LineCoverage 正常")
    
    bc = BranchCoverage(line_number=2, condition="if x > 0:", true_covered=True, false_covered=False)
    assert bc.fully_covered == False
    assert bc.partially_covered == True
    print("   ✓ BranchCoverage 正常")
    
    fc = FunctionCoverage(
        function_name="test",
        lines=[lc],
        missing_lines=[5, 6]
    )
    assert fc.total_lines == 1
    assert fc.missing_lines == [5, 6]
    print("   ✓ FunctionCoverage 正常")
    
    print("\n2. 测试coverage.py中的JSON解析逻辑...")
    # 创建一个模拟的pytest-cov JSON输出
    mock_cov_json = {
        "files": {
            os.path.abspath("examples/calculator.py"): {
                "summary": {
                    "covered_lines": 15,
                    "num_lines": 25,
                    "num_branches": 10,
                    "covered_branches": 6,
                    "percent_covered": 60.0
                },
                "executed_lines": [1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 20, 21, 22, 25],
                "missing_lines": [4, 8, 9, 13, 14, 17, 18, 19, 23, 24],
                "executed_branches": [[4, 0], [4, 1], [8, 0]],
                "missing_branches": [[8, 1], [13, 0], [13, 1]]
            }
        }
    }
    
    analyzer = CoverageAnalyzer()
    report = analyzer.parse_coverage_json(mock_cov_json, "examples/calculator.py")
    assert report is not None, "应该能解析mock数据"
    assert report.total_lines == 25
    assert report.covered_lines == 15
    assert report.line_coverage == 60.0
    print(f"   ✓ JSON解析成功")
    print(f"     行覆盖率: {report.line_coverage:.1f}%")
    print(f"     分支覆盖率: {report.branch_coverage:.1f}%")
    
    # 测试报告生成
    print("\n3. 测试多种报告格式...")
    json_report = analyzer._generate_json_report(report)
    assert 'line_coverage' in json.loads(json_report)
    print("   ✓ JSON报告生成成功")
    
    md_report = analyzer._generate_markdown_report(report)
    assert '# Coverage Report' in md_report
    print("   ✓ Markdown报告生成成功")
    
    text_report = analyzer._generate_text_report(report)
    assert 'Coverage Report' in text_report
    print("   ✓ Text报告生成成功")
    
    print("\n[green]✓ Test 3 完成: 覆盖率分析功能正常[/green]")
    return True


def test_4_style_analysis():
    """测试4: 自定义测试风格分析"""
    console.print(Panel.fit("[bold blue]Test 4: 自定义测试风格分析[/bold blue]", border_style="blue"))
    
    print("\n1. 测试StyleAnalyzer...")
    from aitestgen.style_analyzer import StyleAnalyzer, StyleConfig
    
    style_file = "examples/style_example.py"
    assert os.path.exists(style_file), f"风格示例文件 {style_file} 应该存在"
    
    analyzer = StyleAnalyzer(style_file)
    config = analyzer.analyze()
    
    assert isinstance(config, StyleConfig)
    print(f"   ✓ 风格分析成功")
    print(f"     测试函数命名模式: {config.test_naming_pattern}")
    print(f"     断言风格: {config.assert_style}")
    print(f"     注释风格: {config.comment_style}")
    print(f"     Fixture风格: {config.fixture_style}")
    
    # 测试模板生成
    print("\n2. 测试模板生成...")
    template = analyzer.generate_template()
    assert '{%' in template or '{{' in template, "应该生成有效的Jinja2模板"
    print(f"   ✓ 模板生成成功，长度: {len(template)} 字符")
    print(f"     模板预览: {template[:200]}...")
    
    # 测试在generator中使用风格
    print("\n3. 测试生成器集成风格...")
    from aitestgen.generator import PythonTestGenerator
    
    gen = PythonTestGenerator(style_template=style_file, use_ai=False)
    assert gen.style_config is not None, "生成器应该有style_config"
    print(f"   ✓ 生成器成功加载风格配置")
    print(f"     断言风格: {gen.style_config.assert_style}")
    
    print("\n[green]✓ Test 4 完成: 自定义测试风格功能正常[/green]")
    return True


def test_5_export_command():
    """测试5: export命令"""
    console.print(Panel.fit("[bold blue]Test 5: Export命令[/bold blue]", border_style="blue"))
    
    print("\n1. 测试目录扫描和导出...")
    from aitestgen.scanner import ProjectScanner
    
    # 创建临时输出目录
    with tempfile.TemporaryDirectory() as tmpdir:
        scanner = ProjectScanner("examples")
        results = scanner.scan_directory()
        print(f"   ✓ 扫描到 {len(results)} 个源文件")
        
        # 测试导出逻辑
        print("\n2. 测试导出逻辑...")
        exported_count = 0
        for result in results:
            test_file = scanner.get_test_file_path(result.file_path)
            if os.path.exists(test_file):
                # 计算相对路径
                rel_path = os.path.relpath(test_file, "examples")
                target_path = os.path.join(tmpdir, rel_path)
                
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                shutil.copy2(test_file, target_path)
                exported_count += 1
                print(f"   ✓ 导出: {rel_path}")
        
        print(f"\n3. 验证导出结果...")
        assert exported_count > 0, "应该至少导出一个文件"
        exported_files = list(Path(tmpdir).rglob("test_*.py")) + list(Path(tmpdir).rglob("*.test.js"))
        assert len(exported_files) == exported_count
        print(f"   ✓ 成功导出 {exported_count} 个测试文件")
        for f in exported_files:
            print(f"     - {f.relative_to(tmpdir)}")
    
    print("\n[green]✓ Test 5 完成: Export命令功能正常[/green]")
    return True


def test_6_cli_commands():
    """测试6: CLI命令功能"""
    console.print(Panel.fit("[bold blue]Test 6: CLI命令功能[/bold blue]", border_style="blue"))
    
    import subprocess
    
    print("\n1. 测试CLI帮助信息...")
    result = subprocess.run(
        [sys.executable, "-m", "aitestgen.cli", "--help"],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    assert 'generate' in result.stdout
    assert 'edit' in result.stdout
    assert 'coverage' in result.stdout
    assert 'export' in result.stdout
    print("   ✓ CLI帮助信息正常")
    
    print("\n2. 测试scan命令...")
    result = subprocess.run(
        [sys.executable, "-m", "aitestgen.cli", "scan", "examples"],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    assert 'calculator.py' in result.stdout or 'sample.py' in result.stdout
    print("   ✓ scan命令正常")
    
    print("\n3. 测试generate命令（无AI）...")
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', dir='examples', delete=False) as f:
        f.write("def test_func(x):\n    return x * 2\n")
        temp_file = f.name
    
    try:
        test_file = temp_file.replace('.py', '_test.py').replace('examples/', 'examples/test_')
        if os.path.exists(test_file):
            os.remove(test_file)
            
        result = subprocess.run(
            [sys.executable, "-m", "aitestgen.cli", "--no-ai", "generate", temp_file],
            capture_output=True, text=True
        )
        assert result.returncode == 0
        print("   ✓ generate命令正常")
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        test_file = os.path.join('examples', 'test_' + os.path.basename(temp_file))
        if os.path.exists(test_file):
            os.remove(test_file)
    
    print("\n4. 测试list-edited命令...")
    result = subprocess.run(
        [sys.executable, "-m", "aitestgen.cli", "list-edited"],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    print("   ✓ list-edited命令正常")
    
    print("\n[green]✓ Test 6 完成: CLI命令功能正常[/green]")
    return True


def test_7_interactive_edit_simulation():
    """测试7: 模拟交互式编辑流程"""
    console.print(Panel.fit("[bold blue]Test 7: 交互式编辑模拟[/bold blue]", border_style="blue"))
    
    print("\n1. 模拟保存版本...")
    from aitestgen.versioning import get_version_manager
    
    vm = get_version_manager()
    
    file_path = os.path.abspath("examples/calculator.py")
    function_name = "is_prime"
    
    # 模拟生成的测试
    original_test = '''
from calculator import is_prime

def test_is_prime_normal():
    assert is_prime(7) == True

def test_is_prime_boundary():
    assert is_prime(2) == True
'''
    
    # 模拟编辑后的测试
    edited_test = '''
from calculator import is_prime
import pytest

def test_is_prime_normal():
    """Test prime numbers"""
    assert is_prime(7) == True
    assert is_prime(13) == True
    assert is_prime(29) == True

def test_is_prime_boundary():
    """Test boundary cases"""
    assert is_prime(2) == True
    assert is_prime(1) == False
    assert is_prime(0) == False

def test_is_prime_negative():
    """Test negative numbers"""
    assert is_prime(-5) == False

@pytest.mark.parametrize("n, expected", [
    (2, True), (3, True), (4, False), (5, True), (6, False)
])
def test_is_prime_parametrized(n, expected):
    """Parametrized test for is_prime"""
    assert is_prime(n) == expected
'''
    
    # 保存原始版本
    vm.save_original(
        file_path=file_path,
        function_name=function_name,
        content=original_test,
        language="python",
        source_code="def is_prime(n: int) -> bool:...",
        function_signature="is_prime(n: int) -> bool"
    )
    
    # 保存编辑版本
    vm.save_edited(
        file_path=file_path,
        function_name=function_name,
        edited_content=edited_test,
        edit_reason="添加了参数化测试和更多边界用例"
    )
    
    print("   ✓ 版本保存成功")
    
    # 验证diff
    print("\n2. 验证diff预览...")
    diff = vm.get_diff(file_path, function_name)
    assert '+' in diff and '-' in diff, "diff应该包含增删标记"
    print(f"   ✓ Diff预览正常:")
    for line in diff.split('\n')[:20]:
        if line.startswith('+'):
            print(f"     [green]{line}[/green]")
        elif line.startswith('-'):
            print(f"     [red]{line}[/red]")
        else:
            print(f"     {line}")
    
    # 导出版本
    print("\n3. 导出训练数据...")
    export_file = "examples/is_prime_training.jsonl"
    vm.export_training_data(export_file, format='jsonl', include_diffs=True)
    
    # 找到is_prime的记录
    with open(export_file, 'r') as f:
        lines = f.readlines()
    
    data = None
    for line in lines:
        record = json.loads(line)
        if record.get('function_name') == 'is_prime':
            data = record
            break
    
    assert data is not None, "应该找到is_prime的导出记录"
    assert data['function_name'] == 'is_prime'
    assert 'original' in data
    assert 'edited' in data
    assert 'edit_reason' in data
    assert 'diff' in data
    print(f"   ✓ 训练数据导出成功")
    print(f"     共导出 {len(lines)} 条记录")
    print(f"     is_prime记录字段: {list(data.keys())}")
    print(f"     编辑原因: {data['edit_reason']}")
    
    print("\n[green]✓ Test 7 完成: 交互式编辑功能正常[/green]")
    return True


def main():
    """运行所有测试"""
    console.print(Panel.fit(
        "[bold cyan]AI Test Generator - 综合功能测试[/bold cyan]",
        border_style="cyan"
    ))
    
    tests = [
        test_1_ai_integration,
        test_2_version_management,
        test_3_coverage_analysis,
        test_4_style_analysis,
        test_5_export_command,
        test_6_cli_commands,
        test_7_interactive_edit_simulation,
    ]
    
    results = []
    for i, test in enumerate(tests, 1):
        try:
            result = test()
            results.append((test.__name__, result))
        except Exception as e:
            console.print(f"\n[red]✗ Test {i} 失败: {e}[/red]")
            import traceback
            traceback.print_exc()
            results.append((test.__name__, False))
        
        console.print("\n" + "="*60 + "\n")
    
    # 总结
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    console.print(Panel.fit(
        f"[bold]测试总结: [green]{passed}[/green]/[cyan]{total}[/cyan] 通过[/bold]",
        border_style="green" if passed == total else "yellow"
    ))
    
    for name, result in results:
        status = "[green]✓ PASS[/green]" if result else "[red]✗ FAIL[/red]"
        console.print(f"  {status} {name}")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
