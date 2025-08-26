// 简单的功能测试脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 检查项目结构和配置...\n');

// 检查关键文件
const criticalFiles = [
  'package.json',
  '.env.local',
  'src/app/page.tsx',
  'src/app/api/health/database/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/text/preview/route.ts',
  'src/lib/feishu/client.ts',
  'src/lib/database/client.ts'
];

console.log('📁 关键文件检查:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 检查环境变量
console.log('\n🔧 环境变量检查:');
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredVars = [
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET', 
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'GOOGLE_API_KEY'
  ];
  
  requiredVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`);
    const isEmpty = envContent.includes(`${varName}=\n`) || envContent.includes(`${varName}=$`);
    console.log(`   ${hasVar && !isEmpty ? '✅' : '❌'} ${varName}`);
  });
} else {
  console.log('   ❌ .env.local 文件不存在');
}

// 检查package.json脚本
console.log('\n📦 Package.json 脚本检查:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'start'];
  
  requiredScripts.forEach(script => {
    const hasScript = pkg.scripts && pkg.scripts[script];
    console.log(`   ${hasScript ? '✅' : '❌'} ${script}: ${hasScript || '未定义'}`);
  });
}

// 检查API路由文件
console.log('\n🛠️ API路由检查:');
const apiRoutes = [
  'src/app/api/health/database/route.ts',
  'src/app/api/auth/me/route.ts', 
  'src/app/api/text/preview/route.ts',
  'src/app/api/document/permissions/route.ts',
  'src/app/api/operations/route.ts'
];

apiRoutes.forEach(route => {
  const exists = fs.existsSync(route);
  console.log(`   ${exists ? '✅' : '❌'} ${route}`);
});

// 检查构建配置
console.log('\n⚙️ 构建配置检查:');
const configFiles = [
  'next.config.js',
  'tailwind.config.ts',
  'tsconfig.json',
  'prisma/schema.prisma'
];

configFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🎯 测试总结:');
console.log('如果所有关键文件都存在且环境变量配置正确，');
console.log('应用应该能够正常启动和运行。');
console.log('\n要启动应用，请运行: npm run dev');
console.log('然后访问: http://localhost:3000');
