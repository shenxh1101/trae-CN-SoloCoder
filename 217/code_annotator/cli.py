#!/usr/bin/env python3
import argparse
import os
import sys
import json

from code_annotator.processor import Processor
from code_annotator.batch import BatchProcessor
from code_annotator.diff_display import DiffDisplay
from code_annotator.feedback import FeedbackSystem
from code_annotator.logger import GenerationLog
from code_annotator.config import Config
from code_annotator.parsers import ParserFactory
from code_annotator.formatters import FormatterFactory
from code_annotator.ai_backend import AIBackend


def main():
    parser = argparse.ArgumentParser(
        prog="code-annotator",
        description="AI Code Comment Generator - Automatically generate comments for Python, JavaScript, and Java code",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test AI connection before annotating
  code-annotator test-connection

  # Annotate a single file
  code-annotator annotate my_script.py

  # Annotate with Chinese comments
  code-annotator annotate my_script.py --lang zh

  # Batch process a directory
  code-annotator annotate ./src --batch --output-dir ./annotated_src

  # Preview changes side-by-side without writing files
  code-annotator annotate my_script.py --diff

  # Mark a comment as useful/useless
  code-annotator feedback my_script.py calculate_sum --rating useful

  # Export generation log
  code-annotator log --export log_report.txt

  # Initialize a config file
  code-annotator init-config
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    annotate_parser = subparsers.add_parser("annotate", help="Annotate code files with AI-generated comments")
    annotate_parser.add_argument("path", help="File or directory to annotate")
    annotate_parser.add_argument("--output", "-o", help="Output file path (for single file mode)")
    annotate_parser.add_argument("--output-dir", help="Output directory (for batch mode)")
    annotate_parser.add_argument("--batch", "-b", action="store_true", help="Batch process a directory")
    annotate_parser.add_argument("--recursive", "-r", action="store_true", default=True,
                                 help="Recursively process subdirectories (default: True)")
    annotate_parser.add_argument("--style", "-s", choices=["docstring", "jsdoc", "javadoc"],
                                 help="Comment style (default: auto-detect by language)")
    annotate_parser.add_argument("--lang", "-l", choices=["en", "zh"], default="en",
                                 help="Comment language: en (English) or zh (Chinese)")
    annotate_parser.add_argument("--api-url", help="AI API URL (default: http://localhost:11434/v1)")
    annotate_parser.add_argument("--api-key", help="AI API key")
    annotate_parser.add_argument("--model", "-m", help="Model name (default: qwen2.5-coder:7b)")
    annotate_parser.add_argument("--backend", choices=["openai", "ollama"], default="openai",
                                 help="AI backend type (default: openai-compatible)")
    annotate_parser.add_argument("--template", "-t", help="Custom comment template string")
    annotate_parser.add_argument("--template-file", help="Path to custom comment template file")
    annotate_parser.add_argument("--author", "-a", help="Author name to include in comments")
    annotate_parser.add_argument("--date", "-d", help="Date to include in comments (default: today)")
    annotate_parser.add_argument("--overwrite", action="store_true",
                                 help="Overwrite existing comments (default: skip)")
    annotate_parser.add_argument("--ignore", "-i", nargs="*", help="Patterns to ignore (e.g., test_*, *.spec.js)")
    annotate_parser.add_argument("--diff", action="store_true",
                                 help="Show side-by-side diff instead of writing files")
    annotate_parser.add_argument("--unified-diff", action="store_true",
                                 help="Show unified diff instead of writing files")
    annotate_parser.add_argument("--log-file", default="annotation_log.json",
                                 help="Log file path (default: annotation_log.json)")
    annotate_parser.add_argument("--config", "-c", help="Path to config file")
    annotate_parser.add_argument("--dry-run", action="store_true",
                                 help="Parse and show what would be annotated without calling AI")
    annotate_parser.add_argument("--no-save", action="store_true",
                                 help="Process but do not save annotated files (useful with --diff)")

    feedback_parser = subparsers.add_parser("feedback", help="Rate generated comments")
    feedback_parser.add_argument("file", help="Source file path")
    feedback_parser.add_argument("block_name", help="Name of the code block")
    feedback_parser.add_argument("--rating", "-r", choices=["useful", "useless"], required=True,
                                 help="Rating for the comment")
    feedback_parser.add_argument("--comment-text", help="The generated comment text")
    feedback_parser.add_argument("--block-type", default="function", help="Type of the code block")
    feedback_parser.add_argument("--note", "-n", help="Additional notes")
    feedback_parser.add_argument("--feedback-file", default="annotation_feedback.json",
                                 help="Feedback file path")

    feedback_parser_stats = subparsers.add_parser("feedback-stats", help="Show feedback statistics")
    feedback_parser_stats.add_argument("--feedback-file", default="annotation_feedback.json",
                                       help="Feedback file path")

    log_parser = subparsers.add_parser("log", help="View or export generation logs")
    log_parser.add_argument("--export", "-e", help="Export log to text file")
    log_parser.add_argument("--json", action="store_true", help="Export as JSON")
    log_parser.add_argument("--log-file", default="annotation_log.json",
                            help="Log file path")

    init_parser = subparsers.add_parser("init-config", help="Initialize a default config file")
    init_parser.add_argument("--output", "-o", default="annotator_config.json",
                             help="Config file path (default: annotator_config.json)")

    test_conn_parser = subparsers.add_parser("test-connection",
                                          help="Test AI service connection and verify configuration")
    test_conn_parser.add_argument("--api-url", help="AI API URL")
    test_conn_parser.add_argument("--api-key", help="AI API key")
    test_conn_parser.add_argument("--model", "-m", help="Model name")
    test_conn_parser.add_argument("--backend", choices=["openai", "ollama"], default="openai",
                                help="AI backend type")
    test_conn_parser.add_argument("--config", "-c", help="Path to config file")
    test_conn_parser.add_argument("--verbose", "-v", action="store_true",
                                help="Show detailed configuration")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "init-config":
        Config.create_default_config(args.output)
        print(f"Config file created: {args.output}")
        return

    if args.command == "test-connection":
        config = Config(args.config) if args.config else Config()
        config.update({
            "api_url": args.api_url,
            "api_key": args.api_key,
            "model": args.model,
            "backend_type": args.backend,
        })

        ai = AIBackend(
            api_url=config.get("api_url"),
            api_key=config.get("api_key"),
            model=config.get("model"),
            backend_type=config.get("backend_type", "openai"),
        )

        if args.verbose:
            cfg = ai.get_config()
            print("Configuration:")
            print(f"  Backend type: {cfg['backend_type']}")
            print(f"  API URL:      {cfg['api_url']}")
            print(f"  Model:        {cfg['model']}")
            print(f"  API key:      {cfg['api_key'] or '(not set)'}")
            print()

        print(f"Testing connection to {config.get('api_url')}...")
        success, message = ai.test_connection()

        if success:
            print("\033[92m✓ SUCCESS:\033[0m", message)
            print("You can now run: code-annotator annotate <file>")
        else:
            print("\033[91m✗ FAILED:\033[0m", message)
            print()
            print("Troubleshooting tips:")
            print("  1. Ensure Ollama is running: 'ollama serve'")
            print("  2. Check if model is installed: 'ollama list'")
            print("  3. Download model if needed: 'ollama pull qwen2.5-coder:7b'")
            print("  4. Verify API URL matches your setup")
            sys.exit(1)
        return

    if args.command == "feedback":
        feedback = FeedbackSystem(args.feedback_file)
        feedback.add_feedback(
            file_path=args.file,
            block_name=args.block_name,
            block_type=args.block_type,
            comment=args.comment_text or "",
            rating=args.rating,
            note=args.note or "",
        )
        print(f"Feedback recorded: {args.block_name} -> {args.rating}")
        stats = feedback.get_stats()
        print(f"Stats: {stats['useful']} useful, {stats['useless']} useless ({stats['useful_rate']} useful rate)")
        return

    if args.command == "feedback-stats":
        feedback = FeedbackSystem(args.feedback_file)
        stats = feedback.get_stats()
        print("Feedback Statistics:")
        print(f"  Total feedback: {stats['total']}")
        print(f"  Useful: {stats['useful']}")
        print(f"  Useless: {stats['useless']}")
        print(f"  Useful rate: {stats['useful_rate']}")
        return

    if args.command == "log":
        log = GenerationLog(args.log_file)
        if os.path.exists(args.log_file):
            with open(args.log_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            log.entries = data.get("entries", [])

        if args.export:
            if args.json:
                log.export(args.export)
            else:
                log.export_text(args.export)
            print(f"Log exported to: {args.export}")
        else:
            summary = log.get_summary()
            print("Generation Log Summary:")
            print(f"  Total files: {summary['total_files']}")
            print(f"  Successful: {summary['successful_files']}")
            print(f"  Failed: {summary['failed_files']}")
            print(f"  Blocks processed: {summary['total_blocks_processed']}")
            print(f"  Comments added: {summary['total_comments_added']}")
            print(f"  Comment lines: {summary['total_comment_lines']}")
            for lang, stats in summary.get("by_language", {}).items():
                print(f"  [{lang}] Files: {stats['files']}, Blocks: {stats['blocks_processed']}, "
                      f"Comments: {stats['comments_added']}, Lines: {stats['comment_lines']}")
        return

    if args.command == "annotate":
        _handle_annotate(args)


def _handle_annotate(args):
    config = Config(args.config) if args.config else Config()
    config.update({
        "api_url": args.api_url,
        "api_key": args.api_key,
        "model": args.model,
        "backend_type": args.backend,
        "comment_style": args.style,
        "comment_lang": args.lang,
        "skip_commented": not args.overwrite,
        "author": args.author,
        "date": args.date,
        "template": args.template,
        "template_file": args.template_file,
        "ignore_patterns": args.ignore,
        "log_file": args.log_file,
    })

    processor = Processor(
        style=config.get("comment_style") or None,
        language=None,
        comment_lang=config.get("comment_lang", "en"),
        api_url=config.get("api_url"),
        api_key=config.get("api_key"),
        model=config.get("model"),
        backend_type=config.get("backend_type", "openai"),
        template=config.get("template") or None,
        template_file=config.get("template_file") or None,
        author=config.get("author") or None,
        date=config.get("date") or None,
        skip_commented=config.get("skip_commented", True),
    )

    log = GenerationLog(config.get("log_file", "annotation_log.json"))

    if args.dry_run:
        _dry_run(args, processor)
        return

    if args.batch or os.path.isdir(args.path):
        _batch_annotate(args, processor, config, log)
    else:
        _single_annotate(args, processor, config, log)


def _single_annotate(args, processor, config, log):
    path = args.path
    if not os.path.isfile(path):
        print(f"Error: File not found: {path}")
        sys.exit(1)

    try:
        output_path = None
        if not args.diff and not args.unified_diff and not args.no_save:
            if args.output:
                output_path = args.output
            else:
                base, ext = os.path.splitext(path)
                output_path = f"{base}_annotated{ext}"

        result = processor.process_file(path, output_path)

        if result.ai_error:
            print("\033[91m" + "=" * 60 + "\033[0m")
            print("\033[91mAI Service Error:\033[0m")
            print(f"  {result.ai_error}")
            print()
            print("\033[93mTroubleshooting:\033[0m")
            print("  1. Run 'code-annotator test-connection' to verify connection")
            print("  2. Check if your AI service is running and model is available")
            print("  3. Use --api-url, --model, or --backend to adjust configuration")
            print("\033[91m" + "=" * 60 + "\033[0m")
            sys.exit(1)

        if args.diff:
            display = DiffDisplay()
            print(display.side_by_side(result.original_code, result.annotated_code))
        elif args.unified_diff:
            display = DiffDisplay()
            print(display.colored_unified_diff(result.original_code, result.annotated_code))
        else:
            print(f"Annotated file saved to: {output_path}")

        print(f"\nStats: {result.comments_added} comments added, "
              f"{result.comment_lines} comment lines, "
              f"{result.blocks_processed} blocks processed")

        log.add_entry(
            file_path=path,
            language=result.language,
            blocks_processed=result.blocks_processed,
            comments_added=result.comments_added,
            comment_lines=result.comment_lines,
        )
        log.export(config.get("log_file", "annotation_log.json"))

    except Exception as e:
        print(f"Error: {e}")
        log.add_entry(
            file_path=path, language="unknown",
            blocks_processed=0, comments_added=0, comment_lines=0,
            status="error", error=str(e),
        )
        log.export(config.get("log_file", "annotation_log.json"))
        sys.exit(1)


def _batch_annotate(args, processor, config, log):
    directory = args.path
    if not os.path.isdir(directory):
        print(f"Error: Not a directory: {directory}")
        sys.exit(1)

    batch = BatchProcessor(
        processor=processor,
        ignore_patterns=config.get("ignore_patterns", []),
    )

    output_dir = args.output_dir or config.get("output_dir")
    results = batch.process_directory(directory, output_dir, recursive=args.recursive)

    print(f"\nBatch processing complete!")
    print(f"Files processed: {len(results)}")

    total_comments = sum(r.comments_added for r in results)
    total_lines = sum(r.comment_lines for r in results)
    total_blocks = sum(r.blocks_processed for r in results)

    print(f"Total comments added: {total_comments}")
    print(f"Total comment lines: {total_lines}")
    print(f"Total blocks processed: {total_blocks}")

    for result in results:
        log.add_entry(
            file_path=result.file_path,
            language=result.language,
            blocks_processed=result.blocks_processed,
            comments_added=result.comments_added,
            comment_lines=result.comment_lines,
        )

    log.export(config.get("log_file", "annotation_log.json"))

    if args.diff and results:
        display = DiffDisplay()
        for result in results[:3]:
            print(f"\n{'=' * 60}")
            print(f"File: {result.file_path}")
            print('=' * 60)
            print(display.side_by_side(result.original_code, result.annotated_code))


def _dry_run(args, processor):
    path = args.path

    if os.path.isdir(path):
        batch = BatchProcessor(
            processor=processor,
            ignore_patterns=args.ignore or [],
        )
        files = batch._collect_files(path, recursive=args.recursive)
        print(f"Would process {len(files)} files:")
        for f in files:
            print(f"  {f}")
            try:
                parser = ParserFactory.get_parser(file_path=f)
                with open(f, 'r', encoding='utf-8') as fh:
                    source = fh.read()
                result = parser.parse(source, f)
                uncommented = [b for b in result.blocks if not b.has_comment]
                print(f"    -> {len(result.blocks)} blocks found, "
                      f"{len(uncommented)} without comments")
                for b in uncommented:
                    print(f"       [{b.block_type.value}] {b.name} (line {b.start_line + 1})")
            except Exception as e:
                print(f"    -> Error parsing: {e}")
    elif os.path.isfile(path):
        parser = ParserFactory.get_parser(file_path=path)
        with open(path, 'r', encoding='utf-8') as f:
            source = f.read()
        result = parser.parse(source, path)
        uncommented = [b for b in result.blocks if not b.has_comment]

        print(f"File: {path}")
        print(f"Language: {result.language}")
        print(f"Total blocks: {len(result.blocks)}")
        print(f"Blocks without comments: {len(uncommented)}")
        print()
        for b in result.blocks:
            status = "HAS COMMENT" if b.has_comment else "NEEDS COMMENT"
            print(f"  [{status}] [{b.block_type.value}] {b.name} (lines {b.start_line + 1}-{b.end_line + 1})")
            if b.params:
                print(f"           params: {', '.join(b.params)}")
            if b.return_type:
                print(f"           returns: {b.return_type}")
    else:
        print(f"Error: Path not found: {path}")
        sys.exit(1)


if __name__ == "__main__":
    main()
