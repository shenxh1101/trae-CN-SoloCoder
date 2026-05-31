import os
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from jinja2 import Template
from collections import defaultdict

from .parser import FunctionInfo, ClassInfo, ModuleInfo, Parameter
from .ai_client import get_ai_generator, AITestGenerator


@dataclass
class TestCase:
    name: str
    type: str  # normal, boundary, exception
    inputs: Dict[str, Any]
    expected: Optional[Any] = None
    exception: Optional[str] = None
    description: str = ""


@dataclass
class MockDefinition:
    name: str
    type: str  # function, class, module
    methods: List[str] = field(default_factory=list)
    return_value: Any = None


@dataclass
class GeneratedTest:
    function_name: str
    class_name: Optional[str]
    test_cases: List[TestCase]
    mocks: List[MockDefinition]
    imports: List[str]
    coverage_branches: List[Dict[str, Any]]


@dataclass
class ClassTestGroup:
    class_name: str
    methods: List[GeneratedTest]


class BaseTestGenerator:
    def __init__(self, style_template: Optional[str] = None, 
                 ai_provider: str = "auto", ai_model: Optional[str] = None,
                 use_ai: bool = True):
        self.style_template = style_template
        self.use_ai = use_ai
        if use_ai:
            self.ai_generator = get_ai_generator(provider=ai_provider, model=ai_model)
        else:
            self.ai_generator = None

    def _format_value(self, value: Any, language: str) -> str:
        if value is None:
            return 'None' if language == 'python' else 'null'
        elif isinstance(value, str):
            return repr(value)
        elif isinstance(value, (list, dict)):
            return repr(value)
        else:
            return str(value)

    def _detect_mocks(self, func_body: str, language: str) -> List[MockDefinition]:
        mocks = []
        
        if language == 'python':
            external_patterns = [
                (r'requests\.get|requests\.post|requests\.put|requests\.delete', 'requests'),
                (r'open\(', 'builtins.open'),
                (r'subprocess\.', 'subprocess'),
                (r'smtplib\.', 'smtplib'),
                (r'pymongo\.|MongoClient', 'pymongo'),
                (r'redis\.|Redis\(', 'redis'),
                (r'os\.environ', 'os.environ'),
                (r'datetime\.now|datetime\.today', 'datetime'),
                (r'random\.', 'random'),
                (r'time\.sleep', 'time'),
            ]
        else:
            external_patterns = [
                (r'fetch\(', 'fetch'),
                (r'axios\.', 'axios'),
                (r'localStorage\.|sessionStorage\.', 'storage'),
                (r'console\.', 'console'),
            ]
        
        for pattern, mock_name in external_patterns:
            if re.search(pattern, func_body):
                mocks.append(MockDefinition(
                    name=mock_name,
                    type='module',
                    methods=['__call__']
                ))
        
        return mocks

    def _generate_test_cases(self, func_info: FunctionInfo, language: str) -> List[TestCase]:
        parameters = []
        for param in func_info.parameters:
            if param.name in ['self', 'cls']:
                continue
            parameters.append({
                'name': param.name,
                'type_hint': param.type_hint,
                'default_value': param.default_value
            })
        
        if self.use_ai and self.ai_generator:
            ai_cases = self.ai_generator.generate_test_cases(
                function_name=func_info.name,
                function_code=func_info.body,
                parameters=parameters,
                return_type=func_info.return_type,
                docstring=func_info.docstring,
                language=language
            )
            
            test_cases = []
            for case in ai_cases:
                inputs = {}
                for k, v in case.get('inputs', {}).items():
                    inputs[k] = self._format_value(v, language)
                
                test_cases.append(TestCase(
                    name=case.get('test_name', f"test_{func_info.name}"),
                    type=case.get('test_type', 'normal'),
                    inputs=inputs,
                    expected=case.get('expected'),
                    exception=case.get('exception'),
                    description=case.get('description', '')
                ))
            
            if test_cases:
                return test_cases
        
        return self._fallback_generate_test_cases(func_info, language)

    def _fallback_generate_test_cases(self, func_info: FunctionInfo, language: str) -> List[TestCase]:
        test_cases = []
        params = [p for p in func_info.parameters if p.name not in ['self', 'cls']]
        
        if not params:
            test_cases.append(TestCase(
                name=f"test_{func_info.name}_no_args",
                type="normal",
                inputs={},
                description="Test function with no arguments"
            ))
            return test_cases
        
        test_counter = {"normal": 0, "boundary": 0, "exception": 0}
        
        for param in params:
            normal_values = self._get_normal_values(param, language)
            for value in normal_values[:2]:
                inputs = {}
                for p in params:
                    if p.name == param.name:
                        inputs[p.name] = self._format_value(value, language)
                    elif p.default_value:
                        inputs[p.name] = p.default_value
                    else:
                        inputs[p.name] = self._get_default_for_type(p.type_hint or '', language)
                
                test_cases.append(TestCase(
                    name=f"test_{func_info.name}_normal_{param.name}_{test_counter['normal']}",
                    type="normal",
                    inputs=inputs,
                    description=f"Test {func_info.name} with {param.name} = {value}"
                ))
                test_counter["normal"] += 1
            
            boundary_values = self._get_boundary_values(param, language)
            for value in boundary_values[:2]:
                inputs = {}
                for p in params:
                    if p.name == param.name:
                        inputs[p.name] = self._format_value(value, language)
                    elif p.default_value:
                        inputs[p.name] = p.default_value
                    else:
                        inputs[p.name] = self._get_default_for_type(p.type_hint or '', language)
                
                test_cases.append(TestCase(
                    name=f"test_{func_info.name}_boundary_{param.name}_{test_counter['boundary']}",
                    type="boundary",
                    inputs=inputs,
                    description=f"Test {func_info.name} boundary with {param.name} = {value}"
                ))
                test_counter["boundary"] += 1
            
            exception_values = self._get_exception_values(param, language)
            for value, exc_type in exception_values[:1]:
                inputs = {}
                for p in params:
                    if p.name == param.name:
                        inputs[p.name] = self._format_value(value, language)
                    elif p.default_value:
                        inputs[p.name] = p.default_value
                    else:
                        inputs[p.name] = self._get_default_for_type(p.type_hint or '', language)
                
                test_cases.append(TestCase(
                    name=f"test_{func_info.name}_exception_{param.name}_{test_counter['exception']}",
                    type="exception",
                    inputs=inputs,
                    exception=exc_type,
                    description=f"Test {func_info.name} raises {exc_type} with {param.name} = {value}"
                ))
                test_counter["exception"] += 1
        
        return test_cases

    def _get_normal_values(self, param: Parameter, language: str) -> List[Any]:
        type_hint = (param.type_hint or "").lower()
        
        if 'int' in type_hint:
            return [0, 1, 42, 100]
        elif 'str' in type_hint or 'string' in type_hint:
            return ["hello", "test", ""]
        elif 'float' in type_hint:
            return [0.0, 1.5, 3.14]
        elif 'bool' in type_hint:
            return [True, False]
        elif 'list' in type_hint:
            return [[], [1, 2, 3], ["a", "b"]]
        elif 'dict' in type_hint:
            return [{}, {"key": "value"}, {"a": 1}]
        elif param.default_value and param.default_value not in ['None', 'null']:
            try:
                return [eval(param.default_value)]
            except:
                return [param.default_value]
        else:
            return [None, "sample_value"]

    def _get_boundary_values(self, param: Parameter, language: str) -> List[Any]:
        type_hint = (param.type_hint or "").lower()
        
        if 'int' in type_hint:
            return [-1, 0, 1, -1000000, 1000000]
        elif 'str' in type_hint or 'string' in type_hint:
            return ["", "a" * 1000, None, "   "]
        elif 'float' in type_hint:
            return [0.0, -0.0, -1e10, 1e10]
        elif 'list' in type_hint:
            return [[], [1], None]
        elif 'dict' in type_hint:
            return [{}, None]
        else:
            return [None]

    def _get_exception_values(self, param: Parameter, language: str) -> List[Tuple[Any, str]]:
        type_hint = (param.type_hint or "").lower()
        exceptions = []
        
        if 'int' in type_hint:
            exceptions.append(("not_an_int", "TypeError"))
            exceptions.append((None, "TypeError"))
        elif 'str' in type_hint or 'string' in type_hint:
            exceptions.append((123, "TypeError"))
        elif 'float' in type_hint:
            exceptions.append(("not_float", "TypeError"))
        elif 'list' in type_hint:
            exceptions.append(("not_list", "TypeError"))
            exceptions.append((None, "AttributeError"))
        
        return exceptions

    def _get_default_for_type(self, type_hint: str, language: str) -> Any:
        type_hint = type_hint.lower()
        if language == 'python':
            if 'int' in type_hint:
                return '0'
            elif 'str' in type_hint or 'string' in type_hint:
                return '""'
            elif 'float' in type_hint:
                return '0.0'
            elif 'bool' in type_hint:
                return 'False'
            elif 'list' in type_hint:
                return '[]'
            elif 'dict' in type_hint:
                return '{}'
            else:
                return 'None'
        else:
            if 'int' in type_hint or 'float' in type_hint or 'number' in type_hint:
                return '0'
            elif 'str' in type_hint or 'string' in type_hint:
                return '""'
            elif 'bool' in type_hint:
                return 'false'
            elif 'array' in type_hint or 'list' in type_hint:
                return '[]'
            elif 'object' in type_hint or 'dict' in type_hint:
                return '{}'
            else:
                return 'null'

    def _analyze_function_body(self, func_info: FunctionInfo) -> Tuple[List[str], List[Dict]]:
        body = func_info.body
        detected_exceptions = []
        detected_branches = []
        
        if re.search(r'raise\s+\w+', body):
            exception_matches = re.findall(r'raise\s+(\w+)', body)
            detected_exceptions.extend(exception_matches)
        
        branch_patterns = [
            (r'^\s*(if)\s+(.+?):', 'if'),
            (r'^\s*(elif)\s+(.+?):', 'elif'),
            (r'^\s*(else):', 'else'),
            (r'^\s*(for)\s+', 'for'),
            (r'^\s*(while)\s+', 'while'),
            (r'^\s*(try):', 'try'),
            (r'^\s*(except)', 'except'),
        ]
        
        lines = body.split('\n')
        for line_num, line in enumerate(lines, start=func_info.start_line):
            for pattern, branch_type in branch_patterns:
                match = re.search(pattern, line)
                if match:
                    condition = match.group(2) if len(match.groups()) > 1 else branch_type
                    detected_branches.append({
                        'type': branch_type,
                        'condition': condition if branch_type != 'else' else 'else',
                        'line': line_num,
                        'covered': False
                    })
                    break
        
        return detected_exceptions, detected_branches


