import ast
import os
import re
from typing import List, Optional, Dict

from .detectors.base import SmellResult


KEYWORD_TO_FUNCTION_NAME = {
    "validate": "validate_items",
    "valid": "validate_items",
    "schema": "validate_schema",
    "filter": "filter_items",
    "transform": "transform_items",
    "convert": "convert_items",
    "parse": "parse_items",
    "process": "process_items",
    "clean": "clean_items",
    "format": "format_items",
    "flatten": "flatten_items",
    "extract": "extract_data",
    "build": "build_result",
    "create": "create_items",
    "generate": "generate_output",
    "save": "save_result",
    "load": "load_data",
    "read": "read_data",
    "write": "write_data",
    "send": "send_data",
    "receive": "receive_data",
    "handle": "handle_item",
    "update": "update_item",
    "delete": "delete_item",
    "remove": "filter_items",
    "add": "add_metadata",
    "append": "add_metadata",
    "insert": "add_item",
    "get": "get_item",
    "fetch": "fetch_data",
    "retrieve": "retrieve_data",
    "calculate": "calculate_value",
    "compute": "compute_metric",
    "sum": "calculate_sum",
    "total": "calculate_total",
    "count": "count_items",
    "sort": "sort_items",
    "order": "sort_items",
    "merge": "merge_items",
    "combine": "combine_items",
    "group": "group_items",
    "map": "map_items",
    "reduce": "reduce_items",
    "metadata": "add_metadata",
    "meta": "add_metadata",
    "raw": "process_raw_items",
    "input": "process_input",
    "output": "prepare_output",
    "final": "finalize_result",
    "result": "prepare_result",
    "item": "process_item",
    "record": "process_record",
    "data": "process_data",
    "list": "process_list",
    "dict": "process_dict",
    "string": "process_string",
    "str": "process_string",
    "field": "filter_by_field",
    "fields": "filter_by_fields",
    "return": "return_result",
}


