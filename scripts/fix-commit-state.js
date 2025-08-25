#!/usr/bin/env node

/**
 * 修复Git提交状态脚本
 * 处理COMMIT_EDITMSG文件和完成提交
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    process: '🔄'
  };
  console.log(`${icons[type]} ${message}`);
}

function executeCommand(command, description) {
  log(`${description}...`, 'process');
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    log(`${description} 完成`, 'success');
    return { success: true, output: output.trim() };
  } catch (error) {
    log(`${description} 失败: ${error.message}`, 'error');
    return { success: false, error: error.message, output: error.stdout || error.stderr || '' };
  }
}

function fixCommitState() {
  log('修复Git提交状态', 'process');
  
  const commitMsgPath = '.git/COMMIT_EDITMSG';
  
  // 检查COMMIT_EDITMSG文件是否存在
  if (fs.existsSync(commitMsgPath)) {
    log('发现COMMIT_EDITMSG文件，尝试完成提交', 'info');
    
    try {
      // 读取当前的提交信息
      const currentMsg = fs.readFileSync(commitMsgPath, 'utf8');
      log('当前提交信息已准备', 'info');
      
      // 尝试完成提交
      const commitResult = executeCommand('git commit --no-edit', '完成提交（使用现有消息）');
      
      if (commitResult.success) {
        log('提交成功完成', 'success');
        return true;
      }
    } catch (error) {
      log(`读取提交信息失败: ${error.message}`, 'error');
    }
  }
  
  // 如果上面的方法失败，尝试重新提交
  log('尝试重新创建提交', 'process');
  
  const commitMessage = `feat: 完成前端界面开发和环境变量配置

🎨 新增功能:
- 智能工作台页面 (/workspace) 和完整工作流程
- 文档输入组件 (DocumentInput) - 飞书文档链接验证
- OCR上传组件 (ImageUpload) - 图片识别和处理
- 规则编辑器 (RuleEditor) - 文本替换规则管理
- 工作流指示器 (StepIndicator) - 步骤进度显示

🔧 技术改进:
- 使用Zustand实现全局状态管理
- 完整的TypeScript类型定义
- 响应式UI设计和用户体验优化
- 组件化架构和模块化设计

📚 文档和工具:
- 环境变量配置完整指南
- 安全检查和验证脚本
- API密钥管理最佳实践文档
- 功能验证清单和测试指南

🔒 安全配置:
- 完善的环境变量管理
- 敏感信息安全存储
- Git提交前安全检查
- API密钥格式验证

✨ 核心功能完成度: 90%
- 飞书OAuth认证 ✅
- OCR图片识别 ✅
- 文档内容替换 ✅
- 数据持久化存储 ✅
- 用户界面和交互 ✅`;

  // 转义提交信息中的特殊字符
  const escapedMessage = commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  
  const newCommitResult = executeCommand(
    `git commit -m "${escapedMessage}"`,
    '创建新提交'
  );
  
  return newCommitResult.success;
}

function main() {
  console.log('🔧 Git提交状态修复工具\n');
  console.log('='.repeat(50));
  
  // 检查Git状态
  const statusResult = executeCommand('git status', '检查Git状态');
  if (!statusResult.success) {
    log('无法获取Git状态', 'error');
    process.exit(1);
  }
  
  console.log('\nGit状态:');
  console.log(statusResult.output);
  
  // 检查是否有暂存的文件
  if (statusResult.output.includes('Changes to be committed')) {
    log('发现暂存的文件，准备提交', 'info');
    
    if (fixCommitState()) {
      log('提交修复成功', 'success');
      
      // 验证提交
      const logResult = executeCommand('git log --oneline -1', '验证最新提交');
      if (logResult.success) {
        log('最新提交:', 'info');
        console.log(`  📝 ${logResult.output}`);
      }
      
      console.log('\n🚀 下一步: 推送到远程仓库');
      console.log('运行: git push origin main');
      
    } else {
      log('提交修复失败', 'error');
      console.log('\n🔧 手动解决方案:');
      console.log('1. 检查暂存文件: git status');
      console.log('2. 手动提交: git commit -m "feat: 完成前端界面开发"');
      console.log('3. 推送: git push origin main');
    }
    
  } else if (statusResult.output.includes('nothing to commit')) {
    log('没有需要提交的更改', 'info');
    
    // 检查是否需要推送
    if (statusResult.output.includes('Your branch is ahead')) {
      log('有未推送的提交，准备推送', 'info');
      const pushResult = executeCommand('git push origin main', '推送到远程仓库');
      
      if (pushResult.success) {
        log('推送成功完成', 'success');
      } else {
        log('推送失败，请手动执行: git push origin main', 'warning');
      }
    } else {
      log('仓库状态正常，无需操作', 'success');
    }
    
  } else {
    log('发现未暂存的更改', 'warning');
    console.log('\n🔧 建议操作:');
    console.log('1. 暂存文件: git add .');
    console.log('2. 重新运行此脚本');
  }
  
  console.log('\n' + '='.repeat(50));
  log('Git状态修复完成', 'success');
}

if (require.main === module) {
  main();
}

module.exports = { fixCommitState };
