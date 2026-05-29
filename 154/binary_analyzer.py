#!/usr/bin/env python3
import argparse
import os
import sys
import json
import time

from modules.core import (
    get_file_size, read_file_header, bytes_to_hex,
    identify_file_type, detect_signatures, FILE_SIGNATURES
)
from modules.entropy import calculate_entropy, get_byte_distribution, is_encrypted_or_compressed
from modules.strings import extract_strings
from modules.hasher import calculate_hashes
from modules.hexview import hex_view, paginate_hex_view
from modules.searcher import search_hex_pattern, search_string, hex_pattern_to_bytes
from modules.pe_analyzer import analyze_pe
from modules.elf_analyzer import analyze_elf
from modules.disassembler import disassemble
from modules.file_ops import split_file, merge_files
from modules.reporter import export_json, export_html
from modules.comparator import compare_files


def print_separator(title=None):
    if title:
        line = '=' * 60
        print(f'\n{line}')
        print(f'  {title}')
        print(line)
    else:
        print('=' * 60)


def print_basic_info(file_path):
    print_separator('BASIC FILE INFORMATION')
    size = get_file_size(file_path)
    print(f'File Path     : {file_path}')
    print(f'File Size     : {size} bytes ({size / 1024:.2f} KB, {size / 1024 / 1024:.4f} MB)')

    header = read_file_header(file_path, 64)
    print(f'\nFile Header (first 64 bytes):')
    print(bytes_to_hex(header))

    ftype, magic_hex = identify_file_type(header)
    print(f'\nFile Type     : {ftype}')
    print(f'Magic Number  : {magic_hex}')

    sigs = detect_signatures(header)
    if sigs:
        print(f'\nDetected Signatures:')
        for ftype, sig, offset in sigs:
            print(f'  Offset 0x{offset:08x}: {sig} -> {ftype}')


def print_entropy_analysis(file_path):
    print_separator('ENTROPY ANALYSIS')
    with open(file_path, 'rb') as f:
        data = f.read()

    entropy = calculate_entropy(data)
    distribution = get_byte_distribution(data)
    is_enc, message = is_encrypted_or_compressed(entropy, len(data))

    print(f'Entropy Value : {entropy:.4f} / 8.0')
    print(f'Status        : {message}')

    top_bytes = sorted(enumerate(distribution), key=lambda x: -x[1])[:10]
    print(f'\nTop 10 Most Common Bytes:')
    for byte_val, count in top_bytes:
        if count > 0:
            pct = (count / len(data)) * 100
            char_repr = repr(chr(byte_val)) if 32 <= byte_val < 127 else '---'
            print(f'  0x{byte_val:02x} ({char_repr:>7}): {count:>8} ({pct:6.2f}%)')


def print_strings(file_path, min_length=4, max_display=100):
    print_separator('EXTRACTED STRINGS')
    with open(file_path, 'rb') as f:
        data = f.read()

    strings = extract_strings(data, min_length)
    print(f'Found {len(strings)} strings with length >= {min_length}:')

    for i, (offset, s) in enumerate(strings):
        if i >= max_display:
            print(f'  ... and {len(strings) - max_display} more')
            break
        print(f'  0x{offset:08x}: {repr(s)}')


def print_hashes(file_path):
    print_separator('FILE HASHES')
    hashes = calculate_hashes(file_path)
    for algo, hash_val in hashes.items():
        print(f'{algo:<8}: {hash_val}')


