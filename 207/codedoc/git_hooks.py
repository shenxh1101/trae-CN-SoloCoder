import os
import stat
import shutil
from typing import Optional


def install_pre_commit_hook(project_root: str = ".", config_path: Optional[str] = None) -> str:
    git_dir = os.path.join(os.path.abspath(project_root), ".git")
    if not os.path.isdir(git_dir):
        return "错误: 未找到 .git 目录，请在Git仓库根目录下运行此命令"

    hooks_dir = os.path.join(git_dir, "hooks")
    os.makedirs(hooks_dir, exist_ok=True)

    hook_path = os.path.join(hooks_dir, "pre-commit")

    config_arg = ""
    if config_path:
        config_arg = f" --config {os.path.abspath(config_path)}"

    hook_content = f"""#!/bin/sh
# CodeDoc pre-commit hook
# 自动运行代码诊断，发现错误时阻止提交

echo "🔍 CodeDoc: 正在检查暂存文件..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(py|js|jsx|ts|tsx|mjs)$')

if [ -z "$STAGED_FILES" ]; then
    echo "✅ CodeDoc: 没有需要检查的代码文件"
    exit 0
fi

HAS_ERROR=0

for FILE in $STAGED_FILES; do
    if [ -f "$FILE" ]; then
        python -m codedoc scan "$FILE"{config_arg} --severity error 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "❌ CodeDoc: $FILE 存在严重错误"
            HAS_ERROR=1
        fi
    fi
done

if [ $HAS_ERROR -ne 0 ]; then
    echo ""
    echo "❌ CodeDoc: 发现严重错误，提交已阻止"
    echo "   运行 'python -m codedoc scan .' 查看详情"
    echo "   使用 'git commit --no-verify' 跳过检查"
    exit 1
fi

echo "✅ CodeDoc: 所有文件检查通过"
exit 0
"""

    with open(hook_path, "w", encoding="utf-8") as f:
        f.write(hook_content)

    st = os.stat(hook_path)
    os.chmod(hook_path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    return f"✅ Git pre-commit 钩子已安装到: {hook_path}"


def uninstall_pre_commit_hook(project_root: str = ".") -> str:
    git_dir = os.path.join(os.path.abspath(project_root), ".git")
    hook_path = os.path.join(git_dir, "hooks", "pre-commit")

    if not os.path.isfile(hook_path):
        return "错误: 未找到 pre-commit 钩子"

    try:
        with open(hook_path, "r", encoding="utf-8") as f:
            content = f.read()
    except IOError:
        return "错误: 无法读取 pre-commit 钩子"

    if "CodeDoc pre-commit hook" not in content:
        return "错误: 现有的 pre-commit 钩子不是 CodeDoc 安装的，不会移除"

    os.remove(hook_path)
    return f"✅ 已移除 CodeDoc pre-commit 钩子: {hook_path}"


def is_hook_installed(project_root: str = ".") -> bool:
    git_dir = os.path.join(os.path.abspath(project_root), ".git")
    hook_path = os.path.join(git_dir, "hooks", "pre-commit")

    if not os.path.isfile(hook_path):
        return False

    try:
        with open(hook_path, "r", encoding="utf-8") as f:
            content = f.read()
        return "CodeDoc pre-commit hook" in content
    except IOError:
        return False
