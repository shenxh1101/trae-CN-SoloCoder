#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta
from enum import Enum

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alarms.json")

WEEKDAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"]
WEEKDAY_MAP = {name: i for i, name in enumerate(WEEKDAY_NAMES)}
WEEKDAY_MAP.update({str(i): i for i in range(7)})

ANSI_RESET = "\033[0m"
ANSI_RED = "\033[91m"
ANSI_GREEN = "\033[92m"
ANSI_YELLOW = "\033[93m"
ANSI_BLUE = "\033[94m"
ANSI_MAGENTA = "\033[95m"
ANSI_CYAN = "\033[96m"
ANSI_BOLD = "\033[1m"
ANSI_BG_RED = "\033[41m"
ANSI_BG_YELLOW = "\033[43m"


class RepeatMode(Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    CUSTOM = "custom"


def parse_time(time_str):
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format: {time_str}, expected HH:MM")
    h, m = int(parts[0]), int(parts[1])
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError(f"Invalid time: {time_str}")
    return h, m


def parse_duration(duration_str):
    duration_str = duration_str.strip().lower()
    if duration_str.endswith("s"):
        return int(duration_str[:-1])
    elif duration_str.endswith("m"):
        return int(duration_str[:-1]) * 60
    elif duration_str.endswith("h"):
        return int(duration_str[:-1]) * 3600
    else:
        return int(duration_str)


def play_sound():
    try:
        if sys.platform == "darwin":
            subprocess.run(["afplay", "/System/Library/Sounds/Glass.aiff"], check=False)
        elif sys.platform == "linux":
            subprocess.run(["aplay", "-q", "/usr/share/sounds/notice.wav"], check=False)
        elif sys.platform == "win32":
            import winsound
            winsound.Beep(1000, 500)
    except Exception:
        sys.stdout.write("\a")
        sys.stdout.flush()


def play_sound_loop(times=3):
    def _loop():
        for _ in range(times):
            play_sound()
            time.sleep(0.5)
    threading.Thread(target=_loop, daemon=True).start()


def format_remaining(seconds):
    if seconds < 0:
        seconds = 0
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def colored(text, color):
    return f"{color}{text}{ANSI_RESET}"


def bold(text):
    return f"{ANSI_BOLD}{text}{ANSI_RESET}"


class Alarm:
    def __init__(self, hour, minute, message="", repeat=RepeatMode.ONCE,
                 days=None, command="", alarm_id=None):
        self.id = alarm_id or uuid.uuid4().hex[:8]
        self.hour = hour
        self.minute = minute
        self.message = message or f"Alarm at {hour:02d}:{minute:02d}"
        self.repeat = repeat
        self.days = days or []
        self.active = True
        self.paused = False
        self.command = command
        self.created_at = datetime.now().isoformat()
        self.last_triggered = None
        self.snooze_until = None

    def should_trigger(self, now):
        if not self.active or self.paused:
            return False
        if self.snooze_until:
            if now < self.snooze_until:
                return False
            if now.hour == self.snooze_until.hour and now.minute == self.snooze_until.minute:
                return True
            return False
        if now.hour != self.hour or now.minute != self.minute:
            return False
        if now.second > 2:
            return False
        if self.last_triggered:
            lt = datetime.fromisoformat(self.last_triggered)
            if (now - lt).total_seconds() < 58:
                return False
        if self.repeat == RepeatMode.ONCE:
            return True
        elif self.repeat == RepeatMode.DAILY:
            return True
        elif self.repeat == RepeatMode.WEEKDAYS:
            return now.weekday() < 5
        elif self.repeat == RepeatMode.CUSTOM:
            return now.weekday() in self.days
        return False

    def trigger(self):
        self.last_triggered = datetime.now().isoformat()
        if self.repeat == RepeatMode.ONCE:
            self.active = False
        self.snooze_until = None

    def snooze(self, minutes=5):
        self.snooze_until = datetime.now() + timedelta(minutes=minutes)
        self.last_triggered = datetime.now().isoformat()

    def get_next_trigger(self, now=None):
        if not self.active or self.paused:
            return None
        now = now or datetime.now()
        if self.snooze_until:
            return self.snooze_until
        target = now.replace(hour=self.hour, minute=self.minute, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        if self.repeat == RepeatMode.WEEKDAYS:
            while target.weekday() >= 5:
                target += timedelta(days=1)
        elif self.repeat == RepeatMode.CUSTOM:
            attempts = 0
            while target.weekday() not in self.days and attempts < 7:
                target += timedelta(days=1)
                attempts += 1
            if attempts >= 7:
                return None
        return target

    def repeat_desc(self):
        if self.repeat == RepeatMode.ONCE:
            return "一次性"
        elif self.repeat == RepeatMode.DAILY:
            return "每天"
        elif self.repeat == RepeatMode.WEEKDAYS:
            return "工作日"
        elif self.repeat == RepeatMode.CUSTOM:
            day_strs = [WEEKDAY_CN[d] for d in sorted(self.days)]
            return f"每周{','.join(day_strs)}"
        return "未知"

    def status_desc(self):
        if self.paused:
            return colored("已暂停", ANSI_YELLOW)
        if not self.active:
            return colored("已停用", ANSI_RED)
        return colored("激活", ANSI_GREEN)

    def to_dict(self):
        return {
            "id": self.id,
            "hour": self.hour,
            "minute": self.minute,
            "message": self.message,
            "repeat": self.repeat.value,
            "days": self.days,
            "active": self.active,
            "paused": self.paused,
            "command": self.command,
            "created_at": self.created_at,
            "last_triggered": self.last_triggered,
            "snooze_until": self.snooze_until.isoformat() if self.snooze_until else None,
        }

    @classmethod
    def from_dict(cls, d):
        alarm = cls(
            hour=d["hour"],
            minute=d["minute"],
            message=d.get("message", ""),
            repeat=RepeatMode(d.get("repeat", "once")),
            days=d.get("days", []),
            command=d.get("command", ""),
            alarm_id=d.get("id"),
        )
        alarm.active = d.get("active", True)
        alarm.paused = d.get("paused", False)
        alarm.created_at = d.get("created_at", datetime.now().isoformat())
        alarm.last_triggered = d.get("last_triggered")
        if d.get("snooze_until"):
            alarm.snooze_until = datetime.fromisoformat(d["snooze_until"])
        return alarm


class CountdownTimer:
    def __init__(self, name, total_seconds, countdown_id=None):
        self.id = countdown_id or uuid.uuid4().hex[:8]
        self.name = name
        self.total_seconds = total_seconds
        self.remaining = total_seconds
        self.active = True
        self.start_time = datetime.now().isoformat()
        self._stop_event = threading.Event()
        self._thread = None

    def start(self, on_complete):
        def _run():
            while self.remaining > 0 and not self._stop_event.is_set():
                self._stop_event.wait(1)
                if not self._stop_event.is_set():
                    self.remaining -= 1
            if self.remaining <= 0 and self.active:
                self.active = False
                on_complete(self)
        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

    def cancel(self):
        self.active = False
        self._stop_event.set()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "total_seconds": self.total_seconds,
            "remaining": self.remaining,
            "active": self.active,
            "start_time": self.start_time,
        }


class AlarmStore:
    def __init__(self, data_file=DATA_FILE):
        self.data_file = data_file
        self.alarms = []
        self.countdowns = {}
        self.stats = {
            "total_triggered": 0,
            "on_time_count": 0,
            "late_count": 0,
        }
        self.load()

    def load(self):
        if not os.path.exists(self.data_file):
            return
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            for ad in data.get("alarms", []):
                self.alarms.append(Alarm.from_dict(ad))
            self.stats = data.get("stats", self.stats)
        except Exception:
            pass

    def save(self):
        data = {
            "alarms": [a.to_dict() for a in self.alarms],
            "stats": self.stats,
        }
        tmp = self.data_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.data_file)

    def add_alarm(self, alarm):
        self.alarms.append(alarm)
        self.save()
        return alarm

    def remove_alarm(self, alarm_id):
        self.alarms = [a for a in self.alarms if a.id != alarm_id]
        self.save()

    def get_alarm(self, alarm_id):
        for a in self.alarms:
            if a.id == alarm_id:
                return a
        return None

    def toggle_pause(self, alarm_id):
        alarm = self.get_alarm(alarm_id)
        if alarm:
            alarm.paused = not alarm.paused
            self.save()
            return alarm
        return None

    def record_trigger(self, on_time=True):
        self.stats["total_triggered"] += 1
        if on_time:
            self.stats["on_time_count"] += 1
        else:
            self.stats["late_count"] += 1
        self.save()

    def get_next_alarm(self):
        now = datetime.now()
        next_alarm = None
        next_time = None
        for alarm in self.alarms:
            if not alarm.active or alarm.paused:
                continue
            nt = alarm.get_next_trigger(now)
            if nt and (next_time is None or nt < next_time):
                next_time = nt
                next_alarm = alarm
        return next_alarm, next_time

    def start_countdown(self, name, total_seconds, on_complete):
        cd = CountdownTimer(name, total_seconds)
        self.countdowns[cd.id] = cd
        cd.start(on_complete)
        return cd

    def cancel_countdown(self, cd_id):
        if cd_id in self.countdowns:
            self.countdowns[cd_id].cancel()
            del self.countdowns[cd_id]
            return True
        return False


