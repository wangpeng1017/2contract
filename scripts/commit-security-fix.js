#!/usr/bin/env node

/**
 * 提交安全修复的脚本
 */

const { execSync } = require('child_process');

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`✅ ${description} 完成`);
    return { success: true, output: output.trim() };
  } catch (error) {
    console.log(`❌ ${description} 失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🔒 提交安全修复\n');
  console.log('='.repeat(50));
  
  // 1. 暂存修复的文件
  console.log('📦 暂存安全修复文件...');
  const filesToAdd = [
    'docs/环境变量配置完整指南.md',
    'scripts/test-ocr.js',
    'scripts/validate-env-complete.js',
    'scripts/security-check.js',
    'scripts/security-check-strict.js',
    'package.json'
  ];
  
  filesToAdd.forEach(file => {
    runCommand(`git add ${file}`, `暂存 ${file}`);
  });
  
  // 2. 提交修复
  const commitMessage = 'fix: 修复部署安全检查问题\n\n- 移除文档中的真实API密钥\n- 修复测试脚本中的硬编码密钥\n- 更新安全检查规则避免误报\n- 创建严格的生产环境安全检查\n- 确保所有敏感信息通过环境变量管理';
  
  const commitResult = runCommand(
    `git commit -m "${commitMessage}"`,
    '提交安全修复'
  );
  
  if (commitResult.success) {
    // 3. 推送修复
    const pushResult = runCommand('git push origin main', '推送安全修复');
    
    if (pushResult.success) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 安全修复提交并推送成功！');
      console.log('\n📋 修复内容:');
      console.log('✅ 移除文档中的真实API密钥');
      console.log('✅ 修复测试脚本中的硬编码密钥');
      console.log('✅ 更新安全检查规则');
      console.log('✅ 创建严格的生产环境检查');
      
      console.log('\n🚀 现在可以重新部署到Vercel了！');
    } else {
      console.log('⚠️ 提交成功但推送失败，请手动推送');
    }
  } else {
    console.log('❌ 提交失败');
  }
}

if (require.main === module) {
  main();
}
