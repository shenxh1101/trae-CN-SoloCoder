import html
import os
from datetime import datetime
from typing import List, Optional

from ..detectors.base import SmellResult, Severity


SEVERITY_COLORS = {
    Severity.LOW: "#4CAF50",
    Severity.MEDIUM: "#FF9800",
    Severity.HIGH: "#F44336",
    Severity.CRITICAL: "#9C27B0",
}

SEVERITY_BG = {
    Severity.LOW: "#E8F5E9",
    Severity.MEDIUM: "#FFF3E0",
    Severity.HIGH: "#FFEBEE",
    Severity.CRITICAL: "#F3E5F5",
}

HEAT_COLORS = [
    "#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A",
    "#FFEE58", "#FFD54F", "#FFB300", "#FF8F00", "#FF6F00",
    "#F44336", "#D32F2F", "#B71C1C",
]


class HTMLReporter:
    def __init__(self, output_path: str = "smell_report.html"):
        self.output_path = output_path

    def generate(self, results: List[SmellResult], project_path: str = "",
                 debt_score: float = 0, debt_grade: str = "") -> str:
        file_results = {}
        for r in results:
            file_results.setdefault(r.location.file_path, []).append(r)

        severity_counts = {s: 0 for s in Severity}
        for r in results:
            severity_counts[r.severity] += 1

        body = self._build_header(project_path, len(results), severity_counts, debt_score, debt_grade)
        body += self._build_heat_map(file_results)
        for file_path, file_smells in sorted(file_results.items()):
            body += self._build_file_section(file_path, file_smells)
        body += self._build_footer()

        full_html = self._wrap_html(body)
        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
        return self.output_path

    def _wrap_html(self, body: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>代码异味检测报告</title>
<style>
{self._css()}
</style>
</head>
<body>
{body}
</body>
</html>"""

    def _css(self) -> str:
        return """
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.header { background: linear-gradient(135deg, #1a237e, #283593); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
.header h1 { font-size: 28px; margin-bottom: 10px; }
.header .meta { opacity: 0.9; font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
.stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
.stat-card .number { font-size: 32px; font-weight: bold; }
.stat-card .label { font-size: 13px; color: #666; margin-top: 5px; }
.debt-card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
.debt-card .grade { font-size: 64px; font-weight: bold; }
.debt-card .score { font-size: 18px; color: #666; }
.heatmap-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px; }
.heatmap-section h2 { margin-bottom: 15px; font-size: 20px; }
.heatmap-bar { display: flex; align-items: center; margin-bottom: 8px; }
.heatmap-bar .fname { width: 300px; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.heatmap-bar .bar-container { flex: 1; height: 24px; background: #eee; border-radius: 4px; overflow: hidden; }
.heatmap-bar .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; display: flex; align-items: center; padding-left: 8px; color: white; font-size: 12px; font-weight: bold; min-width: 30px; }
.file-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
.file-section h2 { font-size: 18px; margin-bottom: 15px; color: #1a237e; word-break: break-all; }
.smell-card { border-left: 4px solid; padding: 15px; margin-bottom: 15px; border-radius: 4px; background: #fafafa; }
.smell-card .smell-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.smell-card .smell-type { font-weight: bold; font-size: 16px; }
.smell-card .severity-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; color: white; font-weight: bold; }
.smell-card .location { font-size: 13px; color: #666; margin-bottom: 8px; }
.smell-card .description { margin-bottom: 8px; }
.smell-card .code-block { background: #263238; color: #eeffff; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: "Fira Code", "Consolas", monospace; font-size: 13px; line-height: 1.5; margin-bottom: 10px; white-space: pre-wrap; }
.smell-card .section-label { font-weight: bold; color: #555; margin-bottom: 4px; font-size: 13px; }
.smell-card .suggestion { background: #E3F2FD; padding: 10px; border-radius: 4px; font-size: 14px; margin-top: 8px; }
.smell-card .issue { background: #FFF3E0; padding: 10px; border-radius: 4px; font-size: 14px; margin-top: 8px; }
.footer { text-align: center; padding: 20px; color: #999; font-size: 13px; }
"""

    def _build_header(self, project_path: str, total: int,
                      severity_counts: dict, debt_score: float, debt_grade: str) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        debt_color = SEVERITY_COLORS.get(Severity.LOW, "#4CAF50")
        if debt_score > 50:
            debt_color = SEVERITY_COLORS[Severity.CRITICAL]
        elif debt_score > 30:
            debt_color = SEVERITY_COLORS[Severity.HIGH]
        elif debt_score > 15:
            debt_color = SEVERITY_COLORS[Severity.MEDIUM]

        return f"""
<div class="container">
<div class="header">
    <h1>🔍 代码异味检测报告</h1>
    <div class="meta">项目: {html.escape(project_path or 'N/A')} | 生成时间: {now}</div>
</div>

<div class="stats">
    <div class="stat-card"><div class="number" style="color:#F44336">{total}</div><div class="label">异味总数</div></div>
    <div class="stat-card"><div class="number" style="color:#9C27B0">{severity_counts.get(Severity.CRITICAL, 0)}</div><div class="label">严重</div></div>
    <div class="stat-card"><div class="number" style="color:#F44336">{severity_counts.get(Severity.HIGH, 0)}</div><div class="label">高</div></div>
    <div class="stat-card"><div class="number" style="color:#FF9800">{severity_counts.get(Severity.MEDIUM, 0)}</div><div class="label">中</div></div>
    <div class="stat-card"><div class="number" style="color:#4CAF50">{severity_counts.get(Severity.LOW, 0)}</div><div class="label">低</div></div>
</div>

<div class="debt-card">
    <div class="grade" style="color:{debt_color}">{html.escape(debt_grade)}</div>
    <div class="score">技术债务评分: {debt_score:.1f} / 100</div>
</div>
"""

    def _build_heat_map(self, file_results: dict) -> str:
        if not file_results:
            return ""

        max_count = max(len(smells) for smells in file_results.values())
        rows = ""
        sorted_files = sorted(file_results.items(), key=lambda x: len(x[1]), reverse=True)

        for file_path, smells in sorted_files:
            count = len(smells)
            ratio = count / max_count if max_count > 0 else 0
            color_idx = min(int(ratio * (len(HEAT_COLORS) - 1)), len(HEAT_COLORS) - 1)
            color = HEAT_COLORS[color_idx]
            width_pct = max(ratio * 100, 5)
            short_name = os.path.basename(file_path)

            rows += f"""
<div class="heatmap-bar">
    <div class="fname" title="{html.escape(file_path)}">{html.escape(short_name)} <span style="color:#999">({html.escape(file_path)})</span></div>
    <div class="bar-container">
        <div class="bar-fill" style="width:{width_pct:.1f}%;background:{color}">{count}</div>
    </div>
</div>"""

        return f"""
<div class="heatmap-section">
    <h2>📊 异味热力图</h2>
    {rows}
</div>
"""

    def _build_file_section(self, file_path: str, smells: List[SmellResult]) -> str:
        cards = ""
        for smell in smells:
            cards += self._build_smell_card(smell)

        return f"""
<div class="file-section">
    <h2>📄 {html.escape(file_path)} ({len(smells)} 个异味)</h2>
    {cards}
</div>
"""

    def _build_smell_card(self, smell: SmellResult) -> str:
        severity_color = SEVERITY_COLORS[smell.severity]
        severity_bg = SEVERITY_BG[smell.severity]
        border_color = severity_color
        highlighted_code = self._highlight_code(smell.code_snippet, smell.location.start_line)

        category_map = {
            "complexity": "复杂度",
            "duplication": "重复",
            "coupling": "耦合",
            "maintainability": "可维护性",
            "performance": "性能",
            "naming": "命名",
        }
        category_cn = category_map.get(smell.category.value, smell.category.value)
        severity_cn = {"low": "低", "medium": "中", "high": "高", "critical": "严重"}.get(smell.severity.value, smell.severity.value)

        return f"""
<div class="smell-card" style="border-left-color:{border_color}; background:{severity_bg}">
    <div class="smell-header">
        <span class="smell-type">{html.escape(smell.smell_type)} ({category_cn})</span>
        <span class="severity-badge" style="background:{severity_color}">{severity_cn}</span>
    </div>
    <div class="location">📍 {html.escape(str(smell.location))}</div>
    <div class="description">{html.escape(smell.description)}</div>
    <div class="section-label">代码片段:</div>
    <div class="code-block">{highlighted_code}</div>
    <div class="section-label">维护问题:</div>
    <div class="issue">{html.escape(smell.maintenance_issue)}</div>
    <div class="section-label">重构建议:</div>
    <div class="suggestion">💡 {html.escape(smell.refactoring_suggestion)}</div>
</div>
"""

    def _highlight_code(self, code: str, start_line: int = 1) -> str:
        keywords_py = {"def", "class", "if", "else", "elif", "for", "while", "return", "import",
                       "from", "try", "except", "finally", "with", "as", "self", "None", "True",
                       "False", "and", "or", "not", "in", "is", "lambda", "yield", "pass", "break",
                       "continue", "raise", "async", "await"}
        keywords_js = {"function", "const", "let", "var", "if", "else", "for", "while", "return",
                       "class", "new", "this", "typeof", "instanceof", "switch", "case", "break",
                       "try", "catch", "finally", "throw", "async", "await", "import", "export",
                       "default", "extends", "super", "yield", "null", "undefined", "true", "false"}

        lines = code.split("\n")
        result_lines = []
        for i, line in enumerate(lines):
            line_num = start_line + i
            escaped = html.escape(line)
            for kw in keywords_py | keywords_js:
                import re
                escaped = re.sub(
                    rf'\b({kw})\b',
                    r'<span style="color:#C792EA;font-weight:bold">\1</span>',
                    escaped
                )
            escaped = re.sub(
                r'(#.*)$',
                r'<span style="color:#546E7A">\1</span>',
                escaped
            )
            escaped = re.sub(
                r'(//.*)$',
                r'<span style="color:#546E7A">\1</span>',
                escaped
            )
            escaped = re.sub(
                r'(&quot;.*?&quot;|&#x27;.*?&#x27;)',
                r'<span style="color:#C3E88D">\1</span>',
                escaped
            )
            escaped = re.sub(
                r'(\b\d+\b)',
                r'<span style="color:#F78C6C">\1</span>',
                escaped
            )
            result_lines.append(f'<span style="color:#546E7A;user-select:none">{line_num:4d} │ </span>{escaped}')

        return "\n".join(result_lines)

    def _build_footer(self) -> str:
        return """
<div class="footer">
    代码异味检测报告 | 由 smell_detector 生成 | """ + datetime.now().strftime("%Y-%m-%d") + """
</div>
</div>
"""
