#!/usr/bin/env python3
import json
import random
import os
import csv
import time
import subprocess
import sys
from datetime import datetime, date
from colorama import init, Fore, Style

init(autoreset=True)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
VOCABULARY_FILE = os.path.join(DATA_DIR, "word_vocabulary.json")
CUSTOM_VOCABULARY_FILE = os.path.join(DATA_DIR, "custom_vocabulary.json")
STATS_FILE = os.path.join(DATA_DIR, "learning_stats.json")
ERROR_BOOK_FILE = os.path.join(DATA_DIR, "error_book.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
SPACED_REPETITION_FILE = os.path.join(DATA_DIR, "spaced_repetition.json")


def load_json(filepath, default=None):
    if default is None:
        default = [] if "vocabulary" in filepath or "error" in filepath else {}
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return default
    except Exception:
        return default


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def speak_word(word):
    try:
        if sys.platform == 'darwin':
            subprocess.run(['say', word], capture_output=True)
        elif sys.platform == 'win32':
            subprocess.run(['powershell', '-Command',
                           f"Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{word}')"],
                          capture_output=True)
        elif sys.platform.startswith('linux'):
            subprocess.run(['espeak', word], capture_output=True)
    except Exception:
        pass


def print_color(text, color=Fore.WHITE):
    print(color + text + Style.RESET_ALL)


def print_green(text):
    print_color(text, Fore.GREEN)


def print_red(text):
    print_color(text, Fore.RED)


def print_yellow(text):
    print_color(text, Fore.YELLOW)


def print_cyan(text):
    print_color(text, Fore.CYAN)


def print_magenta(text):
    print_color(text, Fore.MAGENTA)


class WordLearner:
    def __init__(self):
        self.vocabulary = load_json(VOCABULARY_FILE, [])
        self.custom_vocabulary = load_json(CUSTOM_VOCABULARY_FILE, [])
        self.stats = load_json(STATS_FILE, {
            "total_correct": 0,
            "total_wrong": 0,
            "daily_stats": {},
            "learning_days": []
        })
        self.error_book = load_json(ERROR_BOOK_FILE, [])
        self.settings = load_json(SETTINGS_FILE, {
            "daily_goal": 20,
            "use_spaced_repetition": True
        })
        self.spaced_repetition = load_json(SPACED_REPETITION_FILE, {})
        self.session_start_time = None
        self.session_correct = 0
        self.session_wrong = 0

    def get_all_words(self):
        all_words = {}
        for word_data in self.vocabulary + self.custom_vocabulary:
            word = word_data['word']
            if word not in all_words:
                all_words[word] = word_data
        return list(all_words.values())

    def update_daily_stats(self, is_correct):
        today = date.today().isoformat()
        if today not in self.stats["daily_stats"]:
            self.stats["daily_stats"][today] = {"correct": 0, "wrong": 0}
        if is_correct:
            self.stats["daily_stats"][today]["correct"] += 1
            self.stats["total_correct"] += 1
            self.session_correct += 1
        else:
            self.stats["daily_stats"][today]["wrong"] += 1
            self.stats["total_wrong"] += 1
            self.session_wrong += 1

        if today not in self.stats["learning_days"]:
            self.stats["learning_days"].append(today)
        save_json(STATS_FILE, self.stats)

    def update_spaced_repetition(self, word, is_correct):
        if word not in self.spaced_repetition:
            self.spaced_repetition[word] = {
                "interval": 1,
                "repetitions": 0,
                "ease_factor": 2.5,
                "next_review": date.today().isoformat()
            }

        sr = self.spaced_repetition[word]
        if is_correct:
            sr["repetitions"] += 1
            if sr["repetitions"] == 1:
                sr["interval"] = 1
            elif sr["repetitions"] == 2:
                sr["interval"] = 6
            else:
                sr["interval"] = round(sr["interval"] * sr["ease_factor"])
        else:
            sr["repetitions"] = 0
            sr["interval"] = 1
            sr["ease_factor"] = max(1.3, sr["ease_factor"] - 0.2)

        from datetime import timedelta
        next_date = date.today() + timedelta(days=sr["interval"])
        sr["next_review"] = next_date.isoformat()
        save_json(SPACED_REPETITION_FILE, self.spaced_repetition)

    def add_to_error_book(self, word_data):
        word = word_data['word']
        if not any(w['word'] == word for w in self.error_book):
            self.error_book.append(word_data)
            save_json(ERROR_BOOK_FILE, self.error_book)

    def remove_from_error_book(self, word):
        self.error_book = [w for w in self.error_book if w['word'] != word]
        save_json(ERROR_BOOK_FILE, self.error_book)

    def get_words_to_review(self):
        words = self.get_all_words()
        today = date.today().isoformat()
        review_words = []
        for word_data in words:
            word = word_data['word']
            if word in self.spaced_repetition:
                if self.spaced_repetition[word]["next_review"] <= today:
                    review_words.append(word_data)
            else:
                review_words.append(word_data)
        return review_words

    def input_mode(self, words=None):
        if words is None:
            words = self.get_words_to_review() if self.settings["use_spaced_repetition"] else self.get_all_words()
        if not words:
            print_yellow("没有可学习的单词！")
            return

        self.session_start_time = time.time()
        random.shuffle(words)
        print_cyan("\n=== 填空模式 ===")
        print("输入 'q' 退出学习\n")

        for word_data in words:
            word = word_data['word']
            meaning = word_data['meaning']

            print(f"\n单词: {Fore.CYAN}{word}{Style.RESET_ALL}")
            speak_word(word)

            user_input = input("请输入中文释义: ").strip()

            if user_input.lower() == 'q':
                break

            if user_input in meaning or meaning in user_input:
                print_green("✓ 正确！")
                self.update_daily_stats(True)
                self.update_spaced_repetition(word, True)
                self.remove_from_error_book(word)
            else:
                print_red(f"✗ 错误！正确答案是: {meaning}")
                self.update_daily_stats(False)
                self.update_spaced_repetition(word, False)
                self.add_to_error_book(word_data)

            if 'example' in word_data:
                print(f"例句: {word_data['example']}")

        self.show_session_summary()

    def multiple_choice_mode(self, words=None):
        all_words = self.get_all_words()
        if words is None:
            words = self.get_words_to_review() if self.settings["use_spaced_repetition"] else all_words
        if not words or len(all_words) < 4:
            print_yellow("单词数量不足，无法进行多选模式！")
            return

        self.session_start_time = time.time()
        random.shuffle(words)
        print_cyan("\n=== 多选模式 ===")
        print("输入选项序号 (1-4)，输入 'q' 退出\n")

        for word_data in words:
            word = word_data['word']
            correct_meaning = word_data['meaning']

            other_meanings = [w['meaning'] for w in all_words if w['meaning'] != correct_meaning]
            options = [correct_meaning] + random.sample(other_meanings, min(3, len(other_meanings)))
            random.shuffle(options)
            correct_index = options.index(correct_meaning) + 1

            print(f"\n单词: {Fore.CYAN}{word}{Style.RESET_ALL}")
            speak_word(word)

            for i, opt in enumerate(options, 1):
                print(f"  {i}. {opt}")

            user_input = input("请选择正确答案: ").strip()

            if user_input.lower() == 'q':
                break

            try:
                choice = int(user_input)
                if choice == correct_index:
                    print_green("✓ 正确！")
                    self.update_daily_stats(True)
                    self.update_spaced_repetition(word, True)
                    self.remove_from_error_book(word)
                else:
                    print_red(f"✗ 错误！正确答案是: {correct_index}. {correct_meaning}")
                    self.update_daily_stats(False)
                    self.update_spaced_repetition(word, False)
                    self.add_to_error_book(word_data)
            except ValueError:
                print_red("无效输入！")
                self.update_daily_stats(False)
                self.update_spaced_repetition(word, False)
                self.add_to_error_book(word_data)

            if 'example' in word_data:
                print(f"例句: {word_data['example']}")

        self.show_session_summary()

    def review_error_book(self):
        if not self.error_book:
            print_yellow("错题本为空！")
            return

        print_cyan("\n=== 错题本复习 ===")
        print("1. 填空模式复习")
        print("2. 多选模式复习")
        choice = input("请选择模式: ").strip()

        if choice == '1':
            self.input_mode(self.error_book.copy())
        elif choice == '2':
            self.multiple_choice_mode(self.error_book.copy())

    def show_session_summary(self):
        if self.session_start_time:
            elapsed = int(time.time() - self.session_start_time)
            minutes, seconds = divmod(elapsed, 60)
            total = self.session_correct + self.session_wrong
            accuracy = (self.session_correct / total * 100) if total > 0 else 0

            print_cyan("\n" + "=" * 40)
            print_cyan("本次学习总结")
            print_cyan("=" * 40)
            print(f"学习时长: {minutes}分{seconds}秒")
            print(f"学习单词: {total} 个")
            print(f"正确: {Fore.GREEN}{self.session_correct}{Style.RESET_ALL} 个")
            print(f"错误: {Fore.RED}{self.session_wrong}{Style.RESET_ALL} 个")
            print(f"正确率: {accuracy:.1f}%")

            daily = self.get_daily_progress()
            goal = self.settings["daily_goal"]
            if daily["total"] >= goal:
                print_green("\n🎉 恭喜！你已完成今日学习目标！")
            else:
                print_yellow(f"\n今日进度: {daily['total']}/{goal}，还差 {goal - daily['total']} 个单词")

            self.session_start_time = None
            self.session_correct = 0
            self.session_wrong = 0

    def get_daily_progress(self):
        today = date.today().isoformat()
        daily = self.stats["daily_stats"].get(today, {"correct": 0, "wrong": 0})
        return {
            "correct": daily["correct"],
            "wrong": daily["wrong"],
            "total": daily["correct"] + daily["wrong"],
            "accuracy": (daily["correct"] / (daily["correct"] + daily["wrong"]) * 100)
            if (daily["correct"] + daily["wrong"]) > 0 else 0
        }

    def show_statistics(self):
        daily = self.get_daily_progress()
        total = self.stats["total_correct"] + self.stats["total_wrong"]
        total_accuracy = (self.stats["total_correct"] / total * 100) if total > 0 else 0

        print_cyan("\n" + "=" * 40)
        print_cyan("学习统计")
        print_cyan("=" * 40)
        print(f"\n今日学习:")
        print(f"  学习数量: {daily['total']} 个")
        print(f"  正确: {Fore.GREEN}{daily['correct']}{Style.RESET_ALL} 个")
        print(f"  错误: {Fore.RED}{daily['wrong']}{Style.RESET_ALL} 个")
        print(f"  正确率: {daily['accuracy']:.1f}%")

        print(f"\n累计统计:")
        print(f"  学习天数: {len(self.stats['learning_days'])} 天")
        print(f"  总学习数: {total} 个")
        print(f"  总正确率: {total_accuracy:.1f}%")

        print(f"\n错题本: {len(self.error_book)} 个单词")
        print_cyan("=" * 40)

    def manage_vocabulary(self):
        while True:
            print_cyan("\n=== 词库管理 ===")
            print("1. 添加单词")
            print("2. 删除单词")
            print("3. 编辑单词")
            print("4. 查看所有单词")
            print("5. 返回主菜单")

            choice = input("\n请选择操作: ").strip()

            if choice == '1':
                self.add_word()
            elif choice == '2':
                self.delete_word()
            elif choice == '3':
                self.edit_word()
            elif choice == '4':
                self.list_words()
            elif choice == '5':
                break

    def add_word(self):
        word = input("请输入英文单词: ").strip()
        if not word:
            print_red("单词不能为空！")
            return

        all_words = self.get_all_words()
        if any(w['word'] == word for w in all_words):
            print_yellow("该单词已存在！")
            return

        meaning = input("请输入中文释义: ").strip()
        example = input("请输入例句 (可选): ").strip()

        word_data = {"word": word, "meaning": meaning}
        if example:
            word_data["example"] = example

        self.custom_vocabulary.append(word_data)
        save_json(CUSTOM_VOCABULARY_FILE, self.custom_vocabulary)
        print_green("单词添加成功！")

    def delete_word(self):
        word = input("请输入要删除的单词: ").strip()
        original_len = len(self.custom_vocabulary)
        self.custom_vocabulary = [w for w in self.custom_vocabulary if w['word'] != word]

        if len(self.custom_vocabulary) < original_len:
            save_json(CUSTOM_VOCABULARY_FILE, self.custom_vocabulary)
            print_green("单词删除成功！")
        else:
            print_yellow("未找到该单词（只能删除自定义词库的单词）")

    def edit_word(self):
        word = input("请输入要编辑的单词: ").strip()
        for i, w in enumerate(self.custom_vocabulary):
            if w['word'] == word:
                new_meaning = input(f"新的释义 ({w['meaning']}): ").strip() or w['meaning']
                new_example = input(f"新的例句 ({w.get('example', '')}): ").strip()
                self.custom_vocabulary[i]['meaning'] = new_meaning
                if new_example:
                    self.custom_vocabulary[i]['example'] = new_example
                save_json(CUSTOM_VOCABULARY_FILE, self.custom_vocabulary)
                print_green("单词更新成功！")
                return
        print_yellow("未找到该单词（只能编辑自定义词库的单词）")

    def list_words(self):
        all_words = self.get_all_words()
        print_cyan(f"\n词库共有 {len(all_words)} 个单词:\n")
        for i, w in enumerate(all_words, 1):
            print(f"{i}. {w['word']} - {w['meaning']}")
            if 'example' in w:
                print(f"   例: {w['example']}")

    def export_to_csv(self):
        filename = input("请输入导出文件名 (默认: learning_progress.csv): ").strip() or "learning_progress.csv"
        filepath = os.path.join(DATA_DIR, filename)

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['日期', '正确数', '错误数', '总数', '正确率'])

            for day, data in sorted(self.stats["daily_stats"].items()):
                total = data["correct"] + data["wrong"]
                accuracy = (data["correct"] / total * 100) if total > 0 else 0
                writer.writerow([day, data["correct"], data["wrong"], total, f"{accuracy:.1f}%"])

        print_green(f"学习进度已导出到: {filepath}")

    def set_daily_goal(self):
        current = self.settings["daily_goal"]
        print(f"当前每日目标: {current} 个单词")
        try:
            new_goal = int(input("请设置新的每日目标: ").strip())
            if new_goal > 0:
                self.settings["daily_goal"] = new_goal
                save_json(SETTINGS_FILE, self.settings)
                print_green(f"每日目标已设置为: {new_goal} 个单词")
            else:
                print_red("目标必须大于0！")
        except ValueError:
            print_red("请输入有效数字！")

    def import_anki_apkg(self):
        print_yellow("\n注意: 导入Anki词库需要安装anki库")
        print_yellow("运行: pip install anki")
        filepath = input("请输入apkg文件路径: ").strip()

        if not os.path.exists(filepath):
            print_red("文件不存在！")
            return

        try:
            import sqlite3
            import zipfile
            import tempfile

            with tempfile.TemporaryDirectory() as tmpdir:
                with zipfile.ZipFile(filepath, 'r') as z:
                    z.extractall(tmpdir)

                db_path = os.path.join(tmpdir, 'collection.anki2')
                if not os.path.exists(db_path):
                    db_path = os.path.join(tmpdir, 'collection.anki21')

                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT flds FROM notes")
                rows = cursor.fetchall()
                conn.close()

                imported = 0
                for row in rows:
                    fields = row[0].split('\x1f')
                    if len(fields) >= 2:
                        word = fields[0].strip()
                        meaning = fields[1].strip()
                        if word and meaning:
                            word_data = {"word": word, "meaning": meaning}
                            if not any(w['word'] == word for w in self.custom_vocabulary):
                                self.custom_vocabulary.append(word_data)
                                imported += 1

                save_json(CUSTOM_VOCABULARY_FILE, self.custom_vocabulary)
                print_green(f"成功导入 {imported} 个单词！")

        except ImportError:
            print_red("请先安装 anki 库: pip install anki")
        except Exception as e:
            print_red(f"导入失败: {str(e)}")

    def clear_error_book(self):
        if input("确定要清空错题本吗？(y/n): ").strip().lower() == 'y':
            self.error_book = []
            save_json(ERROR_BOOK_FILE, self.error_book)
            print_green("错题本已清空！")

    def main_menu(self):
        while True:
            daily = self.get_daily_progress()
            goal = self.settings["daily_goal"]

            print_cyan("\n" + "=" * 40)
            print_cyan("       英语单词学习工具")
            print_cyan("=" * 40)
            print(f"今日进度: {daily['total']}/{goal} | 正确率: {daily['accuracy']:.1f}%")
            print(f"错题本: {len(self.error_book)} 个 | 累计学习: {len(self.stats['learning_days'])} 天")
            print_cyan("=" * 40)

            print("\n1. 填空模式学习")
            print("2. 多选模式学习")
            print("3. 错题本复习")
            print("4. 查看学习统计")
            print("5. 词库管理")
            print("6. 设置每日目标")
            print("7. 导出学习进度 (CSV)")
            print("8. 导入Anki词库 (apkg)")
            print("9. 清空错题本")
            print("0. 退出")

            choice = input("\n请选择操作: ").strip()

            if choice == '1':
                self.input_mode()
            elif choice == '2':
                self.multiple_choice_mode()
            elif choice == '3':
                self.review_error_book()
            elif choice == '4':
                self.show_statistics()
            elif choice == '5':
                self.manage_vocabulary()
            elif choice == '6':
                self.set_daily_goal()
            elif choice == '7':
                self.export_to_csv()
            elif choice == '8':
                self.import_anki_apkg()
            elif choice == '9':
                self.clear_error_book()
            elif choice == '0':
                print_green("再见！继续加油！")
                break
            else:
                print_red("无效选择，请重新输入！")


def main():
    try:
        learner = WordLearner()
        learner.main_menu()
    except KeyboardInterrupt:
        print("\n\n再见！继续加油！")


if __name__ == "__main__":
    main()
