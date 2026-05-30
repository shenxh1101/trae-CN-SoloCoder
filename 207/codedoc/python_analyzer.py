import ast
import os
import re
from typing import List, Set, Dict, Tuple, Optional
from codedoc.config import Diagnosis, Config


PYTHON_BUILTINS = set(dir(__builtins__)) if isinstance(__builtins__, dict) else set(dir(__builtins__))
PYTHON_BUILTINS = PYTHON_BUILTINS | {
    "True", "False", "None", "print", "len", "range", "int", "str",
    "float", "list", "dict", "set", "tuple", "bool", "bytes", "type",
    "isinstance", "issubclass", "hasattr", "getattr", "setattr", "delattr",
    "property", "staticmethod", "classmethod", "super", "object",
    "Exception", "ValueError", "TypeError", "KeyError", "IndexError",
    "AttributeError", "RuntimeError", "StopIteration", "NotImplementedError",
    "ImportError", "ModuleNotFoundError", "FileNotFoundError", "OSError",
    "IOError", "ZeroDivisionError", "OverflowError", "SyntaxError",
    "NameError", "UnboundLocalError", "MemoryError", "RecursionError",
    "abs", "all", "any", "ascii", "bin", "breakpoint", "bytearray",
    "callable", "chr", "compile", "complex", "copyright", "credits",
    "delattr", "dir", "divmod", "enumerate", "eval", "exec", "exit",
    "filter", "format", "frozenset", "globals", "help", "hex", "id",
    "input", "iter", "license", "locals", "map", "max", "min", "next",
    "oct", "open", "ord", "pow", "quit", "repr", "reversed", "round",
    "sorted", "sum", "vars", "zip",
}

COMMON_MODULE_USAGE = {
    "os": ["os.path", "os.listdir", "os.makedirs", "os.environ", "os.getcwd", "os.path.exists", "os.path.join", "os.remove", "os.rename"],
    "sys": ["sys.argv", "sys.path", "sys.exit", "sys.stdout", "sys.stderr", "sys.stdin", "sys.version"],
    "json": ["json.dumps", "json.loads", "json.dump", "json.load", "json.JSONEncoder"],
    "re": ["re.match", "re.search", "re.findall", "re.sub", "re.compile", "re.split", "re.IGNORECASE"],
    "math": ["math.sqrt", "math.pi", "math.ceil", "math.floor", "math.log", "math.sin", "math.cos"],
    "datetime": ["datetime.datetime", "datetime.date", "datetime.time", "datetime.timedelta"],
    "collections": ["collections.Counter", "collections.defaultdict", "collections.OrderedDict", "collections.namedtuple", "collections.deque"],
    "pathlib": ["pathlib.Path"],
    "typing": ["typing.List", "typing.Dict", "typing.Optional", "typing.Union", "typing.Tuple", "typing.Any", "typing.Callable"],
    "itertools": ["itertools.chain", "itertools.combinations", "itertools.permutations", "itertools.product"],
    "functools": ["functools.lru_cache", "functools.partial", "functools.reduce", "functools.wraps"],
    "logging": ["logging.getLogger", "logging.basicConfig", "logging.info", "logging.error", "logging.warning"],
    "argparse": ["argparse.ArgumentParser", "argparse.add_argument"],
    "dataclasses": ["dataclasses.dataclass", "dataclasses.field", "dataclasses.asdict"],
    "hashlib": ["hashlib.md5", "hashlib.sha256", "hashlib.sha1"],
    "random": ["random.randint", "random.choice", "random.random", "random.shuffle"],
    "copy": ["copy.deepcopy", "copy.copy"],
    "enum": ["enum.Enum", "enum.IntEnum"],
    "abc": ["abc.ABC", "abc.abstractmethod"],
    "subprocess": ["subprocess.run", "subprocess.Popen", "subprocess.call"],
    "shutil": ["shutil.copy", "shutil.move", "shutil.rmtree"],
    "tempfile": ["tempfile.NamedTemporaryFile", "tempfile.mkdtemp"],
    "unittest": ["unittest.TestCase", "unittest.main"],
    "threading": ["threading.Thread", "threading.Lock", "threading.Event"],
    "multiprocessing": ["multiprocessing.Process", "multiprocessing.Pool"],
    "queue": ["queue.Queue", "queue.LifoQueue", "queue.PriorityQueue"],
    "contextlib": ["contextlib.contextmanager", "contextlib.suppress", "contextlib.closing"],
    "warnings": ["warnings.warn", "warnings.filterwarnings"],
    "traceback": ["traceback.format_exc", "traceback.print_exc"],
    "textwrap": ["textwrap.dedent", "textwrap.indent", "textwrap.wrap"],
    "operator": ["operator.itemgetter", "operator.attrgetter"],
    "csv": ["csv.reader", "csv.writer", "csv.DictReader", "csv.DictWriter"],
    "io": ["io.StringIO", "io.BytesIO"],
    "struct": ["struct.pack", "struct.unpack"],
    "string": ["string.ascii_letters", "string.digits", "string.Template"],
    "time": ["time.sleep", "time.time", "time.strftime"],
}


