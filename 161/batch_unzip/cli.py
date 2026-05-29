import argparse
import sys
from pathlib import Path
from typing import List

from .config import Config
from .logger import setup_logger, get_logger, console
from .scanner import ArchiveScanner, ArchiveInfo
from .password_manager import PasswordManager
from .extractor import Extractor
from .classifier import FileClassifier
from .reporter import Reporter
from .thread_manager import ThreadManager
from . import __version__

logger = get_logger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="batch-unzip",
        description="Batch extract RAR and ZIP files with automatic password handling",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview archives in a directory
  batch-unzip /path/to/archives --preview

  # Extract with password dictionary
  batch-unzip /path/to/archives -p passwords.txt

  # Extract to separate folders and delete originals
  batch-unzip /path/to/archives -p passwords.txt --delete

  # Extract with file classification and multi-threading
  batch-unzip /path/to/archives -p passwords.txt --classify -t 8

  # Test integrity before extraction
  batch-unzip /path/to/archives -p passwords.txt --test-integrity

  # Generate report and log
  batch-unzip /path/to/archives -p passwords.txt --report report.json --log extract.log
        """
    )

    parser.add_argument(
        "source_dir",
        type=str,
        help="Source directory containing archives to extract"
    )

    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default=None,
        help="Output directory for extracted files (default: same as archive)"
    )

    parser.add_argument(
        "-p", "--password-file",
        type=str,
        default=None,
        help="Password dictionary file (one password per line)"
    )

    parser.add_argument(
        "--password-cache",
        type=str,
        default=None,
        help="Path to password cache file (default: ~/.batch_unzip_passwords.json)"
    )

    parser.add_argument(
        "--no-subdir",
        action="store_true",
        help="Do not create subdirectories for each archive"
    )

    parser.add_argument(
        "--preview",
        action="store_true",
        help="Preview mode: list contents without extracting"
    )

    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete original archives after successful extraction"
    )

    parser.add_argument(
        "--classify",
        action="store_true",
        help="Classify extracted files by extension into subfolders"
    )

    parser.add_argument(
        "--exclude-pattern",
        action="append",
        default=[],
        help="Exclude files matching pattern (e.g., '*.tmp', 'Thumbs.db')"
    )

    parser.add_argument(
        "--exclude-ext",
        action="append",
        default=[],
        help="Exclude files with extension (e.g., '.exe', '.dll')"
    )

    parser.add_argument(
        "-t", "--threads",
        type=int,
        default=4,
        help="Number of concurrent extraction threads (default: 4)"
    )

    parser.add_argument(
        "--log",
        type=str,
        default=None,
        help="Write logs to file"
    )

    parser.add_argument(
        "--report",
        type=str,
        default=None,
        help="Generate extraction report (specify output file)"
    )

    parser.add_argument(
        "--report-format",
        type=str,
        choices=["json", "text", "csv"],
        default="json",
        help="Report format (default: json)"
    )

    parser.add_argument(
        "--test-integrity",
        action="store_true",
        help="Test archive integrity before extraction"
    )

    parser.add_argument(
        "--no-progress",
        action="store_true",
        help="Disable progress bars"
    )

    parser.add_argument(
        "-v", "--verbose",
        action="count",
        default=0,
        help="Increase verbosity level (-v, -vv)"
    )

    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}"
    )

    return parser


def main(argv: List[str] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    import logging
    log_level = logging.INFO
    if args.verbose >= 2:
        log_level = logging.DEBUG
    elif args.verbose >= 1:
        log_level = logging.INFO

    log_file = Path(args.log) if args.log else None
    setup_logger(log_file=log_file, level=log_level)

    console.print(f"[bold cyan]Batch Unzip Tool v{__version__}[/bold cyan]")
    console.print("[dim]----------------------------------------[/dim]")

    try:
        config = Config(
            source_dir=Path(args.source_dir),
            password_file=Path(args.password_file) if args.password_file else None,
            output_dir=Path(args.output_dir) if args.output_dir else None,
            extract_to_subdir=not args.no_subdir,
            preview_mode=args.preview,
            delete_after_extract=args.delete,
            classify_files=args.classify,
            exclude_patterns=args.exclude_pattern,
            exclude_extensions=args.exclude_ext,
            threads=max(1, args.threads),
            log_file=log_file,
            report_file=Path(args.report) if args.report else None,
            test_integrity=args.test_integrity,
            show_progress=not args.no_progress
        )

        if args.password_cache:
            config.password_cache_file = Path(args.password_cache)

    except Exception as e:
        logger.error(f"Invalid configuration: {e}")
        return 1

    scanner = ArchiveScanner(config)
    archives = scanner.scan()

    if not archives:
        logger.warning("No archives found to process")
        return 0

    password_manager = PasswordManager(config)
    extractor = Extractor(config, password_manager)
    reporter = Reporter()
    classifier = FileClassifier(config) if args.classify else None

    logger.info(f"Probing {len(archives)} archive(s)...")
    for archive in archives:
        extractor.probe_archive(archive)

    if args.preview:
        scanner.preview(archives)
        return 0

    thread_manager = ThreadManager(
        config=config,
        extractor=extractor,
        reporter=reporter,
        password_manager=password_manager,
        classifier=classifier
    )

    results = thread_manager.process_archives(archives)

    reporter.print_summary()

    if args.report:
        report_path = Path(args.report)
        reporter.save_report(report_path, format=args.report_format)
        console.print(f"[green]Report saved to:[/green] {report_path}")

    success_count = sum(1 for r in results if r.success)
    failed_count = len(results) - success_count

    console.print()
    if failed_count == 0:
        console.print("[bold green]✓ All archives extracted successfully![/bold green]")
    else:
        console.print(f"[bold yellow]⚠ Extraction complete with {failed_count} failure(s)[/bold yellow]")

    return 0 if failed_count == 0 else 1


def run() -> None:
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        console.print(f"[bold red]Fatal error:[/bold red] {e}")
        sys.exit(1)


if __name__ == "__main__":
    run()
