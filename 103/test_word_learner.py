#!/usr/bin/env python3
import subprocess
import sys
import os
import json
import re

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "word_learner.py")
DATA_DIR = os.path.dirname(os.path.abspath(__file__))


def clean_ansi(text):
    return re.sub(r'\x1b\[[0-9;]*m', '', text)


def run_with_input(inputs, timeout=20):
    input_text = "\n".join(inputs) + "\n"
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    try:
        result = subprocess.run(
            [sys.executable, SCRIPT],
            input=input_text,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env
        )
        return clean_ansi(result.stdout), result.stderr, result.returncode
    except subprocess.TimeoutExpired as e:
        out = e.stdout or ""
        err = e.stderr or ""
        if isinstance(out, bytes):
            out = out.decode("utf-8", errors="replace")
        if isinstance(err, bytes):
            err = err.decode("utf-8", errors="replace")
        return clean_ansi(out), err, -1


ALL_VOCAB_WORDS = [
    "abandon", "ability", "abroad", "absolute", "absorb",
    "abstract", "abundant", "academy", "accept", "access",
    "accident", "accompany", "accomplish", "according", "account",
    "accurate", "achieve", "acknowledge", "acquire", "across"
]


def extract_shown_words(output):
    found = []
    for w in ALL_VOCAB_WORDS:
        if w in output.lower():
            found.append(w)
    return found


def test_1_input_mode():
    print("\n" + "=" * 60)
    print("测试1: 填空模式学习（随机单词+输入答案+颜色反馈）")
    print("=" * 60)

    inputs = [
        "1",
        "放弃",
        "能力",
        "错误答案",
        "q",
        "0"
    ]
    stdout, stderr, rc = run_with_input(inputs)
    print(stdout)

    shown_words = extract_shown_words(stdout)
    has_correct = "✓ 正确" in stdout or "正确" in stdout
    has_wrong = "✗ 错误" in stdout or "错误" in stdout
    has_summary = "学习总结" in stdout
    has_quit = "再见" in stdout

    print(f"\n--- 测试1结果 ---")
    print(f"显示单词({len(shown_words)}个): {shown_words} => {'PASS' if shown_words else 'FAIL'}")
    print(f"正确反馈: {'PASS' if has_correct else 'FAIL'}")
    print(f"错误反馈: {'PASS' if has_wrong else 'FAIL'}")
    print(f"学习总结: {'PASS' if has_summary else 'FAIL'}")
    print(f"正常退出: {'PASS' if has_quit else 'FAIL'}")
    return len(shown_words) > 0 and has_correct and has_wrong and has_summary and has_quit


def test_2_multiple_choice():
    print("\n" + "=" * 60)
    print("测试2: 多选模式")
    print("=" * 60)

    inputs = [
        "2",
        "1",
        "2",
        "3",
        "q",
        "0"
    ]
    stdout, stderr, rc = run_with_input(inputs)
    print(stdout)

    has_options = all(f"{i}." in stdout for i in range(1, 5))
    shown_words = extract_shown_words(stdout)
    has_feedback = "正确" in stdout or "错误" in stdout
    has_quit = "再见" in stdout

    print(f"\n--- 测试2结果 ---")
    print(f"显示四个选项: {'PASS' if has_options else 'FAIL'}")
    print(f"显示单词({len(shown_words)}个): {shown_words} => {'PASS' if shown_words else 'FAIL'}")
    print(f"答题反馈: {'PASS' if has_feedback else 'FAIL'}")
    print(f"正常退出: {'PASS' if has_quit else 'FAIL'}")
    return has_options and len(shown_words) > 0 and has_feedback and has_quit


