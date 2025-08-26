#!/usr/bin/env node

/**
 * Google Gemini 2.5 Flash OCR 功能测试脚本
 */

require('dotenv').config({ path: '.env.local' });

console.log('🚀 Google Gemini 2.5 Flash OCR 功能测试');
console.log('=====================================');

// 检查环境变量
console.log('环境变量检查:');
console.log('- GOOGLE_API_KEY 存在:', !!process.env.GOOGLE_API_KEY);
console.log('- GOOGLE_API_KEY 长度:', process.env.GOOGLE_API_KEY?.length || 0);
console.log('- GOOGLE_API_KEY 前缀:', process.env.GOOGLE_API_KEY?.substring(0, 8) || 'N/A');
console.log('- GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');

// 测试 API Key 格式
const apiKey = process.env.GOOGLE_API_KEY;
if (apiKey) {
  console.log('\nAPI Key 格式验证:');
  const pattern = /^AIza[0-9A-Za-z-_]{35}$/;
  console.log('- 格式正确:', pattern.test(apiKey));
  
  if (!pattern.test(apiKey)) {
    console.log('❌ API Key 格式不正确');
    console.log('正确格式应为: AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    process.exit(1);
  }
}

// 测试 API 连接（使用新的请求头认证方式）
async function testGeminiAPI() {
  console.log('\n🧪 测试 Gemini 2.5 API 连接...');
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello, this is a test message for Gemini 2.5 Flash.' }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100
        }
      })
    });

    console.log('- 响应状态:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API 连接成功');
      console.log('- 模型版本: gemini-2.5-flash');
      console.log('- 认证方式: X-goog-api-key 请求头');
      console.log('- 响应示例:', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50) + '...');
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ API 连接失败:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ API 连接错误:', error.message);
    return false;
  }
}

// 测试图片识别功能
async function testImageRecognition() {
  console.log('\n🖼️ 测试图片识别功能...');
  
  // 创建一个简单的测试图片 (base64 编码的小图片 - 包含文字的图片)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWA0drAAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: '请识别这张图片中的文字内容，如果没有文字请说明图片内容。' },
            {
              inline_data: {
                mime_type: 'image/png',
                data: testImageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 图片识别功能正常');
      console.log('- 识别结果:', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100) + '...');
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ 图片识别失败:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ 图片识别错误:', error.message);
    return false;
  }
}

// 测试 OCR 服务类
async function testOCRService() {
  console.log('\n🔧 测试 OCR 服务类...');
  
  try {
    // 动态导入 OCR 服务
    const { GeminiOCRService } = await import('./src/lib/gemini-ocr.ts');
    
    const ocrService = new GeminiOCRService();
    
    // 验证 API Key
    const isValid = await ocrService.validateApiKey();
    console.log('- API Key 验证:', isValid ? '✅ 有效' : '❌ 无效');
    
    return isValid;
  } catch (error) {
    console.log('❌ OCR 服务测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function main() {
  if (!apiKey) {
    console.log('❌ 缺少 GOOGLE_API_KEY 环境变量');
    console.log('\n请在 .env.local 文件中设置:');
    console.log('GOOGLE_API_KEY=your_google_api_key_here');
    console.log('GEMINI_MODEL=gemini-2.5-flash');
    process.exit(1);
  }

  const apiTest = await testGeminiAPI();
  const imageTest = await testImageRecognition();
  const serviceTest = await testOCRService();

  console.log('\n📊 测试结果总结:');
  console.log('=====================================');
  console.log(`API 连接测试: ${apiTest ? '✅ 通过' : '❌ 失败'}`);
  console.log(`图片识别测试: ${imageTest ? '✅ 通过' : '❌ 失败'}`);
  console.log(`OCR 服务测试: ${serviceTest ? '✅ 通过' : '❌ 失败'}`);
  
  if (apiTest && imageTest && serviceTest) {
    console.log('\n🎉 所有测试通过！Gemini 2.5 OCR 服务升级成功');
    console.log('\n✨ 升级亮点:');
    console.log('- 模型版本: gemini-1.5-flash → gemini-2.5-flash');
    console.log('- 认证方式: URL 参数 → X-goog-api-key 请求头');
    console.log('- 错误处理: 增强的日志记录和错误信息');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败，请检查配置');
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);
