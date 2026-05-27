#!/usr/bin/env python3
import argparse
import sys
from getpass import getpass
from password_generator import PasswordGenerator
from password_vault import PasswordVault
from password_strength import PasswordStrength
from clipboard_manager import ClipboardManager
from wifi_qr import WiFiQRGenerator


def main():
    parser = argparse.ArgumentParser(description='密码管理工具 - 安全生成和管理您的密码')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    gen_parser = subparsers.add_parser('generate', help='生成随机密码')
    gen_parser.add_argument('-l', '--length', type=int, default=16, help='密码长度 (8-32, 默认: 16)')
    gen_parser.add_argument('--no-upper', action='store_true', help='不包含大写字母')
    gen_parser.add_argument('--no-lower', action='store_true', help='不包含小写字母')
    gen_parser.add_argument('--no-digits', action='store_true', help='不包含数字')
    gen_parser.add_argument('--no-symbols', action='store_true', help='不包含特殊符号')
    gen_parser.add_argument('--readable', action='store_true', help='生成可读密码 (单词+数字)')
    gen_parser.add_argument('--passphrase', action='store_true', help='生成密码短语 (4-6个单词)')
    gen_parser.add_argument('-w', '--words', type=int, default=4, help='密码短语单词数 (4-6)')
    gen_parser.add_argument('--no-confusing', action='store_true', help='排除混淆字符 (0O1l等)')
    gen_parser.add_argument('-b', '--batch', type=int, help='批量生成数量')
    gen_parser.add_argument('-c', '--copy', action='store_true', help='复制到剪贴板')

    strength_parser = subparsers.add_parser('strength', help='评估密码强度')
    strength_parser.add_argument('password', nargs='?', help='要评估的密码')

    save_parser = subparsers.add_parser('save', help='保存密码到加密库')
    save_parser.add_argument('site', help='网站/服务名称')
    save_parser.add_argument('username', help='用户名')
    save_parser.add_argument('password', nargs='?', help='密码 (不提供则自动生成)')

    list_parser = subparsers.add_parser('list', help='列出所有保存的密码')

    search_parser = subparsers.add_parser('search', help='搜索密码条目')
    search_parser.add_argument('keyword', help='搜索关键词')

    get_parser = subparsers.add_parser('get', help='获取特定密码条目')
    get_parser.add_argument('site', help='网站名称')
    get_parser.add_argument('-c', '--copy', action='store_true', help='复制密码到剪贴板')

    delete_parser = subparsers.add_parser('delete', help='删除密码条目')
    delete_parser.add_argument('site', help='网站名称')

    edit_parser = subparsers.add_parser('edit', help='修改密码条目')
    edit_parser.add_argument('site', help='网站名称')

    export_parser = subparsers.add_parser('export', help='导出密码库备份')
    export_parser.add_argument('output_file', help='输出文件路径')

    import_parser = subparsers.add_parser('import', help='从备份恢复密码库')
    import_parser.add_argument('input_file', help='备份文件路径')

    wifi_parser = subparsers.add_parser('wifi', help='生成WiFi二维码')
    wifi_parser.add_argument('ssid', help='WiFi名称')
    wifi_parser.add_argument('password', help='WiFi密码')
    wifi_parser.add_argument('--encryption', default='WPA', help='加密类型 (WPA/WEP/nopass, 默认: WPA)')
    wifi_parser.add_argument('--hidden', action='store_true', help='隐藏SSID')
    wifi_parser.add_argument('-o', '--output', help='输出图片路径 (默认: 显示到终端)')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    vault = None
    if args.command in ['save', 'list', 'search', 'get', 'delete', 'edit', 'export', 'import']:
        master_password = getpass('请输入主密码: ')
        vault = PasswordVault(master_password)
        if args.command != 'import':
            vault.load()

    gen = PasswordGenerator()
    clipboard = ClipboardManager()

    if args.command == 'generate':
        handle_generate(args, gen, clipboard)
    elif args.command == 'strength':
        handle_strength(args)
    elif args.command == 'save':
        handle_save(args, vault, gen)
    elif args.command == 'list':
        handle_list(vault)
    elif args.command == 'search':
        handle_search(args, vault)
    elif args.command == 'get':
        handle_get(args, vault, clipboard)
    elif args.command == 'delete':
        handle_delete(args, vault)
    elif args.command == 'edit':
        handle_edit(args, vault, gen)
    elif args.command == 'export':
        handle_export(args, vault)
    elif args.command == 'import':
        handle_import(args, vault)
    elif args.command == 'wifi':
        handle_wifi(args)


