# ⚡ 快速部署方案（无需 Docker）

## 方案：Vercel（前端）+ Railway（后端）

### 为什么选这个方案？
- ✅ **无需安装 Docker**
- ✅ **免费额度充足**
- ✅ **5分钟完成部署**
- ✅ **自动 HTTPS**
- ✅ **Git 推送自动部署**

---

## 第一步：部署后端到 Railway（2分钟）

### 1.1 注册 Railway
访问：https://railway.app/
- 使用 GitHub 账号登录
- 免费 $5/月 额度（足够测试）

### 1.2 创建项目
```bash
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测到 Python 项目
```

### 1.3 配置环境变量
在 Railway 项目中点击 "Variables"，添加：
```
GEMINI_API_KEY=你的API密钥
JWT_SECRET=随机32位字符串
DATABASE_URL=postgresql://...（Railway自动提供）
PORT=8000
```

### 1.4 添加 PostgreSQL
```bash
1. 点击 "New" → "Database" → "PostgreSQL"
2. Railway 自动连接数据库
3. DATABASE_URL 自动注入
```

### 1.5 部署
```bash
# Railway 自动检测 backend/ 目录
# 如果没有，添加启动命令：
uvicorn main:app --host 0.0.0.0 --port $PORT
```

✅ **后端部署完成！** 记下 Railway 提供的 URL，如：
`https://your-app.railway.app`

---

## 第二步：部署前端到 Vercel（2分钟）

### 2.1 安装 Vercel CLI
```powershell
npm install -g vercel
```

### 2.2 登录
```powershell
vercel login
```

### 2.3 部署
```powershell
cd "E:\trae\0823合同3"
vercel --prod
```

### 2.4 配置环境变量
在 Vercel Dashboard 中设置：
```
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

✅ **前端部署完成！** Vercel 提供 URL：
`https://your-app.vercel.app`

---

## 第三步：更新 CORS（1分钟）

修改后端 `backend/config.py` 的 CORS 配置：
```python
CORS_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:3000",
]
```

推送代码，Railway 自动重新部署。

---

## 完成！🎉

**访问地址：**
- 前端：https://your-app.vercel.app
- 后端 API：https://your-app.railway.app/docs

**总耗时：约 5 分钟**

---

## 备选方案：Render（如果 Railway 不可用）

1. 访问：https://render.com/
2. 创建 "New Web Service"
3. 连接 GitHub
4. 选择仓库的 `backend/` 目录
5. 构建命令：`pip install -r requirements.txt`
6. 启动命令：`uvicorn main:app --host 0.0.0.0 --port $PORT`
7. 添加环境变量（同上）
8. 添加 PostgreSQL（Render 免费提供）

---

## 需要的文件修改

### backend/Procfile（Railway 需要）
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### runtime.txt（指定 Python 版本）
```
python-3.11
```

---

## 立即开始？

选择你的方案：
1. **推荐**：Railway（免费 $5/月，够用）
2. **备选**：Render（完全免费，但较慢）

需要我创建配置文件吗？输入 `yes` 继续。
