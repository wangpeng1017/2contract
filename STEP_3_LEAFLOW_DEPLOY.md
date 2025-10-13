# 🐳 第三步：Leaflow 部署后端

## 📋 操作步骤（约 5 分钟）

### 1. 访问 Leaflow

打开浏览器，访问：
```
https://leaflow.net/
```

### 2. 注册/登录

1. 点击 **"登录"** 或 **"Sign In"**
2. 建议使用 **GitHub 账号**登录（快速）
3. 首次登录会要求完善信息

### 3. 创建项目

1. 点击 **"新建项目"** 或 **"New Project"**
2. **项目名称**: `contract-system`
3. **选择区域**: 选择离你最近的（如：华东、华南）
4. 点击 **"创建"**

### 4. 新建后端服务

1. 进入项目后，点击 **"新建服务"** 或 **"New Service"**
2. 选择 **"从 Git 仓库"** 或 **"Deploy from Git"**

### 5. 连接 GitHub

1. 如果首次使用，点击 **"连接 GitHub"** 或 **"Connect GitHub"**
2. 授权 Leaflow 访问你的 GitHub 仓库
3. 选择仓库：**`wangpeng1017/2contract`**

### 6. 配置构建设置

**基本配置**：
- **服务名称**: `backend` 或 `contract-backend`
- **分支**: `main`
- **构建上下文**: `backend` （⚠️ 重要！指定后端目录）
- **Dockerfile 路径**: `Dockerfile` （在 backend 目录下）
- **端口**: `8000`

**如果没有"构建上下文"选项**，看是否有：
- **根目录**: 填 `backend`
- **工作目录**: 填 `backend`

### 7. 添加环境变量（⚠️ 重要）

点击 **"环境变量"** 或 **"Environment Variables"**，添加：

#### 必需的环境变量：

```bash
# 应用环境
APP_ENV=production
DEBUG=false

# Gemini API（必需 - 替换为你的真实密钥）
GEMINI_API_KEY=AIza...你的Gemini密钥
GEMINI_MODEL=gemini-2.0-flash-exp

# JWT 密钥（必需 - 生成32位随机字符串）
JWT_SECRET=随机生成的32位字符串

# CORS（必需 - 填写你的 Vercel 域名）
CORS_ORIGINS=https://你的vercel域名.vercel.app
```

#### 如何生成 JWT_SECRET（32位随机字符串）：

**PowerShell**：
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**或者在线生成**：
```
https://www.random.org/strings/
长度: 32, 字符集: Alphanumeric
```

#### 如何获取 Gemini API Key：

1. 访问：https://makersuite.google.com/app/apikey
2. 点击 **"Create API Key"**
3. 复制生成的密钥（形如：`AIzaSy...`）

### 8. 添加 PostgreSQL 数据库

1. 在项目中，点击 **"添加"** → **"数据库"** → **"PostgreSQL"**
2. Leaflow 自动创建数据库
3. **DATABASE_URL** 会自动注入到后端服务

**⚠️ 重要**：确保数据库和后端服务在同一项目中！

### 9. 添加 Redis（可选但推荐）

1. 点击 **"添加"** → **"数据库"** → **"Redis"**
2. **REDIS_URL** 自动注入

### 10. 部署

1. 确认所有配置正确
2. 点击 **"部署"** 或 **"Deploy"** 按钮
3. Leaflow 开始：
   - ✅ 从 GitHub 拉取代码
   - ✅ 构建 Docker 镜像（约 2-3 分钟）
   - ✅ 启动容器
   - ✅ 运行健康检查

### 11. 查看部署状态

在服务详情页面：
- **状态**: 应该显示 **"Running"** 或 **"运行中"**
- **日志**: 点击查看实时日志
- **构建**: 查看构建历史

### 12. 获取后端 URL

部署成功后，找到 **"域名"** 或 **"Domains"**：
```
https://backend-xxx.leaflow.app
或
https://contract-backend-xxx.leaflow.app
```

**测试后端**：访问 API 文档
```
https://你的域名.leaflow.app/docs
```

应该看到 FastAPI Swagger UI 界面！

---

## ✅ 完成检查

- [ ] Leaflow 服务状态为 "Running"
- [ ] PostgreSQL 数据库已添加
- [ ] 环境变量已全部配置
- [ ] 能访问 `/docs` 看到 API 文档
- [ ] 记录了后端 URL

---

## 🆘 常见问题

### Q: 构建失败 - 找不到 Dockerfile？
**A**: 检查"构建上下文"是否设置为 `backend`

### Q: 启动失败 - 数据库连接错误？
**A**: 
1. 确认 PostgreSQL 已添加
2. 检查 DATABASE_URL 是否自动注入
3. 查看服务日志了解详细错误

### Q: 环境变量在哪里看？
**A**: 服务详情 → 设置 → 环境变量

### Q: 如何查看日志？
**A**: 服务详情 → 日志 → 实时日志

### Q: 健康检查失败？
**A**: 
1. 检查端口是否设置为 8000
2. 确认后端启动成功（查看日志）
3. 访问 `/health` 端点测试

---

## ⏭️ 下一步

**完成后告诉我**：
```
已部署到 Leaflow，后端 URL 是：https://backend-xxx.leaflow.app
```

然后我会帮你：
1. 更新 Vercel 环境变量（连接后端）
2. 更新 Leaflow CORS 配置
3. 测试完整功能

继续加油！ 🚀
