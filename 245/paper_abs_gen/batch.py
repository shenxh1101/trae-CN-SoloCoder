import csv
import os
import time
from pathlib import Path
from typing import Optional

from paper_abs_gen.extractor import extract_text, find_papers_in_dir
from paper_abs_gen.generator import (
    GenerationResult,
    generate_abstract,
    generate_chinese_abstract,
    extract_metadata,
    check_citations,
)
from paper_abs_gen.llm_client import LLMClient
from paper_abs_gen.formatter import format_latex_full, format_bibtex_entry, format_plain


def batch_process(
    client: LLMClient,
    input_dir: str,
    output_dir: Optional[str] = None,
    recursive: bool = False,
    chinese: bool = False,
    extract_meta: bool = False,
    check_cite: bool = False,
    export_latex: bool = False,
    export_bibtex: bool = False,
    max_chars: int = 15000,
) -> list[GenerationResult]:
    papers = find_papers_in_dir(input_dir, recursive=recursive)
    if not papers:
        print(f"No papers found in {input_dir}")
        return []

    if output_dir:
        out_path = Path(output_dir)
    else:
        out_path = Path(input_dir) / "pag_output"
    out_path.mkdir(parents=True, exist_ok=True)

    results: list[GenerationResult] = []
    total = len(papers)

    for i, paper_path in enumerate(papers, 1):
        print(f"\n[{i}/{total}] Processing: {os.path.basename(paper_path)}")
        try:
            text = extract_text(paper_path)
            result = generate_abstract(client, text, max_chars=max_chars)
            result.paper_path = paper_path

            if chinese:
                print(f"  Generating Chinese abstract...")
                generate_chinese_abstract(client, text, result, max_chars=max_chars)

            if extract_meta:
                print(f"  Extracting metadata...")
                extract_metadata(client, text, result, max_chars=max_chars)

            if check_cite:
                print(f"  Checking citations...")
                check_citations(client, text, result)

            _save_single_result(result, out_path, export_latex, export_bibtex)
            results.append(result)
            print(f"  Done. Confidence: {result.confidence:.0%}")

        except Exception as e:
            print(f"  Error processing {paper_path}: {e}")
            results.append(GenerationResult(paper_path=paper_path))

    csv_path = _generate_csv(results, out_path)
    print(f"\nBatch processing complete. {len(results)} papers processed.")
    print(f"Results saved to: {out_path}")
    print(f"CSV summary: {csv_path}")
    return results


def _save_single_result(
    result: GenerationResult,
    out_dir: Path,
    export_latex: bool,
    export_bibtex: bool,
) -> None:
    stem = Path(result.paper_path).stem

    json_path = out_dir / f"{stem}_result.json"
    json_path.write_text(result.to_json(), encoding="utf-8")

    plain_path = out_dir / f"{stem}_abstract.txt"
    plain_path.write_text(format_plain(result), encoding="utf-8")

    if export_latex:
        latex_path = out_dir / f"{stem}_abstract.tex"
        latex_path.write_text(format_latex_full(result), encoding="utf-8")

    if export_bibtex:
        bib_path = out_dir / f"{stem}.bib"
        bib_path.write_text(format_bibtex_entry(result), encoding="utf-8")


def _generate_csv(results: list[GenerationResult], out_dir: Path) -> str:
    csv_path = out_dir / f"batch_summary_{time.strftime('%Y%m%d_%H%M%S')}.csv"
    fieldnames = [
        "paper_path",
        "paper_title",
        "keywords",
        "confidence",
        "methods",
        "datasets",
        "citation_error_count",
        "abstract_en_background",
        "abstract_en_methods",
        "abstract_en_results",
        "abstract_en_conclusion",
        "abstract_zh_background",
        "abstract_zh_methods",
        "abstract_zh_results",
        "abstract_zh_conclusion",
    ]

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            row = {
                "paper_path": r.paper_path,
                "paper_title": r.paper_title,
                "keywords": "; ".join(r.keywords),
                "confidence": f"{r.confidence:.2f}",
                "methods": "; ".join(r.methods),
                "datasets": "; ".join(r.datasets),
                "citation_error_count": len(r.citation_errors),
                "abstract_en_background": r.abstract_en.background if r.abstract_en else "",
                "abstract_en_methods": r.abstract_en.methods if r.abstract_en else "",
                "abstract_en_results": r.abstract_en.results if r.abstract_en else "",
                "abstract_en_conclusion": r.abstract_en.conclusion if r.abstract_en else "",
                "abstract_zh_background": r.abstract_zh.background if r.abstract_zh else "",
                "abstract_zh_methods": r.abstract_zh.methods if r.abstract_zh else "",
                "abstract_zh_results": r.abstract_zh.results if r.abstract_zh else "",
                "abstract_zh_conclusion": r.abstract_zh.conclusion if r.abstract_zh else "",
            }
            writer.writerow(row)

    return str(csv_path)
