"""
用户交互模块 - 处理版本选择、对话修改等交互操作
"""

import sys
from typing import List, Optional
from colorama import init, Fore, Style
from .models import Script, DialogueLine
from .history_manager import HistoryManager
from .exporter import Exporter

init()


class UserInterface:
    def __init__(self):
        self.history_manager = HistoryManager()
        self.exporter = Exporter()

    def select_version(self, scripts: List[Script]) -> Optional[Script]:
        if not scripts:
            return None

        if len(scripts) == 1:
            return scripts[0]

        print(f"\n{Fore.CYAN}{'='*70}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  生成了 {len(scripts)} 个版本，请对比后选择最合适的一个{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}\n")

        self._print_version_comparison(scripts)

        while True:
            print(f"\n{Fore.GREEN}操作选项：{Style.RESET_ALL}")
            print(f"  输入 {Fore.YELLOW}1-{len(scripts)}{Style.RESET_ALL} 选择对应版本")
            print(f"  输入 {Fore.YELLOW}v<编号>{Style.RESET_ALL} 查看完整版本 (如 v2)")
            print(f"  输入 {Fore.YELLOW}d<编号1>-<编号2>{Style.RESET_ALL} 对比两个版本 (如 d1-2)")
            print(f"  输入 {Fore.YELLOW}q{Style.RESET_ALL} 退出")

            choice = input(f"\n{Fore.GREEN}请选择: {Style.RESET_ALL}").strip().lower()

            if choice == 'q':
                return None

            if choice.startswith('v') and len(choice) > 1:
                try:
                    idx = int(choice[1:]) - 1
                    if 0 <= idx < len(scripts):
                        self._print_full_version(scripts[idx])
                    else:
                        print(f"{Fore.RED}无效的版本编号{Style.RESET_ALL}")
                except ValueError:
                    print(f"{Fore.RED}无效的输入{Style.RESET_ALL}")
                continue

            if choice.startswith('d') and '-' in choice:
                try:
                    parts = choice[1:].split('-')
                    idx1 = int(parts[0]) - 1
                    idx2 = int(parts[1]) - 1
                    if 0 <= idx1 < len(scripts) and 0 <= idx2 < len(scripts):
                        self._print_diff(scripts[idx1], scripts[idx2])
                    else:
                        print(f"{Fore.RED}无效的版本编号{Style.RESET_ALL}")
                except (ValueError, IndexError):
                    print(f"{Fore.RED}无效的对比格式，请使用 d1-2{Style.RESET_ALL}")
                continue

            try:
                idx = int(choice) - 1
                if 0 <= idx < len(scripts):
                    selected = scripts[idx]
                    print(f"\n{Fore.GREEN}✓ 已选择版本 {idx + 1}{Style.RESET_ALL}")
                    self._print_full_version(selected)
                    return selected
                else:
                    print(f"{Fore.RED}无效的选择，请输入 1-{len(scripts)} 之间的数字{Style.RESET_ALL}")
            except ValueError:
                print(f"{Fore.RED}请输入有效的指令{Style.RESET_ALL}")

    def _print_version_comparison(self, scripts: List[Script]):
        col_width = min(35, 70 // len(scripts))

        header = f"  {'':>4} "
        for idx in range(len(scripts)):
            header += f"| {Fore.YELLOW}版本 {idx+1:<{col_width-5}}{Style.RESET_ALL} "
        print(header)
        print(f"  {'─'*4}{'┼'*(len(scripts))}{'─'*(col_width+1)*(len(scripts))}")

        max_lines = max(len(s.dialogue) for s in scripts)
        for line_idx in range(max_lines):
            row = f"  {Fore.CYAN}L{line_idx+1:>2}{Style.RESET_ALL} "
            for script in scripts:
                if line_idx < len(script.dialogue):
                    dl = script.dialogue[line_idx]
                    text = f"{dl.speaker}（{dl.emotion}）" if dl.emotion else dl.speaker
                    if len(text) > col_width:
                        text = text[:col_width-2] + ".."
                    row += f"| {text:<{col_width}} "
                else:
                    row += f"| {'':<{col_width}} "
            print(row)

        print(f"  {'─'*4}{'┼'*(len(scripts))}{'─'*(col_width+1)*(len(scripts))}")
        row = f"  {'轮数':>4} "
        for script in scripts:
            row += f"| {len(script.dialogue)}轮{' '*(col_width-3)} "
        print(row)

    def _print_full_version(self, script: Script):
        print(f"\n{Fore.CYAN}{'─'*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  版本 {script.version} - 完整内容{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'─'*60}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}场景：{script.scene}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}角色：{', '.join([c.name for c in script.characters])}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'-'*60}{Style.RESET_ALL}\n")

        for i, line in enumerate(script.dialogue, 1):
            print(f"  {Fore.YELLOW}[{i}]{Style.RESET_ALL} {line.format_with_emotion()}")

        print(f"\n{Fore.CYAN}{'─'*60}{Style.RESET_ALL}\n")

    def _print_diff(self, script1: Script, script2: Script):
        print(f"\n{Fore.CYAN}{'='*70}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  版本对比：版本{script1.version} vs 版本{script2.version}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}\n")

        max_lines = max(len(script1.dialogue), len(script2.dialogue))
        for i in range(max_lines):
            left = script1.dialogue[i] if i < len(script1.dialogue) else None
            right = script2.dialogue[i] if i < len(script2.dialogue) else None

            print(f"  {Fore.CYAN}L{i+1}{Style.RESET_ALL}")

            if left:
                print(f"    {Fore.YELLOW}V{script1.version}{Style.RESET_ALL} {left.format_with_emotion()}")
            else:
                print(f"    {Fore.YELLOW}V{script1.version}{Style.RESET_ALL} (无)")

            if right:
                print(f"    {Fore.YELLOW}V{script2.version}{Style.RESET_ALL} {right.format_with_emotion()}")
            else:
                print(f"    {Fore.YELLOW}V{script2.version}{Style.RESET_ALL} (无)")
            print()

    def show_full_script(self, script: Script):
        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  完整剧本{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}场景：{script.scene}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}角色：{', '.join([c.name for c in script.characters])}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'-'*60}{Style.RESET_ALL}\n")

        for i, line in enumerate(script.dialogue, 1):
            print(f"  {Fore.YELLOW}[{i}]{Style.RESET_ALL} {line.format_with_emotion()}")

        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    def edit_dialogue(self, script: Script) -> Script:
        self.show_full_script(script)
        modified = False

        while True:
            print(f"\n{Fore.GREEN}编辑操作：{Style.RESET_ALL}")
            print(f"  输入 {Fore.YELLOW}1-{len(script.dialogue)}{Style.RESET_ALL} 修改对应行")
            print(f"  输入 {Fore.YELLOW}a<行号>{Style.RESET_ALL} 在该行之后插入新对话 (如 a3)")
            print(f"  输入 {Fore.YELLOW}r<行号>{Style.RESET_ALL} 删除该行 (如 r3)")
            print(f"  输入 {Fore.YELLOW}p{Style.RESET_ALL} 预览当前完整剧本")
            print(f"  输入 {Fore.YELLOW}u<行号>{Style.RESET_ALL} 撤销该行修改 (如 u3)")
            print(f"  输入 {Fore.YELLOW}s{Style.RESET_ALL} 保存并退出编辑")
            print(f"  输入 {Fore.YELLOW}q{Style.RESET_ALL} 不保存退出编辑")

            choice = input(f"\n{Fore.GREEN}请选择操作: {Style.RESET_ALL}").strip().lower()

            if choice == 'q':
                if modified:
                    confirm = input(f"{Fore.YELLOW}有未保存的修改，确定退出吗？(y/n): {Style.RESET_ALL}").strip().lower()
                    if confirm != 'y':
                        continue
                print(f"{Fore.YELLOW}退出编辑{Style.RESET_ALL}")
                return script

            elif choice == 's':
                saved_path = self.history_manager.save_script(script)
                print(f"\n{Fore.GREEN}✓ 剧本已保存到：{saved_path}{Style.RESET_ALL}")
                return script

            elif choice == 'p':
                self.show_full_script(script)
                continue

            elif choice.startswith('a') and len(choice) > 1:
                try:
                    after_idx = int(choice[1:]) - 1
                    if 0 <= after_idx < len(script.dialogue):
                        self._insert_line(script, after_idx + 1)
                        modified = True
                        self._show_edit_preview(script, after_idx + 1)
                    else:
                        print(f"{Fore.RED}无效的行号{Style.RESET_ALL}")
                except ValueError:
                    print(f"{Fore.RED}无效的输入{Style.RESET_ALL}")
                continue

            elif choice.startswith('r') and len(choice) > 1:
                try:
                    del_idx = int(choice[1:]) - 1
                    if 0 <= del_idx < len(script.dialogue):
                        removed = script.dialogue[del_idx]
                        print(f"  {Fore.RED}删除：{removed.format_with_emotion()}{Style.RESET_ALL}")
                        confirm = input(f"{Fore.YELLOW}确认删除？(y/n): {Style.RESET_ALL}").strip().lower()
                        if confirm == 'y':
                            script.dialogue.pop(del_idx)
                            for i, line in enumerate(script.dialogue):
                                line.line_index = i
                            modified = True
                            self._show_edit_preview(script, max(0, del_idx - 1))
                        else:
                            print(f"  {Fore.YELLOW}已取消删除{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}无效的行号{Style.RESET_ALL}")
                except ValueError:
                    print(f"{Fore.RED}无效的输入{Style.RESET_ALL}")
                continue

            elif choice.startswith('u') and len(choice) > 1:
                print(f"{Fore.YELLOW}撤销功能需要配合历史记录使用，暂不可用{Style.RESET_ALL}")
                continue

            else:
                try:
                    line_num = int(choice)
                    if 1 <= line_num <= len(script.dialogue):
                        self._edit_line(script, line_num - 1)
                        modified = True
                        self._show_edit_preview(script, line_num - 1)
                    else:
                        print(f"{Fore.RED}无效的行号，请输入 1-{len(script.dialogue)} 之间的数字{Style.RESET_ALL}")
                except ValueError:
                    print(f"{Fore.RED}请输入有效的操作指令{Style.RESET_ALL}")

    def _edit_line(self, script: Script, index: int):
        line = script.dialogue[index]

        print(f"\n{Fore.CYAN}{'─'*50}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  修改第 {index + 1} 行{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'─'*50}{Style.RESET_ALL}")
        print(f"  当前内容：{Fore.WHITE}{line.format_with_emotion()}{Style.RESET_ALL}")
        print(f"  角色名：{line.speaker}")
        print(f"  情绪标签：{line.emotion}")
        print(f"  对话内容：{line.text}\n")

        new_speaker = input(f"  {Fore.GREEN}角色名 (回车保持 '{line.speaker}'): {Style.RESET_ALL}").strip()
        if new_speaker:
            line.speaker = new_speaker

        new_emotion = input(f"  {Fore.GREEN}情绪标签 (回车保持 '{line.emotion}'): {Style.RESET_ALL}").strip()
        if new_emotion:
            line.emotion = new_emotion

        new_text = input(f"  {Fore.GREEN}对话内容 (回车保持原内容): {Style.RESET_ALL}").strip()
        if new_text:
            line.text = new_text

        print(f"\n  {Fore.GREEN}✓ 已更新第 {index + 1} 行{Style.RESET_ALL}")
        print(f"  修改后：{Fore.WHITE}{line.format_with_emotion()}{Style.RESET_ALL}")

    def _insert_line(self, script: Script, insert_at: int):
        print(f"\n{Fore.CYAN}{'─'*50}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  在第 {insert_at} 行后插入新对话{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'─'*50}{Style.RESET_ALL}\n")

        speaker = input(f"  {Fore.GREEN}角色名: {Style.RESET_ALL}").strip()
        if not speaker:
            print(f"  {Fore.RED}角色名不能为空，取消插入{Style.RESET_ALL}")
            return

        emotion = input(f"  {Fore.GREEN}情绪标签: {Style.RESET_ALL}").strip()
        text = input(f"  {Fore.GREEN}对话内容: {Style.RESET_ALL}").strip()
        if not text:
            print(f"  {Fore.RED}对话内容不能为空，取消插入{Style.RESET_ALL}")
            return

        new_line = DialogueLine(
            line_index=insert_at,
            speaker=speaker,
            text=text,
            emotion=emotion
        )
        script.dialogue.insert(insert_at, new_line)
        for i, line in enumerate(script.dialogue):
            line.line_index = i

        print(f"\n  {Fore.GREEN}✓ 已在第 {insert_at} 行后插入新对话{Style.RESET_ALL}")

    def _show_edit_preview(self, script: Script, focus_index: int):
        print(f"\n{Fore.CYAN}  当前剧本（聚焦第{focus_index+1}行附近）：{Style.RESET_ALL}")
        start = max(0, focus_index - 1)
        end = min(len(script.dialogue), focus_index + 3)

        for i in range(start, end):
            marker = " " if i != focus_index else "▶"
            print(f"  {Fore.YELLOW}{marker}[{i+1}]{Style.RESET_ALL} {script.dialogue[i].format_with_emotion()}")
        print()

    def choose_export_format(self, script: Script) -> Optional[List[str]]:
        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  导出剧本{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print("可用格式：")
        print("  1. TXT 纯文本格式")
        print("  2. JSON 数据格式")
        print("  3. FDX 编剧软件格式 (Final Draft)")
        print("  4. 全部导出")
        print("  5. 跳过导出\n")

        while True:
            choice = input(f"{Fore.GREEN}请选择导出格式 (1-5): {Style.RESET_ALL}").strip()

            if choice == '5':
                print(f"{Fore.YELLOW}跳过导出{Style.RESET_ALL}")
                return None

            formats_map = {
                '1': ['txt'],
                '2': ['json'],
                '3': ['fdx'],
                '4': ['txt', 'json', 'fdx']
            }

            if choice in formats_map:
                exported = []
                for fmt in formats_map[choice]:
                    path = self.exporter.export(script, fmt)
                    exported.append(path)
                    print(f"{Fore.GREEN}✓ 已导出 {fmt.upper()} 格式：{path}{Style.RESET_ALL}")
                return exported
            else:
                print(f"{Fore.RED}无效的选择，请输入 1-5 之间的数字{Style.RESET_ALL}")

    def confirm_action(self, message: str) -> bool:
        response = input(f"{Fore.YELLOW}{message} (y/n): {Style.RESET_ALL}").strip().lower()
        return response == 'y' or response == 'yes'

    def show_message(self, message: str, message_type: str = "info"):
        colors = {
            "info": Fore.CYAN,
            "success": Fore.GREEN,
            "warning": Fore.YELLOW,
            "error": Fore.RED
        }
        color = colors.get(message_type, Fore.WHITE)
        print(f"{color}{message}{Style.RESET_ALL}")

    def show_banner(self):
        banner = f"""
{Fore.CYAN}{'='*60}
   _____           _       _    _____                           _             
  / ____|         (_)     | |  / ____|                         | |            
 | (___   ___ _ __ _ _ __ | |_| |  __  ___ _ __   ___ _ __ __ _| |_ ___  _ __ 
  \\___ \\ / __| '__| | '_ \\| __| | |_ |/ _ \\ '_ \\ / _ \\ '__/ _` | __/ _ \\| '__|
  ____) | (__| |  | | |_) | |_| |__| |  __/ | | |  __/ | | (_| | || (_) | |   
 |_____/ \\___|_|  |_| .__/ \\__|\\_____|\\___|_| |_|\\___|_|  \\__,_|\\__\\___/|_|   
                    | |                                                       
                    |_|                                                       
{Style.RESET_ALL}
{Fore.MAGENTA}  AI 剧本对话生成器 - 让创作更简单{Style.RESET_ALL}
{Fore.CYAN}{'='*60}{Style.RESET_ALL}
"""
        print(banner)
