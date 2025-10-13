# 🚀 智能合同模板处理系统 - 部署指南

## 📋 概览

本指南详细说明如何将系统部署到生产环境：
- **前端**: Vercel 静态托管
- **后端**: Leaflow 容器化部署
- **代码仓库**: GitHub

## 📁 项目结构

```
E:\trae\0823合同3\
├── backend/                    # 后端服务 (部署到 Leaflow)
│   ├── Dockerfile             # Docker 构建文件
│   ├── leaflow.yaml          # Leaflow 部署配置
│   ├── main.py               # FastAPI 主应用
│   ├── requirements.txt      # Python 依赖
│   └── services/             # 业务逻辑
├── frontend/                  # 前端页面 (部署到 Vercel)
│   ├── index.html            # 主页面
│   ├── vercel.json           # Vercel 配置
│   ├── js/
│   │   ├── config.js         # 动态配置
│   │   └── app.js            # 业务逻辑
│   └── css/style.css         # 样式文件
└── DEPLOYMENT_GUIDE.md       # 本文档
```

---

## 🐙 步骤1: 推送代码到 GitHub

### 1.1 初始化 Git 仓库

在项目根目录执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交初始版本
git commit -m "feat: 智能合同模板处理系统初始版本

- 完成四大核心模块实现
- 模块一：python-docx 阅读顺序解析
- 模块二：AI 变量提取 (Gemini API)
- 模块三：动态表单用户交互
- 模块四：python-docx-template + MinIO 高保真生成
- 一站式 API 接口设计
- MinIO 分布式存储集成
- 完整前端界面和工作流
- Leaflow 和 Vercel 部署配置"
```

### 1.2 配置远程仓库

```bash
# 添加远程仓库
git remote add origin https://github.com/wangpeng1017/2contract.git

# 推送到主分支
git branch -M main
git push -u origin main
```

### 1.3 验证推送

访问 https://github.com/wangpeng1017/2contract 确认代码已上传。

---

## 🌿 步骤2: 后端部署到 Leaflow

### 2.1 准备 Leaflow 账户

1. 访问 https://leaflow.net/
2. 注册/登录账户
3. 创建新项目

### 2.2 构建 Docker 镜像

在本地或 CI/CD 中构建：

```bash
cd backend

# 构建镜像
docker build -t contract-backend:latest .

# 推送到 Leaflow 镜像仓库（替换为实际地址）
docker tag contract-backend:latest registry.leaflow.net/your-username/contract-backend:latest
docker push registry.leaflow.net/your-username/contract-backend:latest
```

### 2.3 配置环境变量

在 Leaflow 控制台创建以下 Secrets：

#### 数据库配置
```bash
# PostgreSQL 数据库
kubectl create secret generic database-secret \
  --from-literal=url='postgresql://username:password@host:port/database'
```

#### MinIO 存储配置
```bash
# MinIO 对象存储
kubectl create secret generic minio-secret \
  --from-literal=access-key='your-minio-access-key' \
  --from-literal=secret-key='your-minio-secret-key'
```

#### AI 服务配置
```bash
# Gemini API Key
kubectl create secret generic ai-secret \
  --from-literal=gemini-key='your-gemini-api-key'
```

#### Redis 缓存配置
```bash
# Redis 缓存
kubectl create secret generic redis-secret \
  --from-literal=url='redis://username:password@host:port/0'
```

### 2.4 更新 Leaflow 配置

编辑 `backend/leaflow.yaml`，更新以下配置：

```yaml
# 更新镜像地址
image: registry.leaflow.net/your-username/contract-backend:latest

# 更新 CORS 配置（替换为实际前端域名）
- name: CORS_ORIGINS
  value: "https://your-app-name.vercel.app"

# 更新域名配置
spec:
  tls:
  - hosts:
    - api.your-domain.com  # 替换为实际API域名
  rules:
  - host: api.your-domain.com  # 替换为实际API域名
```

### 2.5 部署到 Leaflow

```bash
# 应用部署配置
kubectl apply -f backend/leaflow.yaml

# 检查部署状态
kubectl get pods
kubectl get services
kubectl get ingress

# 查看日志
kubectl logs -f deployment/contract-backend
```

### 2.6 配置域名和 SSL

1. 在 Leaflow 控制台配置域名解析
2. 等待 SSL 证书自动签发
3. 测试 API 访问：`https://api.your-domain.com/health`

---

## ⚡ 步骤3: 前端部署到 Vercel

### 3.1 更新前端配置

编辑 `frontend/js/config.js`，更新生产环境 API 地址：

```javascript
} else if (isProduction) {
    // 生产环境 - 替换为实际 Leaflow 后端地址
    API_BASE_URL = 'https://api.your-domain.com/api/v1';
} else {
```

### 3.2 更新 Vercel 配置

编辑 `frontend/vercel.json`，更新 API 代理配置：

```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "https://api.your-domain.com/api/:path*"
  }
]
```

### 3.3 提交配置更新

```bash
git add .
git commit -m "feat: 更新生产环境配置

- 更新前端 API 地址指向 Leaflow 后端
- 配置 Vercel API 代理
- 更新 CORS 配置"

git push origin main
```

### 3.4 Vercel 部署

您将手动部署前端到 Vercel，以下是配置要点：

#### Vercel 项目配置
- **Framework Preset**: Other
- **Root Directory**: `frontend`
- **Build Command**: (留空，静态文件)
- **Output Directory**: `.` (当前目录)
- **Install Command**: (留空)

#### 环境变量配置
在 Vercel 控制台设置：
- `NODE_ENV`: `production`

#### 域名配置
1. 在 Vercel 控制台添加自定义域名（可选）
2. 配置 DNS 解析
3. 等待 SSL 证书自动配置

---

## 🔧 步骤4: 配置集成和测试

