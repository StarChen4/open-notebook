# Open Notebook 部署指南

> **版本**: 包含离线部署优化和中文国际化支持
> **分支**: `claude/deploy-internal-network-IRaMp`

## 📋 目录

- [部署方式选择](#部署方式选择)
- [在线构建镜像](#在线构建镜像)
- [离线部署流程](#离线部署流程)
- [环境变量配置](#环境变量配置)
- [验证部署](#验证部署)
- [语言切换](#语言切换)
- [故障排查](#故障排查)

---

## 部署方式选择

### 方式一：单容器部署（推荐用于简单场景）

**特点**：
- ✅ 一个容器包含所有服务（SurrealDB + API + Worker + Frontend）
- ✅ 配置简单，资源占用少
- ✅ 适合中小规模使用

**使用文件**：
- `Dockerfile.single`
- `docker-compose.single.yml`

### 方式二：多容器部署（推荐用于生产环境）

**特点**：
- ✅ 服务分离，更易扩展
- ✅ 可独立升级各个组件
- ✅ 适合大规模生产环境

**使用文件**：
- `Dockerfile`
- `docker-compose.full.yml`

---

## 在线构建镜像

### 前提条件

1. **联网环境**（构建时必须联网）
2. **安装工具**：
   ```bash
   # Docker 20.10+ 和 Docker Compose v2
   docker --version
   docker compose version
   ```
3. **硬件要求**：
   - 内存：至少 4GB
   - 磁盘：至少 10GB 可用空间

### 步骤 1: 克隆代码

```bash
# 克隆仓库
git clone https://github.com/StarChen4/open-notebook.git
cd open-notebook

# 切换到包含修复的分支
git checkout claude/deploy-internal-network-IRaMp
```

### 步骤 2: 配置环境变量

```bash
# 复制环境变量模板
cp docker.env.sample docker.env

# 编辑 docker.env，配置必要的 API Keys
nano docker.env
```

**必填项示例**：
```env
# OpenAI API Key (必填，用于对话功能)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# 嵌入模型 API Key (推荐配置，用于语义搜索)
# 如果使用 OpenAI 的嵌入模型，可以与上面相同
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# 或使用其他嵌入模型提供商
# VOYAGE_API_KEY=your_voyage_key
# COHERE_API_KEY=your_cohere_key
```

### 步骤 3A: 构建单容器镜像

```bash
# 构建镜像（需要联网，约需 5-10 分钟）
docker compose -f docker-compose.single.yml build

# 或直接构建镜像
docker build -f Dockerfile.single -t open-notebook:single-latest .
```

### 步骤 3B: 构建多容器镜像

```bash
# 构建镜像（需要联网）
docker compose -f docker-compose.full.yml build

# 或直接构建镜像
docker build -f Dockerfile -t open-notebook:latest .
```

### 步骤 4: 导出镜像（准备离线部署）

```bash
# 单容器版本
docker save open-notebook:single-latest | gzip > open-notebook-single-latest.tar.gz

# 多容器版本
docker save open-notebook:latest | gzip > open-notebook-latest.tar.gz

# 查看导出的镜像文件
ls -lh *.tar.gz
```

**预期输出**：
```
-rw-r--r-- 1 user user 1.2G Jan  5 10:30 open-notebook-single-latest.tar.gz
```

---

## 离线部署流程

### 步骤 1: 传输镜像到内网服务器

```bash
# 方式 1: 使用 scp
scp open-notebook-single-latest.tar.gz user@internal-server:/opt/

# 方式 2: 使用 U盘或其他离线方式
# 将 .tar.gz 文件拷贝到内网服务器
```

### 步骤 2: 在内网服务器导入镜像

```bash
# 登录到内网服务器
ssh user@internal-server

# 导入镜像
cd /opt
docker load < open-notebook-single-latest.tar.gz

# 验证镜像已导入
docker images | grep open-notebook
```

**预期输出**：
```
open-notebook   single-latest   abc123def456   2 hours ago   1.18GB
```

### 步骤 3: 准备部署文件

```bash
# 创建部署目录
mkdir -p /opt/open-notebook
cd /opt/open-notebook

# 复制以下文件到此目录（从源代码仓库）：
# - docker-compose.single.yml (或 docker-compose.full.yml)
# - supervisord.single.conf (或 supervisord.conf)
# - docker.env (已配置好的环境变量文件)
```

### 步骤 4: 配置环境变量

```bash
# 编辑 docker.env
nano docker.env
```

**关键配置项**：
```env
# === 必填：AI 模型配置 ===
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# === 可选：嵌入模型（用于语义搜索）===
# 如果不配置嵌入模型，向量搜索功能将不可用
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx  # 使用 OpenAI 嵌入模型
# 或使用其他提供商
# VOYAGE_API_KEY=your_key
# COHERE_API_KEY=your_key

# === 可选：其他模型提供商 ===
# ANTHROPIC_API_KEY=your_key
# GOOGLE_API_KEY=your_key
# GROQ_API_KEY=your_key

# === 数据库配置 ===
SURREAL_USER=root
SURREAL_PASS=your_secure_password_here
SURREAL_NS=open_notebook
SURREAL_DB=open_notebook

# === 前端配置（单容器模式无需修改）===
# INTERNAL_API_URL=http://localhost:5055
```

### 步骤 5: 启动服务

```bash
# 单容器模式
docker compose -f docker-compose.single.yml up -d

# 多容器模式
docker compose -f docker-compose.full.yml up -d

# 查看启动日志
docker compose -f docker-compose.single.yml logs -f
```

**等待服务启动**（约 30-60 秒）：
```
open_notebook_single | 2026-01-05 10:35:21 INFO     Supervisor started
open_notebook_single | 2026-01-05 10:35:22 INFO     spawned: 'surreal' with pid 123
open_notebook_single | 2026-01-05 10:35:22 INFO     spawned: 'api' with pid 124
open_notebook_single | 2026-01-05 10:35:22 INFO     spawned: 'worker' with pid 125
open_notebook_single | 2026-01-05 10:35:22 INFO     spawned: 'frontend' with pid 126
open_notebook_single | 2026-01-05 10:35:25 INFO     success: all processes running
```

---

## 环境变量配置

### 核心环境变量说明

| 环境变量 | 必填 | 说明 | 示例 |
|---------|------|------|------|
| `OPENAI_API_KEY` | ✅ 是 | OpenAI API密钥 | `sk-proj-xxxxx` |
| `OPENAI_API_KEY` (嵌入) | ⚠️ 推荐 | 用于语义搜索的嵌入模型 | 同上或单独配置 |
| `SURREAL_USER` | ✅ 是 | SurrealDB用户名 | `root` |
| `SURREAL_PASS` | ✅ 是 | SurrealDB密码 | `your_password` |
| `SURREAL_NS` | ✅ 是 | 命名空间 | `open_notebook` |
| `SURREAL_DB` | ✅ 是 | 数据库名 | `open_notebook` |
| `INTERNAL_API_URL` | ⚠️ 多容器 | API内部地址 | `http://api-service:5055` |

### 完整配置模板

```env
# ==========================================
# Open Notebook 环境变量配置
# ==========================================

# === AI 模型提供商 API Keys ===
# OpenAI (必填 - 用于对话、转换等功能)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Anthropic Claude (可选)
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# Google Gemini (可选)
# GOOGLE_API_KEY=xxxxxxxxxxxxxxxxxxxxx

# Groq (可选 - 快速推理)
# GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx

# Voyage AI (可选 - 高质量嵌入)
# VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxx

# Cohere (可选 - 嵌入和重排序)
# COHERE_API_KEY=xxxxxxxxxxxxxxxxxxxxx

# === 数据库配置 ===
SURREAL_USER=root
SURREAL_PASS=change_this_password_in_production
SURREAL_NS=open_notebook
SURREAL_DB=open_notebook

# === 前端配置 ===
# 单容器模式使用默认值，无需修改
# INTERNAL_API_URL=http://localhost:5055

# 多容器模式取消注释以下行
# INTERNAL_API_URL=http://api-service:5055

# === 系统配置 ===
# Tiktoken 缓存目录（已预配置，无需修改）
TIKTOKEN_CACHE_DIR=/app/data/tiktoken-cache
```

---

## 验证部署

### 1. 检查容器状态

```bash
# 查看容器运行状态
docker compose -f docker-compose.single.yml ps

# 预期输出：所有服务都是 "Up" 状态
```

### 2. 检查服务日志

```bash
# 查看所有日志
docker compose -f docker-compose.single.yml logs

# 只查看 API 日志
docker compose -f docker-compose.single.yml logs api

# 实时追踪日志
docker compose -f docker-compose.single.yml logs -f
```

### 3. 访问服务

在浏览器中访问：

- **前端界面**: http://your-server-ip:8502
- **API 文档**: http://your-server-ip:5055/docs
- **API Health**: http://your-server-ip:5055/health

### 4. 测试核心功能

1. **访问前端**：打开浏览器访问 http://your-server-ip:8502
2. **创建笔记本**：点击 "新建笔记本"
3. **上传资料**：上传文档或添加链接
4. **测试搜索**：使用搜索功能
5. **测试问答**：使用 Ask 功能（需要配置嵌入模型）

---

## 语言切换

### 自动语言检测

Open Notebook 会根据浏览器语言自动选择界面语言：
- 浏览器语言为中文 → 显示中文界面
- 浏览器语言为英文 → 显示英文界面

### 手动切换语言

通过 URL 路径切换：

```
# 中文界面
http://your-server-ip:8502/zh-CN/notebooks

# 英文界面
http://your-server-ip:8502/en/notebooks
```

### 默认语言

默认为英文（en），支持语言：
- `en` - English（英语）
- `zh-CN` - 简体中文

---

## 故障排查

### 问题 1: 容器无法启动

**症状**：`docker compose up` 失败

**排查步骤**：
```bash
# 1. 查看详细日志
docker compose -f docker-compose.single.yml logs

# 2. 检查端口占用
netstat -tulpn | grep -E '8502|5055'

# 3. 检查磁盘空间
df -h

# 4. 检查 Docker 版本
docker --version  # 需要 20.10+
```

### 问题 2: API 无法连接数据库

**症状**：API 日志显示数据库连接错误

**解决方案**：
```bash
# 检查 SurrealDB 是否运行
docker compose exec open_notebook_single ps aux | grep surreal

# 查看 SurrealDB 日志
docker compose logs | grep surreal

# 检查环境变量
docker compose exec open_notebook_single env | grep SURREAL
```

### 问题 3: 嵌入模型未配置

**症状**：无法使用向量搜索或 Ask 功能

**解决方案**：
1. 编辑 `docker.env`，添加嵌入模型 API Key
2. 重启容器：
   ```bash
   docker compose -f docker-compose.single.yml restart
   ```
3. 在前端 Models 页面配置默认嵌入模型

### 问题 4: 前端显示 502 错误

**症状**：访问 http://your-server-ip:8502 显示 502

**排查步骤**：
```bash
# 1. 检查 frontend 进程
docker compose exec open_notebook_single ps aux | grep node

# 2. 查看 frontend 日志
docker compose logs | grep frontend

# 3. 检查 Next.js 是否启动
docker compose exec open_notebook_single curl http://localhost:3000

# 4. 重启服务
docker compose restart
```

### 问题 5: Worker 无法启动

**症状**：日志显示 "No module named surreal_commands.worker"

**解决方案**：
- 本分支已修复此问题，使用正确的 console script 调用
- 如果仍有问题，检查是否使用了正确的镜像版本

### 问题 6: Tiktoken 下载失败（离线环境）

**症状**：Token 计数功能报错

**说明**：
- 本分支已在镜像构建时预下载 tiktoken 模型
- 离线环境会自动使用预下载的缓存
- 如果缓存失败，会自动回退到基于单词数的估算

---

## 性能优化建议

### 1. 资源配置

```yaml
# docker-compose.single.yml 中添加资源限制
services:
  open_notebook_single:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### 2. 持久化数据

确保数据目录已正确挂载：
```yaml
volumes:
  - ./notebook_data:/app/data          # 应用数据
  - ./surreal_single_data:/mydata      # 数据库数据
```

### 3. 日志管理

```yaml
# 限制日志大小
services:
  open_notebook_single:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 备份与恢复

### 备份数据

```bash
# 停止服务
docker compose -f docker-compose.single.yml stop

# 备份数据目录
tar -czf backup-$(date +%Y%m%d).tar.gz \
  notebook_data/ \
  surreal_single_data/ \
  docker.env

# 重启服务
docker compose -f docker-compose.single.yml start
```

### 恢复数据

```bash
# 停止服务
docker compose -f docker-compose.single.yml down

# 恢复数据
tar -xzf backup-20260105.tar.gz

# 启动服务
docker compose -f docker-compose.single.yml up -d
```

---

## 升级指南

### 升级镜像

```bash
# 1. 备份当前数据（见上方备份步骤）

# 2. 停止旧容器
docker compose -f docker-compose.single.yml down

# 3. 导入新镜像
docker load < open-notebook-single-latest-new.tar.gz

# 4. 启动新版本
docker compose -f docker-compose.single.yml up -d

# 5. 验证升级
docker compose -f docker-compose.single.yml logs -f
```

---

## 安全建议

1. **修改默认密码**：
   ```env
   SURREAL_PASS=使用强密码替换
   ```

2. **限制网络访问**：
   ```yaml
   # 仅允许本地访问
   ports:
     - "127.0.0.1:8502:8502"
     - "127.0.0.1:5055:5055"
   ```

3. **使用反向代理**：
   - 使用 Nginx 或 Traefik
   - 启用 HTTPS
   - 添加访问控制

4. **定期备份**：
   - 设置自动备份计划
   - 异地存储备份

---

## 技术支持

- **GitHub Issues**: https://github.com/StarChen4/open-notebook/issues
- **原项目文档**: https://github.com/lfnovo/open_notebook

---

**部署完成！🎉**

访问 http://your-server-ip:8502 开始使用 Open Notebook！
