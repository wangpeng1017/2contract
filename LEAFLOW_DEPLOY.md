# 🐳 Leaflow 容器部署完整指南

## 📋 项目架构

```
智能合同模板系统
├── 前端: Next.js 14 (端口 3000)
├── 后端: Python FastAPI (端口 8000)
├── 数据库: PostgreSQL 15
├── 缓存: Redis 7
├── 存储: MinIO
└── AI: Gemini API
```

---

## 🚀 快速部署步骤

### 步骤 1：准备 Leaflow 环境

1. **注册账号**
   - 访问 https://leaflow.net/
   - 注册并登录

2. **创建项目**
   - 点击"新建项目"
   - 项目名：`contract-system`
   - 选择地区：就近选择

### 步骤 2：构建 Docker 镜像

#### 2.1 构建后端镜像

```bash
cd E:\trae\0823合同3\backend

# 登录 Leaflow 镜像仓库
docker login registry.leaflow.net
# 用户名: 你的 Leaflow 用户名
# 密码: 从 Leaflow 控制台获取 Token

# 构建镜像
docker build -t registry.leaflow.net/your-username/contract-backend:latest .

# 推送镜像
docker push registry.leaflow.net/your-username/contract-backend:latest
```

#### 2.2 构建前端镜像

```bash
cd E:\trae\0823合同3

# 修改 next.config.js 添加 standalone 输出
# 见下方配置

# 构建镜像
docker build -t registry.leaflow.net/your-username/contract-frontend:latest .

# 推送镜像
docker push registry.leaflow.net/your-username/contract-frontend:latest
```

### 步骤 3：创建 Secrets

在 Leaflow 控制台或使用 kubectl 创建密钥：

```bash
# 方式 1：使用 kubectl（推荐）
kubectl create secret generic contract-secrets \
  --from-literal=postgres-password='YOUR_STRONG_PASSWORD' \
  --from-literal=minio-access-key='minioadmin' \
  --from-literal=minio-secret-key='YOUR_STRONG_PASSWORD' \
  --from-literal=gemini-api-key='YOUR_GEMINI_API_KEY' \
  --from-literal=jwt-secret='YOUR_JWT_SECRET_32CHARS'

# 方式 2：使用 Leaflow 控制台
# 1. 进入项目
# 2. 点击"配置" → "Secrets"
# 3. 点击"新建 Secret"
# 4. 名称: contract-secrets
# 5. 添加以下键值对:
#    - postgres-password: <强密码>
#    - minio-access-key: minioadmin
#    - minio-secret-key: <强密码>
#    - gemini-api-key: <你的 Gemini API Key>
#    - jwt-secret: <32位随机字符串>
```

### 步骤 4：修改部署配置

编辑 `leafflow-deployment.yaml`，替换以下内容：

```yaml
# 替换镜像地址（3处）
image: registry.leaflow.net/YOUR_USERNAME/contract-backend:latest
image: registry.leaflow.net/YOUR_USERNAME/contract-frontend:latest

# 替换域名（2处）
- value: "https://your-domain.leaflow.dev"
- host: your-domain.leaflow.dev
- host: api.your-domain.leaflow.dev
```

### 步骤 5：部署到 Leaflow

```bash
# 方式 1：使用 kubectl
kubectl apply -f leafflow-deployment.yaml

# 方式 2：使用 Leaflow CLI（如果有）
leaflow deploy -f leafflow-deployment.yaml

# 方式 3：使用 Leaflow 控制台
# 1. 进入项目
# 2. 点击"部署" → "从 YAML 部署"
# 3. 粘贴 leafflow-deployment.yaml 内容
# 4. 点击"部署"
```

### 步骤 6：配置域名

1. **在 Leaflow 控制台绑定域名**
   - 进入项目 → 网络 → 域名
   - 添加域名：`your-domain.leaflow.dev`
   - 添加域名：`api.your-domain.leaflow.dev`

2. **配置 DNS（如果使用自定义域名）**
   ```
   your-domain.com    CNAME    your-project.leaflow.dev
   api.your-domain.com CNAME   your-project.leaflow.dev
   ```

### 步骤 7：验证部署

```bash
# 查看 Pod 状态
kubectl get pods

# 应该看到：
# NAME                                 READY   STATUS    RESTARTS   AGE
# postgres-0                           1/1     Running   0          5m
# redis-xxx                            1/1     Running   0          5m
# minio-0                              1/1     Running   0          5m
# contract-backend-xxx                 1/1     Running   0          5m
# contract-frontend-xxx                1/1     Running   0          5m

# 查看服务
kubectl get services

# 查看日志
kubectl logs -f deployment/contract-backend
kubectl logs -f deployment/contract-frontend
```

---

## 🧪 本地测试（使用 Docker Compose）

在部署到 Leaflow 前，先在本地测试：

