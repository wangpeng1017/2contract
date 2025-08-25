#!/usr/bin/env node

/**
 * 快速验证环境变量配置
 */

const fs = require('fs');
const path = require('path');

// 关键环境变量
const CRITICAL_VARS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'GOOGLE_API_KEY'
];

// 高优先级变量
const HIGH_PRIORITY_VARS = [
  'DATABASE_URL',
  'BLOB_READ_WRITE_TOKEN',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING'
];

// 中优先级变量
const MEDIUM_PRIORITY_VARS = [
  'KV_REST_API_URL'
];

function loadEnvVars() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 文件不存在');
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // 移除引号
      envVars[key] = value;
    }
  });

  return envVars;
}

function validateVars(vars, varList, category) {
  console.log(`\n${category}:`);
  let allValid = true;
  
  varList.forEach(varName => {
    if (vars[varName] && vars[varName] !== '') {
      console.log(`✅ ${varName}: 已配置`);
    } else {
      console.log(`❌ ${varName}: 未配置`);
      allValid = false;
    }
  });
  
  return allValid;
}

function main() {
  console.log('🔍 飞书合同内容更新助手 - 环境变量快速验证\n');
  
  const envVars = loadEnvVars();
  if (!envVars) {
    process.exit(1);
  }

  const criticalValid = validateVars(envVars, CRITICAL_VARS, '🔴 关键变量');
  const highPriorityValid = validateVars(envVars, HIGH_PRIORITY_VARS, '🟠 高优先级变量');
  const mediumPriorityValid = validateVars(envVars, MEDIUM_PRIORITY_VARS, '🟡 中优先级变量');

  // 计算配置完成度
  const totalVars = CRITICAL_VARS.length + HIGH_PRIORITY_VARS.length + MEDIUM_PRIORITY_VARS.length;
  const configuredVars = [...CRITICAL_VARS, ...HIGH_PRIORITY_VARS, ...MEDIUM_PRIORITY_VARS]
    .filter(varName => envVars[varName] && envVars[varName] !== '').length;
  
  const completionRate = Math.round((configuredVars / totalVars) * 100);

  console.log('\n' + '='.repeat(60));
  console.log(`📊 配置完成度: ${completionRate}% (${configuredVars}/${totalVars})`);
  
  if (criticalValid && highPriorityValid) {
    console.log('🎉 核心功能已准备就绪！');
    console.log('\n✨ 可用功能:');
    console.log('• 飞书OAuth登录');
    console.log('• OCR图片识别');
    console.log('• 文档内容替换');
    console.log('• 数据持久化存储');
    console.log('• 文件上传和管理');
    
    console.log('\n🚀 下一步操作:');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000 查看应用');
    console.log('3. 使用 /workspace 测试完整工作流程');
  } else if (criticalValid) {
    console.log('⚠️ 基础功能可用，但部分高级功能受限');
  } else {
    console.log('❌ 关键配置缺失，应用无法正常运行');
  }

  // 显示具体的配置状态
  console.log('\n📋 详细配置状态:');
  console.log(`• 飞书OAuth: ${envVars.FEISHU_APP_ID ? '✅' : '❌'}`);
  console.log(`• 数据加密: ${envVars.ENCRYPTION_KEY ? '✅' : '❌'}`);
  console.log(`• OCR服务: ${envVars.GOOGLE_API_KEY ? '✅' : '❌'}`);
  console.log(`• 数据库: ${envVars.DATABASE_URL ? '✅' : '❌'}`);
  console.log(`• 文件存储: ${envVars.BLOB_READ_WRITE_TOKEN ? '✅' : '❌'}`);
  console.log(`• 缓存服务: ${envVars.KV_REST_API_URL ? '✅' : '❌'}`);
}

if (require.main === module) {
  main();
}

module.exports = { loadEnvVars, validateVars };
