import os
import sys
import tempfile
import subprocess
import shutil
import json
import re
from typing import Optional
import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.syntax import Syntax

from .parser import parse_file, find_functions
from .generator import get_generator
from .scanner import ProjectScanner, scan_project
from .coverage import CoverageAnalyzer
from .versioning import VersionManager, get_version_manager
from .style_analyzer import StyleAnalyzer, analyze_style_file

console = Console()


@click.group()
@click.version_option(version="0.2.0")
@click.option('--ai-provider', default='auto', type=click.Choice(['auto', 'openai', 'ollama']),
              help='AI provider to use')
@click.option('--ai-model', help='AI model name')
@click.option('--api-key', help='API key for OpenAI')
@click.option('--use-ai/--no-ai', default=True, help='Enable/disable AI generation')
@click.pass_context
def main(ctx, ai_provider, ai_model, api_key, use_ai):
    """AI-powered Unit Test Generator for Python and JavaScript"""
    ctx.ensure_object(dict)
    ctx.obj['ai_provider'] = ai_provider
    ctx.obj['ai_model'] = ai_model
    ctx.obj['api_key'] = api_key
    ctx.obj['use_ai'] = use_ai


@main.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--function', '-f', 'function_name', help='Specific function name to test')
@click.option('--class-name', '-c', help='Specific class name to test')
@click.option('--output', '-o', help='Output file path')
@click.option('--style-example', '-s', type=click.Path(exists=True), help='Example test file to learn style from')
@click.option('--show-coverage', is_flag=True, help='Show coverage report')
@click.option('--run-coverage', is_flag=True, help='Run actual coverage tool')
@click.pass_context
def generate(ctx, file_path, function_name, class_name, output, style_example, show_coverage, run_coverage):
    """Generate unit tests for a file"""
    
    console.print(Panel.fit(
        f"[bold blue]Generating tests for:[/bold blue] {os.path.basename(file_path)}",
        border_style="blue"
    ))
    
    try:
        module_info = parse_file(file_path)
    except Exception as e:
        console.print(f"[red]Error parsing file: {e}[/red]")
        sys.exit(1)
    
    style_template = None
    if style_example:
        console.print(f"[cyan]Analyzing style from: {style_example}[/cyan]")
        style_analyzer = analyze_style_file(style_example)
        style_template = style_analyzer.generate_template()
        console.print("[green]✓ Style analyzed and applied[/green]")
    
    generator = get_generator(
        module_info.language,
        style_template,
        ai_provider=ctx.obj['ai_provider'],
        ai_model=ctx.obj['ai_model'],
        use_ai=ctx.obj['use_ai']
    )
    
    func_tests = []
    class_tests = []
    
    if function_name:
        funcs = find_functions(module_info, function_name)
        if not funcs:
            console.print(f"[yellow]Function '{function_name}' not found[/yellow]")
            sys.exit(1)
        for func in funcs:
            test = generator.generate_function_test(func, module_info)
            func_tests.append(test)
    elif class_name:
        cls = next((c for c in module_info.classes if c.name == class_name), None)
        if not cls:
            console.print(f"[yellow]Class '{class_name}' not found[/yellow]")
            sys.exit(1)
        class_test = generator.generate_class_test(cls, module_info)
        class_tests.append(class_test)
    else:
        for func in module_info.functions:
            test = generator.generate_function_test(func, module_info)
            func_tests.append(test)
        for cls in module_info.classes:
            class_test = generator.generate_class_test(cls, module_info)
            class_tests.append(class_test)
    
    test_content = generator.render_test_file(func_tests, class_tests, module_info)
    
    if not output:
        scanner = ProjectScanner(os.path.dirname(file_path))
        output = scanner.get_test_file_path(file_path)
    
    scanner = ProjectScanner(os.path.dirname(file_path))
    scanner.ensure_directory(output)
    
    with open(output, 'w') as f:
        f.write(test_content)
    
    console.print(f"[green]✓ Tests generated successfully![/green]")
    console.print(f"  Output: [cyan]{output}[/cyan]")
    
    version_manager = get_version_manager()
    for test in func_tests:
        func_info = next((f for f in module_info.functions if f.name == test.function_name), None)
        if func_info:
            sig = f"{func_info.name}({', '.join(p.name for p in func_info.parameters)})"
            version_manager.save_original(
                file_path, test.function_name, test_content,
                language=module_info.language,
                source_code=func_info.body,
                function_signature=sig
            )
    for group in class_tests:
        for method in group.methods:
            cls_info = next((c for c in module_info.classes if c.name == group.class_name), None)
            if cls_info:
                method_info = next((m for m in cls_info.methods if m.name == method.function_name), None)
                if method_info:
                    sig = f"{group.class_name}.{method.function_name}({', '.join(p.name for p in method_info.parameters)})"
                    version_manager.save_original(
                        file_path, method.function_name, test_content,
                        language=module_info.language,
                        source_code=method_info.body,
                        function_signature=sig
                    )
    
    if run_coverage:
        _run_real_coverage(file_path, output, module_info.language)
    
    if show_coverage:
        analyzer = CoverageAnalyzer()
        report = analyzer.analyze_module(module_info)
        analyzer.generate_report(report, output_format='console')


