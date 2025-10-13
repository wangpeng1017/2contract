# 🚀 立即部署到 Leaflow

## 快速概览

你的项目已经完全准备好部署了！所有必需的配置文件已创建：

```
✅ Dockerfile (前端)
✅ backend/Dockerfile (后端)  
✅ docker-compose.yml (本地测试)
✅ leaflow-deployment.yaml (Leaflow 部署)
✅ deploy.sh (自动部署脚本)
✅ LEAFLOW_DEPLOY.md (详细文档)
```

---

## 🎯 三种部署方式（选一种）

### 方式 1：自动部署脚本（最简单）⭐

```bash
# Windows PowerShell
cd E:\trae\0823合同3
bash deploy.sh
```

脚本会自动完成：
1. 登录 Leaflow 镜像仓库
2. 构建前后端镜像
3. 推送镜像
4. 创建 Secrets
5. 部署到 Leaflow

### 方式 2：Docker Compose 本地测试（推荐先测试）

```bash
# 1. 创建 .env 文件
echo "GEMINI_API_KEY=your_actual_key" > .env
echo "JWT_SECRET=your_random_32_chars" >> .env

# 2. 启动所有服务
docker-compose up -d

# 3. 访问测试
# 前端: http://localhost:3000
# 后端: http://localhost:8000/docs
# MinIO: http://localhost:9001

# 4. 查看日志
docker-compose logs -f

# 5. 测试通过后停止
docker-compose down
```

### 方式 3：手动部署到 Leaflow

详见 `LEAFLOW_DEPLOY.md` 完整文档

---

## ⚡ 最快速部署（5分钟）

如果你已经有：
- Leaflow 账号
- Gemini API Key
- kubectl 已配置

直接运行：

```bash
# 一键部署
./deploy.sh

# 按提示输入：
# - Leaflow 用户名
# - 域名前缀 (如 myapp)
# - Gemini API Key
# - 密码设置
```

---

## 📋 部署前检查清单

```bash
# 1. 检查 Docker
docker --version

# 2. 检查 kubectl
kubectl version --client

# 3. 检查 Leaflow 连接
kubectl get nodes

# 4. 检查文件完整性
ls -l Dockerfile backend/Dockerfile docker-compose.yml leafflow-deployment.yaml
```

---

## 🔑 需要准备的信息

| 项目 | 说明 | 获取方式 |
|------|------|----------|
| Leaflow 用户名 | 你的账号 | https://leaflow.net/  |
| Gemini API Key | AI 服务密钥 | https://ai.google.dev/ |
| 域名 | 访问地址 | Leaflow 自动分配或自定义 |
| PostgreSQL 密码 | 数据库密码 | 自行设置（强密码） |
| MinIO 密码 | 对象存储密码 | 自行设置（强密码） |
| JWT Secret | 认证密钥 | 随机32位字符 |

---

## 🌐 部署后的访问地址

假设你的域名前缀是 `myapp`:

```
前端:        https://myapp.leaflow.dev
后端 API:    https://api.myapp.leaflow.dev/docs
MinIO 控制台: https://myapp.leaflow.dev:9001
```

---

## 🧪 本地测试文件

测试文档位置：
```
E:\trae\0823合同3\上游车源-广州舶源（采购）.docx
```

预期结果：
- ✅ 成功解析 29 个字段
- ✅ 包含：甲方、乙方、合同编号、车架号等
- ✅ 智能表单：日期选择器、电话验证、下拉菜单

---

## 📞 获取帮助

- **Leaflow 文档**: `LEAFLOW_DEPLOY.md`
- **技术架构**: `PHASE4_IMPLEMENTATION.md`
- **Leaflow 社区**: QQ群 582959600

---

## 🔧 常见问题

**Q: 需要 Leaflow 付费吗？**  
A: 有免费额度，测试足够用

**Q: 能在本地运行吗？**  
A: 可以！使用 `docker-compose up`

**Q: 部署需要多久？**  
A: 首次部署约 5-10 分钟

**Q: 遇到错误怎么办？**  
A: 查看 `kubectl logs -f deployment/contract-backend`

---

## ✅ 下一步操作

1. **现在就测试**：
   ```bash
   docker-compose up -d
   ```
   访问 http://localhost:3000

2. **部署到 Leaflow**：
   ```bash
   ./deploy.sh
   ```

3. **监控运行状态**：
   ```bash
   kubectl get pods
   kubectl logs -f deployment/contract-backend
   ```

---

**准备好了吗？开始部署吧！** 🚀
