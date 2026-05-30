#!/usr/bin/env python3
"""
AI Code Refactoring Suggestion Generator - CLI Tool

A command-line tool that analyzes code complexity, duplication, and coupling,
and provides AI-powered refactoring suggestions with before/after examples.
"""

import os
import sys
import json
import ast
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import difflib
import hashlib

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.syntax import Syntax
from rich.markdown import Markdown

try:
    from radon.complexity import cc_visit, cc_rank
    from radon.metrics import h_visit
    RADON_AVAILABLE = True
except ImportError:
    RADON_AVAILABLE = False

import subprocess

console = Console()


class RefactorType(Enum):
    EXTRACT_FUNCTION = "extract_function"
    SPLIT_LONG_FUNCTION = "split_long_function"
    MERGE_SIMILAR_IF = "merge_similar_if"
    RENAME_VARIABLE = "rename_variable"
    MOVE_FUNCTION = "move_function"
    REMOVE_DUPLICATION = "remove_duplication"
    SIMPLIFY_CONDITIONALS = "simplify_conditionals"
    REDUCE_COUPLING = "reduce_coupling"
    IMPROVE_NAMING = "improve_naming"
    EXTRACT_CLASS = "extract_class"
    REPLACE_MAGIC_NUMBER = "replace_magic_number"
    OPTIMIZE_IMPORTS = "optimize_imports"


