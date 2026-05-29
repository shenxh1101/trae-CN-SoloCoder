#!/bin/bash
echo "=== 开始清理临时文件 ==="
echo ""

echo "清理 /tmp 目录..."
find /tmp -type f -atime +7 -delete 2>/dev/null
echo "完成"

echo ""
echo "清理用户缓存..."
if [ -d "$HOME/.cache" ]; then
    find "$HOME/.cache" -type f -atime +30 -delete 2>/dev/null
fi
echo "完成"

echo ""
echo "=== 清理完成 ==="