class PythonAnalyzer:
    def __init__(self, config: Config):
        self.config = config

    def analyze(self, filepath: str) -> List[Diagnosis]:
        diagnoses = []
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()
        except (IOError, OSError) as e:
            diagnoses.append(Diagnosis(
                file=filepath, line=0, severity="error",
                rule_id="PY-READ-ERR", message=f"无法读取文件: {e}",
                category="io", suggestion="检查文件权限和路径"
            ))
            return diagnoses

        syntax_diags = self._check_syntax(filepath, source)
        diagnoses.extend(syntax_diags)

        if syntax_diags:
            return diagnoses

        try:
            tree = ast.parse(source, filename=filepath)
        except SyntaxError:
            return diagnoses

        diagnoses.extend(self._check_undefined_vars(filepath, tree, source))
        diagnoses.extend(self._check_unused_imports(filepath, tree, source))
        diagnoses.extend(self._check_missing_imports(filepath, tree, source))
        diagnoses.extend(self._check_type_issues(filepath, tree, source))
        diagnoses.extend(self._check_style_issues(filepath, tree, source))

        return [d for d in diagnoses if not self.config.should_ignore_rule(d.rule_id)]

    def _check_syntax(self, filepath: str, source: str) -> List[Diagnosis]:
        diagnoses = []
        try:
            compile(source, filepath, "exec")
        except SyntaxError as e:
            line = e.lineno or 1
            col = e.offset or 0
            msg = str(e.msg) if e.msg else "语法错误"
            suggestion = self._syntax_fix_suggestion(e)
            diagnoses.append(Diagnosis(
                file=filepath, line=line, column=col, severity="error",
                rule_id="PY-SYNTAX", message=f"语法错误: {msg}",
                category="syntax", suggestion=suggestion
            ))
        return diagnoses

    def _syntax_fix_suggestion(self, e: SyntaxError) -> str:
        msg = (e.msg or "").lower()
        if "unexpected eof" in msg:
            return "文件可能缺少闭合的括号、引号或缩进块，请检查文件末尾"
        if "unmatched" in msg:
            return "存在不匹配的括号或引号，请检查括号/引号是否成对出现"
        if "indent" in msg:
            return "缩进不一致，请确保同一代码块使用相同的缩进（建议4个空格）"
        if "invalid syntax" in msg:
            return "存在无效语法，请检查拼写错误、遗漏的冒号或运算符"
        if "non-ascii" in msg or "encoding" in msg:
            return "文件包含非ASCII字符，请在文件开头添加编码声明: # -*- coding: utf-8 -*-"
        if "eols" in msg or "backslash" in msg:
            return "行延续符(\\)使用有误，请检查反斜杠后是否直接换行"
        return "请检查该行附近的语法，确保语句完整且格式正确"

    def _check_undefined_vars(self, filepath: str, tree: ast.AST, source: str) -> List[Diagnosis]:
        diagnoses = []
        defined_names = self._collect_definitions(tree)
        lines = source.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                name = node.id
                if name in PYTHON_BUILTINS:
                    continue
                if name in defined_names and defined_names[name] <= node.lineno:
                    continue
                if name.startswith("_") and name.endswith("_"):
                    continue
                if self._is_in_try_scope(node, tree):
                    continue
                if name not in defined_names:
                    suggestion = self._undefined_var_suggestion(name, node.lineno, defined_names, lines)
                    diagnoses.append(Diagnosis(
                        file=filepath, line=node.lineno, column=node.col_offset,
                        severity="warning", rule_id="PY-UNDEF",
                        message=f"变量 '{name}' 在使用前可能未定义",
                        category="undefined", suggestion=suggestion,
                        fixable=True,
                        fix_code=f"# 变量 '{name}' 需要在使用前初始化"
                    ))

        return diagnoses

    def _collect_definitions(self, tree: ast.AST) -> Dict[str, int]:
        defs = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                defs[node.name] = node.lineno
                for arg in node.args.args:
                    defs[arg.arg] = node.lineno
                for arg in node.args.posonlyargs:
                    defs[arg.arg] = node.lineno
                for arg in node.args.kwonlyargs:
                    defs[arg.arg] = node.lineno
                if node.args.vararg:
                    defs[node.args.vararg.arg] = node.lineno
                if node.args.kwarg:
                    defs[node.args.kwarg.arg] = node.lineno
            elif isinstance(node, ast.ClassDef):
                defs[node.name] = node.lineno
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    self._extract_names(target, defs, node.lineno)
            elif isinstance(node, ast.AnnAssign) and node.target:
                self._extract_names(node.target, defs, node.lineno)
            elif isinstance(node, ast.AugAssign):
                self._extract_names(node.target, defs, node.lineno)
            elif isinstance(node, ast.For) or isinstance(node, ast.AsyncFor):
                self._extract_names(node.target, defs, node.lineno)
            elif isinstance(node, ast.With) or isinstance(node, ast.AsyncWith):
                for item in node.items:
                    if item.optional_vars:
                        self._extract_names(item.optional_vars, defs, node.lineno)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name.split(".")[0]
                    defs[name] = node.lineno
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    defs[name] = node.lineno
            elif isinstance(node, ast.Global):
                for name in node.names:
                    defs[name] = node.lineno
            elif isinstance(node, ast.Nonlocal):
                for name in node.names:
                    defs[name] = node.lineno
            elif isinstance(node, ast.ExceptHandler):
                if node.name:
                    defs[node.name] = node.lineno
            elif isinstance(node, ast.ListComp) or isinstance(node, ast.SetComp) or isinstance(node, ast.DictComp) or isinstance(node, ast.GeneratorExp):
                for gen in node.generators:
                    self._extract_names(gen.target, defs, node.lineno)
        return defs

    def _extract_names(self, target: ast.AST, defs: Dict[str, int], lineno: int):
        if isinstance(target, ast.Name):
            defs[target.id] = lineno
        elif isinstance(target, (ast.Tuple, ast.List)):
            for elt in target.elts:
                self._extract_names(elt, defs, lineno)
        elif isinstance(target, ast.Starred):
            self._extract_names(target.value, defs, lineno)

    def _is_in_try_scope(self, node: ast.AST, tree: ast.AST) -> bool:
        for parent in ast.walk(tree):
            if isinstance(parent, ast.ExceptHandler):
                for child in ast.walk(parent):
                    if child is node:
                        return True
        return False

    def _undefined_var_suggestion(self, name: str, line: int, defined: Dict[str, int], lines: List[str]) -> str:
        if name in COMMON_MODULE_USAGE:
            return f"变量 '{name}' 可能是模块对象，建议添加: import {name}"
        similar = self._find_similar(name, defined.keys())
        if similar:
            return f"变量 '{name}' 在使用前未赋值，是否指的是 '{similar}'？否则建议在第{line}行前初始化"
        return f"变量 '{name}' 在使用前未赋值，建议在第{line}行初始化（如: {name} = None）"

    def _find_similar(self, name: str, candidates) -> Optional[str]:
        import difflib
        matches = difflib.get_close_matches(name, candidates, n=1, cutoff=0.7)
        return matches[0] if matches else None

    def _check_unused_imports(self, filepath: str, tree: ast.AST, source: str) -> List[Diagnosis]:
        diagnoses = []
        imports = {}

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name.split(".")[0]
                    imports[name] = (node.lineno, alias.name)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imports[name] = (node.lineno, f"{node.module}.{alias.name}" if node.module else alias.name)

        used_names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                root = node
                while isinstance(root, ast.Attribute):
                    root = root.value
                if isinstance(root, ast.Name):
                    used_names.add(root.id)

        for name, (lineno, full_name) in imports.items():
            if name not in used_names:
                is_main_guard = False
                for node in ast.walk(tree):
                    if isinstance(node, ast.If):
                        try:
                            test_src = ast.get_source_segment(source, node.test)
                            if test_src and "__name__" in test_src:
                                is_main_guard = True
                        except (TypeError, ValueError):
                            pass

                diagnoses.append(Diagnosis(
                    file=filepath, line=lineno, severity="info",
                    rule_id="PY-UNUSED-IMPORT",
                    message=f"导入的模块 '{full_name}' 未被使用",
                    category="unused",
                    suggestion=f"移除未使用的导入: {full_name}",
                    fixable=True,
                    fix_code=f"# 可安全删除: import {full_name}"
                ))

        return diagnoses

    def _check_missing_imports(self, filepath: str, tree: ast.AST, source: str) -> List[Diagnosis]:
        diagnoses = []
        existing_imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    existing_imports.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    existing_imports.add(node.module.split(".")[0])

        used_names = set()
        name_usage_lines = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                used_names.add(node.id)
                if node.id not in name_usage_lines:
                    name_usage_lines[node.id] = node.lineno
            elif isinstance(node, ast.Attribute):
                root = node
                attr_chain = []
                while isinstance(root, ast.Attribute):
                    attr_chain.append(root.attr)
                    root = root.value
                if isinstance(root, ast.Name):
                    full_name = root.id + "." + ".".join(reversed(attr_chain))
                    for mod_name, patterns in COMMON_MODULE_USAGE.items():
                        for pattern in patterns:
                            if full_name.startswith(pattern.split(".")[0] + "."):
                                if mod_name not in existing_imports and mod_name not in PYTHON_BUILTINS:
                                    if mod_name not in used_names:
                                        used_names.add(mod_name)
                                        name_usage_lines[mod_name] = root.lineno

        for mod_name in used_names:
            if mod_name in COMMON_MODULE_USAGE and mod_name not in existing_imports:
                lineno = name_usage_lines.get(mod_name, 1)
                diagnoses.append(Diagnosis(
                    file=filepath, line=lineno, severity="warning",
                    rule_id="PY-MISSING-IMPORT",
                    message=f"可能缺少导入: import {mod_name}",
                    category="import",
                    suggestion=f"建议在文件顶部添加: import {mod_name}",
                    fixable=True,
                    fix_code=f"import {mod_name}"
                ))

        return diagnoses

    def _check_type_issues(self, filepath: str, tree: ast.AST, source: str) -> List[Diagnosis]:
        diagnoses = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Compare):
                if isinstance(node.left, ast.Constant) and isinstance(node.left.value, bool):
                    diagnoses.append(Diagnosis(
                        file=filepath, line=node.lineno, column=node.col_offset,
                        severity="info", rule_id="PY-TYPE-BOOL-CMP",
                        message="不建议直接与布尔值比较",
                        category="type",
                        suggestion=f"使用 'if x:' 代替 'if x == True'，使用 'if not x:' 代替 'if x == False'",
                    ))
                for comp in node.comparators:
                    if isinstance(comp, ast.Constant) and isinstance(comp.value, bool):
                        diagnoses.append(Diagnosis(
                            file=filepath, line=node.lineno, column=node.col_offset,
                            severity="info", rule_id="PY-TYPE-BOOL-CMP",
                            message="不建议直接与布尔值比较",
                            category="type",
                            suggestion="使用 'if x:' 代替 'if x == True'，使用 'if not x:' 代替 'if x == False'",
                        ))

            if isinstance(node, ast.Compare):
                for op in node.ops:
                    if isinstance(op, (ast.Is, ast.IsNot)):
                        has_constant = False
                        if isinstance(node.left, ast.Constant) and not isinstance(node.left.value, (bool, type(None))):
                            has_constant = True
                        for comp in node.comparators:
                            if isinstance(comp, ast.Constant) and not isinstance(comp.value, (bool, type(None))):
                                has_constant = True
                        if has_constant:
                            diagnoses.append(Diagnosis(
                                file=filepath, line=node.lineno, column=node.col_offset,
                                severity="warning", rule_id="PY-TYPE-IS-CMP",
                                message="使用 'is' 比较非单例值可能导致意外行为",
                                category="type",
                                suggestion="使用 '==' 代替 'is' 来比较值，'is' 仅用于 None/True/False",
                            ))

            if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
                if isinstance(node.left, ast.Constant) and isinstance(node.right, ast.Constant):
                    if type(node.left.value) != type(node.right.value):
                        if isinstance(node.left.value, str) or isinstance(node.right.value, str):
                            pass
                        else:
                            diagnoses.append(Diagnosis(
                                file=filepath, line=node.lineno, column=node.col_offset,
                                severity="warning", rule_id="PY-TYPE-MISMATCH",
                                message=f"不同类型相加: {type(node.left.value).__name__} + {type(node.right.value).__name__}",
                                category="type",
                                suggestion="确保操作数类型一致，必要时添加类型转换",
                            ))

        return diagnoses

    def _check_style_issues(self, filepath: str, tree: ast.AST, source: str) -> List[Diagnosis]:
        diagnoses = []
        lines = source.splitlines()

        for i, line in enumerate(lines, 1):
            stripped = line.rstrip()
            if stripped and stripped != line:
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="info",
                    rule_id="PY-TRAILING-WS",
                    message="行尾有多余空白字符",
                    category="style",
                    suggestion="移除行尾空白字符",
                    fixable=True,
                    fix_code=stripped
                ))

            if len(line) > 120 and not line.strip().startswith("#"):
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="info",
                    rule_id="PY-LINE-LENGTH",
                    message=f"行长度超过120字符 ({len(line)}字符)",
                    category="style",
                    suggestion="将长行拆分为多行，使用括号换行或反斜杠续行",
                ))

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                if len(node.args.args) > 7:
                    diagnoses.append(Diagnosis(
                        file=filepath, line=node.lineno, severity="info",
                        rule_id="PY-TOO-MANY-ARGS",
                        message=f"函数 '{node.name}' 参数过多 ({len(node.args.args)}个)",
                        category="style",
                        suggestion="考虑将部分参数封装为数据类或使用 **kwargs",
                    ))

                body = node.body
                if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                    if isinstance(body[0].value.value, str):
                        continue
                if not body or (len(body) == 1 and isinstance(body[0], ast.Pass)):
                    pass
                elif not any(isinstance(n, ast.Return) for n in ast.walk(node)):
                    has_implicit_return = True
                    for n in ast.walk(node):
                        if isinstance(n, (ast.Raise, ast.Yield, ast.YieldFrom)):
                            has_implicit_return = False
                            break
                    if has_implicit_return and node.returns is not None:
                        diagnoses.append(Diagnosis(
                            file=filepath, line=node.lineno, severity="warning",
                            rule_id="PY-MISSING-RETURN",
                            message=f"函数 '{node.name}' 声明了返回类型但缺少return语句",
                            category="type",
                            suggestion="添加return语句或移除返回类型注解",
                        ))

        return diagnoses
