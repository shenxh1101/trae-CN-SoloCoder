#!/usr/bin/env python3
import argparse
import sys
import os
from datetime import datetime

from parser import parse_file, detect_format
from analyzer import LogAnalyzer, compare_analyses
from monitor import LogMonitor
from report import text_report, json_report, html_report, comparison_report


def parse_datetime(dt_str: str) -> datetime:
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%Y-%m-%d',
        '%d/%b/%Y:%H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise argparse.ArgumentTypeError(
        f'Invalid datetime format: {dt_str}. Try YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'
    )


def analyze_logs(args):
    if not os.path.exists(args.file):
        print(f'Error: File not found: {args.file}', file=sys.stderr)
        sys.exit(1)

    if args.enable_online:
        from geo import enable_online_lookup
        enable_online_lookup()
        print('🌐 Online IP geolocation enabled')

    fmt = args.format
    if fmt == 'auto':
        fmt = detect_format(args.file)
        print(f'🔍 Auto-detected format: {fmt}')

    time_start = parse_datetime(args.start) if args.start else None
    time_end = parse_datetime(args.end) if args.end else None

    print(f'📖 Parsing log file: {args.file}')
    entries = list(parse_file(args.file, fmt, time_start, time_end))
    print(f'✅ Parsed {len(entries)} log entries')

    if not entries:
        print('⚠️  No valid log entries found.')
        return

    analyzer = LogAnalyzer(entries)
    analysis = analyzer.analyze()

    out_format = args.output.lower()
    if out_format == 'text':
        print(text_report(analysis))
    elif out_format == 'json':
        print(json_report(analysis, pretty=args.pretty))
    elif out_format == 'html':
        html_content = html_report(analysis)
        if args.output_file:
            with open(args.output_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f'🌐 HTML report saved to: {args.output_file}')
        else:
            print(html_content)

    if args.export_json:
        with open(args.export_json, 'w', encoding='utf-8') as f:
            f.write(json_report(analysis, pretty=True))
        print(f'📄 JSON data exported to: {args.export_json}')


def monitor_logs(args):
    if not os.path.exists(args.file):
        print(f'Error: File not found: {args.file}', file=sys.stderr)
        sys.exit(1)

    if args.enable_online:
        from geo import enable_online_lookup
        enable_online_lookup()
        print('🌐 Online IP geolocation enabled')

    fmt = args.format
    if fmt == 'auto':
        fmt = detect_format(args.file)
        print(f'🔍 Auto-detected format: {fmt}')

    def print_summary(analysis, new_count):
        s = analysis.get('summary', {})
        total = s.get('total_requests', 0)
        unique_ips = s.get('unique_ips', 0)
        status = analysis.get('status_distribution', {}).get('by_category', {})
        print(f'\r📊 Total: {total:,} | IPs: {unique_ips:,} | '
              f'2xx: {status.get("2xx", 0):,} | 4xx: {status.get("4xx", 0):,} | '
              f'5xx: {status.get("5xx", 0):,} | +{new_count} new    ', end='', flush=True)

    monitor = LogMonitor(args.file, fmt, update_interval=args.interval)
    monitor.start(callback=print_summary if args.quiet else None)


def compare_logs(args):
    if args.enable_online:
        from geo import enable_online_lookup
        enable_online_lookup()
        print('🌐 Online IP geolocation enabled')

    fmt = args.format

    print(f'📖 Parsing period A: {args.file_a}')
    start_a = parse_datetime(args.start_a) if args.start_a else None
    end_a = parse_datetime(args.end_a) if args.end_a else None
    entries_a = list(parse_file(args.file_a, fmt, start_a, end_a))
    print(f'✅ Parsed {len(entries_a)} entries for period A')

    print(f'📖 Parsing period B: {args.file_b}')
    start_b = parse_datetime(args.start_b) if args.start_b else None
    end_b = parse_datetime(args.end_b) if args.end_b else None
    entries_b = list(parse_file(args.file_b, fmt, start_b, end_b))
    print(f'✅ Parsed {len(entries_b)} entries for period B')

    if not entries_a or not entries_b:
        print('⚠️  Not enough data to compare.')
        return

    analyzer_a = LogAnalyzer(entries_a)
    analyzer_b = LogAnalyzer(entries_b)
    analysis_a = analyzer_a.analyze()
    analysis_b = analyzer_b.analyze()

    comparison = compare_analyses(analysis_a, analysis_b)
    print(comparison_report(comparison))

    if args.export_json:
        import json
        with open(args.export_json, 'w', encoding='utf-8') as f:
            json.dump(comparison, f, indent=2, ensure_ascii=False)
        print(f'📄 Comparison data exported to: {args.export_json}')