class PythonTestGenerator(BaseTestGenerator):
    def __init__(self, style_template: Optional[str] = None, 
                 ai_provider: str = "auto", ai_model: Optional[str] = None,
                 use_ai: bool = True):
        super().__init__(style_template, ai_provider, ai_model, use_ai)
        self.language = 'python'

    def generate_function_test(self, func_info: FunctionInfo, module_info: ModuleInfo, class_name: Optional[str] = None) -> GeneratedTest:
        test_cases = self._generate_test_cases(func_info, self.language)
        mocks = self._detect_mocks(func_info.body, self.language)
        _, branches = self._analyze_function_body(func_info)
        
        return GeneratedTest(
            function_name=func_info.name,
            class_name=class_name,
            test_cases=test_cases,
            mocks=mocks,
            imports=[],
            coverage_branches=branches
        )

    def generate_class_test(self, class_info: ClassInfo, module_info: ModuleInfo) -> ClassTestGroup:
        method_tests = []
        for method in class_info.methods:
            if not method.name.startswith('_') or method.name == '__init__':
                test = self.generate_function_test(method, module_info, class_name=class_info.name)
                method_tests.append(test)
        
        return ClassTestGroup(
            class_name=class_info.name,
            methods=method_tests
        )

    def render_test_file(self, func_tests: List[GeneratedTest], class_tests: List[ClassTestGroup], module_info: ModuleInfo) -> str:
        template = Template(self._get_template())
        
        all_imports = {'import pytest'}
        module_name = os.path.splitext(os.path.basename(module_info.file_path))[0]
        
        all_mocks = set()
        for test in func_tests:
            for mock in test.mocks:
                all_mocks.add(mock.name)
        for group in class_tests:
            for method in group.methods:
                for mock in method.mocks:
                    all_mocks.add(mock.name)
        
        if all_mocks:
            all_imports.add('from unittest.mock import patch, MagicMock')
        
        imports_to_add = set()
        for test in func_tests:
            imports_to_add.add(test.function_name)
        for group in class_tests:
            imports_to_add.add(group.class_name)
        
        if imports_to_add:
            import_line = f"from {module_name} import {', '.join(sorted(imports_to_add))}"
            all_imports.add(import_line)
        
        return template.render(
            imports=sorted(all_imports),
            func_tests=func_tests,
            class_tests=class_tests,
            module_name=module_name
        )

    def _get_template(self) -> str:
        if self.style_template:
            return self.style_template
        
        return '''{% for import in imports %}
{{ import }}
{% endfor %}


{% for test in func_tests %}
{% for case in test.test_cases %}
{% if test.mocks %}
{% for mock in test.mocks %}
@patch('{{ mock.name }}')
{% endfor %}
{% endif %}
def {{ case.name }}({% if test.mocks %}mock{% endif %}):
    {% if case.description %}# {{ case.description }}
    {% endif %}{% if case.type == 'exception' %}
    with pytest.raises({{ case.exception }}):
        {{ test.function_name }}(
            {%- for name, value in case.inputs.items() %}
            {{ name }}={{ value }}{% if not loop.last %}, {% endif %}
            {%- endfor %}
        )
    {% else %}
    result = {{ test.function_name }}(
        {%- for name, value in case.inputs.items() %}
        {{ name }}={{ value }}{% if not loop.last %}, {% endif %}
        {%- endfor %}
    )
    {% if case.expected is not none %}
    assert result == {{ case.expected }}
    {% else %}
    assert result is not None
    {% endif %}
    {% endif %}

{% endfor %}
{% endfor %}

{% for group in class_tests %}
class Test{{ group.class_name }}:
    def setup_method(self):
        self.instance = {{ group.class_name }}()
{% for method in group.methods %}
{% for case in method.test_cases %}
{% if method.mocks %}
    {% for mock in method.mocks %}
    @patch('{{ mock.name }}')
    {% endfor %}
{% endif %}
    def {{ case.name }}(self{% if method.mocks %}, mock{% endif %}):
        {% if case.description %}# {{ case.description }}
        {% endif %}{% if case.type == 'exception' %}
        with pytest.raises({{ case.exception }}):
            self.instance.{{ method.function_name }}(
                {%- for name, value in case.inputs.items() %}
                {{ name }}={{ value }}{% if not loop.last %}, {% endif %}
                {%- endfor %}
            )
        {% else %}
        result = self.instance.{{ method.function_name }}(
            {%- for name, value in case.inputs.items() %}
            {{ name }}={{ value }}{% if not loop.last %}, {% endif %}
            {%- endfor %}
        )
        {% if case.expected is not none %}
        assert result == {{ case.expected }}
        {% else %}
        assert result is not None
        {% endif %}
        {% endif %}
{% endfor %}
{% endfor %}

{% endfor %}
'''


