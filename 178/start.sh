#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "========================================"
echo "   Port Tester - Quick Start Script"
echo "========================================"

echo ""
echo "[1/3] Installing dependencies..."
pip3 install -r requirements.txt

echo ""
echo "[2/3] Syntax check..."
python3 -m py_compile app.py
echo "✓ Syntax check PASSED"

echo ""
echo "[3/3] Starting application..."
echo "App will be available at: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================"
echo ""

python3 app.py