def print_pe_analysis(file_path):
    print_separator('PE FILE ANALYSIS')
    result = analyze_pe(file_path)

    if result.get('error'):
        print(f'Error: {result["error"]}')
        return

    if not result.get('is_pe'):
        print('Not a PE executable file.')
        return

    print(f'✓ Valid PE executable detected\n')

    sections = result.get('sections', [])
    print(f'Sections ({len(sections)}):')
    if sections:
        print(f'  {"Name":<16} {"VirtAddr":<12} {"VirtSize":<12} {"RawOffset":<12} {"RawSize":<12} {"Characteristics":<14}')
        print(f'  {"-" * 16} {"-" * 12} {"-" * 12} {"-" * 12} {"-" * 12} {"-" * 14}')
        for sec in sections:
            print(f'  {sec["name"]:<16} {sec["virtual_address"]:<12} {sec["virtual_size"]:<12} {sec["raw_offset"]:<12} {sec["raw_size"]:<12} {sec["characteristics"]:<14}')

    imports = result.get('imports', [])
    print(f'\nImport Table ({len(imports)} DLLs):')
    if imports:
        for imp in imports:
            print(f'  DLL: {imp["dll_name"]}')
            for func in imp["functions"][:20]:
                print(f'    - {func}')
            if len(imp["functions"]) > 20:
                print(f'    ... and {len(imp["functions"]) - 20} more')

    exports = result.get('exports', [])
    print(f'\nExport Table ({len(exports)} functions):')
    if exports:
        print(f'  {"Ordinal":<8} {"Address":<18} {"Name"}')
        print(f'  {"-" * 8} {"-" * 18} {"-" * 40}')
        for exp in exports[:50]:
            print(f'  {exp["ordinal"]:<8} {exp["address"]:<18} {exp["name"]}')
        if len(exports) > 50:
            print(f'  ... and {len(exports) - 50} more')


def print_elf_analysis(file_path):
    print_separator('ELF FILE ANALYSIS')
    result = analyze_elf(file_path)

    if result.get('error'):
        print(f'Error: {result["error"]}')
        return

    if not result.get('is_elf'):
        print('Not an ELF executable file.')
        return

    print(f'✓ Valid ELF executable detected\n')

    phdrs = result.get('program_headers', [])
    print(f'Program Headers ({len(phdrs)}):')
    if phdrs:
        print(f'  {"Type":<20} {"Offset":<12} {"VAddr":<14} {"PAddr":<14} {"FileSz":<10} {"MemSz":<10} {"Flags":<8}')
        print(f'  {"-" * 20} {"-" * 12} {"-" * 14} {"-" * 14} {"-" * 10} {"-" * 10} {"-" * 8}')
        for ph in phdrs:
            print(f'  {ph["type"]:<20} {ph["offset"]:<12} {ph["vaddr"]:<14} {ph["paddr"]:<14} {ph["filesz"]:<10} {ph["memsz"]:<10} {ph["flags"]:<8}')

    shdrs = result.get('section_headers', [])
    print(f'\nSection Headers ({len(shdrs)}):')
    if shdrs:
        print(f'  {"Name":<24} {"Type":<18} {"Offset":<12} {"Addr":<14} {"Size":<10} {"Flags":<14}')
        print(f'  {"-" * 24} {"-" * 18} {"-" * 12} {"-" * 14} {"-" * 10} {"-" * 14}')
        for sh in shdrs:
            print(f'  {sh["name"]:<24} {sh["type"]:<18} {sh["offset"]:<12} {sh["addr"]:<14} {sh["size"]:<10} {sh["flags"]:<14}')

    dyn = result.get('dynamic_segment', [])
    print(f'\nDynamic Segment ({len(dyn)} entries):')
    if dyn:
        for d in dyn:
            print(f'  {d["tag"]:<24}: {d["value"]}')


def print_hex_view(file_path, offset=0, length=None, page_size=None):
    print_separator('HEX VIEW')
    with open(file_path, 'rb') as f:
        f.seek(offset)
        if length:
            data = f.read(length)
        else:
            data = f.read()

    if page_size:
        for page_num, page_lines in enumerate(paginate_hex_view(data, page_size=page_size), 1):
            print(f'\n--- Page {page_num} (0x{offset + (page_num - 1) * page_size:08x}) ---')
            for line in page_lines:
                print(line)
            if page_num * page_size < len(data):
                try:
                    input('\nPress Enter to continue, Ctrl+C to quit... ')
                except KeyboardInterrupt:
                    print('\nStopped.')
                    break
    else:
        for line in hex_view(data, offset=offset):
            print(line)


