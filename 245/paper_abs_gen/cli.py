import argparse
import os
import sys
from pathlib import Path

from paper_abs_gen import __version__
from paper_abs_gen.extractor import extract_text, find_papers_in_dir
from paper_abs_gen.llm_client import LLMClient
from paper_abs_gen.generator import GenerationResult, StructuredAbstract, CitationError, generate_abstract, generate_chinese_abstract, extract_metadata, check_citations
from paper_abs_gen.formatter import format_plain, format_latex_full, format_bibtex_entry, format_structured_data
from paper_abs_gen.batch import batch_process
from paper_abs_gen.interactive import interactive_process
from paper_abs_gen.tracker import ModificationTracker


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="paper-abs-gen",
        description="AI-powered Academic Paper Abstract & Keyword Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Single paper
  paper-abs-gen process paper.pdf

  # Batch processing
  paper-abs-gen batch ./papers/ --csv --latex --chinese

  # Interactive mode
  paper-abs-gen interactive paper.pdf --chinese --check-citations

  # Quick generation
  paper-abs-gen process paper.txt --format bibtex --output result.bib
""",
    )

    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    _add_process_parser(subparsers)
    _add_batch_parser(subparsers)
    _add_interactive_parser(subparsers)
    _add_export_parser(subparsers)

    return parser


def _add_common_args(parser: argparse.ArgumentParser) -> None:
    llm = parser.add_argument_group("LLM Options")
    llm.add_argument("--api-key", type=str, default=None, help="OpenAI API key (or set OPENAI_API_KEY env)")
    llm.add_argument("--base-url", type=str, default=None, help="API base URL (or set OPENAI_BASE_URL env)")
    llm.add_argument("--model", type=str, default=None, help="Model name (default: gpt-4o-mini)")
    llm.add_argument("--temperature", type=float, default=None, help="Sampling temperature (default: 0.3)")
    llm.add_argument("--max-chars", type=int, default=15000, help="Max chars to send to LLM (default: 15000)")

    feat = parser.add_argument_group("Feature Options")
    feat.add_argument("--chinese", action="store_true", help="Also generate Chinese abstract")
    feat.add_argument("--extract-meta", action="store_true", help="Extract research methods and datasets")
    feat.add_argument("--check-citations", action="store_true", help="Check citation format errors")
    feat.add_argument("--no-confidence", action="store_true", help="Skip confidence display")


def _add_process_parser(subparsers) -> None:
    p = subparsers.add_parser("process", help="Process a single paper")
    p.add_argument("input", type=str, help="Input file path (PDF or TXT)")
    p.add_argument("--format", type=str, choices=["plain", "latex", "bibtex", "json", "structured"],
                    default="plain", help="Output format (default: plain)")
    p.add_argument("--output", "-o", type=str, default=None, help="Output file path")
    _add_common_args(p)


def _add_batch_parser(subparsers) -> None:
    p = subparsers.add_parser("batch", help="Batch process papers in a directory")
    p.add_argument("input_dir", type=str, help="Directory containing papers")
    p.add_argument("--output-dir", type=str, default=None, help="Output directory")
    p.add_argument("--recursive", "-r", action="store_true", help="Search subdirectories recursively")
    p.add_argument("--csv", action="store_true", help="Generate CSV summary")
    p.add_argument("--latex", action="store_true", help="Export LaTeX format")
    p.add_argument("--bibtex", action="store_true", help="Export BibTeX format")
    _add_common_args(p)


def _add_interactive_parser(subparsers) -> None:
    p = subparsers.add_parser("interactive", help="Interactive mode - process papers one by one")
    p.add_argument("input", type=str, nargs="?", default=None,
                   help="Input file or directory (if directory, process each paper interactively)")
    p.add_argument("--recursive", "-r", action="store_true", help="Search subdirectories recursively")
    p.add_argument("--latex", action="store_true", help="Export LaTeX format")
    p.add_argument("--bibtex", action="store_true", help="Export BibTeX format")
    p.add_argument("--track", action="store_true", help="Track modifications for fine-tuning")
    p.add_argument("--track-dir", type=str, default=None, help="Directory for tracking data")
    _add_common_args(p)


def _add_export_parser(subparsers) -> None:
    p = subparsers.add_parser("export", help="Export existing result JSON to other formats")
    p.add_argument("input", type=str, help="Result JSON file path")
    p.add_argument("--format", type=str, choices=["plain", "latex", "bibtex", "structured"],
                    required=True, help="Export format")
    p.add_argument("--output", "-o", type=str, default=None, help="Output file path")


def cmd_process(args: argparse.Namespace) -> None:
    client = _create_client(args)
    text = extract_text(args.input)
    print(f"Extracted {len(text)} characters from {args.input}")

    print("Generating structured abstract...")
    result = generate_abstract(client, text, max_chars=args.max_chars)
    result.paper_path = args.input

    if args.chinese:
        print("Generating Chinese abstract...")
        generate_chinese_abstract(client, text, result, max_chars=args.max_chars)

    if args.extract_meta:
        print("Extracting metadata...")
        extract_metadata(client, text, result, max_chars=args.max_chars)

    if args.check_citations:
        print("Checking citations...")
        check_citations(client, text, result)

    output_text = _format_output(result, args.format)
    _write_output(output_text, args.output)

    if not args.no_confidence:
        print(f"\nConfidence: {result.confidence:.0%}", file=sys.stderr)


def cmd_batch(args: argparse.Namespace) -> None:
    client = _create_client(args)
    results = batch_process(
        client=client,
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        recursive=args.recursive,
        chinese=args.chinese,
        extract_meta=args.extract_meta,
        check_cite=args.check_citations,
        export_latex=args.latex,
        export_bibtex=args.bibtex,
        max_chars=args.max_chars,
    )
    if not results:
        print("No results generated.", file=sys.stderr)


def cmd_interactive(args: argparse.Namespace) -> None:
    client = _create_client(args)
    tracker = None
    if args.track:
        tracker = ModificationTracker(output_dir=args.track_dir)

    if args.input is None:
        print("No input specified. Enter file paths one at a time (empty to finish):")
        while True:
            path = input("  File path: ").strip()
            if not path:
                break
            if not Path(path).exists():
                print(f"  File not found: {path}")
                continue
            interactive_process(
                client=client,
                input_path=path,
                chinese=args.chinese,
                extract_meta=args.extract_meta,
                check_cite=args.check_citations,
                export_latex=args.latex,
                export_bibtex=args.bibtex,
                tracker=tracker,
                max_chars=args.max_chars,
            )
    elif Path(args.input).is_dir():
        papers = find_papers_in_dir(args.input, recursive=args.recursive)
        if not papers:
            print(f"No papers found in {args.input}")
            return
        for paper in papers:
            interactive_process(
                client=client,
                input_path=paper,
                chinese=args.chinese,
                extract_meta=args.extract_meta,
                check_cite=args.check_citations,
                export_latex=args.latex,
                export_bibtex=args.bibtex,
                tracker=tracker,
                max_chars=args.max_chars,
            )
    else:
        interactive_process(
            client=client,
            input_path=args.input,
            chinese=args.chinese,
            extract_meta=args.extract_meta,
            check_cite=args.check_citations,
            export_latex=args.latex,
            export_bibtex=args.bibtex,
            tracker=tracker,
            max_chars=args.max_chars,
        )

    if tracker and tracker.records:
        path = tracker.save()
        ft_path = tracker.generate_finetune_dataset()
        print(f"\nModification tracking data saved to: {path}")
        print(f"Fine-tuning dataset saved to: {ft_path}")


def cmd_export(args: argparse.Namespace) -> None:
    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    result = GenerationResult(
        paper_path=data.get("paper_path", ""),
        paper_title=data.get("paper_title", ""),
        abstract_en=StructuredAbstract(**data["abstract_en"]) if data.get("abstract_en") else None,
        abstract_zh=StructuredAbstract(**data["abstract_zh"]) if data.get("abstract_zh") else None,
        keywords=data.get("keywords", []),
        confidence=data.get("confidence", 0.0),
        methods=data.get("methods", []),
        datasets=data.get("datasets", []),
        citation_errors=[CitationError(**e) for e in data.get("citation_errors", [])],
        raw_text_length=data.get("raw_text_length", 0),
    )

    output_text = _format_output(result, args.format)
    _write_output(output_text, args.output)


def _create_client(args: argparse.Namespace) -> LLMClient:
    return LLMClient(
        api_key=args.api_key,
        base_url=args.base_url,
        model=args.model,
        temperature=args.temperature,
    )


def _format_output(result: GenerationResult, fmt: str) -> str:
    if fmt == "plain":
        return format_plain(result)
    elif fmt == "latex":
        return format_latex_full(result)
    elif fmt == "bibtex":
        return format_bibtex_entry(result)
    elif fmt == "json":
        return result.to_json()
    elif fmt == "structured":
        return format_structured_data(result)
    else:
        return format_plain(result)


def _write_output(text: str, output_path: str = None) -> None:
    if output_path:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_text(text, encoding="utf-8")
        print(f"Output saved to: {output_path}", file=sys.stderr)
    else:
        print(text)


def main() -> None:
    import json

    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "process": cmd_process,
        "batch": cmd_batch,
        "interactive": cmd_interactive,
        "export": cmd_export,
    }

    cmd_func = commands.get(args.command)
    if cmd_func:
        try:
            cmd_func(args)
        except KeyboardInterrupt:
            print("\nInterrupted.", file=sys.stderr)
            sys.exit(130)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