def handle_generate(args, gen, clipboard):
    if args.passphrase:
        password = gen.generate_passphrase(max(4, min(6, args.words)))
    elif args.readable:
        password = gen.generate_readable(args.no_confusing)
    else:
        length = max(8, min(32, args.length))
        password = gen.generate(
            length=length,
            include_upper=not args.no_upper,
            include_lower=not args.no_lower,
            include_digits=not args.no_digits,
            include_symbols=not args.no_symbols,
            exclude_confusing=args.no_confusing
        )

    if args.batch:
        print(f'批量生成 {args.batch} 个密码:')
        for i in range(args.batch):
            if args.passphrase:
                pwd = gen.generate_passphrase(max(4, min(6, args.words)))
            elif args.readable:
                pwd = gen.generate_readable(args.no_confusing)
            else:
                pwd = gen.generate(
                    length=max(8, min(32, args.length)),
                    include_upper=not args.no_upper,
                    include_lower=not args.no_lower,
                    include_digits=not args.no_digits,
                    include_symbols=not args.no_symbols,
                    exclude_confusing=args.no_confusing
                )
            print(f'{i + 1}. {pwd}')
    else:
        print(f'生成的密码: {password}')
        strength = PasswordStrength.evaluate(password)
        print(f'密码强度: {strength["level"]}')
        if strength['suggestions']:
            print('改进建议:')
            for s in strength['suggestions']:
                print(f'  - {s}')

        if args.copy:
            clipboard.copy(password)
            print('已复制到剪贴板，30秒后自动清空')


def handle_strength(args):
    password = args.password or getpass('请输入要评估的密码: ')
    strength = PasswordStrength.evaluate(password)
    print(f'密码强度: {strength["level"]}')
    print(f'得分: {strength["score"]}/100')
    if strength['suggestions']:
        print('改进建议:')
        for s in strength['suggestions']:
            print(f'  - {s}')


def handle_save(args, vault, gen):
    password = args.password or gen.generate()
    vault.add_entry(args.site, args.username, password)
    vault.save()
    print(f'已保存 {args.site} 的密码')


def handle_list(vault):
    entries = vault.get_all_entries()
    if not entries:
        print('密码库为空')
        return
    print(f'共有 {len(entries)} 个密码条目:')
    for entry in entries:
        expired = vault.check_expired(entry['site'])
        status = ' [已过期]' if expired else ''
        print(f"- {entry['site']} ({entry['username']}){status}")


def handle_search(args, vault):
    results = vault.search_entries(args.keyword)
    if not results:
        print(f'未找到包含 "{args.keyword}" 的条目')
        return
    print(f'找到 {len(results)} 个匹配条目:')
    for entry in results:
        print(f"- {entry['site']} ({entry['username']})")


def handle_get(args, vault, clipboard):
    entry = vault.get_entry(args.site)
    if not entry:
        print(f'未找到 {args.site} 的密码')
        return
    print(f'网站: {entry["site"]}')
    print(f'用户名: {entry["username"]}')
    print(f'密码: {entry["password"]}')
    print(f'创建时间: {entry["created_at"]}')

    expired = vault.check_expired(entry['site'])
    if expired:
        print('警告: 此密码已超过90天，建议更新!')

    if args.copy:
        clipboard.copy(entry['password'])
        print('已复制密码到剪贴板')


def handle_delete(args, vault):
    if vault.delete_entry(args.site):
        vault.save()
        print(f'已删除 {args.site} 的密码')
    else:
        print(f'未找到 {args.site} 的密码')


def handle_edit(args, vault, gen):
    entry = vault.get_entry(args.site)
    if not entry:
        print(f'未找到 {args.site} 的密码')
        return

    print('按回车保留原值')
    new_username = input(f'新用户名 ({entry["username"]}): ') or entry['username']
    new_password = input('新密码 (留空自动生成): ') or gen.generate()

    vault.update_entry(args.site, new_username, new_password)
    vault.save()
    print(f'已更新 {args.site} 的密码')


def handle_export(args, vault):
    vault.export_backup(args.output_file)
    print(f'已导出备份到 {args.output_file}')


def handle_import(args, vault):
    try:
        vault.import_backup(args.input_file)
        vault.save()
        print(f'已从 {args.input_file} 恢复密码库')
    except Exception as e:
        print(f'导入失败: {e}')


def handle_wifi(args):
    wifi_qr = WiFiQRGenerator()
    qr_text = wifi_qr.generate_string(args.ssid, args.password, args.encryption, args.hidden)

    if args.output:
        wifi_qr.save_image(args.ssid, args.password, args.encryption, args.hidden, args.output)
        print(f'WiFi二维码已保存到 {args.output}')
    else:
        print('WiFi配置字符串 (可用于生成二维码):')
        print(qr_text)
        print('\n终端显示二维码:')
        wifi_qr.print_terminal(args.ssid, args.password, args.encryption, args.hidden)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n操作已取消')
        sys.exit(0)
    except Exception as e:
        print(f'错误: {e}', file=sys.stderr)
        sys.exit(1)
