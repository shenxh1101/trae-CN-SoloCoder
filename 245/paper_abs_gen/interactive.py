import json
import os
import sys
from pathlib import Path
from typing import Optional

from paper_abs_gen.extractor import extract_text
from paper_abs_gen.generator import (
    GenerationResult,
    StructuredAbstract,
    generate_abstract,
    generate_chinese_abstract,
    extract_metadata,
    check_citations,
)
from paper_abs_gen.llm_client import LLMClient
from paper_abs_gen.formatter import (
    format_plain,
    format_latex_full,
    format_bibtex_entry,
    format_structured_data,
)
from paper_abs_gen.tracker import ModificationTracker


def interactive_process(
    client: LLMClient,
    input_path: str,
    chinese: bool = False,
    extract_meta: bool = False,
    check_cite: bool = False,
    export_latex: bool = False,
    export_bibtex: bool = False,
    tracker: Optional[ModificationTracker] = None,
    max_chars: int = 15000,
) -> GenerationResult:
    print(f"\n{'='*60}")
    print(f"Processing: {os.path.basename(input_path)}")
    print(f"{'='*60}")

    text = extract_text(input_path)
    print(f"Extracted {len(text)} characters from file.")

    print("\nGenerating structured abstract...")
    result = generate_abstract(client, text, max_chars=max_chars)
    result.paper_path = input_path

    if chinese:
        print("Generating Chinese abstract...")
        generate_chinese_abstract(client, text, result, max_chars=max_chars)

    if extract_meta:
        print("Extracting metadata (methods & datasets)...")
        extract_metadata(client, text, result, max_chars=max_chars)

    if check_cite:
        print("Checking citation formats...")
        check_citations(client, text, result)

    _display_result(result)

    if tracker:
        modified = _interactive_edit(result, tracker)
        if modified:
            result = modified

    _interactive_export(result, export_latex, export_bibtex)

    return result


def _display_result(result: GenerationResult) -> None:
    print(f"\n{'─'*60}")
    if result.paper_title:
        print(f"Title: {result.paper_title}")
    print(f"\nConfidence Score: {result.confidence:.0%}")
    print(f"\n{'─'*60}")

    if result.abstract_en:
        print("\n[English Abstract]")
        print(result.abstract_en.to_plain())

    if result.abstract_zh:
        print("\n[中文摘要]")
        print(result.abstract_zh.to_plain())

    if result.keywords:
        print(f"\nKeywords: {', '.join(result.keywords)}")

    if result.methods:
        print(f"Methods: {', '.join(result.methods)}")

    if result.datasets:
        print(f"Datasets: {', '.join(result.datasets)}")

    if result.citation_errors:
        print(f"\nCitation Errors ({len(result.citation_errors)}):")
        for err in result.citation_errors:
            print(f"  ⚠ [{err.error_type}] {err.detail}")

    print(f"{'─'*60}")


def _interactive_edit(result: GenerationResult, tracker: ModificationTracker) -> Optional[GenerationResult]:
    print("\nWould you like to modify the generated abstract? (y/n): ", end="")
    choice = input().strip().lower()
    if choice not in ("y", "yes"):
        return None

    modified_abstract = StructuredAbstract(
        background=result.abstract_en.background if result.abstract_en else "",
        methods=result.abstract_en.methods if result.abstract_en else "",
        results=result.abstract_en.results if result.abstract_en else "",
        conclusion=result.abstract_en.conclusion if result.abstract_en else "",
    )
    modified_keywords = list(result.keywords)

    sections = ["background", "methods", "results", "conclusion"]
    for section in sections:
        current = getattr(modified_abstract, section)
        print(f"\n{section.capitalize()} (press Enter to keep current):")
        print(f"  Current: {current}")
        print(f"  New: ", end="")
        new_val = input().strip()
        if new_val:
            setattr(modified_abstract, section, new_val)

    print(f"\nKeywords (press Enter to keep current):")
    print(f"  Current: {', '.join(modified_keywords)}")
    print(f"  New (comma-separated): ", end="")
    new_kw = input().strip()
    if new_kw:
        modified_keywords = [k.strip() for k in new_kw.split(",") if k.strip()]

    tracker.record_modification(
        result,
        modified_abstract=modified_abstract,
        modified_keywords=modified_keywords,
    )

    result.abstract_en = modified_abstract
    result.keywords = modified_keywords
    print("\nAbstract updated and modification tracked for fine-tuning.")
    return result


def _interactive_export(result: GenerationResult, default_latex: bool, default_bibtex: bool) -> None:
    print("\nExport options:")
    print("  1. Save as JSON")
    print("  2. Save as plain text")
    print("  3. Save as LaTeX")
    print("  4. Save as BibTeX")
    print("  5. Save structured data (methods/datasets)")
    print("  6. Save all formats")
    print("  0. Skip export")
    print("Choose (0-6): ", end="")

    choice = input().strip()
    if choice == "0":
        return

    stem = Path(result.paper_path).stem if result.paper_path else "paper"
    out_dir = Path("pag_output")
    out_dir.mkdir(parents=True, exist_ok=True)

    if choice in ("1", "6"):
        path = out_dir / f"{stem}_result.json"
        path.write_text(result.to_json(), encoding="utf-8")
        print(f"  Saved: {path}")

    if choice in ("2", "6"):
        path = out_dir / f"{stem}_abstract.txt"
        path.write_text(format_plain(result), encoding="utf-8")
        print(f"  Saved: {path}")

    if choice in ("3", "6") or default_latex:
        path = out_dir / f"{stem}_abstract.tex"
        path.write_text(format_latex_full(result), encoding="utf-8")
        print(f"  Saved: {path}")

    if choice in ("4", "6") or default_bibtex:
        path = out_dir / f"{stem}.bib"
        path.write_text(format_bibtex_entry(result), encoding="utf-8")
        print(f"  Saved: {path}")

    if choice == "5":
        path = out_dir / f"{stem}_structured.json"
        path.write_text(format_structured_data(result), encoding="utf-8")
        print(f"  Saved: {path}")
