#!/usr/bin/env node

/**
 * 部署后运行时测试脚本
 * 验证核心API端点和功能是否正常工作
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试配置
const tests = [
  {
    name: '数据库健康检查',
    method: 'GET',
    path: '/api/health/database',
    expectedStatus: 200,
    expectedFields: ['success', 'health', 'stats']
  },
  {
    name: '用户认证状态检查',
    method: 'GET', 
    path: '/api/auth/me',
    expectedStatus: 401, // 未登录应该返回401
    expectedFields: ['success', 'error']
  },
  {
    name: '文本预览API测试',
    method: 'POST',
    path: '/api/text/preview',
    body: {
      text: '测试合同内容，甲方：原公司名称，乙方：原客户名称',
      rules: [
        { search: '原公司名称', replace: '新公司名称' },
        { search: '原客户名称', replace: '新客户名称' }
      ]
    },
    expectedStatus: 200,
    expectedFields: ['success', 'preview']
  },
  {
    name: '操作记录API测试',
    method: 'GET',
    path: '/api/operations',
    expectedStatus: 401, // 需要认证
    expectedFields: ['error']
  }
];

// HTTP请求工具函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 运行单个测试
async function runTest(test) {
  console.log(`\n🧪 测试: ${test.name}`);
  
  try {
    const url = new URL(BASE_URL + test.path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Deployment-Test-Script/1.0'
      }
    };
    
    const response = await makeRequest(options, test.body);
    
    // 检查状态码
    const statusMatch = response.statusCode === test.expectedStatus;
    console.log(`   状态码: ${response.statusCode} ${statusMatch ? '✅' : '❌'} (期望: ${test.expectedStatus})`);
    
    // 检查响应字段
    let fieldsMatch = true;
    if (test.expectedFields && typeof response.body === 'object') {
      for (const field of test.expectedFields) {
        const hasField = response.body.hasOwnProperty(field);
        console.log(`   字段 '${field}': ${hasField ? '✅' : '❌'}`);
        if (!hasField) fieldsMatch = false;
      }
    }
    
    // 显示响应内容（截断）
    const bodyStr = typeof response.body === 'object' 
      ? JSON.stringify(response.body, null, 2) 
      : response.body;
    const truncatedBody = bodyStr.length > 200 
      ? bodyStr.substring(0, 200) + '...' 
      : bodyStr;
    console.log(`   响应: ${truncatedBody}`);
    
    return {
      name: test.name,
      success: statusMatch && fieldsMatch,
      statusCode: response.statusCode,
      response: response.body
    };
    
  } catch (error) {
    console.log(`   错误: ❌ ${error.message}`);
    return {
      name: test.name,
      success: false,
      error: error.message
    };
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始部署后运行时测试...');
  console.log(`📍 测试目标: ${BASE_URL}`);
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    // 测试间隔
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 汇总结果
  console.log('\n📊 测试结果汇总:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    console.log(`${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`     错误: ${result.error}`);
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`总计: ${passed}/${total} 个测试通过`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过！应用运行正常。');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能。');
    process.exit(1);
  }
}

// 检查服务器是否可访问
async function checkServerAvailability() {
  console.log('🔍 检查服务器可用性...');
  
  try {
    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: '/',
      method: 'GET',
      timeout: 5000
    };
    
    await makeRequest(options);
    console.log('✅ 服务器可访问');
    return true;
  } catch (error) {
    console.log(`❌ 服务器不可访问: ${error.message}`);
    console.log('请确保开发服务器正在运行: npm run dev');
    return false;
  }
}

// 启动测试
async function main() {
  const isAvailable = await checkServerAvailability();
  if (!isAvailable) {
    process.exit(1);
  }
  
  await runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests, runTest };
