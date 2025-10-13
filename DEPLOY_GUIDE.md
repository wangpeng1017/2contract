# 🚀 快速部署指南

## 选项 1：Vercel 部署（推荐 - 5分钟完成）

### 前提条件
- GitHub 账号
- Vercel 账号（用 GitHub 登录即可）

### 步骤 1：提交代码到 Git

```bash
cd E:\trae\0823合同3

# 添加所有文件
git add .

# 提交
git commit -m "feat: 完成智能合同模板系统核心功能

- 实现模板上传和解析
- 智能表单生成（支持29种字段类型）
- 文档生成和下载
- 修复 API 路由配置

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# 推送到 GitHub
git push origin main
```

### 步骤 2：Vercel 部署

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New" → "Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置环境变量**（可选，基础功能无需配置）
   ```
   # 如果需要数据库功能，添加：
   DATABASE_URL=<从 Vercel Storage 获取>
   POSTGRES_PRISMA_URL=<从 Vercel Storage 获取>
   
   # 如果需要飞书集成，添加：
   FEISHU_APP_ID=<你的飞书应用ID>
   FEISHU_APP_SECRET=<你的飞书应用密钥>
   ```

4. **部署**
   - 点击 "Deploy"
   - 等待 2-3 分钟
   - 完成！访问分配的 URL（如 https://your-project.vercel.app）

### 步骤 3：测试

1. 访问部署的 URL
2. 上传测试文档：`上游车源-广州舶源（采购）.docx`
3. 填写表单并生成合同

---

## 选项 2：Leaflow 部署（如需私有部署）

### 前提条件
- Leaflow 账号
- Docker 环境

### 步骤 1：构建 Docker 镜像

```bash
cd E:\trae\0823合同3

# 创建 Dockerfile（如果没有）
# 见下方 Dockerfile 内容

# 构建镜像
docker build -t contract-system:latest .

# 标记镜像（替换为你的镜像仓库地址）
docker tag contract-system:latest registry.leaflow.net/your-username/contract-system:latest

# 推送镜像
docker push registry.leaflow.net/your-username/contract-system:latest
```

### 步骤 2：Leaflow 部署配置

创建 `leaflow-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: contract-system
  labels:
    app: contract-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: contract-system
  template:
    metadata:
      labels:
        app: contract-system
    spec:
      containers:
      - name: contract-system
        image: registry.leaflow.net/your-username/contract-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: contract-system
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: contract-system
```

### 步骤 3：部署到 Leaflow

```bash
# 登录 Leaflow
leaflow login

# 应用配置
leaflow apply -f leaflow-deployment.yaml

# 查看状态
leaflow get pods
leaflow get services
```

---

## 🔧 Dockerfile（Leaflow 部署需要）

```dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

---

## ⚡ 快速测试命令

### 测试 API 是否工作

```bash
# 测试解析 API
curl -X POST http://localhost:3000/api/local-docs/parse-template \
  -F "template=@上游车源-广州舶源（采购）.docx"

# 测试健康检查
curl http://localhost:3000/api/health/database
```

---

## 🎯 推荐方案

**强烈推荐使用 Vercel**：
- ✅ 零配置，开箱即用
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ✅ 免费额度充足
- ✅ 自动部署（推送代码即部署）

**使用 Leaflow 如果：**
- 需要私有化部署
- 有特殊网络要求
- 需要自定义基础设施

---

## 📞 获取帮助

- Vercel 文档: https://vercel.com/docs
- Leaflow 社区: QQ 群 582959600
- Next.js 文档: https://nextjs.org/docs

**部署成功后，记得更新环境变量中的 `NEXT_PUBLIC_APP_URL`！**