class FeedbackStatus(Enum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PENDING = "pending"


@dataclass
class CodeMetrics:
    cyclomatic_complexity: int = 0
    lines_of_code: int = 0
    function_count: int = 0
    class_count: int = 0
    duplication_score: float = 0.0
    coupling_score: float = 0.0
    maintainability_index: float = 0.0


@dataclass
class RefactorSuggestion:
    id: str
    file_path: str
    line_number: int
    refactor_type: RefactorType
    title: str
    description: str
    current_code: str
    suggested_code: str
    priority: str  # high, medium, low
    complexity_before: int = 0
    complexity_after: int = 0
    confidence: float = 0.0
    feedback: FeedbackStatus = FeedbackStatus.PENDING
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class FileAnalysisResult:
    file_path: str
    metrics: CodeMetrics
    suggestions: List[RefactorSuggestion] = field(default_factory=list)
    total_priority_score: float = 0.0


class FeedbackManager:
    def __init__(self, feedback_dir: Path = None):
        if feedback_dir is None:
            feedback_dir = Path.home() / ".ai-refactor" / "feedback"
        self.feedback_dir = feedback_dir
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
        self.feedback_file = self.feedback_dir / "feedback.json"
        self._load_feedback()

    def _load_feedback(self):
        if self.feedback_file.exists():
            try:
                with open(self.feedback_file, 'r') as f:
                    self.feedback_data = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.feedback_data = {}
        else:
            self.feedback_data = {}

    def _save_feedback(self):
        with open(self.feedback_file, 'w') as f:
            json.dump(self.feedback_data, f, indent=2)

    def record_feedback(self, suggestion_id: str, status: FeedbackStatus):
        self.feedback_data[suggestion_id] = {
            'status': status.value,
            'timestamp': datetime.now().isoformat()
        }
        self._save_feedback()

    def get_feedback(self, suggestion_id: str) -> Optional[FeedbackStatus]:
        if suggestion_id in self.feedback_data:
            return FeedbackStatus(self.feedback_data[suggestion_id]['status'])
        return None

    def get_accepted_patterns(self) -> Dict[str, Any]:
        accepted = {k: v for k, v in self.feedback_data.items() 
                   if v['status'] == 'accepted'}
        return accepted

    def get_rejected_patterns(self) -> Dict[str, Any]:
        rejected = {k: v for k, v in self.feedback_data.items() 
                   if v['status'] == 'rejected'}
        return rejected


class CodeAnalyzer:
    def __init__(self, complexity_threshold: int = 10, 
                 line_threshold: int = 50,
                 duplication_threshold: float = 0.3):
        self.complexity_threshold = complexity_threshold
        self.line_threshold = line_threshold
        self.duplication_threshold = duplication_threshold
        self.feedback_manager = FeedbackManager()

    def analyze_file(self, file_path: str) -> FileAnalysisResult:
        """Analyze a single file and return metrics and suggestions."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        metrics = self._calculate_metrics(content, path)
        suggestions = self._generate_suggestions(content, path, metrics)

        result = FileAnalysisResult(
            file_path=str(path),
            metrics=metrics,
            suggestions=suggestions,
            total_priority_score=self._calculate_priority_score(suggestions)
        )

        return result

    def _calculate_metrics(self, content: str, path: Path) -> CodeMetrics:
        """Calculate various code metrics."""
        metrics = CodeMetrics()
        
        lines = content.split('\n')
        metrics.lines_of_code = len([l for l in lines if l.strip()])
        
        try:
            tree = ast.parse(content)
            
            metrics.function_count = sum(1 for node in ast.walk(tree) 
                                       if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)))
            metrics.class_count = sum(1 for node in ast.walk(tree) 
                                    if isinstance(node, ast.ClassDef))
            
            complexity_results = cc_visit(content) if RADON_AVAILABLE else []
            if complexity_results:
                total_complexity = sum(result.complexity for result in complexity_results)
                metrics.cyclomatic_complexity = total_complexity
            elif not RADON_AVAILABLE:
                metrics.cyclomatic_complexity = self._calculate_complexity_fallback(tree)
                
            if RADON_AVAILABLE:
                try:
                    h_result = h_visit(content)
                    metrics.maintainability_index = h_result.total.mi
                except:
                    pass
            else:
                metrics.maintainability_index = self._calculate_mi_fallback(metrics)
                
        except SyntaxError:
            pass
        
        metrics.duplication_score = self._calculate_duplication(content)
        metrics.coupling_score = self._calculate_coupling(content, tree if 'tree' in locals() else None)
        
        return metrics

    def _calculate_duplication(self, content: str) -> float:
        """Calculate code duplication score using simple text similarity."""
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        if len(lines) < 2:
            return 0.0
        
        duplicated_lines = 0
        checked = set()
        
        for i, line1 in enumerate(lines):
            if i in checked:
                continue
            for j, line2 in enumerate(lines[i+1:], i+1):
                if j in checked:
                    continue
                similarity = difflib.SequenceMatcher(None, line1, line2).ratio()
                if similarity > 0.8:
                    duplicated_lines += 1
                    checked.add(j)
        
        return duplicated_lines / len(lines) if lines else 0.0

    def _calculate_coupling(self, content: str, tree=None) -> float:
        """Calculate coupling score based on imports and function calls."""
        if tree is None:
            try:
                tree = ast.parse(content)
            except:
                return 0.0
        
        imports = sum(1 for node in ast.walk(tree) 
                     if isinstance(node, (ast.Import, ast.ImportFrom)))
        calls = sum(1 for node in ast.walk(tree) 
                   if isinstance(node, ast.Call))
        
        total_elements = max(imports + calls, 1)
        coupling = min(calls / total_elements, 1.0)
        return coupling

    def _generate_suggestions(self, content: str, path: Path, 
                            metrics: CodeMetrics) -> List[RefactorSuggestion]:
        """Generate refactoring suggestions based on analysis."""
        suggestions = []
        suggestion_id = 0
        
        try:
            tree = ast.parse(content)
            lines = content.split('\n')
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    func_suggestions = self._analyze_function(node, content, lines, path, suggestion_id)
                    suggestions.extend(func_suggestions)
                    suggestion_id += len(func_suggestions)
                    
                elif isinstance(node, ast.ClassDef):
                    class_suggestions = self._analyze_class(node, content, lines, path, suggestion_id)
                    suggestions.extend(class_suggestions)
                    suggestion_id += len(class_suggestions)
            
            general_suggestions = self._analyze_general_patterns(content, lines, path, suggestion_id)
            suggestions.extend(general_suggestions)
            
        except SyntaxError:
            pass
        
        existing_feedback = self.feedback_manager.get_accepted_patterns()
        for suggestion in suggestions:
            if suggestion.id in existing_feedback:
                suggestion.feedback = FeedbackStatus.ACCEPTED
            elif suggestion.id in self.feedback_manager.get_rejected_patterns():
                suggestion.feedback = FeedbackStatus.REJECTED
        
        return suggestions

    def _analyze_function(self, node, content: str, lines: list, 
                         path: Path, base_id: int) -> List[RefactorSuggestion]:
        """Analyze a single function and generate suggestions."""
        suggestions = []
        
        func_lines = lines[node.lineno-1:node.end_lineno]
        func_code = '\n'.join(func_lines)
        func_length = len(func_lines)
        
        try:
            if RADON_AVAILABLE:
                complexity = cc_visit(func_code)[0].complexity if cc_visit(func_code) else 1
            else:
                complexity = self._calculate_function_complexity(node)
        except:
            complexity = 1
        
        if func_length > self.line_threshold:
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id:04d}",
                file_path=str(path),
                line_number=node.lineno,
                refactor_type=RefactorType.SPLIT_LONG_FUNCTION,
                title=f"拆分过长函数: {node.name}()",
                description=f"函数 '{node.name}' 有 {func_length} 行代码，超过阈值 {self.line_threshold} 行。建议将其拆分为更小的、职责单一的函数。",
                current_code=func_code[:200] + ("..." if len(func_code) > 200 else ""),
                suggested_code=self._generate_split_suggestion(node.name, func_code),
                priority="high" if func_length > 100 else "medium",
                complexity_before=complexity,
                complexity_after=max(1, complexity // 2),
                confidence=min(0.9, 0.5 + (func_length - self.line_threshold) / 100)
            )
            suggestions.append(suggestion)
        
        if complexity > self.complexity_threshold:
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id+1:04d}",
                file_path=str(path),
                line_number=node.lineno,
                refactor_type=RefactorType.SIMPLIFY_CONDITIONALS,
                title=f"降低圈复杂度: {node.name}()",
                description=f"函数 '{node.name}' 的圈复杂度为 {complexity}，超过阈值 {self.complexity_threshold}。建议简化条件逻辑或提取方法。",
                current_code=func_code[:200] + ("..." if len(func_code) > 200 else ""),
                suggested_code=self._generate_complexity_reduction_suggestion(func_code),
                priority="high" if complexity > 20 else "medium",
                complexity_before=complexity,
                complexity_after=max(1, complexity - 5),
                confidence=min(0.95, 0.6 + (complexity - self.complexity_threshold) / 20)
            )
            suggestions.append(suggestion)
        
        if self._has_duplicate_patterns(func_code):
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id+2:04d}",
                file_path=str(path),
                line_number=node.lineno,
                refactor_type=RefactorType.EXTRACT_FUNCTION,
                title=f"提取重复代码: {node.name}()",
                description=f"检测到函数 '{node.name}' 中存在重复的代码模式。建议将重复部分提取为独立函数。",
                current_code=func_code[:200] + ("..." if len(func_code) > 200 else ""),
                suggested_code=self._generate_extraction_suggestion(func_code),
                priority="medium",
                complexity_before=complexity,
                complexity_after=max(1, complexity - 2),
                confidence=0.75
            )
            suggestions.append(suggestion)
        
        magic_numbers = self._find_magic_numbers(func_code)
        if magic_numbers:
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id+3:04d}",
                file_path=str(path),
                line_number=node.lineno,
                refactor_type=RefactorType.REPLACE_MAGIC_NUMBER,
                title=f"替换魔法数字: {node.name}()",
                description=f"检测到 {len(magic_numbers)} 个魔法数字。建议使用有意义的常量名替换。",
                current_code=", ".join(map(str, magic_numbers[:5])),
                suggested_code="# 定义常量\nMAX_RETRIES = 3\nTIMEOUT = 30\n# 使用常量替代魔法数字",
                priority="low",
                complexity_before=complexity,
                complexity_after=complexity,
                confidence=0.8
            )
            suggestions.append(suggestion)
        
        return suggestions

    def _analyze_class(self, node, content: str, lines: list, 
                      path: Path, base_id: int) -> List[RefactorSuggestion]:
        """Analyze a class and generate suggestions."""
        suggestions = []
        
        class_lines = lines[node.lineno-1:node.end_lineno]
        class_code = '\n'.join(class_lines)
        class_length = len(class_lines)
        
        methods = [n for n in ast.walk(node) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        
        if class_length > 300:
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id:04d}",
                file_path=str(path),
                line_number=node.lineno,
                refactor_type=RefactorType.EXTRACT_CLASS,
                title=f"提取类: {node.name}",
                description=f"类 '{node.name}' 有 {class_length} 行代码和 {len(methods)} 个方法，可能承担了过多职责。建议拆分为多个类。",
                current_code=class_code[:200] + ("..." if len(class_code) > 200 else ""),
                suggested_code=self._generate_class_extraction_suggestion(node.name, methods),
                priority="high",
                confidence=0.7
            )
            suggestions.append(suggestion)
        
        return suggestions

    def _analyze_general_patterns(self, content: str, lines: list, 
                                 path: Path, base_id: int) -> List[RefactorSuggestion]:
        """Analyze general code patterns and generate suggestions."""
        suggestions = []
        
        similar_if_blocks = self._find_similar_if_blocks(lines)
        if similar_if_blocks:
            for i, block_info in enumerate(similar_if_blocks[:3]):
                suggestion = RefactorSuggestion(
                    id=f"sugg_{base_id+i:04d}",
                    file_path=str(path),
                    line_number=block_info['line'],
                    refactor_type=RefactorType.MERGE_SIMILAR_IF,
                    title="合并相似的if分支",
                    description=f"在第 {block_info['line']} 行附近发现相似的if分支模式。可以使用字典或多态来简化。",
                    current_code=block_info['code'],
                    suggested_code=self._generate_merge_if_suggestion(block_info['code']),
                    priority="medium",
                    confidence=0.7
                )
                suggestions.append(suggestion)
        
        import_issues = self._analyze_imports(content)
        if import_issues:
            suggestion = RefactorSuggestion(
                id=f"sugg_{base_id+len(similar_if_blocks):04d}",
                file_path=str(path),
                line_number=1,
                refactor_type=RefactorType.OPTIMIZE_IMPORTS,
                title="优化导入语句",
                description=import_issues['description'],
                current_code=import_issues['current'],
                suggested_code=import_issues['suggested'],
                priority="low",
                confidence=0.85
            )
            suggestions.append(suggestion)
        
        naming_issues = self._check_naming_conventions(content, lines)
        if naming_issues:
            for i, issue in enumerate(naming_issues[:2]):
                suggestion = RefactorSuggestion(
                    id=f"sugg_{base_id+len(similar_if_blocks)+1+i:04d}",
                    file_path=str(path),
                    line_number=issue['line'],
                    refactor_type=RefactorType.IMPROVE_NAMING,
                    title=f"改进命名: {issue['name']}",
                    description=issue['description'],
                    current_code=issue['current'],
                    suggested_code=issue['suggested'],
                    priority="low",
                    confidence=0.6
                )
                suggestions.append(suggestion)
        
        return suggestions

    def _has_duplicate_patterns(self, code: str) -> bool:
        """Check if code has duplicate patterns."""
        lines = [l.strip() for l in code.split('\n') if l.strip()]
        if len(lines) < 4:
            return False
        
        for i in range(len(lines) - 3):
            pattern = ' '.join(lines[i:i+3])
            remaining = ' '.join(lines[i+3:])
            if pattern in remaining and len(pattern) > 20:
                return True
        return False

    def _find_magic_numbers(self, code: str) -> List[int]:
        """Find magic numbers in code."""
        numbers = re.findall(r'(?<![\w.])(\d{2,})(?![\w.])', code)
        exclude = {'0', '1', '2', '10', '100', '1000'}
        return [int(n) for n in numbers if n not in exclude]

    def _find_similar_if_blocks(self, lines: list) -> List[Dict]:
        """Find similar if-else blocks."""
        similar_blocks = []
        if_patterns = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('if ') or stripped.startswith('elif '):
                condition = re.sub(r'if |elif ', '', stripped).rstrip(':')
                if_patterns.append({'line': i+1, 'condition': condition, 'code': stripped})
        
        for i, pattern1 in enumerate(if_patterns):
            for pattern2 in if_patterns[i+1:]:
                similarity = difflib.SequenceMatcher(None, 
                    pattern1['condition'], pattern2['condition']).ratio()
                if 0.5 < similarity < 1.0 and len(pattern1['condition']) > 10:
                    similar_blocks.append({
                        'line': pattern1['line'],
                        'code': f"{pattern1['code']}\n... vs ...\n{pattern2['code']}"
                    })
                    break
        
        return similar_blocks[:5]

    def _analyze_imports(self, content: str) -> Optional[Dict]:
        """Analyze import statements."""
        import_lines = [line for line in content.split('\n') 
                       if line.strip().startswith(('import ', 'from '))]
        
        if not import_lines:
            return None
        
        issues = []
        if len(import_lines) > 15:
            issues.append("导入语句过多，考虑使用模块重组")
        
        stdlib_imports = []
        third_party_imports = []
        local_imports = []
        
        for imp in import_lines:
            stripped = imp.strip()
            if any(stripped.startswith(f'import {lib}') or stripped.startswith(f'from {lib}') 
                  for lib in ['os', 'sys', 're', 'json', 'datetime']):
                stdlib_imports.append(stripped)
            elif any(lib in stripped for lib in ['numpy', 'pandas', 'requests', 'flask', 'django']):
                third_party_imports.append(stripped)
            else:
                local_imports.append(stripped)
        
        all_imports = stdlib_imports + third_party_imports + local_imports
        if all_imports != import_lines:
            return {
                'description': '建议按标准库、第三方库、本地模块的顺序组织导入',
                'current': '\n'.join(import_lines[:8]),
                'suggested': '\n'.join(all_imports[:8])
            }
        
        return None

    def _check_naming_conventions(self, content: str, lines: list) -> List[Dict]:
        """Check Python naming conventions."""
        issues = []
        
        for i, line in enumerate(lines):
            if 'def ' in line:
                match = re.search(r'def (\w+)\(', line)
                if match:
                    name = match.group(1)
                    if '_' in name and name.count('_') > 3:
                        issues.append({
                            'line': i+1,
                            'name': name,
                            'description': f"函数名 '{name}' 包含多个下划线，可读性较差",
                            'current': line.strip(),
                            'suggested': f"# 建议: 使用更具描述性的名称\ndef process_user_data():"
                        })
            
            if '=' in line and not line.strip().startswith('#'):
                match = re.search(r'(\w{1,2})\s*=\s*', line)
                if match and match.group(1).isalpha():
                    var_name = match.group(1)
                    if var_name not in ['i', 'j', 'k', 'x', 'y', 'n']:
                        issues.append({
                            'line': i+1,
                            'name': var_name,
                            'description': f"变量名 '{var_name}' 过短，缺乏描述性",
                            'current': line.strip(),
                            'suggested': f"# 建议: 使用更有意义的变量名\ndata_count = ..."
                        })
        
        return issues[:5]

    def _generate_split_suggestion(self, func_name: str, func_code: str) -> str:
        """Generate code example for splitting a long function."""
        return f"""def {func_name}(self, *args, **kwargs):
    # 拆分后的主函数：协调子功能
    result = self._{func_name}_validate(*args)
    processed = self._{func_name}_process(result)
    return self._{func_name}_output(processed)

def _{func_name}_validate(self, *args):
    # 验证输入参数
    pass

def _{func_name}_process(self, data):
    # 处理核心逻辑
    pass

def _{func_name}_output(self, result):
    # 格式化输出结果
    pass"""

    def _generate_complexity_reduction_suggestion(self, func_code: str) -> str:
        """Generate code example for reducing complexity."""
        return """# 重构前（高复杂度）:
if condition1:
    if condition2:
        if condition3:
            do_something()
    else:
        handle_error()
else:
    another_case()

# 重构后（低复杂度）:
def handle_valid_case():
    if not all([condition1, condition2, condition3]):
        return
    do_something()

def main_logic():
    if condition1:
        handle_valid_case()
    else:
        another_case()"""

    def _generate_extraction_suggestion(self, func_code: str) -> str:
        """Generate code example for extracting duplicate code."""
        return """# 提取公共函数
def extract_common_logic(param1, param2):
    \"\"\"处理重复的逻辑\"\"\"
    common_result = param1 + param2
    return transform(common_result)

# 在原函数中使用
def original_function():
    result1 = extract_common_logic(data1, data2)
    # 特定逻辑...
    
def another_function():
    result2 = extract_common_logic(data3, data4)
    # 其他特定逻辑..."""

    def _generate_class_extraction_suggestion(self, class_name: str, methods: list) -> str:
        """Generate code example for class extraction."""
        method_names = [m.name for m in methods[:5]]
        return f"""# 将 {class_name} 拆分为：
class {class_name}Core:
    '''核心业务逻辑'''
    pass

class {class_name}Helper:
    '''辅助功能'''
    pass

class {class_name}Data:
    '''数据访问层'''
    pass"""

    def _generate_merge_if_suggestion(self, code: str) -> str:
        """Generate code example for merging similar if blocks."""
        return """# 使用字典映射替代多重if-elif
action_map = {
    'case1': handle_case1,
    'case2': handle_case2,
    'case3': handle_case3,
}

handler = action_map.get(value, default_handler)
result = handler(data)"""

    def _calculate_complexity_fallback(self, tree) -> int:
        """Calculate cyclomatic complexity without radon."""
        if not tree:
            return 1
        
        complexity = 1
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(node, ast.ExceptHandler):
                complexity += 1
            elif isinstance(node, (ast.With, ast.AsyncWith)):
                complexity += 1
            elif isinstance(node, ast.Assert):
                complexity += 1
            elif isinstance(node, ast.comprehension):
                complexity += 1
            elif isinstance(node, (ast.And, ast.Or)):
                complexity += 1
        
        return complexity

    def _calculate_function_complexity(self, node) -> int:
        """Calculate complexity for a single function without radon."""
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, (ast.And, ast.Or)):
                complexity += 1
        return complexity

    def _calculate_mi_fallback(self, metrics: CodeMetrics) -> float:
        """Calculate maintainability index fallback."""
        try:
            l = metrics.lines_of_code
            c = metrics.cyclomatic_complexity
            v = max(metrics.function_count + metrics.class_count, 1)
            
            if l == 0:
                return 100.0
            
            log_l = __import__('math').log(l)
            log_v = __import__('math').log(v)
            log_c = __import__('math').log(c)
            
            mi = (171 - 5.2 * log_l - 0.23 * log_v - 16.2 * log_c) * 100 / 171
            return max(0, min(100, mi))
        except:
            return 50.0

    def _calculate_priority_score(self, suggestions: List[RefactorSuggestion]) -> float:
        """Calculate overall priority score for a file."""
        if not suggestions:
            return 0.0
        
        weights = {'high': 3.0, 'medium': 2.0, 'low': 1.0}
        score = sum(weights[s.priority] * s.confidence for s in suggestions)
        return round(score, 2)


