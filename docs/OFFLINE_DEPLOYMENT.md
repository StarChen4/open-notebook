# 离线环境部署指南 (Offline Deployment Guide)

本文档详细说明如何在完全离线的 Linux 服务器上部署 Open Notebook 单容器版本。

## 环境要求

### 构建环境（联网）
- Windows 电脑 + WSL2 或 Linux 系统
- Docker Desktop 或 Docker Engine
- 互联网连接

### 目标环境（离线）
- Linux 服务器（无互联网访问）
- Docker Engine 已安装
- Docker Compose 已安装

## 部署流程

### 第一步：在联网环境构建镜像

#### 1. 克隆仓库

```bash
git clone https://github.com/lfnovo/open-notebook.git
cd open-notebook
```

#### 2. 构建单容器镜像

```bash
docker build -f Dockerfile.single -t open-notebook:offline .
```

**构建过程说明：**
- 构建分为两个阶段：builder 和 runtime
- builder 阶段会下载并安装所有 Python 和 Node.js 依赖
- runtime 阶段会从 builder 复制已安装的虚拟环境
- 构建完成后，镜像包含所有运行时依赖，不再需要网络访问

**注意事项：**
- 构建时需要互联网连接下载依赖
- 构建时间取决于网络速度，通常需要 10-30 分钟
- 确保构建过程完全成功，无错误信息

#### 3. 导出镜像

```bash
docker save open-notebook:offline -o open-notebook-offline.tar
```

这将创建一个 `.tar` 文件，包含完整的 Docker 镜像。

#### 4. 准备 docker-compose.yml

创建或使用项目提供的 `docker-compose.single.yml`：

```yaml
services:
  open-notebook:
    image: open-notebook:offline
    container_name: open-notebook
    ports:
      - "8502:8502"  # Frontend
      - "5055:5055"  # API
    volumes:
      - ./data:/mydata
    restart: unless-stopped
    environment:
      # 可选：设置 API URL（如果使用反向代理）
      # API_URL: https://your-domain.com/api
      - SURREAL_USER=root
      - SURREAL_PASS=root
```

### 第二步：传输到离线服务器

使用以下任一方式将文件传输到离线服务器：

1. **scp 命令**（如果服务器在内网可访问）：
   ```bash
   scp open-notebook-offline.tar user@offline-server:/path/to/destination/
   scp docker-compose.yml user@offline-server:/path/to/destination/
   ```

2. **U 盘或其他物理媒介**：
   - 将 `open-notebook-offline.tar` 和 `docker-compose.yml` 复制到 U 盘
   - 在离线服务器上挂载并复制文件

3. **内网文件共享**：
   - 使用 SMB/NFS 等内网共享方式传输

### 第三步：在离线服务器上部署

#### 1. 导入镜像

```bash
docker load -i open-notebook-offline.tar
```

验证镜像已成功导入：
```bash
docker images | grep open-notebook
```

应该看到：
```
open-notebook    offline    <IMAGE_ID>    <SIZE>
```

#### 2. 创建数据目录

```bash
mkdir -p ./data
```

#### 3. 启动容器

```bash
docker compose up -d
```

或者如果使用的是 `docker-compose.single.yml`：
```bash
docker compose -f docker-compose.single.yml up -d
```

#### 4. 查看启动日志

```bash
docker compose logs -f
```

**正常启动的标志：**
- SurrealDB 启动：`[INFO] Started web server on 0.0.0.0:8000`
- API 启动：`Uvicorn running on http://0.0.0.0:5055`
- Worker 启动：`Worker started successfully`
- Frontend 启动：`API is ready! Starting frontend...` 和 `Ready - started server on 0.0.0.0:8502`

**注意：** Frontend 会等待 API 就绪（最多 5 分钟），这是正常行为。

#### 5. 访问应用

在浏览器中打开：
```
http://<服务器IP>:8502
```

## 关键修复说明

本版本针对离线环境进行了以下关键修复：

