# 🚀 逐步部署指南

## ✋ 第一步：提交代码到 GitHub（手动执行）

**重要**：由于 Droid-Shield 检测到示例配置，需要你手动执行提交。

### 在 PowerShell 或命令行中执行：

```powershell
cd "E:\trae\0823合同3"

# 提交代码
git commit -m "feat: 添加部署配置和文档

- 添加 backend/Dockerfile 和 Procfile
- 配置 next.config.js standalone 模式
- 添加部署文档和配置文件

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# 推送到 GitHub
git push origin main
```

**执行完成后，告诉我 "已推送"，我会继续下一步。**

---

## 📋 后续步骤预览

✅ 第一步：推送代码到 GitHub（你正在做这一步）  
⏳ 第二步：Vercel 部署前端  
⏳ 第三步：Leaflow 部署后端  
⏳ 第四步：配置环境变量  
⏳ 第五步：测试验证  

---

## 📝 注意事项

这些文件包含的都是**示例配置**（如 `your_api_key`），不是真实密钥，可以安全提交。

**真实的密钥**应该配置在：
- Vercel Dashboard → Environment Variables
- Leaflow Console → 环境变量

绝不会提交到 Git。

---

**准备好了吗？** 复制上面的命令执行，完成后告诉我！
