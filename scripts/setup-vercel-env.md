# Vercel 环境变量配置指南

## 问题诊断
当前部署在 Vercel 上的应用出现 500 错误，原因是环境变量未正确配置。

## 解决步骤

### 1. 在 Vercel 控制台配置环境变量

访问：https://vercel.com/dashboard → 选择项目 `0823-3contract` → Settings → Environment Variables

添加以下环境变量：

```bash
# 飞书应用配置
FEISHU_APP_ID=cli_a8223aa97ffad013
FEISHU_APP_SECRET=buUtzUTcwsSrj4k9IB4zLeyb1g3rO4Fp
FEISHU_REDIRECT_URI=https://0823-3contract.vercel.app/api/auth/callback

# 应用配置
NEXT_PUBLIC_APP_URL=https://0823-3contract.vercel.app
NODE_ENV=production

# 安全配置
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
JWT_SECRET=Kv8+7X2mR9pL3nQ5wE8tY6uI0oP1aS2dF4gH7jK9lM=

# 数据库配置
DATABASE_URL=postgres://806482134ac2e0447d795bd0b41bcc744a3e62d74f387b198fd508f496967eea:sk_8WdVKiefKzLcnyekJr1JM@db.prisma.io:5432/?sslmode=require
POSTGRES_PRISMA_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza184V2RWS2llZkt6TGNueWVrSnIxSk0iLCJhcGlfa2V5IjoiMDFLM0ZKSzdTNzBWRU5QRERCREhKM1FERlkiLCJ0ZW5hbnRfaWQiOiI4MDY0ODIxMzRhYzJlMDQ0N2Q3OTViZDBiNDFiY2M3NDRhM2U2MmQ3NGYzODdiMTk4ZmQ1MDhmNDk2OTY3ZWVhIiwiaW50ZXJuYWxfc2VjcmV0IjoiZTRkZTllZDctOTA1ZS00Yzc0LWE0ZWEtZWUxZjU0YmZiZmM4In0.85dsGc3jdJoJLIokWg_cpVnS9USsqI4osdYqoDHqJK8
POSTGRES_URL_NON_POOLING=postgres://806482134ac2e0447d795bd0b41bcc744a3e62d74f387b198fd508f496967eea:sk_8WdVKiefKzLcnyekJr1JM@db.prisma.io:5432/?sslmode=require

# 存储配置
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_tHr9Xw1l01rVDRzF_76md4NrkKV6UDCKuLeCyFWVV9xN5vM

# OCR 配置
GOOGLE_API_KEY=AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA
GEMINI_MODEL=gemini-1.5-flash
```

### 2. 飞书应用配置

1. 访问：https://open.feishu.cn/
2. 找到应用：`cli_a8223aa97ffad013`
3. 在 `安全设置` → `重定向URL` 中添加：
   ```
   https://0823-3contract.vercel.app/api/auth/callback
   ```

### 3. 重新部署

配置完环境变量后，在 Vercel 控制台中点击 `Redeploy` 重新部署应用。

### 4. 验证配置

部署完成后，访问以下URL验证配置：
- 主页：https://0823-3contract.vercel.app/
- 环境检查（开发模式）：https://0823-3contract.vercel.app/api/debug/env

## 常见问题

### Q: 为什么本地可以运行但部署后出错？
A: Vercel 部署环境与本地环境是分离的，需要在 Vercel 控制台单独配置环境变量。

### Q: 如何确认环境变量是否生效？
A: 重新部署后，检查应用日志或使用调试接口验证。

### Q: 飞书回调地址配置错误怎么办？
A: 确保飞书应用中的回调地址与 FEISHU_REDIRECT_URI 完全一致。

## 注意事项

1. 所有环境变量都必须在 Vercel 控制台中配置
2. 修改环境变量后必须重新部署
3. 生产环境的 URL 必须使用 HTTPS
4. 确保飞书应用的回调地址与部署地址一致
