import ast
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import esprima


@dataclass
class Parameter:
    name: str
    type_hint: Optional[str] = None
    default_value: Optional[str] = None


@dataclass
class FunctionInfo:
    name: str
    parameters: List[Parameter]
    return_type: Optional[str] = None
    docstring: Optional[str] = None
    body: str = ""
    is_method: bool = False
    is_static: bool = False
    is_classmethod: bool = False
    decorators: List[str] = None
    start_line: int = 0
    end_line: int = 0


@dataclass
class ClassInfo:
    name: str
    methods: List[FunctionInfo]
    docstring: Optional[str] = None
    bases: List[str] = None
    start_line: int = 0
    end_line: int = 0


@dataclass
class ModuleInfo:
    file_path: str
    language: str
    functions: List[FunctionInfo]
    classes: List[ClassInfo]
    imports: List[str] = None


class PythonParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        with open(file_path, 'r', encoding='utf-8') as f:
            self.source = f.read()
        self.tree = ast.parse(self.source)
        self.lines = self.source.split('\n')

    def _get_docstring(self, node) -> Optional[str]:
        return ast.get_docstring(node)

    def _get_decorators(self, node) -> List[str]:
        decorators = []
        for dec in node.decorator_list:
            if isinstance(dec, ast.Name):
                decorators.append(dec.id)
            elif isinstance(dec, ast.Attribute):
                decorators.append(f"{dec.value.id}.{dec.attr}")
            elif isinstance(dec, ast.Call):
                if isinstance(dec.func, ast.Name):
                    decorators.append(dec.func.id)
                elif isinstance(dec.func, ast.Attribute):
                    decorators.append(f"{dec.func.value.id}.{dec.func.attr}")
        return decorators

    def _get_parameters(self, node) -> List[Parameter]:
        params = []
        args = node.args
        
        all_args = args.args + args.kwonlyargs
        defaults = list(args.defaults)
        kw_defaults = list(args.kw_defaults)
        
        num_args = len(args.args)
        num_defaults = len(defaults)
        default_offset = num_args - num_defaults
        
        for i, arg in enumerate(all_args):
            param = Parameter(name=arg.arg)
            if arg.annotation:
                param.type_hint = ast.unparse(arg.annotation)
            
            if i < num_args:
                if i >= default_offset:
                    default_idx = i - default_offset
                    if defaults[default_idx]:
                        param.default_value = ast.unparse(defaults[default_idx])
            else:
                kw_idx = i - num_args
                if kw_defaults[kw_idx]:
                    param.default_value = ast.unparse(kw_defaults[kw_idx])
            
            params.append(param)
        
        return params

    def _get_return_type(self, node) -> Optional[str]:
        if node.returns:
            return ast.unparse(node.returns)
        return None

    def _get_function_body(self, node) -> str:
        if not node.body:
            return ""
        start_line = node.body[0].lineno - 1
        end_line = node.end_lineno
        return '\n'.join(self.lines[start_line:end_line])

    def _parse_function(self, node, is_method: bool = False) -> FunctionInfo:
        decorators = self._get_decorators(node)
        func_info = FunctionInfo(
            name=node.name,
            parameters=self._get_parameters(node),
            return_type=self._get_return_type(node),
            docstring=self._get_docstring(node),
            body=self._get_function_body(node),
            is_method=is_method,
            is_static='staticmethod' in decorators,
            is_classmethod='classmethod' in decorators,
            decorators=decorators,
            start_line=node.lineno,
            end_line=node.end_lineno
        )
        return func_info

    def _parse_class(self, node) -> ClassInfo:
        methods = []
        bases = []
        
        for base in node.bases:
            if isinstance(base, ast.Name):
                bases.append(base.id)
            elif isinstance(base, ast.Attribute):
                bases.append(f"{base.value.id}.{base.attr}")
        
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                methods.append(self._parse_function(item, is_method=True))
        
        return ClassInfo(
            name=node.name,
            methods=methods,
            docstring=self._get_docstring(node),
            bases=bases,
            start_line=node.lineno,
            end_line=node.end_lineno
        )

    def parse(self) -> ModuleInfo:
        functions = []
        classes = []
        imports = []
        
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(f"import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                names = ", ".join(a.name for a in node.names)
                imports.append(f"from {module} import {names}")
        
        for node in self.tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append(self._parse_function(node))
            elif isinstance(node, ast.ClassDef):
                classes.append(self._parse_class(node))
        
        return ModuleInfo(
            file_path=self.file_path,
            language='python',
            functions=functions,
            classes=classes,
            imports=imports
        )


class JavaScriptParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        with open(file_path, 'r', encoding='utf-8') as f:
            self.source = f.read()
        self.tree = esprima.parseScript(self.source, loc=True)
        self.lines = self.source.split('\n')

    def _get_node_source(self, node_dict) -> str:
        if 'loc' not in node_dict:
            return ""
        loc = node_dict['loc']
        start = loc['start']
        end = loc['end']
        if start['line'] == end['line']:
            return self.lines[start['line'] - 1][start['column']:end['column']]
        
        lines = []
        lines.append(self.lines[start['line'] - 1][start['column']:])
        for i in range(start['line'], end['line'] - 1):
            lines.append(self.lines[i])
        lines.append(self.lines[end['line'] - 1][:end['column']])
        return '\n'.join(lines)

    def _get_parameters(self, params_list) -> List[Parameter]:
        result = []
        for param in params_list:
            param_type = param.get('type')
            if param_type == 'Identifier':
                result.append(Parameter(name=param.get('name', '')))
            elif param_type == 'AssignmentPattern':
                left = param.get('left', {})
                right = param.get('right', {})
                result.append(Parameter(
                    name=left.get('name', ''),
                    default_value=self._get_node_source(right)
                ))
            elif param_type == 'RestElement':
                arg = param.get('argument', {})
                result.append(Parameter(name=f"...{arg.get('name', '')}"))
        return result

    def _parse_function(self, node_dict, is_method: bool = False, method_name: str = None) -> FunctionInfo:
        func_id = node_dict.get('id', {})
        name = method_name or (func_id.get('name') if func_id else 'anonymous')
        loc = node_dict.get('loc', {})
        start = loc.get('start', {})
        end = loc.get('end', {})
        
        body_node = node_dict.get('body', {})
        body_source = self._get_node_source(body_node)
        
        return FunctionInfo(
            name=name or 'anonymous',
            parameters=self._get_parameters(node_dict.get('params', [])),
            body=body_source,
            is_method=is_method,
            start_line=start.get('line', 0),
            end_line=end.get('line', 0)
        )

    def _parse_class(self, node_dict) -> ClassInfo:
        methods = []
        
        class_body = node_dict.get('body', {})
        body_list = class_body.get('body', [])
        
        for item in body_list:
            if item.get('type') == 'MethodDefinition':
                key = item.get('key', {})
                value = item.get('value', {})
                method_info = self._parse_function(
                    value,
                    is_method=True,
                    method_name=key.get('name')
                )
                method_info.is_static = item.get('static', False)
                methods.append(method_info)
        
        bases = []
        super_class = node_dict.get('superClass')
        if super_class and super_class.get('type') == 'Identifier':
            bases.append(super_class.get('name', ''))
        
        class_id = node_dict.get('id', {})
        loc = node_dict.get('loc', {})
        start = loc.get('start', {})
        end = loc.get('end', {})
        
        return ClassInfo(
            name=class_id.get('name', 'Anonymous'),
            methods=methods,
            bases=bases,
            start_line=start.get('line', 0),
            end_line=end.get('line', 0)
        )

    def parse(self) -> ModuleInfo:
        functions = []
        classes = []
        imports = []
        
        tree_dict = self.tree.toDict()
        
        program_body = tree_dict.get('body', [])
        
        for node in program_body:
            node_type = node.get('type')
            
            if node_type == 'FunctionDeclaration':
                functions.append(self._parse_function(node))
            
            elif node_type == 'ClassDeclaration':
                classes.append(self._parse_class(node))
            
            elif node_type == 'VariableDeclaration':
                for decl in node.get('declarations', []):
                    init = decl.get('init')
                    if init and init.get('type') == 'FunctionExpression':
                        decl_id = decl.get('id', {})
                        func = self._parse_function(init)
                        func.name = decl_id.get('name', func.name)
                        functions.append(func)
            
            elif node_type == 'ExpressionStatement':
                expr = node.get('expression', {})
                if expr.get('type') == 'AssignmentExpression':
                    right = expr.get('right', {})
                    if right.get('type') == 'FunctionExpression':
                        left = expr.get('left', {})
                        if left.get('type') == 'MemberExpression':
                            prop = left.get('property', {})
                            func = self._parse_function(right)
                            func.name = prop.get('name', func.name)
                            # 不添加prototype方法到顶层functions
        
        return ModuleInfo(
            file_path=self.file_path,
            language='javascript',
            functions=functions,
            classes=classes,
            imports=imports
        )


def parse_file(file_path: str) -> ModuleInfo:
    _, ext = os.path.splitext(file_path)
    if ext in ['.py']:
        parser = PythonParser(file_path)
    elif ext in ['.js', '.jsx', '.ts', '.tsx']:
        parser = JavaScriptParser(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    
    return parser.parse()


def find_functions(module_info: ModuleInfo, function_name: str = None) -> List[FunctionInfo]:
    results = []
    
    for func in module_info.functions:
        if function_name is None or func.name == function_name:
            results.append(func)
    
    for cls in module_info.classes:
        for method in cls.methods:
            if function_name is None or method.name == function_name:
                results.append(method)
    
    return results
