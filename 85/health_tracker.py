#!/usr/bin/env python3
import argparse
import sys
from datetime import datetime, timedelta
from storage import Storage
from user_manager import UserManager
from record_manager import RecordManager
from statistics_calculator import StatisticsCalculator
from exporter import Exporter
from chart_generator import ChartGenerator


class HealthTracker:
    def __init__(self):
        self.storage = Storage()
        self.user_manager = UserManager(self.storage)
        self.record_manager = RecordManager(self.storage, self.user_manager)
        self.statistics = StatisticsCalculator(self.storage, self.user_manager)
        self.exporter = Exporter(self.storage, self.user_manager)
        self.chart_generator = ChartGenerator()

    def add_record(self, args):
        date = args.date or datetime.now().strftime('%Y-%m-%d')
        self.record_manager.add_record(date, args.weight, args.sleep, args.steps)
        print(f"成功添加 {date} 的记录！")

    def edit_record(self, args):
        self.record_manager.edit_record(args.date, args.weight, args.sleep, args.steps)
        print(f"成功更新 {args.date} 的记录！")

    def delete_record(self, args):
        if self.record_manager.delete_record(args.date):
            print(f"成功删除 {args.date} 的记录！")
        else:
            print(f"未找到 {args.date} 的记录！")

    def query_record(self, args):
        if args.date:
            record = self.record_manager.get_record(args.date)
            if record:
                self._print_record(args.date, record)
                self._print_goal_diff(record)
            else:
                print(f"未找到 {args.date} 的记录！")
        else:
            self._print_weekly_summary()

    def _print_record(self, date, record):
        print(f"\n=== {date} 的健康数据 ===")
        if 'weight' in record:
            print(f"体重: {record['weight']} kg")
        if 'sleep' in record:
            print(f"睡眠: {record['sleep']} 小时")
        if 'steps' in record:
            print(f"步数: {record['steps']} 步")

    def _print_goal_diff(self, record):
        goals = self.user_manager.get_current_user_goals()
        if not goals:
            return

        print("\n--- 目标差距 ---")
        if goals.get('target_weight') and 'weight' in record:
            diff = record['weight'] - goals['target_weight']
            status = "高于" if diff > 0 else "低于" if diff < 0 else "等于"
            print(f"体重目标: {goals['target_weight']} kg，当前{status}目标 {abs(diff):.2f} kg")

        if goals.get('target_steps') and 'steps' in record:
            diff = record['steps'] - goals['target_steps']
            status = "超过" if diff > 0 else "低于" if diff < 0 else "等于"
            print(f"步数目标: {goals['target_steps']} 步，当前{status}目标 {abs(diff)} 步")

    def _print_weekly_summary(self):
        records = self.statistics.get_weekly_records()
        if not records:
            print("最近一周没有数据记录！")
            return

        print("\n=== 最近一周健康数据摘要 ===")
        for date in sorted(records.keys(), reverse=True):
            record = records[date]
            weight = f"{record['weight']:.1f}kg" if 'weight' in record else "-"
            sleep = f"{record['sleep']:.1f}h" if 'sleep' in record else "-"
            steps = f"{record['steps']:,}步" if 'steps' in record else "-"
            print(f"{date}: 体重={weight}, 睡眠={sleep}, 步数={steps}")

        weight_trend = self.statistics.get_weight_trend()
        if weight_trend:
            print(f"\n体重变化趋势: 与上周同期相比 {weight_trend:+.2f} kg")

    def show_statistics(self, args):
        stats = self.statistics.get_all_statistics()
        print("\n=== 健康数据统计 ===")
        print(f"历史最低体重: {stats['min_weight']:.2f} kg" if stats['min_weight'] else "历史最低体重: 无数据")
        print(f"历史最高步数: {stats['max_steps']:,} 步" if stats['max_steps'] else "历史最高步数: 无数据")
        print(f"平均睡眠时长: {stats['avg_sleep']:.2f} 小时" if stats['avg_sleep'] else "平均睡眠时长: 无数据")
        print(f"总记录天数: {stats['total_days']} 天")

    def set_goals(self, args):
        self.user_manager.set_goals(args.target_weight, args.target_steps)
        print("目标设置成功！")
        goals = self.user_manager.get_current_user_goals()
        if goals.get('target_weight'):
            print(f"目标体重: {goals['target_weight']} kg")
        if goals.get('target_steps'):
            print(f"每日步数目标: {goals['target_steps']} 步")

    def export_csv(self, args):
        filename = args.filename or 'health_data_export.csv'
        self.exporter.export_to_csv(filename)
        print(f"数据已导出到 {filename}")

    def show_steps_chart(self, args):
        records = self.statistics.get_weekly_records()
        if not records:
            print("最近一周没有步数数据！")
            return

        steps_data = {}
        for date, record in records.items():
            if 'steps' in record:
                steps_data[date] = record['steps']

        if not steps_data:
            print("最近一周没有步数数据！")
            return

        print("\n=== 最近七天步数变化 ===")
        self.chart_generator.generate_steps_chart(steps_data)

    def export_report(self, args):
        filename = args.filename or 'health_report.txt'
        report_content = self._generate_report()
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report_content)
        print(f"报告已导出到 {filename}")

    def _generate_report(self):
        lines = []
        lines.append("=" * 50)
        lines.append("          健康数据报告")
        lines.append("=" * 50)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"当前用户: {self.user_manager.get_current_user()}")
        lines.append("")

        lines.append("--- 数据统计 ---")
        stats = self.statistics.get_all_statistics()
        lines.append(f"历史最低体重: {stats['min_weight']:.2f} kg" if stats['min_weight'] else "历史最低体重: 无数据")
        lines.append(f"历史最高步数: {stats['max_steps']:,} 步" if stats['max_steps'] else "历史最高步数: 无数据")
        lines.append(f"平均睡眠时长: {stats['avg_sleep']:.2f} 小时" if stats['avg_sleep'] else "平均睡眠时长: 无数据")
        lines.append(f"总记录天数: {stats['total_days']} 天")
        lines.append("")

        lines.append("--- 最近一周数据 ---")
        records = self.statistics.get_weekly_records()
        if records:
            for date in sorted(records.keys()):
                record = records[date]
                weight = f"{record['weight']:.1f}kg" if 'weight' in record else "-"
                sleep = f"{record['sleep']:.1f}h" if 'sleep' in record else "-"
                steps = f"{record['steps']:,}步" if 'steps' in record else "-"
                lines.append(f"{date}: 体重={weight}, 睡眠={sleep}, 步数={steps}")
        else:
            lines.append("无数据")
        lines.append("")

        lines.append("--- 步数图表 ---")
        steps_data = {}
        for date, record in records.items():
            if 'steps' in record:
                steps_data[date] = record['steps']
        if steps_data:
            chart_lines = self.chart_generator.get_chart_lines(steps_data)
            lines.extend(chart_lines)
        else:
            lines.append("无步数数据")

        return "\n".join(lines)

    def create_user(self, args):
        if self.user_manager.create_user(args.username):
            print(f"用户 '{args.username}' 创建成功！")
        else:
            print(f"用户 '{args.username}' 已存在！")

    def switch_user(self, args):
        if self.user_manager.switch_user(args.username):
            print(f"已切换到用户 '{args.username}'")
        else:
            print(f"用户 '{args.username}' 不存在！")

    def list_users(self, args):
        users = self.user_manager.list_users()
        current = self.user_manager.get_current_user()
        print("\n=== 用户列表 ===")
        for user in users:
            marker = " <-- 当前用户" if user == current else ""
            print(f"- {user}{marker}")

    def delete_user(self, args):
        if args.username == self.user_manager.get_current_user():
            print("不能删除当前用户！请先切换到其他用户。")
            return
        if self.user_manager.delete_user(args.username):
            print(f"用户 '{args.username}' 已删除！")
        else:
            print(f"用户 '{args.username}' 不存在！")


