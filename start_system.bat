@echo off
echo ================================================
echo 合同模板智能处理系统 - 启动脚本
echo ================================================
echo.

echo [1/3] 检查 Python 环境...
python --version
if errorlevel 1 (
    echo 错误: Python 未安装或不在 PATH 中
    pause
    exit /b 1
)

echo [2/3] 启动后端服务...
cd /d "%~dp0backend"

echo 安装依赖包...
pip install -r requirements.txt

echo 启动 FastAPI 服务器...
echo 后端服务地址: http://localhost:8000
echo API 文档地址: http://localhost:8000/docs
echo.

start "FastAPI Backend" cmd /k "python main.py"

echo [3/3] 准备前端页面...
cd /d "%~dp0frontend"

echo 前端页面地址: http://localhost:8000/frontend/index.html
echo 或者直接打开: %~dp0frontend\index.html
echo.

echo ================================================
echo 系统启动完成！
echo.
echo 使用步骤:
echo 1. 打开前端页面: %~dp0frontend\index.html
echo 2. 上传 .docx 合同模板
echo 3. 系统自动识别变量字段
echo 4. 填写表单数据
echo 5. 生成并下载最终合同
echo.
echo 注意: 确保已配置好 MinIO 服务器和环境变量
echo ================================================

pause