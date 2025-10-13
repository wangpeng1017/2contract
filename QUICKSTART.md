# 🚀 快速启动指南

## 📋 项目概述

智能合同模板系统已完成 **Phase 1：Python 后端基础搭建**。

### 当前进度

✅ **已完成**:
- Python FastAPI 后端框架
- 模块一：文档解析服务
- MinIO 对象存储服务
- 数据库模型设计
- API 路由框架
- Docker 容器化配置
- Leaflow 部署清单
- 测试脚本

🔄 **待实现**:
- 模块二：AI 变量提取服务
- 模块三：动态表单生成
- 模块四：文档生成服务
- 前端重构

---

## 🛠️ 本地开发环境搭建

### 前置要求

- Python 3.11+
- PostgreSQL 15
- Redis
- MinIO (可选)

### 步骤 1：克隆项目

```bash
cd E:\trae\0823合同3
```

### 步骤 2：安装后端依赖

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
# source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤 3：配置环境变量

```bash
# 复制环境变量模板
copy .env.example .env

# 编辑 .env 文件，填写以下关键配置：
# DATABASE_URL=postgresql://user:password@localhost:5432/contract_db
# MINIO_ENDPOINT=localhost:9000
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin
# REDIS_URL=redis://localhost:6379/0
# GEMINI_API_KEY=your_api_key
# JWT_SECRET=your_secret_key
```

### 步骤 4：启动依赖服务

**使用 Docker Compose (推荐)**:

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: contract_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

启动服务:

```bash
docker-compose up -d
```

### 步骤 5：初始化数据库（可选）

```bash
# TODO: 运行迁移脚本
# python -m alembic upgrade head
```

### 步骤 6：启动后端服务

```bash
# 开发模式（自动重载）
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 步骤 7：测试 API

```bash
# 打开新终端

# 测试健康检查
curl http://localhost:8000/health

# 运行集成测试
python test_api.py

# 访问 API 文档
# 浏览器打开: http://localhost:8000/docs
```

---

## 🐳 Docker 快速启动

### 方式一：使用 Docker Compose（推荐）

创建完整的 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://admin:password@postgres:5432/contract_db
      - MINIO_ENDPOINT=minio:9000
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: contract_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

启动所有服务:

```bash
docker-compose up -d
```

### 方式二：单独构建后端

```bash
# 构建镜像
cd backend
docker build -t contract-backend:latest .

# 运行容器
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name contract-backend \
  contract-backend:latest

# 查看日志
docker logs -f contract-backend
```

---

## ☁️ Leaflow 部署指南

### 步骤 1：准备 Leaflow 环境

1. **注册账号**: https://leaflow.net/register
2. **安装依赖服务**（应用商店）:
   - PostgreSQL 15
   - MinIO
   - Redis

### 步骤 2：配置数据库

```bash
# 连接到 PostgreSQL
# 获取连接信息：Leaflow 控制台 -> PostgreSQL -> 连接信息

# 创建数据库
psql -h <host> -U admin -d postgres
CREATE DATABASE contract_db;
\q
```

### 步骤 3：配置 MinIO

1. 访问 MinIO Console（Leaflow 提供的链接）
2. 登录（使用 Leaflow 提供的凭据）
3. 创建存储桶：`contract-storage`
4. 设置访问策略（可选）

### 步骤 4：创建 Secret

在 Leaflow 控制台创建 Secret：`contract-secrets`

包含以下键值对：
```
database-url: postgresql://admin:password@postgres-service:5432/contract_db
minio-access-key: <从 Leaflow 获取>
minio-secret-key: <从 Leaflow 获取>
gemini-api-key: <你的 Gemini API Key>
jwt-secret: <生成一个随机字符串>
```

### 步骤 5：构建并推送镜像

```bash
# 构建镜像
cd backend
docker build -t <your-registry>/contract-backend:v1.0.0 .

# 推送到镜像仓库
docker push <your-registry>/contract-backend:v1.0.0
```

### 步骤 6：部署到 Leaflow

**方式一：使用控制台**
1. 登录 Leaflow 控制台
2. 选择"清单部署"
3. 上传 `backend/leaflow.yaml`
4. 修改镜像地址
5. 点击"部署"

**方式二：使用 CLI**（如果可用）
```bash
leaflow deploy -f backend/leaflow.yaml
```

### 步骤 7：验证部署

```bash
# 获取服务地址
# Leaflow 控制台 -> 服务列表 -> contract-backend-service

