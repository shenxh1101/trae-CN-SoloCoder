#!/bin/bash

echo "🚀 启动博客系统..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

# 检查 MongoDB
if ! pgrep -x "mongod" > /dev/null && ! docker ps | grep -q mongo; then
    echo "⚠️  MongoDB 未运行，尝试启动..."
    
    if command -v brew &> /dev/null; then
        brew services start mongodb-community 2>/dev/null || {
            echo "ℹ️  使用 Docker 启动 MongoDB..."
            docker run -d -p 27017:27017 --name blog-mongodb mongo:4.4 2>/dev/null || {
                echo "❌ 无法启动 MongoDB，请手动安装并启动"
                echo "   macOS: brew install mongodb-community && brew services start mongodb-community"
                echo "   或: docker run -d -p 27017:27017 mongo:4.4"
                exit 1
            }
        }
    fi
    sleep 3
fi

echo "✅ MongoDB 已启动"

# 启动后端
echo "📦 启动后端服务..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

if ! lsof -i :5000 > /dev/null 2>&1; then
    nohup npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
    sleep 3
else
    echo "ℹ️  后端服务已在运行"
fi

cd ..

# 启动前端
echo "🎨 启动前端服务..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

if ! lsof -i :3000 > /dev/null 2>&1; then
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
    sleep 5
else
    echo "ℹ️  前端服务已在运行"
fi

cd ..

echo ""
echo "🎉 服务启动完成！"
echo "🌐 前端地址: http://localhost:3000"
echo "🔧 后端API: http://localhost:5000/api"
echo "📝 后台管理: http://localhost:3000/login"
echo ""
echo "📋 查看日志:"
echo "   后端: tail -f backend.log"
echo "   前端: tail -f frontend.log"
echo ""
echo "⏹️  停止服务:"
echo "   pkill -f 'node.*server.js' && pkill -f 'next'"
echo ""
echo "🧪 运行API测试:"
echo "   node test-api.js"
