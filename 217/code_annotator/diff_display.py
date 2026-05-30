import difflib
from typing import Optional


class DiffDisplay:
    LINE_NUM_WIDTH = 6
    CONTENT_WIDTH = 80

    def __init__(self, left_width: int = None, right_width: int = None):
        self.left_width = left_width or self.CONTENT_WIDTH
        self.right_width = right_width or self.CONTENT_WIDTH

    def side_by_side(self, original: str, annotated: str,
                     left_label: str = "Original", right_label: str = "Annotated") -> str:
        orig_lines = original.splitlines()
        ann_lines = annotated.splitlines()

        separator = " | "
        header = (
            f"{left_label:<{self.left_width}}{separator}"
            f"{right_label:<{self.right_width}}"
        )
        divider = "-" * self.left_width + "-+-" + "-" * self.right_width

        output_lines = [header, divider]

        max_lines = max(len(orig_lines), len(ann_lines))
        for i in range(max_lines):
            orig_line = orig_lines[i] if i < len(orig_lines) else ""
            ann_line = ann_lines[i] if i < len(ann_lines) else ""

            orig_display = self._truncate(orig_line, self.left_width)
            ann_display = self._truncate(ann_line, self.right_width)

            marker = " "
            if i < len(orig_lines) and i < len(ann_lines):
                if orig_line != ann_line:
                    marker = "+"
            elif i >= len(orig_lines):
                marker = "+"
            else:
                marker = "-"

            line_num = f"{i + 1:>{self.LINE_NUM_WIDTH}}"
            output_lines.append(
                f"{line_num} {orig_display} {separator} {line_num} {ann_display} {marker}"
            )

        return '\n'.join(output_lines)

    def unified_diff(self, original: str, annotated: str,
                     fromfile: str = "original", tofile: str = "annotated") -> str:
        orig_lines = original.splitlines(keepends=True)
        ann_lines = annotated.splitlines(keepends=True)

        diff = difflib.unified_diff(
            orig_lines, ann_lines,
            fromfile=fromfile, tofile=tofile,
            lineterm='',
        )

        return '\n'.join(diff)

    def colored_unified_diff(self, original: str, annotated: str,
                             fromfile: str = "original", tofile: str = "annoted") -> str:
        diff_text = self.unified_diff(original, annotated, fromfile, tofile)
        colored_lines = []

        for line in diff_text.split('\n'):
            if line.startswith('+++') or line.startswith('---'):
                colored_lines.append(f"\033[1m{line}\033[0m")
            elif line.startswith('+'):
                colored_lines.append(f"\033[32m{line}\033[0m")
            elif line.startswith('-'):
                colored_lines.append(f"\033[31m{line}\033[0m")
            elif line.startswith('@@'):
                colored_lines.append(f"\033[36m{line}\033[0m")
            else:
                colored_lines.append(line)

        return '\n'.join(colored_lines)

    def _truncate(self, text: str, max_width: int) -> str:
        if len(text) > max_width:
            return text[:max_width - 3] + "..."
        return text.ljust(max_width)
