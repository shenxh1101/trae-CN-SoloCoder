#!/usr/bin/env python3
import os
import sys
import tempfile
import shutil
import time
import re
import pexpect


class PasswordManagerTester:
    def __init__(self):
        self.test_dir = tempfile.mkdtemp(prefix="pm_test_")
        self.data_file = os.path.join(self.test_dir, "test_passwords.json")
        self.master_password = "TestMasterPass123!"
        self.base_cmd = f"python password_manager.py --data-file '{self.data_file}'"
        self.cwd = "/Users/mac/code/solo coder/18"
        self.env = os.environ.copy()
        self.env["PATH"] = f"{self.cwd}/venv/bin:" + self.env["PATH"]
        self.passed = 0
        self.failed = 0

    def cleanup(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def print_header(self, test_num, test_name):
        print("\n" + "=" * 70)
        print(f"测试 {test_num}: {test_name}")
        print("=" * 70)

    def print_result(self, test_name, success, details=""):
        if success:
            print(f"✅ {test_name}: 通过")
            self.passed += 1
        else:
            print(f"❌ {test_name}: 失败 - {details}")
            self.failed += 1
        if details and success:
            print(f"   {details}")

    def run_interactive_cmd(self, cmd, expected_prompts, responses, timeout=15):
        """
        运行交互式命令，使用pexpect处理提示和响应

        Args:
            cmd: 要运行的命令
            expected_prompts: 期望的提示字符串列表（将被转义为正则）
            responses: 对应的响应列表
            timeout: 超时时间（秒）
        """
        print(f"\n$ {cmd}")
        try:
            child = pexpect.spawn(
                cmd,
                cwd=self.cwd,
                env=self.env,
                timeout=timeout,
                encoding="utf-8"
            )

            output_parts = []

            for prompt, response in zip(expected_prompts, responses):
                try:
                    escaped_prompt = re.escape(prompt)
                    child.expect(escaped_prompt)
                    before = child.before
                    if before:
                        output_parts.append(before)
                        print(before, end="")
                    print(prompt, end="")
                    print(response)
                    child.sendline(response)
                except pexpect.TIMEOUT:
                    print(f"\n[超时] 等待提示 '{prompt}' 超时")
                    print(f"当前输出: {child.before}")
                    output_parts.append(child.before)
                    child.close(force=True)
                    return None, False
                except pexpect.EOF:
                    output_parts.append(child.before)
                    break

            try:
                child.expect(pexpect.EOF, timeout=timeout)
                output_parts.append(child.before)
                print(child.before, end="")
            except pexpect.TIMEOUT:
                output_parts.append(child.before)
                child.close(force=True)

            full_output = "".join(output_parts)
            return full_output, True

        except Exception as e:
            print(f"\n[异常] {e}")
            import traceback
            traceback.print_exc()
            return None, False

    def test_1_init(self):
        """测试1: 初始化密码库"""
        self.print_header(1, "初始化密码库 (init)")

        cmd = f"{self.base_cmd} init"
        expected = [
            "请输入主密码:",
            "请再次输入主密码:"
        ]
        responses = [self.master_password, self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses)

        if success and output and "✅ 密码库初始化成功" in output:
            self.print_result("初始化密码库", True, "密码库创建成功")
            return True
        else:
            self.print_result("初始化密码库", False, output or "无输出")
            return False

    def test_2_unlock(self):
        """测试2: 解锁密码库"""
        self.print_header(2, "解锁密码库 (unlock)")

        cmd = f"{self.base_cmd} unlock"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses)

        if success and output and "✅ 密码库解锁成功" in output:
            self.print_result("解锁密码库", True, "密码库解锁成功")
            return True
        else:
            self.print_result("解锁密码库", False, output or "无输出")
            return False

    def test_3_add(self):
        """测试3: 添加密码条目"""
        self.print_header(3, "添加密码条目 (add)")

        cmd = f"{self.base_cmd} add --website github.com --username testuser --generate --gen-length 20 --notes 'Test GitHub account'"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "✅ 已添加密码条目" in output:
            self.print_result("添加条目", True, "github.com条目添加成功")
        else:
            self.print_result("添加条目", False, output or "无输出")
            return False

        time.sleep(1)

        cmd2 = f"{self.base_cmd} add --website gmail.com --username testuser@gmail.com --password 'GmailPass123!' --notes 'Email account'"
        expected2 = ["请输入主密码:"]
        responses2 = [self.master_password]

        output2, success2 = self.run_interactive_cmd(cmd2, expected2, responses2, timeout=20)

        if success2 and output2 and "✅ 已添加密码条目" in output2:
            self.print_result("添加第二个条目", True, "gmail.com条目添加成功")
            return True
        else:
            self.print_result("添加第二个条目", False, output2 or "无输出")
            return False

    def test_4_list(self):
        """测试4: 列出所有条目"""
        self.print_header(4, "列出所有条目 (list)")

        cmd = f"{self.base_cmd} list"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output:
            has_github = "github.com" in output
            has_gmail = "gmail.com" in output
            if has_github and has_gmail:
                self.print_result("列出条目", True, "成功显示所有2个条目")
                return True

        self.print_result("列出条目", False, output or "无输出")
        return False

    def test_5_search(self):
        """测试5: 搜索密码条目"""
        self.print_header(5, "搜索密码条目 (search)")

        cmd = f"{self.base_cmd} search --website github"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "github.com" in output and "找到 1 个匹配条目" in output:
            self.print_result("搜索条目", True, "成功搜索到github.com条目")
            return True
        else:
            self.print_result("搜索条目", False, output or "无输出")
            return False

    def test_6_get(self):
        """测试6: 获取并复制密码"""
        self.print_header(6, "获取并复制密码 (get)")

        cmd = f"{self.base_cmd} get --website github.com"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "✅ 已复制" in output and "github.com" in output:
            self.print_result("获取并复制密码", True, "密码已复制到剪贴板")
            return True
        else:
            self.print_result("获取并复制密码", False, output or "无输出")
            return False

    def test_7_audit(self):
        """测试7: 安全审计"""
        self.print_header(7, "安全审计 (audit)")

        cmd = f"{self.base_cmd} audit"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "安全审计报告" in output and "总条目数" in output:
            self.print_result("安全审计", True, "审计报告生成成功")
            return True
        else:
            self.print_result("安全审计", False, output or "无输出")
            return False

    def test_8_stats(self):
        """测试8: 统计信息"""
        self.print_header(8, "统计信息 (stats)")

        cmd = f"{self.base_cmd} stats"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "密码库统计信息" in output and "总条目数: 2" in output:
            self.print_result("统计信息", True, "统计信息显示成功")
            return True
        else:
            self.print_result("统计信息", False, output or "无输出")
            return False

    def test_9_generate(self):
        """测试9: 生成随机密码 - 不需要解锁"""
        self.print_header(9, "生成随机密码 (generate)")

        cmd = f"{self.base_cmd} generate --length 20"
        expected = []
        responses = []

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=15)

        if success and output and "生成的密码:" in output and "密码强度:" in output:
            self.print_result("生成密码", True, "密码生成成功并显示强度")
            return True
        else:
            self.print_result("生成密码", False, output or "无输出")
            return False

    def test_10_check(self):
        """测试10: 检测密码强度 - 不需要解锁"""
        self.print_header(10, "检测密码强度 (check)")

        cmd = f"{self.base_cmd} check --password 'weak123'"
        expected = []
        responses = []

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=15)

        if success and output and "强度评分:" in output and ("非常弱" in output or "弱" in output):
            self.print_result("检测密码强度", True, "密码强度检测成功")
            return True
        else:
            self.print_result("检测密码强度", False, output or "无输出")
            return False

    def test_11_export_import(self):
        """测试11: 导出和导入"""
        self.print_header(11, "导出和导入 (export/import)")

        export_file = os.path.join(self.test_dir, "export_test.json")
        cmd = f"{self.base_cmd} export --output '{export_file}'"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "✅ 已加密导出到" in output and os.path.exists(export_file):
            self.print_result("导出", True, f"已导出到 {export_file}")
        else:
            self.print_result("导出", False, output or "无输出")
            return False

        time.sleep(1)

        new_data_file = os.path.join(self.test_dir, "import_test.json")
        cmd2 = f"python password_manager.py --data-file '{new_data_file}' init"
        expected2 = ["请输入主密码:", "请再次输入主密码:"]
        responses2 = ["ImportPass456!", "ImportPass456!"]

        output2, success2 = self.run_interactive_cmd(cmd2, expected2, responses2, timeout=20)

        if not success2 or "✅ 密码库初始化成功" not in output2:
            self.print_result("导入", False, "初始化新密码库失败")
            return False

        time.sleep(1)

        cmd3 = f"python password_manager.py --data-file '{new_data_file}' import --input '{export_file}'"
        expected3 = ["请输入主密码:", "请输入导出时使用的密码:", "确认导入"]
        responses3 = ["ImportPass456!", self.master_password, "y"]

        output3, success3 = self.run_interactive_cmd(cmd3, expected3, responses3, timeout=20)

        if success3 and output3 and "✅ 成功导入" in output3:
            self.print_result("导入", True, "成功导入2个条目")
            return True
        else:
            self.print_result("导入", False, output3 or "无输出")
            return False

    def test_12_backup(self):
        """测试12: 备份和列出备份 - list-backups不需要解锁"""
        self.print_header(12, "备份和恢复 (backup/restore)")

        backup_dir = os.path.join(self.test_dir, "backups")
        cmd = f"{self.base_cmd} backup --backup-dir '{backup_dir}'"
        expected = ["请输入主密码:"]
        responses = [self.master_password]

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=20)

        if success and output and "✅ 备份已创建" in output:
            self.print_result("创建备份", True, "备份创建成功")
        else:
            self.print_result("创建备份", False, output or "无输出")
            return False

        time.sleep(1)

        cmd2 = f"{self.base_cmd} list-backups --backup-dir '{backup_dir}'"
        expected2 = []
        responses2 = []

        output2, success2 = self.run_interactive_cmd(cmd2, expected2, responses2, timeout=15)

        if success2 and output2 and ("找到 1 个备份" in output2 or "backup_" in output2):
            self.print_result("列出备份", True, "备份列表显示成功")
            return True
        else:
            self.print_result("列出备份", False, output2 or "无输出")
            return False

    def test_13_wrong_password_lock(self):
        """测试13: 错误密码锁定"""
        self.print_header(13, "错误密码锁定")

        lock_file = os.path.join(self.test_dir, ".lock_state")
        if os.path.exists(lock_file):
            os.remove(lock_file)

        for i in range(3):
            cmd = f"{self.base_cmd} unlock"
            expected = ["请输入主密码:"]
            responses = ["wrong_password"]

            output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=15)
            time.sleep(0.5)

        cmd = f"{self.base_cmd} unlock"
        expected = ["🔒 工具已锁定"]
        responses = []

        output, success = self.run_interactive_cmd(cmd, expected, responses, timeout=15)

        if output and ("工具已锁定" in output or "已锁定" in output):
            self.print_result("错误密码锁定", True, "连续3次错误后工具已锁定")
            return True
        else:
            self.print_result("错误密码锁定", False, output or "无输出")
            return False

    def run_all_tests(self):
        print("\n" + "=" * 70)
        print("🔐 密码管理器 - 端到端测试")
        print("=" * 70)
        print(f"测试目录: {self.test_dir}")
        print(f"数据文件: {self.data_file}")

        try:
            self.test_1_init()
            time.sleep(0.5)
            self.test_2_unlock()
            time.sleep(0.5)
            self.test_3_add()
            time.sleep(0.5)
            self.test_4_list()
            time.sleep(0.5)
            self.test_5_search()
            time.sleep(0.5)
            self.test_6_get()
            time.sleep(0.5)
            self.test_7_audit()
            time.sleep(0.5)
            self.test_8_stats()
            time.sleep(0.5)
            self.test_9_generate()
            time.sleep(0.5)
            self.test_10_check()
            time.sleep(0.5)
            self.test_11_export_import()
            time.sleep(0.5)
            self.test_12_backup()
            time.sleep(0.5)
            self.test_13_wrong_password_lock()

        except KeyboardInterrupt:
            print("\n\n测试被中断")
        finally:
            print("\n" + "=" * 70)
            print(f"测试结果: {self.passed} 通过, {self.failed} 失败")
            print("=" * 70)

            if self.failed == 0:
                print("\n🎉 所有测试通过！")
            else:
                print(f"\n⚠️  有 {self.failed} 个测试失败")

            self.cleanup()
            print(f"已清理测试目录: {self.test_dir}")

        return self.failed == 0


def main():
    tester = PasswordManagerTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
