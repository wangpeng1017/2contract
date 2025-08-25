# API密钥安全管理指南

## 🔐 安全原则

### 核心安全规则
1. **永远不要将API密钥提交到Git仓库**
2. **使用环境变量存储所有敏感信息**
3. **定期轮换API密钥**
4. **限制API密钥的访问权限**
5. **监控API密钥的使用情况**

## 📁 文件安全配置

### .gitignore 配置
项目已配置以下文件被Git忽略：
```
# 🔐 CRITICAL: Environment files containing API keys and secrets
.env*.local
.env
.env.development
.env.production
.env.staging
.env.test
```

### 环境变量文件结构
```
.env.example          # 模板文件，可以提交到Git
.env.local           # 本地开发环境，包含真实密钥，不提交
.env.production      # 生产环境配置，不提交
.env.staging         # 测试环境配置，不提交
```

## 🔑 API密钥管理

### 当前配置的密钥
```bash
# Google Gemini Vision API
GOOGLE_API_KEY=AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA
GEMINI_MODEL=gemini-1.5-flash
```

### 密钥安全检查清单
- [x] 密钥已配置在 `.env.local` 文件中
- [x] `.env.local` 已添加到 `.gitignore`
- [x] 密钥不会出现在代码中
- [x] 使用 `process.env.GOOGLE_API_KEY` 读取密钥

## 🚨 代码提交前安全检查

### 自动检查脚本
创建 `scripts/security-check.js`：
```javascript
const fs = require('fs');
const path = require('path');

// 检查是否有敏感信息泄露
function checkForSecrets() {
  const sensitivePatterns = [
    /AIza[0-9A-Za-z-_]{35}/g,  // Google API Key
    /sk-[a-zA-Z0-9]{48}/g,     // OpenAI API Key
    /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, // Slack Bot Token
  ];
  
  // 检查所有 .ts, .js, .tsx, .jsx 文件
  // 实现检查逻辑...
}
```

### Git Pre-commit Hook
在 `package.json` 中添加：
```json
{
  "scripts": {
    "pre-commit": "node scripts/security-check.js",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "node scripts/security-check.js",
      "eslint --fix",
      "git add"
    ]
  }
}
```

## 👥 团队协作安全

### 密钥共享方式
1. **不要通过聊天工具发送密钥**
2. **使用密钥管理工具**：
   - 1Password
   - Bitwarden
   - HashiCorp Vault
   - AWS Secrets Manager

3. **环境变量模板**：
   ```bash
   # 团队成员操作步骤
   cp .env.example .env.local
   # 然后填入从安全渠道获取的真实密钥
   ```

### 生产环境部署
```bash
# Vercel 部署时在控制台设置环境变量
# 不要在代码中硬编码生产环境密钥
```

## 🔍 密钥泄露应急处理

### 如果密钥意外泄露：
1. **立即撤销泄露的密钥**
2. **生成新的API密钥**
3. **更新所有环境的配置**
4. **检查Git历史记录**
5. **通知团队成员**

### Git历史清理（如果密钥已提交）
```bash
# 使用 git-filter-branch 清理历史
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送（谨慎操作）
git push origin --force --all
```

## 📊 监控和审计

### API使用监控
```typescript
// 在代码中添加使用量监控
async function recordAPIUsage(apiKey: string, endpoint: string, cost: number) {
  // 记录API调用次数和成本
  console.log(`API Usage: ${endpoint}, Cost: ${cost}`);
}
```

### 定期安全审计
- 每月检查API密钥使用情况
- 审查访问日志
- 更新过期的密钥
- 检查权限设置

## 🛡️ 最佳实践总结

### 开发环境
1. 使用 `.env.local` 存储密钥
2. 确保 `.gitignore` 正确配置
3. 定期检查代码中是否有硬编码密钥

### 生产环境
1. 使用平台环境变量（Vercel、AWS等）
2. 启用API密钥访问限制
3. 设置使用量告警
4. 定期轮换密钥

### 代码规范
```typescript
// ✅ 正确方式
const apiKey = process.env.GOOGLE_API_KEY;

// ❌ 错误方式
const apiKey = "AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA";
```

### 错误处理
```typescript
// 安全的错误处理，不暴露密钥信息
try {
  await callAPI(apiKey);
} catch (error) {
  console.error('API call failed:', error.message); // 不记录完整错误对象
}
```

## 🔧 工具推荐

### 密钥检测工具
- **truffleHog**: 检测Git历史中的密钥
- **git-secrets**: AWS开源的密钥检测工具
- **detect-secrets**: Yelp开源的密钥检测工具

### 环境管理工具
- **dotenv**: Node.js环境变量管理
- **cross-env**: 跨平台环境变量设置
- **env-cmd**: 从文件加载环境变量

记住：**安全是一个持续的过程，不是一次性的设置！**
