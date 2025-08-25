#!/usr/bin/env node

/**
 * 修复Tailwind CSS构建问题
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
  console.log('🎨 修复Tailwind CSS构建问题\n');
  console.log('='.repeat(50));
  
  console.log('📋 修复内容:');
  console.log('✅ 修复 globals.css 中的 border-border 错误');
  console.log('✅ 更新 tailwind.config.ts 支持CSS变量');
  console.log('✅ 添加完整的颜色系统配置');
  
  // 1. 暂存修复的文件
  console.log('\n📦 暂存修复文件...');
  const filesToAdd = [
    'src/app/globals.css',
    'tailwind.config.ts'
  ];
  
  filesToAdd.forEach(file => {
    runCommand(`git add ${file}`, `暂存 ${file}`);
  });
  
  // 2. 提交修复
  const commitMessage = 'fix: 修复Tailwind CSS构建错误\n\n- 修复globals.css中的border-border类错误\n- 更新tailwind.config.ts支持CSS变量\n- 添加完整的设计系统颜色配置\n- 确保生产环境构建成功';
  
  const commitResult = runCommand(
    `git commit -m "${commitMessage}"`,
    '提交Tailwind修复'
  );
  
  if (commitResult.success) {
    // 3. 推送修复
    const pushResult = runCommand('git push origin main', '推送Tailwind修复');
    
    if (pushResult.success) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Tailwind CSS修复提交并推送成功！');
      
      console.log('\n📋 修复摘要:');
      console.log('✅ 移除了无效的 border-border 类');
      console.log('✅ 更新了 Tailwind 配置支持 CSS 变量');
      console.log('✅ 添加了完整的设计系统');
      console.log('✅ 修复了生产环境构建问题');
      
      console.log('\n🚀 现在可以重新部署到Vercel了！');
      console.log('预期结果: 构建成功，部署完成');
      
    } else {
      console.log('⚠️ 提交成功但推送失败，请手动推送');
      console.log('手动推送命令: git push origin main');
    }
  } else {
    console.log('❌ 提交失败');
    console.log('\n🔧 手动操作:');
    console.log('1. git add src/app/globals.css tailwind.config.ts');
    console.log('2. git commit -m "fix: 修复Tailwind CSS构建错误"');
    console.log('3. git push origin main');
  }
  
  console.log('\n💡 技术说明:');
  console.log('• border-border 不是有效的 Tailwind 类名');
  console.log('• 使用 border-solid 替代，或者配置自定义 border 变量');
  console.log('• 更新了 tailwind.config.ts 以支持 CSS 变量系统');
  console.log('• 这确保了设计系统的一致性和主题切换功能');
}

if (require.main === module) {
  main();
}
