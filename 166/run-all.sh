#!/bin/bash
cd "/Users/mac/code/solo coder/166"

echo "🚀 启动开发服务器..."
rm -f /tmp/vite.pid /tmp/vite.log

npx vite --port 5173 > /tmp/vite.log 2>&1 &
echo $! > /tmp/vite.pid

sleep 6

echo "📋 服务器日志:"
cat /tmp/vite.log

if grep -q "Local: http://localhost:5173" /tmp/vite.log; then
    echo "✅ 开发服务器已启动"
else
    echo "❌ 服务器启动失败"
    exit 1
fi

echo ""
echo "📸 开始运行截图脚本..."
node scripts/take-screenshots-final.mjs 2>&1 | tee screenshots-output-final.txt

echo ""
echo "🛑 停止开发服务器..."
kill $(cat /tmp/vite.pid) 2>/dev/null

echo ""
echo "🎉 所有操作完成！"
echo "截图目录: /Users/mac/code/solo coder/166/screenshots"
ls -lh screenshots/
