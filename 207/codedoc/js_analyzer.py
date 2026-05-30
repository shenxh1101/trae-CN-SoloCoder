import os
import re
from typing import List, Set, Dict, Optional, Tuple
from codedoc.config import Diagnosis, Config


JS_GLOBALS = {
    "undefined", "NaN", "Infinity", "console", "window", "document",
    "Array", "Object", "String", "Number", "Boolean", "Function",
    "Symbol", "BigInt", "Math", "Date", "RegExp", "Error",
    "EvalError", "RangeError", "ReferenceError", "SyntaxError",
    "TypeError", "URIError", "JSON", "Promise", "Map", "Set",
    "WeakMap", "WeakSet", "Proxy", "Reflect", "parseInt", "parseFloat",
    "isNaN", "isFinite", "decodeURI", "decodeURIComponent",
    "encodeURI", "encodeURIComponent", "eval", "arguments",
    "require", "module", "exports", "__dirname", "__filename",
    "process", "Buffer", "global", "setTimeout", "setInterval",
    "setImmediate", "clearTimeout", "clearInterval", "clearImmediate",
    "fetch", "Response", "Request", "Headers", "URL", "URLSearchParams",
    "TextEncoder", "TextDecoder", "AbortController", "AbortSignal",
    "alert", "confirm", "prompt", "atob", "btoa",
    "localStorage", "sessionStorage", "navigator", "location",
    "history", "screen", "performance",
}

NODEJS_GLOBALS = {
    "process", "Buffer", "global", "__dirname", "__filename",
    "require", "module", "exports", "console",
}

COMMON_JS_MODULES = {
    "fs", "path", "http", "https", "url", "util", "os", "stream",
    "crypto", "events", "child_process", "net", "dns", "querystring",
    "express", "axios", "lodash", "moment", "react", "vue",
}