class AutoFixer:
    def __init__(self):
        self.max_function_lines = 45
        self.min_split_lines = 15
        self.target_split_size = 35

    def fix(self, results: List[SmellResult], dry_run: bool = True) -> List[dict]:
        fixes = []
        for result in results:
            if result.smell_type == "long_function":
                fix_info = self._fix_long_function(result, dry_run)
                if fix_info:
                    fixes.append(fix_info)
        return fixes

    def _fix_long_function(self, result: SmellResult, dry_run: bool) -> Optional[dict]:
        file_path = result.location.file_path
        ext = os.path.splitext(file_path)[1]

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except IOError:
            return None

        lines = content.splitlines(True)

        if ext == ".py":
            return self._fix_python_long_function(file_path, content, lines, result, dry_run)
        return None

    def _fix_python_long_function(self, file_path: str, content: str,
                                   lines: List[str], result: SmellResult,
                                   dry_run: bool) -> Optional[dict]:
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return None

        target_node = None
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.lineno == result.location.start_line:
                    target_node = node
                    break

        if target_node is None:
            return None

        func_lines = lines[target_node.lineno - 1:target_node.end_lineno]
        original_lines = len(func_lines)
        if original_lines < 10:
            return None

        param_names = [a.arg for a in target_node.args.args]
        indent = self._get_indent(func_lines[0])

        split_info = self._smart_split_function(func_lines, target_node.name, param_names, indent)
        if not split_info:
            return {
                "file": file_path,
                "type": "long_function",
                "status": "skipped",
                "function": target_node.name,
                "reason": "无法找到合适的拆分点，建议手动重构",
                "dry_run": dry_run,
            }

        new_func_body = split_info["main_body"]
        new_functions = split_info["new_functions"]

        new_content_lines = (lines[:target_node.lineno - 1]
                             + new_func_body
                             + ["\n"]
                             + new_functions
                             + lines[target_node.end_lineno:])
        new_content = "".join(new_content_lines)

        try:
            ast.parse(new_content)
        except SyntaxError as e:
            return {
                "file": file_path,
                "type": "long_function",
                "status": "skipped",
                "function": target_node.name,
                "reason": f"自动拆分后语法检查失败: {e}",
                "dry_run": dry_run,
            }

        if not dry_run:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)

        return {
            "file": file_path,
            "type": "long_function",
            "status": "fixed" if not dry_run else "preview",
            "function": target_node.name,
            "original_lines": original_lines,
            "new_functions": split_info["function_names"],
            "split_points": split_info["split_points"],
            "dry_run": dry_run,
        }

    def _smart_split_function(self, func_lines: List[str], func_name: str,
                               param_names: List[str], indent: str) -> Optional[dict]:
        blocks = self._identify_code_blocks(func_lines)

        if len(blocks) < 2:
            return None

        new_functions_code = []
        new_function_names = []
        split_points = []

        main_body = list(func_lines[:blocks[0]["end"] + 1])
        current_block_end = blocks[0]["end"]

        for i, block in enumerate(blocks[1:], 1):
            block_lines = func_lines[block["start"]:block["end"] + 1]
            block_len = len(block_lines)
            if block_len < self.min_split_lines:
                main_body.extend(block_lines)
                current_block_end = block["end"]
                continue

            fn_name = self._generate_function_name(block, func_name, i, new_function_names)
            new_fn, call_line = self._create_extracted_function(
                fn_name, block_lines, param_names, indent
            )
            new_functions_code.append(new_fn)
            new_function_names.append(fn_name)
            split_points.append(block["start"])

            if main_body and main_body[-1].strip() != "":
                main_body.append("\n")
            main_body.append(call_line)
            current_block_end = block["end"]

        if current_block_end < len(func_lines) - 1:
            remaining = func_lines[current_block_end + 1:]
            if len(remaining) > 0 and any(l.strip() for l in remaining):
                main_body.extend(remaining)

        return {
            "main_body": main_body,
            "new_functions": new_functions_code,
            "function_names": new_function_names,
            "split_points": split_points,
        }

    def _identify_code_blocks(self, func_lines: List[str]) -> List[Dict]:
        blocks = []
        block_start = 1
        block_start_indent = self._get_indent(func_lines[1]) if len(func_lines) > 1 else ""

        for i in range(2, len(func_lines)):
            line = func_lines[i]
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            line_indent = self._get_indent(line)
            is_loop_or_if = (stripped.startswith("for ") or stripped.startswith("while ")
                           or stripped.startswith("if ") or stripped.startswith("elif ")
                           or stripped.startswith("else:"))

            if is_loop_or_if and len(line_indent) <= len(block_start_indent):
                block_size = i - block_start
                if block_size >= self.target_split_size:
                    blocks.append({
                        "start": block_start,
                        "end": i - 1,
                        "text": "".join(func_lines[block_start:i]),
                    })
                    block_start = i
                    block_start_indent = line_indent

        remaining_size = len(func_lines) - block_start
        if remaining_size >= self.min_split_lines:
            blocks.append({
                "start": block_start,
                "end": len(func_lines) - 1,
                "text": "".join(func_lines[block_start:]),
            })

        if len(blocks) >= 2:
            return blocks

        blocks = []
        current_pos = 1
        while current_pos < len(func_lines) - 1:
            next_split = min(current_pos + self.target_split_size, len(func_lines) - 1)
            best_split = self._find_best_split_point(func_lines, next_split)
            if best_split is None or best_split <= current_pos + self.min_split_lines:
                break
            blocks.append({
                "start": current_pos,
                "end": best_split,
                "text": "".join(func_lines[current_pos:best_split + 1]),
            })
            current_pos = best_split + 1

        if current_pos < len(func_lines) - 1:
            remaining = len(func_lines) - current_pos
            if remaining >= self.min_split_lines:
                blocks.append({
                    "start": current_pos,
                    "end": len(func_lines) - 1,
                    "text": "".join(func_lines[current_pos:]),
                })
            elif blocks:
                blocks[-1]["end"] = len(func_lines) - 1
                blocks[-1]["text"] = "".join(func_lines[blocks[-1]["start"]:])

        return blocks

    def _generate_function_name(self, block: Dict, parent_name: str, index: int,
                                 existing_names: List[str]) -> str:
        text = block["text"].lower()

        for keyword, fn_name in KEYWORD_TO_FUNCTION_NAME.items():
            if keyword in text:
                candidate = f"_{parent_name}_{fn_name}"
                if candidate not in existing_names:
                    return candidate
                suffix = 2
                while f"{candidate}_{suffix}" in existing_names:
                    suffix += 1
                return f"{candidate}_{suffix}"

        keywords = ["result", "item", "data", "list", "output", "input"]
        for kw in keywords:
            if kw in text:
                candidate = f"_{parent_name}_process_{kw}s"
                if candidate not in existing_names:
                    return candidate

        stage_names = ["extract_data", "transform_items", "validate_result", "filter_items", "finalize_output", "prepare_metadata"]
        for name in stage_names:
            candidate = f"_{parent_name}_{name}"
            if candidate not in existing_names:
                return candidate

        return f"_{parent_name}_step_{index + 1}"

    def _create_extracted_function(self, fn_name: str, block_lines: List[str],
                                    param_names: List[str], indent: str) -> tuple:
        used_vars = self._detect_used_variables(block_lines)
        used_params = [p for p in param_names if p in used_vars]

        has_result_var = "result" in used_vars
        has_processed_var = "processed" in used_vars
        has_validated_var = "validated" in used_vars
        has_transformed_var = "transformed" in used_vars
        has_filtered_var = "filtered" in used_vars
        has_final_output_var = "final_output" in used_vars
        has_return = any(line.strip().startswith("return") for line in block_lines)

        extra_params = []
        if has_result_var:
            extra_params.append("result")
        if has_processed_var:
            extra_params.append("processed")
        if has_validated_var:
            extra_params.append("validated")
        if has_transformed_var:
            extra_params.append("transformed")
        if has_filtered_var:
            extra_params.append("filtered")
        if has_final_output_var:
            extra_params.append("final_output")

        all_params = used_params + extra_params
        param_list = ", ".join(all_params)

        new_fn = f"\n{indent}def {fn_name}({param_list}):\n"

        body_indent = indent + "    "
        for line in block_lines:
            if line.strip():
                if not line.startswith(indent):
                    new_fn += body_indent + line.lstrip()
                else:
                    new_fn += line
            else:
                new_fn += "\n"

        if not has_return:
            if has_final_output_var:
                new_fn += f"{body_indent}return final_output\n"
            elif has_filtered_var:
                new_fn += f"{body_indent}return filtered\n"
            elif has_transformed_var:
                new_fn += f"{body_indent}return transformed\n"
            elif has_validated_var:
                new_fn += f"{body_indent}return validated\n"
            elif has_result_var:
                new_fn += f"{body_indent}return result\n"
            elif has_processed_var:
                new_fn += f"{body_indent}return processed\n"

        call_args = ", ".join(all_params)
        if has_return or has_result_var or has_processed_var:
            call_line = f"{indent}    return {fn_name}({call_args})\n"
        else:
            call_line = f"{indent}    return {fn_name}({call_args})\n"

        return new_fn, call_line

    def _detect_used_variables(self, lines: List[str]) -> set:
        variables = set()
        for line in lines:
            tokens = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', line)
            for t in tokens:
                if t not in {"if", "else", "elif", "for", "while", "return", "in", "is",
                             "and", "or", "not", "True", "False", "None", "def", "class",
                             "import", "from", "as", "try", "except", "finally", "with",
                             "self", "None", "len", "str", "int", "float", "list", "dict",
                             "bool", "range", "enumerate", "zip", "map", "filter", "sorted",
                             "reversed", "min", "max", "sum", "any", "all"}:
                    variables.add(t)
        return variables

    def _find_best_split_point(self, func_lines: List[str], mid: int) -> Optional[int]:
        search_range = min(15, len(func_lines) // 4)
        for offset in range(search_range):
            for direction in [1, -1]:
                idx = mid + offset * direction
                if 2 <= idx < len(func_lines) - 2:
                    line = func_lines[idx].strip()
                    if line.startswith("return ") or line.startswith("return("):
                        continue
                    if line.startswith("#"):
                        return idx
                    if line == "" or line == ";":
                        prev = func_lines[idx - 1].strip() if idx > 0 else ""
                        if prev and not prev.endswith((":", "\\", "{", "(", "[")):
                            return idx
        return None

    def _get_indent(self, line: str) -> str:
        return line[:len(line) - len(line.lstrip())]