def test_3_statistics():
    print("\n" + "=" * 60)
    print("测试3: 查看当日统计")
    print("=" * 60)

    inputs = [
        "1",
        "放弃",
        "错误答案",
        "q",
        "4",
        "0"
    ]
    stdout, stderr, rc = run_with_input(inputs)
    print(stdout)

    has_today = "今日学习" in stdout
    has_accuracy = "正确率" in stdout
    has_cumulative = "累计统计" in stdout
    has_days = "学习天数" in stdout

    print(f"\n--- 测试3结果 ---")
    print(f"今日统计: {'PASS' if has_today else 'FAIL'}")
    print(f"正确率: {'PASS' if has_accuracy else 'FAIL'}")
    print(f"累计统计: {'PASS' if has_cumulative else 'FAIL'}")
    print(f"学习天数: {'PASS' if has_days else 'FAIL'}")
    return has_today and has_accuracy and has_cumulative and has_days


def test_4_error_book():
    print("\n" + "=" * 60)
    print("测试4: 错题本功能")
    print("=" * 60)

    inputs = [
        "1",
        "完全错误的答案1",
        "完全错误的答案2",
        "q",
        "3",
        "1",
        "q",
        "0"
    ]
    stdout, stderr, rc = run_with_input(inputs)
    print(stdout)

    has_error_menu = "错题本复习" in stdout
    has_review_options = "填空模式复习" in stdout and "多选模式复习" in stdout

    error_book_path = os.path.join(DATA_DIR, "error_book.json")
    has_error_file = os.path.exists(error_book_path)
    error_count = 0
    if has_error_file:
        with open(error_book_path, 'r', encoding='utf-8') as f:
            error_data = json.load(f)
            error_count = len(error_data)

    print(f"\n--- 测试4结果 ---")
    print(f"错题本菜单: {'PASS' if has_error_menu else 'FAIL'}")
    print(f"复习模式选项: {'PASS' if has_review_options else 'FAIL'}")
    print(f"错题文件存在: {'PASS' if has_error_file else 'FAIL'}")
    print(f"错题记录数: {error_count} => {'PASS' if error_count > 0 else 'FAIL'}")
    return has_error_menu and has_review_options and has_error_file and error_count > 0


def test_5_add_word():
    print("\n" + "=" * 60)
    print("测试5: 添加单词功能")
    print("=" * 60)

    inputs = [
        "5",
        "1",
        "eloquent",
        "雄辩的；有口才的",
        "She is an eloquent speaker.",
        "4",
        "5",
        "0"
    ]
    stdout, stderr, rc = run_with_input(inputs)
    print(stdout)

    has_add_success = "添加成功" in stdout
    has_new_word = "eloquent" in stdout

    custom_path = os.path.join(DATA_DIR, "custom_vocabulary.json")
    has_custom_file = os.path.exists(custom_path)
    custom_count = 0
    if has_custom_file:
        with open(custom_path, 'r', encoding='utf-8') as f:
            custom_data = json.load(f)
            custom_count = len(custom_data)
            for item in custom_data:
                print(f"  自定义词库条目: {item}")

    print(f"\n--- 测试5结果 ---")
    print(f"添加成功提示: {'PASS' if has_add_success else 'FAIL'}")
    print(f"词库中显示新单词: {'PASS' if has_new_word else 'FAIL'}")
    print(f"自定义词库文件: {'PASS' if has_custom_file else 'FAIL'}")
    print(f"自定义词库单词数: {custom_count} => {'PASS' if custom_count > 0 else 'FAIL'}")
    return has_add_success and has_custom_file and custom_count > 0


if __name__ == "__main__":
    results = {}
    tests = [
        ("填空模式", test_1_input_mode),
        ("多选模式", test_2_multiple_choice),
        ("当日统计", test_3_statistics),
        ("错题本", test_4_error_book),
        ("添加单词", test_5_add_word),
    ]

    for name, test_fn in tests:
        try:
            results[name] = test_fn()
        except Exception as e:
            print(f"\n!!! 测试 [{name}] 异常: {e}")
            results[name] = False

    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")

    total = len(results)
    passed = sum(1 for v in results.values() if v)
    print(f"\n通过: {passed}/{total}")