class AlarmApp:
    def __init__(self):
        self.store = AlarmStore()
        self.running = True
        self._lock = threading.Lock()
        self._check_thread = None
        self._display_thread = None

    def start_background(self):
        self._check_thread = threading.Thread(target=self._check_alarms, daemon=True)
        self._check_thread.start()
        self._display_thread = threading.Thread(target=self._display_countdowns, daemon=True)
        self._display_thread.start()

    def _check_alarms(self):
        while self.running:
            now = datetime.now()
            with self._lock:
                for alarm in self.store.alarms:
                    if alarm.should_trigger(now):
                        alarm.trigger()
                        self.store.record_trigger(on_time=True)
                        self.store.save()
                        self._fire_alarm(alarm)
            time.sleep(1)

    def _fire_alarm(self, alarm):
        print()
        print(colored("═" * 60, ANSI_RED))
        print(colored("═" * 60, ANSI_BG_RED + ANSI_BOLD))
        print(colored(f"  ⏰ 闹钟触发! {alarm.hour:02d}:{alarm.minute:02d}  ", ANSI_BG_RED + ANSI_BOLD + ANSI_CYAN))
        print(colored(f"  📝 {alarm.message}  ", ANSI_BG_RED + ANSI_BOLD + ANSI_YELLOW))
        print(colored("═" * 60, ANSI_BG_RED + ANSI_BOLD))
        print(colored("═" * 60, ANSI_RED))
        play_sound_loop(3)
        if alarm.command:
            self._execute_command(alarm.command)
        if alarm.repeat == RepeatMode.ONCE:
            print(colored("  [一次性闹钟已自动停用]", ANSI_YELLOW))

    def _execute_command(self, command):
        try:
            print(colored(f"  🔧 执行命令: {command}", ANSI_CYAN))
            subprocess.Popen(command, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(colored(f"  ❌ 命令执行失败: {e}", ANSI_RED))

    def _display_countdowns(self):
        while self.running:
            active = [cd for cd in self.store.countdowns.values() if cd.active]
            if active:
                lines = []
                for cd in active:
                    status = format_remaining(cd.remaining)
                    lines.append(f"  ⏱ {cd.name}: {status}")
                status_line = " | ".join(lines)
                sys.stdout.write(f"\r{colored(status_line, ANSI_CYAN)}   \r")
                sys.stdout.flush()
            time.sleep(1)

    def _on_countdown_complete(self, cd):
        with self._lock:
            if cd.id in self.store.countdowns:
                del self.store.countdowns[cd.id]
        print()
        print(colored("═" * 60, ANSI_MAGENTA))
        print(colored(f"  ⏱ 倒计时完成! {cd.name} ({format_remaining(cd.total_seconds)})", ANSI_BG_YELLOW + ANSI_BOLD))
        print(colored("═" * 60, ANSI_MAGENTA))
        play_sound_loop(3)

    def cmd_add(self, time_str, message="", repeat="once", days=None, command=""):
        try:
            h, m = parse_time(time_str)
        except ValueError as e:
            print(colored(f"错误: {e}", ANSI_RED))
            return None

        repeat_mode = RepeatMode(repeat)
        parsed_days = []
        if days:
            for d in days.split(","):
                d = d.strip().lower()
                if d in WEEKDAY_MAP:
                    parsed_days.append(WEEKDAY_MAP[d])
            if repeat_mode == RepeatMode.CUSTOM and not parsed_days:
                print(colored("错误: 自定义重复模式需要指定天数", ANSI_RED))
                return None

        alarm = Alarm(h, m, message=message, repeat=repeat_mode,
                      days=parsed_days, command=command)
        self.store.add_alarm(alarm)
        print(colored(f"✅ 闹钟已添加: {alarm.id} - {h:02d}:{m:02d} {message}", ANSI_GREEN))
        print(f"   重复: {alarm.repeat_desc()} | 状态: {alarm.status_desc()}")
        return alarm

    def cmd_list(self):
        if not self.store.alarms:
            print(colored("没有闹钟", ANSI_YELLOW))
            return
        print(bold(f"\n{'ID':<10} {'时间':<8} {'消息':<20} {'重复':<12} {'状态':<10} {'命令'}"))
        print("─" * 80)
        for a in self.store.alarms:
            cmd_display = a.command[:20] if a.command else "-"
            print(f"{a.id:<10} {a.hour:02d}:{a.minute:02d}   {a.message:<20} {a.repeat_desc():<12} {a.status_desc():<16} {cmd_display}")

    def cmd_delete(self, alarm_id):
        alarm = self.store.get_alarm(alarm_id)
        if not alarm:
            print(colored(f"未找到闹钟: {alarm_id}", ANSI_RED))
            return
        self.store.remove_alarm(alarm_id)
        print(colored(f"🗑 已删除闹钟: {alarm_id} - {alarm.hour:02d}:{alarm.minute:02d} {alarm.message}", ANSI_YELLOW))

    def cmd_pause(self, alarm_id):
        alarm = self.store.toggle_pause(alarm_id)
        if not alarm:
            print(colored(f"未找到闹钟: {alarm_id}", ANSI_RED))
            return
        if alarm.paused:
            print(colored(f"⏸ 已暂停闹钟: {alarm_id}", ANSI_YELLOW))
        else:
            print(colored(f"▶ 已恢复闹钟: {alarm.id}", ANSI_GREEN))

    def cmd_countdown(self, duration_str, name="倒计时"):
        try:
            seconds = parse_duration(duration_str)
        except ValueError:
            print(colored("错误: 无效的时长格式", ANSI_RED))
            return
        if seconds <= 0:
            print(colored("错误: 时长必须大于0", ANSI_RED))
            return
        cd = self.store.start_countdown(name, seconds, self._on_countdown_complete)
        print(colored(f"⏱ 倒计时已启动: {name} ({format_remaining(seconds)})", ANSI_GREEN))

    def cmd_list_countdowns(self):
        active = [cd for cd in self.store.countdowns.values() if cd.active]
        if not active:
            print(colored("没有活跃的倒计时", ANSI_YELLOW))
            return
        print(bold(f"\n{'ID':<10} {'名称':<15} {'剩余':<12} {'总计'}"))
        print("─" * 50)
        for cd in active:
            print(f"{cd.id:<10} {cd.name:<15} {format_remaining(cd.remaining):<12} {format_remaining(cd.total_seconds)}")

    def cmd_cancel_countdown(self, cd_id):
        if self.store.cancel_countdown(cd_id):
            print(colored(f"🗑 已取消倒计时: {cd_id}", ANSI_YELLOW))
        else:
            print(colored(f"未找到倒计时: {cd_id}", ANSI_RED))

    def cmd_next(self):
        alarm, next_time = self.store.get_next_alarm()
        if not alarm:
            print(colored("没有即将触发的闹钟", ANSI_YELLOW))
            return
        now = datetime.now()
        delta = next_time - now
        print(colored(f"⏰ 下一个闹钟: {alarm.hour:02d}:{alarm.minute:02d} - {alarm.message}", ANSI_CYAN))
        print(f"   重复: {alarm.repeat_desc()} | 距今: {format_remaining(int(delta.total_seconds()))}")

    def cmd_snooze(self, alarm_id, minutes=5):
        alarm = self.store.get_alarm(alarm_id)
        if not alarm:
            print(colored(f"未找到闹钟: {alarm_id}", ANSI_RED))
            return
        alarm.snooze(minutes)
        self.store.save()
        snooze_time = alarm.snooze_until.strftime("%H:%M:%S")
        print(colored(f"😴 闹钟 {alarm_id} 已暂缓 {minutes} 分钟，将在 {snooze_time} 再次提醒", ANSI_YELLOW))

    def cmd_stats(self):
        stats = self.store.stats
        total = stats["total_triggered"]
        on_time = stats["on_time_count"]
        if total > 0:
            rate = on_time / total * 100
        else:
            rate = 0
        print(bold("\n📊 闹钟统计"))
        print("─" * 30)
        print(f"  总触发次数: {colored(str(total), ANSI_CYAN)}")
        print(f"  准时触发:   {colored(str(on_time), ANSI_GREEN)}")
        print(f"  延迟触发:   {colored(str(stats['late_count']), ANSI_YELLOW)}")
        print(f"  准时率:     {colored(f'{rate:.1f}%', ANSI_MAGENTA)}")

    def run_interactive(self):
        self.start_background()
        print(colored("\n🔔 命令行闹钟工具 v1.0", ANSI_CYAN + ANSI_BOLD))
        print(colored("输入 help 查看命令列表，exit 退出\n", ANSI_YELLOW))

        while self.running:
            try:
                cmd = input(colored("闹钟> ", ANSI_CYAN)).strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break

            if not cmd:
                continue

            parts = cmd.split()
            action = parts[0].lower()

            if action in ("exit", "quit", "q"):
                break
            elif action == "help":
                self._print_help()
            elif action == "add":
                self._interactive_add(parts)
            elif action == "list" or action == "ls":
                self.cmd_list()
            elif action == "delete" or action == "del" or action == "rm":
                if len(parts) < 2:
                    print(colored("用法: delete <闹钟ID>", ANSI_YELLOW))
                    continue
                self.cmd_delete(parts[1])
            elif action == "pause":
                if len(parts) < 2:
                    print(colored("用法: pause <闹钟ID>", ANSI_YELLOW))
                    continue
                self.cmd_pause(parts[1])
            elif action == "countdown" or action == "cd":
                if len(parts) < 2:
                    print(colored("用法: countdown <时长> [名称]", ANSI_YELLOW))
                    continue
                name = " ".join(parts[2:]) if len(parts) > 2 else "倒计时"
                self.cmd_countdown(parts[1], name)
            elif action == "countdowns" or action == "cds":
                self.cmd_list_countdowns()
            elif action == "cancel-cd":
                if len(parts) < 2:
                    print(colored("用法: cancel-cd <倒计时ID>", ANSI_YELLOW))
                    continue
                self.cmd_cancel_countdown(parts[1])
            elif action == "next":
                self.cmd_next()
            elif action == "snooze":
                if len(parts) < 2:
                    print(colored("用法: snooze <闹钟ID> [分钟数]", ANSI_YELLOW))
                    continue
                minutes = int(parts[2]) if len(parts) > 2 else 5
                self.cmd_snooze(parts[1], minutes)
            elif action == "stats":
                self.cmd_stats()
            else:
                print(colored(f"未知命令: {action}，输入 help 查看帮助", ANSI_RED))

        self.running = False
        print(colored("👋 再见!", ANSI_CYAN))

    def _interactive_add(self, parts):
        if len(parts) < 2:
            print(colored("用法: add <HH:MM> [-m 消息] [-r 重复模式] [-d 天数] [-c 命令]", ANSI_YELLOW))
            return

        time_str = parts[1]
        message = ""
        repeat = "once"
        days = ""
        command = ""

        i = 2
        while i < len(parts):
            if parts[i] == "-m" and i + 1 < len(parts):
                message = parts[i + 1]
                i += 2
            elif parts[i] == "-r" and i + 1 < len(parts):
                repeat = parts[i + 1]
                i += 2
            elif parts[i] == "-d" and i + 1 < len(parts):
                days = parts[i + 1]
                i += 2
            elif parts[i] == "-c" and i + 1 < len(parts):
                command = parts[i + 1]
                i += 2
            else:
                i += 1

        self.cmd_add(time_str, message=message, repeat=repeat, days=days, command=command)

    def _print_help(self):
        print(bold("\n📖 命令列表"))
        print("─" * 50)
        print(f"  {colored('add <HH:MM> [-m 消息] [-r once|daily|weekdays|custom] [-d 天数] [-c 命令]', ANSI_CYAN)}")
        print(f"    添加闹钟 (天数: mon,tue,wed,thu,fri,sat,sun)")
        print(f"  {colored('list / ls', ANSI_CYAN)}         列出所有闹钟")
        print(f"  {colored('delete <ID>', ANSI_CYAN)}      删除闹钟")
        print(f"  {colored('pause <ID>', ANSI_CYAN)}       暂停/恢复闹钟")
        print(f"  {colored('snooze <ID> [分钟]', ANSI_CYAN)} 暂缓闹钟 (默认5分钟)")
        print(f"  {colored('next', ANSI_CYAN)}             显示下一个闹钟")
        print(f"  {colored('countdown <时长> [名称]', ANSI_CYAN)}  开始倒计时 (5s/5m/5h)")
        print(f"  {colored('countdowns', ANSI_CYAN)}       列出活跃倒计时")
        print(f"  {colored('cancel-cd <ID>', ANSI_CYAN)}   取消倒计时")
        print(f"  {colored('stats', ANSI_CYAN)}            显示闹钟统计")
        print(f"  {colored('help', ANSI_CYAN)}             显示帮助")
        print(f"  {colored('exit', ANSI_CYAN)}             退出程序")


def build_parser():
    parser = argparse.ArgumentParser(
        description="🔔 命令行闹钟工具 - 支持多闹钟、倒计时、自定义命令",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="action", help="子命令")

    p_add = sub.add_parser("add", help="添加闹钟")
    p_add.add_argument("time", help="闹钟时间 (HH:MM)")
    p_add.add_argument("-m", "--message", default="", help="提醒消息")
    p_add.add_argument("-r", "--repeat", default="once",
                       choices=["once", "daily", "weekdays", "custom"],
                       help="重复模式")
    p_add.add_argument("-d", "--days", default="", help="自定义重复天数 (mon,tue,...)")
    p_add.add_argument("-c", "--command", default="", help="触发时执行的命令")

    sub.add_parser("list", help="列出所有闹钟")
    sub.add_parser("next", help="显示下一个闹钟")
    sub.add_parser("stats", help="显示闹钟统计")

    p_del = sub.add_parser("delete", help="删除闹钟")
    p_del.add_argument("id", help="闹钟ID")

    p_pause = sub.add_parser("pause", help="暂停/恢复闹钟")
    p_pause.add_argument("id", help="闹钟ID")

    p_snooze = sub.add_parser("snooze", help="暂缓闹钟")
    p_snooze.add_argument("id", help="闹钟ID")
    p_snooze.add_argument("-t", "--minutes", type=int, default=5, help="暂缓分钟数")

    p_cd = sub.add_parser("countdown", help="开始倒计时")
    p_cd.add_argument("duration", help="时长 (30s / 5m / 1h)")
    p_cd.add_argument("-n", "--name", default="倒计时", help="倒计时名称")

    p_cds = sub.add_parser("countdowns", help="列出活跃倒计时")
    p_cancel_cd = sub.add_parser("cancel-cd", help="取消倒计时")
    p_cancel_cd.add_argument("id", help="倒计时ID")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    app = AlarmApp()

    if args.action == "add":
        app.cmd_add(args.time, message=args.message, repeat=args.repeat,
                    days=args.days, command=args.command)
    elif args.action == "list":
        app.cmd_list()
    elif args.action == "next":
        app.cmd_next()
    elif args.action == "stats":
        app.cmd_stats()
    elif args.action == "delete":
        app.cmd_delete(args.id)
    elif args.action == "pause":
        app.cmd_pause(args.id)
    elif args.action == "snooze":
        app.cmd_snooze(args.id, args.minutes)
    elif args.action == "countdown":
        app.start_background()
        app.cmd_countdown(args.duration, args.name)
        try:
            while any(cd.active for cd in app.store.countdowns.values()):
                time.sleep(1)
        except KeyboardInterrupt:
            print()
            for cd in list(app.store.countdowns.values()):
                cd.cancel()
    elif args.action == "countdowns":
        app.cmd_list_countdowns()
    elif args.action == "cancel-cd":
        app.cmd_cancel_countdown(args.id)
    else:
        app.run_interactive()


if __name__ == "__main__":
    main()
