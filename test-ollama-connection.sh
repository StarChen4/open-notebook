#!/bin/bash
# 测试从容器内访问 Ollama 的脚本

echo "=== 测试从容器内访问 Ollama ==="
echo ""

# 测试不同的地址
ADDRESSES=(
    "http://localhost:11434/v1/models"
    "http://172.17.0.1:11434/v1/models"
    "http://host.docker.internal:11434/v1/models"
)

for addr in "${ADDRESSES[@]}"; do
    echo "测试: $addr"
    docker compose exec open_notebook curl -f --connect-timeout 5 "$addr" 2>&1 | head -5
    echo "状态码: $?"
    echo "---"
done