class GitIntegration:
    def __init__(self, repo_path: str = '.'):
        self.repo_path = repo_path
        self._is_git_repo = self._check_git_repo()
        if not self._is_git_repo:
            console.print("[yellow]⚠️  不是Git仓库，Git集成已禁用[/yellow]")

    def _check_git_repo(self) -> bool:
        """Check if directory is a git repository using git command."""
        try:
            import subprocess
            result = subprocess.run(
                ['git', 'rev-parse', '--is-inside-work-tree'],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0 and result.stdout.strip() == 'true'
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            return False

    def _run_git_command(self, args: List[str]) -> str:
        """Run a git command and return output."""
        try:
            import subprocess
            result = subprocess.run(
                ['git'] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.stdout if result.returncode == 0 else ''
        except Exception:
            return ''

    def get_uncommitted_files(self) -> List[str]:
        """Get list of files with uncommitted changes."""
        if not self._is_git_repo:
            return []
        
        files = set()
        
        status_output = self._run_git_command(['status', '--porcelain'])
        for line in status_output.split('\n'):
            if line.strip():
                status_char = line[:2]
                filename = line[3:].strip()
                if '->' in filename:
                    filename = filename.split('->')[-1].strip()
                files.add(filename)
        
        return list(files)

    def get_diff_for_file(self, file_path: str) -> str:
        """Get git diff for a specific file."""
        if not self._is_git_repo:
            return ""
        
        return self._run_git_command(['diff', file_path])

    def get_changed_lines(self, file_path: str) -> Tuple[List[int], List[int]]:
        """Get added and modified line numbers from git diff."""
        added_lines = []
        modified_lines = []
        
        if not self._is_git_repo:
            return added_lines, modified_lines
        
        try:
            diff_output = self._run_git_command(['diff', '--unified=0', file_path])
            current_line = 0
            
            for line in diff_output.split('\n'):
                if line.startswith('@@'):
                    match = re.search(r'\+(\d+)', line)
                    if match:
                        current_line = int(match.group(1))
                elif line.startswith('+') and not line.startswith('+++'):
                    added_lines.append(current_line)
                    current_line += 1
                elif line.startswith('-') and not line.startswith('---'):
                    modified_lines.append(current_line)
                elif not line.startswith('\\'):
                    current_line += 1
                    
        except Exception:
            pass
        
        return added_lines, modified_lines


class ReportGenerator:
    @staticmethod
    def generate_markdown_report(results: List[FileAnalysisResult], 
                                  output_path: str,
                                  include_feedback: bool = True) -> None:
        """Generate comprehensive markdown report."""
        report = []
        report.append("# 🔄 AI代码重构建议报告\n")
        report.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        report.append(f"**分析文件数**: {len(results)}\n")
        
        total_suggestions = sum(len(r.suggestions) for r in results)
        report.append(f"**总建议数**: {total_suggestions}\n")
        
        report.append("---\n")
        report.append("## 📊 执行摘要\n")
        
        sorted_results = sorted(results, key=lambda x: x.total_priority_score, reverse=True)
        
        report.append("| 文件路径 | 行数 | 圈复杂度 | 可维护性指数 | 建议数 | 优先级得分 |")
        report.append("|----------|------|----------|-------------|--------|------------|")
        
        for result in sorted_results[:10]:
            m = result.metrics
            report.append(f"| `{result.file_path}` | {m.lines_of_code} | "
                         f"{m.cyclomatic_complexity} | {m.maintainability_index:.1f} | "
                         f"{len(result.suggestions)} | {result.total_priority_score} |")
        
        report.append("\n---\n")
        report.append("## 🔍 详细重构建议\n")
        
        for result in sorted_results:
            if not result.suggestions:
                continue
            
            report.append(f"\n### 📁 {result.file_path}\n")
            
            m = result.metrics
            report.append(f"**代码指标**:\n")
            report.append(f"- 行数: {m.lines_of_code}")
            report.append(f"- 圈复杂度: {m.cyclomatic_complexity}")
            report.append(f"- 函数数: {m.function_count}")
            report.append(f"- 类数: {m.class_count}")
            report.append(f"- 重复度: {m.duplication_score:.2%}")
            report.append(f"- 耦合度: {m.coupling_score:.2%}")
            report.append(f"- 可维护性指数: {m.maintainability_index:.1f}\n")
            
            for sug in result.suggestions:
                status_icon = "✅" if sug.feedback == FeedbackStatus.ACCEPTED else \
                             "❌" if sug.feedback == FeedbackStatus.REJECTED else "⏳"
                
                report.append(f"\n#### {status_icon} [{sug.refactor_type.value}] {sug.title}\n")
                report.append(f"**位置**: 第{sug.line_number}行 | **优先级**: {sug.priority} | "
                             f"**置信度**: {sug.confidence:.0%}\n")
                
                if sug.complexity_before != sug.complexity_after:
                    reduction = sug.complexity_before - sug.complexity_after
                    report.append(f"**预估复杂度降低**: {sug.complexity_before} → {sug.complexity_after} "
                                 f"(降低 {reduction})\n")
                
                report.append("**描述**:\n")
                report.append(f"{sug.description}\n")
                
                report.append("**当前代码**:\n")
                report.append(f"```python\n{sug.current_code}\n```\n")
                
                report.append("**建议重构后**:\n")
                report.append(f"```python\n{sug.suggested_code}\n```\n")
                
                if include_feedback and sug.feedback != FeedbackStatus.PENDING:
                    feedback_text = "已采纳 ✓" if sug.feedback == FeedbackStatus.ACCEPTED else "已拒绝 ✗"
                    report.append(f"**用户反馈**: {feedback_text}\n")
        
        if include_feedback:
            report.append("\n---\n")
            report.append("## 📝 反馈统计\n")
            
            accepted = sum(1 for r in results for s in r.suggestions 
                          if s.feedback == FeedbackStatus.ACCEPTED)
            rejected = sum(1 for r in results for s in r.suggestions 
                          if s.feedback == FeedbackStatus.REJECTED)
            pending = sum(1 for r in results for s in r.suggestions 
                         if s.feedback == FeedbackStatus.PENDING)
            
            report.append(f"- ✅ 已采纳: {accepted}")
            report.append(f"- ❌ 已拒绝: {rejected}")
            report.append(f"- ⏳ 待处理: {pending}")
        
        report.append("\n---\n")
        report.append("*报告由AI代码重构工具自动生成*\n")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        
        console.print(f"[green]✅ 报告已导出到: {output_path}[/green]")


class DiffSimulator:
    @staticmethod
    def simulate_refactor(original_code: str, refactored_code: str) -> str:
        """Simulate refactoring and generate unified diff."""
        orig_lines = original_code.splitlines(keepends=True)
        refr_lines = refactored_code.splitlines(keepends=True)
        
        diff = difflib.unified_diff(
            orig_lines,
            refr_lines,
            fromfile='原始代码',
            tofile='重构后代码',
            lineterm=''
        )
        
        return ''.join(diff)

    @staticmethod
    def format_rename(old_name: str, new_name: str, code: str) -> Tuple[str, str]:
        """Format variable/function rename operation."""
        new_code = code.replace(old_name, new_name)
        diff = DiffSimulator.simulate_refactor(code, new_code)
        return new_code, diff

    @staticmethod
    def apply_formatting(code: str) -> Tuple[str, str]:
        """Apply basic formatting (indentation cleanup)."""
        lines = code.split('\n')
        formatted_lines = []
        
        for line in lines:
            if line.strip():
                formatted_lines.append(line.rstrip())
            else:
                formatted_lines.append('')
        
        formatted_code = '\n'.join(formatted_lines)
        diff = DiffSimulator.simulate_refactor(code, formatted_code)
        return formatted_code, diff


@click.group()
@click.option('--threshold', '-t', default=10, help='圈复杂度阈值 (默认: 10)')
@click.option('--line-threshold', '-l', default=50, help='函数行数阈值 (默认: 50)')
@click.option('--dup-threshold', '-d', default=0.3, help='重复度阈值 (默认: 0.3)')
@click.pass_context
def cli(ctx, threshold, line_threshold, dup_threshold):
    """🤖 AI代码重构建议生成器
    
    分析代码质量并生成智能重构建议
    """
    ctx.ensure_object(dict)
    ctx.obj['analyzer'] = CodeAnalyzer(
        complexity_threshold=threshold,
        line_threshold=line_threshold,
        duplication_threshold=dup_threshold
    )


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--type', 'filter_type', help='按类型过滤建议')
@click.option('--priority', 'filter_priority', help='按优先级过滤 (high/medium/low)')
@click.option('--show-diff/--no-show-diff', default=False, help='显示diff差异')
@click.pass_context
def analyze(ctx, file_path, filter_type, filter_priority, show_diff):
    """分析单个文件并生成重构建议"""
    analyzer = ctx.obj['analyzer']
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), 
                 console=console) as progress:
        task = progress.add_task(f"正在分析文件: {file_path}", total=None)
        
        try:
            result = analyzer.analyze_file(file_path)
        except FileNotFoundError as e:
            console.print(f"[red]❌ 错误: {e}[/red]")
            return
        except Exception as e:
            console.print(f"[red]❌ 分析失败: {e}[/red]")
            return
    
    _display_analysis_result(result, filter_type, filter_priority, show_diff)


