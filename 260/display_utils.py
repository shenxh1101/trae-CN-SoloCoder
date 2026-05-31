import re
from typing import List, Dict, Tuple

from config import POSITIVE_WORDS, NEGATIVE_WORDS
from diary_reader import DiaryEntry


class Color:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    RESET = '\033[0m'


class DisplayUtils:
    @staticmethod
    def highlight_keywords(text: str, custom_words: List[str] = None) -> str:
        result = text

        for word in POSITIVE_WORDS:
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            result = pattern.sub(f"{Color.GREEN}\\g<0>{Color.RESET}", result)

        for word in NEGATIVE_WORDS:
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            result = pattern.sub(f"{Color.RED}\\g<0>{Color.RESET}", result)

        if custom_words:
            for word in custom_words:
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                result = pattern.sub(f"{Color.YELLOW}\\g<0>{Color.RESET}", result)

        return result

    @staticmethod
    def highlight_search_result(text: str, query: str) -> str:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return pattern.sub(f"{Color.BOLD}{Color.YELLOW}\\g<0>{Color.RESET}", text)

    @staticmethod
    def format_sentiment_score(score: float) -> str:
        if score >= 0.7:
            color = Color.GREEN
            emoji = "😊"
        elif score >= 0.5:
            color = Color.BLUE
            emoji = "🙂"
        elif score >= 0.3:
            color = Color.YELLOW
            emoji = "😐"
        else:
            color = Color.RED
            emoji = "😢"

        return f"{color}{emoji} {score:.2f}{Color.RESET}"

    @staticmethod
    def print_diary_entry(entry: DiaryEntry, show_highlight: bool = True) -> None:
        print(f"\n{Color.BOLD}{'=' * 60}{Color.RESET}")
        print(f"{Color.CYAN}{Color.BOLD}日期: {entry.date.strftime('%Y年%m月%d日')}{Color.RESET}")
        if entry.sentiment_score is not None:
            print(f"情绪: {DisplayUtils.format_sentiment_score(entry.sentiment_score)}")
        if entry.keywords:
            print(f"关键词: {', '.join(entry.keywords[:10])}")
        print(f"{Color.BOLD}{'=' * 60}{Color.RESET}\n")

        content = entry.content
        if show_highlight:
            content = DisplayUtils.highlight_keywords(content)

        print(content)
        print(f"\n{Color.BOLD}{'=' * 60}{Color.RESET}\n")

    @staticmethod
    def print_reminder(missing_days: int) -> None:
        if missing_days >= 3:
            print(f"\n{Color.BOLD}{Color.YELLOW}⚠️  温馨提醒: 您已经连续 {missing_days} 天没有写日记了！")
            print(f"   保持记录习惯对个人成长很重要哦 💪{Color.RESET}\n")

    @staticmethod
    def print_welcome() -> None:
        print(f"\n{Color.BOLD}{Color.CYAN}")
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║                    AI 个人日记分析工具                        ║")
        print("║                AI Personal Diary Analyzer                    ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print(f"{Color.RESET}")

    @staticmethod
    def print_menu() -> None:
        print(f"\n{Color.BOLD}请选择功能:{Color.RESET}")
        print(f"  {Color.GREEN}1.{Color.RESET} 查看月度情绪趋势图")
        print(f"  {Color.GREEN}2.{Color.RESET} 查看年度情绪趋势图")
        print(f"  {Color.GREEN}3.{Color.RESET} 查看本月高频词汇")
        print(f"  {Color.GREEN}4.{Color.RESET} 搜索日记内容 / 提问")
        print(f"  {Color.GREEN}5.{Color.RESET} 生成个人成长报告")
        print(f"  {Color.GREEN}6.{Color.RESET} 生成月度报告")
        print(f"  {Color.GREEN}7.{Color.RESET} 生成年度报告")
        print(f"  {Color.GREEN}8.{Color.RESET} 导出数据 (匿名化)")
        print(f"  {Color.GREEN}9.{Color.RESET} 查看今日推荐行动")
        print(f"  {Color.GREEN}10.{Color.RESET} 查看日记列表")
        print(f"  {Color.GREEN}11.{Color.RESET} 查看具体日记内容")
        print(f"  {Color.GREEN}0.{Color.RESET} 退出")

    @staticmethod
    def print_search_results(results: List[Dict], query: str) -> None:
        if not results:
            print(f"\n{Color.YELLOW}没有找到相关结果{Color.RESET}\n")
            return

        print(f"\n{Color.BOLD}{Color.GREEN}找到 {len(results)} 条相关记录:{Color.RESET}\n")

        for i, result in enumerate(results[:10], 1):
            print(f"{Color.BOLD}[{i}] {result['date']}{Color.RESET} - {result['matches']} 处匹配")
            for context in result['contexts'][:2]:
                highlighted = DisplayUtils.highlight_search_result(context, query)
                print(f"    ...{highlighted}...")
            print()

        if len(results) > 10:
            print(f"{Color.YELLOW}... 还有 {len(results) - 10} 条结果{Color.RESET}\n")

    @staticmethod
    def print_keywords(keywords: List[Tuple[str, int]], title: str = "高频词汇") -> None:
        print(f"\n{Color.BOLD}{Color.CYAN}【{title}】{Color.RESET}\n")

        max_count = max(count for _, count in keywords) if keywords else 1

        for i, (word, count) in enumerate(keywords, 1):
            bar_length = int((count / max_count) * 30)
            bar = "█" * bar_length + "░" * (30 - bar_length)
            print(f"  {i:2d}. {word.ljust(8)} | {bar} {count}次")

        print()

    @staticmethod
    def print_success(message: str) -> None:
        print(f"\n{Color.GREEN}✓ {message}{Color.RESET}\n")

    @staticmethod
    def print_error(message: str) -> None:
        print(f"\n{Color.RED}✗ {message}{Color.RESET}\n")

    @staticmethod
    def print_info(message: str) -> None:
        print(f"\n{Color.BLUE}ℹ {message}{Color.RESET}\n")

    @staticmethod
    def print_divider(char: str = "=", length: int = 60) -> None:
        print(f"\n{Color.BOLD}{char * length}{Color.RESET}\n")
