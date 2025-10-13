# 🚀 第二步：Vercel 部署前端

## 📋 操作步骤（约 2 分钟）

### 1. 访问 Vercel

打开浏览器，访问：
```
https://vercel.com/new
```

### 2. 导入 Git 仓库

1. **登录** Vercel（使用 GitHub 账号）
2. 点击 **"Import Git Repository"** 或 **"Add New..."** → **"Project"**
3. 如果首次使用，点击 **"Install Vercel for GitHub"**
4. 授权 Vercel 访问你的 GitHub 仓库

### 3. 选择仓库

在仓库列表中找到：
```
wangpeng1017/2contract
```

点击 **"Import"**

### 4. 配置项目（自动检测）

Vercel 会自动检测到 Next.js 项目，配置如下：

- **Framework Preset**: Next.js
- **Root Directory**: `./` (默认)
- **Build Command**: `npm run build` (或使用 vercel.json 中的配置)
- **Output Directory**: `.next` (默认)
- **Install Command**: `npm install`

**这些都会自动填充，无需修改！**

### 5. 配置环境变量（重要！）

点击 **"Environment Variables"** 展开，添加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

**注意**：这是临时值，等 Leaflow 后端部署完成后我们会更新它。

### 6. 部署

点击 **"Deploy"** 按钮

等待 2-3 分钟，Vercel 会：
- ✅ 从 GitHub 拉取代码
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 部署到全球 CDN

### 7. 获取 URL

部署成功后，你会看到：
```
🎉 Congratulations!

Your project is live at:
https://2contract-xxx.vercel.app
```

**复制这个 URL**，我们后面会用到！

---

## ✅ 完成检查

- [ ] 能访问 Vercel 前端 URL
- [ ] 页面正常显示（即使后端未连接）
- [ ] 记录了前端 URL

---

## 🆘 常见问题

### Q: 找不到仓库？
**A**: 
1. 确保已授权 Vercel 访问 GitHub
2. 在 GitHub 中检查仓库是否公开或已授权
3. 刷新 Vercel 页面重试

### Q: 构建失败？
**A**: 查看构建日志：
- 检查 `package.json` 依赖是否完整
- 确认 `next.config.js` 配置正确
- 查看错误信息具体原因

### Q: 部署成功但页面报错？
**A**: 正常！因为后端还没部署，等完成后端部署后就好了。

---

## ⏭️ 下一步

**完成后告诉我**：
```
已部署到 Vercel，URL 是：https://your-url.vercel.app
```

然后我会继续第三步：Leaflow 部署后端！ 🚀
