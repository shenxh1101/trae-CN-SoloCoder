import json
import os
import datetime
from typing import List
from codedoc.config import ScanResult, Diagnosis, ComplexityResult


SEVERITY_EMOJI = {"error": "🔴", "warning": "🟡", "info": "🔵"}
SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}


class JSONReporter:
    def generate(self, results: List[ScanResult], output_path: str):
        data = {
            "tool": "CodeDoc",
            "version": "1.0.0",
            "generated_at": datetime.datetime.now().isoformat(),
            "summary": self._summary(results),
            "results": [r.to_dict() for r in results],
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _summary(self, results: List[ScanResult]) -> dict:
        total = 0
        errors = 0
        warnings = 0
        infos = 0
        for r in results:
            for d in r.diagnoses:
                total += 1
                if d.severity == "error":
                    errors += 1
                elif d.severity == "warning":
                    warnings += 1
                else:
                    infos += 1
        return {
            "files_scanned": len(results),
            "total_issues": total,
            "errors": errors,
            "warnings": warnings,
            "info": infos,
        }


class MarkdownReporter:
    def generate(self, results: List[ScanResult], output_path: str):
        lines = []
        lines.append("# CodeDoc 代码诊断报告")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        summary = JSONReporter()._summary(results)
        lines.append("## 概要")
        lines.append("")
        lines.append(f"| 指标 | 值 |")
        lines.append(f"|------|-----|")
        lines.append(f"| 扫描文件数 | {summary['files_scanned']} |")
        lines.append(f"| 问题总数 | {summary['total_issues']} |")
        lines.append(f"| 🔴 错误 | {summary['errors']} |")
        lines.append(f"| 🟡 警告 | {summary['warnings']} |")
        lines.append(f"| 🔵 提示 | {summary['info']} |")
        lines.append("")

        has_complexity = any(r.complexity_results for r in results)
        if has_complexity:
            lines.append("## 圈复杂度")
            lines.append("")
            lines.append("| 文件 | 函数 | 行号 | 复杂度 | 等级 | 建议 |")
            lines.append("|------|------|------|--------|------|------|")
            for r in results:
                for c in r.complexity_results:
                    level_display = {"high": "🔴高", "medium": "🟡中", "low": "🟢低"}.get(c.level, c.level)
                    lines.append(
                        f"| {os.path.basename(c.file)} | {c.function_name} | "
                        f"L{c.line_start}-L{c.line_end} | {c.complexity} | "
                        f"{level_display} | {c.suggestion[:50]}... |"
                    )
            lines.append("")

        lines.append("## 诊断详情")
        lines.append("")

        for r in results:
            if not r.diagnoses:
                continue
            lines.append(f"### {os.path.basename(r.file)}")
            lines.append(f"`{r.file}`")
            lines.append("")
            lines.append("| 行号 | 严重度 | 规则 | 描述 | 修复建议 |")
            lines.append("|------|--------|------|------|----------|")

            sorted_diags = sorted(r.diagnoses, key=lambda d: (SEVERITY_ORDER.get(d.severity, 99), d.line))
            for d in sorted_diags:
                emoji = SEVERITY_EMOJI.get(d.severity, "")
                lines.append(
                    f"| L{d.line} | {emoji} {d.severity} | {d.rule_id} | "
                    f"{d.message} | {d.suggestion[:60]} |"
                )
            lines.append("")

        content = "\n".join(lines)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)


