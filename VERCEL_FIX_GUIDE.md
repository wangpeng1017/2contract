# 🚨 Vercel 部署修复指南

## 问题诊断结果

通过 Playwright 测试发现：
- ❌ `/api/auth/feishu` 返回 500 错误
- ❌ `/api/auth/me` 返回 401 错误（正常，用户未登录）
- ❌ 飞书登录功能无法正常工作

**根本原因：Vercel 部署环境中缺少必要的环境变量**

## 🔧 立即修复步骤

### 1. 配置 Vercel 环境变量

访问：https://vercel.com/dashboard
1. 选择项目 `0823-3contract`
2. 进入 `Settings` → `Environment Variables`
3. 添加以下环境变量：

```bash
# 飞书应用配置
FEISHU_APP_ID=cli_a8223aa97ffad013
FEISHU_APP_SECRET=buUtzUTcwsSrj4k9IB4zLeyb1g3rO4Fp
FEISHU_REDIRECT_URI=https://0823-3contract.vercel.app/api/auth/callback

# 应用基础配置
NEXT_PUBLIC_APP_URL=https://0823-3contract.vercel.app
NODE_ENV=production

# 安全配置
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
JWT_SECRET=Kv8+7X2mR9pL3nQ5wE8tY6uI0oP1aS2dF4gH7jK9lM=

# OCR服务配置（重要！）
GOOGLE_API_KEY=AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA
GEMINI_MODEL=gemini-1.5-flash
```

### 2. 配置飞书应用回调地址

访问：https://open.feishu.cn/
1. 找到应用 `cli_a8223aa97ffad013`
2. 在 `安全设置` → `重定向URL` 中添加：
   ```
   https://0823-3contract.vercel.app/api/auth/callback
   ```

### 3. 重新部署

在 Vercel 控制台中点击 `Redeploy` 重新部署应用。

## 🧪 验证修复

修复完成后，使用以下方法验证：

### 方法1：直接测试
访问：https://0823-3contract.vercel.app/
点击"使用飞书登录"按钮，应该能正常跳转到飞书授权页面。

### 方法2：环境变量检查
访问：https://0823-3contract.vercel.app/api/debug/env?key=debug-2024
检查环境变量是否正确配置。

### 方法3：Playwright 重新测试
运行 Playwright 测试脚本，验证登录功能是否正常。

## 📋 已完成的代码修复

我已经对代码进行了以下改进：

1. **改进错误处理**：
   - 在 `/api/auth/feishu` 中添加详细的日志记录
   - 提供更有用的错误信息和调试信息

2. **增强前端错误显示**：
   - 在 `useAuth` hook 中改进错误处理
   - 显示更详细的错误信息给用户

3. **添加调试工具**：
   - 创建 `/api/debug/env` 接口用于环境变量检查
   - 添加详细的日志记录

## ⚠️ 重要提醒

1. **环境变量必须在 Vercel 控制台配置**，本地的 `.env.local` 文件不会影响部署环境
2. **修改环境变量后必须重新部署**才能生效
3. **飞书应用的回调地址必须与部署地址完全一致**
4. **修复完成后建议移除调试接口**以确保安全

## 🎯 预期结果

修复完成后：
- ✅ 用户可以正常点击"使用飞书登录"
- ✅ 页面会跳转到飞书授权页面
- ✅ 授权后会回调到应用并完成登录
- ✅ 不再出现 500 服务器错误