### 1. 移除运行时依赖解析

**问题：** 原始配置使用 `uv run` 启动服务，这会在运行时尝试：
- 检查并同步 Python 依赖
- 如果检测到缺失依赖，从 PyPI 下载
- 构建 `open-notebook @ file:///app` 包

**修复：** 在 `supervisord.single.conf` 中：
- API: `uv run uvicorn` → `/app/.venv/bin/python -m uvicorn`
- Worker: `uv run surreal-commands-worker` → `/app/.venv/bin/python -m surreal_commands.worker`

直接使用虚拟环境中的 Python，跳过依赖检查。

### 2. 强制离线模式

在 `Dockerfile.single` 中添加环境变量：
```dockerfile
ENV UV_OFFLINE=1
```

即使 `uv` 被调用，也会强制使用离线模式，防止任何网络访问。

### 3. 构建阶段优化

确保在构建阶段（builder）：
- 使用 `uv sync --frozen --no-dev` 安装所有生产依赖
- 排除开发依赖（如 pre-commit, pytest-asyncio），减小镜像体积
- 编译 Python 字节码 (`UV_COMPILE_BYTECODE=1`)，提升启动速度

## 故障排查

### 问题：容器反复重启

**症状：**
```bash
docker ps -a
# STATUS 显示 Restarting (1) X seconds ago
```

**排查步骤：**

1. 查看详细日志：
   ```bash
   docker compose logs --tail=100
   ```

2. 检查是否有网络访问错误：
   - 搜索日志中的 `pypi.org`、`pythonhosted.org`
   - 搜索 `tls handshake`、`client error (Connect)`
   - 如果看到这些错误，说明修复未生效

3. 验证修复是否应用：
   ```bash
   docker compose exec open-notebook cat /etc/supervisor/conf.d/supervisord.conf
   ```

   确认 API 和 Worker 命令使用 `/app/.venv/bin/python` 而非 `uv run`

### 问题：API 长时间不就绪

**症状：**
```
Attempt 30/60: API not ready yet, waiting 5s...
```

**排查步骤：**

1. 检查 API 进程状态：
   ```bash
   docker compose exec open-notebook supervisorctl status
   ```

2. 查看 API 专属日志：
   ```bash
   docker compose logs | grep "program:api"
   ```

3. 手动测试 API 健康检查：
   ```bash
   docker compose exec open-notebook curl -f http://localhost:5055/health
   ```

### 问题：Frontend 无法连接到 API

**症状：** 浏览器中看到 "Unable to Connect to API Server"

**解决方案：**

1. 确认 API 端口映射正确：
   ```bash
   docker compose ps
   # 应该看到 0.0.0.0:5055->5055/tcp
   ```

2. 检查防火墙设置：
   ```bash
   # 允许 API 端口
   sudo firewall-cmd --zone=public --add-port=5055/tcp --permanent
   sudo firewall-cmd --zone=public --add-port=8502/tcp --permanent
   sudo firewall-cmd --reload
   ```

3. 如果使用反向代理，设置 API_URL：
   ```yaml
   environment:
     - API_URL=https://your-domain.com/api
   ```

## 后续维护

### 修改源码并重新部署

如果需要修改项目源码（如 UI 本地化）：

1. 在联网环境修改源码：
   ```bash
   # 例如修改前端文案
   vi frontend/src/components/SomeComponent.tsx
   ```

2. 重新构建镜像：
   ```bash
   docker build -f Dockerfile.single -t open-notebook:offline-v2 .
   ```

3. 导出新镜像：
   ```bash
   docker save open-notebook:offline-v2 -o open-notebook-offline-v2.tar
   ```

4. 传输到离线服务器并更新：
   ```bash
   # 在离线服务器上
   docker compose down
   docker load -i open-notebook-offline-v2.tar
   # 更新 docker-compose.yml 中的镜像名为 open-notebook:offline-v2
   docker compose up -d
   ```