@cli.command()
@click.argument('directory', type=click.Path(exists=True))
@click.option('--recursive', '-r', is_flag=True, help='递归分析子目录')
@click.option('--pattern', '-p', default='*.py', help='文件匹配模式 (默认: *.py)')
@click.option('--type', 'filter_type', help='按类型过滤建议')
@click.option('--export', '-e', help='导出报告到Markdown文件')
@click.option('--git-only', is_flag=True, help='只分析Git未提交的变更')
@click.option('--top-n', default=20, help='显示前N个优先级最高的文件')
@click.pass_context
def batch(ctx, directory, recursive, pattern, filter_type, export, git_only, top_n):
    """批量分析整个项目目录"""
    analyzer = ctx.obj['analyzer']
    dir_path = Path(directory)
    
    git_integration = GitIntegration(str(dir_path))
    
    target_files = []
    if git_only:
        uncommitted = git_integration.get_uncommitted_files()
        target_files = [dir_path / f for f in uncommitted 
                       if (dir_path / f).exists() and f.endswith('.py')]
        console.print(f"[blue]📂 Git模式: 找到 {len(target_files)} 个未提交变更的文件[/blue]")
    else:
        if recursive:
            target_files = list(dir_path.rglob(pattern))
        else:
            target_files = list(dir_path.glob(pattern))
        
        target_files = [f for f in target_files if f.is_file()]
    
    if not target_files:
        console.print("[yellow]⚠️  未找到符合条件的文件[/yellow]")
        return
    
    console.print(f"\n[bold blue]🔍 开始批量分析 {len(target_files)} 个文件...\n[/bold blue]")
    
    results = []
    errors = []
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
                  console=console) as progress:
        task = progress.add_task("分析进度", total=len(target_files))
        
        for file_path in target_files:
            progress.update(task, description=f"分析: {file_path.name}")
            
            try:
                result = analyzer.analyze_file(str(file_path))
                results.append(result)
            except Exception as e:
                errors.append((str(file_path), str(e)))
            
            progress.advance(task)
    
    results.sort(key=lambda x: x.total_priority_score, reverse=True)
    
    _display_batch_summary(results, top_n, filter_type)
    
    if export:
        ReportGenerator.generate_markdown_report(results[:top_n], export)
    
    if errors:
        console.print(f"\n[yellow]⚠️  {len(errors)} 个文件分析失败:[/yellow]")
        for fp, err in errors[:5]:
            console.print(f"  - {fp}: {err}")


