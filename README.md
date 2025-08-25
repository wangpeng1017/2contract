# 飞书合同内容更新助手

一款基于 Next.js 和飞书开放平台的 Web 应用，旨在简化和自动化更新飞书云文档（特别是合同范本）中的特定内容。

## 🚀 功能特性

### 核心功能
- **飞书 OAuth 2.0 认证** - 安全的用户身份验证和授权
- **智能文本替换** - 基于自定义规则的批量文本查找替换
- **OCR 截图识别** - 上传截图自动识别并提取文本信息
- **实时预览** - 替换操作前的结果预览
- **操作日志** - 完整的操作记录和审计追踪

### 技术特性
- **现代化技术栈** - Next.js 14 + TypeScript + Tailwind CSS
- **无服务器架构** - 基于 Vercel Serverless Functions
- **安全可靠** - 数据加密存储，权限严格控制
- **响应式设计** - 支持桌面端和移动端访问

## 🛠️ 技术架构

### 前端技术栈
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **表单处理**: React Hook Form + Zod
- **UI组件**: Lucide React Icons

### 后端技术栈
- **运行时**: Node.js (Vercel Serverless Functions)
- **数据库**: Vercel Postgres
- **文件存储**: Vercel Blob
- **缓存**: Vercel KV (Redis)

### 第三方服务
- **认证**: 飞书开放平台 OAuth 2.0
- **文档API**: 飞书云文档 API
- **OCR服务**: Tesseract.js + 百度OCR API
- **部署平台**: Vercel

## 📦 安装和运行

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd feishu-contract-helper
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **配置环境变量**
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入必要的配置信息：
- 飞书开放平台应用配置
- 数据库连接字符串
- Vercel 存储服务配置
- 加密密钥等

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产部署

1. **部署到 Vercel**
```bash
npm run build
vercel --prod
```

2. **配置环境变量**
在 Vercel 控制台中配置生产环境的环境变量。

## 🔧 配置说明

### 飞书开放平台配置

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置回调地址：`https://your-domain.com/api/auth/callback`
5. 开启云文档相关权限

### 数据库配置

项目使用 Vercel Postgres 作为数据库，需要：
1. 在 Vercel 控制台创建 Postgres 数据库
2. 获取数据库连接字符串
3. 运行数据库迁移脚本

### 存储配置

使用 Vercel Blob 存储上传的图片文件：
1. 在 Vercel 控制台启用 Blob 存储
2. 获取访问令牌
3. 配置相关环境变量

## 📚 使用指南

### 基本使用流程

1. **用户认证**
   - 点击登录按钮
   - 跳转到飞书授权页面
   - 完成授权后返回应用

2. **选择文档**
   - 输入飞书文档链接
   - 系统验证文档有效性和访问权限

3. **设置更新方式**
   
   **方式一：自定义指令**
   - 添加替换规则（查找内容 → 替换内容）
   - 支持多个规则批量执行
   - 可设置匹配选项（大小写敏感、全词匹配等）

   **方式二：OCR截图识别**
   - 上传包含新信息的截图
   - 系统自动识别文字内容
   - 智能提取结构化信息并生成替换规则

4. **执行更新**
   - 预览替换结果
   - 确认后执行文档更新
   - 查看操作结果和日志

### 高级功能

- **批量替换**: 支持一次性执行多个替换规则
- **智能匹配**: 支持精确匹配和模糊匹配
- **操作回滚**: 记录操作历史，支持查看和分析
- **权限控制**: 严格的用户权限验证和访问控制

## 🔒 安全说明

### 数据安全
- 所有敏感数据采用 AES-256 加密存储
- access_token 安全管理，定期刷新
- 环境变量管理敏感配置，不在代码中硬编码

### 访问控制
- 基于飞书 OAuth 2.0 的用户身份验证
- API 访问频率限制
- 文档访问权限严格检查

### 数据传输
- 全站 HTTPS 强制加密
- API 请求签名验证
- 跨域请求严格控制

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e

# 代码覆盖率
npm run test:coverage
```

## 📝 开发规范

### 代码规范
- 使用 ESLint + Prettier 进行代码格式化
- TypeScript 严格模式
- 遵循 Git 提交规范

### 目录结构
```
src/
├── app/                 # Next.js App Router 页面
├── components/          # React 组件
├── lib/                # 工具库和配置
├── types/              # TypeScript 类型定义
├── hooks/              # 自定义 React Hooks
├── services/           # API 服务层
└── utils/              # 通用工具函数
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [使用文档](docs/)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)

## 🙏 致谢

感谢以下开源项目和服务：
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [飞书开放平台](https://open.feishu.cn/)
- [Vercel](https://vercel.com/)

---

**飞书合同内容更新助手** - 让文档更新更简单、更高效！