class JavaScriptTestGenerator(BaseTestGenerator):
    def __init__(self, style_template: Optional[str] = None, 
                 ai_provider: str = "auto", ai_model: Optional[str] = None,
                 use_ai: bool = True):
        super().__init__(style_template, ai_provider, ai_model, use_ai)
        self.language = 'javascript'

    def generate_function_test(self, func_info: FunctionInfo, module_info: ModuleInfo, class_name: Optional[str] = None) -> GeneratedTest:
        test_cases = self._generate_test_cases(func_info, self.language)
        mocks = self._detect_mocks(func_info.body, self.language)
        
        return GeneratedTest(
            function_name=func_info.name,
            class_name=class_name,
            test_cases=test_cases,
            mocks=mocks,
            imports=[],
            coverage_branches=[]
        )

    def generate_class_test(self, class_info: ClassInfo, module_info: ModuleInfo) -> ClassTestGroup:
        method_tests = []
        for method in class_info.methods:
            if not method.name.startswith('_') or method.name == 'constructor':
                test = self.generate_function_test(method, module_info, class_name=class_info.name)
                method_tests.append(test)
        
        return ClassTestGroup(
            class_name=class_info.name,
            methods=method_tests
        )

    def render_test_file(self, func_tests: List[GeneratedTest], class_tests: List[ClassTestGroup], module_info: ModuleInfo) -> str:
        template = Template(self._get_template())
        
        imports_to_add = set()
        for test in func_tests:
            imports_to_add.add(test.function_name)
        for group in class_tests:
            imports_to_add.add(group.class_name)
        
        module_name = os.path.splitext(os.path.basename(module_info.file_path))[0]
        all_imports = []
        if imports_to_add:
            all_imports.append(f"import {{ {', '.join(sorted(imports_to_add))} }} from './{module_name}'")
        
        return template.render(
            imports=all_imports,
            func_tests=func_tests,
            class_tests=class_tests
        )

    def _get_template(self) -> str:
        if self.style_template:
            return self.style_template
        
        return '''{% for import in imports %}
{{ import }}
{% endfor %}

describe('Test Suite', () => {
{% for test in func_tests %}
  describe('{{ test.function_name }}', () => {
{% for case in test.test_cases %}
    test('{{ case.name }}', () => {
      {% if case.description %}// {{ case.description }}
      {% endif %}{% if case.type == 'exception' %}
      expect(() => {{ test.function_name }}(
        {%- for name, value in case.inputs.items() %}
        {{ value }}{% if not loop.last %}, {% endif %}
        {%- endfor %}
      )).toThrow();
      {% else %}
      const result = {{ test.function_name }}(
        {%- for name, value in case.inputs.items() %}
        {{ value }}{% if not loop.last %}, {% endif %}
        {%- endfor %}
      );
      {% if case.expected is not none %}
      expect(result).toEqual({{ case.expected }});
      {% else %}
      expect(result).toBeDefined();
      {% endif %}
      {% endif %}
    });
{% endfor %}
  });
{% endfor %}

{% for group in class_tests %}
  describe('{{ group.class_name }}', () => {
    let instance;
    
    beforeEach(() => {
      instance = new {{ group.class_name }}();
    });
{% for method in group.methods %}
    describe('{{ method.function_name }}', () => {
{% for case in method.test_cases %}
      test('{{ case.name }}', () => {
        {% if case.description %}// {{ case.description }}
        {% endif %}{% if case.type == 'exception' %}
        expect(() => instance.{{ method.function_name }}(
          {%- for name, value in case.inputs.items() %}
          {{ value }}{% if not loop.last %}, {% endif %}
          {%- endfor %}
        )).toThrow();
        {% else %}
        const result = instance.{{ method.function_name }}(
          {%- for name, value in case.inputs.items() %}
          {{ value }}{% if not loop.last %}, {% endif %}
          {%- endfor %}
        );
        {% if case.expected is not none %}
        expect(result).toEqual({{ case.expected }});
        {% else %}
        expect(result).toBeDefined();
        {% endif %}
        {% endif %}
      });
{% endfor %}
    });
{% endfor %}
  });
{% endfor %}
});
'''


def get_generator(language: str, style_template: Optional[str] = None,
                 ai_provider: str = "auto", ai_model: Optional[str] = None,
                 use_ai: bool = True):
    if language == 'python':
        return PythonTestGenerator(style_template, ai_provider, ai_model, use_ai)
    elif language == 'javascript':
        return JavaScriptTestGenerator(style_template, ai_provider, ai_model, use_ai)
    else:
        raise ValueError(f"Unsupported language: {language}")
