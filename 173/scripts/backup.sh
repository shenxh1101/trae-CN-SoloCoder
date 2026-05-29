#!/bin/bash
BACKUP_DIR="/tmp/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== 开始备份 ==="
echo "时间戳: $TIMESTAMP"
echo ""

mkdir -p "$BACKUP_DIR"

echo "备份当前用户配置..."
if [ -d "$HOME/.config" ]; then
    tar -czf "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" -C "$HOME" .config 2>/dev/null
    echo "配置文件已备份到: $BACKUP_DIR/config_$TIMESTAMP.tar.gz"
else
    echo "未找到 .config 目录"
fi

echo ""
echo "备份当前目录文件列表..."
ls -la > "$BACKUP_DIR/filelist_$TIMESTAMP.txt"
echo "文件列表已备份到: $BACKUP_DIR/filelist_$TIMESTAMP.txt"

echo ""
echo "=== 备份完成 ==="
ls -lh "$BACKUP_DIR/"
