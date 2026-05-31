import re
from typing import Optional

from paper_abs_gen.generator import GenerationResult, StructuredAbstract


def format_latex_abstract(result: GenerationResult, lang: str = "en") -> str:
    abstract = result.abstract_en if lang == "en" else result.abstract_zh
    if not abstract:
        return ""

    lang_cmd = ""
    if lang == "zh":
        lang_cmd = "\\selectlanguage{chinese}\n"

    lines = [
        f"{lang_cmd}\\begin{{abstract}}",
    ]
    if abstract.background:
        lines.append(f"\\textbf{{Background.}} {abstract.background}")
    if abstract.methods:
        lines.append(f"\\textbf{{Methods.}} {abstract.methods}")
    if abstract.results:
        lines.append(f"\\textbf{{Results.}} {abstract.results}")
    if abstract.conclusion:
        lines.append(f"\\textbf{{Conclusion.}} {abstract.conclusion}")

    if result.keywords:
        kw_str = ", ".join(result.keywords)
        lines.append(f"\\\\\n\\textbf{{Keywords:}} {kw_str}")

    lines.append("\\end{abstract}")
    return "\n".join(lines)


def format_bibtex_entry(result: GenerationResult, key: Optional[str] = None) -> str:
    if not key:
        key = _generate_bibtex_key(result)

    abstract = result.abstract_en.to_flat() if result.abstract_en else ""
    kw_str = "; ".join(result.keywords) if result.keywords else ""

    lines = [f"@article{{{key},"]
    if result.paper_title:
        lines.append(f"  title = {{{result.paper_title}}},")
    lines.append(f"  abstract = {{{abstract}}},")
    if kw_str:
        lines.append(f"  keywords = {{{kw_str}}},")
    if result.methods:
        methods_str = "; ".join(result.methods)
        lines.append(f"  note = {{Methods: {methods_str}}},")
    lines.append("}")
    return "\n".join(lines)


def format_latex_full(result: GenerationResult) -> str:
    parts = []
    en_latex = format_latex_abstract(result, "en")
    if en_latex:
        parts.append(en_latex)
    zh_latex = format_latex_abstract(result, "zh")
    if zh_latex:
        parts.append(zh_latex)
    bibtex = format_bibtex_entry(result)
    if bibtex:
        parts.append(f"% BibTeX Entry\n{bibtex}")
    return "\n\n".join(parts)


def format_plain(result: GenerationResult, lang: str = "en") -> str:
    abstract = result.abstract_en if lang == "en" else result.abstract_zh
    if not abstract:
        return ""

    lines = []
    if result.paper_title:
        lines.append(f"Title: {result.paper_title}")
        lines.append("")
    lines.append(abstract.to_plain())
    if result.keywords:
        lines.append(f"\nKeywords: {', '.join(result.keywords)}")
    if result.confidence > 0:
        lines.append(f"Confidence: {result.confidence:.0%}")
    if result.methods:
        lines.append(f"Methods: {', '.join(result.methods)}")
    if result.datasets:
        lines.append(f"Datasets: {', '.join(result.datasets)}")
    if result.citation_errors:
        lines.append(f"\nCitation Errors ({len(result.citation_errors)}):")
        for err in result.citation_errors:
            lines.append(f"  - [{err.error_type}] {err.detail}")
    return "\n".join(lines)


def format_structured_data(result: GenerationResult) -> str:
    import json
    data = {
        "paper_title": result.paper_title,
        "methods": result.methods,
        "datasets": result.datasets,
        "keywords": result.keywords,
        "confidence": result.confidence,
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def _generate_bibtex_key(result: GenerationResult) -> str:
    title = result.paper_title or "untitled"
    words = re.findall(r"[a-zA-Z]+", title)
    if len(words) >= 2:
        key = (words[0] + words[1]).lower()
    elif words:
        key = words[0].lower()
    else:
        key = "paper"
    return key[:30]
