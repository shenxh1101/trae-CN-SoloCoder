import os
import re
import ast
from typing import List, Tuple, Optional
from codedoc.config import Diagnosis


class AutoFixer:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.applied_fixes: List[str] = []

    def fix(self, filepath: str, diagnoses: List[Diagnosis]) -> List[Tuple[Diagnosis, bool, str]]:
        results = []
        ext = os.path.splitext(filepath)[1].lower()

        if ext == ".py":
            results = self._fix_python(filepath, diagnoses)
        elif ext in (".js", ".jsx", ".mjs", ".ts", ".tsx"):
            results = self._fix_javascript(filepath, diagnoses)

        return results

    def _fix_python(self, filepath: str, diagnoses: List[Diagnosis]) -> List[Tuple[Diagnosis, bool, str]]:
        results = []
        fixable = [d for d in diagnoses if d.fixable]

        if not fixable:
            return results

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                source = f.read()
        except (IOError, OSError) as e:
            return [(d, False, f"无法读取文件: {e}") for d in fixable]

        modified = source
        missing_imports = []
        other_fixes = []

        for d in fixable:
            if d.rule_id == "PY-MISSING-IMPORT":
                missing_imports.append(d)
            else:
                other_fixes.append(d)

        if missing_imports:
            import_lines = []
            for d in missing_imports:
                if d.fix_code and d.fix_code.startswith("import "):
                    import_lines.append(d.fix_code)
            if import_lines:
                existing_imports = set()
                try:
                    tree = ast.parse(modified)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                existing_imports.add(alias.name)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                existing_imports.add(node.module)
                except SyntaxError:
                    pass

                new_imports = [line for line in import_lines if line.split()[1].split(".")[0] not in existing_imports]
                if new_imports:
                    insert_pos = self._find_import_insert_position(modified)
                    import_block = "\n".join(sorted(new_imports)) + "\n"
                    modified = modified[:insert_pos] + import_block + modified[insert_pos:]
                    for d in missing_imports:
                        results.append((d, True, f"已添加: {d.fix_code}"))
                    self.applied_fixes.append(f"{filepath}: 添加缺失的import语句")

        for d in other_fixes:
            if d.rule_id == "PY-UNUSED-IMPORT":
                success, msg = self._remove_unused_import(modified, filepath, d)
                if success:
                    modified = msg
                    results.append((d, True, f"已移除未使用的导入"))
                    self.applied_fixes.append(f"{filepath}: 移除未使用的import")
                else:
                    results.append((d, False, msg))
            elif d.rule_id == "PY-TRAILING-WS":
                lines = modified.splitlines()
                if d.line <= len(lines):
                    lines[d.line - 1] = lines[d.line - 1].rstrip()
                    modified = "\n".join(lines)
                    if not modified.endswith("\n"):
                        modified += "\n"
                    results.append((d, True, "已移除行尾空白"))
                    self.applied_fixes.append(f"{filepath}:L{d.line} 移除行尾空白")

        if modified != source and not self.dry_run:
            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(modified)
            except (IOError, OSError) as e:
                return [(d, False, f"无法写入文件: {e}") for d, _, _ in results] if results else []

        return results

    def _find_import_insert_position(self, source: str) -> int:
        lines = source.splitlines(True)
        pos = 0
        in_docstring = False
        docstring_count = 0

        for i, line in enumerate(lines):
            stripped = line.strip()

            if i == 0 and stripped.startswith("#!"):
                pos += len(line)
                continue

            if stripped.startswith("#"):
                pos += len(line)
                continue

            if not in_docstring and (stripped.startswith('"""') or stripped.startswith("'''")):
                docstring_count += stripped.count('"""') + stripped.count("'''")
                if docstring_count % 2 == 1:
                    in_docstring = True
                pos += len(line)
                continue

            if in_docstring:
                docstring_count += stripped.count('"""') + stripped.count("'''")
                if docstring_count % 2 == 0:
                    in_docstring = False
                pos += len(line)
                continue

            if stripped == "" or stripped.startswith("import ") or stripped.startswith("from "):
                pos += len(line)
                continue

            break

        return pos

    def _remove_unused_import(self, source: str, filepath: str, diag: Diagnosis) -> Tuple[bool, str]:
        lines = source.splitlines()
        target_line = None
        target_idx = None

        if 0 < diag.line <= len(lines):
            candidate = lines[diag.line - 1].strip()
            if candidate.startswith("import ") or candidate.startswith("from "):
                target_line = candidate
                target_idx = diag.line - 1

        if target_line is None:
            msg_parts = diag.message.split("'")
            if len(msg_parts) >= 2:
                search_name = msg_parts[1]
                for i, line in enumerate(lines):
                    stripped = line.strip()
                    if (stripped.startswith("import ") or stripped.startswith("from ")) and search_name in stripped:
                        target_line = stripped
                        target_idx = i
                        break

        if target_idx is not None:
            if lines[target_idx].strip().endswith("\\"):
                return False, "多行导入暂不支持自动移除"
            lines[target_idx] = ""
            modified = "\n".join(lines)
            while "\n\n\n" in modified:
                modified = modified.replace("\n\n\n", "\n\n")
            return True, modified
        return False, "无法定位导入语句"

    def _fix_javascript(self, filepath: str, diagnoses: List[Diagnosis]) -> List[Tuple[Diagnosis, bool, str]]:
        results = []
        fixable = [d for d in diagnoses if d.fixable]

        if not fixable:
            return results

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                source = f.read()
        except (IOError, OSError) as e:
            return [(d, False, f"无法读取文件: {e}") for d in fixable]

        modified = source
        lines = modified.splitlines()
        missing_requires = []

        for d in fixable:
            if d.rule_id == "JS-MISSING-REQUIRE":
                missing_requires.append(d)
            elif d.rule_id == "JS-CONSOLE":
                if d.line <= len(lines):
                    old_line = lines[d.line - 1]
                    commented = re.sub(
                        r'(\s*)(console\.\w+\([^)]*\);?)',
                        r'\1// \2',
                        old_line
                    )
                    if commented != old_line:
                        lines[d.line - 1] = commented
                        results.append((d, True, "已注释掉 console 调用"))
                        self.applied_fixes.append(f"{filepath}:L{d.line} 注释console调用")
            elif d.rule_id == "JS-DEBUGGER":
                if d.line <= len(lines):
                    lines[d.line - 1] = re.sub(r'\bdebugger\s*;?\s*$', '', lines[d.line - 1])
                    results.append((d, True, "已移除 debugger 语句"))
                    self.applied_fixes.append(f"{filepath}:L{d.line} 移除debugger")
            elif d.rule_id == "JS-VAR-DECL":
                if d.line <= len(lines):
                    lines[d.line - 1] = lines[d.line - 1].replace("var ", "let ", 1)
                    results.append((d, True, "已将 var 替换为 let"))
                    self.applied_fixes.append(f"{filepath}:L{d.line} var→let")
            elif d.rule_id == "JS-TRAILING-WS":
                if d.line <= len(lines):
                    lines[d.line - 1] = lines[d.line - 1].rstrip()
                    results.append((d, True, "已移除行尾空白"))
                    self.applied_fixes.append(f"{filepath}:L{d.line} 移除行尾空白")
            elif d.rule_id == "JS-SEMICOLON":
                if d.line <= len(lines):
                    line = lines[d.line - 1]
                    if not line.rstrip().endswith(";"):
                        lines[d.line - 1] = line.rstrip() + ";"
                        results.append((d, True, "已添加分号"))
                        self.applied_fixes.append(f"{filepath}:L{d.line} 添加分号")

        if missing_requires:
            require_lines = []
            for d in missing_requires:
                if d.fix_code and "require" in d.fix_code:
                    require_lines.append(d.fix_code)
            if require_lines:
                existing_requires = set(re.findall(r"require\(['\"]([\w@/-]+)['\"]\)", modified))
                new_requires = []
                for rl in require_lines:
                    match = re.search(r"require\(['\"]([\w@/-]+)['\"]\)", rl)
                    if match and match.group(1) not in existing_requires:
                        new_requires.append(rl)
                if new_requires:
                    insert_pos = self._find_js_require_position(lines)
                    block = "\n".join(sorted(new_requires)) + "\n"
                    lines.insert(insert_pos, block.rstrip())
                    for d in missing_requires:
                        results.append((d, True, f"已添加: {d.fix_code}"))
                    self.applied_fixes.append(f"{filepath}: 添加缺失的require语句")

        modified = "\n".join(lines)
        if modified != source and not self.dry_run:
            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(modified)
            except (IOError, OSError) as e:
                return [(d, False, f"无法写入文件: {e}") for d, _, _ in results] if results else []

        return results

    def _find_js_require_position(self, lines: List[str]) -> int:
        last_require = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('"use strict"') or stripped.startswith("'use strict'"):
                last_require = i + 1
                continue
            if stripped.startswith("//") or stripped == "":
                if last_require == i:
                    last_require = i + 1
                continue
            if "require(" in stripped or stripped.startswith("import "):
                last_require = i + 1
                continue
            if last_require > 0:
                break
        return last_require
