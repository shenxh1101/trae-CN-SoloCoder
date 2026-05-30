#!/bin/bash

cd "$(dirname "$0")/frontend"

echo "=========================================="
echo "  AI手写文字识别系统 - 前端服务启动脚本"
echo "=========================================="
echo ""

echo "启动HTTP服务器..."
echo "服务地址: http://localhost:8000"
echo "按 Ctrl+C 停止服务"
echo ""

python -m http.server 8000
