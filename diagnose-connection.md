# Docker 网络连接诊断指南

## 当前问题
容器内的应用无法连接到宿主机的 Ollama 服务 (localhost:11434)

## 诊断步骤

### 1. 确认 Ollama 运行状态
```bash
# 在宿主机上运行
curl http://localhost:11434/v1/models
```
✅ 应该返回模型列表 JSON

### 2. 找到正确的宿主机地址

#### 选项 A：Docker 默认网桥 IP (推荐)
```bash
# 在宿主机上查看 Docker 网桥 IP
ip addr show docker0 | grep "inet "
```
通常是 `172.17.0.1`

#### 选项 B：宿主机实际 IP
```bash
# 查看宿主机 IP（假设使用 eth0 网卡）
ip addr show eth0 | grep "inet "
```

#### 选项 C：使用 host.docker.internal
需要 Docker 20.10+ 并在 docker-compose.yml 中添加：
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### 3. 测试容器到宿主机的连接

```bash
# 启动容器
docker compose up -d

# 测试网桥 IP
docker compose exec open_notebook curl -v http://172.17.0.1:11434/v1/models

# 测试 host.docker.internal（如果配置了）
docker compose exec open_notebook curl -v http://host.docker.internal:11434/v1/models
```

### 4. 检查 Ollama 监听地址

Ollama 必须监听 `0.0.0.0` 而不仅仅是 `127.0.0.1`

```bash
# 检查 Ollama 进程监听的地址
netstat -tlnp | grep 11434
# 或
ss -tlnp | grep 11434
```

如果看到 `127.0.0.1:11434`，需要修改 Ollama 配置：

```bash
# 设置环境变量（临时）
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 或修改 systemd 服务（永久）
sudo systemctl edit ollama
# 添加：
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"

sudo systemctl restart ollama
```

### 5. 检查防火墙

```bash
# 检查防火墙规则
sudo iptables -L -n -v | grep 11434

# 如果需要，允许来自 Docker 网桥的连接
sudo iptables -I INPUT -s 172.17.0.0/16 -p tcp --dport 11434 -j ACCEPT
```

### 6. 验证完整流程

```bash
# 1. 修改 docker.env
cat > docker.env <<EOF
OPENAI_COMPATIBLE_BASE_URL=http://172.17.0.1:11434/v1
OPENAI_COMPATIBLE_API_KEY=dummy
SURREAL_ADDRESS=localhost
SURREAL_PORT=8000
SURREAL_USER=root
SURREAL_PASS=root
SURREAL_NAMESPACE=open_notebook
SURREAL_DATABASE=production
EOF

# 2. 重启容器
docker compose down
docker compose up -d

# 3. 等待服务启动（约30秒）
sleep 30

# 4. 测试连接
docker compose exec open_notebook curl http://172.17.0.1:11434/v1/models

# 5. 查看应用日志
docker compose logs -f
```

## 常见问题

### Q: curl 返回 "Connection refused"
A: Ollama 可能只监听 127.0.0.1，需要改为 0.0.0.0

### Q: curl 返回 "No route to host"
A: 防火墙阻止了连接，检查 iptables 规则

### Q: curl 成功但应用仍报错
A: 检查 docker.env 是否正确加载，重启容器

### Q: 172.17.0.1 不工作
A: 尝试使用宿主机的实际 IP 地址，或配置 host.docker.internal

## 最终配置示例

### docker.env
```bash
OPENAI_COMPATIBLE_BASE_URL=http://172.17.0.1:11434/v1
OPENAI_COMPATIBLE_API_KEY=dummy
SURREAL_ADDRESS=localhost
SURREAL_PORT=8000
SURREAL_USER=root
SURREAL_PASS=root
SURREAL_NAMESPACE=open_notebook
SURREAL_DATABASE=production
```

### docker-compose.yml
```yaml
services:
  open_notebook:
    image: open-notebook:offline-fixed
    ports:
      - "8502:8502"
      - "5055:5055"
    env_file:
      - ./docker.env
    pull_policy: never
    volumes:
      - ./notebook_data:/app/data
      - ./surreal_single_data:/mydata
    restart: always
```

## 成功标志

- ✅ `curl http://172.17.0.1:11434/v1/models` 从容器内返回模型列表
- ✅ Docker 日志中没有 "Connection error"
- ✅ 在 Web 界面发送消息时收到 LLM 响应
