#!/usr/bin/env python3
import sys
import os
import time
import select
import termios
import tty
from countdown import CountdownManager, CountdownStatus, format_duration
from nlp_parser import TimeParser


class CountdownCLI:
    def __init__(self):
        self.manager = CountdownManager()
        self.parser = TimeParser()
        self.running = True
        self.current_mode = "menu"
        self.notifications = []

    def clear_screen(self):
        os.system('clear' if os.name == 'posix' else 'cls')

    def beep(self, times: int = 3):
        for _ in range(times):
            print('\a', end='', flush=True)
            time.sleep(0.15)

    def flash_notification(self, message: str, duration: int = 5):
        self.beep(5)
        start = time.time()
        while time.time() - start < duration:
            os.system('clear' if os.name == 'posix' else 'cls')
            print("\n" + "=" * 60)
            print("  " + "\033[5m\033[1;31m" + message + "\033[0m")
            print("=" * 60 + "\n")
            time.sleep(0.5)
            os.system('clear' if os.name == 'posix' else 'cls')
            print("\n" + "=" * 60)
            print("  " + "\033[1;32m" + message + "\033[0m")
            print("=" * 60 + "\n")
            time.sleep(0.5)
        self.notifications.append(message)

    def print_table(self):
        if not self.manager.countdowns:
            print("  暂无倒计时")
            return

        header = f"{'序号':<6}{'名称':<20}{'状态':<10}{'剩余时间':<20}{'结束时间':<20}"
        print("  " + "=" * 76)
        print("  " + header)
        print("  " + "-" * 76)

        for i, c in enumerate(self.manager.countdowns, 1):
            status_colors = {
                CountdownStatus.RUNNING: "\033[1;32m",
                CountdownStatus.PAUSED: "\033[1;33m",
                CountdownStatus.COMPLETED: "\033[1;31m",
                CountdownStatus.CANCELLED: "\033[1;35m",
            }
            color = status_colors.get(c.status, "")
            reset = "\033[0m"

            status_text = {
                CountdownStatus.RUNNING: "运行中",
                CountdownStatus.PAUSED: "已暂停",
                CountdownStatus.COMPLETED: "已完成",
                CountdownStatus.CANCELLED: "已取消",
            }.get(c.status, c.status.value)

            end_time_str = ""
            if c.status == CountdownStatus.RUNNING and c.end_time:
                end_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(c.end_time))

            remaining = format_duration(c.remaining_seconds)
            if c.is_periodic:
                remaining += " [循环]"

            print(f"  {i:<6}{c.name:<20}{color}{status_text:<10}{reset}{remaining:<20}{end_time_str:<20}")
        print("  " + "=" * 76)

    def print_earliest(self):
        earliest = self.manager.get_earliest()
        if earliest:
            remaining = format_duration(earliest.remaining_seconds)
            print(f"\n  📌 最早到期: [{earliest.name}] - 剩余 {remaining}")
        else:
            print("\n  📌 暂无运行中的倒计时")

    def print_menu(self):
        self.clear_screen()
        print("\n" + "=" * 76)
        print("  🕐 Python 倒计时提醒工具")
        print("=" * 76 + "\n")
        self.print_table()
        self.print_earliest()

        if self.notifications:
            print("\n  📢 最近通知:")
            for n in self.notifications[-3:]:
                print(f"     - {n}")

        print("\n" + "=" * 76)
        print("  菜单:")
        print("    [1] 添加倒计时")
        print("    [2] 自然语言添加 (如: 30分钟后提醒我)")
        print("    [3] 暂停倒计时")
        print("    [4] 恢复倒计时")
        print("    [5] 取消倒计时")
        print("    [6] 设置完成命令")
        print("    [7] 导出到文本文件")
        print("    [8] 查看所有倒计时")
        print("    [help/?] 帮助信息")
        print("    [0] 退出")
        print("=" * 76)
        print("  输入选项后按回车，或直接按回车刷新: ", end='', flush=True)

    def add_countdown_interactive(self):
        self.clear_screen()
        print("\n" + "=" * 60)
        print("  添加倒计时")
        print("=" * 60 + "\n")

        name = input("  请输入倒计时名称: ").strip()
        if not name:
            print("  名称不能为空！")
            time.sleep(1)
            return

        try:
            days = int(input("  天数 (0): ").strip() or "0")
            hours = int(input("  小时 (0): ").strip() or "0")
            minutes = int(input("  分钟 (0): ").strip() or "0")
            seconds = int(input("  秒 (0): ").strip() or "0")
        except ValueError:
            print("  请输入有效数字！")
            time.sleep(1)
            return

        if days + hours + minutes + seconds == 0:
            print("  时间不能为0！")
            time.sleep(1)
            return

        periodic = input("  是否周期性重复? (y/N): ").strip().lower() == 'y'
        command = input("  完成时执行的命令 (可选): ").strip() or None

        self.manager.add_countdown(
            name=name,
            days=days,
            hours=hours,
            minutes=minutes,
            seconds=seconds,
            is_periodic=periodic,
            on_complete_command=command
        )
        print(f"\n  ✅ 已添加倒计时: {name}")
        self.manager.save()
        time.sleep(1)

    def add_countdown_nlp(self):
        self.clear_screen()
        print("\n" + "=" * 60)
        print("  自然语言添加倒计时")
        print("=" * 60)
        print("  示例: '30分钟后提醒我喝水' | '2小时后叫我' | '每15分钟提醒'")
        print("  支持: 天、小时、分钟、秒 | 半小时、一刻钟")
        print("=" * 60 + "\n")

        text = input("  请输入: ").strip()
        if not text:
            return

        parsed = self.parser.parse(text)
        if not parsed:
            print("\n  ❌ 无法解析，请重新输入")
            time.sleep(1.5)
            return

        command = input("  完成时执行的命令 (可选): ").strip() or None

        self.manager.add_countdown(
            name=parsed['name'],
            days=parsed['days'],
            hours=parsed['hours'],
            minutes=parsed['minutes'],
            seconds=parsed['seconds'],
            is_periodic=parsed['is_periodic'],
            on_complete_command=command
        )
        print(f"\n  ✅ 已添加: {parsed['name']} ({format_duration(self.parser.to_seconds(parsed))})")
        if parsed['is_periodic']:
            print("     周期性: 开启")
        self.manager.save()
        time.sleep(1.5)

    def select_countdown(self, action: str) -> int:
        if not self.manager.countdowns:
            print("  暂无倒计时")
            time.sleep(1)
            return -1

        print(f"\n  请选择要{action}的倒计时序号 (0取消): ", end='', flush=True)
        try:
            idx = int(input().strip())
            if idx == 0:
                return -1
            if 1 <= idx <= len(self.manager.countdowns):
                return idx - 1
            print("  无效序号")
            time.sleep(1)
            return -1
        except ValueError:
            print("  请输入数字")
            time.sleep(1)
            return -1

    def pause_countdown(self):
        self.clear_screen()
        self.print_table()
        idx = self.select_countdown("暂停")
        if idx >= 0:
            c = self.manager.countdowns[idx]
            c.pause()
            self.manager.save()
            print(f"\n  ✅ 已暂停: {c.name}")
            time.sleep(1)

    def resume_countdown(self):
        self.clear_screen()
        self.print_table()
        idx = self.select_countdown("恢复")
        if idx >= 0:
            c = self.manager.countdowns[idx]
            c.resume()
            self.manager.save()
            print(f"\n  ✅ 已恢复: {c.name}")
            time.sleep(1)

    def cancel_countdown(self):
        self.clear_screen()
        self.print_table()
        idx = self.select_countdown("取消")
        if idx >= 0:
            c = self.manager.countdowns[idx]
            c.cancel()
            self.manager.save()
            print(f"\n  ✅ 已取消: {c.name}")
            time.sleep(1)

    def export_countdowns(self):
        self.clear_screen()
        print("\n" + "=" * 60)
        print("  导出倒计时")
        print("=" * 60 + "\n")
        filename = input("  请输入导出文件名 (默认 countdowns_export.txt): ").strip()
        if not filename:
            filename = "countdowns_export.txt"

        if self.manager.export_to_text(filename):
            print(f"\n  ✅ 已导出到: {os.path.abspath(filename)}")
        else:
            print("\n  ❌ 导出失败")
        time.sleep(1.5)

    def view_all_countdowns(self):
        self.clear_screen()
        print("\n" + "=" * 60)
        print("  所有倒计时详情")
        print("=" * 60 + "\n")
        self.print_table()
        print("\n  按回车返回...")
        input()

    def set_complete_command(self):
        self.clear_screen()
        print("\n" + "=" * 60)
        print("  设置完成命令")
        print("=" * 60 + "\n")
        self.print_table()
        idx = self.select_countdown("设置命令")
        if idx >= 0:
            c = self.manager.countdowns[idx]
            print(f"\n  当前倒计时: {c.name}")
            if c.on_complete_command:
                print(f"  当前命令: {c.on_complete_command}")
            command = input("\n  请输入完成时执行的命令 (留空清除): ").strip()
            if command:
                c.on_complete_command = command
                print(f"\n  ✅ 已设置命令: {command}")
            else:
                c.on_complete_command = None
                print(f"\n  ✅ 已清除命令")
            self.manager.save()
            time.sleep(1.5)

    def show_help(self):
        self.clear_screen()
        print("\n" + "=" * 76)
        print("  📖 帮助信息")
        print("=" * 76)
        print("""
  命令选项:
  ──────────────────────────────────────────────────────────────────────
    1       添加倒计时 - 精确设置天、小时、分钟、秒
    2       自然语言添加 - 使用自然语言快速创建倒计时
    3       暂停倒计时 - 暂停指定的倒计时
    4       恢复倒计时 - 恢复已暂停的倒计时
    5       取消倒计时 - 取消并删除指定的倒计时
    6       设置完成命令 - 为倒计时设置到期时执行的命令
    7       导出到文本文件 - 导出所有倒计时状态为文本文件
    8       查看所有倒计时 - 显示所有倒计时的详细信息
    help/?  显示帮助信息
    0       退出程序

  自然语言支持:
  ──────────────────────────────────────────────────────────────────────
  时间单位: 天、小时、分钟、秒 (或简写 h/m/s)
  相对时间: 半小时、一刻钟、半天、一天、一小时
  周期性: 包含"每"、"循环"、"重复"、"周期"等关键词
  示例:
    • 30分钟后提醒我喝水
    • 2小时后叫我
    • 1天5小时30分钟
    • 半小时后提醒
    • 每15分钟提醒我
    • 10秒钟后
    • 3天

  完成命令示例:
  ──────────────────────────────────────────────────────────────────────
    • open /path/to/file.txt       (打开文件)
    • afplay /path/to/sound.mp3    (播放音乐, macOS)
    • say "时间到了"                (语音提醒, macOS)
    • notepad.exe file.txt         (打开记事本, Windows)
    • python script.py             (运行Python脚本)

  数据存储:
  ──────────────────────────────────────────────────────────────────────
    • 倒计时数据自动保存到 countdowns.json
    • 日志记录到 countdowns.log
    • 程序启动时自动加载之前的倒计时

  按回车返回...
        """)
        input()

    def run(self):
        last_tick = 0
        while self.running:
            current_time = time.time()

            if current_time - last_tick >= 1:
                completed = self.manager.tick_all()
                for c in completed:
                    if not c.is_periodic:
                        self.flash_notification(f"⏰ 倒计时完成: {c.name}!")
                self.manager.save()
                last_tick = current_time

            if self.current_mode == "menu":
                self.print_menu()

                if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
                    choice = sys.stdin.readline().strip().lower()
                    if choice == '1':
                        self.add_countdown_interactive()
                    elif choice == '2':
                        self.add_countdown_nlp()
                    elif choice == '3':
                        self.pause_countdown()
                    elif choice == '4':
                        self.resume_countdown()
                    elif choice == '5':
                        self.cancel_countdown()
                    elif choice == '6':
                        self.set_complete_command()
                    elif choice == '7':
                        self.export_countdowns()
                    elif choice == '8':
                        self.view_all_countdowns()
                    elif choice in ['help', '?']:
                        self.show_help()
                    elif choice == '0':
                        self.running = False
                        break

            time.sleep(0.1)

        self.clear_screen()
        print("\n  👋 再见！")
        self.manager.save()


def main():
    cli = CountdownCLI()
    try:
        cli.run()
    except KeyboardInterrupt:
        cli.manager.save()
        print("\n\n  👋 已保存并退出")


if __name__ == "__main__":
    main()
