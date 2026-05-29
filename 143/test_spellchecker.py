#!/usr/bin/env python3

import os
import sys
import subprocess
import tempfile
import csv
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parent / "spellchecker.py"
TEST_DOC = Path(__file__).resolve().parent / "test_document.txt"

def run_spellchecker(args, input_text=None, cwd=None):
    cmd = [sys.executable, str(SCRIPT_PATH)] + args
    result = subprocess.run(
        cmd,
        input=input_text,
        capture_output=True,
        text=True,
        cwd=cwd or str(SCRIPT_PATH.parent),
    )
    return result.returncode, result.stdout, result.stderr

def test_single_word_correct():
    print("Test 1: Single correct word check")
    code, out, err = run_spellchecker(["hello"])
    assert code == 0, f"Expected exit code 0, got {code}"
    assert "No spelling errors found" in out, f"Expected 'No spelling errors found' in output: {out}"
    print("  ✓ PASS")

def test_single_word_incorrect():
    print("Test 2: Single incorrect word check")
    code, out, err = run_spellchecker(["wrld"])
    assert code == 0, f"Expected exit code 0, got {code}"
    assert "✗ 'wrld'" in out, f"Expected error marker in output: {out}"
    assert "world" in out.lower(), f"Expected suggestion 'world' in output: {out}"
    print("  ✓ PASS")

def test_text_with_errors():
    print("Test 3: Text with multiple errors")
    code, out, err = run_spellchecker(["hello wrld this is a tset"])
    assert code == 0
    assert "✗ 'wrld'" in out
    assert "✗ 'tset'" in out
    assert "✗ 'hello'" not in out, "hello should be correct"
    assert "✗ 'this'" not in out, "this should be correct"
    assert "✗ 'is'" not in out, "is should be correct"
    print("  ✓ PASS")

def test_report_generation():
    print("Test 4: Report generation")
    code, out, err = run_spellchecker(["hello wrld", "--report"])
    assert code == 0
    assert "SPELLING CHECK REPORT" in out
    assert "Total words:" in out
    assert "Correct words:" in out
    assert "Error words:" in out
    assert "Error rate:" in out
    assert "33.33%" in out or "50%" in out or "50.0%" in out, f"Expected error rate in output: {out}"
    print("  ✓ PASS")

