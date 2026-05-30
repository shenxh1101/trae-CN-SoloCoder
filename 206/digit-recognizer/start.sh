#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

echo "========================================="
echo "  NeuroDigit - AI手写数字识别系统"
echo "========================================="
echo ""

if [ ! -d "$VENV_DIR" ]; then
    echo "[1/5] 创建Python虚拟环境..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    echo "[2/5] 安装依赖（TensorFlow较大，可能需要几分钟）..."
    pip install --upgrade pip
    pip install flask flask-cors numpy tensorflow onnxruntime Pillow
else
    source "$VENV_DIR/bin/activate"
    echo "[1/5] 虚拟环境已存在，跳过"
    echo "[2/5] 检查依赖完整性..."
    pip install -q flask flask-cors numpy tensorflow onnxruntime Pillow
fi

echo "[3/5] 检查模型文件..."
if [ ! -f "$SCRIPT_DIR/models/mnist_cnn.h5" ] && [ ! -f "$SCRIPT_DIR/models/mnist_simple.h5" ]; then
    echo "  未找到模型文件，开始训练（约2-5分钟）..."
    python3 "$SCRIPT_DIR/training/train_mnist.py" --epochs 3
else
    echo "  模型文件已存在，跳过训练"
fi

echo "[4/5] 检查错误案例目录..."
mkdir -p "$SCRIPT_DIR/error_cases"
if [ ! -f "$SCRIPT_DIR/error_cases/cases.json" ]; then
    echo "[]" > "$SCRIPT_DIR/error_cases/cases.json"
fi

echo "[5/5] 启动Flask服务器..."
echo ""
echo "  访问 http://localhost:5001 使用应用"
echo "  按 Ctrl+C 停止服务器"
echo ""
cd "$SCRIPT_DIR/server"
python3 app.py
