#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUDGET_SCRIPT="$SCRIPT_DIR/budget.py"
DEST_DIR="/usr/local/bin"
DEST_SCRIPT="$DEST_DIR/budget"

echo "正在安装个人预算管理器..."

if [ ! -f "$BUDGET_SCRIPT" ]; then
    echo "错误: 找不到 budget.py 文件"
    exit 1
fi

chmod +x "$BUDGET_SCRIPT"

if [ -w "$DEST_DIR" ]; then
    ln -sf "$BUDGET_SCRIPT" "$DEST_SCRIPT"
    echo "安装成功! 可以使用 'budget' 命令"
else
    echo "需要管理员权限进行安装..."
    sudo ln -sf "$BUDGET_SCRIPT" "$DEST_SCRIPT"
    echo "安装成功! 可以使用 'budget' 命令"
fi

echo ""
echo "使用帮助:"
echo "  budget help    查看帮助信息"
echo "  budget         启动交互模式"
