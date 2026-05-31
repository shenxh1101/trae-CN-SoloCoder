import os
import re
import json
import subprocess
import sys
import tempfile
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.syntax import Syntax
from rich.text import Text
from .parser import ModuleInfo, FunctionInfo, ClassInfo


@dataclass
class LineCoverage:
    line_number: int
    line_content: str
    covered: bool
    execution_count: int = 0
    is_branch: bool = False
    branch_covered: Optional[bool] = None


@dataclass
class BranchCoverage:
    line_number: int
    condition: str
    true_covered: bool = False
    false_covered: bool = False
    
    @property
    def fully_covered(self) -> bool:
        return self.true_covered and self.false_covered
    
    @property
    def partially_covered(self) -> bool:
        return self.true_covered != self.false_covered


@dataclass
class FunctionCoverage:
    function_name: str
    class_name: str = None
    start_line: int = 0
    end_line: int = 0
    lines: List[LineCoverage] = field(default_factory=list)
    branches: List[BranchCoverage] = field(default_factory=list)
    missing_lines: List[int] = field(default_factory=list)
    missing_branches: List[int] = field(default_factory=list)
    
    @property
    def total_lines(self) -> int:
        return len(self.lines)
    
    @property
    def covered_lines(self) -> int:
        return sum(1 for l in self.lines if l.covered)
    
    @property
    def line_coverage(self) -> float:
        if self.total_lines == 0:
            return 100.0
        return (self.covered_lines / self.total_lines) * 100
    
    @property
    def total_branches(self) -> int:
        return len(self.branches) * 2  # 每个分支有true/false两个路径
    
    @property
    def covered_branches(self) -> int:
        count = 0
        for b in self.branches:
            if b.true_covered:
                count += 1
            if b.false_covered:
                count += 1
        return count
    
    @property
    def branch_coverage(self) -> float:
        if self.total_branches == 0:
            return 100.0
        return (self.covered_branches / self.total_branches) * 100


@dataclass
class CoverageReport:
    file_path: str
    language: str
    functions: List[FunctionCoverage] = field(default_factory=list)
    total_lines: int = 0
    covered_lines: int = 0
    total_branches: int = 0
    covered_branches: int = 0
    
    @property
    def line_coverage(self) -> float:
        if self.total_lines == 0:
            return 100.0
        return (self.covered_lines / self.total_lines) * 100
    
    @property
    def branch_coverage(self) -> float:
        if self.total_branches == 0:
            return 100.0
        return (self.covered_branches / self.total_branches) * 100


