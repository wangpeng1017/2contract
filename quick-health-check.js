#!/usr/bin/env node

/**
 * 快速健康检查脚本
 * 验证部署后的关键功能是否正常
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://0823-3contract.vercel.app';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP请求工具
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            body: jsonBody,
            duration,
            rawBody: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            duration,
            rawBody: body
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 主要检查函数
async function runHealthCheck() {
  console.log('🏥 飞书合同内容更新助手 - 快速健康检查');
  console.log(`🌐 目标: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  const checks = [
    {
      name: '主页访问',
      url: BASE_URL,
      expectedStatus: 200,
      checkContent: (body) => {
        if (typeof body === 'string') {
          return body.includes('飞书合同内容更新助手');
        }
        return false;
      }
    },
    {
      name: '数据库健康检查',
      url: `${BASE_URL}/api/health/database`,
      expectedStatus: 200,
      checkContent: (body) => {
        return body && body.success === true && body.health && body.health.status === 'healthy';
      }
    },
    {
      name: '认证API检查',
      url: `${BASE_URL}/api/auth/me`,
      expectedStatus: 401, // 未登录应该返回401
      checkContent: (body) => {
        return body && (body.success === false || body.error);
      }
    },
    {
      name: '操作API检查',
      url: `${BASE_URL}/api/operations`,
      expectedStatus: 401, // 未登录应该返回401
      checkContent: (body) => {
        return body && body.error;
      }
    }
  ];
  
  let passedChecks = 0;
  const results = [];
  
  for (const check of checks) {
    try {
      console.log(`\n🔍 检查: ${check.name}`);
      
      const result = await makeRequest(check.url);
      const statusOk = result.statusCode === check.expectedStatus;
      const contentOk = check.checkContent ? check.checkContent(result.body) : true;
      const passed = statusOk && contentOk;
      
      if (passed) {
        log('green', `   ✅ 通过 (${result.statusCode}, ${result.duration}ms)`);
        passedChecks++;
      } else {
        log('red', `   ❌ 失败 (${result.statusCode}, ${result.duration}ms)`);
        if (!statusOk) {
          log('yellow', `      期望状态码: ${check.expectedStatus}, 实际: ${result.statusCode}`);
        }
        if (!contentOk) {
          log('yellow', `      内容检查失败`);
        }
      }
      
      // 显示响应摘要
      if (typeof result.body === 'object' && result.body) {
        const summary = JSON.stringify(result.body).substring(0, 100);
        console.log(`      响应: ${summary}${summary.length >= 100 ? '...' : ''}`);
      } else if (typeof result.body === 'string') {
        const summary = result.body.substring(0, 100).replace(/\s+/g, ' ');
        console.log(`      响应: ${summary}${summary.length >= 100 ? '...' : ''}`);
      }
      
      results.push({
        name: check.name,
        passed,
        statusCode: result.statusCode,
        duration: result.duration,
        expectedStatus: check.expectedStatus
      });
      
    } catch (error) {
      log('red', `   ❌ 错误: ${error.message}`);
      results.push({
        name: check.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // 汇总结果
  console.log('\n' + '=' .repeat(60));
  console.log('📊 健康检查汇总:');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`   ${status} ${result.name}${duration}`);
    
    if (result.error) {
      log('yellow', `      错误: ${result.error}`);
    }
  });
  
  console.log('\n📈 总体状态:');
  const successRate = (passedChecks / checks.length * 100).toFixed(1);
  
  if (passedChecks === checks.length) {
    log('green', `🎉 所有检查通过! (${passedChecks}/${checks.length})`);
    log('green', '✨ 应用运行状态良好，可以正常使用！');
  } else if (passedChecks >= checks.length * 0.75) {
    log('yellow', `⚠️  大部分功能正常 (${passedChecks}/${checks.length}, ${successRate}%)`);
    log('yellow', '🔧 建议检查失败的功能模块');
  } else {
    log('red', `❌ 多个功能异常 (${passedChecks}/${checks.length}, ${successRate}%)`);
    log('red', '🚨 需要立即修复部署问题');
  }
  
  // 给出具体建议
  console.log('\n💡 建议:');
  
  const failedChecks = results.filter(r => !r.passed);
  if (failedChecks.length === 0) {
    console.log('   🎯 应用状态良好，可以进行完整的功能测试');
  } else {
    failedChecks.forEach(check => {
      if (check.name === '数据库健康检查') {
        console.log('   🔧 修复数据库连接: 检查Vercel环境变量POSTGRES_PRISMA_URL');
      } else if (check.name === '主页访问') {
        console.log('   🌐 检查应用部署状态和域名配置');
      } else {
        console.log(`   🔍 检查 ${check.name} 的具体错误信息`);
      }
    });
  }
  
  console.log('\n🔗 相关链接:');
  console.log(`   📱 应用地址: ${BASE_URL}`);
  console.log('   ⚙️  Vercel控制台: https://vercel.com/dashboard');
  console.log('   📋 详细测试: 运行 node e2e-test.js');
  
  return {
    total: checks.length,
    passed: passedChecks,
    failed: checks.length - passedChecks,
    successRate: successRate,
    results: results
  };
}

// 主函数
async function main() {
  try {
    const result = await runHealthCheck();
    
    // 根据结果设置退出码
    const exitCode = result.passed === result.total ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    log('red', `💥 健康检查执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { runHealthCheck };
