#!/bin/bash

set -e

echo "======================================"
echo "🎉 抽奖系统一键启动脚本"
echo "======================================"

cd "$(dirname "$0")"

echo ""
echo "📦 正在启动所有服务..."
echo ""

docker compose up -d --build

echo ""
echo "⏳ 等待服务启动..."
echo ""

sleep 10

echo "✅ 服务启动状态:"
docker compose ps

echo ""
echo "🌐 访问地址:"
echo "   用户端: http://localhost"
echo "   管理端: http://localhost/admin"
echo "   管理Token: admin-token-12345"
echo ""
echo "📝 查看日志命令:"
echo "   docker compose logs -f backend"
echo "   docker compose logs -f frontend"
echo ""
echo "🛑 停止服务命令:"
echo "   docker compose down"
echo ""