@main.command()
@click.argument('project_dir', type=click.Path(exists=True), default='.')
@click.option('--output-dir', '-o', help='Output directory for tests')
@click.option('--keep-structure/--no-keep-structure', default=True, help='Keep directory structure')
@click.option('--style-example', '-s', type=click.Path(exists=True), help='Example test file to learn style from')
@click.pass_context
def generate_all(ctx, project_dir, output_dir, keep_structure, style_example):
    """Generate tests for all files in a project"""
    
    console.print(Panel.fit(
        f"[bold blue]Scanning project:[/bold blue] {project_dir}",
        border_style="blue"
    ))
    
    scanner = ProjectScanner(project_dir)
    results = scanner.scan_directory()
    
    if not results:
        console.print("[yellow]No source files found[/yellow]")
        return
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("File")
    table.add_column("Language")
    table.add_column("Functions")
    table.add_column("Classes")
    
    for result in results:
        table.add_row(
            os.path.relpath(result.file_path, project_dir),
            result.language,
            str(len(result.functions)),
            str(len(result.classes))
        )
    
    console.print(table)
    
    style_template = None
    if style_example:
        console.print(f"[cyan]Analyzing style from: {style_example}[/cyan]")
        style_analyzer = analyze_style_file(style_example)
        style_template = style_analyzer.generate_template()
        console.print("[green]✓ Style analyzed and applied[/green]")
    
    generated_count = 0
    for result in results:
        try:
            module_info = parse_file(result.file_path)
            generator = get_generator(
                module_info.language,
                style_template,
                ai_provider=ctx.obj['ai_provider'],
                ai_model=ctx.obj['ai_model'],
                use_ai=ctx.obj['use_ai']
            )
            
            func_tests = []
            class_tests = []
            for func in module_info.functions:
                test = generator.generate_function_test(func, module_info)
                func_tests.append(test)
            for cls in module_info.classes:
                class_test = generator.generate_class_test(cls, module_info)
                class_tests.append(class_test)
            
            if func_tests or class_tests:
                test_content = generator.render_test_file(func_tests, class_tests, module_info)
                
                if output_dir:
                    output = scanner.get_test_file_path(
                        result.file_path, output_dir, keep_structure
                    )
                else:
                    output = scanner.get_test_file_path(result.file_path)
                
                scanner.ensure_directory(output)
                
                with open(output, 'w') as f:
                    f.write(test_content)
                
                console.print(f"[green]✓[/green] {os.path.relpath(output, project_dir)}")
                generated_count += 1
                
                version_manager = get_version_manager()
                for test in func_tests:
                    func_info = next((f for f in module_info.functions if f.name == test.function_name), None)
                    if func_info:
                        sig = f"{func_info.name}({', '.join(p.name for p in func_info.parameters)})"
                        version_manager.save_original(
                            result.file_path, test.function_name, test_content,
                            language=module_info.language,
                            source_code=func_info.body,
                            function_signature=sig
                        )
                for group in class_tests:
                    for method in group.methods:
                        cls_info = next((c for c in module_info.classes if c.name == group.class_name), None)
                        if cls_info:
                            method_info = next((m for m in cls_info.methods if m.name == method.function_name), None)
                            if method_info:
                                sig = f"{group.class_name}.{method.function_name}({', '.join(p.name for p in method_info.parameters)})"
                                version_manager.save_original(
                                    result.file_path, method.function_name, test_content,
                                    language=module_info.language,
                                    source_code=method_info.body,
                                    function_signature=sig
                                )
        
        except Exception as e:
            console.print(f"[red]✗[/red] {os.path.basename(result.file_path)}: {e}")
    
    console.print(f"\n[bold green]Generated tests for {generated_count} files[/bold green]")