@cli.command()
@click.argument('suggestion_ids', nargs=-1, required=True)
@click.option('--accept/--reject', 'action', default=True, help='标记为采纳或拒绝')
@click.pass_context
def feedback(ctx, suggestion_ids, action):
    """对重构建议进行反馈（采纳/拒绝）"""
    analyzer = ctx.obj['analyzer']
    
    status = FeedbackStatus.ACCEPTED if action else FeedbackStatus.REJECTED
    action_text = "采纳 ✓" if action else "拒绝 ✗"
    
    for sid in suggestion_ids:
        analyzer.feedback_manager.record_feedback(sid, status)
        console.print(f"[green]{action_text} 建议: {sid}[/green]")


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.argument('old_name')
@click.argument('new_name')
@click.pass_context
def simulate_rename(ctx, file_path, old_name, new_name):
    """模拟重命名操作并展示diff"""
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    new_code, diff = DiffSimulator.format_rename(old_name, new_name, code)
    
    console.print(f"\n[bold]📝 模拟重命名: '{old_name}' → '{new_name}'[/bold]\n")
    
    if diff:
        console.print(Syntax(diff, 'diff', theme='monokai', line_numbers=True))
    else:
        console.print("[yellow]没有检测到变化[/yellow]")


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.pass_context
def simulate_format(ctx, file_path):
    """模拟格式化操作并展示diff"""
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    formatted_code, diff = DiffSimulator.apply_formatting(code)
    
    console.print("\n[bold]🎨 模拟代码格式化[/bold]\n")
    
    if diff:
        console.print(Syntax(diff, 'diff', theme='monokai', line_numbers=True))


