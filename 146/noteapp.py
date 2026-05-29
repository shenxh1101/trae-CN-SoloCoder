#!/usr/bin/env python3
import json
import os
import sys
import argparse
import getpass
import threading
import time
import shutil
import base64
from datetime import datetime
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad


class AESCipher:
    PBKDF2_COUNT = 100000

    def __init__(self, password: str, salt: bytes = None):
        self.salt = salt if salt else get_random_bytes(16)
        self.key = PBKDF2(password, self.salt, dkLen=32, count=self.PBKDF2_COUNT)

    def encrypt(self, data: str) -> dict:
        cipher = AES.new(self.key, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(data.encode('utf-8'), AES.block_size))
        return {
            'salt': base64.b64encode(self.salt).decode('utf-8'),
            'iv': base64.b64encode(cipher.iv).decode('utf-8'),
            'ciphertext': base64.b64encode(ct_bytes).decode('utf-8')
        }

    @staticmethod
    def decrypt(encrypted: dict, password: str) -> str:
        salt = base64.b64decode(encrypted['salt'])
        iv = base64.b64decode(encrypted['iv'])
        ciphertext = base64.b64decode(encrypted['ciphertext'])
        key = PBKDF2(password, salt, dkLen=32, count=AESCipher.PBKDF2_COUNT)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        pt = unpad(cipher.decrypt(ciphertext), AES.block_size)
        return pt.decode('utf-8')