@main.command()
@click.argument('file_path', type=click.Path(exists=True), required=False)
@click.argument('function_name', required=False)
@click.option('--editor', '-e', default='vim', help='Editor to use (vim, nano, code)')
@click.option('--interactive', '-i', is_flag=True, help='Interactive mode to select function')
@click.option('--show-diff', is_flag=True, help='Show diff before saving')
def edit(file_path, function_name, editor, interactive, show_diff):
    """Edit generated tests interactively and save edited version"""
    
    version_manager = get_version_manager()
    
    if interactive or not file_path or not function_name:
        result = _interactive_select_function()
        if not result:
            return
        file_path, function_name = result
    
    history = version_manager.load_history(file_path, function_name)
    latest = history.get_latest()
    
    if not latest:
        console.print(f"[yellow]No test history found for {function_name}[/yellow]")
        console.print(f"[cyan]Tip: Run 'aitestgen generate' first to generate tests[/cyan]")
        return
    
    content = latest.edited_content or latest.original_content
    
    console.print(Panel.fit(
        f"[bold blue]Editing test for:[/bold blue] {function_name}",
        border_style="blue"
    ))
    
    console.print(f"[cyan]File:[/cyan] {os.path.relpath(file_path)}")
    console.print(f"[cyan]Current versions:[/cyan] {len(history.versions)} total, "
                  f"{len(history.get_edited_versions())} edited\n")
    
    if show_diff and latest.is_edited:
        console.print("[bold]Previous edit diff:[/bold]")
        diff = version_manager.get_diff(file_path, function_name)
        if diff:
            console.print(Syntax(diff, "diff", theme="monokai", line_numbers=False))
            console.print()
    
    ext = '.py' if latest.language == 'python' else '.js'
    
    with tempfile.NamedTemporaryFile(mode='w', suffix=ext, delete=False) as f:
        f.write(content)
        temp_file = f.name
    
    try:
        console.print(f"[cyan]Opening editor: {editor}...[/cyan]")
        subprocess.run([editor, temp_file], check=True)
        
        with open(temp_file, 'r') as f:
            edited_content = f.read()
        
        if edited_content != content:
            if show_diff:
                console.print("\n[bold]Changes made:[/bold]")
                import difflib
                diff = difflib.unified_diff(
                    content.splitlines(keepends=True),
                    edited_content.splitlines(keepends=True),
                    fromfile='original',
                    tofile='edited',
                    n=3
                )
                diff_text = ''.join(diff)
                if diff_text:
                    console.print(Syntax(diff_text, "diff", theme="monokai", line_numbers=False))
            
            if click.confirm("\nDo you want to save these changes?"):
                edit_reason = click.prompt("Optional: Enter reason for edit (press enter to skip)", 
                                          default="", show_default=False)
                version_manager.save_edited(file_path, function_name, edited_content, edit_reason)
                console.print(f"\n[green]✓ Edited version saved successfully![/green]")
                
                latest = history.get_latest()
                console.print(f"  Version ID: [cyan]{latest.version_id}[/cyan]")
                console.print(f"  Timestamp: [cyan]{latest.timestamp}[/cyan]")
            else:
                console.print("[yellow]Changes discarded[/yellow]")
        else:
            console.print("[yellow]No changes made[/yellow]")
    
    except subprocess.CalledProcessError:
        console.print(f"[red]Error: Editor '{editor}' not found or failed to open[/red]")
        console.print(f"[cyan]Tip: Use --editor to specify a different editor[/cyan]")
    finally:
        if os.path.exists(temp_file):
            os.unlink(temp_file)


@main.command()
@click.option('--output', '-o', required=True, help='Output file for training data')
@click.option('--format', '-f', 'format_type', 
              type=click.Choice(['json', 'yaml', 'jsonl']), 
              default='json', help='Output format')
@click.option('--include-diffs', is_flag=True, help='Include diffs in training data')
def export_training(output, format_type, include_diffs):
    """Export edited test pairs for model fine-tuning"""
    
    version_manager = get_version_manager()
    
    console.print(Panel.fit(
        f"[bold blue]Exporting training data[/bold blue]",
        border_style="blue"
    ))
    
    count = version_manager.export_training_data(output, format_type, include_diffs=include_diffs)
    
    if count > 0:
        console.print(f"[green]✓ Exported {count} training pairs to {output}[/green]")
        console.print(f"  Format: [cyan]{format_type}[/cyan]")
        if include_diffs:
            console.print(f"  Includes: [cyan]diffs[/cyan]")
    else:
        console.print("[yellow]No edited test pairs found to export[/yellow]")
        console.print(f"[cyan]Tip: Use 'aitestgen edit' to edit tests first[/cyan]")


