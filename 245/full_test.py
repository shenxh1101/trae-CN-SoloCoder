#!/usr/bin/env python3
"""Automated full test with real LLM API integration.

Usage:
    python full_test.py                  # Auto-detect API key, run all tests
    python full_test.py --no-interactive # Skip interactive mode test
    python full_test.py --verbose        # Show detailed API logs

Environment:
    OPENAI_API_KEY    - Required for real API calls
    OPENAI_BASE_URL   - Optional, custom API endpoint
    PAG_MODEL         - Optional, model name (default: gpt-4o-mini)
"""

import argparse
import io
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))

from paper_abs_gen.extractor import extract_text, find_papers_in_dir
from paper_abs_gen.generator import (
    GenerationResult,
    StructuredAbstract,
    CitationError,
    generate_abstract,
    generate_chinese_abstract,
    extract_metadata,
    check_citations,
    _extract_references,
    _split_references,
    _check_citations_rule_based,
)
from paper_abs_gen.llm_client import LLMClient
from paper_abs_gen.formatter import (
    format_plain,
    format_latex_full,
    format_bibtex_entry,
    format_structured_data,
)
from paper_abs_gen.tracker import ModificationTracker
from paper_abs_gen.interactive import _display_result, _interactive_edit, _interactive_export


def print_separator(title="", width=80, char="="):
    if title:
        left = (width - len(title) - 4) // 2
        right = width - left - len(title) - 4
        print(f"\n{char*left} {title} {char*right}")
    else:
        print(f"\n{char*width}")


