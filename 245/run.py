#!/usr/bin/env python3
"""Auto-run script: checks for API key and runs appropriate test mode."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def main():
    api_key = os.environ.get("OPENAI_API_KEY")

    if api_key:
        print("=" * 80)
        print("  ✅ OPENAI_API_KEY detected - Running FULL TEST with REAL API CALLS")
        print("=" * 80)
        print(f"\n  API Key: {api_key[:10]}...")
        print(f"  Base URL: {os.environ.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')}")
        print(f"  Model: {os.environ.get('PAG_MODEL', 'gpt-4o-mini')}")
        print()

        import full_test
        full_test.main()
    else:
        print("=" * 80)
        print("  ⚠️  OPENAI_API_KEY not found - Running CITATION DETECTION ONLY")
        print("=" * 80)

        from paper_abs_gen.extractor import extract_text
        from paper_abs_gen.generator import (
            _extract_references,
            _split_references,
            _check_citations_rule_based,
        )

        paper_path = "sample_papers/bert_test_paper.txt"
        print(f"\n📄 Test paper: {paper_path}")

        text = extract_text(paper_path)
        ref_section = _extract_references(text)

        if not ref_section:
            print("❌ No references section found")
            sys.exit(1)

        refs = _split_references(ref_section)
        print(f"\n📋 Found {len(refs)} references:\n")

        for i, ref in enumerate(refs, 1):
            ref_clean = ref.strip()
            if len(ref_clean) > 120:
                ref_display = ref_clean[:117] + "..."
            else:
                ref_display = ref_clean
            print(f"  [{i}] {ref_display}")

        print("\n" + "─" * 80)
        print("🔍 CITATION FORMAT ERROR DETECTION")
        print("─" * 80)

        errors = _check_citations_rule_based(ref_section)

        if errors:
            print(f"\n⚠️  FOUND {len(errors)} CITATION ISSUES:\n")
            for i, err in enumerate(errors, 1):
                print(f"  {i}. 🔴 ERROR TYPE: {err.error_type.upper()}")
                print(f"     📍 POSITION: Reference #{i} in references section")
                print(f"     📝 REFERENCE: {err.reference[:100]}")
                print(f"     ℹ️  DETAILS: {err.detail}")
                if i < len(errors):
                    print()
        else:
            print("\n✅ No citation format errors detected")

        print("\n" + "=" * 80)
        print("  💡 To run FULL test with real LLM API:")
        print("     export OPENAI_API_KEY='sk-...'")
        print("     python run.py")
        print("=" * 80)

        if errors:
            print(f"\n📊 Summary: {len(errors)} citation errors found")
        else:
            print("\n📊 Summary: No errors found")


if __name__ == "__main__":
    main()