class CoverageAnalyzer:
    def __init__(self):
        self.console = Console()

    def run_pytest_coverage(self, source_file: str, test_file: str) -> Optional[Dict]:
        """Run pytest with coverage and return JSON report"""
        
        source_dir = os.path.dirname(os.path.abspath(source_file))
        source_module = os.path.splitext(os.path.basename(source_file))[0]
        
        with tempfile.TemporaryDirectory() as tmpdir:
            cov_file = os.path.join(tmpdir, 'coverage.json')
            
            cmd = [
                sys.executable, '-m', 'pytest',
                os.path.abspath(test_file),
                f'--cov={source_dir}',
                f'--cov-report=json:{cov_file}',
                '--cov-report=term-missing',
                '-v', '--tb=short',
                '-q'
            ]
            
            self.console.print(f"\n[cyan]Running: {' '.join(cmd)}[/cyan]\n")
            
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    cwd=os.getcwd(),
                    timeout=60
                )
                
                if result.stdout:
                    self.console.print("[dim]" + result.stdout + "[/dim]")
                
                if result.stderr and 'ERROR' in result.stderr.upper():
                    self.console.print("[yellow]" + result.stderr + "[/yellow]")
                
                if os.path.exists(cov_file):
                    with open(cov_file, 'r') as f:
                        return json.load(f)
                else:
                    self.console.print("[yellow]Coverage JSON file not generated[/yellow]")
                    return None
                    
            except subprocess.TimeoutExpired:
                self.console.print("[red]Coverage analysis timed out[/red]")
                return None
            except Exception as e:
                self.console.print(f"[red]Error running coverage: {e}[/red]")
                return None

    def parse_coverage_json(self, cov_data: Dict, source_file: str) -> Optional[CoverageReport]:
        """Parse pytest-cov JSON report"""
        
        abs_source = os.path.abspath(source_file)
        report = CoverageReport(
            file_path=source_file,
            language='python'
        )
        
        file_data = None
        for file_path, data in cov_data.get('files', {}).items():
            if os.path.abspath(file_path) == abs_source:
                file_data = data
                break
        
        if not file_data:
            # 尝试查找相对路径
            rel_path = os.path.relpath(source_file)
            for file_path, data in cov_data.get('files', {}).items():
                if file_path.endswith(rel_path) or rel_path.endswith(file_path):
                    file_data = data
                    break
        
        if not file_data:
            self.console.print(f"[yellow]No coverage data found for {source_file}[/yellow]")
            self.console.print(f"[dim]Available files: {list(cov_data.get('files', {}).keys())}[/dim]")
            return None
        
        with open(source_file, 'r') as f:
            source_lines = f.readlines()
        
        summary = file_data.get('summary', {})
        report.total_lines = summary.get('num_lines', 0)
        report.covered_lines = summary.get('covered_lines', 0)
        report.total_branches = summary.get('num_branches', 0) * 2 if summary.get('num_branches') else 0
        report.covered_branches = summary.get('covered_branches', 0)
        
        executed_lines = file_data.get('executed_lines', [])
        missing_lines = file_data.get('missing_lines', [])
        executed_branches = file_data.get('executed_branches', [])
        missing_branches = file_data.get('missing_branches', [])
        
        line_exclusions = file_data.get('excluded_lines', [])
        
        all_lines = set(executed_lines + missing_lines + line_exclusions)
        
        line_coverage_map = {}
        for line_num in executed_lines:
            line_coverage_map[line_num] = True
        for line_num in missing_lines:
            line_coverage_map[line_num] = False
        
        branch_coverage_map = {}
        for branch in executed_branches:
            line_num, branch_idx = branch[0], branch[1]
            key = (line_num, branch_idx)
            branch_coverage_map[key] = True
        for branch in missing_branches:
            line_num, branch_idx = branch[0], branch[1]
            key = (line_num, branch_idx)
            if key not in branch_coverage_map:
                branch_coverage_map[key] = False
        
        try:
            module_info = __import__('aitestgen.parser').parser.parse_file(source_file)
        except:
            module_info = None
        
        functions = []
        if module_info:
            all_funcs = []
            for func in module_info.functions:
                all_funcs.append((func, None))
            for cls in module_info.classes:
                for method in cls.methods:
                    all_funcs.append((method, cls.name))
            
            for func_info, class_name in all_funcs:
                func_cov = self._create_function_coverage(
                    func_info, class_name, source_lines,
                    line_coverage_map, branch_coverage_map
                )
                functions.append(func_cov)
        
        report.functions = functions
        return report

    def _create_function_coverage(self, func_info: FunctionInfo, class_name: Optional[str],
                                 source_lines: List[str], line_coverage_map: Dict[int, bool],
                                 branch_coverage_map: Dict[Tuple[int, int], bool]) -> FunctionCoverage:
        """Create function coverage object"""
        
        func_cov = FunctionCoverage(
            function_name=func_info.name,
            class_name=class_name,
            start_line=func_info.start_line,
            end_line=func_info.end_line
        )
        
        body = func_info.body
        lines = body.split('\n')
        
        branch_patterns = [
            (r'^\s*(if)\s+(.+?):', 'if'),
            (r'^\s*(elif)\s+(.+?):', 'elif'),
            (r'^\s*(else):', 'else'),
            (r'^\s*(for)\s+', 'for'),
            (r'^\s*(while)\s+', 'while'),
            (r'^\s*(try):', 'try'),
            (r'^\s*(except)', 'except'),
            (r'^\s*(with)\s+', 'with'),
        ]
        
        for i, line in enumerate(lines, start=func_info.start_line):
            if i - 1 < len(source_lines):
                line_content = source_lines[i - 1].rstrip('\n')
            else:
                line_content = line
            
            covered = line_coverage_map.get(i, True)
            
            is_branch = False
            for pattern, branch_type in branch_patterns:
                if re.search(pattern, line):
                    is_branch = True
                    
                    true_covered = branch_coverage_map.get((i, 0), False)
                    false_covered = branch_coverage_map.get((i, 1), False)
                    
                    func_cov.branches.append(BranchCoverage(
                        line_number=i,
                        condition=line.strip(),
                        true_covered=true_covered,
                        false_covered=false_covered
                    ))
                    
                    if not true_covered or not false_covered:
                        func_cov.missing_branches.append(i)
                    
                    break
            
            func_cov.lines.append(LineCoverage(
                line_number=i,
                line_content=line_content,
                covered=covered,
                is_branch=is_branch,
                branch_covered=all([b.fully_covered for b in func_cov.branches if b.line_number == i]) if is_branch else None
            ))
            
            if not covered:
                func_cov.missing_lines.append(i)
        
        return func_cov

    def generate_report(self, report: CoverageReport, output_format: str = 'console') -> str:
        """Generate coverage report in various formats"""
        
        if output_format == 'console':
            return self._generate_console_report(report)
        elif output_format == 'markdown':
            return self._generate_markdown_report(report)
        elif output_format == 'json':
            return self._generate_json_report(report)
        else:
            return self._generate_text_report(report)

    def _generate_console_report(self, report: CoverageReport) -> str:
        """Generate rich console report"""
        
        self.console.print(Panel.fit(
            f"[bold blue]Coverage Report:[/bold blue] {os.path.basename(report.file_path)}",
            border_style="blue"
        ))
        
        line_color = "green" if report.line_coverage >= 80 else "yellow" if report.line_coverage >= 50 else "red"
        branch_color = "green" if report.branch_coverage >= 80 else "yellow" if report.branch_coverage >= 50 else "red"
        
        self.console.print(f"\n[bold]Overall Line Coverage:[/bold] [{line_color}]{report.line_coverage:.1f}%[/{line_color}]")
        self.console.print(f"[bold]Overall Branch Coverage:[/bold] [{branch_color}]{report.branch_coverage:.1f}%[/{branch_color}]")
        self.console.print(f"[bold]Lines:[/bold] {report.covered_lines}/{report.total_lines}")
        if report.total_branches > 0:
            self.console.print(f"[bold]Branches:[/bold] {report.covered_branches}/{report.total_branches}")
        self.console.print()
        
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Function", style="cyan")
        table.add_column("Class", style="blue")
        table.add_column("Line Cov", justify="right")
        table.add_column("Branch Cov", justify="right")
        table.add_column("Missing Lines", style="red")
        table.add_column("Missing Branches", style="red")
        
        for func in report.functions:
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
                func.class_name or "-",
                f"[{line_color}]{func.line_coverage:.1f}%[/{line_color}]",
                f"[{branch_color}]{func.branch_coverage:.1f}%[/{branch_color}]",
                missing_lines_str or "-",
                missing_branches_str or "-"
            )
        
        self.console.print(table)
        
        for func in report.functions:
            if func.missing_lines or func.missing_branches:
                self.console.print(f"\n[bold]Uncovered code for {func.function_name}:[/bold]")
                
                code_lines = []
                for line in func.lines:
                    prefix = "[green]✓[/green] " if line.covered else "[red]✗[/red] "
                    if line.is_branch:
                        branch = next((b for b in func.branches if b.line_number == line.line_number), None)
                        if branch and not branch.fully_covered:
                            if branch.true_covered and not branch.false_covered:
                                prefix = "[yellow]½[/yellow] "
                            elif not branch.true_covered and branch.false_covered:
                                prefix = "[yellow]½[/yellow] "
                    
                    line_text = Text()
                    line_text.append(prefix)
                    line_text.append(f"{line.line_number:4d}: ", style="dim")
                    line_text.append(line.line_content)
                    code_lines.append(line_text)
                
                for line_text in code_lines[:30]:
                    self.console.print(line_text)
                if len(code_lines) > 30:
                    self.console.print(f"[dim]... and {len(code_lines)-30} more lines[/dim]")
        
        return ""

    def _generate_markdown_report(self, report: CoverageReport) -> str:
        """Generate markdown report"""
        
        lines = []
        lines.append(f"# Coverage Report: {os.path.basename(report.file_path)}")
        lines.append("")
        lines.append(f"**Line Coverage:** {report.line_coverage:.1f}% ({report.covered_lines}/{report.total_lines})")
        lines.append(f"**Branch Coverage:** {report.branch_coverage:.1f}%")
        lines.append("")
        lines.append("## Function Details")
        lines.append("")
        lines.append("| Function | Class | Line Cov | Branch Cov | Missing Lines | Missing Branches |")
        lines.append("|----------|-------|----------|------------|---------------|------------------|")
        
        for func in report.functions:
            missing_lines_str = ", ".join(map(str, func.missing_lines[:5]))
            if len(func.missing_lines) > 5:
                missing_lines_str += f" (+{len(func.missing_lines)-5})"
            
            missing_branches_str = ", ".join(map(str, func.missing_branches[:5]))
            if len(func.missing_branches) > 5:
                missing_branches_str += f" (+{len(func.missing_branches)-5})"
            
            lines.append(
                f"| {func.function_name} | {func.class_name or '-'} | "
                f"{func.line_coverage:.1f}% | {func.branch_coverage:.1f}% | "
                f"{missing_lines_str or '-'} | {missing_branches_str or '-'} |"
            )
        
        for func in report.functions:
            if func.missing_lines or func.missing_branches:
                lines.append("")
                lines.append(f"## Uncovered: {func.function_name}")
                lines.append("")
                lines.append("```python")
                for line in func.lines:
                    marker = "✓" if line.covered else "✗"
                    lines.append(f"{marker} {line.line_number:4d}: {line.line_content}")
                lines.append("```")
        
        return "\n".join(lines)

    def _generate_json_report(self, report: CoverageReport) -> str:
        """Generate JSON report"""
        
        data = {
            "file_path": report.file_path,
            "line_coverage": round(report.line_coverage, 2),
            "branch_coverage": round(report.branch_coverage, 2),
            "total_lines": report.total_lines,
            "covered_lines": report.covered_lines,
            "total_branches": report.total_branches,
            "covered_branches": report.covered_branches,
            "functions": []
        }
        
        for func in report.functions:
            func_data = {
                "name": func.function_name,
                "class": func.class_name,
                "line_coverage": round(func.line_coverage, 2),
                "branch_coverage": round(func.branch_coverage, 2),
                "missing_lines": func.missing_lines,
                "missing_branches": func.missing_branches,
                "lines": [
                    {
                        "line": l.line_number,
                        "content": l.line_content,
                        "covered": l.covered,
                        "is_branch": l.is_branch
                    }
                    for l in func.lines
                ]
            }
            data["functions"].append(func_data)
        
        return json.dumps(data, indent=2, ensure_ascii=False)

    def _generate_text_report(self, report: CoverageReport) -> str:
        """Generate plain text report"""
        
        lines = []
        lines.append(f"Coverage Report: {os.path.basename(report.file_path)}")
        lines.append("=" * 60)
        lines.append(f"Line Coverage: {report.line_coverage:.1f}% ({report.covered_lines}/{report.total_lines})")
        lines.append(f"Branch Coverage: {report.branch_coverage:.1f}%")
        lines.append("")
        lines.append("Function Details:")
        lines.append("-" * 60)
        
        for func in report.functions:
            lines.append(f"\nFunction: {func.function_name}")
            if func.class_name:
                lines.append(f"  Class: {func.class_name}")
            lines.append(f"  Line Coverage: {func.line_coverage:.1f}%")
            lines.append(f"  Branch Coverage: {func.branch_coverage:.1f}%")
            if func.missing_lines:
                lines.append(f"  Missing Lines: {func.missing_lines}")
            if func.missing_branches:
                lines.append(f"  Missing Branches: {func.missing_branches}")
        
        return "\n".join(lines)


def analyze_coverage(source_file: str, test_file: str, 
                    output_format: str = 'console') -> Optional[str]:
    """Run coverage analysis and generate report"""
    
    analyzer = CoverageAnalyzer()
    
    console = Console()
    console.print(Panel.fit(
        f"[bold blue]Running Coverage Analysis[/bold blue]",
        border_style="blue"
    ))
    
    cov_data = analyzer.run_pytest_coverage(source_file, test_file)
    
    if not cov_data:
        console.print("[yellow]Failed to get coverage data[/yellow]")
        return None
    
    report = analyzer.parse_coverage_json(cov_data, source_file)
    
    if not report:
        return None
    
    return analyzer.generate_report(report, output_format)
