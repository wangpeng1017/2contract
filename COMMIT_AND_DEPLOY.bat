@echo off
echo ========================================
echo 提交代码并推送到 GitHub
echo ========================================

echo.
echo 第一步：提交代码
git commit -m "feat: 添加部署配置和文档

- 添加 backend/Dockerfile 和 Procfile 用于容器部署
- 配置 next.config.js standalone 模式支持 Docker
- 添加 railway.json 和 leaflow 部署配置
- 创建详细的部署文档
- 添加 backend runtime.txt 指定 Python 3.11

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 提交失败！
    pause
    exit /b 1
)

echo.
echo [成功] 提交完成！
echo.

echo 第二步：推送到 GitHub
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [错误] 推送失败！请检查网络或 GitHub 权限
    pause
    exit /b 1
)

echo.
echo ========================================
echo [成功] 代码已推送到 GitHub！
echo ========================================
echo.
echo 下一步：从 GitHub 部署
echo 1. Vercel: https://vercel.com/new
echo 2. Leaflow: https://leaflow.net/
echo.
echo 详细步骤请查看: DEPLOY_FROM_GITHUB.md
echo.
pause