```bash
cd E:\trae\0823合同3

# 创建 .env 文件
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_32_characters_long
EOF

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问服务
# 前端: http://localhost:3000
# 后端: http://localhost:8000/docs
# MinIO: http://localhost:9001

# 停止服务
docker-compose down

# 清理数据（谨慎使用）
docker-compose down -v
```

---

## 📝 必需的配置修改

### 1. Next.js 配置 (`next.config.js`)

添加 standalone 输出配置：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 👈 添加这行
  reactStrictMode: true,
  // ... 其他配置
}

module.exports = nextConfig
```

### 2. 环境变量配置

前端需要的环境变量：
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.leaflow.dev
NEXT_PUBLIC_APP_URL=https://your-domain.leaflow.dev
```

后端需要的环境变量：
```bash
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql://admin:password@postgres-service:5432/contract_db
MINIO_ENDPOINT=minio-service:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secret
REDIS_URL=redis://redis-service:6379/0
GEMINI_API_KEY=your_key
JWT_SECRET=your_secret
CORS_ORIGINS=https://your-domain.leaflow.dev
```

---

## 🔧 常见问题排查

### 问题 1：镜像推送失败

```bash
# 检查登录状态
docker login registry.leaflow.net

# 重新标记镜像
docker tag contract-backend:latest registry.leaflow.net/your-username/contract-backend:latest

# 重新推送
docker push registry.leaflow.net/your-username/contract-backend:latest
```

### 问题 2：Pod 启动失败

```bash
# 查看详细错误
kubectl describe pod <pod-name>

# 查看日志
kubectl logs <pod-name>

# 常见原因：
# - Secret 未创建
# - 镜像拉取失败
# - 资源不足
```

### 问题 3：数据库连接失败

```bash
# 检查 PostgreSQL Pod
kubectl get pod postgres-0

# 进入 Pod 测试连接
kubectl exec -it postgres-0 -- psql -U admin -d contract_db

# 检查 Service
kubectl get svc postgres-service
```

### 问题 4：MinIO 存储桶未创建

```bash
# 进入 MinIO Console
# 访问: http://your-domain.leaflow.dev:9001

# 或使用 kubectl port-forward
kubectl port-forward svc/minio-service 9001:9001

# 然后访问: http://localhost:9001
# 创建存储桶: contract-storage
```

---

## 📊 资源配置建议

### 最小配置（测试环境）

| 服务 | CPU | 内存 | 存储 |
|------|-----|------|------|
| PostgreSQL | 0.5 核 | 1 GB | 10 GB |
| Redis | 0.25 核 | 512 MB | - |
| MinIO | 0.5 核 | 1 GB | 20 GB |
| Backend (×3) | 1 核 | 2 GB | - |
| Frontend (×2) | 0.25 核 | 512 MB | - |
| **总计** | **4.5 核** | **9 GB** | **30 GB** |

### 生产配置（推荐）

| 服务 | CPU | 内存 | 存储 |
|------|-----|------|------|
| PostgreSQL | 2 核 | 4 GB | 50 GB |
| Redis | 1 核 | 2 GB | - |
| MinIO | 2 核 | 4 GB | 100 GB |
| Backend (×5) | 2 核 | 4 GB | - |
| Frontend (×3) | 0.5 核 | 1 GB | - |
| **总计** | **16 核** | **30 GB** | **150 GB** |

---

## 🔒 安全配置清单

- [ ] 更改所有默认密码
- [ ] 使用强 JWT Secret（32+ 字符）
- [ ] 启用 HTTPS（Let's Encrypt）
- [ ] 配置防火墙规则
- [ ] 启用日志监控
- [ ] 定期备份数据库
- [ ] 设置资源限制
- [ ] 配置健康检查

---

## 📞 获取帮助

- **Leaflow 文档**: https://docs.leaflow.net/
- **Leaflow 社区**: QQ 群 582959600
- **项目问题**: 提交 GitHub Issue
- **Docker 文档**: https://docs.docker.com/

---

## ✅ 部署检查清单

**部署前**:
- [ ] Gemini API Key 已获取
- [ ] Leaflow 账号已创建
- [ ] Docker 已安装
- [ ] 镜像已构建并推送
- [ ] Secrets 已创建
- [ ] 域名已配置

**部署后**:
- [ ] 所有 Pod 状态为 Running
- [ ] 前端可访问
- [ ] 后端 API 可访问 (/docs)
- [ ] 上传文档功能正常
- [ ] 表单生成功能正常
- [ ] 文档下载功能正常
- [ ] MinIO 存储桶已创建

---

**部署完成后，访问你的域名开始使用！** 🎉

前端: https://your-domain.leaflow.dev  
后端 API: https://api.your-domain.leaflow.dev/docs  
MinIO Console: https://your-domain.leaflow.dev:9001
