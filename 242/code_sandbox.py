import subprocess
import sys
import os
import json
import tempfile
import ast
from typing import Dict, List, Tuple

class CodeSandbox:
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.allowed_modules = {
            'math', 'random', 'datetime', 'time', 'json', 're',
            'collections', 'itertools', 'functools', 'operator',
            'string', 'copy', 'heapq', 'bisect', 'typing'
        }
        self.forbidden_keywords = [
            'import', 'from', 'open', 'file', 'exec', 'eval',
            'compile', '__import__', 'os.', 'sys.', 'subprocess',
            'socket', 'requests', 'urllib', 'http', 'ftp',
            'pickle', 'marshal', 'builtins', 'globals', 'locals',
            'getattr', 'setattr', 'delattr', 'hasattr',
            'input', 'print', 'exit', 'quit', 'breakpoint'
        ]

    def validate_code(self, code: str) -> Tuple[bool, str]:
        if not code or not code.strip():
            return False, '代码不能为空'

        for kw in self.forbidden_keywords:
            if kw in code.lower():
                if kw in ['print']:
                    continue
                return False, f'代码中包含不允许的关键字: {kw}'

        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                    for alias in node.names:
                        module_name = alias.name.split('.')[0]
                        if module_name not in self.allowed_modules:
                            return False, f'不允许导入模块: {module_name}'
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id in ['open', 'exec', 'eval', 'compile', '__import__', 'input']:
                            return False, f'不允许调用函数: {node.func.id}'
        except SyntaxError as e:
            return False, f'语法错误: {str(e)}'

        return True, '代码验证通过'

    def run_code(self, code: str, test_cases_str: str = None) -> Dict:
        is_valid, error_msg = self.validate_code(code)
        if not is_valid:
            return {
                'success': False,
                'passed': False,
                'output': error_msg,
                'error': error_msg,
                'test_results': []
            }

        test_cases = []
        if test_cases_str:
            try:
                test_cases = json.loads(test_cases_str)
            except Exception:
                test_cases = []

        result = {
            'success': True,
            'passed': False,
            'output': '',
            'error': None,
            'test_results': []
        }

        try:
            func_name = self._extract_function_name(code)
            test_code = self._prepare_test_code(code, func_name, test_cases)
            
            with tempfile.TemporaryDirectory() as tmpdir:
                code_file = os.path.join(tmpdir, 'user_code.py')
                with open(code_file, 'w', encoding='utf-8') as f:
                    f.write(test_code)

                env = os.environ.copy()
                env['PYTHONIOENCODING'] = 'utf-8'
                
                proc = subprocess.run(
                    [sys.executable, code_file],
                    capture_output=True,
                    text=True,
                    timeout=self.timeout,
                    env=env,
                    cwd=tmpdir
                )

                result['output'] = proc.stdout
                if proc.stderr:
                    result['error'] = proc.stderr

                if proc.returncode == 0:
                    try:
                        test_results = json.loads(proc.stdout.strip())
                        result['test_results'] = test_results
                        all_passed = all(r.get('passed', False) for r in test_results)
                        result['passed'] = all_passed
                    except Exception:
                        result['test_results'] = []
                        result['passed'] = 'Traceback' not in proc.stdout
                else:
                    result['passed'] = False

        except subprocess.TimeoutExpired:
            result['success'] = False
            result['error'] = f'代码执行超时（超过{self.timeout}秒）'
            result['passed'] = False
        except Exception as e:
            result['success'] = False
            result['error'] = f'执行错误: {str(e)}'
            result['passed'] = False

        return result

    def _extract_function_name(self, code: str) -> str:
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    return node.name
        except Exception:
            pass
        return 'solution'

    def _prepare_test_code(self, code: str, func_name: str, test_cases: List) -> str:
        test_code = []
        test_code.append('import json')
        test_code.append('import sys')
        test_code.append('')
        test_code.append(code)
        test_code.append('')
        test_code.append('_test_results = []')
        
        if test_cases:
            test_code.append(f'_test_cases = {json.dumps(test_cases, ensure_ascii=False)}')
            test_code.append('')
            test_code.append(f'if "{func_name}" in dir():')
            test_code.append(f'    _func = {func_name}')
            test_code.append('    for _i, _input in enumerate(_test_cases):')
            test_code.append('        try:')
            test_code.append('            if isinstance(_input, list):')
            test_code.append('                _output = _func(*_input)')
            test_code.append('            else:')
            test_code.append('                _output = _func(_input)')
            test_code.append('            _test_results.append({')
            test_code.append('                "test_case": _i + 1,')
            test_code.append('                "input": str(_input),')
            test_code.append('                "output": str(_output),')
            test_code.append('                "passed": True')
            test_code.append('            })')
            test_code.append('        except Exception as _e:')
            test_code.append('            _test_results.append({')
            test_code.append('                "test_case": _i + 1,')
            test_code.append('                "input": str(_input),')
            test_code.append('                "error": str(_e),')
            test_code.append('                "passed": False')
            test_code.append('            })')
        else:
            test_code.append(f'if "{func_name}" in dir():')
            test_code.append(f'    _func = {func_name}')
            test_code.append('    _test_results.append({')
            test_code.append('        "test_case": 1,')
            test_code.append('        "message": "代码语法正确，函数定义成功",')
            test_code.append('        "passed": True')
            test_code.append('    })')

        test_code.append('')
        test_code.append('print(json.dumps(_test_results, ensure_ascii=False))')
        
        return '\n'.join(test_code)
