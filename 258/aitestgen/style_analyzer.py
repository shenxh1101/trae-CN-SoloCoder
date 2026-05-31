import os
import re
import ast
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
import esprima


@dataclass
class StyleConfig:
    language: str = "python"
    
    test_naming_pattern: str = "test_{function_name}_{case}"
    class_naming_pattern: str = "Test{class_name}"
    
    import_style: str = "from_module"  # from_module, import_module
    import_order: List[str] = field(default_factory=list)
    
    assert_style: str = "assert_actual_expected"  # assert_actual_expected, assert_equal
    use_double_assert: bool = False  # assert result == expected vs assertEqual(result, expected)
    
    fixture_style: str = "setup_method"  # setup_method, pytest_fixture, constructor
    use_fixture_decorator: bool = False
    
    comment_style: str = "inline"  # inline, docstring, none
    include_description: bool = True
    
    mock_style: str = "patch_decorator"  # patch_decorator, patch_context, pytest_mock
    mock_import: str = "from unittest.mock import patch"
    
    indentation: int = 4
    line_length: int = 88
    blank_lines_between_tests: int = 1
    
    extra_imports: List[str] = field(default_factory=list)
    test_framework: str = "pytest"  # pytest, unittest, jest
    
    use_parametrize: bool = False
    parametrize_style: str = "decorator"  # decorator, inline
    
    exception_assert_style: str = "context_manager"  # context_manager, pytest_raises


class StyleAnalyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        with open(file_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
        self.lines = self.content.split('\n')
        self.language = self._detect_language()
        self.config = StyleConfig(language=self.language)
        
    def _detect_language(self) -> str:
        _, ext = os.path.splitext(self.file_path)
        if ext in ['.py']:
            return 'python'
        elif ext in ['.js', '.jsx', '.ts', '.tsx']:
            return 'javascript'
        else:
            return 'python'
    
    def analyze(self) -> StyleConfig:
        """Analyze the style of the test file"""
        if self.language == 'python':
            self._analyze_python_style()
        else:
            self._analyze_javascript_style()
        
        return self.config
    
    def _analyze_python_style(self):
        """Analyze Python test file style"""
        try:
            tree = ast.parse(self.content)
        except SyntaxError as e:
            print(f"Warning: Could not parse Python file: {e}")
            return
        
        # 分析导入
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(f"import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                names = ", ".join(a.name for a in node.names)
                if module:
                    imports.append(f"from {module} import {names}")
                else:
                    imports.append(f"from . import {names}")
        
        self.config.import_order = imports
        
        # 检查pytest vs unittest
        has_pytest = any('pytest' in imp for imp in imports)
        has_unittest = any('unittest' in imp for imp in imports)
        if has_pytest:
            self.config.test_framework = 'pytest'
        elif has_unittest:
            self.config.test_framework = 'unittest'
        
        # 检查mock导入
        for imp in imports:
            if 'mock' in imp.lower():
                self.config.mock_import = imp
        
        # 分析类和函数命名
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if node.name.startswith('Test'):
                    match = re.match(r'Test(.+)', node.name)
                    if match:
                        self.config.class_naming_pattern = 'Test{class_name}'
                break
        
        # 分析测试函数命名
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.name.startswith('test_'):
                    # 分析命名模式
                    if re.match(r'test_\w+_\w+_\d+', node.name):
                        self.config.test_naming_pattern = "test_{function_name}_{type}_{index}"
                    elif re.match(r'test_\w+_\w+', node.name):
                        self.config.test_naming_pattern = "test_{function_name}_{case}"
                    
                    # 分析注释风格
                    if ast.get_docstring(node):
                        self.config.comment_style = 'docstring'
                    else:
                        # 检查是否有内联注释
                        if node.body:
                            first_line = node.body[0]
                            if isinstance(first_line, ast.Expr) and isinstance(first_line.value, ast.Constant):
                                pass  # docstring已检查
                            else:
                                # 检查源代码中的注释
                                for line in self.lines[first_line.lineno-1:first_line.lineno+2]:
                                    if line.strip().startswith('#'):
                                        self.config.comment_style = 'inline'
                                        self.config.include_description = True
                                        break
                    
                    # 分析断言风格
                    for stmt in ast.walk(node):
                        if isinstance(stmt, ast.Assert):
                            if isinstance(stmt.test, ast.Compare):
                                if isinstance(stmt.test.ops[0], ast.Eq):
                                    self.config.assert_style = 'assert_actual_expected'
                                    self.config.use_double_assert = True
                                    break
                        elif isinstance(stmt, ast.Call):
                            if isinstance(stmt.func, ast.Attribute):
                                if stmt.func.attr in ['assertEqual', 'assertNotEqual']:
                                    self.config.assert_style = 'assert_equal'
                                    self.config.use_double_assert = True
                                    self.config.test_framework = 'unittest'
                                    break
                    
                    # 分析fixture风格
                    if node.name in ['setUp', 'setup_method', 'setup']:
                        if node.name == 'setUp':
                            self.config.fixture_style = 'unittest_setup'
                        elif node.name == 'setup_method':
                            self.config.fixture_style = 'setup_method'
                    
                    # 检查是否使用pytest.fixture装饰器
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Name) and decorator.id == 'fixture':
                            self.config.use_fixture_decorator = True
                            self.config.fixture_style = 'pytest_fixture'
                        elif isinstance(decorator, ast.Attribute) and decorator.attr == 'fixture':
                            self.config.use_fixture_decorator = True
                            self.config.fixture_style = 'pytest_fixture'
                    
                    # 检查parametrize
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Call):
                            if isinstance(decorator.func, ast.Attribute):
                                if decorator.func.attr == 'mark' or decorator.func.attr == 'parametrize':
                                    self.config.use_parametrize = True
                                elif isinstance(decorator.func, ast.Name) and decorator.func.id == 'parametrize':
                                    self.config.use_parametrize = True
                    
                    # 检查异常断言
                    for stmt in ast.walk(node):
                        if isinstance(stmt, ast.With):
                            for item in stmt.items:
                                if isinstance(item.context_expr, ast.Call):
                                    if isinstance(item.context_expr.func, ast.Attribute):
                                        if item.context_expr.func.attr == 'raises':
                                            self.config.exception_assert_style = 'pytest_raises'
                                    elif isinstance(item.context_expr.func, ast.Name):
                                        if item.context_expr.func.id == 'raises':
                                            self.config.exception_assert_style = 'pytest_raises'
                    
                    # 检查patch装饰器
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Call):
                            if isinstance(decorator.func, ast.Name) and decorator.func.id == 'patch':
                                self.config.mock_style = 'patch_decorator'
                            elif isinstance(decorator.func, ast.Attribute) and decorator.func.attr == 'patch':
                                self.config.mock_style = 'patch_decorator'
                    
                    break  # 只分析第一个测试函数
    
    def _analyze_javascript_style(self):
        """Analyze JavaScript test file style"""
        try:
            tree = esprima.parseScript(self.content, loc=True)
            tree_dict = tree.toDict()
        except Exception as e:
            print(f"Warning: Could not parse JavaScript file: {e}")
            return
        
        # 分析导入
        imports = []
        
        def traverse(node):
            if isinstance(node, dict):
                if node.get('type') == 'ImportDeclaration':
                    source = node.get('source', {}).get('value', '')
                    specifiers = node.get('specifiers', [])
                    names = []
                    for spec in specifiers:
                        if spec.get('type') == 'ImportDefaultSpecifier':
                            names.append(spec.get('local', {}).get('name', ''))
                        elif spec.get('type') == 'ImportSpecifier':
                            imported = spec.get('imported', {}).get('name', '')
                            local = spec.get('local', {}).get('name', '')
                            if imported != local:
                                names.append(f"{imported} as {local}")
                            else:
                                names.append(imported)
                    if names:
                        imports.append(f"import {{ {', '.join(names)} }} from '{source}'")
                    else:
                        imports.append(f"import '{source}'")
                
                for value in node.values():
                    traverse(value)
            elif isinstance(node, list):
                for item in node:
                    traverse(item)
        
        traverse(tree_dict)
        self.config.import_order = imports
        
        # 检查Jest vs Mocha
        has_describe = 'describe' in self.content
        has_it = 'it(' in self.content or 'test(' in self.content
        if has_describe and has_it:
            self.config.test_framework = 'jest'
        
        # 分析测试命名和结构
        # 检查describe块
        describe_matches = re.findall(r"describe\(['\"](.+?)['\"]", self.content)
        if describe_matches:
            first_describe = describe_matches[0]
            if first_describe.startswith('Test'):
                self.config.class_naming_pattern = 'Test{class_name}'
        
        # 检查test/it块命名
        test_matches = re.findall(r"(?:test|it)\(['\"](.+?)['\"]", self.content)
        if test_matches:
            first_test = test_matches[0]
            if 'should' in first_test.lower():
                self.config.test_naming_pattern = "should {description}"
            elif re.match(r'test \w+ \w+', first_test):
                self.config.test_naming_pattern = "test {function_name} {case}"
        
        # 分析断言风格
        if 'expect(' in self.content:
            self.config.assert_style = 'expect_tobe'
            if '.toEqual(' in self.content:
                self.config.use_double_assert = True
        elif 'assert.equal(' in self.content or 'assert.strictEqual(' in self.content:
            self.config.assert_style = 'assert_equal'
            self.config.test_framework = 'mocha'
        
        # 检查异常断言
        if '.toThrow(' in self.content or '.throws(' in self.content:
            self.config.exception_assert_style = 'expect_tothrow'
        
        # 检查beforeEach/setup
        if 'beforeEach(' in self.content:
            self.config.fixture_style = 'before_each'
        elif 'beforeAll(' in self.content:
            self.config.fixture_style = 'before_all'
        
        # 检查mock风格
        if 'jest.mock(' in self.content:
            self.config.mock_style = 'jest_mock'
        elif 'sinon.mock(' in self.content:
            self.config.mock_style = 'sinon_mock'
        elif 'vi.mock(' in self.content:
            self.config.mock_style = 'vitest_mock'
    
    def generate_template(self) -> str:
        """Generate Jinja2 template based on analyzed style"""
        if self.language == 'python':
            return self._generate_python_template()
        else:
            return self._generate_javascript_template()
    
    def _generate_python_template(self) -> str:
        """Generate Python test template"""
        lines = []
        
        # 导入部分
        lines.append('{% for import in imports %}')
        lines.append('{{ import }}')
        lines.append('{% endfor %}')
        lines.append('')
        lines.append('')
        
        # 函数测试
        lines.append('{% for test in func_tests %}')
        lines.append('{% for case in test.test_cases %}')
        
        # Mock装饰器
        if self.config.mock_style == 'patch_decorator':
            lines.append('{% if test.mocks %}')
            lines.append('{% for mock in test.mocks %}')
            lines.append('@patch(\'{{ mock.name }}\')')
            lines.append('{% endfor %}')
            lines.append('{% endif %}')
        
        # 测试函数定义
        lines.append('def {{ case.name }}({% if test.mocks %}mock{% endif %}):')
        
        # 描述注释
        if self.config.include_description:
            if self.config.comment_style == 'docstring':
                lines.append('    """{{ case.description }}"""')
            elif self.config.comment_style == 'inline':
                lines.append('    # {{ case.description }}')
        
        # 异常测试
        lines.append('    {% if case.type == \'exception\' %}')
        if self.config.exception_assert_style == 'pytest_raises':
            lines.append('    with pytest.raises({{ case.exception }}):')
            lines.append('        {{ test.function_name }}(')
        else:
            lines.append('    try:')
            lines.append('        {{ test.function_name }}(')
            lines.append('            {%- for name, value in case.inputs.items() %}')
            lines.append('            {{ name }}={{ value }}{% if not loop.last %}, {% endif %}')
            lines.append('            {%- endfor %}')
            lines.append('        )')
            lines.append('        assert False, "Expected exception not raised"')
            lines.append('    except {{ case.exception }}:')
            lines.append('        pass')
            lines.append('    {% else %}')
        
        if self.config.exception_assert_style == 'pytest_raises':
            lines.append('        {{ test.function_name }}(')
            lines.append('            {%- for name, value in case.inputs.items() %}')
            lines.append('            {{ name }}={{ value }}{% if not loop.last %}, {% endif %}')
            lines.append('            {%- endfor %}')
            lines.append('        )')
            lines.append('    {% else %}')
        
        # 正常测试
        lines.append('    result = {{ test.function_name }}(')
        lines.append('        {%- for name, value in case.inputs.items() %}')
        lines.append('        {{ name }}={{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('        {%- endfor %}')
        lines.append('    )')
        
        # 断言
        if self.config.use_double_assert:
            if self.config.assert_style == 'assert_equal':
                lines.append('    {% if case.expected is not none %}')
                lines.append('    assertEqual(result, {{ case.expected }})')
                lines.append('    {% else %}')
                lines.append('    assert result is not None')
                lines.append('    {% endif %}')
            else:
                lines.append('    {% if case.expected is not none %}')
                lines.append('    assert result == {{ case.expected }}')
                lines.append('    {% else %}')
                lines.append('    assert result is not None')
                lines.append('    {% endif %}')
        else:
            lines.append('    assert result is not None')
        
        lines.append('    {% endif %}')
        lines.append('')
        lines.append('{% endfor %}')
        lines.append('{% endfor %}')
        lines.append('')
        
        # 类测试
        lines.append('{% for group in class_tests %}')
        lines.append('class {{ group.class_name }}:')
        
        # Setup方法
        if self.config.fixture_style == 'setup_method':
            lines.append('    def setup_method(self):')
            lines.append('        self.instance = {{ group.class_name }}()')
        elif self.config.fixture_style == 'pytest_fixture':
            lines.append('    @pytest.fixture')
            lines.append('    def instance(self):')
            lines.append('        return {{ group.class_name }}()')
        
        for i in range(self.config.blank_lines_between_tests):
            lines.append('')
        
        lines.append('{% for method in group.methods %}')
        lines.append('{% for case in method.test_cases %}')
        
        # Mock装饰器
        if self.config.mock_style == 'patch_decorator':
            lines.append('{% if method.mocks %}')
            lines.append('    {% for mock in method.mocks %}')
            lines.append('    @patch(\'{{ mock.name }}\')')
            lines.append('    {% endfor %}')
            lines.append('{% endif %}')
        
        # 测试方法定义
        lines.append('    def {{ case.name }}(self{% if method.mocks %}, mock{% endif %}):')
        
        # 描述注释
        if self.config.include_description:
            if self.config.comment_style == 'docstring':
                lines.append('        """{{ case.description }}"""')
            elif self.config.comment_style == 'inline':
                lines.append('        # {{ case.description }}')
        
        # 异常测试
        lines.append('        {% if case.type == \'exception\' %}')
        lines.append('        with pytest.raises({{ case.exception }}):')
        lines.append('            self.instance.{{ method.function_name }}(')
        lines.append('                {%- for name, value in case.inputs.items() %}')
        lines.append('                {{ name }}={{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('                {%- endfor %}')
        lines.append('            )')
        lines.append('        {% else %}')
        
        # 正常测试
        lines.append('        result = self.instance.{{ method.function_name }}(')
        lines.append('            {%- for name, value in case.inputs.items() %}')
        lines.append('            {{ name }}={{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('            {%- endfor %}')
        lines.append('        )')
        
        # 断言
        if self.config.use_double_assert:
            lines.append('        {% if case.expected is not none %}')
            lines.append('        assert result == {{ case.expected }}')
            lines.append('        {% else %}')
            lines.append('        assert result is not None')
            lines.append('        {% endif %}')
        else:
            lines.append('        assert result is not None')
        
        lines.append('        {% endif %}')
        lines.append('')
        lines.append('{% endfor %}')
        lines.append('{% endfor %}')
        lines.append('{% endfor %}')
        
        return '\n'.join(lines)
    
    def _generate_javascript_template(self) -> str:
        """Generate JavaScript test template"""
        lines = []
        
        # 导入部分
        lines.append('{% for import in imports %}')
        lines.append('{{ import }}')
        lines.append('{% endfor %}')
        lines.append('')
        
        # 主describe块
        lines.append("describe('Test Suite', () => {")
        
        # 函数测试
        lines.append('{% for test in func_tests %}')
        lines.append("  describe('{{ test.function_name }}', () => {")
        lines.append('{% for case in test.test_cases %}')
        
        # 测试块
        lines.append("    test('{{ case.name }}', () => {")
        
        # 描述注释
        if self.config.include_description:
            lines.append('      // {{ case.description }}')
        
        # 异常测试
        lines.append('      {% if case.type == \'exception\' %}')
        if self.config.exception_assert_style == 'expect_tothrow':
            lines.append('      expect(() => {{ test.function_name }}(')
            lines.append('        {%- for name, value in case.inputs.items() %}')
            lines.append('        {{ value }}{% if not loop.last %}, {% endif %}')
            lines.append('        {%- endfor %}')
            lines.append('      )).toThrow();')
        else:
            lines.append('      try {')
            lines.append('        {{ test.function_name }}(')
            lines.append('          {%- for name, value in case.inputs.items() %}')
            lines.append('          {{ value }}{% if not loop.last %}, {% endif %}')
            lines.append('          {%- endfor %}')
            lines.append('        );')
            lines.append('        throw new Error(\'Expected exception not thrown\');')
            lines.append('      } catch (e) {')
            lines.append('        // Expected exception')
            lines.append('      }')
        
        lines.append('      {% else %}')
        
        # 正常测试
        lines.append('      const result = {{ test.function_name }}(')
        lines.append('        {%- for name, value in case.inputs.items() %}')
        lines.append('        {{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('        {%- endfor %}')
        lines.append('      );')
        
        # 断言
        if self.config.use_double_assert:
            lines.append('      {% if case.expected is not none %}')
            if self.config.assert_style == 'expect_tobe':
                lines.append('      expect(result).toEqual({{ case.expected }});')
            else:
                lines.append('      expect(result).toBe({{ case.expected }});')
            lines.append('      {% else %}')
            lines.append('      expect(result).toBeDefined();')
            lines.append('      {% endif %}')
        else:
            lines.append('      expect(result).toBeDefined();')
        
        lines.append('      {% endif %}')
        lines.append('    });')
        lines.append('{% endfor %}')
        lines.append('  });')
        lines.append('{% endfor %}')
        
        # 类测试
        lines.append('{% for group in class_tests %}')
        lines.append("  describe('{{ group.class_name }}', () => {")
        lines.append('    let instance;')
        lines.append('')
        
        # Setup
        if self.config.fixture_style == 'before_each':
            lines.append('    beforeEach(() => {')
            lines.append('      instance = new {{ group.class_name }}();')
            lines.append('    });')
        else:
            lines.append('    beforeAll(() => {')
            lines.append('      instance = new {{ group.class_name }}();')
            lines.append('    });')
        
        lines.append('')
        
        lines.append('{% for method in group.methods %}')
        lines.append("    describe('{{ method.function_name }}', () => {")
        lines.append('{% for case in method.test_cases %}')
        lines.append("      test('{{ case.name }}', () => {")
        
        if self.config.include_description:
            lines.append('        // {{ case.description }}')
        
        lines.append('        {% if case.type == \'exception\' %}')
        lines.append('        expect(() => instance.{{ method.function_name }}(')
        lines.append('          {%- for name, value in case.inputs.items() %}')
        lines.append('          {{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('          {%- endfor %}')
        lines.append('        )).toThrow();')
        lines.append('        {% else %}')
        lines.append('        const result = instance.{{ method.function_name }}(')
        lines.append('          {%- for name, value in case.inputs.items() %}')
        lines.append('          {{ value }}{% if not loop.last %}, {% endif %}')
        lines.append('          {%- endfor %}')
        lines.append('        );')
        
        if self.config.use_double_assert:
            lines.append('        {% if case.expected is not none %}')
            lines.append('        expect(result).toEqual({{ case.expected }});')
            lines.append('        {% else %}')
            lines.append('        expect(result).toBeDefined();')
            lines.append('        {% endif %}')
        else:
            lines.append('        expect(result).toBeDefined();')
        
        lines.append('        {% endif %}')
        lines.append('      });')
        lines.append('{% endfor %}')
        lines.append('    });')
        lines.append('{% endfor %}')
        lines.append('  });')
        lines.append('{% endfor %}')
        lines.append('});')
        
        return '\n'.join(lines)


def analyze_style_file(file_path: str) -> StyleAnalyzer:
    """Analyze a style file and return the analyzer"""
    analyzer = StyleAnalyzer(file_path)
    analyzer.analyze()
    return analyzer
