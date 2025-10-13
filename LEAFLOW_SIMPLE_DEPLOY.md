# 🚀 Leaflow 简化部署方案（无需本地 Docker）

## 方案：GitHub → Leaflow 自动构建

Leaflow 支持从 GitHub 直接构建部署，无需本地 Docker！

---

## 步骤 1：推送代码到 GitHub

```powershell
cd "E:\trae\0823合同3"

# 添加所有文件
git add .

# 提交
git commit -m "feat: 准备 Leaflow 部署配置

- 添加 backend/Dockerfile
- 添加 railway.json 和 Procfile
- 配置 next.config.js standalone 模式

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# 推送到 GitHub
git push origin main
```

---

## 步骤 2：在 Leaflow 创建项目（3分钟）

### 2.1 注册登录
1. 访问：https://leaflow.net/
2. 使用 GitHub 账号登录

### 2.2 创建项目
1. 点击 "新建项目" 或 "New Project"
2. 项目名称：`contract-system`
3. 选择地区：选择离你最近的区域
4. 点击 "创建"

### 2.3 从 GitHub 部署后端

1. **连接 GitHub**
   - 在项目中点击 "新建服务" 或 "New Service"
   - 选择 "从 Git 仓库部署"
   - 授权 Leaflow 访问你的 GitHub
   - 选择你的仓库

2. **配置构建**
   - **名称**：`contract-backend`
   - **构建目录**：`backend`
   - **Dockerfile 路径**：`backend/Dockerfile`
   - **端口**：`8000`

3. **添加环境变量**
   点击 "环境变量"，添加：
   ```
   APP_ENV=production
   DEBUG=false
   GEMINI_API_KEY=你的Gemini密钥
   JWT_SECRET=随机32位字符串
   CORS_ORIGINS=https://你的vercel域名.vercel.app
   ```

4. **添加数据库**
   - 点击 "添加服务" → "PostgreSQL"
   - Leaflow 自动创建并连接数据库
   - `DATABASE_URL` 自动注入到后端

5. **添加 Redis（可选）**
   - 点击 "添加服务" → "Redis"
   - 自动连接

6. **部署**
   - 点击 "部署" 按钮
   - Leaflow 自动从 GitHub 拉取代码
   - 自动构建 Docker 镜像
   - 自动部署运行

---

## 步骤 3：获取后端 URL

部署完成后：
1. 在 Leaflow 项目中找到 `contract-backend` 服务
2. 查看 "域名" 或 "Domains"
3. 记录 URL，如：`https://contract-backend-xxx.leaflow.app`

---

## 步骤 4：更新前端环境变量

### 在 Vercel Dashboard 配置：

1. 访问：https://vercel.com/dashboard
2. 选择你的项目
3. 进入 "Settings" → "Environment Variables"
4. 添加或更新：
   ```
   NEXT_PUBLIC_API_URL=https://contract-backend-xxx.leaflow.app
   ```
5. 点击 "Save"
6. 触发重新部署：
   ```powershell
   vercel --prod
   ```

---

## 步骤 5：更新后端 CORS（重要！）

在 Leaflow 后端服务中更新环境变量：
```
CORS_ORIGINS=https://你的vercel域名.vercel.app
```

然后重新部署后端（Leaflow 会自动重新部署）。

---

## ✅ 完成！测试访问

### 前端
访问：`https://你的域名.vercel.app`

### 后端 API
访问：`https://contract-backend-xxx.leaflow.app/docs`

### 测试流程
1. 打开前端页面
2. 上传合同模板（.docx）
3. 填写表单
4. 生成并下载文档

---

## 🔧 Leaflow 的优势

✅ **无需本地 Docker** - 云端自动构建  
✅ **GitHub 集成** - 推送代码自动部署  
✅ **内置数据库** - PostgreSQL 开箱即用  
✅ **自动 HTTPS** - 免费 SSL 证书  
✅ **日志监控** - 实时查看应用日志  

---

## 📊 资源配置建议

### 免费/测试环境
- **后端**：0.5 CPU / 1GB RAM
- **PostgreSQL**：512MB RAM / 5GB 存储
- **Redis**：256MB RAM

### 生产环境
- **后端**：2 CPU / 4GB RAM（3副本）
- **PostgreSQL**：2GB RAM / 20GB 存储
- **Redis**：512MB RAM

---

## 🆘 常见问题

### Q: GitHub 连接失败？
**A**: 检查 Leaflow 的 GitHub 授权，确保仓库访问权限正确。

### Q: 构建失败？
**A**: 查看 Leaflow 的构建日志：
- 进入服务详情
- 点击 "构建历史" 或 "Build Logs"
- 检查错误信息

### Q: 数据库连接失败？
**A**: 确认：
- PostgreSQL 服务已创建
- DATABASE_URL 已自动注入
- 后端服务和数据库在同一项目中

### Q: CORS 错误？
**A**: 更新后端环境变量：
```
CORS_ORIGINS=https://你的vercel域名.vercel.app,http://localhost:3000
```

---

## 🎯 下一步优化

部署成功后，可以：

1. **配置自定义域名**
   - 在 Leaflow 中绑定你的域名
   - 配置 DNS CNAME 记录

2. **启用自动部署**
   - GitHub 推送自动触发部署
   - 支持 CI/CD 流程

3. **监控和日志**
   - 查看实时日志
   - 配置告警通知

4. **扩容**
   - 根据流量调整资源
   - 增加副本数量

---

## 📞 需要帮助？

- **Leaflow 文档**：https://docs.leaflow.net/
- **Leaflow 社区**：QQ 群 582959600
- **技术支持**：support@leaflow.net

---

**准备好了吗？** 按照步骤操作，5分钟完成部署！🚀
