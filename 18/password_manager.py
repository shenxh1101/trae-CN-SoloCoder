#!/usr/bin/env python3
import os
import sys
import argparse
import getpass
import json
from datetime import datetime
from typing import Optional

from crypto import CryptoManager
from storage import StorageManager
from models import PasswordEntry
from password_generator import PasswordGenerator
from password_strength import PasswordStrengthChecker
from importer_exporter import ImportExportManager
from security_audit import SecurityAuditor
from lock_manager import LockManager
from backup_manager import BackupManager
from clipboard_manager import ClipboardManager
from emergency_contact import EmergencyContactManager
from stats_manager import StatsManager


class PasswordManagerCLI:
    def __init__(self, data_file: str = "passwords.json"):
        self.data_file = data_file
        self.crypto = CryptoManager()
        self.storage = StorageManager(data_file)
        self.generator = PasswordGenerator()
        self.strength_checker = PasswordStrengthChecker()
        self.importer_exporter = ImportExportManager(self.crypto)
        self.auditor = SecurityAuditor()
        data_dir = os.path.dirname(os.path.abspath(data_file))
        lock_file = os.path.join(data_dir, ".lock_state")
        self.lock_manager = LockManager(lock_file=lock_file)
        self.backup_manager = BackupManager(self.crypto)
        self.clipboard = ClipboardManager()
        self.emergency_manager = EmergencyContactManager(self.crypto)
        self.stats_manager = StatsManager()
        self.master_password: Optional[str] = None
        self.is_unlocked = False

    def _check_lock(self) -> bool:
        if self.lock_manager.is_locked():
            remaining = self.lock_manager.get_remaining_lock_time()
            minutes = remaining // 60
            seconds = remaining % 60
            print(f"🔒 工具已锁定，请等待 {minutes}分{seconds}秒 后再试")
            return True
        return False

    def _prompt_master_password(self, confirm: bool = False) -> Optional[str]:
        try:
            while True:
                password = getpass.getpass("请输入主密码: ")
                if not password:
                    print("主密码不能为空")
                    continue

                if confirm:
                    password2 = getpass.getpass("请再次输入主密码: ")
                    if password != password2:
                        print("两次输入的密码不一致")
                        continue
                return password
        except (KeyboardInterrupt, EOFError):
            print("\n操作已取消")
            return None

    def initialize(self):
        if os.path.exists(self.data_file):
            print("密码库已存在，使用 unlock 命令解锁")
            return False

        print("=== 初始化密码库 ===")
        password = self._prompt_master_password(confirm=True)
        if not password:
            return False

        if self.storage.initialize_vault(password):
            print("✅ 密码库初始化成功！请牢记您的主密码")
            print("⚠️  警告：如果忘记主密码，所有数据将无法恢复！")
            return True
        return False

    def unlock(self, password: Optional[str] = None) -> bool:
        if self._check_lock():
            return False

        if not os.path.exists(self.data_file):
            print("密码库不存在，请先使用 init 命令初始化")
            return False

        if password is None:
            attempts = self.lock_manager.get_attempts_remaining()
            print(f"剩余尝试次数: {attempts}")
            password = self._prompt_master_password()
            if not password:
                return False

        if self.storage.unlock_vault(password):
            self.master_password = password
            self.is_unlocked = True
            self.lock_manager.record_successful_attempt()
            print("✅ 密码库解锁成功")

            self._check_expired_passwords()

            if self.storage.get_setting("backup_enabled"):
                backup_dir = self.storage.get_setting("backup_directory")
                if backup_dir:
                    self.backup_manager.backup_dir = backup_dir
                self.backup_manager.auto_backup(self.data_file, password)

            return True
        else:
            locked = self.lock_manager.record_failed_attempt()
            remaining = self.lock_manager.get_attempts_remaining()
            if locked:
                lock_minutes = self.lock_manager.lock_duration_minutes
                print(f"❌ 密码错误次数过多，工具已锁定 {lock_minutes} 分钟")
            else:
                print(f"❌ 密码错误，剩余尝试次数: {remaining}")
            return False

    def _check_expired_passwords(self):
        expiring = self.auditor.find_expiring_soon(self.storage.entries)
        expired = self.auditor.find_expired_passwords(self.storage.entries)

        if expired:
            print(f"\n⚠️  发现 {len(expired)} 个已过期的密码！")
            for entry, days in expired[:3]:
                print(f"   - {entry.website} ({entry.username}) 已过期 {abs(days)} 天")

        if expiring:
            print(f"\n⚠️  发现 {len(expiring)} 个即将过期的密码")
            for entry, days in expiring[:3]:
                print(f"   - {entry.website} ({entry.username}) 还有 {days} 天过期")

        if expired or expiring:
            print()

    def lock(self):
        self.master_password = None
        self.is_unlocked = False
        self.clipboard.cancel_auto_clear()
        print("🔒 密码库已锁定")

    def _require_unlocked(self) -> bool:
        if not self.is_unlocked or not self.master_password:
            print("请先使用 unlock 命令解锁密码库")
            return False
        return True

    def add_entry(
        self,
        website: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        notes: str = "",
        custom_fields: Optional[dict] = None,
        expiration_days: Optional[int] = None,
        generate: bool = False,
        gen_length: int = 16,
        gen_lower: bool = True,
        gen_upper: bool = True,
        gen_digits: bool = True,
        gen_symbols: bool = True,
    ):
        if not self._require_unlocked():
            return

        try:
            if website is None:
                website = input("网站名称: ").strip()
            if not website:
                print("网站名称不能为空")
                return

            if username is None:
                username = input("用户名/邮箱: ").strip()
            if not username:
                print("用户名不能为空")
                return

            if generate:
                password = self.generator.generate(
                    length=gen_length,
                    use_lowercase=gen_lower,
                    use_uppercase=gen_upper,
                    use_digits=gen_digits,
                    use_symbols=gen_symbols,
                )
                print(f"生成的密码: {password}")
            elif password is None:
                while True:
                    password = getpass.getpass("密码 (留空自动生成): ")
                    if not password:
                        password = self.generator.generate_strong()
                        print(f"生成的密码: {password}")
                        break
                    confirm = getpass.getpass("确认密码: ")
                    if password == confirm:
                        break
                    print("两次输入的密码不一致")

            if notes is None and password is not None:
                notes = input("备注 (可选): ").strip()

            strength_result = self.strength_checker.check(password)
            print(f"密码强度: {strength_result['level']} ({strength_result['score']}/10)")
            for feedback in strength_result["feedback"]:
                print(f"  - {feedback}")

            entry = PasswordEntry(
                website=website,
                username=username,
                password=password,
                notes=notes,
                custom_fields=custom_fields or {},
                strength_score=strength_result["score"],
                strength_feedback=strength_result["feedback"],
            )

            if expiration_days:
                entry.set_expiration_days(expiration_days)
                print(f"密码将在 {expiration_days} 天后过期")

            self.storage.add_entry(entry, self.master_password)
            print(f"✅ 已添加密码条目: {website} ({username})")

        except KeyboardInterrupt:
            print("\n操作已取消")

    def search_entries(self, keyword: str, by_website: bool = False, by_username: bool = False):
        if not self._require_unlocked():
            return

        if by_website:
            results = self.storage.search_by_website(keyword)
        elif by_username:
            results = self.storage.search_by_username(keyword)
        else:
            results = self.storage.search_entries(keyword)

        if not results:
            print(f"未找到匹配 '{keyword}' 的条目")
            return

        print(f"\n找到 {len(results)} 个匹配条目:\n")
        self._display_entries(results, show_password=False)

        try:
            choice = input("\n输入序号查看详情，或按回车返回: ")
            if choice.strip():
                idx = int(choice) - 1
                if 0 <= idx < len(results):
                    self._display_entry_detail(results[idx])
        except (ValueError, KeyboardInterrupt):
            pass

    def _display_entries(self, entries, show_password: bool = False):
        for i, entry in enumerate(entries, 1):
            status = ""
            if entry.is_expired():
                status = " [已过期]"
            elif entry.days_until_expiration() is not None and entry.days_until_expiration() <= 7:
                status = f" [还有{entry.days_until_expiration()}天过期]"

            strength = f" [强度:{entry.strength_score}/10]" if entry.strength_score else ""

            password_display = entry.password if show_password else "*" * 8
            print(f"{i:2d}. {entry.website} - {entry.username}{status}{strength}")
            if show_password:
                print(f"    密码: {password_display}")

    def _display_entry_detail(self, entry: PasswordEntry):
        print(f"\n{'='*60}")
        print(f"网站: {entry.website}")
        print(f"用户名: {entry.username}")
        print(f"密码: {entry.password}")
        print(f"创建时间: {entry.created_at}")
        print(f"更新时间: {entry.updated_at}")

        if entry.strength_score is not None:
            print(f"密码强度: {entry.strength_score}/10")
            for feedback in entry.strength_feedback:
                print(f"  - {feedback}")

        if entry.expiration_date:
            if entry.is_expired():
                print(f"过期状态: ⚠️  已过期 {abs(entry.days_until_expiration())} 天")
            else:
                print(f"过期时间: {entry.expiration_date}")
                print(f"剩余天数: {entry.days_until_expiration()} 天")

        if entry.notes:
            print(f"备注: {entry.notes}")

        if entry.custom_fields:
            print("自定义字段:")
            for key, value in entry.custom_fields.items():
                print(f"  {key}: {value}")

        print(f"{'='*60}\n")

        try:
            action = input("操作: [C]复制密码  [E]编辑  [D]删除  [回车]返回: ").strip().lower()
            if action == "c":
                if self.clipboard.copy(entry.password):
                    print("✅ 密码已复制到剪贴板，将在60秒后自动清空")
            elif action == "e":
                self._edit_entry(entry)
            elif action == "d":
                self._delete_entry(entry)
        except KeyboardInterrupt:
            pass

    def _edit_entry(self, entry: PasswordEntry):
        print(f"\n编辑条目: {entry.website}")
        print("(留空保持原值)")

        new_website = input(f"网站 [{entry.website}]: ").strip() or entry.website
        new_username = input(f"用户名 [{entry.username}]: ").strip() or entry.username
        new_password = getpass.getpass("密码 [******] (输入 'g' 生成新密码): ").strip()

        if new_password == "g":
            new_password = self.generator.generate_strong()
            print(f"生成的新密码: {new_password}")
        elif not new_password:
            new_password = entry.password

        new_notes = input(f"备注 [{entry.notes or '无'}]: ").strip() or entry.notes

        if new_password != entry.password:
            strength_result = self.strength_checker.check(new_password)
            entry.strength_score = strength_result["score"]
            entry.strength_feedback = strength_result["feedback"]
            print(f"新密码强度: {strength_result['level']} ({strength_result['score']}/10)")

        entry.website = new_website
        entry.username = new_username
        entry.password = new_password
        entry.notes = new_notes
        entry.updated_at = datetime.now().isoformat()

        exp_days = input("设置过期天数 (留空不修改): ").strip()
        if exp_days:
            try:
                days = int(exp_days)
                if days > 0:
                    entry.set_expiration_days(days)
                    print(f"密码将在 {days} 天后过期")
            except ValueError:
                print("无效的天数")

        self.storage.update_entry(entry, self.master_password)
        print("✅ 条目已更新")

    def _delete_entry(self, entry: PasswordEntry):
        confirm = input(f"确认删除 '{entry.website}'? (y/N): ").strip().lower()
        if confirm == "y":
            if self.storage.delete_entry(entry.id, self.master_password):
                print("✅ 条目已删除")
            else:
                print("❌ 删除失败")

    def list_entries(self):
        if not self._require_unlocked():
            return

        entries = self.storage.get_all_entries()
        if not entries:
            print("密码库为空，使用 add 命令添加条目")
            return

        print(f"\n共 {len(entries)} 个条目:\n")
        self._display_entries(entries)

        try:
            choice = input("\n输入序号查看详情，或按回车返回: ")
            if choice.strip():
                idx = int(choice) - 1
                if 0 <= idx < len(entries):
                    self._display_entry_detail(entries[idx])
        except (ValueError, KeyboardInterrupt):
            pass

    def generate_password(
        self,
        length: int = 16,
        lowercase: bool = True,
        uppercase: bool = True,
        digits: bool = True,
        symbols: bool = True,
        memorable: bool = False,
        copy: bool = False,
    ):
        try:
            if memorable:
                password = self.generator.generate_memorable()
            else:
                password = self.generator.generate(
                    length=length,
                    use_lowercase=lowercase,
                    use_uppercase=uppercase,
                    use_digits=digits,
                    use_symbols=symbols,
                )

            result = self.strength_checker.check(password)

            print(f"\n生成的密码: {password}")
            print(f"密码强度: {result['level']} ({result['score']}/10)")
            for feedback in result["feedback"]:
                print(f"  - {feedback}")
            print()

            if copy:
                if self.clipboard.copy(password):
                    print("✅ 密码已复制到剪贴板")

            return password
        except ValueError as e:
            print(f"❌ {e}")
            return None

    def check_strength(self, password: Optional[str] = None):
        if password is None:
            password = getpass.getpass("请输入要检测的密码: ")

        if not password:
            print("密码不能为空")
            return

        result = self.strength_checker.check(password)
        suggestions = self.strength_checker.generate_suggestions(result)

        print(f"\n{'='*50}")
        print(f"密码: {'*' * len(password)}")
        print(f"长度: {len(password)} 位")
        print(f"强度评分: {result['score']}/10")
        print(f"强度等级: {result['level']}")
        print(f"{'='*50}")
        print("\n检测结果:")
        for feedback in result["feedback"]:
            print(f"  - {feedback}")
        print("\n改进建议:")
        for suggestion in suggestions:
            print(f"  - {suggestion}")
        print()

    def export_data(self, output_file: str, encrypted: bool = True):
        if not self._require_unlocked():
            return

        entries = self.storage.get_all_entries()
        if encrypted:
            success = self.importer_exporter.export_to_encrypted_csv(
                entries, self.master_password, output_file
            )
            if success:
                print(f"✅ 已加密导出到: {output_file}")
        else:
            confirm = input("⚠️  明文导出会暴露所有密码，确认继续? (y/N): ").strip().lower()
            if confirm != "y":
                print("已取消")
                return
            success = self.importer_exporter.export_to_plain_csv(entries, output_file)
            if success:
                print(f"✅ 已明文导出到: {output_file}")

    def import_data(self, input_file: str, encrypted: bool = True):
        if not self._require_unlocked():
            return

        if encrypted:
            import_password = getpass.getpass("请输入导出时使用的密码: ")
            entries = self.importer_exporter.import_from_encrypted_csv(
                input_file, import_password
            )
        else:
            entries = self.importer_exporter.import_from_plain_csv(input_file)

        if not entries:
            print("没有可导入的条目")
            return

        print(f"找到 {len(entries)} 个条目可导入")
        for entry in entries:
            strength_result = self.strength_checker.check(entry.password)
            entry.strength_score = strength_result["score"]
            entry.strength_feedback = strength_result["feedback"]

        confirm = input(f"确认导入 {len(entries)} 个条目? (y/N): ").strip().lower()
        if confirm != "y":
            print("已取消")
            return

        count = 0
        for entry in entries:
            self.storage.add_entry(entry, self.master_password)
            count += 1

        print(f"✅ 成功导入 {count} 个条目")

    def audit(self):
        if not self._require_unlocked():
            return

        entries = self.storage.get_all_entries()
        self.auditor.print_audit_report(entries)

    def stats(self):
        if not self._require_unlocked():
            return

        entries = self.storage.get_all_entries()
        self.stats_manager.print_stats(entries)

    def copy_password(self, entry_id: Optional[str] = None, website: Optional[str] = None):
        if not self._require_unlocked():
            return

        entry = None
        if entry_id:
            entry = self.storage.get_entry(entry_id)
        elif website:
            results = self.storage.search_by_website(website)
            if len(results) == 1:
                entry = results[0]
            elif len(results) > 1:
                print(f"找到 {len(results)} 个匹配条目，请指定更精确的网站名或使用ID")
                self._display_entries(results)
                return

        if not entry:
            print("未找到指定的密码条目")
            return

        if self.clipboard.copy(entry.password):
            print(f"✅ 已复制 {entry.website} ({entry.username}) 的密码到剪贴板")

    def backup(self, backup_dir: Optional[str] = None):
        if not self._require_unlocked():
            return

        if backup_dir:
            self.backup_manager.backup_dir = backup_dir

        backup_path = self.backup_manager.create_backup(
            self.data_file, self.master_password
        )
        if backup_path:
            print(f"✅ 备份已创建: {backup_path}")

    def restore_backup(self, backup_file: str, overwrite: bool = False):
        if not os.path.exists(backup_file):
            print(f"备份文件不存在: {backup_file}")
            return

        password = getpass.getpass("请输入主密码: ")
        if not password:
            return

        success = self.backup_manager.restore_backup(
            backup_file, password, self.data_file, overwrite
        )
        if success:
            print("✅ 备份恢复成功，请重新解锁密码库")
            self.is_unlocked = False
            self.master_password = None

    def list_backups(self, backup_dir: Optional[str] = None):
        if backup_dir:
            self.backup_manager.backup_dir = backup_dir
        backups = self.backup_manager.list_backups()
        if not backups:
            print("没有找到备份文件")
            return

        print(f"\n找到 {len(backups)} 个备份:\n")
        for i, backup in enumerate(backups, 1):
            size_kb = backup["size"] / 1024
            print(f"{i:2d}. {backup['filename']}")
            print(f"    时间: {backup['backup_time']}")
            print(f"    大小: {size_kb:.1f} KB")
            print(f"    路径: {backup['path']}")
        print()

    def setup_emergency_contact(self):
        if not self._require_unlocked():
            return

        print("\n=== 设置紧急联系人 ===")
        print("紧急联系人功能允许您指定一个受信任的人，")
        print("在您忘记主密码时可以通过其私钥恢复访问。\n")

        contact_name = input("紧急联系人姓名: ").strip()
        if not contact_name:
            print("姓名不能为空")
            return

        print("\n选择公钥来源:")
        print("1. 自动生成新的密钥对")
        print("2. 输入已有的公钥")
        choice = input("请选择 (1/2): ").strip()

        public_key = None
        private_key = None

        if choice == "1":
            print("\n正在生成密钥对...")
            private_key, public_key = self.emergency_manager.generate_emergency_keypair()
            print("✅ 密钥对生成成功！")
            print("\n⚠️  重要提示：")
            print("请将以下私钥安全地交给紧急联系人保管，")
            print("不要存储在同一设备上！\n")
            print("=" * 60)
            print(private_key)
            print("=" * 60)
            print(f"\n公钥:\n{public_key}\n")

            save_key = input("是否将私钥保存到文件? (y/N): ").strip().lower()
            if save_key == "y":
                filename = f"emergency_private_key_{contact_name.replace(' ', '_')}.pem"
                if self.emergency_manager.save_key_to_file(private_key, filename):
                    print(f"✅ 私钥已保存到: {filename}")
                    print("⚠️  请将此文件移动到安全位置！")

        elif choice == "2":
            public_key = input("请输入公钥 (PEM格式): ").strip()
            if not self.emergency_manager.verify_public_key(public_key):
                print("❌ 无效的公钥格式")
                return
        else:
            print("已取消")
            return

        emergency_file = self.emergency_manager.setup_emergency_access(
            self.master_password, contact_name, public_key, self.data_file
        )

        if emergency_file:
            self.storage.set_emergency_contact(
                contact_name, public_key, self.master_password
            )
            print(f"✅ 紧急联系人设置成功！")
            print(f"紧急恢复文件: {emergency_file}")

    def emergency_recover(self, emergency_file: str, private_key_file: Optional[str] = None):
        if not os.path.exists(emergency_file):
            print(f"紧急文件不存在: {emergency_file}")
            return

        private_key = None
        if private_key_file and os.path.exists(private_key_file):
            private_key = self.emergency_manager.load_key_from_file(private_key_file)
        else:
            private_key = input("请输入私钥 (PEM格式): ").strip()

        if not private_key:
            print("私钥不能为空")
            return

        if not self.emergency_manager.verify_private_key(private_key):
            print("❌ 无效的私钥格式")
            return

        master_password = self.emergency_manager.recover_with_emergency_key(
            emergency_file, private_key
        )

        if master_password:
            print("\n" + "=" * 60)
            print("✅ 紧急恢复成功！")
            print(f"您的主密码是: {master_password}")
            print("=" * 60)
            print("\n⚠️  建议登录后立即修改主密码")
        else:
            print("❌ 恢复失败，请检查私钥是否正确")

    def change_master_password(self):
        if not self._require_unlocked():
            return

        old_password = getpass.getpass("当前主密码: ")
        if old_password != self.master_password:
            print("❌ 当前密码错误")
            return

        new_password = getpass.getpass("新主密码: ")
        confirm_password = getpass.getpass("确认新主密码: ")

        if new_password != confirm_password:
            print("❌ 两次输入的密码不一致")
            return

        if len(new_password) < 8:
            print("❌ 主密码长度至少为8位")
            return

        if self.storage.change_master_password(old_password, new_password):
            self.master_password = new_password
            print("✅ 主密码修改成功！请牢记新密码")
        else:
            print("❌ 修改失败")

    def interactive_mode(self):
        print("\n" + "=" * 60)
        print("🔐 密码管理器 - 交互模式")
        print("=" * 60)

        if not os.path.exists(self.data_file):
            print("检测到新环境，开始初始化...")
            if not self.initialize():
                return
        elif not self.is_unlocked:
            if not self.unlock():
                return

        while True:
            try:
                print("\n可用命令:")
                print("  add     - 添加密码条目")
                print("  list    - 列出所有条目")
                print("  search  - 搜索条目")
                print("  get     - 查看/复制指定条目")
                print("  gen     - 生成随机密码")
                print("  check   - 检测密码强度")
                print("  import  - 导入密码")
                print("  export  - 导出密码")
                print("  audit   - 安全审计")
                print("  stats   - 统计信息")
                print("  backup  - 创建备份")
                print("  restore - 恢复备份")
                print("  emergency - 紧急联系人设置")
                print("  change  - 修改主密码")
                print("  lock    - 锁定密码库")
                print("  quit    - 退出")

                cmd = input("\n请输入命令: ").strip().lower()

                if cmd in ["quit", "q", "exit"]:
                    print("再见！")
                    break
                elif cmd == "add":
                    self.add_entry()
                elif cmd == "list":
                    self.list_entries()
                elif cmd == "search":
                    keyword = input("搜索关键词: ").strip()
                    if keyword:
                        self.search_entries(keyword)
                elif cmd == "get":
                    website = input("网站名称: ").strip()
                    if website:
                        self.copy_password(website=website)
                elif cmd == "gen":
                    try:
                        length = input("密码长度 (默认16): ").strip()
                        length = int(length) if length else 16
                        self.generate_password(length=length, copy=True)
                    except ValueError:
                        print("无效的长度")
                elif cmd == "check":
                    self.check_strength()
                elif cmd == "import":
                    file = input("导入文件路径: ").strip()
                    if file:
                        enc = input("是否加密导入? (Y/n): ").strip().lower() != "n"
                        self.import_data(file, encrypted=enc)
                elif cmd == "export":
                    file = input("导出文件路径: ").strip()
                    if file:
                        enc = input("是否加密导出? (Y/n): ").strip().lower() != "n"
                        self.export_data(file, encrypted=enc)
                elif cmd == "audit":
                    self.audit()
                elif cmd == "stats":
                    self.stats()
                elif cmd == "backup":
                    self.backup()
                elif cmd == "restore":
                    self.list_backups()
                    idx = input("选择要恢复的备份序号: ").strip()
                    try:
                        backups = self.backup_manager.list_backups()
                        i = int(idx) - 1
                        if 0 <= i < len(backups):
                            self.restore_backup(backups[i]["path"], overwrite=True)
                    except (ValueError, IndexError):
                        print("无效的选择")
                elif cmd == "emergency":
                    print("\n1. 设置紧急联系人")
                    print("2. 紧急恢复密码")
                    choice = input("请选择: ").strip()
                    if choice == "1":
                        self.setup_emergency_contact()
                    elif choice == "2":
                        em_file = input("紧急恢复文件路径: ").strip()
                        key_file = input("私钥文件路径 (可选): ").strip()
                        if em_file:
                            self.emergency_recover(em_file, key_file or None)
                elif cmd == "change":
                    self.change_master_password()
                elif cmd == "lock":
                    self.lock()
                    if not self.unlock():
                        break
                else:
                    print(f"未知命令: {cmd}")

            except KeyboardInterrupt:
                print("\n按 Ctrl-D 或输入 quit 退出")
            except EOFError:
                print("\n再见！")
                break

    def run(self):
        parser = argparse.ArgumentParser(
            description="🔐 安全密码管理器",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  交互模式: %(prog)s
  非交互添加: %(prog)s add --website github.com --username user --password 'pass123'
  搜索: %(prog)s search --website github
  生成密码: %(prog)s generate --length 20 --copy
  安全审计: %(prog)s audit
            """
        )

        parser.add_argument("--data-file", default="passwords.json", help="密码数据文件路径")

        subparsers = parser.add_subparsers(dest="command", help="可用命令")

        subparsers.add_parser("init", help="初始化新密码库")
        subparsers.add_parser("interactive", help="进入交互模式")

        unlock_parser = subparsers.add_parser("unlock", help="解锁密码库")
        unlock_parser.add_argument("--password", help="主密码 (不安全，建议使用交互输入)")

        add_parser = subparsers.add_parser("add", help="添加密码条目")
        add_parser.add_argument("--website", required=True, help="网站名称")
        add_parser.add_argument("--username", required=True, help="用户名")
        add_parser.add_argument("--password", help="密码 (不指定则自动生成)")
        add_parser.add_argument("--notes", default="", help="备注")
        add_parser.add_argument("--generate", action="store_true", help="自动生成密码")
        add_parser.add_argument("--gen-length", type=int, default=16, help="生成密码长度")
        add_parser.add_argument("--expiration", type=int, help="过期天数")

        search_parser = subparsers.add_parser("search", help="搜索密码条目")
        search_parser.add_argument("--keyword", help="搜索关键词")
        search_parser.add_argument("--website", help="按网站搜索")
        search_parser.add_argument("--username", help="按用户名搜索")

        list_parser = subparsers.add_parser("list", help="列出所有条目")

        get_parser = subparsers.add_parser("get", help="获取并复制密码")
        get_parser.add_argument("--website", help="网站名称")
        get_parser.add_argument("--id", help="条目ID")

        gen_parser = subparsers.add_parser("generate", help="生成随机密码")
        gen_parser.add_argument("--length", type=int, default=16, help="密码长度")
        gen_parser.add_argument("--no-lower", action="store_true", help="不使用小写字母")
        gen_parser.add_argument("--no-upper", action="store_true", help="不使用大写字母")
        gen_parser.add_argument("--no-digits", action="store_true", help="不使用数字")
        gen_parser.add_argument("--no-symbols", action="store_true", help="不使用特殊符号")
        gen_parser.add_argument("--memorable", action="store_true", help="生成易记密码")
        gen_parser.add_argument("--copy", action="store_true", help="复制到剪贴板")

        check_parser = subparsers.add_parser("check", help="检测密码强度")
        check_parser.add_argument("--password", help="要检测的密码")

        export_parser = subparsers.add_parser("export", help="导出密码数据")
        export_parser.add_argument("--output", required=True, help="输出文件路径")
        export_parser.add_argument("--plain", action="store_true", help="明文导出 (不安全)")

        import_parser = subparsers.add_parser("import", help="导入密码数据")
        import_parser.add_argument("--input", required=True, help="输入文件路径")
        import_parser.add_argument("--plain", action="store_true", help="明文导入")

        subparsers.add_parser("audit", help="安全审计")
        subparsers.add_parser("stats", help="显示统计信息")

        backup_parser = subparsers.add_parser("backup", help="创建备份")
        backup_parser.add_argument("--backup-dir", help="备份目录")

        restore_parser = subparsers.add_parser("restore", help="恢复备份")
        restore_parser.add_argument("--file", required=True, help="备份文件路径")
        restore_parser.add_argument("--overwrite", action="store_true", help="覆盖现有文件")

        list_backups_parser = subparsers.add_parser("list-backups", help="列出所有备份")
        list_backups_parser.add_argument("--backup-dir", help="备份目录")

        emergency_parser = subparsers.add_parser("emergency", help="紧急联系人功能")
        emergency_parser.add_argument("--setup", action="store_true", help="设置紧急联系人")
        emergency_parser.add_argument("--recover", action="store_true", help="紧急恢复")
        emergency_parser.add_argument("--file", help="紧急恢复文件")
        emergency_parser.add_argument("--key-file", help="私钥文件")

        subparsers.add_parser("change-password", help="修改主密码")
        subparsers.add_parser("lock", help="锁定密码库")

        args = parser.parse_args()

        if args.data_file:
            self.data_file = args.data_file
            self.storage = StorageManager(args.data_file)

        if args.command is None:
            self.interactive_mode()
            return

        if args.command == "init":
            self.initialize()
            return

        if args.command == "interactive":
            if not self.is_unlocked and os.path.exists(self.data_file):
                if not self.unlock():
                    return
            self.interactive_mode()
            return

        if args.command == "unlock":
            password = args.password if args.password else None
            if self.unlock(password):
                if not password:
                    print("密码库已解锁，使用其他命令操作")
            return

        commands_no_unlock = ["generate", "check", "list-backups", "restore", "emergency"]
        if args.command not in commands_no_unlock:
            if not self.is_unlocked:
                password = None
                if hasattr(args, "password") and args.password and args.command == "add":
                    pass
                if not self.unlock():
                    return

        try:
            if args.command == "add":
                self.add_entry(
                    website=args.website,
                    username=args.username,
                    password=args.password,
                    notes=args.notes,
                    generate=args.generate,
                    gen_length=args.gen_length,
                    expiration_days=args.expiration,
                )
            elif args.command == "search":
                if args.website:
                    self.search_entries(args.website, by_website=True)
                elif args.username:
                    self.search_entries(args.username, by_username=True)
                elif args.keyword:
                    self.search_entries(args.keyword)
                else:
                    print("请指定 --website, --username 或 --keyword")
            elif args.command == "list":
                self.list_entries()
            elif args.command == "get":
                self.copy_password(entry_id=args.id, website=args.website)
            elif args.command == "generate":
                self.generate_password(
                    length=args.length,
                    lowercase=not args.no_lower,
                    uppercase=not args.no_upper,
                    digits=not args.no_digits,
                    symbols=not args.no_symbols,
                    memorable=args.memorable,
                    copy=args.copy,
                )
            elif args.command == "check":
                self.check_strength(args.password)
            elif args.command == "export":
                self.export_data(args.output, encrypted=not args.plain)
            elif args.command == "import":
                self.import_data(args.input, encrypted=not args.plain)
            elif args.command == "audit":
                self.audit()
            elif args.command == "stats":
                self.stats()
            elif args.command == "backup":
                self.backup(args.backup_dir)
            elif args.command == "restore":
                self.restore_backup(args.file, args.overwrite)
            elif args.command == "list-backups":
                self.list_backups(getattr(args, "backup_dir", None))
            elif args.command == "emergency":
                if args.setup:
                    self.setup_emergency_contact()
                elif args.recover:
                    if not args.file:
                        print("请指定 --file 参数")
                        return
                    self.emergency_recover(args.file, args.key_file)
                else:
                    print("请指定 --setup 或 --recover")
            elif args.command == "change-password":
                self.change_master_password()
            elif args.command == "lock":
                self.lock()
        except KeyboardInterrupt:
            print("\n操作已取消")


def main():
    try:
        cli = PasswordManagerCLI()
        cli.run()
    except KeyboardInterrupt:
        print("\n\n再见！")
        sys.exit(0)


if __name__ == "__main__":
    main()
