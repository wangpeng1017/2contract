@echo off
echo ================================================
echo 推送智能合同模板处理系统到 GitHub
echo ================================================
echo.

echo [1/4] 检查 Git 状态...
if not exist .git (
    echo 初始化 Git 仓库...
    git init
    echo Git 仓库初始化完成
) else (
    echo Git 仓库已存在
)

echo.
echo [2/4] 添加所有文件...
git add .

echo.
echo [3/4] 提交代码...
git commit -m "feat: 智能合同模板处理系统完整实现

✅ 核心功能：
- 模块一：python-docx 阅读顺序解析
- 模块二：AI 变量提取 (Gemini API + 缓存)
- 模块三：动态表单用户交互
- 模块四：python-docx-template + MinIO 高保真生成

🚀 技术特性：
- 一站式 API 接口设计 (upload-and-extract)
- MinIO 分布式存储 + 预签名 URL 安全下载
- 7种数据类型智能识别和表单控件
- 完整前端界面和工作流

📦 部署配置：
- Leaflow 容器化部署 (Kubernetes + Docker)
- Vercel 静态前端托管
- CORS 跨域配置
- 环境变量安全管理

🧪 测试验证：
- 完整的端到端测试流程
- 健康检查和错误处理
- 性能优化和监控配置"

echo.
echo [4/4] 推送到 GitHub...

:: 检查远程仓库是否已配置
git remote -v | findstr origin >nul
if errorlevel 1 (
    echo 配置远程仓库...
    git remote add origin https://github.com/wangpeng1017/2contract.git
)

:: 设置主分支
git branch -M main

:: 推送代码
echo 正在推送到远程仓库...
git push -u origin main

if errorlevel 0 (
    echo.
    echo ================================================
    echo ✅ 代码推送成功！
    echo.
    echo 📁 GitHub 仓库: https://github.com/wangpeng1017/2contract
    echo.
    echo 接下来的步骤：
    echo 1. 访问 https://leaflow.net/ 部署后端
    echo 2. 访问 https://vercel.com/ 部署前端
    echo 3. 参考 DEPLOYMENT_GUIDE.md 完成配置
    echo.
    echo 📚 部署文档: DEPLOYMENT_GUIDE.md
    echo 🚀 技术报告: TECH_ROADMAP_IMPLEMENTATION_REPORT.md
    echo ================================================
) else (
    echo.
    echo ❌ 推送失败，请检查网络连接和权限
    echo.
    echo 可能的解决方案：
    echo 1. 检查 GitHub 仓库权限
    echo 2. 验证网络连接
    echo 3. 确认 Git 配置正确
)

echo.
pause