"""
命令行接口模块 - 处理命令行参数和交互流程
"""

import argparse
import sys
import os
from typing import List
from colorama import init, Fore, Style

init()

from .models import Script, Character
from .generator import DialogueGenerator
from .history_manager import HistoryManager
from .sentiment_analyzer import SentimentAnalyzer
from .ui import UserInterface
from .batch_processor import BatchProcessor
from .exporter import Exporter


def parse_args():
    parser = argparse.ArgumentParser(
        description="AI剧本对话生成器 - 基于场景和角色设定生成对话剧本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 交互式生成
  python main.py

  # 直接生成对话
  python main.py generate --scene "咖啡店内，男女初次相遇" \\
    --char1 "男主：内向，书呆子" --char2 "女主：外向，风趣"

  # 指定轮数和版本数
  python main.py generate --scene "场景" --char1 "角色1" --char2 "角色2" \\
    --min-turns 3 --max-turns 5 --versions 3

  # 梦幻联动
  python main.py crossover --char1 "哈利波特：勇敢，正义" \\
    --char2 "孙悟空：桀骜，机智" --scenario "在现代都市相遇"

  # 批量生成
  python main.py batch --scenes scenes.json --format json

  # 情感分析
  python main.py analyze --script output/script.json

  # 显示历史记录
  python main.py history

  # 配置API
  python configure_api.py setup
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    generate_parser = subparsers.add_parser('generate', help='生成对话剧本')
    generate_parser.add_argument('--scene', type=str, help='场景设定')
    generate_parser.add_argument('--char1', type=str, help='角色1设定，格式：名字：性格')
    generate_parser.add_argument('--char2', type=str, help='角色2设定，格式：名字：性格')
    generate_parser.add_argument('--min-turns', type=int, default=4, help='最少对话轮数')
    generate_parser.add_argument('--max-turns', type=int, default=6, help='最多对话轮数')
    generate_parser.add_argument('--versions', type=int, default=3, help='生成版本数')
    generate_parser.add_argument('--no-emotion', action='store_true', help='不包含情绪标签')
    generate_parser.add_argument('--use-history', action='store_true', help='使用历史记录保持语气')
    generate_parser.add_argument('--char1-history', type=str, help='角色1的历史记录名称')
    generate_parser.add_argument('--char2-history', type=str, help='角色2的历史记录名称')
    generate_parser.add_argument('--mood', type=str, help='整体氛围参考')
    generate_parser.add_argument('--no-api-test', action='store_true', help='跳过API连接预测试')

    crossover_parser = subparsers.add_parser('crossover', help='梦幻联动 - 跨作品角色对话')
    crossover_parser.add_argument('--char1', type=str, help='角色1：名字：性格：出处')
    crossover_parser.add_argument('--char2', type=str, help='角色2：名字：性格：出处')
    crossover_parser.add_argument('--scenario', type=str, help='联动场景')
    crossover_parser.add_argument('--min-turns', type=int, default=4)
    crossover_parser.add_argument('--max-turns', type=int, default=6)
    crossover_parser.add_argument('--versions', type=int, default=2)
    crossover_parser.add_argument('--no-api-test', action='store_true', help='跳过API连接预测试')

    batch_parser = subparsers.add_parser('batch', help='批量生成')
    batch_parser.add_argument('--scenes', type=str, required=True, help='场景文件路径')
    batch_parser.add_argument('--format', type=str, default='json', help='输出格式')
    batch_parser.add_argument('--output-dir', type=str, help='输出目录')
    batch_parser.add_argument('--no-api-test', action='store_true', help='跳过API连接预测试')

    analyze_parser = subparsers.add_parser('analyze', help='情感分析')
    analyze_parser.add_argument('--script', type=str, required=True, help='剧本JSON文件路径')
    analyze_parser.add_argument('--heatmap', action='store_true', help='显示热力图')
    analyze_parser.add_argument('--summary', action='store_true', help='显示情感摘要')
    analyze_parser.add_argument('--no-api-test', action='store_true', help='跳过API连接预测试')

    subparsers.add_parser('history', help='查看历史记录')

    export_parser = subparsers.add_parser('export', help='导出剧本')
    export_parser.add_argument('--script', type=str, required=True, help='剧本JSON文件路径')
    export_parser.add_argument('--format', type=str, default='txt', help='导出格式: txt/json/fdx/all')

    edit_parser = subparsers.add_parser('edit', help='编辑已有剧本')
    edit_parser.add_argument('--script', type=str, required=True, help='剧本JSON文件路径')

    return parser.parse_args()


def parse_character(char_str: str) -> Character:
    parts = char_str.split('：', 2)
    if len(parts) == 1:
        return Character(name=parts[0].strip(), personality='')
    elif len(parts) == 2:
        return Character(name=parts[0].strip(), personality=parts[1].strip())
    else:
        return Character(
            name=parts[0].strip(),
            personality=parts[1].strip(),
            source=parts[2].strip()
        )


def parse_character_crossover(char_str: str) -> Character:
    parts = char_str.split('：', 3)
    if len(parts) >= 3:
        return Character(
            name=parts[0].strip(),
            personality=parts[1].strip(),
            source=parts[2].strip(),
            style=parts[3].strip() if len(parts) > 3 else ''
        )
    elif len(parts) == 2:
        return Character(
            name=parts[0].strip(),
            personality=parts[1].strip(),
            source=''
        )
    else:
        return Character(name=parts[0].strip(), personality='')


def verify_api_config():
    """验证API配置是否存在"""
    api_key = os.getenv("OPENAI_API_KEY", "")
    return bool(api_key) and api_key != "your_api_key_here"


def interactive_mode():
    ui = UserInterface()
    ui.show_banner()

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  API连接验证{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    if not verify_api_config():
        print(f"\n{Fore.YELLOW}⚠ 未检测到有效的API配置{Style.RESET_ALL}")
        choice = input(f"\n{Fore.GREEN}是否现在配置API？(y/n): {Style.RESET_ALL}").strip().lower()
        if choice == 'y':
            print(f"\n请运行: {Fore.CYAN}python configure_api.py setup{Style.RESET_ALL}")
            print(f"或手动创建 .env 文件并配置 OPENAI_API_KEY\n")
            return
        else:
            print(f"\n{Fore.RED}错误：必须配置API才能使用生成功能{Style.RESET_ALL}")
            return

    try:
        generator = DialogueGenerator(test_connection=True)
        api_status = generator.get_api_status()
        print(f"\n{Fore.GREEN}✓ API连接正常！{Style.RESET_ALL}")
        print(f"  模型: {api_status['model']}")
        print(f"  API密钥: {api_status['api_key_masked']}")
    except SystemExit:
        return
    except Exception as e:
        print(f"\n{Fore.RED}API初始化失败: {e}{Style.RESET_ALL}")
        return

    history_manager = HistoryManager()
    sentiment_analyzer = SentimentAnalyzer()

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  对话生成设置{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    scene = input("场景设定（如：咖啡店内，男女初次相遇）: ").strip()
    if not scene:
        print(f"{Fore.RED}场景不能为空！{Style.RESET_ALL}")
        return

    char1_input = input("角色1设定（格式：名字：性格）: ").strip()
    char2_input = input("角色2设定（格式：名字：性格）: ").strip()

    if not char1_input or not char2_input:
        print(f"{Fore.RED}角色设定不能为空！{Style.RESET_ALL}")
        return

    character1 = parse_character(char1_input)
    character2 = parse_character(char2_input)

    min_turns_input = input("最少对话轮数（默认4）: ").strip()
    min_turns = int(min_turns_input) if min_turns_input.isdigit() else 4

    max_turns_input = input("最多对话轮数（默认6）: ").strip()
    max_turns = int(max_turns_input) if max_turns_input.isdigit() else 6

    if min_turns > max_turns:
        print(f"{Fore.YELLOW}⚠ 最少轮数大于最多轮数，已自动调整为相等{Style.RESET_ALL}")
        max_turns = min_turns

    versions_input = input("生成版本数（默认3）: ").strip()
    num_versions = int(versions_input) if versions_input.isdigit() else 3

    if num_versions < 1:
        num_versions = 1

    use_history = input("是否使用历史记录保持角色语气？(y/n): ").strip().lower() == 'y'
    char_history = None
    char2_history = None

    if use_history:
        char1_history_name = input(f"角色1（{character1.name}）的历史记录名称: ").strip()
        char2_history_name = input(f"角色2（{character2.name}）的历史记录名称: ").strip()

        if char1_history_name:
            char_history, scripts_found = history_manager.get_character_history(char1_history_name)
            if char_history:
                print(f"  {Fore.GREEN}✓ 找到 {len(scripts_found)} 条 {character1.name} 的历史记录{Style.RESET_ALL}")
            else:
                print(f"  {Fore.YELLOW}⚠ 未找到 {character1.name} 的历史记录{Style.RESET_ALL}")

        if char2_history_name:
            char2_history, scripts_found = history_manager.get_character_history(char2_history_name)
            if char2_history:
                print(f"  {Fore.GREEN}✓ 找到 {len(scripts_found)} 条 {character2.name} 的历史记录{Style.RESET_ALL}")
            else:
                print(f"  {Fore.YELLOW}⚠ 未找到 {character2.name} 的历史记录{Style.RESET_ALL}")

    mood = input("整体氛围参考（可选，回车跳过）: ").strip() or None

    combined_history = None
    if char_history or char2_history:
        parts = []
        if char_history:
            parts.append(char_history)
        if char2_history:
            parts.append(char2_history)
        combined_history = "\n\n".join(parts)

    try:
        scripts = generator.generate_script(
            scene=scene,
            character1=character1,
            character2=character2,
            min_turns=min_turns,
            max_turns=max_turns,
            include_emotion=True,
            num_versions=num_versions,
            character_history=combined_history,
            mood_reference=mood
        )
    except RuntimeError as e:
        print(f"\n{Fore.RED}生成失败: {e}{Style.RESET_ALL}")
        return

    if not scripts or all(len(s.dialogue) == 0 for s in scripts):
        print(f"\n{Fore.RED}生成的剧本内容为空，请检查LLM响应格式{Style.RESET_ALL}")
        return

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  版本选择{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    selected = ui.select_version(scripts)
    if not selected:
        print(f"\n{Fore.YELLOW}已取消选择。{Style.RESET_ALL}")
        return

    ui.show_full_script(selected)

    show_chart = input("是否显示情感弧线分析图？(y/n): ").strip().lower() == 'y'
    if show_chart:
        try:
            selected = generator.analyze_sentiment(selected)
        except Exception as e:
            print(f"{Fore.YELLOW}⚠ 情感分析调用失败: {e}{Style.RESET_ALL}")

        print(sentiment_analyzer.generate_ascii_chart(selected))
        print(sentiment_analyzer.generate_heatmap(selected))
        sentiment_analyzer.print_summary(selected)

    edit = input("是否需要修改对话？(y/n): ").strip().lower() == 'y'
    if edit:
        selected = ui.edit_dialogue(selected)

    save_as_reference = input("是否保存为训练参考剧本？(y/n): ").strip().lower() == 'y'
    if save_as_reference:
        saved_path = history_manager.save_script(selected)
        print(f"\n{Fore.GREEN}✓ 已保存到历史记录：{saved_path}{Style.RESET_ALL}")

    ui.choose_export_format(selected)

    print(f"\n{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}  🎉 完成！感谢使用AI剧本对话生成器。{Style.RESET_ALL}")
    print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}\n")


def cmd_generate(args):
    test_connection = not args.no_api_test

    try:
        generator = DialogueGenerator(test_connection=test_connection)
    except SystemExit:
        return
    except Exception as e:
        print(f"\n{Fore.RED}API初始化失败: {e}{Style.RESET_ALL}")
        return

    ui = UserInterface()
    history_manager = HistoryManager()
    sentiment_analyzer = SentimentAnalyzer()

    if not args.scene or not args.char1 or not args.char2:
        print("请提供场景和角色设定！")
        print("使用 --scene, --char1, --char2 参数")
        return

    character1 = parse_character(args.char1)
    character2 = parse_character(args.char2)

    char1_history = None
    char2_history = None

    if args.use_history:
        if args.char1_history:
            char1_history, _ = history_manager.get_character_history(args.char1_history)
        if args.char2_history:
            char2_history, _ = history_manager.get_character_history(args.char2_history)

    combined_history = None
    if char1_history or char2_history:
        parts = []
        if char1_history:
            parts.append(char1_history)
        if char2_history:
            parts.append(char2_history)
        combined_history = "\n\n".join(parts)

    try:
        scripts = generator.generate_script(
            scene=args.scene,
            character1=character1,
            character2=character2,
            min_turns=args.min_turns,
            max_turns=args.max_turns,
            include_emotion=not args.no_emotion,
            num_versions=args.versions,
            character_history=combined_history,
            mood_reference=args.mood
        )
    except RuntimeError as e:
        print(f"\n{Fore.RED}生成失败: {e}{Style.RESET_ALL}")
        return

    for script in scripts:
        script.print_console()
        try:
            script = generator.analyze_sentiment(script)
        except Exception as e:
            print(f"{Fore.YELLOW}⚠ 情感分析调用失败: {e}{Style.RESET_ALL}")
        print(sentiment_analyzer.generate_ascii_chart(script))

        history_manager.save_script(script)

        if args.versions == 1:
            ui.choose_export_format(script)


def cmd_crossover(args):
    test_connection = not args.no_api_test

    try:
        generator = DialogueGenerator(test_connection=test_connection)
    except SystemExit:
        return
    except Exception as e:
        print(f"\n{Fore.RED}API初始化失败: {e}{Style.RESET_ALL}")
        return

    ui = UserInterface()
    history_manager = HistoryManager()
    sentiment_analyzer = SentimentAnalyzer()

    if not args.char1 or not args.char2 or not args.scenario:
        print("请提供两个角色和联动场景！")
        return

    character1 = parse_character_crossover(args.char1)
    character2 = parse_character_crossover(args.char2)

    try:
        scripts = generator.generate_crossover(
            character1=character1,
            character2=character2,
            scenario=args.scenario,
            min_turns=args.min_turns,
            max_turns=args.max_turns,
            num_versions=args.versions
        )
    except RuntimeError as e:
        print(f"\n{Fore.RED}生成失败: {e}{Style.RESET_ALL}")
        return

    for script in scripts:
        script.print_console()
        try:
            script = generator.analyze_sentiment(script)
        except Exception as e:
            print(f"{Fore.YELLOW}⚠ 情感分析调用失败: {e}{Style.RESET_ALL}")
        print(sentiment_analyzer.generate_ascii_chart(script))
        history_manager.save_script(script)

        if args.versions == 1:
            ui.choose_export_format(script)


def cmd_batch(args):
    test_connection = not args.no_api_test

    try:
        processor = BatchProcessor()
        processor.generator = DialogueGenerator(test_connection=test_connection)
    except SystemExit:
        return
    except Exception as e:
        print(f"\n{Fore.RED}API初始化失败: {e}{Style.RESET_ALL}")
        return

    print(f"开始批量处理场景文件: {args.scenes}")

    try:
        scripts = processor.process_batch(
            scenes_file=args.scenes,
            output_format=args.format,
            output_dir=args.output_dir
        )
    except RuntimeError as e:
        print(f"\n{Fore.RED}批量生成失败: {e}{Style.RESET_ALL}")
        return

    print(f"\n{Fore.GREEN}✓ 完成！共生成 {len(scripts)} 个剧本。{Style.RESET_ALL}")


def cmd_analyze(args):
    history_manager = HistoryManager()
    sentiment_analyzer = SentimentAnalyzer()

    script = history_manager.load_script(args.script)
    if not script:
        print(f"无法加载剧本: {args.script}")
        return

    if not args.no_api_test:
        try:
            generator = DialogueGenerator(test_connection=True)
            script = generator.analyze_sentiment(script)
        except SystemExit:
            return
        except Exception as e:
            print(f"{Fore.YELLOW}⚠ 情感分析API调用失败: {e}{Style.RESET_ALL}")

    print(sentiment_analyzer.generate_ascii_chart(script))

    if args.heatmap:
        print(sentiment_analyzer.generate_heatmap(script))

    if args.summary:
        sentiment_analyzer.print_summary(script)


def cmd_history(args):
    history_manager = HistoryManager()
    files = history_manager.list_history()

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  历史记录（共 {len(files)} 条）{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    for i, filename in enumerate(files, 1):
        script = history_manager.load_script(filename)
        if script:
            chars = ", ".join([c.name for c in script.characters])
            print(f"{Fore.YELLOW}{i:2d}.{Style.RESET_ALL} {filename}")
            print(f"     场景: {script.scene}")
            print(f"     角色: {chars}")
            print(f"     对话: {len(script.dialogue)} 轮\n")


def cmd_export(args):
    history_manager = HistoryManager()
    exporter = Exporter()

    script = history_manager.load_script(args.script)
    if not script:
        print(f"无法加载剧本: {args.script}")
        return

    if args.format == 'all':
        for fmt in ['txt', 'json', 'fdx']:
            path = exporter.export(script, fmt)
            print(f"{Fore.GREEN}✓ 已导出 {fmt.upper()}: {path}{Style.RESET_ALL}")
    else:
        path = exporter.export(script, args.format)
        print(f"{Fore.GREEN}✓ 已导出 {args.format.upper()}: {path}{Style.RESET_ALL}")


def cmd_edit(args):
    history_manager = HistoryManager()
    ui = UserInterface()

    script = history_manager.load_script(args.script)
    if not script:
        print(f"无法加载剧本: {args.script}")
        return

    ui.edit_dialogue(script)


def main():
    args = parse_args()

    if args.command is None:
        interactive_mode()
    elif args.command == 'generate':
        cmd_generate(args)
    elif args.command == 'crossover':
        cmd_crossover(args)
    elif args.command == 'batch':
        cmd_batch(args)
    elif args.command == 'analyze':
        cmd_analyze(args)
    elif args.command == 'history':
        cmd_history(args)
    elif args.command == 'export':
        cmd_export(args)
    elif args.command == 'edit':
        cmd_edit(args)
    else:
        print(f"未知命令: {args.command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