### 4.1 后端服务验证

测试后端 API 是否正常：

```bash
# 健康检查
curl https://api.your-domain.com/health

# API 文档
curl https://api.your-domain.com/docs

# 测试上传接口
curl -X POST https://api.your-domain.com/api/v1/documents/upload-and-extract \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-template.docx"
```

### 4.2 前端服务验证

1. 访问前端 URL（Vercel 提供的域名）
2. 测试完整工作流：
   - 上传 `.docx` 模板
   - 确认变量识别
   - 填写表单数据
   - 生成并下载合同

### 4.3 跨域配置验证

确保前后端可以正常通信：

1. 检查浏览器控制台无 CORS 错误
2. 确认 API 请求成功
3. 验证文件上传和下载功能

---

## 🛠️ 步骤5: 监控和维护

### 5.1 监控配置

#### Leaflow 后端监控
```bash
# 查看 Pod 状态
kubectl get pods -l app=contract-backend

# 查看服务状态
kubectl get svc contract-backend-service

# 查看日志
kubectl logs -f deployment/contract-backend --tail=100

# 查看资源使用
kubectl top pods -l app=contract-backend
```

#### 健康检查端点
- 后端健康检查：`https://api.your-domain.com/health`
- 前端可用性：访问前端 URL

### 5.2 错误排查

#### 常见问题

1. **CORS 错误**
   - 检查 `CORS_ORIGINS` 环境变量
   - 确认前端域名配置正确

2. **文件上传失败**
   - 检查 MinIO 配置和连接
   - 验证文件大小限制

3. **AI 变量提取失败**
   - 检查 Gemini API Key 配置
   - 查看 API 配额和限制

4. **数据库连接失败**
   - 验证数据库连接字符串
   - 检查网络连接和权限

#### 日志查看命令
```bash
# 后端应用日志
kubectl logs deployment/contract-backend --follow

# 错误日志过滤
kubectl logs deployment/contract-backend | grep -i error

# 特定时间段日志
kubectl logs deployment/contract-backend --since=1h
```

---

## 📊 步骤6: 性能优化

### 6.1 后端性能配置

在 `leaflow.yaml` 中调整：

```yaml
# 资源配置
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

# 副本数配置
replicas: 3  # 根据负载调整
```

### 6.2 缓存配置

确保 Redis 缓存正常工作：
- 变量提取结果缓存（7天）
- 生成文档临时缓存（1小时）

### 6.3 CDN 和静态资源

前端已通过 Vercel 自动优化：
- 全球 CDN 分发
- 自动 Gzip 压缩
- 图片优化

---

## 🔒 安全配置

### 6.1 环境变量安全

✅ **已实现**：
- 所有敏感信息存储在 Kubernetes Secrets
- 环境变量不在代码中硬编码
- API Keys 通过 Secret 注入

### 6.2 网络安全

✅ **已实现**：
- HTTPS 强制加密（自动 SSL 证书）
- CORS 严格配置
- 文件上传类型限制

### 6.3 访问控制

✅ **已实现**：
- 文件上传大小限制（50MB）
- API 请求验证
- MinIO 预签名 URL（1小时过期）

---

## 📝 部署检查清单

### 🐙 GitHub 推送
- [ ] Git 仓库初始化
- [ ] 代码推送到 https://github.com/wangpeng1017/2contract
- [ ] 分支保护规则配置（可选）

### 🌿 Leaflow 后端部署
- [ ] Docker 镜像构建和推送
- [ ] Kubernetes Secrets 创建
- [ ] leaflow.yaml 配置更新
- [ ] 应用部署和验证
- [ ] 域名和 SSL 配置
- [ ] API 健康检查通过

### ⚡ Vercel 前端部署
- [ ] 前端配置更新（API 地址）
- [ ] Vercel 项目创建和配置
- [ ] 域名配置（可选）
- [ ] 前端功能测试通过

### 🔗 集成测试
- [ ] 前后端 CORS 配置正确
- [ ] 完整工作流测试通过
- [ ] 文件上传下载功能正常
- [ ] AI 变量提取功能正常

### 📊 监控和维护
- [ ] 健康检查端点配置
- [ ] 日志监控配置
- [ ] 错误告警配置（可选）
- [ ] 性能监控配置（可选）

---

## 🎯 快速命令参考

### Git 操作
```bash
# 推送代码
git add . && git commit -m "update" && git push origin main

# 查看状态
git status
git log --oneline -10
```

### Leaflow 操作
```bash
# 查看部署状态
kubectl get pods,svc,ingress

# 查看日志
kubectl logs -f deployment/contract-backend

# 重启部署
kubectl rollout restart deployment/contract-backend

# 查看配置
kubectl describe deployment contract-backend
```

### 测试命令
```bash
# 后端健康检查
curl https://api.your-domain.com/health

# 前端可用性
curl -I https://your-app.vercel.app
```

---

## 🆘 故障排除

### 构建失败
1. 检查 Dockerfile 语法
2. 验证依赖文件存在
3. 查看构建日志

### 部署失败  
1. 检查 YAML 格式
2. 验证 Secrets 是否创建
3. 查看 Pod 事件

### 运行时错误
1. 查看应用日志
2. 检查环境变量配置
3. 验证外部服务连接

### 网络连接问题
1. 检查 CORS 配置
2. 验证域名解析
3. 测试防火墙规则

---

## 📚 相关文档

- [Leaflow 官方文档](https://docs.leaflow.net/)
- [Vercel 部署指南](https://vercel.com/docs)
- [Kubernetes 配置参考](https://kubernetes.io/docs/)
- [Docker 最佳实践](https://docs.docker.com/develop/best-practices/)

---

**部署完成后，您将拥有一个完全可用的生产环境智能合同处理系统！** 🎉