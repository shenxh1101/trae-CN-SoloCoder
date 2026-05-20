#!/bin/bash

echo "🚀 正在启动个人博客系统..."

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 请先安装 Docker 和 Docker Compose"
    exit 1
fi

echo "📦 构建并启动服务..."
docker-compose up -d --build

echo "⏳ 等待服务启动..."
sleep 10

echo "✅ 博客系统已启动!"
echo "🌐 前端地址: http://localhost:3000"
echo "🔧 后端API: http://localhost:5000/api"
echo "📝 管理后台: http://localhost:3000/admin"
echo ""
echo "💡 首次使用请先注册管理员账号:"
echo "   POST http://localhost:5000/api/auth/register"
echo "   Body: {\"username\": \"admin\", \"email\": \"admin@example.com\", \"password\": \"yourpassword\"}"
echo ""
echo "📋 查看日志: docker-compose logs -f"
echo "⏹️  停止服务: docker-compose down"
