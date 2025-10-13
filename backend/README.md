# FastAPI 后端服务

智能合同模板系统的 Python FastAPI 后端服务。

## 功能特性

- ✅ **模块一**: 文档解析服务 (DocumentParser)
- 🔄 **模块二**: AI 变量提取服务 (待实现)
- 🔄 **模块三**: 动态表单支持 (前端实现)
- 🔄 **模块四**: 高保真文档生成 (待实现)

## 技术栈

- **框架**: FastAPI 0.115.0
- **数据库**: PostgreSQL + SQLAlchemy
- **存储**: MinIO (S3 兼容)
- **缓存**: Redis
- **文档处理**: python-docx, python-docxtpl

## 项目结构

```
backend/
├── main.py                 # 主应用入口
├── config.py               # 配置管理
├── requirements.txt        # Python 依赖
├── Dockerfile             # Docker 镜像配置
├── leaflow.yaml           # Leaflow 部署清单
├── models/                # 数据库模型
│   ├── database.py        # 数据库连接
│   ├── user.py            # 用户模型
│   ├── template.py        # 模板模型
│   └── generated_document.py
├── services/              # 业务服务
│   ├── document_parser.py # 文档解析
│   └── storage_service.py # 存储服务
├── routers/               # API 路由
│   ├── documents.py       # 文档 API
│   ├── variables.py       # 变量 API
│   ├── generate.py        # 生成 API
│   └── templates.py       # 模板 API
├── middleware/            # 中间件
│   ├── logging_middleware.py
│   └── error_handler.py
└── tests/                 # 测试文件
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写配置
```

### 3. 启动服务

```bash
# 开发模式
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### 文档处理

- `POST /api/v1/documents/parse` - 解析上传的文档
- `POST /api/v1/documents/validate` - 验证文档格式

### 变量提取（待实现）

- `POST /api/v1/variables/extract` - 提取合同变量

### 文档生成（待实现）

- `POST /api/v1/generate/document` - 生成合同文档
- `GET /api/v1/generate/document/{id}/download` - 下载生成的文档

### 模板管理（待实现）

- `GET /api/v1/templates/` - 列出模板
- `POST /api/v1/templates/` - 创建模板
- `GET /api/v1/templates/{id}` - 获取模板详情

## Docker 部署

### 构建镜像

```bash
docker build -t contract-backend:latest .
```

### 运行容器

```bash
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name contract-backend \
  contract-backend:latest
```

## Leaflow 部署

### 1. 创建 Secret

```bash
# 在 Leaflow 控制台创建 Secret: contract-secrets
# 包含以下键值对:
# - database-url
# - minio-access-key
# - minio-secret-key
# - gemini-api-key
# - jwt-secret
```

### 2. 部署应用

```bash
# 在 Leaflow 控制台上传 leaflow.yaml
# 或使用 CLI
leaflow deploy -f leaflow.yaml
```

### 3. 验证部署

```bash
curl https://api.your-app.leaflow.dev/health
```

## 开发指南

### 添加新的 API 路由

1. 在 `routers/` 目录创建新文件
2. 定义路由和处理函数
3. 在 `main.py` 中注册路由

```python
# routers/example.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/example", tags=["example"])

@router.get("/")
async def example():
    return {"message": "Hello"}

# main.py
from routers import example
app.include_router(example.router)
```

### 添加新的服务

1. 在 `services/` 目录创建新文件
2. 实现服务类
3. 在路由中导入使用

### 数据库迁移

```bash
# 初始化 Alembic
alembic init alembic

# 创建迁移
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head
```

## 测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_document_parser.py

# 覆盖率报告
pytest --cov=. --cov-report=html
```

## 故障排查

### 数据库连接失败

检查环境变量 `DATABASE_URL` 是否正确配置。

### MinIO 连接失败

确保 MinIO 服务已启动，并检查 `MINIO_ENDPOINT` 配置。

### 文档解析失败

确认上传的文件是有效的 `.docx` 格式。

## 下一步开发

- [ ] 实现模块二：AI 变量提取服务
- [ ] 实现模块四：文档生成服务
- [ ] 实现用户认证和授权
- [ ] 添加单元测试和集成测试
- [ ] 性能优化和缓存策略
- [ ] 日志聚合和监控

## 许可证

MIT License
