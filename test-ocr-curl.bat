@echo off
echo 🧪 开始OCR API测试
echo ============================================================

echo.
echo 📋 测试配置:
echo - 服务器地址: http://localhost:3001
echo - 测试模式: 基础文字识别 + 合同信息提取
echo - 测试图片: 使用下载的合同图片

echo.
echo 🔍 测试1: 基础文字识别
echo ----------------------------------------

REM 检查测试图片是否存在
if exist "C:\Users\PENGN~1.WAN\AppData\Local\Temp\playwright-mcp-output\2025-08-26T04-40-53.366Z\contract-test-image.png" (
    echo ✅ 找到测试图片
    
    REM 测试基础OCR
    echo 发送基础OCR请求...
    curl -X POST ^
         -F "image=@C:\Users\PENGN~1.WAN\AppData\Local\Temp\playwright-mcp-output\2025-08-26T04-40-53.366Z\contract-test-image.png" ^
         -F "extractStructured=false" ^
         -F "language=zh-CN" ^
         http://localhost:3001/api/ocr/extract
    
    echo.
    echo.
    echo 🔍 测试2: 合同信息提取
    echo ----------------------------------------
    
    REM 测试合同信息提取
    echo 发送合同信息提取请求...
    curl -X POST ^
         -F "image=@C:\Users\PENGN~1.WAN\AppData\Local\Temp\playwright-mcp-output\2025-08-26T04-40-53.366Z\contract-test-image.png" ^
         -F "generateRules=true" ^
         http://localhost:3001/api/ocr/contract
         
) else (
    echo ❌ 未找到测试图片
    echo 请先运行浏览器测试生成图片，或者手动创建测试图片
)

echo.
echo.
echo 📊 测试总结
echo ============================================================
echo ✅ OCR API测试完成
echo 💡 如果看到JSON响应且success为true，说明API工作正常
echo 💡 如果出现错误，请检查服务器状态和API配置

echo.
echo 🔗 测试资源:
echo - 飞书文档: https://cb0xpdikl7.feishu.cn/docx/CrBwdZoDroTdhKx564bc6XjlnFd
echo - 本地服务器: http://localhost:3001
echo - OCR API端点: /api/ocr/extract, /api/ocr/contract

pause