def print_search(file_path, pattern, is_hex=False, case_sensitive=True):
    print_separator('SEARCH RESULTS')
    with open(file_path, 'rb') as f:
        data = f.read()

    if is_hex:
        offsets = search_hex_pattern(data, pattern)
        print(f'Searching for hex pattern: {pattern}')
        print(f'Found {len(offsets)} matches:')
        for offset in offsets:
            context_start = max(0, offset - 8)
            context_end = min(len(data), offset + 16)
            context = data[context_start:context_end]
            hex_ctx = ' '.join(f'{b:02x}' for b in context)
            print(f'  Offset 0x{offset:08x}: ...{hex_ctx}...')
    else:
        results = search_string(data, pattern, case_sensitive=case_sensitive)
        print(f'Searching for string: {repr(pattern)} (case_{"sensitive" if case_sensitive else "insensitive"})')
        print(f'Found {len(results)} matches:')
        for offset, s in results:
            print(f'  Offset 0x{offset:08x}: {repr(s)}')


def print_disassembly(file_path, offset=0, arch='x86', mode='32', count=100, length=None):
    print_separator('DISASSEMBLY')
    with open(file_path, 'rb') as f:
        f.seek(offset)
        if length:
            data = f.read(length)
        else:
            data = f.read()

    result = disassemble(data, offset=offset, arch=arch, mode=mode, count=count)

    if not result['success']:
        print(f'Error: {result["error"]}')
        return

    print(f'Architecture: {arch} ({mode}-bit mode)')
    print(f'Start Offset: 0x{offset:08x}')
    print(f'Disassembled {len(result["instructions"])} instructions:\n')
    print(f'  {"Address":<14} {"Bytes":<20} {"Instruction"}')
    print(f'  {"-" * 14} {"-" * 20} {"-" * 40}')
    for insn in result['instructions']:
        print(f'  0x{insn["address"]:<12x} {insn["bytes_hex"]:<20} {insn["mnemonic"]} {insn["op_str"]}')


def print_comparison(file1, file2):
    print_separator('BINARY COMPARISON')
    result = compare_files(file1, file2)

    if result.get('error'):
        print(f'Error: {result["error"]}')
        return

    print(f'File 1: {file1} ({result["file1_size"]} bytes)')
    print(f'File 2: {file2} ({result["file2_size"]} bytes)')
    print(f'Size Difference: {result["size_difference"]} bytes')
    print(f'Files are Identical: {result["identical"]}')
    print(f'Total Differences: {result["total_differences"]} bytes\n')

    diffs = result['differing_bytes']
    if diffs:
        print(f'First {len(diffs)} differing bytes:')
        print(f'  {"Offset":<14} {"File 1":<10} {"File 2":<10}')
        print(f'  {"-" * 14} {"-" * 10} {"-" * 10}')
        for d in diffs:
            print(f'  0x{d["offset"]:<12x} {d["file1_value"]:<10} {d["file2_value"]:<10}')


def run_full_analysis(file_path):
    print_basic_info(file_path)
    print_entropy_analysis(file_path)
    print_strings(file_path)
    print_hashes(file_path)
    print_pe_analysis(file_path)
    print_elf_analysis(file_path)


def build_analysis_data(file_path):
    data = {
        'file_path': file_path,
        'analysis_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'file_info': {},
        'type_detection': {},
        'entropy': {},
        'strings': [],
        'pe_analysis': {},
        'elf_analysis': {},
        'hashes': {}
    }

    size = get_file_size(file_path)
    header = read_file_header(file_path, 64)
    ftype, magic_hex = identify_file_type(header)
    sigs = detect_signatures(header)

    data['file_info'] = {
        'path': file_path,
        'size_bytes': size,
        'size_kb': size / 1024,
        'size_mb': size / 1024 / 1024,
        'header_hex': header.hex()
    }

    data['type_detection'] = {
        'file_type': ftype,
        'magic_number': magic_hex,
        'detected_signatures': [
            {'type': t, 'signature_hex': s, 'offset': o}
            for t, s, o in sigs
        ]
    }

    with open(file_path, 'rb') as f:
        file_data = f.read()

    entropy = calculate_entropy(file_data)
    is_enc, message = is_encrypted_or_compressed(entropy, len(file_data))
    data['entropy'] = {
        'value': entropy,
        'max': 8.0,
        'is_encrypted_or_compressed': is_enc,
        'message': message
    }

    strings = extract_strings(file_data, 4)
    data['strings'] = [
        {'offset': o, 'string': s, 'length': len(s)}
        for o, s in strings
    ]

    data['pe_analysis'] = analyze_pe(file_path)
    data['elf_analysis'] = analyze_elf(file_path)
    data['hashes'] = calculate_hashes(file_path)

    return data


def main():
    parser = argparse.ArgumentParser(
        description='Binary File Analysis Tool - Comprehensive binary analysis utility',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s analyze /path/to/file.bin
  %(prog)s hexview /path/to/file.bin --offset 0x100 --length 256
  %(prog)s search /path/to/file.bin --pattern "Hello"
  %(prog)s search /path/to/file.bin --pattern "48 65 6c 6c 6f" --hex
  %(prog)s disasm /path/to/code.bin --arch x86 --mode 64 --count 50
  %(prog)s split /path/to/file.bin --offset 1024
  %(prog)s merge /path/to/output.bin --files part1 part2 part3
  %(prog)s compare file1.bin file2.bin
  %(prog)s export /path/to/file.bin --json report.json --html report.html
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    analyze_parser = subparsers.add_parser('analyze', help='Run full analysis on a binary file')
    analyze_parser.add_argument('file', help='Path to the binary file')

    basic_parser = subparsers.add_parser('basic', help='Show basic file information')
    basic_parser.add_argument('file', help='Path to the binary file')

    entropy_parser = subparsers.add_parser('entropy', help='Analyze file entropy')
    entropy_parser.add_argument('file', help='Path to the binary file')

    strings_parser = subparsers.add_parser('strings', help='Extract printable ASCII strings')
    strings_parser.add_argument('file', help='Path to the binary file')
    strings_parser.add_argument('--min-length', type=int, default=4, help='Minimum string length (default: 4)')
    strings_parser.add_argument('--max-display', type=int, default=100, help='Maximum strings to display (default: 100)')

    hashes_parser = subparsers.add_parser('hashes', help='Calculate file hashes (MD5, SHA1, SHA256)')
    hashes_parser.add_argument('file', help='Path to the binary file')

    pe_parser = subparsers.add_parser('pe', help='Analyze PE (Windows) executable')
    pe_parser.add_argument('file', help='Path to the PE file')

    elf_parser = subparsers.add_parser('elf', help='Analyze ELF (Linux/Unix) executable')
    elf_parser.add_argument('file', help='Path to the ELF file')

    hexview_parser = subparsers.add_parser('hexview', help='Hex view of binary file')
    hexview_parser.add_argument('file', help='Path to the binary file')
    hexview_parser.add_argument('--offset', type=lambda x: int(x, 0), default=0, help='Start offset (hex or decimal, default: 0)')
    hexview_parser.add_argument('--length', type=lambda x: int(x, 0), default=None, help='Number of bytes to display')
    hexview_parser.add_argument('--page-size', type=lambda x: int(x, 0), default=None, help='Page size for pagination (e.g. 256)')

    search_parser = subparsers.add_parser('search', help='Search binary file for patterns')
    search_parser.add_argument('file', help='Path to the binary file')
    search_parser.add_argument('--pattern', required=True, help='Search pattern')
    search_parser.add_argument('--hex', action='store_true', help='Pattern is hex (e.g. "48 65 6c 6c 6f")')
    search_parser.add_argument('--case-insensitive', action='store_true', help='Case-insensitive string search')

    disasm_parser = subparsers.add_parser('disasm', help='Disassemble machine code')
    disasm_parser.add_argument('file', help='Path to the binary file')
    disasm_parser.add_argument('--offset', type=lambda x: int(x, 0), default=0, help='Start offset (default: 0)')
    disasm_parser.add_argument('--length', type=lambda x: int(x, 0), default=None, help='Number of bytes to disassemble')
    disasm_parser.add_argument('--arch', choices=['x86', 'arm'], default='x86', help='Architecture (default: x86)')
    disasm_parser.add_argument('--mode', default='32', help='Mode: 32/64 for x86, arm/thumb for ARM (default: 32)')
    disasm_parser.add_argument('--count', type=int, default=100, help='Maximum number of instructions (default: 100)')

    split_parser = subparsers.add_parser('split', help='Split a file at specified offset')
    split_parser.add_argument('file', help='Path to the file to split')
    split_parser.add_argument('--offset', type=lambda x: int(x, 0), required=True, help='Split offset in bytes')
    split_parser.add_argument('--output-dir', default='.', help='Output directory (default: current)')

    merge_parser = subparsers.add_parser('merge', help='Merge multiple files into one')
    merge_parser.add_argument('output', help='Output file path')
    merge_parser.add_argument('--files', nargs='+', required=True, help='Input files in order')

    compare_parser = subparsers.add_parser('compare', help='Compare two binary files')
    compare_parser.add_argument('file1', help='First file')
    compare_parser.add_argument('file2', help='Second file')

    export_parser = subparsers.add_parser('export', help='Export analysis report')
    export_parser.add_argument('file', help='Path to the binary file to analyze')
    export_parser.add_argument('--json', help='Output JSON report path')
    export_parser.add_argument('--html', help='Output HTML report path')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command != 'merge' and args.command != 'compare':
        file_path = args.file if hasattr(args, 'file') else None
        if file_path and not os.path.exists(file_path):
            print(f'Error: File not found: {file_path}', file=sys.stderr)
            sys.exit(1)

    try:
        if args.command == 'analyze':
            run_full_analysis(args.file)

        elif args.command == 'basic':
            print_basic_info(args.file)

        elif args.command == 'entropy':
            print_entropy_analysis(args.file)

        elif args.command == 'strings':
            print_strings(args.file, min_length=args.min_length, max_display=args.max_display)

        elif args.command == 'hashes':
            print_hashes(args.file)

        elif args.command == 'pe':
            print_pe_analysis(args.file)

        elif args.command == 'elf':
            print_elf_analysis(args.file)

        elif args.command == 'hexview':
            print_hex_view(args.file, offset=args.offset, length=args.length, page_size=args.page_size)

        elif args.command == 'search':
            print_search(args.file, args.pattern, is_hex=args.hex, case_sensitive=not args.case_insensitive)

        elif args.command == 'disasm':
            print_disassembly(args.file, offset=args.offset, arch=args.arch, mode=args.mode, count=args.count, length=args.length)

        elif args.command == 'split':
            part1, part2 = split_file(args.file, args.offset, args.output_dir)
            print(f'File split successfully!')
            print(f'  Part 1: {part1} (0 to {args.offset} bytes)')
            print(f'  Part 2: {part2} ({args.offset} to end)')

        elif args.command == 'merge':
            for f in args.files:
                if not os.path.exists(f):
                    print(f'Error: File not found: {f}', file=sys.stderr)
                    sys.exit(1)
            output = merge_files(args.files, args.output)
            print(f'Files merged successfully into: {output}')

        elif args.command == 'compare':
            print_comparison(args.file1, args.file2)

        elif args.command == 'export':
            print(f'Analyzing file: {args.file}')
            analysis_data = build_analysis_data(args.file)
            if args.json:
                export_json(analysis_data, args.json)
                print(f'JSON report exported to: {args.json}')
            if args.html:
                export_html(analysis_data, args.html)
                print(f'HTML report exported to: {args.html}')
            if not args.json and not args.html:
                print(json.dumps(analysis_data, indent=2, default=str))

        print_separator()
        print('Analysis complete.')

    except KeyboardInterrupt:
        print('\nOperation cancelled by user.', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
