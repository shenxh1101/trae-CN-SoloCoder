#!/usr/bin/env python3

import argparse
import csv
import os
import re
import sys
from collections import OrderedDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DICT_DIR = BASE_DIR / "dictionaries"
USER_DICT_DIR = Path.home() / ".spellchecker"
USER_DICT_FILE = USER_DICT_DIR / "user_dict.txt"
IGNORE_LIST_FILE = USER_DICT_DIR / "ignore_list.txt"

DEFAULT_DICTS = {
    "en": DICT_DIR / "en.txt",
    "zh": DICT_DIR / "zh.txt",
}


def edit_distance(s1, s2):
    if len(s1) < len(s2):
        return edit_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            ins = prev[j + 1] + 1
            dele = curr[j] + 1
            sub = prev[j] + (0 if c1 == c2 else 1)
            curr.append(min(ins, dele, sub))
        prev = curr
    return prev[-1]


def split_camel_case(word):
    parts = re.sub(r"([a-z])([A-Z])", r"\1 \2", word)
    parts = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", parts)
    return parts.split()


class SpellChecker:
    def __init__(self, lang="en", dict_path=None, ignore_case=True,
                 check_camel=True, ignore_list_path=None):
        self.lang = lang
        self.ignore_case = ignore_case
        self.check_camel = check_camel
        self.system_dict = set()
        self.user_dict = set()
        self.ignore_list = set()

        if dict_path:
            self._load_dictionary(dict_path, self.system_dict)
        else:
            default_path = DEFAULT_DICTS.get(lang)
            if default_path and default_path.exists():
                self._load_dictionary(default_path, self.system_dict)

        if USER_DICT_FILE.exists():
            self._load_dictionary(USER_DICT_FILE, self.user_dict)

        ilist = ignore_list_path or IGNORE_LIST_FILE
        if Path(ilist).exists():
            self._load_dictionary(ilist, self.ignore_list)

    def _load_dictionary(self, path, target_set):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                word = line.strip()
                if word:
                    if self.ignore_case:
                        target_set.add(word.lower())
                    else:
                        target_set.add(word)

    @property
    def all_words(self):
        return self.system_dict | self.user_dict

    def is_correct(self, word):
        w = word.lower() if self.ignore_case else word
        if w in self.ignore_list:
            return True
        if w in self.all_words:
            return True
        if self.check_camel and re.search(r"[a-z][A-Z]", word):
            parts = split_camel_case(word)
            for part in parts:
                pw = part.lower() if self.ignore_case else part
                if pw in self.all_words or pw in self.ignore_list:
                    if not self.is_correct(part):
                        return False
            return True
        return False

    def suggest(self, word, max_suggestions=None, max_distance=None):
        max_suggestions = max_suggestions or getattr(self, "suggest_max_suggestions", 5)
        max_distance = max_distance or getattr(self, "suggest_max_distance", 2)
        w = word.lower() if self.ignore_case else word
        candidates = []
        for dw in self.all_words:
            d = edit_distance(w, dw)
            if d <= max_distance:
                candidates.append((d, dw))
        candidates.sort(key=lambda x: (x[0], x[1]))
        return [c[1] for c in candidates[:max_suggestions]]

    def autocomplete(self, prefix, max_results=10):
        p = prefix.lower() if self.ignore_case else prefix
        matches = []
        for w in self.all_words:
            wl = w.lower() if self.ignore_case else w
            if wl.startswith(p):
                matches.append(w)
        matches.sort()
        return matches[:max_results]

    def check_text(self, text):
        word_pattern = re.compile(r"[a-zA-Z]+(?:'[a-zA-Z]+)?")
        results = []
        for match in word_pattern.finditer(text):
            word = match.group()
            if not self.is_correct(word):
                results.append({
                    "word": word,
                    "position": match.start(),
                    "suggestions": self.suggest(word),
                })
        return results

    def check_file(self, filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        results = []
        for lineno, line in enumerate(lines, 1):
            word_pattern = re.compile(r"[a-zA-Z]+(?:'[a-zA-Z]+)?")
            for match in word_pattern.finditer(line):
                word = match.group()
                if not self.is_correct(word):
                    start = max(0, match.start() - 15)
                    end = min(len(line), match.end() + 15)
                    context = line[start:end].strip()
                    results.append({
                        "word": word,
                        "line": lineno,
                        "col": match.start() + 1,
                        "suggestions": self.suggest(word),
                        "context": context,
                    })
        return results

    def add_user_word(self, word):
        USER_DICT_DIR.mkdir(parents=True, exist_ok=True)
        w = word.lower() if self.ignore_case else word
        self.user_dict.add(w)
        with open(USER_DICT_FILE, "a", encoding="utf-8") as f:
            f.write(w + "\n")

    def add_ignore_word(self, word):
        USER_DICT_DIR.mkdir(parents=True, exist_ok=True)
        w = word.lower() if self.ignore_case else word
        self.ignore_list.add(w)
        with open(IGNORE_LIST_FILE, "a", encoding="utf-8") as f:
            f.write(w + "\n")

    def generate_report(self, results, total_words):
        correct = total_words - len(results)
        error_rate = (len(results) / total_words * 100) if total_words > 0 else 0.0
        return {
            "total_words": total_words,
            "correct_words": correct,
            "error_words": len(results),
            "error_rate": round(error_rate, 2),
        }

    def count_words_in_text(self, text):
        return len(re.findall(r"[a-zA-Z]+(?:'[a-zA-Z]+)?", text))


def format_results(results, show_context=False):
    if not results:
        print("✓ No spelling errors found.")
        return
    for r in results:
        parts = [f"  ✗ '{r['word']}'"]
        if "line" in r:
            parts.append(f"(line {r['line']}, col {r['col']})")
        if show_context and "context" in r:
            parts.append(f"context: ...{r['context']}...")
        if r["suggestions"]:
            parts.append(f"→ suggestions: {', '.join(r['suggestions'])}")
        else:
            parts.append("→ no suggestions")
        print(" ".join(parts))


def format_report(report):
    print("\n" + "=" * 40)
    print("  SPELLING CHECK REPORT")
    print("=" * 40)
    print(f"  Total words:    {report['total_words']}")
    print(f"  Correct words:  {report['correct_words']}")
    print(f"  Error words:    {report['error_words']}")
    print(f"  Error rate:     {report['error_rate']}%")
    print("=" * 40)


def export_csv(results, output_path):
    fieldnames = ["word", "line", "col", "suggestions", "context"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in results:
            row = dict(r)
            row["suggestions"] = "; ".join(row.get("suggestions", []))
            writer.writerow(row)


def interactive_mode(checker):
    import readline

    print("Spell Checker — Interactive Mode")
    print("Type a word to check spelling. Commands:")
    print("  :add <word>    — add word to user dictionary")
    print("  :ignore <word> — add word to ignore list")
    print("  :quit          — exit")
    print()

    while True:
        try:
            raw = input(">>> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not raw:
            continue

        if raw.startswith(":"):
            parts = raw.split(maxsplit=1)
            cmd = parts[0].lower()
            arg = parts[1] if len(parts) > 1 else ""

            if cmd == ":quit":
                print("Bye!")
                break
            elif cmd == ":add" and arg:
                checker.add_user_word(arg)
                print(f"  ✓ Added '{arg}' to user dictionary.")
            elif cmd == ":ignore" and arg:
                checker.add_ignore_word(arg)
                print(f"  ✓ Added '{arg}' to ignore list.")
            else:
                print("  Unknown command.")
            continue

        if " " in raw:
            total = checker.count_words_in_text(raw)
            results = checker.check_text(raw)
            format_results(results, show_context=False)
            if results:
                report = checker.generate_report(results, total)
                format_report(report)
        else:
            word = raw
            if checker.is_correct(word):
                print(f"  ✓ '{word}' is correct.")
            else:
                suggestions = checker.suggest(word)
                if suggestions:
                    print(f"  ✗ '{word}' is misspelled → {', '.join(suggestions)}")
                else:
                    print(f"  ✗ '{word}' is misspelled → no suggestions")

                auto = checker.autocomplete(word[:3])
                if auto:
                    print(f"  Autocomplete: {', '.join(auto)}")


def pipe_mode(checker, show_context=False, report_flag=False):
    text = sys.stdin.read()
    if not text.strip():
        return
    total = checker.count_words_in_text(text)
    results = checker.check_text(text)
    for r in results:
        r["line"] = 1
        r["col"] = r["position"] + 1
        r["context"] = text[max(0, r["position"] - 15):r["position"] + len(r["word"]) + 15].strip()
    format_results(results, show_context=show_context)
    if report_flag:
        report = checker.generate_report(results, total)
        format_report(report)


def main():
    parser = argparse.ArgumentParser(
        description="Command-line spell checker tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s word                    Check a single word
  %(prog)s "some text here"        Check a text string
  %(prog)s -f document.txt         Check a file
  %(prog)s -i                      Interactive mode
  %(prog)s -f doc.txt --csv out    Export errors to CSV
  echo "hello wrld" | %(prog)s     Pipe mode
""",
    )

    parser.add_argument("input", nargs="?", help="Word or text to check")
    parser.add_argument("-f", "--file", help="Input text file to check")
    parser.add_argument("-i", "--interactive", action="store_true",
                        help="Interactive mode")
    parser.add_argument("-l", "--lang", default="en",
                        choices=["en", "zh"], help="Language (default: en)")
    parser.add_argument("-d", "--dict", help="Custom dictionary file path")
    parser.add_argument("--no-ignore-case", action="store_true",
                        help="Case-sensitive checking")
    parser.add_argument("--no-camel", action="store_true",
                        help="Disable camelCase splitting")
    parser.add_argument("--context", action="store_true",
                        help="Show context snippets for errors")
    parser.add_argument("--report", action="store_true",
                        help="Show statistics report")
    parser.add_argument("--csv", metavar="FILE",
                        help="Export errors to CSV file")
    parser.add_argument("--add-word", metavar="WORD",
                        help="Add a word to user dictionary and exit")
    parser.add_argument("--ignore-word", metavar="WORD",
                        help="Add a word to ignore list and exit")
    parser.add_argument("--ignore-list", metavar="FILE",
                        help="Custom ignore list file")
    parser.add_argument("--max-distance", type=int, default=2,
                        help="Max edit distance for suggestions (default: 2)")
    parser.add_argument("--max-suggestions", type=int, default=5,
                        help="Max number of suggestions (default: 5)")

    args = parser.parse_args()

    checker = SpellChecker(
        lang=args.lang,
        dict_path=args.dict,
        ignore_case=not args.no_ignore_case,
        check_camel=not args.no_camel,
        ignore_list_path=args.ignore_list,
    )

    checker.suggest_max_distance = args.max_distance
    checker.suggest_max_suggestions = args.max_suggestions

    if args.add_word:
        checker.add_user_word(args.add_word)
        print(f"Added '{args.add_word}' to user dictionary.")
        return

    if args.ignore_word:
        checker.add_ignore_word(args.ignore_word)
        print(f"Added '{args.ignore_word}' to ignore list.")
        return

    if args.interactive:
        interactive_mode(checker)
        return

    if args.file:
        results = checker.check_file(args.file)
        format_results(results, show_context=args.context)
        if args.report:
            with open(args.file, "r", encoding="utf-8") as f:
                text = f.read()
            total = checker.count_words_in_text(text)
            report = checker.generate_report(results, total)
            format_report(report)
        if args.csv:
            export_csv(results, args.csv)
            print(f"\nExported errors to {args.csv}")
        return

    if args.input:
        total = checker.count_words_in_text(args.input)
        results = checker.check_text(args.input)
        for r in results:
            r["line"] = 1
            r["col"] = r["position"] + 1
        format_results(results, show_context=args.context)
        if args.report:
            report = checker.generate_report(results, total)
            format_report(report)
        if args.csv:
            for r in results:
                r["context"] = args.input[max(0, r["position"] - 15):r["position"] + len(r["word"]) + 15]
            export_csv(results, args.csv)
            print(f"\nExported errors to {args.csv}")
        return

    if not sys.stdin.isatty():
        pipe_mode(checker, show_context=args.context, report_flag=args.report)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
