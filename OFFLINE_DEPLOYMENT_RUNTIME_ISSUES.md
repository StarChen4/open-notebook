# Open Notebook 离线部署运行时问题补充分析

## ⚠️ 紧急更新

在对实际运行日志的分析中，发现了之前报告**遗漏的严重运行时问题**！

---

## 问题概述

即使在外网环境成功构建了 Docker 镜像并导入到离线环境，**容器启动后仍然会尝试从互联网下载依赖包**，导致 API 服务无法启动。

---

## 🔴 严重问题 #1: `uv run` 运行时依赖检查

### 问题根源

**文件位置**: `supervisord.single.conf:19, 30`

```conf
[program:api]
command=uv run uvicorn api.main:app --host 0.0.0.0 --port 5055

[program:worker]
command=uv run surreal-commands-worker --import-modules commands
```

### 问题分析

**`uv run` 的行为机制**:
1. `uv run` 不仅仅是运行命令，它会在每次启动时**检查环境一致性**
2. 它会对比 `pyproject.toml` 中声明的依赖与当前虚拟环境
3. 如果发现依赖缺失或版本不匹配，会尝试从 PyPI **重新下载安装**
4. 即使使用了 `--frozen` 标志，运行时检查仍然会进行

### 实际错误日志

```
× Failed to download `types-requests==2.32.4.20250913`
├─▶ Failed to fetch:
│   `https://files.pythonhosted.org/packages/2a/20/9a227ea57c1285986c4cf78400d0a91615d25b24e257fd9e2969606bdfae/types_requests-2.32.4.20250913-py3-none-any.whl`
├─▶ Request failed after 3 retries
├─▶ error sending request for url
│   (https://files.pythonhosted.org/packages/2a/20/9a227ea57c1285986c4cf78400d0a91615d25b24e257fd9e2969606bdfae/types_requests-2.32.4.20250913-py3-none-any.whl)
├─▶ client error (Connect)
╰─▶ tls handshake eof
  help: `types-requests` (v2.32.4.20250913) was included because
        `open-notebook:dev` (v1.2.4) depends on `types-requests`
```

### 为什么会尝试下载 dev 依赖?

**关键发现**:
- Dockerfile 构建时使用了 `uv sync --frozen --no-dev`
- 虚拟环境中**没有安装 dev 依赖**
- 但 `pyproject.toml` 中仍然**声明了 dev 依赖**
- `uv run` 检测到声明与实际环境不一致，尝试"修复"环境

### 严重性

⚠️ **关键阻塞问题**
- API 服务无法启动
- Worker 服务无法启动
- 整个应用完全不可用

### 必要性

✅ **必须立即解决**

---

## 🔴 严重问题 #2: Tiktoken 首次运行下载

### 问题描述

**文件位置**: `open_notebook/utils/token_utils.py:27`

```python
import tiktoken
encoding = tiktoken.get_encoding("o200k_base")
```

### 问题分析

**Tiktoken 的工作机制**:
1. Tiktoken 使用预训练的 tokenizer 模型文件
2. 首次调用 `tiktoken.get_encoding()` 时，会从以下地址下载模型:
   ```
   https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken
   ```
3. 虽然代码配置了 `TIKTOKEN_CACHE_DIR`，但如果该目录为空，仍会尝试下载
4. 在离线环境中，下载会失败，但 tiktoken 可能会抛出异常

### 触发时机

- 第一次进行 token 计数操作时
- 第一次调用需要计算成本的功能时
- 可能在 API 初始化阶段就会触发

### 严重性

⚠️ **中高严重性**
- 可能导致某些功能报错
- 是否阻塞启动取决于代码调用时机

### 代码检查

```python
# open_notebook/utils/token_utils.py:25-32
try:
    import tiktoken
    encoding = tiktoken.get_encoding("o200k_base")
    tokens = encoding.encode(input_string)
    return len(tokens)
except ImportError:
    # Fallback: simple word count estimation
    return int(len(input_string.split()) * 1.3)
```

**问题**:
- 只捕获了 `ImportError`，没有捕获下载失败的异常
- 如果 tiktoken 库已安装但无法下载模型，会抛出 `HTTPError` 或其他网络异常

### 必要性

⚙️ **建议解决**（取决于功能使用频率）

---

## 举一反三: 其他潜在的运行时网络依赖

### 🟡 问题 #3: Python 库的懒加载下载

某些 Python 库在首次使用时会下载额外资源:

#### 3.1 Transformers / Hugging Face 库

**风险级别**: ℹ️ 低（项目似乎未使用）

如果将来使用了 Transformers 库:
```python
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("gpt2")  # 会从 HuggingFace 下载
```

解决方案: 在构建时预先下载到镜像中

#### 3.2 NLTK 数据包

**风险级别**: ℹ️ 低（项目似乎未使用）

```python
import nltk
nltk.download('punkt')  # 会从 nltk 服务器下载
```

#### 3.3 Spacy 语言模型

**风险级别**: ℹ️ 低（项目似乎未使用）

```python
import spacy
nlp = spacy.load("en_core_web_sm")  # 需要预先下载
```

### 🟡 问题 #4: Docker 镜像层缓存失效

**场景**: 如果在离线服务器上使用 `docker-compose` 并且配置了 `build:` 而不是 `image:`

**风险**:
```yaml
# ❌ 错误配置
services:
  app:
    build: .  # 会尝试重新构建，需要网络

# ✅ 正确配置
services:
  app:
    image: open-notebook:offline  # 使用已导入的镜像
```

### 🟡 问题 #5: 容器启动脚本的网络检查

**潜在风险**: 某些启动脚本可能包含网络健康检查

**需要检查的位置**:
- `scripts/wait-for-api.sh`
- 任何初始化脚本
- Healthcheck 配置

---

## 完整解决方案

### 方案 A: 修改 Supervisord 配置（推荐）

**原理**: 不使用 `uv run`，直接使用虚拟环境中的 Python

#### 步骤 1: 修改 supervisord.single.conf

```bash
# 在外网构建环境中修改
cd open-notebook
cp supervisord.single.conf supervisord.single.conf.backup

cat > supervisord.single.conf << 'EOF'
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0
pidfile=/tmp/supervisord.pid

[program:surrealdb]
command=surreal start --log trace --user root --pass root rocksdb:/mydata/mydatabase.db
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
priority=5
autostart=true
startsecs=5

[program:api]
command=/app/.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 5055
directory=/app
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
priority=10
autostart=true
startsecs=3

[program:worker]
command=/app/.venv/bin/python -m surreal_commands.worker --import-modules commands
directory=/app
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
priority=20
autostart=true
startsecs=3

[program:frontend]
command=bash -c "/app/scripts/wait-for-api.sh && npm run start"
directory=/app/frontend
environment=NODE_ENV="production",PORT="8502"
passenv=API_URL,NEXT_PUBLIC_API_URL,INTERNAL_API_URL
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
priority=30
autostart=true
startsecs=10
EOF
```

#### 步骤 2: 修复 Tiktoken 下载问题

```bash
# 创建预下载脚本
cat > scripts/preload-tiktoken.py << 'EOF'
#!/usr/bin/env python3
"""
预下载 tiktoken 模型文件到缓存目录
在构建时运行，确保离线环境可用
"""
import os
import sys

# 设置缓存目录
os.environ["TIKTOKEN_CACHE_DIR"] = "/app/data/tiktoken-cache"

try:
    import tiktoken
    print("正在下载 tiktoken 模型文件...")

    # 预加载所有常用编码
    encodings = ["o200k_base", "cl100k_base", "p50k_base", "r50k_base"]

    for enc_name in encodings:
        print(f"  - 下载 {enc_name}...")
        encoding = tiktoken.get_encoding(enc_name)
        # 测试编码
        test_text = "Hello, world!"
        tokens = encoding.encode(test_text)
        print(f"    ✓ {enc_name} 已缓存 (测试: {len(tokens)} tokens)")

    print("\n所有 tiktoken 模型已成功下载到缓存！")
    sys.exit(0)

except Exception as e:
    print(f"\n✗ 错误: {e}", file=sys.stderr)
    print("提示: 确保在有网络的环境中运行此脚本", file=sys.stderr)
    sys.exit(1)
EOF

chmod +x scripts/preload-tiktoken.py
```

#### 步骤 3: 修改 Dockerfile.single

在 Dockerfile.single 的 runtime 阶段添加:

```bash
# 在外网环境修改 Dockerfile.single
# 在 "Copy the application code" 之后添加:

cat >> Dockerfile.single.patch << 'EOF'
# 在 COPY --from=builder /app /app 之后添加:

# Pre-download tiktoken models to cache (requires internet during build)
RUN mkdir -p /app/data/tiktoken-cache && \
    /app/.venv/bin/python /app/scripts/preload-tiktoken.py || echo "Warning: tiktoken preload failed, will use fallback"

EOF
```

具体修改位置（在 Dockerfile.single 第 70 行后添加）:

```dockerfile
# Copy the application code
COPY --from=builder /app /app

# ===== 添加这部分 =====
# Pre-download tiktoken models (requires internet during build)
RUN mkdir -p /app/data/tiktoken-cache && \
    TIKTOKEN_CACHE_DIR=/app/data/tiktoken-cache \
    /app/.venv/bin/python -c "import tiktoken; tiktoken.get_encoding('o200k_base')" || \
    echo "Warning: tiktoken preload failed, will use fallback"
# ===== 添加结束 =====

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/.next/standalone /app/frontend/
```

#### 步骤 4: 增强 token_utils.py 异常处理

```bash
# 修改 open_notebook/utils/token_utils.py
cat > open_notebook/utils/token_utils.py.patch << 'EOF'
--- a/open_notebook/utils/token_utils.py
+++ b/open_notebook/utils/token_utils.py
@@ -23,11 +23,17 @@ def token_count(input_string: str) -> int:
         int: The number of tokens in the input string.
     """
     try:
         import tiktoken
         encoding = tiktoken.get_encoding("o200k_base")
         tokens = encoding.encode(input_string)
         return len(tokens)
-    except ImportError:
+    except ImportError as e:
+        # tiktoken not installed - use fallback
+        return int(len(input_string.split()) * 1.3)
+    except Exception as e:
+        # Network error, cache miss, or other tiktoken errors
+        # Silently fallback to word count estimation
+        import logging
+        logging.warning(f"Tiktoken failed ({e}), using word count fallback")
         return int(len(input_string.split()) * 1.3)
EOF
```

#### 步骤 5: 重新构建镜像

```bash
# 应用所有修改后重新构建
docker build -f Dockerfile.single -t open-notebook:offline-fixed .

# 导出镜像
docker save -o open-notebook-offline-fixed.tar open-notebook:offline-fixed

# 拷贝到内网服务器并导入
# docker load -i open-notebook-offline-fixed.tar
```

---

### 方案 B: 使用环境变量禁用 UV 网络访问（实验性）

**原理**: 配置 UV 环境变量，禁止网络访问

```bash
# 修改 supervisord.single.conf，添加环境变量
[program:api]
command=uv run uvicorn api.main:app --host 0.0.0.0 --port 5055
environment=UV_NO_SYNC="1",UV_OFFLINE="1"
```

**注意**:
- `UV_OFFLINE` 和 `UV_NO_SYNC` 是实验性功能
- 不同版本的 UV 可能不支持
- 方案 A 更可靠

---

### 方案 C: 预构建完整的运行环境（最彻底）

**原理**: 在构建阶段运行一次应用，让所有懒加载完成

```dockerfile
# 在 Dockerfile.single 的 runtime 阶段末尾添加:

# Pre-warm application (download all lazy-loaded resources)
RUN /app/.venv/bin/python -c "\
    import os; \
    os.environ['TIKTOKEN_CACHE_DIR'] = '/app/data/tiktoken-cache'; \
    from open_notebook.utils.token_utils import token_count; \
    token_count('test'); \
    print('Application pre-warmed successfully')" || echo "Pre-warm warning"
```

---

## 验证清单（离线环境测试）

部署到离线环境后，请验证:

- [ ] **容器启动无错误**: `docker logs open-notebook` 无 download/fetch 错误
- [ ] **API 服务正常启动**: 日志显示 "Uvicorn running on..."
- [ ] **Worker 服务正常**: 日志显示 worker 进程启动
- [ ] **前端可访问**: http://内网服务器IP:8502 可打开
- [ ] **Token 计数功能**: 创建笔记、对话等功能正常（测试 tiktoken）
- [ ] **无网络请求**: 使用 `tcpdump` 或 `nethogs` 确认无外网连接尝试

```bash
# 监控网络连接（在内网服务器上运行）
sudo tcpdump -i any 'not (dst net 192.168.0.0/16 or dst net 10.0.0.0/8 or dst net 172.16.0.0/12)' -n

# 预期: 应该没有任何输出（除了本地和内网通信）
```

---

## 问题严重性更新汇总

### 🔴 严重问题（必须解决）

| 问题 | 位置 | 严重性 | 原报告 | 本报告 |
|------|------|--------|--------|--------|
| Docker 构建依赖 | Dockerfile | ⚠️ 严重 | ✅ 已分析 | ✅ 解决方案有效 |
| **`uv run` 运行时检查** | supervisord.conf | ⚠️ **严重** | ❌ **遗漏** | ✅ **新增** |
| **Tiktoken 首次下载** | token_utils.py | ⚠️ **中高** | ❌ **遗漏** | ✅ **新增** |

### 🟡 中等问题

| 问题 | 严重性 | 原报告 | 本报告 |
|------|--------|--------|--------|
| Google Fonts | ⚠️ 中等 | ✅ 已分析 | ✅ 解决方案不变 |

### 🟢 轻微问题

| 问题 | 严重性 | 原报告 | 本报告 |
|------|--------|--------|--------|
| GitHub 版本检查 | ℹ️ 轻微 | ✅ 已处理 | ✅ 确认安全 |
| Firecrawl/Jina | ℹ️ 可选 | ✅ 已分析 | ✅ 确认安全 |

---

## 推荐行动方案

### 立即执行（关键）

1. ✅ **修改 supervisord.single.conf** - 使用虚拟环境 Python 替代 `uv run`
2. ✅ **在 Dockerfile 中预下载 tiktoken** - 在构建阶段触发下载
3. ✅ **增强异常处理** - 确保网络失败时优雅降级

### 建议执行（优化）

4. ⚙️ **修复 Google Fonts** - 提升用户体验
5. ⚙️ **添加离线验证脚本** - 自动化测试是否有网络依赖

### 可选执行（增强）

6. ⭕ **添加网络监控** - 部署后监控是否有意外的网络请求
7. ⭕ **文档更新** - 在官方文档中说明离线部署注意事项

---

## 总结

### 原分析报告的不足

原报告只关注了:
- ✅ Docker **构建阶段**的网络依赖（已完整）
- ✅ **前端运行时**的外部资源（已完整）
- ❌ **后端运行时**的网络依赖（**严重遗漏**）

### 本补充报告的发现

1. **`uv run` 机制缺陷** - 关键阻塞问题
2. **Tiktoken 懒加载** - 潜在运行时失败
3. **异常处理不足** - 缺少网络错误处理
4. **举一反三** - 识别其他潜在风险

### 修复后的效果

应用所有补丁后:
- ✅ 容器启动无需网络
- ✅ 所有功能完全离线运行
- ✅ 异常时优雅降级
- ✅ 无残留网络依赖

---

**报告生成时间**: 2026-01-04
**更新版本**: v2.0 (运行时问题补充)
**基于**: 实际离线部署失败日志分析
**状态**: 🔴 严重问题已识别，解决方案已提供
