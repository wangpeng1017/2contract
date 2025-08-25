/**
 * OCR功能测试脚本
 * 用于验证Gemini OCR服务是否正常工作
 */

const fs = require('fs');
const path = require('path');

// 模拟Gemini OCR服务测试
async function testGeminiOCR() {
  console.log('🧪 开始测试Gemini OCR服务...\n');

  // 1. 检查环境变量配置
  console.log('1️⃣ 检查环境变量配置');
  
  // 读取.env.local文件
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 文件不存在');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasGoogleApiKey = envContent.includes('GOOGLE_API_KEY=') && envContent.includes('AIza');
  
  if (hasGoogleApiKey) {
    console.log('✅ Google API Key 已正确配置');
  } else {
    console.error('❌ Google API Key 未配置或配置错误');
    return false;
  }

  // 2. 检查API密钥格式
  console.log('\n2️⃣ 验证API密钥格式');
  const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (apiKeyPattern.test(apiKey)) {
    console.log('✅ API密钥格式正确');
  } else {
    console.error('❌ API密钥格式不正确');
    return false;
  }

  // 3. 测试API连接
  console.log('\n3️⃣ 测试Gemini API连接');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello, this is a test message.' }]
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Gemini API连接成功');
      const data = await response.json();
      console.log('📝 API响应示例:', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50) + '...');
    } else {
      console.error('❌ Gemini API连接失败:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ API连接测试失败:', error.message);
    return false;
  }

  // 4. 检查项目文件结构
  console.log('\n4️⃣ 检查OCR相关文件');
  const requiredFiles = [
    'src/lib/gemini-ocr.ts',
    'src/app/api/ocr/extract/route.ts',
    'src/app/api/ocr/contract/route.ts'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.error(`❌ ${file} 不存在`);
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    return false;
  }

  // 5. 安全检查
  console.log('\n5️⃣ 安全配置检查');
  
  // 检查.gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env*.local')) {
      console.log('✅ .gitignore 已正确配置环境变量文件');
    } else {
      console.warn('⚠️ .gitignore 可能未正确配置环境变量文件');
    }
  } else {
    console.error('❌ .gitignore 文件不存在');
    return false;
  }

  console.log('\n🎉 所有测试通过！OCR功能已准备就绪。');
  return true;
}

// 提供使用指南
function printUsageGuide() {
  console.log('\n📖 OCR功能使用指南:');
  console.log('');
  console.log('1. 启动开发服务器:');
  console.log('   npm run dev');
  console.log('');
  console.log('2. 测试基础OCR功能:');
  console.log('   POST http://localhost:3000/api/ocr/extract');
  console.log('   Content-Type: multipart/form-data');
  console.log('   Body: image=<图片文件>');
  console.log('');
  console.log('3. 测试合同信息提取:');
  console.log('   POST http://localhost:3000/api/ocr/contract');
  console.log('   Content-Type: multipart/form-data');
  console.log('   Body: image=<合同图片>, generateRules=true');
  console.log('');
  console.log('4. 支持的图片格式:');
  console.log('   - JPEG (.jpg, .jpeg)');
  console.log('   - PNG (.png)');
  console.log('   - GIF (.gif)');
  console.log('   - WebP (.webp)');
  console.log('');
  console.log('5. 文件大小限制: 10MB');
  console.log('');
}

// 创建测试用的示例图片说明
function createTestImageGuide() {
  const guideContent = `# OCR测试图片准备指南

## 📸 测试图片要求

### 基础文字识别测试
准备一张包含清晰文字的图片，例如：
- 书籍页面截图
- 文档扫描件
- 清晰的手写文字照片

### 合同信息提取测试
准备一张合同文档图片，应包含以下信息：
- 甲方公司名称
- 乙方公司名称  
- 合同金额
- 合同编号
- 签署日期
- 联系人信息

### 图片质量要求
- 分辨率：建议 1000x1000 像素以上
- 格式：JPEG、PNG、GIF、WebP
- 大小：不超过 10MB
- 清晰度：文字清晰可读
- 光线：充足且均匀
- 角度：尽量正面拍摄，避免倾斜

### 测试步骤
1. 准备测试图片
2. 启动开发服务器: \`npm run dev\`
3. 使用Postman或curl测试API
4. 检查返回的OCR结果

### 示例curl命令
\`\`\`bash
# 基础OCR测试
curl -X POST http://localhost:3000/api/ocr/extract \\
  -H "Cookie: access_token=your_token" \\
  -F "image=@test-image.jpg" \\
  -F "extractStructured=false"

# 合同信息提取测试  
curl -X POST http://localhost:3000/api/ocr/contract \\
  -H "Cookie: access_token=your_token" \\
  -F "image=@contract-image.jpg" \\
  -F "generateRules=true"
\`\`\`
`;

  fs.writeFileSync('docs/OCR测试指南.md', guideContent);
  console.log('📄 已创建 docs/OCR测试指南.md');
}

// 测试飞书API连接
async function testFeishuAPI() {
  console.log('🔍 测试飞书API连接...');

  const appId = process.env.FEISHU_APP_ID || 'cli_a8223aa97ffad013';
  const appSecret = process.env.FEISHU_APP_SECRET || 'buUtzUTcwsSrj4k9IB4zLeyb1g3rO4Fp';

  if (!appId || !appSecret) {
    console.log('❌ 飞书App ID或Secret未配置');
    return false;
  }

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret
      })
    });

    const data = await response.json();
    if (data.code === 0) {
      console.log('✅ 飞书API连接成功');
      console.log('📝 App Access Token获取成功');
      return true;
    } else {
      console.log('❌ 飞书API连接失败:', data.msg);
      return false;
    }
  } catch (error) {
    console.log('❌ 飞书API连接错误:', error.message);
    return false;
  }
}

// 运行测试
async function main() {
  console.log('🚀 飞书合同内容更新助手 - 完整功能测试\n');

  const ocrSuccess = await testGeminiOCR();
  const feishuSuccess = await testFeishuAPI();

  const allSuccess = ocrSuccess && feishuSuccess;

  if (allSuccess) {
    printUsageGuide();
    createTestImageGuide();

    console.log('\n✨ 下一步操作:');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000 测试飞书登录');
    console.log('3. 准备测试图片（参考 docs/OCR测试指南.md）');
    console.log('4. 测试完整工作流程：登录 → 文档处理 → OCR识别');
  } else {
    console.log('\n❌ 部分测试失败，请检查配置后重试');
    if (!ocrSuccess) console.log('  - OCR功能配置有问题');
    if (!feishuSuccess) console.log('  - 飞书API配置有问题');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGeminiOCR };
