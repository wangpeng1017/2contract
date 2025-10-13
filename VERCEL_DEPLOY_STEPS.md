# 📦 Vercel 部署完整指南

## 当前状态
✅ 代码已提交到 GitHub: `https://github.com/wangpeng1017/0823--3`
✅ 提交 ID: `808e3b1`

---

## 🚀 3 分钟部署步骤

### 步骤 1：登录 Vercel
1. 打开 https://vercel.com/login
2. 点击 **"Continue with GitHub"**
3. 授权 Vercel 访问你的 GitHub 账号

### 步骤 2：导入项目
1. 登录后访问 https://vercel.com/new
2. 在 "Import Git Repository" 搜索框中输入：`0823--3`
3. 找到你的仓库后，点击 **"Import"**

### 步骤 3：配置项目
在配置页面：
- **Framework Preset**: 自动检测为 Next.js ✅
- **Root Directory**: `.` (默认即可)
- **Build Command**: `npm run build` (默认即可)
- **Output Directory**: `.next` (默认即可)

**环境变量（可选）**：
- 基础功能无需配置，直接跳过
- 如需数据库功能，稍后在项目设置中添加

### 步骤 4：部署
1. 点击 **"Deploy"** 按钮
2. 等待 2-3 分钟（首次部署会慢一些）
3. 看到 🎉 恭喜页面即部署成功！

### 步骤 5：测试
部署成功后，Vercel 会分配一个 URL，如：
```
https://0823-3-xxxx.vercel.app
```

**测试步骤**：
1. 点击 "Visit" 访问网站
2. 上传测试文档：`E:\trae\0823合同3\上游车源-广州舶源（采购）.docx`
3. 应该能看到解析出 29 个字段
4. 填写表单并生成合同

---

## 🔧 可能遇到的问题

### 问题 1：构建失败
**原因**：Node.js 版本不匹配
**解决**：
1. 进入项目设置（Settings）
2. 选择 "General" → "Node.js Version"
3. 选择 `18.x` 或 `20.x`
4. 点击 "Redeploy"

### 问题 2：部署成功但页面报错
**原因**：环境变量未配置
**解决**：
1. 进入项目设置（Settings）
2. 选择 "Environment Variables"
3. 添加必需的环境变量（见下方）
4. 点击 "Redeploy"

### 必需的环境变量
```bash
# 基础运行（无需配置，使用默认值）
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app  # Vercel 自动配置

# 如需数据库功能（可选）
DATABASE_URL=postgres://...  # 从 Vercel Storage 获取
POSTGRES_PRISMA_URL=postgres://...

# 如需飞书集成（可选）
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxx
```

---

## 📊 部署后续步骤

### 1. 绑定自定义域名（可选）
1. 进入项目设置 → "Domains"
2. 添加你的域名（如 `contract.yourdomain.com`）
3. 按照提示配置 DNS 记录

### 2. 配置 Vercel Storage（如需数据库）
1. 进入 Vercel 项目页面
2. 点击 "Storage" 标签
3. 创建 Postgres 数据库
4. 自动生成的环境变量会添加到项目中

### 3. 查看部署日志
- 访问 https://vercel.com/dashboard
- 选择你的项目
- 点击 "Deployments" 查看所有部署记录
- 点击任意部署可查看详细日志

### 4. 监控和分析
- **Analytics**: 查看访问统计
- **Logs**: 实时查看运行日志
- **Speed Insights**: 性能分析

---

## 🎯 快速链接

| 功能 | 链接 |
|------|------|
| Vercel 控制台 | https://vercel.com/dashboard |
| 新建项目 | https://vercel.com/new |
| 文档 | https://vercel.com/docs |
| GitHub 仓库 | https://github.com/wangpeng1017/0823--3 |

---

## ✅ 检查清单

部署前：
- [x] 代码已提交到 GitHub
- [x] GitHub 仓库可访问
- [x] 已登录 Vercel 账号

部署后：
- [ ] 访问分配的 URL 能正常打开
- [ ] 上传测试文档能成功解析
- [ ] 表单能正常填写
- [ ] 能成功生成和下载合同

---

## 💡 最佳实践

### 自动部署
- 每次 `git push` 到 `main` 分支，Vercel 会自动重新部署
- 开发分支可以创建预览部署

### 环境管理
- Production（生产）：`main` 分支
- Preview（预览）：其他分支
- Development（开发）：本地环境

### 性能优化
- Vercel 自动启用 CDN 和压缩
- 图片自动优化（Next.js Image 组件）
- 边缘缓存自动配置

---

## 📞 获取帮助

- **Vercel 支持**: https://vercel.com/help
- **Next.js 文档**: https://nextjs.org/docs
- **项目问题**: 提交 GitHub Issue

---

**部署成功后，请分享你的 Vercel URL，我来帮你测试！** 🎉