def main():
    tracker = HealthTracker()
    parser = argparse.ArgumentParser(description='健康数据追踪工具')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    add_parser = subparsers.add_parser('add', help='添加健康记录')
    add_parser.add_argument('--date', help='日期 (YYYY-MM-DD)，默认为今天')
    add_parser.add_argument('--weight', type=float, help='体重 (kg)')
    add_parser.add_argument('--sleep', type=float, help='睡眠时长 (小时)')
    add_parser.add_argument('--steps', type=int, help='步数')
    add_parser.set_defaults(func=tracker.add_record)

    edit_parser = subparsers.add_parser('edit', help='编辑健康记录')
    edit_parser.add_argument('date', help='日期 (YYYY-MM-DD)')
    edit_parser.add_argument('--weight', type=float, help='体重 (kg)')
    edit_parser.add_argument('--sleep', type=float, help='睡眠时长 (小时)')
    edit_parser.add_argument('--steps', type=int, help='步数')
    edit_parser.set_defaults(func=tracker.edit_record)

    delete_parser = subparsers.add_parser('delete', help='删除健康记录')
    delete_parser.add_argument('date', help='日期 (YYYY-MM-DD)')
    delete_parser.set_defaults(func=tracker.delete_record)

    query_parser = subparsers.add_parser('query', help='查询健康记录')
    query_parser.add_argument('--date', help='查询指定日期 (YYYY-MM-DD)，默认查询最近一周')
    query_parser.set_defaults(func=tracker.query_record)

    stats_parser = subparsers.add_parser('stats', help='显示数据统计')
    stats_parser.set_defaults(func=tracker.show_statistics)

    goals_parser = subparsers.add_parser('set-goals', help='设置健康目标')
    goals_parser.add_argument('--target-weight', type=float, help='目标体重 (kg)')
    goals_parser.add_argument('--target-steps', type=int, help='每日步数目标')
    goals_parser.set_defaults(func=tracker.set_goals)

    export_parser = subparsers.add_parser('export-csv', help='导出数据为CSV')
    export_parser.add_argument('--filename', help='输出文件名')
    export_parser.set_defaults(func=tracker.export_csv)

    chart_parser = subparsers.add_parser('chart', help='显示步数柱状图')
    chart_parser.set_defaults(func=tracker.show_steps_chart)

    report_parser = subparsers.add_parser('export-report', help='导出数据报告')
    report_parser.add_argument('--filename', help='输出文件名')
    report_parser.set_defaults(func=tracker.export_report)

    create_user_parser = subparsers.add_parser('create-user', help='创建新用户')
    create_user_parser.add_argument('username', help='用户名')
    create_user_parser.set_defaults(func=tracker.create_user)

    switch_user_parser = subparsers.add_parser('switch-user', help='切换用户')
    switch_user_parser.add_argument('username', help='用户名')
    switch_user_parser.set_defaults(func=tracker.switch_user)

    list_users_parser = subparsers.add_parser('list-users', help='列出所有用户')
    list_users_parser.set_defaults(func=tracker.list_users)

    delete_user_parser = subparsers.add_parser('delete-user', help='删除用户')
    delete_user_parser.add_argument('username', help='用户名')
    delete_user_parser.set_defaults(func=tracker.delete_user)

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == '__main__':
    main()
