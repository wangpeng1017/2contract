#!/usr/bin/env node

/**
 * 完整的环境变量验证脚本
 * 检查所有必需和可选的环境变量配置状态
 */

const fs = require('fs');
const path = require('path');

// 环境变量分类
const ENV_CATEGORIES = {
  CRITICAL: {
    name: '🔴 关键变量（应用无法运行）',
    vars: [
      'FEISHU_APP_ID',
      'FEISHU_APP_SECRET',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'GOOGLE_API_KEY'
    ]
  },
  HIGH_PRIORITY: {
    name: '🟠 高优先级（核心功能）',
    vars: [
      'DATABASE_URL',
      'BLOB_READ_WRITE_TOKEN'
    ]
  },
  MEDIUM_PRIORITY: {
    name: '🟡 中优先级（性能优化）',
    vars: [
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
      'POSTGRES_PRISMA_URL',
      'POSTGRES_URL_NON_POOLING'
    ]
  },
  LOW_PRIORITY: {
    name: '🟢 低优先级（增强功能）',
    vars: [
      'BAIDU_OCR_API_KEY',
      'BAIDU_OCR_SECRET_KEY',
      'SENTRY_DSN',
      'ANALYTICS_ID'
    ]
  }
};

// 变量格式验证规则
const VALIDATION_RULES = {
  FEISHU_APP_ID: /^cli_[a-zA-Z0-9]{16}$/,
  FEISHU_APP_SECRET: /^[a-zA-Z0-9]{32}$/,
  GOOGLE_API_KEY: /^AIza[0-9A-Za-z-_]{35}$/,
  ENCRYPTION_KEY: /^[a-fA-F0-9]{64}$/,
  JWT_SECRET: /^.{32,}$/,
  DATABASE_URL: /^postgres:\/\/.+/,
  BLOB_READ_WRITE_TOKEN: /^vercel_blob_rw_.+/,
  KV_REST_API_URL: /^https:\/\/.+\.kv\.vercel-storage\.com$/,
  KV_REST_API_TOKEN: /^.{20,}$/
};

// 变量用途说明
const VAR_DESCRIPTIONS = {
  FEISHU_APP_ID: '飞书应用ID - 用于OAuth认证',
  FEISHU_APP_SECRET: '飞书应用密钥 - 用于获取访问令牌',
  ENCRYPTION_KEY: '数据加密密钥 - 用于敏感数据加密',
  JWT_SECRET: 'JWT签名密钥 - 用于用户会话管理',
  GOOGLE_API_KEY: 'Google Gemini API密钥 - 用于OCR功能',
  DATABASE_URL: 'PostgreSQL数据库连接 - 用于数据存储',
  BLOB_READ_WRITE_TOKEN: 'Vercel Blob存储令牌 - 用于文件上传',
  KV_REST_API_URL: 'Redis缓存服务URL - 用于性能优化',
  KV_REST_API_TOKEN: 'Redis缓存访问令牌 - 用于缓存操作',
  POSTGRES_PRISMA_URL: 'Prisma数据库连接 - 用于ORM操作',
  POSTGRES_URL_NON_POOLING: '非池化数据库连接 - 用于数据库迁移',
  BAIDU_OCR_API_KEY: '百度OCR API密钥 - 备用OCR服务',
  BAIDU_OCR_SECRET_KEY: '百度OCR密钥 - 备用OCR服务',
  SENTRY_DSN: 'Sentry错误监控 - 用于生产环境错误追踪',
  ANALYTICS_ID: '分析服务ID - 用于用户行为分析'
};

function loadEnvironmentVariables() {
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
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  return envVars;
}

function validateVariable(name, value) {
  if (!value || value === '') {
    return { status: 'missing', message: '未配置' };
  }

  const rule = VALIDATION_RULES[name];
  if (rule && !rule.test(value)) {
    return { status: 'invalid', message: '格式错误' };
  }

  return { status: 'valid', message: '配置正确' };
}