class HTMLReporter:
    def generate(self, results: List[ScanResult], output_path: str):
        summary = JSONReporter()._summary(results)

        rows = ""
        for r in results:
            sorted_diags = sorted(r.diagnoses, key=lambda d: (SEVERITY_ORDER.get(d.severity, 99), d.line))
            for d in sorted_diags:
                emoji = SEVERITY_EMOJI.get(d.severity, "")
                sev_class = f"sev-{d.severity}"
                rows += f"""
                <tr class="{sev_class}">
                    <td>{os.path.basename(d.file)}</td>
                    <td>{d.line}</td>
                    <td>{emoji} {d.severity}</td>
                    <td><code>{d.rule_id}</code></td>
                    <td>{d.message}</td>
                    <td>{d.suggestion}</td>
                    <td>{'✅' if d.fixable else '❌'}</td>
                </tr>"""

        complexity_rows = ""
        for r in results:
            for c in r.complexity_results:
                level_color = {"high": "#e74c3c", "medium": "#f39c12", "low": "#27ae60"}.get(c.level, "#999")
                level_text = {"high": "高", "medium": "中", "low": "低"}.get(c.level, c.level)
                complexity_rows += f"""
                <tr>
                    <td>{os.path.basename(c.file)}</td>
                    <td>{c.function_name}</td>
                    <td>L{c.line_start}-L{c.line_end}</td>
                    <td><span style="color:{level_color};font-weight:bold">{c.complexity}</span></td>
                    <td><span style="color:{level_color}">{level_text}</span></td>
                    <td>{c.suggestion}</td>
                </tr>"""

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeDoc 诊断报告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: #0d1117; color: #c9d1d9; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #58a6ff; margin-bottom: 8px; font-size: 28px; }}
        .timestamp {{ color: #8b949e; margin-bottom: 24px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 16px; margin-bottom: 32px; }}
        .summary-card {{ background: #161b22; border: 1px solid #30363d; border-radius: 8px;
                        padding: 20px; text-align: center; }}
        .summary-card .number {{ font-size: 32px; font-weight: bold; }}
        .summary-card .label {{ color: #8b949e; margin-top: 4px; }}
        .card-errors .number {{ color: #f85149; }}
        .card-warnings .number {{ color: #d29922; }}
        .card-info .number {{ color: #58a6ff; }}
        .card-files .number {{ color: #3fb950; }}
        h2 {{ color: #c9d1d9; margin: 24px 0 12px; font-size: 20px;
             border-bottom: 1px solid #30363d; padding-bottom: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px;
                background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }}
        th {{ background: #21262d; color: #8b949e; padding: 12px 16px; text-align: left;
             font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }}
        td {{ padding: 10px 16px; border-top: 1px solid #21262d; font-size: 14px; }}
        tr:hover {{ background: #1c2128; }}
        .sev-error td:first-child {{ border-left: 3px solid #f85149; }}
        .sev-warning td:first-child {{ border-left: 3px solid #d29922; }}
        .sev-info td:first-child {{ border-left: 3px solid #58a6ff; }}
        code {{ background: #1c2128; padding: 2px 6px; border-radius: 4px; font-size: 13px;
               color: #79c0ff; }}
        .section-empty {{ color: #8b949e; text-align: center; padding: 40px;
                         background: #161b22; border-radius: 8px; margin-bottom: 24px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 CodeDoc 代码诊断报告</h1>
        <p class="timestamp">生成时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

        <div class="summary">
            <div class="summary-card card-files">
                <div class="number">{summary['files_scanned']}</div>
                <div class="label">扫描文件数</div>
            </div>
            <div class="summary-card card-errors">
                <div class="number">{summary['errors']}</div>
                <div class="label">🔴 错误</div>
            </div>
            <div class="summary-card card-warnings">
                <div class="number">{summary['warnings']}</div>
                <div class="label">🟡 警告</div>
            </div>
            <div class="summary-card card-info">
                <div class="number">{summary['info']}</div>
                <div class="label">🔵 提示</div>
            </div>
        </div>

        <h2>📊 圈复杂度</h2>
        {"<table><tr><th>文件</th><th>函数</th><th>行号</th><th>复杂度</th><th>等级</th><th>建议</th></tr>" + complexity_rows + "</table>" if complexity_rows else '<p class="section-empty">未检测到复杂度问题</p>'}

        <h2>📋 诊断详情</h2>
        {"<table><tr><th>文件</th><th>行号</th><th>严重度</th><th>规则</th><th>描述</th><th>修复建议</th><th>可修复</th></tr>" + rows + "</table>" if rows else '<p class="section-empty">🎉 恭喜！未发现任何问题</p>'}
    </div>
</body>
</html>"""

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