class NoteManager:
    def __init__(self, data_file='notes.json'):
        self.data_file = data_file
        self.password = None
        self.notes = {}
        self.last_activity = time.time()
        self.lock_timeout = 300
        self._stop_event = threading.Event()
        self._lock_timer = None
        self._start_lock_timer()

    def _start_lock_timer(self):
        if self._lock_timer and self._lock_timer.is_alive():
            self._stop_event.set()
            self._lock_timer.join(timeout=1)
        self._stop_event.clear()
        self._lock_timer = threading.Thread(target=self._auto_lock, daemon=True)
        self._lock_timer.start()

    def _auto_lock(self):
        while not self._stop_event.is_set():
            self._stop_event.wait(timeout=10)
            if self._stop_event.is_set():
                break
            if self.password and (time.time() - self.last_activity) > self.lock_timeout:
                self.password = None
                print("\n\n系统已自动锁定，请重新输入密码。")

    def _update_activity(self):
        self.last_activity = time.time()

    def _ensure_unlocked(self):
        self._update_activity()
        if not self.password:
            self.password = getpass.getpass("请输入主密码: ")
            if not self._verify_password():
                self.password = None
                raise ValueError("密码错误！")

    def _verify_password(self):
        if not os.path.exists(self.data_file):
            return True
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            AESCipher.decrypt(data['encrypted'], self.password)
            return True
        except Exception:
            return False

    def _load_notes(self):
        self._ensure_unlocked()
        if not os.path.exists(self.data_file):
            self.notes = {}
            return
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        decrypted = AESCipher.decrypt(data['encrypted'], self.password)
        self.notes = json.loads(decrypted)

    def _save_notes(self):
        self._ensure_unlocked()
        plaintext = json.dumps(self.notes, ensure_ascii=False, indent=2)
        cipher = AESCipher(self.password)
        encrypted = cipher.encrypt(plaintext)
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump({'encrypted': encrypted}, f, ensure_ascii=False, indent=2)

    def create_note(self, title: str, content: str):
        self._load_notes()
        if title in self.notes:
            raise ValueError(f"笔记 '{title}' 已存在！")
        self.notes[title] = {
            'content': content,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        self._save_notes()
        print(f"笔记 '{title}' 创建成功！")

    def list_notes(self):
        self._load_notes()
        if not self.notes:
            print("暂无笔记。")
            return
        print(f"\n共有 {len(self.notes)} 条笔记：")
        print("-" * 50)
        for i, title in enumerate(sorted(self.notes.keys()), 1):
            print(f"{i}. {title}")
        print("-" * 50)

    def view_note(self, title: str):
        self._load_notes()
        if title not in self.notes:
            raise ValueError(f"笔记 '{title}' 不存在！")
        note = self.notes[title]
        print("\n" + "=" * 60)
        print(f"标题: {title}")
        print(f"创建时间: {note['created_at']}")
        print(f"更新时间: {note['updated_at']}")
        print("-" * 60)
        print(note['content'])
        print("=" * 60 + "\n")

    def edit_note(self, title: str):
        self._load_notes()
        if title not in self.notes:
            raise ValueError(f"笔记 '{title}' 不存在！")
        note = self.notes[title]
        print(f"当前内容:\n{note['content']}")
        print("\n请输入新内容（输入 END 结束）：")
        lines = []
        while True:
            line = input()
            if line == 'END':
                break
            lines.append(line)
        new_content = '\n'.join(lines)
        self.notes[title]['content'] = new_content
        self.notes[title]['updated_at'] = datetime.now().isoformat()
        self._save_notes()
        print(f"笔记 '{title}' 更新成功！")

    def delete_note(self, title: str):
        self._load_notes()
        if title not in self.notes:
            raise ValueError(f"笔记 '{title}' 不存在！")
        confirm = input(f"确定要删除笔记 '{title}' 吗？(y/N): ")
        if confirm.lower() == 'y':
            del self.notes[title]
            self._save_notes()
            print(f"笔记 '{title}' 已删除。")
        else:
            print("取消删除。")

    def search_notes(self, keyword: str):
        self._load_notes()
        matches = []
        for title, note in self.notes.items():
            if keyword.lower() in note['content'].lower():
                matches.append(title)
        if not matches:
            print(f"未找到包含关键词 '{keyword}' 的笔记。")
            return
        print(f"\n找到 {len(matches)} 条匹配的笔记：")
        print("-" * 50)
        for title in matches:
            print(f"- {title}")
        print("-" * 50)

    def export_notes(self, export_file='notes_export.txt'):
        password = getpass.getpass("请输入主密码以验证: ")
        temp_pass = self.password
        self.password = password
        try:
            self._load_notes()
        except ValueError:
            self.password = temp_pass
            raise ValueError("密码错误，导出取消！")
        self.password = temp_pass
        
        with open(export_file, 'w', encoding='utf-8') as f:
            for title, note in self.notes.items():
                f.write(f"{'='*60}\n")
                f.write(f"标题: {title}\n")
                f.write(f"创建时间: {note['created_at']}\n")
                f.write(f"更新时间: {note['updated_at']}\n")
                f.write(f"{'-'*60}\n")
                f.write(f"{note['content']}\n")
                f.write(f"{'='*60}\n\n")
        print(f"笔记已导出到 {export_file}")

    def import_notes(self, import_file='notes_export.txt'):
        self._load_notes()
        if not os.path.exists(import_file):
            raise ValueError(f"导入文件 {import_file} 不存在！")
        
        with open(import_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        blocks = content.split('=' * 60)
        imported_count = 0
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            lines = block.split('\n')
            title = None
            content_start = 0
            for i, line in enumerate(lines):
                if line.startswith('标题: '):
                    title = line[4:].strip()
                elif line.startswith('-' * 60):
                    content_start = i + 1
                    break
            if title and content_start:
                note_content = '\n'.join(lines[content_start:]).strip()
                if title not in self.notes:
                    self.notes[title] = {
                        'content': note_content,
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    imported_count += 1
                    print(f"导入: {title}")
                else:
                    print(f"跳过 (已存在): {title}")
        
        if imported_count > 0:
            self._save_notes()
        print(f"\n成功导入 {imported_count} 条笔记。")

    def change_password(self):
        self._load_notes()
        old_password = getpass.getpass("请输入旧密码: ")
        if old_password != self.password:
            raise ValueError("旧密码错误！")
        
        new_password = getpass.getpass("请输入新密码: ")
        confirm_password = getpass.getpass("请确认新密码: ")
        
        if new_password != confirm_password:
            raise ValueError("两次输入的新密码不一致！")
        
        if len(new_password) < 4:
            raise ValueError("密码长度至少为4位！")
        
        self.password = new_password
        self._save_notes()
        print("主密码修改成功！")

    def backup_notes(self, backup_dir):
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        if not os.path.exists(self.data_file):
            print("没有笔记文件可备份。")
            return
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'notes_backup_{timestamp}.json')
        shutil.copy2(self.data_file, backup_file)
        print(f"备份成功: {backup_file}")

    def show_stats(self):
        self._load_notes()
        if not self.notes:
            print("暂无笔记统计信息。")
            return
        
        total_notes = len(self.notes)
        total_chars = sum(len(note['content']) for note in self.notes.values())
        total_words = sum(len(note['content'].split()) for note in self.notes.values())
        longest_title = max(self.notes.keys(), key=len)
        longest_content = max(self.notes.items(), key=lambda x: len(x[1]['content']))[0]
        shortest_content = min(self.notes.items(), key=lambda x: len(x[1]['content']))[0]
        
        print("\n" + "=" * 50)
        print("笔记统计信息")
        print("=" * 50)
        print(f"笔记总数: {total_notes}")
        print(f"总字符数: {total_chars}")
        print(f"总词数: {total_words}")
        print(f"最长标题: '{longest_title}' ({len(longest_title)} 字符)")
        print(f"内容最长笔记: '{longest_content}' ({len(self.notes[longest_content]['content'])} 字符)")
        print(f"内容最短笔记: '{shortest_content}' ({len(self.notes[shortest_content]['content'])} 字符)")
        print("=" * 50 + "\n")


class NoteApp:
    def __init__(self):
        self.manager = NoteManager()
        self.running = False

    def show_menu(self):
        print("\n" + "=" * 50)
        print("加密笔记工具")
        print("=" * 50)
        print("1. 创建笔记")
        print("2. 列出所有笔记")
        print("3. 查看笔记")
        print("4. 编辑笔记")
        print("5. 删除笔记")
        print("6. 搜索笔记")
        print("7. 导出笔记")
        print("8. 导入笔记")
        print("9. 修改主密码")
        print("10. 备份笔记")
        print("11. 显示统计信息")
        print("0. 退出")
        print("=" * 50)

    def create_note_interactive(self):
        title = input("请输入笔记标题: ").strip()
        if not title:
            print("标题不能为空！")
            return
        print("请输入笔记内容（输入 END 结束）：")
        lines = []
        while True:
            line = input()
            if line == 'END':
                break
            lines.append(line)
        content = '\n'.join(lines)
        self.manager.create_note(title, content)

    def view_note_interactive(self):
        title = input("请输入要查看的笔记标题: ").strip()
        if title:
            self.manager.view_note(title)

    def edit_note_interactive(self):
        title = input("请输入要编辑的笔记标题: ").strip()
        if title:
            self.manager.edit_note(title)

    def delete_note_interactive(self):
        title = input("请输入要删除的笔记标题: ").strip()
        if title:
            self.manager.delete_note(title)

    def search_notes_interactive(self):
        keyword = input("请输入搜索关键词: ").strip()
        if keyword:
            self.manager.search_notes(keyword)

    def export_notes_interactive(self):
        filename = input("请输入导出文件名 (默认 notes_export.txt): ").strip()
        if not filename:
            filename = 'notes_export.txt'
        self.manager.export_notes(filename)

    def import_notes_interactive(self):
        filename = input("请输入导入文件名 (默认 notes_export.txt): ").strip()
        if not filename:
            filename = 'notes_export.txt'
        self.manager.import_notes(filename)

    def backup_notes_interactive(self):
        backup_dir = input("请输入备份目录 (默认 backup): ").strip()
        if not backup_dir:
            backup_dir = 'backup'
        self.manager.backup_notes(backup_dir)

    def run_interactive(self):
        self.running = True
        print("欢迎使用加密笔记工具！")
        
        if not os.path.exists(self.manager.data_file):
            print("首次使用，请设置主密码。")
            while True:
                password1 = getpass.getpass("请设置主密码: ")
                password2 = getpass.getpass("请确认主密码: ")
                if password1 == password2 and len(password1) >= 4:
                    self.manager.password = password1
                    self.manager._save_notes()
                    print("主密码设置成功！")
                    break
                else:
                    print("密码太短或两次输入不一致，请重试。")
        
        while self.running:
            try:
                self.show_menu()
                choice = input("请选择操作 (0-11): ").strip()
                
                if choice == '1':
                    self.create_note_interactive()
                elif choice == '2':
                    self.manager.list_notes()
                elif choice == '3':
                    self.view_note_interactive()
                elif choice == '4':
                    self.edit_note_interactive()
                elif choice == '5':
                    self.delete_note_interactive()
                elif choice == '6':
                    self.search_notes_interactive()
                elif choice == '7':
                    self.export_notes_interactive()
                elif choice == '8':
                    self.import_notes_interactive()
                elif choice == '9':
                    self.manager.change_password()
                elif choice == '10':
                    self.backup_notes_interactive()
                elif choice == '11':
                    self.manager.show_stats()
                elif choice == '0':
                    self.running = False
                    print("再见！")
                else:
                    print("无效的选择，请重试。")
            except Exception as e:
                print(f"错误: {e}")


def main():
    parser = argparse.ArgumentParser(description='加密笔记工具')
    parser.add_argument('--add', nargs=2, metavar=('TITLE', 'CONTENT'),
                        help='快速添加笔记: --add "标题" "内容"')
    parser.add_argument('--list', action='store_true',
                        help='列出所有笔记')
    parser.add_argument('--view', metavar='TITLE',
                        help='查看指定笔记')
    parser.add_argument('--search', metavar='KEYWORD',
                        help='搜索笔记内容')
    
    args = parser.parse_args()
    
    app = NoteApp()
    
    if args.add:
        title, content = args.add
        try:
            app.manager.create_note(title, content)
        except Exception as e:
            print(f"错误: {e}")
            sys.exit(1)
    elif args.list:
        app.manager.list_notes()
    elif args.view:
        try:
            app.manager.view_note(args.view)
        except Exception as e:
            print(f"错误: {e}")
            sys.exit(1)
    elif args.search:
        app.manager.search_notes(args.search)
    else:
        app.run_interactive()


if __name__ == '__main__':
    main()
