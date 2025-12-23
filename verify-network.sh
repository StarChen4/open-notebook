#!/bin/bash
# 验证 Docker 网络配置的脚本

echo "=== 验证 WSL 和 Docker 网络配置 ==="
echo ""

echo "1️⃣ 检查 WSL 中 Ollama 是否运行："
curl -s http://localhost:11434/v1/models | head -5
if [ $? -eq 0 ]; then
    echo "✅ WSL 中可以访问 Ollama"
else
    echo "❌ WSL 中无法访问 Ollama，请先启动 Ollama"
    exit 1
fi
echo ""

echo "2️⃣ 检查 Docker 容器是否运行："
docker compose ps
echo ""

echo "3️⃣ 测试容器内访问 localhost（应该失败）："
docker compose exec -T open_notebook curl -s --connect-timeout 3 http://localhost:11434/v1/models 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 容器内 localhost 可访问（使用了 host 网络模式）"
else
    echo "❌ 容器内 localhost 不可访问（这是正常的，需要使用网桥 IP）"
fi
echo ""

echo "4️⃣ 测试容器内访问 172.17.0.1（Docker 网桥）："
docker compose exec -T open_notebook curl -s --connect-timeout 3 http://172.17.0.1:11434/v1/models 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 容器内可以通过 172.17.0.1 访问 Ollama"
    echo ""
    echo "🎯 推荐配置："
    echo "在 docker.env 中使用："
    echo "OPENAI_COMPATIBLE_BASE_URL=http://172.17.0.1:11434/v1"
else
    echo "❌ 容器内无法通过 172.17.0.1 访问"
    echo ""
    echo "🎯 推荐使用 host 网络模式："
    echo "在 docker-compose.yml 中添加 network_mode: \"host\""
fi
echo ""

echo "5️⃣ 检查当前环境变量配置："
docker compose exec -T open_notebook env | grep OPENAI_COMPATIBLE_BASE_URL || echo "未找到 OPENAI_COMPATIBLE_BASE_URL"
echo ""

echo "=== 诊断完成 ==="