@cli.command()
@click.argument('directory', type=click.Path(exists=True))
@click.option('--output', '-o', required=True, help='输出文件路径')
@click.option('--recursive', '-r', is_flag=True, help='递归分析子目录')
@click.pass_context
def export_report(ctx, directory, output, recursive):
    """生成完整的Markdown重构报告"""
    analyzer = ctx.obj['analyzer']
    dir_path = Path(directory)
    
    if recursive:
        files = list(dir_path.rglob('*.py'))
    else:
        files = list(dir_path.glob('*.py'))
    
    files = [f for f in files if f.is_file()]
    
    console.print(f"\n[bold blue]📊 正在生成报告，分析 {len(files)} 个文件...[/bold blue]\n")
    
    results = []
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
                  console=console) as progress:
        task = progress.add_task("生成报告中", total=len(files))
        
        for file_path in files:
            progress.update(task, description=f"分析: {file_path.name}")
            try:
                result = analyzer.analyze_file(str(file_path))
                results.append(result)
            except:
                pass
            progress.advance(task)
    
    ReportGenerator.generate_markdown_report(results, output)


@cli.command()
def stats():
    """显示用户反馈统计信息"""
    fm = FeedbackManager()
    
    accepted = fm.get_accepted_patterns()
    rejected = fm.get_rejected_patterns()
    
    table = Table(title="📊 用户反馈统计")
    table.add_column("指标", style="cyan")
    table.add_column("数值", style="magenta")
    
    table.add_row("已采纳建议", str(len(accepted)))
    table.add_row("已拒绝建议", str(len(rejected)))
    table.add_row("总计反馈", str(len(accepted) + len(rejected)))
    
    acceptance_rate = (len(accepted) / (len(accepted) + len(rejected)) * 100 
                      if (len(accepted) + len(rejected)) > 0 else 0)
    table.add_row("采纳率", f"{acceptance_rate:.1f}%")
    
    console.print(table)


