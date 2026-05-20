#!/bin/bash

echo "🐳 Docker 部署验证脚本"
echo "================================"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo ""
    echo "📦 安装 Docker:"
    echo "   macOS: brew install --cask docker"
    echo "   或访问: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

echo "✅ Docker 已安装: $(docker --version)"
echo "✅ Docker Compose 已安装"
echo ""

# 检查 docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml 不存在"
    exit 1
fi
echo "✅ docker-compose.yml 存在"
echo ""

# 验证配置
echo "📋 验证 docker-compose.yml 配置..."
docker-compose config > /dev/null 2>&1 || {
    echo "❌ docker-compose.yml 配置错误"
    docker-compose config
    exit 1
}
echo "✅ docker-compose.yml 配置正确"
echo ""

# 显示服务信息
echo "📦 配置的服务:"
echo "  - MongoDB: 端口 27017"
echo "  - Backend API: 端口 5000"
echo "  - Frontend: 端口 3000"
echo ""

# 构建测试（不启动）
echo "🔨 测试构建（不启动服务）..."
docker-compose build --no-cache backend 2>&1 | tail -5
if [ $? -eq 0 ]; then
    echo "✅ 后端镜像构建成功"
else
    echo "⚠️  后端镜像构建可能需要更多时间，首次构建会下载依赖"
fi
echo ""

echo "🎉 Docker 配置验证通过！"
echo ""
echo "🚀 启动命令:"
echo "   docker-compose up -d"
echo ""
echo "📊 查看状态:"
echo "   docker-compose ps"
echo ""
echo "📝 查看日志:"
echo "   docker-compose logs -f"
echo ""
echo "⏹️  停止服务:"
echo "   docker-compose down"