@main.command()
@click.option('--show-diffs', is_flag=True, help='Show diffs for edited functions')
def list_edited(show_diffs):
    """List all edited test functions"""
    
    version_manager = get_version_manager()
    functions = version_manager.list_functions()
    
    if not functions:
        console.print("[yellow]No edited functions found[/yellow]")
        return
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("File")
    table.add_column("Function")
    table.add_column("Total Versions")
    table.add_column("Edited")
    table.add_column("Last Edited")
    
    for func in functions:
        table.add_row(
            os.path.relpath(func['file_path']),
            func['function_name'],
            str(func['total_versions']),
            str(func['edited_count']),
            func.get('last_edited', '-') or '-'
        )
    
    console.print(table)
    
    if show_diffs:
        for func in functions:
            if func['edited_count'] > 0:
                console.print(f"\n[bold]Diff for {func['function_name']}:[/bold]")
                diff = version_manager.get_diff(func['file_path'], func['function_name'])
                if diff:
                    console.print(Syntax(diff, "diff", theme="monokai", line_numbers=False))


@main.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--output', '-o', help='Output file for report')
@click.option('--format', '-f', 'format_type', 
              type=click.Choice(['console', 'markdown', 'text', 'json']), 
              default='console', help='Output format')
@click.option('--run-tests', is_flag=True, help='Run tests and get real coverage using pytest-cov')
@click.option('--test-file', help='Path to test file (if not standard location)')
def coverage(file_path, output, format_type, run_tests, test_file):
    """Generate coverage report, optionally running real tests with pytest-cov"""
    
    if run_tests:
        if not test_file:
            scanner = ProjectScanner(os.path.dirname(file_path))
            test_file = scanner.get_test_file_path(file_path)
        
        if not os.path.exists(test_file):
            console.print(f"[yellow]Test file not found: {test_file}[/yellow]")
            console.print(f"[cyan]Tip: Run 'aitestgen generate' first[/cyan]")
            console.print("\n[dim]Falling back to estimated coverage...[/dim]\n")
        else:
            from .coverage import analyze_coverage
            result = analyze_coverage(file_path, test_file, format_type)
            
            if result and output:
                with open(output, 'w') as f:
                    f.write(result)
                console.print(f"[green]✓ Coverage report saved to {output}[/green]")
            
            if result is not None:
                return
    
    try:
        module_info = parse_file(file_path)
    except Exception as e:
        console.print(f"[red]Error parsing file: {e}[/red]")
        sys.exit(1)
    
    analyzer = CoverageAnalyzer()
    report = analyzer.analyze_module(module_info)
    
    if output:
        report_content = analyzer.generate_report(report, format_type)
        with open(output, 'w') as f:
            f.write(report_content)
        console.print(f"[green]✓ Coverage report saved to {output}[/green]")
    else:
        analyzer.generate_report(report, format_type)


def _run_real_coverage(source_file: str, test_file: Optional[str], language: str):
    """Run actual coverage tool and display results"""
    
    console.print("\n[bold cyan]Running coverage analysis...[/bold cyan]")
    
    if language == 'python':
        if not test_file:
            scanner = ProjectScanner(os.path.dirname(source_file))
            test_file = scanner.get_test_file_path(source_file)
        
        if not os.path.exists(test_file):
            console.print(f"[yellow]Test file not found: {test_file}[/yellow]")
            console.print(f"[cyan]Tip: Run 'aitestgen generate' first[/cyan]")
            return
        
        try:
            cmd = [sys.executable, '-m', 'pytest', test_file, 
                   '--cov=' + os.path.dirname(source_file),
                   '--cov-report=term',
                   '--cov-report=json:.coverage.json',
                   '-v']
            
            console.print(f"[cyan]Running: {' '.join(cmd)}[/cyan]")
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
            
            if result.stdout:
                console.print("\n[bold]Test Output:[/bold]")
                console.print(Syntax(result.stdout, "text", theme="monokai"))
            
            if os.path.exists('.coverage.json'):
                with open('.coverage.json', 'r') as f:
                    cov_data = json.load(f)
                
                abs_source = os.path.abspath(source_file)
                for file_path, file_data in cov_data.get('files', {}).items():
                    if os.path.abspath(file_path) == abs_source:
                        summary = file_data.get('summary', {})
                        console.print("\n[bold]Coverage Summary:[/bold]")
                        console.print(f"  Lines covered: [green]{summary.get('covered_lines', 0)}[/green] / {summary.get('num_lines', 0)}")
                        console.print(f"  Coverage: [{'green' if summary.get('percent_covered', 0) >= 80 else 'yellow' if summary.get('percent_covered', 0) >= 50 else 'red'}]{summary.get('percent_covered', 0):.1f}%[/{'green' if summary.get('percent_covered', 0) >= 80 else 'yellow' if summary.get('percent_covered', 0) >= 50 else 'red'}]")
                        
                        missing = file_data.get('missing_lines', [])
                        if missing:
                            console.print(f"  Missing lines: [red]{missing[:20]}[/red]")
                            if len(missing) > 20:
                                console.print(f"                [red](+{len(missing)-20} more)[/red]")
                        
                        break
            
        except subprocess.CalledProcessError as e:
            console.print(f"[yellow]Coverage run failed with exit code {e.returncode}[/yellow]")
            if e.stdout:
                console.print(e.stdout)
        except FileNotFoundError:
            console.print("[red]pytest or pytest-cov not found[/red]")
            console.print("[cyan]Install with: pip install pytest pytest-cov[/cyan]")
    
    elif language == 'javascript':
        console.print("[yellow]JavaScript coverage requires npx/c8 or nyc to be installed[/yellow]")
        console.print("[cyan]Install with: npm install -g c8[/cyan]")
        # 可以在这里添加JavaScript覆盖率支持