def _display_analysis_result(result: FileAnalysisResult, 
                            filter_type=None, 
                            filter_priority=None,
                            show_diff=False):
    """Display analysis results for a single file."""
    console.print(Panel(
        f"[bold]📁 文件[/bold]: {result.file_path}\n"
        f"[bold]行数[/bold]: {result.metrics.lines_of_code}\n"
        f"[bold]圈复杂度[/bold]: {result.metrics.cyclomatic_complexity}\n"
        f"[bold]可维护性指数[/bold]: {result.metrics.maintainability_index:.1f}\n"
        f"[bold]重复度[/bold]: {result.metrics.duplication_score:.2%}\n"
        f"[bold]耦合度[/bold]: {result.metrics.coupling_score:.2%}",
        title="代码分析结果",
        border_style="blue"
    ))
    
    filtered_suggestions = result.suggestions
    
    if filter_type:
        filtered_suggestions = [s for s in filtered_suggestions 
                               if s.refactor_type.value == filter_type]
    
    if filter_priority:
        filtered_suggestions = [s for s in filtered_suggestions 
                               if s.priority == filter_priority]
    
    if not filtered_suggestions:
        console.print("\n[yellow]💡 未找到符合筛选条件的重构建议[/yellow]")
        return
    
    console.print(f"\n[bold green]🎯 发现 {len(filtered_suggestions)} 条重构建议:\n[/bold green]")
    
    for i, sug in enumerate(filtered_suggestions, 1):
        priority_colors = {
            'high': 'red',
            'medium': 'yellow', 
            'low': 'green'
        }
        color = priority_colors.get(sug.priority, 'white')
        
        status_icon = {
            FeedbackStatus.ACCEPTED: '[green]✅[/green]',
            FeedbackStatus.REJECTED: '[red]❌[/red]',
            FeedbackStatus.PENDING: '[white]⏳[/white]'
        }.get(sug.feedback, '[white]⏳[/white]')
        
        console.print(f"\n{status_icon} [bold][{color}]#{i}. [{sug.refactor_type.value}] {sug.title}[/{color}][/bold]")
        console.print(f"   📍 位置: 第{sug.line_number}行 | ⚡ 优先级: {sug.priority} | 🎯 置信度: {sug.confidence:.0%}")
        
        if sug.complexity_before != sug.complexity_after:
            reduction = sug.complexity_before - sug.complexity_after
            console.print(f"   📉 预估复杂度降低: {sug.complexity_before} → {sug.complexity_after} (降低 {reduction})")
        
        console.print(f"   💬 {sug.description}")
        
        console.print("   [dim]当前代码:[/dim]")
        console.print(Syntax(sug.current_code, 'python', theme='monokai', 
                           line_numbers=False, word_wrap=True))
        
        console.print("   [dim]建议重构后:[/dim]")
        console.print(Syntax(sug.suggested_code, 'python', theme='monokai',
                           line_numbers=False, word_wrap=True))
        
        if show_diff:
            diff = DiffSimulator.simulate_refactor(sug.current_code, sug.suggested_code)
            if diff:
                console.print("   [dim]Diff预览:[/dim]")
                console.print(Syntax(diff, 'diff', theme='monokai'))


