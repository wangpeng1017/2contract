#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

/**
 * 测试API超时设置的脚本
 */

const BASE_URL = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}` : 
  'http://localhost:3000';

console.log('🧪 API超时测试开始...');
console.log(`测试目标: ${BASE_URL}`);

// 测试用例
const testCases = [
  {
    name: '上传API测试',
    endpoint: '/api/upload',
    method: 'POST',
    body: JSON.stringify({ file: 'test_data' }),
    expectedTimeout: 30000
  },
  {
    name: '提取API测试',
    endpoint: '/api/extract',
    method: 'POST',
    body: JSON.stringify({ text: '测试文本' }),
    expectedTimeout: 30000
  },
  {
    name: '渲染API测试',
    endpoint: '/api/render',
    method: 'POST',
    body: JSON.stringify({ template: 'test', data: {} }),
    expectedTimeout: 30000
  }
];

async function testApiEndpoint(testCase) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || (BASE_URL.startsWith('https') ? 443 : 80),
      path: testCase.endpoint,
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testCase.body)
      },
      timeout: testCase.expectedTimeout + 5000 // 给一点缓冲时间
    };

    const protocol = BASE_URL.startsWith('https') ? https : require('http');
    
    const req = protocol.request(options, (res) => {
      const duration = Date.now() - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${testCase.name}: ${res.statusCode} (${duration}ms)`);
        resolve({
          name: testCase.name,
          status: res.statusCode,
          duration,
          success: res.statusCode < 500
        });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ ${testCase.name}: 错误 - ${error.message} (${duration}ms)`);
      resolve({
        name: testCase.name,
        status: 'error',
        duration,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      const duration = Date.now() - startTime;
      console.log(`⏰ ${testCase.name}: 超时 (${duration}ms)`);
      req.destroy();
      resolve({
        name: testCase.name,
        status: 'timeout',
        duration,
        success: false
      });
    });

    req.write(testCase.body);
    req.end();
  });
}

async function runTests() {
  console.log('\n📋 开始执行测试...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testApiEndpoint(testCase);
    results.push(result);
    
    // 测试间隔，避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 测试结果总结:');
  console.log('========================');
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const status = typeof result.status === 'number' ? result.status : result.status;
    console.log(`${icon} ${result.name}: ${status} (${result.duration}ms)`);
    
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n成功: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️ 部分测试失败，请检查配置');
    process.exit(1);
  }
}

// 检查环境变量
if (!process.env.VERCEL_URL && !fs.existsSync('.env.local')) {
  console.log('⚠️ 提示: 未找到VERCEL_URL环境变量，将测试本地开发服务器');
  console.log('💡 建议: 部署到Vercel后设置VERCEL_URL环境变量进行线上测试');
}

runTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});