#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import os
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

CHUNK_SIZE = 65536
ALGORITHMS = ["md5", "sha1", "sha256", "sha512"]


class ProgressPrinter:
    def __init__(self, total, desc="Processing", bar_width=40, graphical=False):
        self.total = total
        self.desc = desc
        self.bar_width = bar_width
        self.graphical = graphical
        self.current = 0
        self.start_time = time.time()

    def update(self, amount=1):
        self.current += amount
        if self.total == 0:
            return
        pct = self.current / self.total
        elapsed = time.time() - self.start_time
        if self.graphical:
            filled = int(self.bar_width * pct)
            bar = "█" * filled + "░" * (self.bar_width - filled)
        else:
            filled = int(self.bar_width * pct)
            bar = "=" * filled + "-" * (self.bar_width - filled)
        eta = (elapsed / pct - elapsed) if pct > 0 else 0
        sys.stderr.write(
            f"\r{self.desc}: [{bar}] {pct*100:6.2f}% "
            f"({self.current}/{self.total}) ETA: {eta:.1f}s"
        )
        sys.stderr.flush()

    def finish(self):
        elapsed = time.time() - self.start_time
        if self.graphical:
            bar = "█" * self.bar_width
        else:
            bar = "=" * self.bar_width
        sys.stderr.write(
            f"\r{self.desc}: [{bar}] 100.00% "
            f"({self.total}/{self.total}) Done: {elapsed:.1f}s\n"
        )
        sys.stderr.flush()


def compute_hash(filepath, algorithms=None, show_progress=False):
    if algorithms is None:
        algorithms = ["sha256"]
    hashers = {}
    for algo in algorithms:
        hashers[algo] = hashlib.new(algo)
    file_size = os.path.getsize(filepath)
    read_bytes = 0
    try:
        with open(filepath, "rb") as f:
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk:
                    break
                for h in hashers.values():
                    h.update(chunk)
                read_bytes += len(chunk)
                if show_progress and file_size > 0:
                    pct = read_bytes / file_size * 100
                    sys.stderr.write(f"\r  {os.path.basename(filepath)}: {pct:6.2f}%")
                    sys.stderr.flush()
        if show_progress and file_size > 0:
            sys.stderr.write("\r  " + " " * 60 + "\r")
            sys.stderr.flush()
        return {algo: h.hexdigest() for algo, h in hashers.items()}
    except PermissionError:
        raise PermissionError(f"Permission denied: cannot read file '{filepath}'")


def compute_hash_stdin(algorithms=None):
    if algorithms is None:
        algorithms = ["sha256"]
    hashers = {}
    for algo in algorithms:
        hashers[algo] = hashlib.new(algo)
    while True:
        chunk = sys.stdin.buffer.read(CHUNK_SIZE)
        if not chunk:
            break
        for h in hashers.values():
            h.update(chunk)
    return {algo: h.hexdigest() for algo, h in hashers.items()}


def collect_files(directory, exclude_exts=None):
    exclude_exts = set(exclude_exts or [])
    files = []
    for root, _dirs, filenames in os.walk(directory):
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext in exclude_exts:
                continue
            files.append(os.path.join(root, fn))
    return sorted(files)


def batch_compute(file_list, algorithms, exclude_exts=None, num_threads=1, graphical=False):
    exclude_exts = set(exclude_exts or [])
    filtered = []
    for fp in file_list:
        ext = os.path.splitext(fp)[1].lower()
        if ext not in exclude_exts:
            filtered.append(fp)
    file_list = filtered

    results = {}
    progress = ProgressPrinter(len(file_list), desc="Hashing", graphical=graphical)

    def _hash_file(filepath):
        try:
            h = compute_hash(filepath, algorithms)
            return filepath, h, None
        except Exception as e:
            return filepath, None, str(e)

    if num_threads > 1:
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = {executor.submit(_hash_file, fp): fp for fp in file_list}
            for future in as_completed(futures):
                filepath, h, err = future.result()
                results[filepath] = {"hashes": h, "error": err}
                progress.update()
    else:
        for fp in file_list:
            filepath, h, err = _hash_file(fp)
            results[filepath] = {"hashes": h, "error": err}
            progress.update()

    progress.finish()
    return results


