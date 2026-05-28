#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "安装依赖..."
pip install --index-url https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
echo "启动服务..."
python app.py