class JavaScriptAnalyzer:
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
                rule_id="JS-READ-ERR", message=f"无法读取文件: {e}",
                category="io", suggestion="检查文件权限和路径"
            ))
            return diagnoses

        lines = source.splitlines()
        diagnoses.extend(self._check_bracket_balance(filepath, lines))
        diagnoses.extend(self._check_undefined_vars(filepath, source, lines))
        if self.config.get("javascript.check_console", True):
            diagnoses.extend(self._check_console_log(filepath, lines))
        if self.config.get("javascript.check_semicolons", True):
            diagnoses.extend(self._check_semicolons(filepath, lines))
        diagnoses.extend(self._check_debugger(filepath, lines))
        diagnoses.extend(self._check_var_issues(filepath, source, lines))
        diagnoses.extend(self._check_equality(filepath, lines))
        diagnoses.extend(self._check_missing_require(filepath, source, lines))
        diagnoses.extend(self._check_style_issues(filepath, lines))

        return [d for d in diagnoses if not self.config.should_ignore_rule(d.rule_id)]

    def _check_bracket_balance(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        stack = []
        pairs = {"(": ")", "[": "]", "{": "}"}
        openers = set(pairs.keys())
        closers = set(pairs.values())

        in_string = False
        string_char = None
        in_template = False
        in_comment = False
        in_line_comment = False

        for i, line in enumerate(lines, 1):
            in_line_comment = False
            j = 0
            while j < len(line):
                ch = line[j]

                if in_line_comment:
                    break

                if in_comment:
                    if ch == "*" and j + 1 < len(line) and line[j + 1] == "/":
                        in_comment = False
                        j += 2
                        continue
                    j += 1
                    continue

                if in_string:
                    if ch == "\\" and j + 1 < len(line):
                        j += 2
                        continue
                    if ch == string_char:
                        if string_char == "`" and j > 0 and line[j-1] == "\\":
                            j += 1
                            continue
                        in_string = False
                    j += 1
                    continue

                if ch in ('"', "'", "`"):
                    in_string = True
                    string_char = ch
                    j += 1
                    continue

                if ch == "/" and j + 1 < len(line):
                    if line[j + 1] == "/":
                        in_line_comment = True
                        break
                    elif line[j + 1] == "*":
                        in_comment = True
                        j += 2
                        continue

                if ch in openers:
                    stack.append((ch, i, j))
                elif ch in closers:
                    if stack:
                        opener, open_line, open_col = stack[-1]
                        if pairs.get(opener) == ch:
                            stack.pop()
                        else:
                            diagnoses.append(Diagnosis(
                                file=filepath, line=i, column=j,
                                severity="error", rule_id="JS-BRACKET-MISMATCH",
                                message=f"不匹配的 '{ch}'，期望 '{pairs.get(stack[-1][0], '?')}'",
                                category="syntax",
                                suggestion=f"第{open_line}行的 '{opener}' 对应的应该是 '{pairs[opener]}'"
                            ))
                            stack.pop()
                    else:
                        diagnoses.append(Diagnosis(
                            file=filepath, line=i, column=j,
                            severity="error", rule_id="JS-BRACKET-EXTRA",
                            message=f"多余的 '{ch}'",
                            category="syntax",
                            suggestion=f"移除多余的 '{ch}' 或补充对应的开启括号"
                        ))
                j += 1

        for opener, open_line, open_col in stack:
            diagnoses.append(Diagnosis(
                file=filepath, line=open_line, column=open_col,
                severity="error", rule_id="JS-BRACKET-UNCLOSED",
                message=f"未闭合的 '{opener}'",
                category="syntax",
                suggestion=f"在适当位置添加闭合的 '{pairs[opener]}'"
            ))

        return diagnoses

    def _check_undefined_vars(self, filepath: str, source: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        declared: Dict[str, int] = {}

        for match in re.finditer(
            r'(?:var|let|const)\s+([\w$]+)', source
        ):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            declared[name] = lineno

        for match in re.finditer(
            r'function\s+([\w$]+)\s*\(([^)]*)\)', source
        ):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            declared[name] = lineno
            for param in re.findall(r'([\w$]+)', match.group(2)):
                declared[param] = lineno

        for match in re.finditer(
            r'function\s*\(([^)]*)\)', source
        ):
            lineno = source[:match.start()].count("\n") + 1
            for param in re.findall(r'([\w$]+)', match.group(1)):
                declared[param] = lineno

        for match in re.finditer(
            r'(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>', source
        ):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            declared[name] = lineno
            for param in re.findall(r'([\w$]+)', match.group(2)):
                declared[param] = lineno

        for match in re.finditer(
            r'(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?([\w$]+)\s*=>', source
        ):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            declared[name] = lineno
            declared[match.group(2)] = lineno

        for match in re.finditer(
            r'(?:class|interface|type|enum)\s+([\w$]+)', source
        ):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            declared[name] = lineno

        usage_pattern = re.compile(r'\b([\w$]+)\b')
        seen = set()

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
                continue

            for match in usage_pattern.finditer(line):
                name = match.group(1)
                if name in JS_GLOBALS or name in declared:
                    continue
                if name.startswith("_"):
                    continue
                if name in ("var", "let", "const", "function", "class", "return",
                            "if", "else", "for", "while", "do", "switch", "case",
                            "break", "continue", "try", "catch", "finally", "throw",
                            "new", "typeof", "instanceof", "in", "of", "async",
                            "await", "yield", "import", "export", "from", "default",
                            "extends", "super", "this", "null", "true", "false",
                            "delete", "void", "with", "debugger", "static", "get",
                            "set", "constructor", "const", "let"):
                    continue
                if name.isdigit():
                    continue

                key = (name, i)
                if key not in seen:
                    seen.add(key)
                    similar = self._find_similar_js(name, declared)
                    if similar:
                        suggestion = f"变量 '{name}' 未声明，是否指的是 '{similar}'？否则请使用 var/let/const 声明"
                    else:
                        suggestion = f"变量 '{name}' 可能未声明，建议使用 var/let/const 在使用前声明"
                    diagnoses.append(Diagnosis(
                        file=filepath, line=i, column=match.start(),
                        severity="warning", rule_id="JS-UNDEF",
                        message=f"变量 '{name}' 可能未声明",
                        category="undefined", suggestion=suggestion,
                        fixable=True,
                        fix_code=f"let {name};"
                    ))

        return diagnoses

    def _find_similar_js(self, name: str, declared: Dict[str, int]) -> Optional[str]:
        import difflib
        matches = difflib.get_close_matches(name, declared.keys(), n=1, cutoff=0.7)
        return matches[0] if matches else None

    def _check_console_log(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        in_comment = False
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//"):
                continue
            if "/*" in line:
                in_comment = True
            if "*/" in line:
                in_comment = False
                continue
            if in_comment:
                continue

            if re.search(r'\bconsole\.(log|debug|info|warn|error|trace)\s*\(', line):
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="info",
                    rule_id="JS-CONSOLE",
                    message="发现 console 调用，生产代码中应移除",
                    category="style",
                    suggestion="移除 console 调用或使用专门的日志库替代",
                    fixable=True,
                    fix_code=""
                ))
        return diagnoses

    def _check_semicolons(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        in_comment = False
        stmt_patterns = [
            re.compile(r'^\s*(?:var|let|const)\s+.+(?<!;)$'),
            re.compile(r'^\s*(?:return\s+.+)(?<!;)$'),
            re.compile(r'^\s*(?:throw\s+.+)(?<!;)$'),
            re.compile(r'^\s*(?:break|continue)(?<!;)$'),
        ]

        for i, line in enumerate(lines, 1):
            stripped = line.rstrip()
            if not stripped or stripped.strip().startswith("//"):
                continue
            if "/*" in line:
                in_comment = True
            if "*/" in line:
                in_comment = False
                continue
            if in_comment:
                continue

            for pattern in stmt_patterns:
                if pattern.match(stripped) and not stripped.endswith("{") and not stripped.endswith(",") and not stripped.endswith("\\"):
                    diagnoses.append(Diagnosis(
                        file=filepath, line=i, severity="info",
                        rule_id="JS-SEMICOLON",
                        message="语句缺少分号",
                        category="style",
                        suggestion=f"在行尾添加分号: {stripped};",
                        fixable=True,
                        fix_code=stripped + ";"
                    ))
                    break
        return diagnoses

    def _check_debugger(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        for i, line in enumerate(lines, 1):
            if re.search(r'\bdebugger\s*;?\s*$', line.strip()):
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="warning",
                    rule_id="JS-DEBUGGER",
                    message="发现 debugger 语句",
                    category="debug",
                    suggestion="移除 debugger 语句，生产代码中不应包含调试断点",
                    fixable=True,
                    fix_code=""
                ))
        return diagnoses

    def _check_var_issues(self, filepath: str, source: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        for match in re.finditer(r'\bvar\s+([\w$]+)', source):
            name = match.group(1)
            lineno = source[:match.start()].count("\n") + 1
            diagnoses.append(Diagnosis(
                file=filepath, line=lineno, severity="info",
                rule_id="JS-VAR-DECL",
                message=f"使用了 'var' 声明变量 '{name}'",
                category="style",
                suggestion=f"建议使用 'const' 或 'let' 替代 'var'，以获得块级作用域",
                fixable=True,
                fix_code=f"let {name}"
            ))
        return diagnoses

    def _check_equality(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        in_comment = False
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//"):
                continue
            if "/*" in line:
                in_comment = True
            if "*/" in line:
                in_comment = False
                continue
            if in_comment:
                continue

            if re.search(r'[^=!]==[^=]', line) and "===" not in line:
                match = re.search(r'([^=!])={2}([^=])', line)
                if match:
                    diagnoses.append(Diagnosis(
                        file=filepath, line=i, severity="warning",
                        rule_id="JS-EQUALITY",
                        message="使用了 == 而非 === 进行比较",
                        category="type",
                        suggestion="建议使用 === 进行严格相等比较，避免类型强制转换",
                        fixable=True,
                        fix_code=line.replace("==", "===").replace("!==", "!=").replace("!===","!==")
                    ))
            if re.search(r'[^!]!=[^=]', line) and "!==" not in line:
                match = re.search(r'([^!])!={1}([^=])', line)
                if match:
                    diagnoses.append(Diagnosis(
                        file=filepath, line=i, severity="warning",
                        rule_id="JS-EQUALITY",
                        message="使用了 != 而非 !== 进行比较",
                        category="type",
                        suggestion="建议使用 !== 进行严格不等比较，避免类型强制转换",
                        fixable=True,
                        fix_code=line.replace("!=", "!==")
                    ))
        return diagnoses

    def _check_missing_require(self, filepath: str, source: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        imported = set()
        for match in re.finditer(r'(?:require|import)\s*\(?[\'"]([\w@/-]+)[\'"]', source):
            imported.add(match.group(1).split("/")[0].split("@")[0])

        usage_patterns = {
            "fs": [r'\bfs\.\w+'],
            "path": [r'\bpath\.\w+'],
            "http": [r'\bhttp\.\w+'],
            "https": [r'\bhttps\.\w+'],
            "os": [r'\bos\.\w+'],
            "util": [r'\butil\.\w+'],
            "crypto": [r'\bcrypto\.\w+'],
            "events": [r'\bEventEmitter\b'],
            "stream": [r'\b(?:Readable|Writable|Transform|Duplex|Stream)\b'],
            "child_process": [r'\b(?:exec|spawn|fork|execFile|execSync)\s*\('],
            "url": [r'\bURL\b'],
            "buffer": [r'\bBuffer\.\w+'],
            "process": [r'\bprocess\.\w+'],
        }

        for mod_name, patterns in usage_patterns.items():
            if mod_name in imported:
                continue
            if mod_name in ("process", "buffer", "url") and mod_name in NODEJS_GLOBALS:
                continue
            for pattern in patterns:
                if re.search(pattern, source):
                    lineno = 1
                    for i, line in enumerate(lines, 1):
                        if re.search(pattern, line):
                            lineno = i
                            break
                    diagnoses.append(Diagnosis(
                        file=filepath, line=lineno, severity="warning",
                        rule_id="JS-MISSING-REQUIRE",
                        message=f"可能缺少模块导入: {mod_name}",
                        category="import",
                        suggestion=f"建议在文件顶部添加: const {mod_name} = require('{mod_name}');",
                        fixable=True,
                        fix_code=f"const {mod_name} = require('{mod_name}');"
                    ))
                    break
        return diagnoses

    def _check_style_issues(self, filepath: str, lines: List[str]) -> List[Diagnosis]:
        diagnoses = []
        for i, line in enumerate(lines, 1):
            stripped = line.rstrip()
            if stripped and stripped != line:
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="info",
                    rule_id="JS-TRAILING-WS",
                    message="行尾有多余空白字符",
                    category="style",
                    suggestion="移除行尾空白字符",
                    fixable=True,
                    fix_code=stripped
                ))
            if len(line) > 120 and not line.strip().startswith("//"):
                diagnoses.append(Diagnosis(
                    file=filepath, line=i, severity="info",
                    rule_id="JS-LINE-LENGTH",
                    message=f"行长度超过120字符 ({len(line)}字符)",
                    category="style",
                    suggestion="将长行拆分为多行",
                ))
        return diagnoses
