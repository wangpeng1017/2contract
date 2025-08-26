#!/usr/bin/env node

/**
 * OCR功能修复验证脚本
 * 用于验证OCR相关的环境变量配置和API可用性
 */

const https = require('https');
const fs = require('fs');

// 配置
const VERCEL_APP_URL = 'https://0823-3contract.vercel.app';
const DEBUG_KEY = 'debug-2024';

/**
 * 检查环境变量配置
 */
async function checkEnvironmentVariables() {
  console.log('🔍 检查Vercel环境变量配置...\n');
  
  try {
    const url = `${VERCEL_APP_URL}/api/debug/env?key=${DEBUG_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ 环境变量检查失败:', data.error);
      return false;
    }
    
    const envCheck = data.data.envCheck;
    const recommendations = data.data.recommendations;
    
    console.log('📊 环境变量检查结果:');
    console.log('================================');
    
    // 检查飞书配置
    console.log(`飞书配置: ${recommendations.feishu}`);
    console.log(`  - FEISHU_APP_ID: ${envCheck.FEISHU_APP_ID.exists ? '✅' : '❌'}`);
    console.log(`  - FEISHU_APP_SECRET: ${envCheck.FEISHU_APP_SECRET.exists ? '✅' : '❌'}`);
    
    // 检查OCR配置
    console.log(`\nOCR配置: ${recommendations.ocr}`);
    console.log(`  - GOOGLE_API_KEY: ${envCheck.GOOGLE_API_KEY.exists ? '✅' : '❌'} (长度: ${envCheck.GOOGLE_API_KEY.length})`);
    
    // 检查其他配置
    console.log(`\n数据库配置: ${recommendations.database}`);
    console.log(`文件存储配置: ${recommendations.storage}`);
    
    console.log('\n================================');
    
    // 检查是否所有必需配置都存在
    const hasAllRequired = data.data.hasAllRequired;
    const missingRequired = data.data.missingRequired;
    
    if (hasAllRequired) {
      console.log('✅ 所有必需的环境变量都已配置');
    } else {
      console.log('❌ 缺少必需的环境变量:', missingRequired.join(', '));
    }
    
    // 特别检查OCR配置
    const ocrConfigured = envCheck.GOOGLE_API_KEY.exists && envCheck.GOOGLE_API_KEY.length > 0;
    
    if (ocrConfigured) {
      console.log('✅ OCR服务配置完整');
      return true;
    } else {
      console.log('❌ OCR服务配置缺失 - GOOGLE_API_KEY未配置');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 环境变量检查失败:', error.message);
    return false;
  }
}

/**
 * 测试OCR API可用性（需要认证）
 */
async function testOCRAPIAvailability() {
  console.log('\n🧪 测试OCR API可用性...\n');
  
  try {
    // 测试不带认证的请求，应该返回401
    const response = await fetch(`${VERCEL_APP_URL}/api/ocr/extract`, {
      method: 'POST',
      body: new FormData() // 空的FormData
    });
    
    console.log(`OCR API响应状态: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ OCR API正常响应（需要认证）');
      return true;
    } else if (response.status === 500) {
      const errorData = await response.json();
      console.log('❌ OCR API返回500错误:', errorData.error?.message || '未知错误');
      
      if (errorData.error?.message?.includes('API key') || errorData.error?.message?.includes('GOOGLE_API_KEY')) {
        console.log('💡 这可能是GOOGLE_API_KEY配置问题');
      }
      
      return false;
    } else {
      console.log(`⚠️ OCR API返回意外状态码: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ OCR API测试失败:', error.message);
    return false;
  }
}

/**
 * 生成修复建议
 */
function generateFixRecommendations(envOk, apiOk) {
  console.log('\n📋 修复建议:');
  console.log('================================');
  
  if (!envOk) {
    console.log('🔧 环境变量修复:');
    console.log('1. 访问 Vercel 控制台: https://vercel.com/dashboard');
    console.log('2. 选择项目 "0823-3contract"');
    console.log('3. 进入 Settings → Environment Variables');
    console.log('4. 添加以下环境变量:');
    console.log('   GOOGLE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('   GEMINI_MODEL=gemini-2.5-flash');
    console.log('5. 重新部署应用');
    console.log('');
  }
  
  if (!apiOk && envOk) {
    console.log('🔧 API修复:');
    console.log('1. 检查Google API Key是否有效');
    console.log('2. 确认API Key有足够的配额');
    console.log('3. 检查网络连接');
    console.log('4. 查看应用日志获取详细错误信息');
    console.log('');
  }
  
  if (envOk && apiOk) {
    console.log('✅ OCR功能配置正常！');
    console.log('');
    console.log('🧪 下一步测试:');
    console.log('1. 登录应用: https://0823-3contract.vercel.app/');
    console.log('2. 访问OCR测试页面: https://0823-3contract.vercel.app/test-ocr');
    console.log('3. 上传测试图片验证OCR功能');
    console.log('');
  }
  
  console.log('📚 参考文档:');
  console.log('- OCR修复指南: OCR_FIX_GUIDE.md');
  console.log('- 完整修复指南: VERCEL_FIX_GUIDE.md');
  console.log('- OCR技术方案: docs/OCR技术方案分析.md');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 OCR功能修复验证\n');
  console.log('正在检查OCR相关配置和API可用性...\n');
  
  const envOk = await checkEnvironmentVariables();
  const apiOk = await testOCRAPIAvailability();
  
  console.log('\n📊 检查结果总结:');
  console.log('================================');
  console.log(`环境变量配置: ${envOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`OCR API可用性: ${apiOk ? '✅ 正常' : '❌ 异常'}`);
  
  const overallStatus = envOk && apiOk;
  console.log(`总体状态: ${overallStatus ? '✅ 正常' : '❌ 需要修复'}`);
  
  generateFixRecommendations(envOk, apiOk);
  
  if (!overallStatus) {
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkEnvironmentVariables, testOCRAPIAvailability };