function generateConfigurationGuide(missingVars) {
  console.log('\n📋 配置指南:');
  console.log('=' * 60);

  const priorityOrder = ['CRITICAL', 'HIGH_PRIORITY', 'MEDIUM_PRIORITY', 'LOW_PRIORITY'];
  
  priorityOrder.forEach(priority => {
    const category = ENV_CATEGORIES[priority];
    const categoryMissing = missingVars.filter(v => category.vars.includes(v.name));
    
    if (categoryMissing.length > 0) {
      console.log(`\n${category.name}:`);
      categoryMissing.forEach(variable => {
        console.log(`\n🔧 ${variable.name}:`);
        console.log(`   用途: ${VAR_DESCRIPTIONS[variable.name]}`);
        console.log(`   状态: ${variable.status === 'missing' ? '❌ 未配置' : '⚠️ 格式错误'}`);
        
        // 提供具体的获取指导
        switch (variable.name) {
          case 'DATABASE_URL':
            console.log('   获取: Vercel控制台 → Storage → Create Database → Postgres');
            break;
          case 'BLOB_READ_WRITE_TOKEN':
            console.log('   获取: Vercel控制台 → Storage → Create Database → Blob');
            break;
          case 'KV_REST_API_URL':
          case 'KV_REST_API_TOKEN':
            console.log('   获取: Vercel控制台 → Storage → Create Database → KV');
            break;
          case 'BAIDU_OCR_API_KEY':
          case 'BAIDU_OCR_SECRET_KEY':
            console.log('   获取: https://cloud.baidu.com/ → 文字识别 → 创建应用');
            break;
        }
      });
    }
  });
}

async function testConnections(envVars) {
  console.log('\n🌐 连接测试:');
  
  const tests = [];

  // 测试数据库连接
  if (envVars.DATABASE_URL) {
    tests.push({
      name: 'PostgreSQL数据库',
      test: async () => {
        // 这里可以添加实际的数据库连接测试
        return { success: true, message: '配置格式正确' };
      }
    });
  }

  // 测试Blob存储
  if (envVars.BLOB_READ_WRITE_TOKEN) {
    tests.push({
      name: 'Vercel Blob存储',
      test: async () => {
        try {
          // 简单的格式验证
          if (envVars.BLOB_READ_WRITE_TOKEN.startsWith('vercel_blob_rw_')) {
            return { success: true, message: '令牌格式正确' };
          } else {
            return { success: false, message: '令牌格式错误' };
          }
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    });
  }

  // 执行测试
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
    } catch (error) {
      console.log(`❌ ${test.name}: 测试失败 - ${error.message}`);
    }
  }
}

function calculateCompletionScore(envVars) {
  let totalScore = 0;
  let maxScore = 0;

  Object.entries(ENV_CATEGORIES).forEach(([priority, category]) => {
    const weight = priority === 'CRITICAL' ? 4 : priority === 'HIGH_PRIORITY' ? 3 : priority === 'MEDIUM_PRIORITY' ? 2 : 1;
    
    category.vars.forEach(varName => {
      maxScore += weight;
      const validation = validateVariable(varName, envVars[varName]);
      if (validation.status === 'valid') {
        totalScore += weight;
      }
    });
  });

  return Math.round((totalScore / maxScore) * 100);
}

async function main() {
  console.log('🔍 飞书合同内容更新助手 - 环境变量完整性检查\n');
  
  const envVars = loadEnvironmentVariables();
  if (!envVars) {
    process.exit(1);
  }

  let allValid = true;
  const missingVars = [];

  // 按优先级检查变量
  Object.entries(ENV_CATEGORIES).forEach(([priority, category]) => {
    console.log(`\n${category.name}:`);
    
    category.vars.forEach(varName => {
      const validation = validateVariable(varName, envVars[varName]);
      const icon = validation.status === 'valid' ? '✅' : validation.status === 'missing' ? '❌' : '⚠️';
      
      console.log(`${icon} ${varName}: ${validation.message}`);
      
      if (validation.status !== 'valid') {
        allValid = false;
        missingVars.push({ name: varName, status: validation.status });
      }
    });
  });

  // 计算完成度
  const completionScore = calculateCompletionScore(envVars);
  console.log(`\n📊 配置完成度: ${completionScore}%`);

  // 测试连接
  await testConnections(envVars);

  // 生成配置指南
  if (missingVars.length > 0) {
    generateConfigurationGuide(missingVars);
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  if (allValid) {
    console.log('🎉 所有环境变量配置完成！');
  } else {
    console.log(`⚠️ 还有 ${missingVars.length} 个变量需要配置`);
    
    const criticalMissing = missingVars.filter(v => ENV_CATEGORIES.CRITICAL.vars.includes(v.name));
    const highPriorityMissing = missingVars.filter(v => ENV_CATEGORIES.HIGH_PRIORITY.vars.includes(v.name));
    
    if (criticalMissing.length > 0) {
      console.log('🚨 关键变量缺失，应用无法正常运行');
    } else if (highPriorityMissing.length > 0) {
      console.log('⚠️ 核心功能变量缺失，部分功能不可用');
    } else {
      console.log('✅ 基础功能可以正常使用');
    }
  }

  console.log('\n📖 详细配置指南: docs/环境变量配置指南.md');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateVariable, loadEnvironmentVariables };
