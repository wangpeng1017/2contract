#!/usr/bin/env node

/**
 * OCR功能测试脚本
 * 用于诊断OCR服务是否正常工作
 */

require('dotenv').config({ path: '.env.local' });

async function testOCRService() {
  console.log('🔍 OCR服务诊断测试');
  console.log('==================');

  // 1. 检查环境变量
  console.log('\n1️⃣ 环境变量检查:');
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log('- GOOGLE_API_KEY 存在:', !!apiKey);
  console.log('- GOOGLE_API_KEY 长度:', apiKey?.length || 0);
  console.log('- GOOGLE_API_KEY 格式:', apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A');

  if (!apiKey) {
    console.log('❌ GOOGLE_API_KEY 未配置');
    return;
  }

  // 2. 验证API密钥格式
  console.log('\n2️⃣ API密钥格式验证:');
  const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
  const isValidFormat = apiKeyPattern.test(apiKey);
  console.log('- 格式验证:', isValidFormat ? '✅ 有效' : '❌ 无效');

  if (!isValidFormat) {
    console.log('❌ API密钥格式不正确');
    console.log('正确格式应为: AIza + 35个字符的字母数字组合');
    return;
  }

  // 3. 测试API连接
  console.log('\n3️⃣ API连接测试:');
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello, this is a test.' }]
        }]
      })
    });

    console.log('- HTTP状态码:', response.status);
    console.log('- 响应状态:', response.ok ? '✅ 成功' : '❌ 失败');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('- 错误详情:', errorData);
      
      if (response.status === 400) {
        console.log('💡 可能原因: API密钥无效或请求格式错误');
      } else if (response.status === 403) {
        console.log('💡 可能原因: API密钥权限不足或配额用完');
      } else if (response.status === 429) {
        console.log('💡 可能原因: 请求频率过高，已达到限制');
      }
      return;
    }

    const data = await response.json();
    console.log('- API响应:', data.candidates ? '✅ 正常' : '❌ 异常');

  } catch (error) {
    console.log('❌ API连接失败:', error.message);
    console.log('💡 可能原因: 网络连接问题或API服务不可用');
    return;
  }

  // 4. 测试OCR功能
  console.log('\n4️⃣ OCR功能测试:');
  try {
    // 创建一个简单的测试图片（base64编码的1x1像素图片）
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

    const ocrResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: '请识别这张图片中的文字内容' },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: testImageBase64
              }
            }
          ]
        }]
      })
    });

    console.log('- OCR请求状态:', ocrResponse.status);
    console.log('- OCR响应状态:', ocrResponse.ok ? '✅ 成功' : '❌ 失败');

    if (ocrResponse.ok) {
      const ocrData = await ocrResponse.json();
      console.log('- OCR功能:', ocrData.candidates ? '✅ 正常工作' : '❌ 响应异常');
    } else {
      const errorData = await ocrResponse.json().catch(() => ({}));
      console.log('- OCR错误:', errorData);
    }

  } catch (error) {
    console.log('❌ OCR测试失败:', error.message);
  }

  console.log('\n🎉 诊断完成!');
}

// 运行测试
testOCRService().catch(console.error);