def _display_batch_summary(results: List[FileAnalysisResult], 
                          top_n: int = 20,
                          filter_type=None):
    """Display summary table for batch analysis."""
    table = Table(title=f"📊 项目重构优先级列表 (Top {min(top_n, len(results))})")
    table.add_column("排名", style="cyan", width=6)
    table.add_column("文件路径", style="white", min_width=40)
    table.add_column("行数", justify="right", style="yellow")
    table.add_column("复杂度", justify="right", style="red")
    table.add_column("可维护性", justify="right", style="green")
    table.add_column("建议数", justify="right", style="magenta")
    table.add_column("优先级分", justify="right", style="bold red")
    
    display_results = results[:top_n]
    
    for rank, result in enumerate(display_results, 1):
        m = result.metrics
        sug_count = len([s for s in result.suggestions 
                        if not filter_type or s.refactor_type.value == filter_type])
        
        table.add_row(
            str(rank),
            result.file_path,
            str(m.lines_of_code),
            str(m.cyclomatic_complexity),
            f"{m.maintainability_index:.1f}",
            str(sug_count),
            f"{result.total_priority_score:.1f}"
        )
    
    console.print(table)
    
    total_sugs = sum(len(r.suggestions) for r in results)
    console.print(f"\n[bold]总计[/bold]: {len(results)} 个文件, {total_sugs} 条建议")


def main():
    cli()


if __name__ == '__main__':
    main()