def main():
    parser = argparse.ArgumentParser(
        description='Web Server Log Analyzer - Analyze Nginx/Apache access logs',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic analysis
  python logalyzer.py analyze access.log

  # Nginx format, output JSON
  python logalyzer.py analyze access.log -f nginx -o json

  # Time range filter
  python logalyzer.py analyze access.log --start "2024-01-01 00:00:00" --end "2024-01-02 00:00:00"

  # Generate HTML report
  python logalyzer.py analyze access.log -o html --output-file report.html

  # Real-time monitoring
  python logalyzer.py monitor /var/log/nginx/access.log -i 2

  # Compare two log files
  python logalyzer.py compare --file-a yesterday.log --file-b today.log
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    analyze_parser = subparsers.add_parser('analyze', help='Analyze a log file')
    analyze_parser.add_argument('file', help='Path to access log file')
    analyze_parser.add_argument('-f', '--format', default='auto',
                                choices=['auto', 'nginx', 'apache', 'apache-combined', 'apache-common'],
                                help='Log format (default: auto-detect)')
    analyze_parser.add_argument('--custom-format', help='Custom log format string')
    analyze_parser.add_argument('-o', '--output', default='text',
                                choices=['text', 'json', 'html'],
                                help='Output format (default: text)')
    analyze_parser.add_argument('--output-file', help='Output file for HTML report')
    analyze_parser.add_argument('--pretty', action='store_true', help='Pretty-print JSON output')
    analyze_parser.add_argument('--export-json', help='Export analysis data to JSON file')
    analyze_parser.add_argument('--start', help='Start time filter (YYYY-MM-DD HH:MM:SS)')
    analyze_parser.add_argument('--end', help='End time filter (YYYY-MM-DD HH:MM:SS)')
    analyze_parser.add_argument('--enable-online', action='store_true',
                                help='Enable online IP geolocation lookup (ip-api.com)')

    monitor_parser = subparsers.add_parser('monitor', help='Real-time log monitoring')
    monitor_parser.add_argument('file', help='Path to access log file')
    monitor_parser.add_argument('-f', '--format', default='auto',
                                choices=['auto', 'nginx', 'apache', 'apache-combined', 'apache-common'],
                                help='Log format (default: auto-detect)')
    monitor_parser.add_argument('-i', '--interval', type=int, default=5,
                                help='Update interval in seconds (default: 5)')
    monitor_parser.add_argument('-q', '--quiet', action='store_true',
                                help='Quiet mode: show summary only')
    monitor_parser.add_argument('--enable-online', action='store_true',
                                help='Enable online IP geolocation lookup (ip-api.com)')

    compare_parser = subparsers.add_parser('compare', help='Compare two log periods')
    compare_parser.add_argument('--file-a', required=True, help='Log file for period A')
    compare_parser.add_argument('--file-b', required=True, help='Log file for period B')
    compare_parser.add_argument('-f', '--format', default='nginx',
                                choices=['nginx', 'apache', 'apache-combined', 'apache-common'],
                                help='Log format')
    compare_parser.add_argument('--start-a', help='Start time for period A')
    compare_parser.add_argument('--end-a', help='End time for period A')
    compare_parser.add_argument('--start-b', help='Start time for period B')
    compare_parser.add_argument('--end-b', help='End time for period B')
    compare_parser.add_argument('--export-json', help='Export comparison data to JSON file')
    compare_parser.add_argument('--enable-online', action='store_true',
                                help='Enable online IP geolocation lookup (ip-api.com)')

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    if args.command == 'analyze':
        analyze_logs(args)
    elif args.command == 'monitor':
        monitor_logs(args)
    elif args.command == 'compare':
        compare_logs(args)


if __name__ == '__main__':
    main()
