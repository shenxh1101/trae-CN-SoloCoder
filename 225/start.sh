#!/bin/bash

echo "🚀 启动 AI 轮廓图生成器..."

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "📦 安装依赖..."
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple flask flask-cors opencv-python numpy Pillow

echo "🌐 启动服务..."
echo "📱 访问地址: http://localhost:5001"

python app.py
