# 🚀 从 GitHub 一键部署（最简单方案）

## 为什么从 GitHub 部署？
✅ **更稳定** - 不依赖本地网络  
✅ **更简单** - 点击几下就完成  
✅ **自动化** - 推送代码自动部署  
✅ **统一** - Vercel 和 Leaflow 都支持  

---

## 步骤 1：推送代码到 GitHub（1分钟）

```powershell
# 查看当前状态
git status

# 添加所有文件
git add .

# 提交
git commit -m "feat: 添加部署配置

- 添加 backend/Dockerfile 和 Procfile
- 配置 next.config.js standalone 模式
- 添加 railway.json 配置
- 创建部署文档

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# 推送到 GitHub
git push origin main
```

---

## 步骤 2：Vercel 部署前端（2分钟）

### 方式 A：自动导入（推荐）

1. 访问：https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择你的 GitHub 仓库
4. Vercel 自动检测 Next.js 项目
5. 点击 "Deploy"

### 方式 B：手动配置

如果自动检测失败：
- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `prisma generate && npm run build`
- **Install Command**: `npm install`

### 配置环境变量

在 Vercel 项目设置中添加：
```
NEXT_PUBLIC_API_URL=https://你的leaflow域名.leaflow.app
```

---

## 步骤 3：Leaflow 部署后端（3分钟）

### 3.1 创建项目

1. 访问：https://leaflow.net/
2. 登录（使用 GitHub 账号）
3. 点击 "新建项目"
4. 项目名：`contract-system`

### 3.2 从 GitHub 部署

1. **新建服务**
   - 点击 "新建服务" → "从 Git 仓库"
   - 授权 Leaflow 访问 GitHub
   - 选择你的仓库

2. **配置服务**
   - **服务名称**: `backend`
   - **构建上下文**: `backend`（指定后端目录）
   - **Dockerfile 路径**: `Dockerfile`
   - **端口**: `8000`

3. **环境变量**
   
   点击 "环境变量"，添加以下内容：
   
   ```bash
   # 应用配置
   APP_ENV=production
   DEBUG=false
   
   # Gemini API（必需）
   GEMINI_API_KEY=你的Gemini密钥
   GEMINI_MODEL=gemini-2.0-flash-exp
   
   # JWT（必需 - 32位随机字符串）
   JWT_SECRET=随机生成32位字符串
   
   # CORS（必需 - 你的 Vercel 域名）
   CORS_ORIGINS=https://你的域名.vercel.app
   ```

4. **添加 PostgreSQL**
   - 点击 "添加" → "数据库" → "PostgreSQL"
   - Leaflow 自动创建并连接
   - `DATABASE_URL` 自动注入

5. **添加 Redis**（可选）
   - 点击 "添加" → "数据库" → "Redis"
   - `REDIS_URL` 自动注入

6. **部署**
   - 点击 "部署" 按钮
   - 等待构建完成（约2-3分钟）

### 3.3 获取 URL

部署成功后，在服务详情中找到：
- **公开 URL**: `https://backend-xxx.leaflow.app`

记录这个 URL，用于更新 Vercel 环境变量。

---

## 步骤 4：连接前后端（1分钟）

### 更新 Vercel 环境变量

1. 访问：https://vercel.com/dashboard
2. 选择你的项目
3. 进入 "Settings" → "Environment Variables"
4. 添加/更新：
   ```
   NEXT_PUBLIC_API_URL=https://backend-xxx.leaflow.app
   ```
5. 保存后触发重新部署：
   - 点击 "Deployments" 标签
   - 点击最新部署右侧的 "···" 
   - 选择 "Redeploy"

### 更新 Leaflow CORS

1. 在 Leaflow 后端服务中
2. 更新环境变量：
   ```
   CORS_ORIGINS=https://你的域名.vercel.app,http://localhost:3000
   ```
3. Leaflow 自动重新部署

---

## ✅ 测试部署

### 1. 测试后端
访问：`https://backend-xxx.leaflow.app/docs`

应该看到 FastAPI Swagger 文档界面。

### 2. 测试前端
访问：`https://你的域名.vercel.app`

### 3. 测试完整流程
1. 打开前端页面
2. 上传合同模板（.docx 文件）
3. 查看提取的变量
4. 填写表单
5. 生成并下载文档

---

## 📊 部署完成后的架构

```
用户浏览器
    ↓
Vercel (前端)
    ↓ HTTPS
Leaflow (后端 + PostgreSQL + Redis)
    ↓
Gemini API
```

**优势**：
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 自动扩容
- ✅ 零运维

---

## 🔧 后续优化

### 自动部署

**已启用**！推送到 GitHub main 分支自动触发部署：
- Vercel: 自动构建前端
- Leaflow: 自动构建后端

### 自定义域名

**Vercel**:
1. Settings → Domains
2. 添加你的域名
3. 配置 DNS CNAME 记录

**Leaflow**:
1. 服务详情 → 域名
2. 添加自定义域名
3. 配置 DNS

### 监控和日志

**Vercel**:
- Deployments → 查看构建日志
- Analytics → 查看访问统计

**Leaflow**:
- 服务详情 → 日志
- 实时查看应用日志

---

## ⚠️ 重要提示

### Gemini API Key 获取

1. 访问：https://makersuite.google.com/app/apikey
2. 创建 API Key
3. 复制密钥（只显示一次）
4. 添加到 Leafflow 环境变量

### JWT Secret 生成

```powershell
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

复制生成的 32 位字符串。

---

## 🆘 常见问题

### Q: Vercel 构建失败？
**A**: 检查构建日志：
- 确保 `prisma generate` 成功
- 确认 Node.js 版本兼容
- 检查依赖是否完整

### Q: Leaflow 构建失败？
**A**: 查看构建日志：
- 确保 `backend/Dockerfile` 存在
- 检查 `requirements.txt` 依赖
- 确认 Python 版本 3.11

### Q: 前端无法连接后端？
**A**: 检查：
- Vercel 环境变量 `NEXT_PUBLIC_API_URL` 是否正确
- Leaflow CORS 配置是否包含 Vercel 域名
- 后端健康检查：访问 `/health` 端点

### Q: 数据库连接失败？
**A**: 确认：
- PostgreSQL 服务已创建
- DATABASE_URL 已自动注入
- 后端和数据库在同一 Leaflow 项目中

---

## 🎯 成功检查清单

部署完成后，确认以下项目：

- [ ] 代码已推送到 GitHub
- [ ] Vercel 项目创建并部署成功
- [ ] Leaflow 项目创建
- [ ] Leaflow 后端服务部署成功
- [ ] PostgreSQL 数据库已添加
- [ ] 环境变量已全部配置
- [ ] 前端可以访问
- [ ] 后端 API 可以访问 (/docs)
- [ ] CORS 配置正确
- [ ] 上传文档功能正常
- [ ] 生成文档功能正常

---

**准备好了吗？** 开始第一步：推送代码到 GitHub！
