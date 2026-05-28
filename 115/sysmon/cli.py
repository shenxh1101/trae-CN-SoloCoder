import argparse
import sys
from sysmon import __version__


def build_parser():
    parser = argparse.ArgumentParser(
        prog="sysmon",
        description="系统资源历史记录工具 - 采集、分析和报告系统资源使用情况",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", help="可用子命令")

    rec = subparsers.add_parser("record", help="记录系统资源数据到CSV")
    rec.add_argument("-i", "--interval", type=float, default=5.0, help="采集间隔(秒)，默认5")
    rec.add_argument("-d", "--duration", type=float, default=0, help="采集总时长(秒)，0表示无限")
    rec.add_argument("-o", "--output", type=str, default=None, help="输出CSV文件路径")
    rec.add_argument("--no-network-sample", action="store_true", help="跳过网络速度采样(加快采集)")

    rpt = subparsers.add_parser("report", help="生成资源使用统计报告")
    rpt.add_argument("-f", "--file", type=str, default=None, help="CSV文件路径")
    rpt.add_argument("--start", type=str, default=None, help="开始时间 (YYYY-MM-DD HH:MM:SS)")
    rpt.add_argument("--end", type=str, default=None, help="结束时间 (YYYY-MM-DD HH:MM:SS)")

    dash = subparsers.add_parser("dashboard", help="终端实时仪表盘")
    dash.add_argument("-i", "--interval", type=float, default=1.0, help="刷新间隔(秒)，默认1")
    dash.add_argument("--alert-cpu", type=float, default=90.0, help="CPU报警阈值(%%)")
    dash.add_argument("--alert-mem", type=float, default=90.0, help="内存报警阈值(%%)")
    dash.add_argument("--alert-consecutive", type=int, default=3, help="连续超限次数触发报警")
    dash.add_argument("--alert-command", type=str, default=None, help="报警时执行的自定义命令")

    html = subparsers.add_parser("html", help="导出HTML格式报告")
    html.add_argument("-f", "--file", type=str, default=None, help="CSV文件路径")
    html.add_argument("-o", "--output", type=str, default="sysmon_report.html", help="输出HTML文件")
    html.add_argument("--start", type=str, default=None, help="开始时间")
    html.add_argument("--end", type=str, default=None, help="结束时间")

    merge = subparsers.add_parser("merge", help="合并多日数据分析")
    merge.add_argument("-f", "--files", nargs="+", help="要合并的CSV文件列表")
    merge.add_argument("--dir", type=str, default=None, help="包含CSV文件的目录")
    merge.add_argument("--period", type=str, default="week", choices=["week", "month"], help="报告周期")
    merge.add_argument("-o", "--output", type=str, default=None, help="输出报告文件")

    export = subparsers.add_parser("export", help="导出数据为JSON格式")
    export.add_argument("-f", "--file", type=str, default=None, help="CSV文件路径")
    export.add_argument("-o", "--output", type=str, default=None, help="输出JSON文件路径")
    export.add_argument("--start", type=str, default=None, help="开始时间")
    export.add_argument("--end", type=str, default=None, help="结束时间")

    daemon = subparsers.add_parser("daemon", help="后台守护模式持续记录")
    daemon.add_argument("-i", "--interval", type=float, default=60.0, help="采集间隔(秒)，默认60")
    daemon.add_argument("-o", "--output", type=str, default=None, help="数据存储目录")
    daemon.add_argument("--pid-file", type=str, default=None, help="PID文件路径")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    if args.command == "record":
        from sysmon.recorder import run_record
        run_record(args)
    elif args.command == "report":
        from sysmon.report import run_report
        run_report(args)
    elif args.command == "dashboard":
        from sysmon.dashboard import run_dashboard
        run_dashboard(args)
    elif args.command == "html":
        from sysmon.html_report import run_html_report
        run_html_report(args)
    elif args.command == "merge":
        from sysmon.merger import run_merge
        run_merge(args)
    elif args.command == "export":
        from sysmon.exporter import run_export
        run_export(args)
    elif args.command == "daemon":
        from sysmon.daemon import run_daemon
        run_daemon(args)