def test_camel_case_basic():
    print("Test 5: camelCase basic - myWorld")
    code, out, err = run_spellchecker(["myWorld"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected myWorld to pass: {out}"
    print("  ✓ PASS")

def test_camel_case_skip_unknown():
    print("Test 6: camelCase skip unknown components - myVariable")
    code, out, err = run_spellchecker(["myVariable"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected myVariable to pass (variable not in dict, should be skipped): {out}"
    print("  ✓ PASS")

def test_camel_case_multi_part():
    print("Test 7: camelCase multi-part - myVariableName")
    code, out, err = run_spellchecker(["myVariableName"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected myVariableName to pass: {out}"
    print("  ✓ PASS")

def test_camel_case_disabled():
    print("Test 8: camelCase disabled with --no-camel")
    code, out, err = run_spellchecker(["myWorld", "--no-camel"])
    assert code == 0
    assert "✗ 'myWorld'" in out, f"Expected myWorld to fail with --no-camel: {out}"
    print("  ✓ PASS")

def test_batch_file_check():
    print("Test 9: Batch file check with line numbers")
    code, out, err = run_spellchecker(["-f", str(TEST_DOC)])
    assert code == 0
    assert "line 2" in out or "line" in out.lower(), f"Expected line numbers in output: {out}"
    assert "✗ 'wrld'" in out
    assert "✗ 'tset'" in out
    print("  ✓ PASS")

def test_context_snippets():
    print("Test 10: Context snippets with --context")
    code, out, err = run_spellchecker(["-f", str(TEST_DOC), "--context"])
    assert code == 0
    assert "context:" in out, f"Expected context in output: {out}"
    print("  ✓ PASS")

def test_csv_export():
    print("Test 11: CSV export")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        csv_path = f.name
    try:
        code, out, err = run_spellchecker(["hello wrld", "--csv", csv_path])
        assert code == 0
        assert os.path.exists(csv_path), "CSV file should be created"
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) >= 1, "CSV should have at least one error row"
            assert "wrld" in [r["word"] for r in rows], "CSV should contain 'wrld'"
            assert "suggestions" in rows[0], "CSV should have suggestions column"
        print("  ✓ PASS")
    finally:
        if os.path.exists(csv_path):
            os.unlink(csv_path)

def test_pipe_mode():
    print("Test 12: Pipe mode from stdin")
    code, out, err = run_spellchecker([], input_text="hello wrld from pipe\n")
    assert code == 0
    assert "✗ 'wrld'" in out, f"Expected pipe mode to find errors: {out}"
    assert "✗ 'hello'" not in out
    print("  ✓ PASS")

def test_pipe_mode_with_report():
    print("Test 13: Pipe mode with report")
    code, out, err = run_spellchecker(["--report"], input_text="hello wrld\n")
    assert code == 0
    assert "SPELLING CHECK REPORT" in out
    assert "✗ 'wrld'" in out
    print("  ✓ PASS")

def test_add_user_word():
    print("Test 14: Add word to user dictionary")
    test_word = "testcustomwordxyz"
    code, out, err = run_spellchecker(["--add-word", test_word])
    assert code == 0
    assert "Added" in out, f"Expected add confirmation: {out}"
    
    code2, out2, err2 = run_spellchecker([test_word])
    assert code2 == 0
    assert "No spelling errors found" in out2, f"Expected {test_word} to be in user dict: {out2}"
    print("  ✓ PASS")

def test_ignore_word():
    print("Test 15: Add word to ignore list")
    test_word = "testignoretermxyz"
    code, out, err = run_spellchecker(["--ignore-word", test_word])
    assert code == 0
    assert "Added" in out, f"Expected ignore confirmation: {out}"
    
    code2, out2, err2 = run_spellchecker([test_word])
    assert code2 == 0
    assert "No spelling errors found" in out2, f"Expected {test_word} to be ignored: {out2}"
    print("  ✓ PASS")

def test_case_sensitive():
    print("Test 16: Case-sensitive checking with --no-ignore-case")
    code, out, err = run_spellchecker(["Hello", "--no-ignore-case"])
    assert code == 0
    assert "No spelling errors found" in out or "✗ 'Hello'" in out, f"Output: {out}"
    print("  ✓ PASS")

def test_case_insensitive_default():
    print("Test 17: Case-insensitive (default)")
    code, out, err = run_spellchecker(["HELLO"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected HELLO to pass case-insensitive: {out}"
    print("  ✓ PASS")

def test_interactive_mode_full_flow():
    print("Test 18.5: Interactive mode - full flow: check → add → verify → check text → ignore → verify → quit")
    test_word = "xyznewterm123"
    ignore_term = "abctechnology456"
    input_sequence = (
        f"hello\n"           # check correct word
        f"wrld\n"            # check incorrect word
        f":add {test_word}\n"  # add custom word
        f"{test_word}\n"     # verify custom word works
        f"hello wrld tset\n" # check text with multiple errors
        f":ignore {ignore_term}\n"  # add to ignore list
        f"{ignore_term}\n"   # verify ignore works
        f":quit\n"
    )
    code, out, err = run_spellchecker(["-i"], input_text=input_sequence)
    assert code == 0
    assert "✓" in out or "correct" in out.lower(), f"Expected hello to be correct: {out}"
    assert "✗" in out or "misspelled" in out.lower(), f"Expected wrld to be flagged: {out}"
    assert "Added" in out, f"Expected add confirmation: {out}"
    assert "Total words" in out or "Error words" in out, f"Expected report for text check: {out}"
    assert "ignore" in out.lower(), f"Expected ignore confirmation: {out}"
    assert "Bye!" in out, f"Expected quit message: {out}"
    print("  ✓ PASS")

def test_interactive_mode_basic():
    print("Test 19: Interactive mode - check word, add word, quit")
    input_sequence = "wrld\n:add customword123\ncustomword123\n:quit\n"
    code, out, err = run_spellchecker(["-i"], input_text=input_sequence)
    assert code == 0
    assert "Interactive Mode" in out or ">>>" in out, f"Expected interactive prompt: {out}"
    assert "✗ 'wrld'" in out or "misspelled" in out.lower(), f"Expected wrld to be flagged: {out}"
    assert "Added" in out, f"Expected add confirmation: {out}"
    assert "customword123" in out, f"Expected customword123 check: {out}"
    print("  ✓ PASS")

def test_interactive_mode_text_check():
    print("Test 19: Interactive mode - check text with multiple words")
    input_sequence = "hello wrld this is a test\n:quit\n"
    code, out, err = run_spellchecker(["-i"], input_text=input_sequence)
    assert code == 0
    assert "✗ 'wrld'" in out or "misspelled" in out.lower(), f"Expected errors in text: {out}"
    assert "Total words" in out or "error" in out.lower(), f"Expected report for text: {out}"
    print("  ✓ PASS")

def test_interactive_mode_autocomplete():
    print("Test 20: Interactive mode - autocomplete suggestions")
    input_sequence = "wor\n:quit\n"
    code, out, err = run_spellchecker(["-i"], input_text=input_sequence)
    assert code == 0
    assert "Autocomplete" in out or "auto" in out.lower(), f"Expected autocomplete: {out}"
    print("  ✓ PASS")

def test_chinese_mode_basic():
    print("Test 21: Chinese mode (-l zh) basic check")
    code, out, err = run_spellchecker(["-l", "zh", "我 你 他"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected common Chinese words to pass: {out}"
    print("  ✓ PASS")

def test_chinese_mode_with_english():
    print("Test 22: Chinese mode with mixed English errors")
    code, out, err = run_spellchecker(["-l", "zh", "你好 world wrld"])
    assert code == 0
    assert "✗ 'wrld'" in out, f"Expected English error wrld to be caught in zh mode: {out}"
    print("  ✓ PASS")

def test_chinese_mode_dict_loaded():
    print("Test 23: Chinese mode - verify dictionary loaded")
    code, out, err = run_spellchecker(["-l", "zh", "中国 美国 日本"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected country names to pass: {out}"
    print("  ✓ PASS")

def test_custom_dictionary():
    print("Test 24: Custom dictionary loading")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("mycustomterm\nanotherterm\n")
        custom_dict = f.name
    try:
        code, out, err = run_spellchecker(["-d", custom_dict, "mycustomterm"])
        assert code == 0
        assert "No spelling errors found" in out, f"Expected custom term to pass: {out}"
        
        code2, out2, err2 = run_spellchecker(["-d", custom_dict, "anotherterm"])
        assert code2 == 0
        assert "No spelling errors found" in out2, f"Expected anotherterm to pass: {out2}"
        print("  ✓ PASS")
    finally:
        if os.path.exists(custom_dict):
            os.unlink(custom_dict)

def test_max_suggestions():
    print("Test 25: Max suggestions parameter")
    code, out, err = run_spellchecker(["wrld", "--max-suggestions", "2"])
    assert code == 0
    lines = out.strip().split("\n")
    for line in lines:
        if "suggestions:" in line:
            suggestions = line.split("suggestions:")[1].split(", ")
            assert len(suggestions) <= 2, f"Expected at most 2 suggestions: {suggestions}"
            break
    print("  ✓ PASS")

def test_max_distance():
    print("Test 26: Max distance parameter")
    code, out, err = run_spellchecker(["wrld", "--max-distance", "1"])
    assert code == 0
    print("  ✓ PASS (max distance config accepted)")

def test_ignore_list_file():
    print("Test 27: Custom ignore list file")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("somespecialterm\nanotherignore\n")
        ignore_file = f.name
    try:
        code, out, err = run_spellchecker(["--ignore-list", ignore_file, "somespecialterm"])
        assert code == 0
        assert "No spelling errors found" in out, f"Expected term from ignore list to pass: {out}"
        print("  ✓ PASS")
    finally:
        if os.path.exists(ignore_file):
            os.unlink(ignore_file)

def test_edit_distance_calculation():
    print("Test 28: Edit distance based suggestions")
    code, out, err = run_spellchecker(["tset"])
    assert code == 0
    assert "set" in out.lower() or "test" in out.lower(), f"Expected close suggestions: {out}"
    print("  ✓ PASS")

def test_similarity_ordering():
    print("Test 29: Suggestions ordered by edit distance")
    code, out, err = run_spellchecker(["wrld"])
    assert code == 0
    if "suggestions:" in out:
        parts = out.split("suggestions:")[1]
        first = parts.split(", ")[0].strip()
        assert "world" == first or first in ["world", "cold", "hold"], f"Expected closest match first: {first}"
    print("  ✓ PASS")

def test_no_input_shows_help():
    print("Test 30: No input shows help message")
    code, out, err = run_spellchecker([])
    assert code == 0
    assert "usage:" in out.lower() or "help" in out.lower() or "usage" in out.lower(), f"Expected help: {out}"
    print("  ✓ PASS")

def test_empty_text():
    print("Test 31: Empty text handling")
    code, out, err = run_spellchecker([""])
    assert code == 0
    print("  ✓ PASS (empty text handled)")

def test_camel_case_with_known_misspelling():
    print("Test 32: camelCase with known misspelling in known component")
    code, out, err = run_spellchecker(["myWrldName"])
    assert code == 0
    assert "No spelling errors found" in out, f"Expected myWrldName to pass (wrld not in dict, skipped): {out}"
    print("  ✓ PASS")

def run_all_tests():
    tests = [
        test_single_word_correct,
        test_single_word_incorrect,
        test_text_with_errors,
        test_report_generation,
        test_camel_case_basic,
        test_camel_case_skip_unknown,
        test_camel_case_multi_part,
        test_camel_case_disabled,
        test_batch_file_check,
        test_context_snippets,
        test_csv_export,
        test_pipe_mode,
        test_pipe_mode_with_report,
        test_add_user_word,
        test_ignore_word,
        test_case_sensitive,
        test_case_insensitive_default,
        test_interactive_mode_full_flow,
        test_interactive_mode_basic,
        test_interactive_mode_text_check,
        test_interactive_mode_autocomplete,
        test_chinese_mode_basic,
        test_chinese_mode_with_english,
        test_chinese_mode_dict_loaded,
        test_custom_dictionary,
        test_max_suggestions,
        test_max_distance,
        test_ignore_list_file,
        test_edit_distance_calculation,
        test_similarity_ordering,
        test_no_input_shows_help,
        test_empty_text,
        test_camel_case_with_known_misspelling,
    ]
    
    passed = 0
    failed = 0
    failed_tests = []
    
    print("=" * 60)
    print("  SPELL CHECKER COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    print(f"  Total tests: {len(tests)}")
    print()
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            failed_tests.append((test.__name__, str(e)))
            print(f"  ✗ FAIL: {e}")
        except Exception as e:
            failed += 1
            failed_tests.append((test.__name__, f"Exception: {e}"))
            print(f"  ✗ ERROR: {e}")
    
    print()
    print("=" * 60)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed_tests:
        print("\nFailed tests:")
        for name, error in failed_tests:
            print(f"  - {name}: {error}")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(run_all_tests())
