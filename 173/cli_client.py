#!/usr/bin/env python3
import argparse
import json
import sys
import os

try:
    import requests
except ImportError:
    print("请先安装 requests: pip install requests")
    sys.exit(1)


DEFAULT_CONFIG = {
    "server": "http://localhost:5000",
    "api_token": ""
}

CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".remote_cmd_config.json")


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
        return config
    return DEFAULT_CONFIG.copy()


def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    os.chmod(CONFIG_FILE, 0o600)


def get_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def cmd_config(args):
    config = load_config()
    if args.server:
        config["server"] = args.server
    if args.token:
        config["api_token"] = args.token
    save_config(config)
    print(f"配置已保存到: {CONFIG_FILE}")
    print(f"服务器: {config['server']}")
    print(f"API Token: {'已设置' if config['api_token'] else '未设置'}")


def cmd_list(args):
    config = load_config()
    if not config["api_token"]:
        print("错误: 请先设置 API Token，使用: remote_cmd config --token <your-token>")
        sys.exit(1)

    try:
        r = requests.get(
            f"{config['server']}/api/commands",
            headers=get_headers(config["api_token"]),
            timeout=10
        )
        r.raise_for_status()
        data = r.json()

        if not data.get("success"):
            print(f"错误: {data.get('error', '未知错误')}")
            sys.exit(1)

        commands = data["commands"]
        print("\n可用命令组:")
        print("-" * 60)

        for group_id, group_config in commands.items():
            print(f"\n[{group_id}] {group_config['name']}")
            print(f"    {group_config['description']}")
            if group_config.get("require_approval"):
                print("    ⚠️  需要管理员审批")
            print("")
            for i, cmd in enumerate(group_config["commands"]):
                print(f"    {i}. {cmd['name']}")
                if args.verbose:
                    print(f"       命令: {cmd['command']}")

    except requests.exceptions.RequestException as e:
        print(f"连接错误: {e}")
        sys.exit(1)


def cmd_execute(args):
    config = load_config()
    if not config["api_token"]:
        print("错误: 请先设置 API Token")
        sys.exit(1)

    group_id = args.group
    cmd_index = args.index

    try:
        print(f"正在执行命令组 [{group_id}] 的第 {cmd_index} 个命令...")
        r = requests.post(
            f"{config['server']}/api/execute/{group_id}/{cmd_index}",
            headers=get_headers(config["api_token"]),
            timeout=120
        )
        data = r.json()

        if not data.get("success"):
            print(f"错误: {data.get('error', '未知错误')}")
            sys.exit(1)

        print("")
        print("=" * 60)
        print(f"命令: {data['command']}")
        print(f"状态: {data['status']}")
        print(f"执行ID: {data['history_id']}")
        print("=" * 60)
        print("")
        print(data.get("output", ""))

        if args.save:
            filename = f"output_{data['history_id']}.log"
            with open(filename, "w") as f:
                f.write(data.get("output", ""))
            print(f"\n输出已保存到: {filename}")

    except requests.exceptions.RequestException as e:
        print(f"请求错误: {e}")
        sys.exit(1)


def cmd_history(args):
    config = load_config()
    if not config["api_token"]:
        print("错误: 请先设置 API Token")
        sys.exit(1)

    try:
        r = requests.get(
            f"{config['server']}/api/history",
            headers=get_headers(config["api_token"]),
            timeout=10
        )
        r.raise_for_status()
        data = r.json()

        if not data.get("success"):
            print(f"错误: {data.get('error', '未知错误')}")
            sys.exit(1)

        histories = data["history"]
        if not histories:
            print("暂无执行历史")
            return

        limit = args.limit if args.limit else len(histories)
        print("\n执行历史:")
        print("-" * 80)
        print(f"{'ID':<6} {'用户':<10} {'命令组':<15} {'命令':<20} {'状态':<10} {'时间'}")
        print("-" * 80)

        for h in histories[:limit]:
            status = h["status"]
            if status == "success":
                status_str = "✅ 成功"
            elif status == "failed":
                status_str = "❌ 失败"
            elif status == "running":
                status_str = "⏳ 运行中"
            elif status == "rejected":
                status_str = "🚫 已拒绝"
            else:
                status_str = f"❓ {status}"

            start_time = h["start_time"].replace("T", " ")[:19] if h["start_time"] else "-"
            cmd_name = h["command_name"][:18] if len(h["command_name"]) > 18 else h["command_name"]
            group_name = h["command_group_name"][:13] if len(h["command_group_name"]) > 13 else h["command_group_name"]

            print(f"{h['id']:<6} {h['username']:<10} {group_name:<15} {cmd_name:<20} {status_str:<10} {start_time}")

    except requests.exceptions.RequestException as e:
        print(f"连接错误: {e}")
        sys.exit(1)


def cmd_output(args):
    config = load_config()
    if not config["api_token"]:
        print("错误: 请先设置 API Token")
        sys.exit(1)

    history_id = args.id
    try:
        r = requests.get(
            f"{config['server']}/api/output/{history_id}",
            headers=get_headers(config["api_token"]),
            timeout=10
        )
        r.raise_for_status()
        data = r.json()

        if not data.get("success"):
            print(f"错误: {data.get('error', '未知错误')}")
            sys.exit(1)

        print(f"状态: {data['status']}")
        print("=" * 60)
        print(data.get("output", ""))

    except requests.exceptions.RequestException as e:
        print(f"连接错误: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="远程命令执行客户端",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s config --server http://192.168.1.100:5000 --token your-api-token
  %(prog)s list
  %(prog)s list --verbose
  %(prog)s execute system_info 0
  %(prog)s execute system_info 0 --save
  %(prog)s history
  %(prog)s history --limit 10
  %(prog)s output 1
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    config_parser = subparsers.add_parser("config", help="配置客户端")
    config_parser.add_argument("--server", help="服务器地址")
    config_parser.add_argument("--token", help="API Token")

    list_parser = subparsers.add_parser("list", help="列出可用命令")
    list_parser.add_argument("--verbose", "-v", action="store_true", help="显示详细信息")

    exec_parser = subparsers.add_parser("execute", help="执行命令")
    exec_parser.add_argument("group", help="命令组ID")
    exec_parser.add_argument("index", type=int, help="命令索引")
    exec_parser.add_argument("--save", "-s", action="store_true", help="保存输出到文件")

    hist_parser = subparsers.add_parser("history", help="查看执行历史")
    hist_parser.add_argument("--limit", "-n", type=int, help="显示最近N条记录")

    output_parser = subparsers.add_parser("output", help="查看执行输出")
    output_parser.add_argument("id", type=int, help="执行记录ID")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "config":
        cmd_config(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "execute":
        cmd_execute(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "output":
        cmd_output(args)


if __name__ == "__main__":
    main()