# 测试健康检查
curl https://api.your-app.leaflow.dev/health

# 测试 API 文档
# 浏览器访问: https://api.your-app.leaflow.dev/docs
```

---

## 📊 API 使用示例

### 1. 健康检查

```bash
curl http://localhost:8000/health
```

响应:
```json
{
  "status": "healthy",
  "database": "ok",
  "storage": "ok",
  "cache": "ok"
}
```

### 2. 解析文档

```bash
curl -X POST http://localhost:8000/api/v1/documents/parse \
  -F "file=@test-contract.docx"
```

响应:
```json
{
  "text": "合同全文内容...",
  "structure": {
    "paragraphs_count": 50,
    "tables_count": 3,
    "sections_count": 1
  },
  "metadata": {
    "title": "采购合同",
    "author": "..."
  },
  "placeholders": ["甲方", "乙方", "签订日期"],
  "filename": "test-contract.docx",
  "size": 45678,
  "valid": true,
  "warnings": []
}
```

### 3. 验证文档

```bash
curl -X POST http://localhost:8000/api/v1/documents/validate \
  -F "file=@test-contract.docx"
```

---

## 🧪 测试

### 运行集成测试

```bash
cd backend
python test_api.py
```

### 运行单元测试（TODO）

```bash
pytest tests/
pytest tests/test_document_parser.py -v
```

### 覆盖率测试

```bash
pytest --cov=. --cov-report=html
```

---

## 📖 项目文档

- **重构方案**: `REFACTOR_PLAN_LEAFLOW.md`
- **实施日志**: `IMPLEMENTATION_LOG.md`
- **后端文档**: `backend/README.md`
- **API 文档**: http://localhost:8000/docs (运行时)

---

## 🔧 常见问题

### Q1: 数据库连接失败

**问题**: `sqlalchemy.exc.OperationalError: could not connect to server`

**解决**:
1. 检查 PostgreSQL 是否运行: `docker ps`
2. 验证 `DATABASE_URL` 配置
3. 测试连接: `psql -h localhost -U admin -d contract_db`

### Q2: MinIO 连接失败

**问题**: `minio.error.S3Error: Unable to connect to endpoint`

**解决**:
1. 检查 MinIO 是否运行: `docker ps`
2. 验证 `MINIO_ENDPOINT` 配置
3. 访问 MinIO Console: http://localhost:9001

### Q3: 模块导入错误

**问题**: `ModuleNotFoundError: No module named 'xxx'`

**解决**:
```bash
# 确保在虚拟环境中
source venv/bin/activate  # Windows: venv\Scripts\activate

# 重新安装依赖
pip install -r requirements.txt
```

### Q4: 文档解析失败

**问题**: `ValueError: 无法解析文档`

**解决**:
1. 确认文件是 `.docx` 格式（不是 `.doc`）
2. 确认文件未损坏
3. 尝试用 Microsoft Word 打开并另存为新文件

---

## 🎯 下一步开发

### Phase 2: AI 变量提取（本周目标）

1. **注册 Gemini API**
   - 访问: https://ai.google.dev/
   - 获取 API Key

2. **实现变量提取服务**
   ```bash
   # 创建文件
   backend/services/variable_extractor.py
   
   # 实现功能
   - VariableExtractor 类
   - extract_variables() 方法
   - 缓存机制
   ```

3. **完成 API 端点**
   ```bash
   # 编辑文件
   backend/routers/variables.py
   
   # 实现
   POST /api/v1/variables/extract
   ```

4. **测试验证**
   ```bash
   # 添加测试
   backend/tests/test_variable_extractor.py
   ```

### 开发建议

1. **代码风格**: 遵循 PEP 8
2. **提交规范**: 使用语义化提交信息
3. **测试驱动**: 先写测试，再写代码
4. **文档更新**: 及时更新 README

---

## 📞 获取帮助

- **Leaflow 社区**: QQ 群 582959600
- **项目问题**: 提交 Issue
- **紧急问题**: [联系方式]

---

## 📝 检查清单

在开始开发前，确保：

- [ ] Python 3.11+ 已安装
- [ ] PostgreSQL 已运行
- [ ] Redis 已运行
- [ ] MinIO 已运行（或配置）
- [ ] 虚拟环境已激活
- [ ] 依赖已安装
- [ ] 环境变量已配置
- [ ] 后端服务可正常启动
- [ ] API 测试通过

---

**文档版本**: v1.0  
**最后更新**: 2025-01-10  
**更新人**: AI Assistant