def output_csv(results, algorithms, output_path):
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        header = ["filepath"] + algorithms + ["error"]
        writer.writerow(header)
        for filepath, data in sorted(results.items()):
            row = [filepath]
            for algo in algorithms:
                row.append(data["hashes"].get(algo, "") if data["hashes"] else "")
            row.append(data.get("error", ""))
            writer.writerow(row)


def output_json(results, algorithms):
    output = []
    for filepath, data in sorted(results.items()):
        entry = {"filepath": filepath, "error": data.get("error", "")}
        if data["hashes"]:
            for algo in algorithms:
                entry[algo] = data["hashes"].get(algo, "")
        output.append(entry)
    return json.dumps(output, indent=2, ensure_ascii=False)


def output_html(results, algorithms, output_path):
    rows = []
    for filepath, data in sorted(results.items()):
        cells = [f"<td>{filepath}</td>"]
        for algo in algorithms:
            val = data["hashes"].get(algo, "") if data["hashes"] else ""
            cells.append(f"<td style='font-family:monospace;font-size:0.85em;'>{val}</td>")
        err = data.get("error", "")
        if err:
            cells.append(f"<td style='color:red;'>{err}</td>")
        else:
            cells.append("<td>OK</td>")
        rows.append("<tr>" + "".join(cells) + "</tr>")

    algo_headers = "".join(f"<th>{algo.upper()}</th>" for algo in algorithms)
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Hash Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; background: #f5f5f5; }}
h1 {{ color: #333; }}
table {{ border-collapse: collapse; width: 100%; background: white; }}
th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
th {{ background: #4a90d9; color: white; }}
tr:nth-child(even) {{ background: #f9f9f9; }}
tr:hover {{ background: #e8f0fe; }}
</style>
</head>
<body>
<h1>File Hash Report</h1>
<p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Algorithms: {', '.join(a.upper() for a in algorithms)} | Total files: {len(results)}</p>
<table>
<tr><th>File Path</th>{algo_headers}<th>Status</th></tr>
{"".join(rows)}
</table>
</body>
</html>"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)


def generate_checksum_file(results, algorithm, output_path):
    with open(output_path, "w", encoding="utf-8") as f:
        for filepath, data in sorted(results.items()):
            if data["hashes"] and algorithm in data["hashes"]:
                f.write(f"{data['hashes'][algorithm]}  {filepath}\n")


def verify_checksum_file(checksum_path, algorithm):
    passed = []
    failed = []
    errors = []
    with open(checksum_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    progress = ProgressPrinter(len(lines), desc="Verifying")
    for line in lines:
        line = line.rstrip("\n\r")
        if not line.strip():
            progress.update()
            continue
        parts = line.split("  ", 1)
        if len(parts) != 2:
            errors.append(f"Malformed line: {line}")
            progress.update()
            continue
        expected_hash, filepath = parts
        if not os.path.isfile(filepath):
            errors.append(f"File not found: {filepath}")
            progress.update()
            continue
        try:
            actual = compute_hash(filepath, [algorithm])
            if actual[algorithm] == expected_hash.lower():
                passed.append(filepath)
            else:
                failed.append((filepath, expected_hash, actual[algorithm]))
        except Exception as e:
            errors.append(f"Error hashing {filepath}: {e}")
        progress.update()
    progress.finish()
    return passed, failed, errors


def verify_hash_file(hash_file_path, algorithms):
    passed = []
    failed = []
    errors = []
    with open(hash_file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    progress = ProgressPrinter(len(lines), desc="Verifying")
    for line in lines:
        line = line.rstrip("\n\r")
        if not line.strip():
            progress.update()
            continue
        parts = line.split()
        if len(parts) < 2:
            errors.append(f"Malformed line: {line}")
            progress.update()
            continue
        filepath = parts[0]
        expected = parts[1]
        if not os.path.isfile(filepath):
            errors.append(f"File not found: {filepath}")
            progress.update()
            continue
        try:
            actual_all = compute_hash(filepath, algorithms)
            match = any(actual_all[a] == expected.lower() for a in algorithms if a in actual_all)
            if match:
                passed.append(filepath)
            else:
                failed.append((filepath, expected, actual_all))
        except Exception as e:
            errors.append(f"Error hashing {filepath}: {e}")
        progress.update()
    progress.finish()
    return passed, failed, errors


def find_duplicates(directory, algorithm="sha256", exclude_exts=None, num_threads=1, graphical=False):
    files = collect_files(directory, exclude_exts)
    results = batch_compute(files, [algorithm], num_threads=num_threads, graphical=graphical)
    hash_map = defaultdict(list)
    for filepath, data in results.items():
        if data["hashes"]:
            hash_map[data["hashes"][algorithm]].append(filepath)
    duplicates = []
    for h, paths in hash_map.items():
        if len(paths) > 1:
            duplicates.append((h, paths))
    return duplicates


def read_file_list(list_path):
    files = []
    with open(list_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and os.path.isfile(line):
                files.append(line)
            elif line:
                sys.stderr.write(f"Warning: file not found, skipping: {line}\n")
    return files


def cmd_single(args):
    algorithms = args.algorithms
    if not os.path.isfile(args.file):
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    try:
        result = compute_hash(args.file, algorithms, show_progress=True)
    except PermissionError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: failed to hash file: {e}", file=sys.stderr)
        sys.exit(1)
    if args.json:
        entry = {"filepath": args.file}
        for algo in algorithms:
            entry[algo] = result.get(algo, "")
        print(json.dumps(entry, indent=2, ensure_ascii=False))
    else:
        for algo in algorithms:
            print(f"{algo.upper()}: {result.get(algo, '')}")


def cmd_batch(args):
    algorithms = args.algorithms
    if not os.path.isdir(args.directory):
        print(f"Error: directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)
    files = collect_files(args.directory, args.exclude)
    results = batch_compute(files, algorithms, num_threads=args.threads, graphical=args.graphical)

    if args.csv:
        output_csv(results, algorithms, args.csv)
        print(f"CSV output saved to: {args.csv}")
    if args.html:
        output_html(results, algorithms, args.html)
        print(f"HTML report saved to: {args.html}")
    if args.json:
        print(output_json(results, algorithms))
    if args.checksum:
        algo = algorithms[0] if algorithms else "sha256"
        generate_checksum_file(results, algo, args.checksum)
        print(f"Checksum file saved to: {args.checksum}")
    if not any([args.csv, args.html, args.json, args.checksum]):
        for filepath, data in sorted(results.items()):
            if data["error"]:
                print(f"ERROR: {filepath}: {data['error']}")
            else:
                parts = [f"{a.upper()}={data['hashes'][a]}" for a in algorithms]
                print(f"{filepath}: {', '.join(parts)}")


def cmd_verify(args):
    algorithms = args.algorithms
    if args.checksum_file:
        algo = algorithms[0] if algorithms else "sha256"
        passed, failed, errors = verify_checksum_file(args.checksum_file, algo)
    elif args.hash_file:
        passed, failed, errors = verify_hash_file(args.hash_file, algorithms)
    else:
        print("Error: specify --checksum-file or --hash-file", file=sys.stderr)
        sys.exit(1)

    print(f"\nVerification Results:")
    print(f"  Passed: {len(passed)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Errors: {len(errors)}")

    if failed:
        print("\nFailed files:")
        for filepath, expected, actual in failed:
            print(f"  {filepath}")
            print(f"    Expected: {expected}")
            print(f"    Actual:   {actual}")
    if errors:
        print("\nErrors:")
        for err in errors:
            print(f"  {err}")

    if failed or errors:
        sys.exit(1)


def cmd_duplicates(args):
    algorithm = args.algorithms[0] if args.algorithms else "sha256"
    if not os.path.isdir(args.directory):
        print(f"Error: directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)
    duplicates = find_duplicates(
        args.directory, algorithm, args.exclude,
        num_threads=args.threads, graphical=args.graphical
    )
    if not duplicates:
        print("No duplicate files found.")
        return
    print(f"Found {len(duplicates)} group(s) of duplicate files:\n")
    for h, paths in duplicates:
        print(f"Hash: {h}")
        for p in paths:
            print(f"  {p}")
        print()


def cmd_filelist(args):
    algorithms = args.algorithms
    files = read_file_list(args.list_file)
    if not files:
        print("No valid files found in the list.", file=sys.stderr)
        sys.exit(1)
    results = batch_compute(files, algorithms, num_threads=args.threads, graphical=args.graphical)

    if args.csv:
        output_csv(results, algorithms, args.csv)
        print(f"CSV output saved to: {args.csv}")
    if args.html:
        output_html(results, algorithms, args.html)
        print(f"HTML report saved to: {args.html}")
    if args.json:
        print(output_json(results, algorithms))
    if args.checksum:
        algo = algorithms[0] if algorithms else "sha256"
        generate_checksum_file(results, algo, args.checksum)
        print(f"Checksum file saved to: {args.checksum}")
    if not any([args.csv, args.html, args.json, args.checksum]):
        for filepath, data in sorted(results.items()):
            if data["error"]:
                print(f"ERROR: {filepath}: {data['error']}")
            else:
                parts = [f"{a.upper()}={data['hashes'][a]}" for a in algorithms]
                print(f"{filepath}: {', '.join(parts)}")


def cmd_checksum(args):
    algorithms = args.algorithms
    algo = algorithms[0] if algorithms else "sha256"
    if not os.path.isfile(args.file):
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    result = compute_hash(args.file, [algo], show_progress=True)
    hash_val = result.get(algo, "")
    line = f"{hash_val}  {args.file}"
    print(line)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(line + "\n")
        print(f"Checksum saved to: {args.output}")


def cmd_pipe(args):
    algorithms = args.algorithms
    result = compute_hash_stdin(algorithms)
    if args.json:
        entry = {"source": "stdin"}
        for algo in algorithms:
            entry[algo] = result.get(algo, "")
        print(json.dumps(entry, indent=2, ensure_ascii=False))
    else:
        for algo in algorithms:
            print(f"{algo.upper()}: {result.get(algo, '')}")


def build_parser():
    parser = argparse.ArgumentParser(
        prog="hashtool",
        description="Command-line file hash verification tool with multi-algorithm support"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    parent_algo = argparse.ArgumentParser(add_help=False)
    parent_algo.add_argument(
        "-a", "--algorithms", nargs="+", choices=ALGORITHMS,
        default=["sha256"], help="Hash algorithms to use (default: sha256)"
    )

    parent_output = argparse.ArgumentParser(add_help=False)
    parent_output.add_argument("--csv", metavar="FILE", help="Output results to CSV file")
    parent_output.add_argument("--json", action="store_true", help="Output results as JSON")
    parent_output.add_argument("--html", metavar="FILE", help="Export results as HTML report")

    parent_batch = argparse.ArgumentParser(add_help=False)
    parent_batch.add_argument(
        "-t", "--threads", type=int, default=1,
        help="Number of threads for batch processing (default: 1)"
    )
    parent_batch.add_argument(
        "--exclude", nargs="*", default=[],
        help="File extensions to exclude (e.g. .tmp .log)"
    )
    parent_batch.add_argument(
        "--graphical", action="store_true",
        help="Use graphical progress bar characters"
    )

    p_single = subparsers.add_parser(
        "single", parents=[parent_algo],
        help="Calculate hash for a single file"
    )
    p_single.add_argument("file", help="Path to the file")
    p_single.add_argument("--json", action="store_true", help="Output as JSON")

    p_batch = subparsers.add_parser(
        "batch", parents=[parent_algo, parent_output, parent_batch],
        help="Batch calculate hashes for all files in a directory"
    )
    p_batch.add_argument("directory", help="Directory to scan recursively")
    p_batch.add_argument(
        "--checksum", metavar="FILE",
        help="Generate checksum manifest file (sha*sum format)"
    )

    p_verify = subparsers.add_parser(
        "verify", parents=[parent_algo],
        help="Verify files against a hash or checksum file"
    )
    p_verify.add_argument(
        "--checksum-file", metavar="FILE",
        help="Verify against checksum manifest file (sha*sum format)"
    )
    p_verify.add_argument(
        "--hash-file", metavar="FILE",
        help="Verify against hash file (format: filename hash_value per line)"
    )

    p_dupes = subparsers.add_parser(
        "duplicates", parents=[parent_algo, parent_batch],
        help="Find duplicate files based on hash values"
    )
    p_dupes.add_argument("directory", help="Directory to scan for duplicates")

    p_filelist = subparsers.add_parser(
        "filelist", parents=[parent_algo, parent_output, parent_batch],
        help="Calculate hashes for files listed in a text file"
    )
    p_filelist.add_argument("list_file", help="Text file containing file paths (one per line)")
    p_filelist.add_argument(
        "--checksum", metavar="FILE",
        help="Generate checksum manifest file"
    )

    p_pipe = subparsers.add_parser(
        "pipe", parents=[parent_algo],
        help="Read from stdin and output hash values"
    )
    p_pipe.add_argument("--json", action="store_true", help="Output as JSON")

    p_gen = subparsers.add_parser(
        "generate", parents=[parent_algo, parent_batch],
        help="Generate checksum manifest file for a directory"
    )
    p_gen.add_argument("directory", help="Directory to scan")
    p_gen.add_argument("output", help="Output checksum manifest file")

    p_check = subparsers.add_parser(
        "check", parents=[parent_algo],
        help="Verify integrity of a checksum manifest file"
    )
    p_check.add_argument("checksum_file", help="Checksum manifest file to verify")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch = {
        "single": cmd_single,
        "batch": cmd_batch,
        "verify": cmd_verify,
        "duplicates": cmd_duplicates,
        "filelist": cmd_filelist,
        "pipe": cmd_pipe,
        "generate": _cmd_generate,
        "check": _cmd_check,
    }

    fn = dispatch.get(args.command)
    if fn:
        fn(args)
    else:
        parser.print_help()


def _cmd_generate(args):
    algorithms = args.algorithms
    algo = algorithms[0] if algorithms else "sha256"
    if not os.path.isdir(args.directory):
        print(f"Error: directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)
    files = collect_files(args.directory, args.exclude)
    results = batch_compute(files, [algo], num_threads=args.threads, graphical=args.graphical)
    generate_checksum_file(results, algo, args.output)
    print(f"Checksum manifest saved to: {args.output} ({len(results)} files)")


def _cmd_check(args):
    algorithms = args.algorithms
    algo = algorithms[0] if algorithms else "sha256"
    if not os.path.isfile(args.checksum_file):
        print(f"Error: file not found: {args.checksum_file}", file=sys.stderr)
        sys.exit(1)
    passed, failed, errors = verify_checksum_file(args.checksum_file, algo)
    print(f"\nVerification Results:")
    print(f"  Passed: {len(passed)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Errors: {len(errors)}")
    if passed:
        print("\nPassed files:")
        for f in passed:
            print(f"  OK: {f}")
    if failed:
        print("\nFailed files:")
        for filepath, expected, actual in failed:
            print(f"  FAILED: {filepath}")
            print(f"    Expected: {expected}")
            print(f"    Actual:   {actual}")
    if errors:
        print("\nErrors:")
        for err in errors:
            print(f"  {err}")
    if failed or errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
