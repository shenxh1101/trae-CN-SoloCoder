import os
import sys
import subprocess
import platform


class GlobalShortcutManager:
    def __init__(self):
        self.system = platform.system()
        self.app_dir = os.path.expanduser("~/.taskmanager")
        self.shortcut_script = os.path.join(self.app_dir, "show_today.py")
        self._ensure_app_dir()

    def _ensure_app_dir(self):
        os.makedirs(self.app_dir, exist_ok=True)

    def _create_show_today_script(self) -> str:
        script_content = '''#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from taskmanager import TaskManager, UIRenderer, Storage

storage = Storage()
config = storage.get_config()
theme_name = config.get("theme", "dark")

ui = UIRenderer(theme_name)
tm = TaskManager(storage)
report = tm.get_today_report()

print("\\033c", end="")
print(ui.render_daily_report(report))

if sys.platform == "darwin":
    subprocess.run(["osascript", "-e", 'tell application "Terminal" to activate'], capture_output=True)
'''

        with open(self.shortcut_script, "w", encoding="utf-8") as f:
            f.write(script_content)

        os.chmod(self.shortcut_script, 0o755)
        return self.shortcut_script

    def setup_mac_shortcut(self) -> bool:
        try:
            script_path = self._create_show_today_script()

            plist_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.taskmanager.showtoday</string>
    <key>ProgramArguments</key>
    <array>
        <string>python3</string>
        <string>{script_path}</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>'''

            launch_agents_dir = os.path.expanduser("~/Library/LaunchAgents")
            os.makedirs(launch_agents_dir, exist_ok=True)

            plist_path = os.path.join(launch_agents_dir, "com.taskmanager.showtoday.plist")
            with open(plist_path, "w", encoding="utf-8") as f:
                f.write(plist_content)

            subprocess.run(
                ["launchctl", "load", plist_path], capture_output=True
            )

            return True
        except Exception:
            return False

    def setup_linux_shortcut(self) -> bool:
        try:
            script_path = self._create_show_today_script()

            desktop_file = f'''[Desktop Entry]
Type=Application
Name=Show Today Tasks
Exec=python3 {script_path}
Comment=Show today task overview
Terminal=true
NoDisplay=true
'''

            autostart_dir = os.path.expanduser("~/.config/autostart")
            os.makedirs(autostart_dir, exist_ok=True)

            with open(
                os.path.join(autostart_dir, "taskmanager-showtoday.desktop"),
                "w",
                encoding="utf-8",
            ) as f:
                f.write(desktop_file)

            return True
        except Exception:
            return False

    def setup_windows_shortcut(self) -> bool:
        try:
            script_path = self._create_show_today_script()

            startup_dir = os.path.expanduser(
                "~/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup"
            )
            os.makedirs(startup_dir, exist_ok=True)

            bat_path = os.path.join(startup_dir, "taskmanager-showtoday.bat")
            with open(bat_path, "w", encoding="utf-8") as f:
                f.write(f'@echo off\npython "{script_path}"\npause\n')

            return True
        except Exception:
            return False

    def setup(self) -> bool:
        print(f"正在配置全局快捷键... ({self.system})")

        if self.system == "Darwin":
            result = self.setup_mac_shortcut()
        elif self.system == "Linux":
            result = self.setup_linux_shortcut()
        elif self.system == "Windows":
            result = self.setup_windows_shortcut()
        else:
            print(f"不支持的操作系统: {self.system}")
            return False

        if result:
            print("全局快捷键脚本已创建。")
            print("\n注意：系统级别的全局快捷键需要手动配置：")
            print("\nmacOS:")
            print("  1. 打开 系统设置 → 键盘 → 快捷键")
            print("  2. 选择 服务 → 通用")
            print("  3. 添加新服务，设置快捷键为 Ctrl+Option+T")
            print("  4. 命令设置为: python3 ~/.taskmanager/show_today.py")
            print("\nLinux (GNOME):")
            print("  1. 打开 设置 → 键盘 → 键盘快捷键")
            print("  2. 滚动到底部点击 + 添加自定义快捷键")
            print("  3. 名称: 显示今日任务")
            print("  4. 命令: python3 ~/.taskmanager/show_today.py")
            print("  5. 快捷键: Ctrl+Alt+T")
            print("\nWindows:")
            print("  1. 右键点击生成的 .bat 文件 → 发送到 → 桌面快捷方式")
            print("  2. 右键桌面快捷方式 → 属性 → 快捷键")
            print("  3. 按下 Ctrl+Alt+T 并保存")
        return result

    def get_setup_instructions(self) -> str:
        return self.setup.__doc__ or "请运行 `task shortcut --setup` 进行配置"
