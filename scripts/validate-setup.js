#!/usr/bin/env node

/**
 * 验证项目配置和功能的完整性
 */

const fs = require('fs');
const path = require('path');

// 必需的环境变量
const REQUIRED_VARS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET', 
  'FEISHU_REDIRECT_URI',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'GOOGLE_API_KEY',
  'NEXT_PUBLIC_APP_URL'
];

// 必需的文件
const REQUIRED_FILES = [
  'src/store/useAppStore.ts',
  'src/components/document/DocumentInput.tsx',
  'src/components/upload/ImageUpload.tsx',
  'src/components/rules/RuleEditor.tsx',
  'src/components/workflow/StepIndicator.tsx',
  'src/app/workspace/page.tsx',
  'src/lib/gemini-ocr.ts',
  'src/app/api/ocr/extract/route.ts',
  'src/app/api/ocr/contract/route.ts'
];

async function validateEnvironment() {
  console.log('🔍 验证环境变量配置...\n');
  
  // 读取.env.local文件
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 文件不存在');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  // 解析环境变量
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  let allValid = true;

  // 验证必需变量
  console.log('📋 检查必需环境变量:');
  REQUIRED_VARS.forEach(varName => {
    if (envVars[varName] && envVars[varName] !== '') {
      console.log(`✅ ${varName}: 已配置`);
    } else {
      console.log(`❌ ${varName}: 未配置或为空`);
      allValid = false;
    }
  });

  // 验证特定格式
  console.log('\n🔍 验证变量格式:');
  
  // 验证飞书App ID格式
  if (envVars.FEISHU_APP_ID) {
    if (envVars.FEISHU_APP_ID.startsWith('cli_')) {
      console.log('✅ FEISHU_APP_ID: 格式正确');
    } else {
      console.log('❌ FEISHU_APP_ID: 格式错误（应以cli_开头）');
      allValid = false;
    }
  }

  // 验证Google API Key格式
  if (envVars.GOOGLE_API_KEY) {
    if (/^AIza[0-9A-Za-z-_]{35}$/.test(envVars.GOOGLE_API_KEY)) {
      console.log('✅ GOOGLE_API_KEY: 格式正确');
    } else {
      console.log('❌ GOOGLE_API_KEY: 格式错误');
      allValid = false;
    }
  }

  return allValid;
}

function validateFiles() {
  console.log('\n📁 检查必需文件:');
  
  let allFilesExist = true;
  
  REQUIRED_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - 文件不存在`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

async function testAPIs() {
  console.log('\n🌐 测试API连接:');
  
  // 读取环境变量
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  let apiTestsPass = true;

  // 测试飞书API
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        app_id: envVars.FEISHU_APP_ID, 
        app_secret: envVars.FEISHU_APP_SECRET 
      })
    });
    
    const data = await response.json();
    if (data.code === 0) {
      console.log('✅ 飞书API: 连接成功');
    } else {
      console.log('❌ 飞书API: 连接失败 -', data.msg);
      apiTestsPass = false;
    }
  } catch (error) {
    console.log('❌ 飞书API: 连接错误 -', error.message);
    apiTestsPass = false;
  }

  // 测试Gemini API
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${envVars.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }]
      })
    });
    
    if (response.ok) {
      console.log('✅ Gemini API: 连接成功');
    } else {
      console.log('❌ Gemini API: 连接失败 -', response.status);
      apiTestsPass = false;
    }
  } catch (error) {
    console.log('❌ Gemini API: 连接错误 -', error.message);
    apiTestsPass = false;
  }

  return apiTestsPass;
}

function validatePackageJson() {
  console.log('\n📦 检查依赖包:');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.log('❌ package.json 不存在');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const requiredDeps = [
    'next',
    'react',
    'typescript',
    'lucide-react',
    'crypto-js'
  ];

  let allDepsPresent = true;
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: 未安装`);
      allDepsPresent = false;
    }
  });

  return allDepsPresent;
}

async function main() {
  console.log('🚀 飞书合同内容更新助手 - 完整配置验证\n');
  console.log('=' * 60);
  
  const envValid = await validateEnvironment();
  const filesValid = validateFiles();
  const depsValid = validatePackageJson();
  const apisValid = await testAPIs();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 验证结果汇总:');
  console.log(`环境变量: ${envValid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`必需文件: ${filesValid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`依赖包: ${depsValid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`API连接: ${apisValid ? '✅ 通过' : '❌ 失败'}`);
  
  const overallSuccess = envValid && filesValid && depsValid && apisValid;
  
  console.log('\n' + '='.repeat(60));
  if (overallSuccess) {
    console.log('🎉 所有验证通过！项目已准备就绪。');
    console.log('\n✨ 下一步操作:');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000 查看应用');
    console.log('3. 使用飞书账号登录测试完整功能');
    console.log('4. 访问 /workspace 开始使用智能工作台');
  } else {
    console.log('❌ 验证失败，请修复上述问题后重试');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateEnvironment, validateFiles, testAPIs };
