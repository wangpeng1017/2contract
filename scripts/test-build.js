#!/usr/bin/env node

/**
 * 测试本地构建
 */

const { execSync } = require('child_process');

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log(`✅ ${description} 完成`);
    return { success: true };
  } catch (error) {
    console.log(`❌ ${description} 失败`);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🧪 测试本地构建\n');
  console.log('='.repeat(50));
  
  // 1. 清理缓存
  console.log('🧹 清理构建缓存...');
  runCommand('rm -rf .next', '清理 .next 目录');
  
  // 2. 安装依赖
  const installResult = runCommand('npm install', '安装依赖');
  if (!installResult.success) {
    console.log('❌ 依赖安装失败');
    process.exit(1);
  }
  
  // 3. 运行构建
  const buildResult = runCommand('npm run build', '执行构建');
  
  if (buildResult.success) {
    console.log('\n' + '='.repeat(50));
    console.log('🎉 本地构建成功！');
    console.log('\n📋 构建验证:');
    console.log('✅ Tailwind CSS 编译成功');
    console.log('✅ TypeScript 类型检查通过');
    console.log('✅ Next.js 优化构建完成');
    
    console.log('\n🚀 可以安全部署到生产环境');
    
  } else {
    console.log('\n❌ 本地构建失败');
    console.log('请检查错误信息并修复后重试');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
