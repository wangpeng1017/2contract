#!/usr/bin/env node

/**
 * OCR 调试脚本
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 OCR 调试信息');
console.log('================');

// 检查环境变量
console.log('环境变量检查:');
console.log('- GOOGLE_API_KEY 存在:', !!process.env.GOOGLE_API_KEY);
console.log('- GOOGLE_API_KEY 长度:', process.env.GOOGLE_API_KEY?.length || 0);
console.log('- GOOGLE_API_KEY 前缀:', process.env.GOOGLE_API_KEY?.substring(0, 8) || 'N/A');

// 测试正则表达式
const apiKey = process.env.GOOGLE_API_KEY;
if (apiKey) {
  console.log('\n正则表达式测试:');
  const pattern = /^AIza[0-9A-Za-z-_]{35}$/;
  console.log('- 完整 API Key:', apiKey);
  console.log('- 长度:', apiKey.length);
  console.log('- 正则测试结果:', pattern.test(apiKey));
  
  // 逐字符检查
  console.log('\n字符分析:');
  console.log('- 前4个字符:', apiKey.substring(0, 4));
  console.log('- 后35个字符:', apiKey.substring(4));
  console.log('- 后35个字符长度:', apiKey.substring(4).length);
  
  // 检查是否有隐藏字符
  console.log('\n隐藏字符检查:');
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey[i];
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) {
      console.log(`- 位置 ${i}: 发现非打印字符 (code: ${code})`);
    }
  }
}

// 尝试初始化 OCR 服务
console.log('\n🧪 尝试初始化 OCR 服务:');
try {
  const { GeminiOCRService } = require('./src/lib/gemini-ocr.ts');
  const ocrService = new GeminiOCRService();
  console.log('✅ OCR 服务初始化成功');
} catch (error) {
  console.log('❌ OCR 服务初始化失败:', error.message);
  console.log('错误详情:', error);
}
