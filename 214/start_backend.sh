#!/bin/bash

cd "$(dirname "$0")/backend"

echo "=========================================="
echo "  AI手写文字识别系统 - 后端服务启动脚本"
echo "=========================================="
echo ""

MODEL_FILE="models/handwriting_model.h5"

if [ ! -f "$MODEL_FILE" ]; then
    echo "未检测到模型文件，开始训练初始模型..."
    echo ""
    python train.py new
    echo ""
    echo "初始模型训练完成！"
    echo ""
fi

echo "启动Flask服务..."
echo "服务地址: http://localhost:5001"
echo "按 Ctrl+C 停止服务"
echo ""

python app.py