@main.command()
@click.argument('project_dir', type=click.Path(exists=True), default='.')
@click.option('--output-dir', '-o', required=True, help='Target directory to export tests')
@click.option('--keep-structure/--no-keep-structure', default=True, help='Keep source directory structure')
@click.option('--overwrite/--no-overwrite', default=False, help='Overwrite existing files')
def export(project_dir, output_dir, keep_structure, overwrite):
    """Export generated test files to a target directory, preserving structure"""
    
    console.print(Panel.fit(
        f"[bold blue]Exporting tests to:[/bold blue] {output_dir}",
        border_style="blue"
    ))
    
    scanner = ProjectScanner(project_dir)
    results = scanner.scan_directory()
    
    if not results:
        console.print("[yellow]No source files found[/yellow]")
        return
    
    exported_count = 0
    skipped_count = 0
    
    for result in results:
        test_file = scanner.get_test_file_path(result.file_path)
        
        if not os.path.exists(test_file):
            skipped_count += 1
            continue
        
        if output_dir:
            target_path = scanner.get_test_file_path(
                result.file_path, output_dir, keep_structure
            )
        else:
            target_path = test_file
        
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        if os.path.exists(target_path) and not overwrite:
            console.print(f"[yellow]Skipping (exists):[/yellow] {os.path.relpath(target_path)}")
            skipped_count += 1
            continue
        
        shutil.copy2(test_file, target_path)
        console.print(f"[green]✓[/green] {os.path.relpath(target_path)}")
        exported_count += 1
    
    console.print(f"\n[bold green]Export complete![/bold green]")
    console.print(f"  Exported: [cyan]{exported_count}[/cyan] files")
    if skipped_count > 0:
        console.print(f"  Skipped: [yellow]{skipped_count}[/yellow] files")


@main.command()
@click.argument('project_dir', type=click.Path(exists=True), default='.')
def scan(project_dir):
    """Scan project and list all functions and classes"""
    
    results = scan_project(project_dir)
    
    if not results:
        console.print("[yellow]No source files found[/yellow]")
        return
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("File")
    table.add_column("Language")
    table.add_column("Functions")
    table.add_column("Classes")
    
    for result in results:
        table.add_row(
            os.path.relpath(result.file_path, project_dir),
            result.language,
            ", ".join(result.functions)[:50] + ("..." if len(result.functions) > 2 else ""),
            ", ".join(result.classes)[:50] + ("..." if len(result.classes) > 2 else "")
        )
    
    console.print(table)


def _interactive_select_function():
    """Interactive function selection"""
    
    version_manager = get_version_manager()
    functions = version_manager.list_functions()
    
    if not functions:
        console.print("[yellow]No test history found[/yellow]")
        console.print(f"[cyan]Tip: Run 'aitestgen generate' first[/cyan]")
        return None
    
    console.print("\n[bold]Available functions:[/bold]")
    
    for i, func in enumerate(functions, 1):
        edited_mark = " [cyan]✓[/cyan]" if func['edited_count'] > 0 else ""
        console.print(f"  {i}. {func['function_name']} "
                      f"({os.path.relpath(func['file_path'])}){edited_mark}")
    
    while True:
        try:
            choice = click.prompt("\nSelect a function number (or 'q' to quit)", 
                                 type=str)
            if choice.lower() == 'q':
                return None
            
            idx = int(choice) - 1
            if 0 <= idx < len(functions):
                selected = functions[idx]
                return (selected['file_path'], selected['function_name'])
            else:
                console.print(f"[yellow]Please enter a number between 1 and {len(functions)}[/yellow]")
        except ValueError:
            console.print("[yellow]Please enter a valid number[/yellow]")


if __name__ == '__main__':
    main()
