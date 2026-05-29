#!/bin/bash
echo "=== 系统信息 ==="
echo "主机名: $(hostname)"
echo "内核版本: $(uname -r)"
echo "运行时间: $(uptime | awk -F, '{print $1}')"
echo ""
echo "=== CPU 信息 ==="
lscpu | grep -E "Model name|Core\(s\)|CPU MHz"
echo ""
echo "=== 内存使用 ==="
free -h
echo ""
echo "=== 磁盘使用 ==="
df -h
echo ""
echo "=== 网络连接 ==="
ss -tulpn | head -20
