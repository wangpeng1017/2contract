# 🔧 OCR功能修复指南

## 🚨 问题诊断结果

通过环境变量检查发现：
- ❌ **GOOGLE_API_KEY 缺失** - OCR服务无法正常工作
- ✅ 飞书配置完整
- ✅ 数据库配置存在  
- ✅ 文件存储配置存在

## 🛠️ 立即修复步骤

### 1. 在 Vercel 控制台添加OCR环境变量

访问：https://vercel.com/dashboard
1. 选择项目 `0823-3contract`
2. 进入 `Settings` → `Environment Variables`
3. 添加以下OCR相关环境变量：

```bash
# OCR服务配置
GOOGLE_API_KEY=AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA
GEMINI_MODEL=gemini-1.5-flash
```

### 2. 重新部署应用

在 Vercel 控制台中点击 `Redeploy` 重新部署应用。

## 🧪 验证修复

### 方法1：环境变量检查
访问：https://0823-3contract.vercel.app/api/debug/env?key=debug-2024
确认 `GOOGLE_API_KEY` 显示为 `exists: true`

### 方法2：OCR API测试
使用以下curl命令测试OCR API：

```bash
# 测试基础OCR功能（需要先登录获取access_token）
curl -X POST https://0823-3contract.vercel.app/api/ocr/extract \
  -H "Cookie: access_token=your_token" \
  -F "image=@test-image.jpg" \
  -F "extractStructured=false"
```

### 方法3：前端功能测试
1. 登录应用：https://0823-3contract.vercel.app/
2. 访问OCR测试页面：https://0823-3contract.vercel.app/test-ocr
3. 上传测试图片验证OCR功能

## 📋 OCR功能技术详情

### 当前配置
- **OCR引擎**: Google Gemini 1.5 Flash
- **支持语言**: 中文、英文
- **最大文件大小**: 10MB
- **支持格式**: JPEG, PNG, GIF, WebP
- **API端点**: 
  - 基础OCR: `/api/ocr/extract`
  - 合同提取: `/api/ocr/contract`

### 功能特性
1. **基础文字识别**: 提取图片中的所有文字内容
2. **智能合同信息提取**: 自动识别甲方、乙方、金额等关键信息
3. **结构化数据输出**: 返回JSON格式的结构化数据
4. **高精度识别**: 基于Google Gemini Vision API

### 错误处理
- 文件类型验证
- 文件大小限制
- API配额检查
- 网络超时处理
- 详细错误日志

## 🔍 常见问题排查

### Q: OCR API返回500错误
A: 检查GOOGLE_API_KEY是否正确配置，确保API密钥有效且有足够配额。

### Q: 上传图片后没有响应
A: 检查图片格式和大小，确保符合要求（10MB以内，支持的图片格式）。

### Q: 识别结果不准确
A: 确保图片清晰度足够，文字清晰可读，避免倾斜或模糊。

### Q: 需要登录才能使用OCR功能
A: 是的，OCR功能需要用户认证，请先完成飞书登录。

## 📝 测试建议

### 测试图片要求
1. **分辨率**: 建议1000x1000像素以上
2. **清晰度**: 文字清晰可读
3. **光线**: 充足且均匀
4. **角度**: 尽量正面拍摄，避免倾斜

### 合同信息提取测试
准备包含以下信息的合同图片：
- 甲方公司名称
- 乙方公司名称
- 合同金额
- 合同编号
- 签署日期
- 联系人信息

## ⚠️ 重要提醒

1. **Google API Key安全**: 确保API密钥安全，不要在客户端代码中暴露
2. **API配额管理**: 监控API使用量，避免超出免费配额
3. **图片隐私**: 上传的图片会发送到Google服务器进行处理
4. **修复完成后**: 建议移除调试接口以确保安全

## 🎯 预期结果

修复完成后：
- ✅ OCR测试页面可以正常访问
- ✅ 图片上传和识别功能正常工作
- ✅ 返回准确的文字识别结果
- ✅ 合同信息提取功能正常
- ✅ 不再出现OCR相关的500错误