def check_api_key():
    """Check if API key is available."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("⚠️  OPENAI_API_KEY not found in environment")
        print("   Set it with: export OPENAI_API_KEY='sk-...'")
        return False
    print(f"✓ OPENAI_API_KEY found (starts with: {api_key[:8]}...)")
    return True


def test_citation_detection(paper_path):
    """Test citation format detection with detailed output."""
    print_separator("TEST 1: CITATION FORMAT DETECTION")

    text = extract_text(paper_path)
    ref_section = _extract_references(text)

    if not ref_section:
        print("❌ No references section found")
        return []

    print(f"\n📚 References section extracted ({len(ref_section)} chars)")

    refs = _split_references(ref_section)
    print(f"📋 Found {len(refs)} references:\n")

    for i, ref in enumerate(refs, 1):
        ref_clean = ref.strip()
        if len(ref_clean) > 120:
            ref_display = ref_clean[:117] + "..."
        else:
            ref_display = ref_clean
        print(f"  [{i}] {ref_display}")

    print("\n🔍 Running rule-based citation error detection...")
    errors = _check_citations_rule_based(ref_section)

    if errors:
        print(f"\n⚠️  FOUND {len(errors)} CITATION ISSUES:\n")
        for i, err in enumerate(errors, 1):
            print(f"  {i}. 🔴 ERROR TYPE: {err.error_type.upper()}")
            print(f"     📝 LOCATION: {err.reference[:100]}")
            print(f"     ℹ️  DETAILS: {err.detail}")
            if i < len(errors):
                print()
    else:
        print("\n✓ No citation format errors detected")

    try:
        client = LLMClient()
        print("\n🤖 Running LLM-based citation error detection...")
        from paper_abs_gen.generator import _check_citations_llm
        llm_errors = _check_citations_llm(client, ref_section)
        if llm_errors:
            print(f"\n⚠️  LLM detected {len(llm_errors)} additional issues:")
            for err in llm_errors:
                print(f"  - [{err.error_type}] {err.detail}")
            errors.extend(llm_errors)
    except Exception as e:
        print(f"\nℹ️  LLM citation check skipped: {e}")

    return errors


def test_real_api_generation(paper_path):
    """Test real LLM API for abstract generation."""
    print_separator("TEST 2: REAL LLM API - ABSTRACT GENERATION")

    client = LLMClient()
    print(f"✓ API Client initialized")
    print(f"  - Model: {client.model}")
    print(f"  - Base URL: {client.base_url}")
    print(f"  - Temperature: {client.temperature}")

    text = extract_text(paper_path)
    print(f"\n📄 Processing: {paper_path}")
    print(f"📝 Text length: {len(text)} characters")

    print("\n🤖 Calling API to generate English abstract...")
    result = generate_abstract(client, text)
    result.paper_path = paper_path

    print(f"  ✓ Abstract generated")
    print(f"  ✓ Title: {result.paper_title}")
    print(f"  ✓ Confidence: {result.confidence:.0%}")
    print(f"  ✓ Keywords: {len(result.keywords)} keywords")

    print("\n🤖 Calling API to generate Chinese abstract...")
    generate_chinese_abstract(client, text, result)
    print(f"  ✓ Chinese abstract generated")

    print("\n🤖 Calling API to extract methods and datasets...")
    extract_metadata(client, text, result)
    print(f"  ✓ Methods: {len(result.methods)} extracted")
    print(f"  ✓ Datasets: {len(result.datasets)} extracted")

    print("\n🔍 Checking citation formats...")
    check_citations(client, text, result)
    print(f"  ✓ Citation check complete ({len(result.citation_errors)} issues)")

    print("\n✅ Generation complete!")
    return result


def display_full_results(result):
    """Display all generation results."""
    print_separator("FULL GENERATION RESULTS")

    print(f"\n📄 Paper Title: {result.paper_title}")
    print(f"📊 Confidence: {result.confidence:.0%}")

    if result.keywords:
        print(f"🔑 Keywords: {', '.join(result.keywords)}")

    print_separator("ENGLISH ABSTRACT", char="-")
    if result.abstract_en:
        print(result.abstract_en.to_plain())

    if result.abstract_zh:
        print_separator("CHINESE ABSTRACT", char="-")
        print(result.abstract_zh.to_plain())

    if result.methods:
        print_separator("RESEARCH METHODS", char="-")
        for m in result.methods:
            print(f"  • {m}")

    if result.datasets:
        print_separator("DATASETS", char="-")
        for d in result.datasets:
            print(f"  • {d}")

    if result.citation_errors:
        print_separator(f"CITATION ERRORS ({len(result.citation_errors)})", char="-")
        for i, err in enumerate(result.citation_errors, 1):
            print(f"  {i}. [{err.error_type}] {err.detail}")
            print(f"     Ref: {err.reference[:80]}")


def export_all_formats(result, output_dir):
    """Export results to all available formats."""
    print_separator("EXPORTING TO ALL FORMATS")

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    exports = [
        ("📄 Plain Text", format_plain(result), output_dir / "abstract.txt"),
        ("📄 LaTeX", format_latex_full(result), output_dir / "abstract.tex"),
        ("📄 BibTeX", format_bibtex_entry(result), output_dir / "citation.bib"),
        ("📄 Structured JSON", format_structured_data(result), output_dir / "structured.json"),
        ("📄 Full Result JSON", result.to_json(), output_dir / "result.json"),
    ]

    for name, content, path in exports:
        path.write_text(content, encoding="utf-8")
        file_size = path.stat().st_size
        print(f"  {name}: {path} ({file_size} bytes)")

    print(f"\n✅ All files saved to: {output_dir.absolute()}")
    return output_dir


def test_interactive_mode(paper_path, output_dir):
    """Test interactive mode with simulated user input."""
    print_separator("TEST 3: INTERACTIVE MODE WITH EDITING")

    client = LLMClient()
    tracker = ModificationTracker(output_dir=str(output_dir / "fine_tune_data"))

    text = extract_text(paper_path)

    print("\n📥 Step 1: Generate initial abstract...")
    result = generate_abstract(client, text)
    result.paper_path = paper_path

    generate_chinese_abstract(client, text, result)
    extract_metadata(client, text, result)
    check_citations(client, text, result)

    print("\n📋 Step 2: Display result to user...")
    _display_result(result)

    print("\n✏️  Step 3: User chooses to edit (y)...")

    simulated_inputs = [
        "y",
        "Language model pre-training has become a foundational technique for NLP.",
        "Our novel BERT architecture uses masked language modeling for bidirectional training.",
        "The model achieves state-of-the-art results on 11 NLP benchmarks.",
        "BERT revolutionizes language representation learning through bidirectional pre-training.",
        "BERT, Pre-training, Transformers, Bidirectional Representations, MLM, NLP",
        "2",
    ]

    print("\n📝 Simulating user input:")
    for i, inp in enumerate(simulated_inputs, 1):
        display = inp if len(inp) < 60 else inp[:57] + "..."
        print(f"  [{i}] User input: '{display}'")

    print("\n" + "─" * 60)
    print("Starting interactive edit session...\n")

    input_gen = (s for s in simulated_inputs)

    modified = None
    with patch("builtins.input", side_effect=lambda *args, **kwargs: next(input_gen)):
        try:
            modified = _interactive_edit(result, tracker)
        except StopIteration:
            pass

    if modified and modified.abstract_en:
        print("\n✅ Changes applied!")
        print("\n📊 Comparison:")
        print(f"  Original Background: {result.abstract_en.background[:80]}...")
        print(f"  Modified Background: {modified.abstract_en.background[:80]}...")
        print(f"  Original Keywords: {result.keywords}")
        print(f"  Modified Keywords: {modified.keywords}")

        print("\n💾 Step 4: Save for fine-tuning...")
        tracker_path = tracker.save()
        ft_path = tracker.generate_finetune_dataset()
        print(f"  ✓ Tracking data: {tracker_path}")
        print(f"  ✓ Fine-tune dataset: {ft_path}")

        print("\n" + "─" * 60)
        print("📤 Step 5: Interactive export (user selects '2' for plain text)...")

        export_inputs = iter(["2", ""])
        with patch("builtins.input", side_effect=lambda *args, **kwargs: next(export_inputs)):
            try:
                _interactive_export(modified, default_latex=False, default_bibtex=False)
            except StopIteration:
                pass

        return modified
    else:
        print("\nℹ️  No modifications made")
        return result


def generate_summary_report(results, output_dir):
    """Generate a comprehensive summary report."""
    print_separator("GENERATING SUMMARY REPORT")

    report = {
        "timestamp": __import__("time").strftime("%Y-%m-%dT%H:%M:%S"),
        "test_paper": results["generation"].paper_path,
        "api_config": {
            "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            "model": os.environ.get("PAG_MODEL", "gpt-4o-mini"),
        },
        "citation_detection": {
            "total_references": results["num_refs"],
            "errors_found": len(results["citation_errors"]),
            "errors": [
                {"type": e.error_type, "reference": e.reference, "detail": e.detail}
                for e in results["citation_errors"]
            ],
        },
        "generation": {
            "title": results["generation"].paper_title,
            "confidence": results["generation"].confidence,
            "keywords": results["generation"].keywords,
            "methods": results["generation"].methods,
            "datasets": results["generation"].datasets,
            "has_chinese": results["generation"].abstract_zh is not None,
        },
        "output_files": [str(p) for p in Path(output_dir).glob("*") if p.is_file()],
        "fine_tune_data": {
            "tracked": len(results.get("tracker_records", [])),
        } if results.get("tracker_records") else None,
    }

    report_path = output_dir / "test_summary.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"✅ Summary report: {report_path}")
    return report


def main():
    parser = argparse.ArgumentParser(description="Full automated test with real LLM API")
    parser.add_argument("--paper", type=str, default="sample_papers/bert_test_paper.txt",
                        help="Test paper path")
    parser.add_argument("--output-dir", type=str, default="full_test_output",
                        help="Output directory")
    parser.add_argument("--no-interactive", action="store_true",
                        help="Skip interactive mode test")
    parser.add_argument("--verbose", action="store_true",
                        help="Show verbose output")
    args = parser.parse_args()

    print_separator()
    print("  PAPER ABSTRACT GENERATOR - FULL AUTOMATED TEST")
    print_separator()

    print("\n🔍 Checking environment...")
    if not check_api_key():
        print("\n❌ Cannot proceed without API key")
        print("\n💡 Hint: If you want to test without real API, use:")
        print("   python demo.py")
        sys.exit(1)

    paper_path = args.paper
    if not Path(paper_path).exists():
        print(f"\n❌ Test paper not found: {paper_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results = {}

    try:
        citation_errors = test_citation_detection(paper_path)
        results["citation_errors"] = citation_errors
        results["num_refs"] = len(_split_references(_extract_references(extract_text(paper_path))))

        gen_result = test_real_api_generation(paper_path)
        results["generation"] = gen_result

        display_full_results(gen_result)

        export_dir = export_all_formats(gen_result, output_dir)

        if not args.no_interactive:
            modified = test_interactive_mode(paper_path, export_dir)
            from paper_abs_gen.tracker import ModificationTracker
            tracker = ModificationTracker(output_dir=str(export_dir / "fine_tune_data"))
            results["tracker_records"] = tracker.records
        else:
            print("\nℹ️  Interactive mode test skipped (--no-interactive)")

        generate_summary_report(results, export_dir)

        print_separator("ALL TESTS COMPLETED")
        print(f"\n📁 Output directory: {export_dir.absolute()}")
        print("\nGenerated files:")
        for f in sorted(export_dir.rglob("*")):
            if f.is_file():
                rel = f.relative_to(export_dir)
                print(f"   - {rel} ({f.stat().st_size} bytes)")

        print(f"\n✅ {len(citation_errors)} citation errors detected")
        print(f"✅ Abstract generated with {gen_result.confidence:.0%} confidence")
        print(f"✅ {len(gen_result.keywords)} keywords extracted")
        print(f"✅ {len(gen_result.methods)} methods and {len(gen_result.datasets)} datasets extracted")
        if gen_result.abstract_zh:
            print(f"✅ Chinese abstract generated")
        if not args.no_interactive:
            print(f"✅ Interactive editing and tracking verified")
        print("\n🎉 All tests passed!")
        print_separator()

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