### 数据备份

数据存储在 `./data` 目录中，定期备份：

```bash
# 停止容器
docker compose down

# 备份数据
tar -czf open-notebook-data-$(date +%Y%m%d).tar.gz data/

# 重启容器
docker compose up -d
```

### 更新到新版本

1. 在联网环境拉取最新代码：
   ```bash
   git pull origin main
   ```

2. 重新构建、导出、传输、导入镜像（参考上述流程）

3. 停止旧容器，启动新容器：
   ```bash
   docker compose down
   docker compose up -d
   ```

**注意：** 更新前务必备份数据目录！

## 技术细节

### 镜像结构

```
open-notebook:offline
├── /app/.venv/          # Python 虚拟环境（所有依赖已安装）
├── /app/api/            # FastAPI 后端代码
├── /app/commands/       # Worker 命令模块
├── /app/frontend/       # Next.js 前端（已构建）
├── /usr/local/bin/surreal  # SurrealDB 数据库
└── /etc/supervisor/conf.d/  # Supervisor 配置
```

### 服务架构

单容器运行以下服务（由 Supervisor 管理）：

1. **SurrealDB** (端口 8000，内部)
   - 数据存储在 `/mydata/mydatabase.db`
   - 用户名/密码：root/root

2. **API** (端口 5055)
   - FastAPI 应用
   - 处理后端逻辑和数据库交互

3. **Worker** (后台进程)
   - 处理异步任务（如文档解析、LLM 调用）

4. **Frontend** (端口 8502)
   - Next.js 应用
   - 等待 API 就绪后启动

### 环境变量

可在 `docker-compose.yml` 中配置：

- `API_URL`: 前端连接到 API 的 URL（使用反向代理时需要设置）
- `SURREAL_USER`: SurrealDB 用户名（默认 root）
- `SURREAL_PASS`: SurrealDB 密码（默认 root）

## 安全建议

1. **修改默认密码**：
   ```yaml
   environment:
     - SURREAL_USER=your_username
     - SURREAL_PASS=your_strong_password
   ```

2. **限制端口访问**：
   - 仅在内网开放端口
   - 使用防火墙规则限制访问来源

3. **使用反向代理**：
   - 在前面部署 Nginx/Traefik
   - 启用 HTTPS
   - 添加身份认证

4. **定期备份数据**：
   - 设置自动备份计划
   - 将备份存储在不同位置

## 常见问题

**Q: 为什么构建需要这么长时间？**
A: 构建过程需要：
- 下载所有 Python 依赖（约 200+ 个包）
- 下载并构建 Node.js 依赖（约 1000+ 个包）
- 编译 Next.js 前端应用
- 安装 SurrealDB

首次构建建议在网络条件良好时进行。后续修改源码重新构建会利用 Docker 缓存，速度会快很多。

**Q: 镜像文件有多大？**
A: 单容器镜像大约 1.5-2 GB（压缩后）。这包含了所有运行时依赖和前端资源。

**Q: 可以在 Windows 离线服务器上运行吗？**
A: 理论上可以，但需要 Windows 上安装 Docker Desktop 并启用 WSL2。本指南主要针对 Linux 服务器。

**Q: 如何接入内网的 LLM 服务？**
A: 在 Open Notebook 的设置页面中配置 LLM 提供商：
- 对于自建 Ollama：设置 API URL 为 `http://<内网IP>:11434`
- 对于其他兼容 OpenAI API 的服务：设置相应的 Base URL 和 API Key

**Q: 数据存储在哪里？**
A: 数据存储在宿主机的 `./data` 目录，映射到容器内的 `/mydata`。删除容器不会丢失数据，但需要定期备份该目录。

## 支持

如遇到问题：
1. 查看本文档的"故障排查"部分
2. 检查项目的 GitHub Issues：https://github.com/lfnovo/open-notebook/issues
3. 提交新 Issue 时附上详细的日志和环境信息
