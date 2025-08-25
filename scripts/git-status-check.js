#!/usr/bin/env node

/**
 * Git状态检查和提交准备
 */

const { execSync } = require('child_process');
const fs = require('fs');

function runGitCommand(command) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
}

function checkGitStatus() {
  console.log('📋 检查Git仓库状态...\n');
  
  // 检查是否是Git仓库
  const isGitRepo = runGitCommand('git rev-parse --git-dir');
  if (!isGitRepo.success) {
    console.log('❌ 当前目录不是Git仓库');
    return false;
  }
  console.log('✅ Git仓库检查通过');
  
  // 检查工作区状态
  const status = runGitCommand('git status --porcelain');
  if (!status.success) {
    console.log('❌ 无法获取Git状态');
    return false;
  }
  
  if (!status.output) {
    console.log('✅ 工作区干净，没有待提交的变更');
    return false;
  }
  
  console.log('📝 发现以下变更:');
  const lines = status.output.split('\n');
  const changes = {
    modified: [],
    added: [],
    deleted: [],
    untracked: []
  };
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    const statusCode = line.substring(0, 2);
    const file = line.substring(3);
    
    if (statusCode.includes('M')) {
      changes.modified.push(file);
      console.log(`  📝 修改: ${file}`);
    } else if (statusCode.includes('A')) {
      changes.added.push(file);
      console.log(`  ➕ 新增: ${file}`);
    } else if (statusCode.includes('D')) {
      changes.deleted.push(file);
      console.log(`  🗑️ 删除: ${file}`);
    } else if (statusCode.includes('??')) {
      changes.untracked.push(file);
      console.log(`  ❓ 未跟踪: ${file}`);
    }
  });
  
  // 检查是否有敏感文件
  const allFiles = [...changes.modified, ...changes.added, ...changes.untracked];
  const sensitiveFiles = allFiles.filter(file => 
    file.includes('.env.local') || 
    file.includes('.env') ||
    file.includes('secrets') ||
    file.includes('private')
  );
  
  if (sensitiveFiles.length > 0) {
    console.log('\n🚨 警告: 发现可能的敏感文件:');
    sensitiveFiles.forEach(file => {
      console.log(`  ⚠️ ${file}`);
    });
    console.log('请确认这些文件已被.gitignore正确排除！');
  }
  
  return { success: true, changes };
}

function checkRemoteRepo() {
  console.log('\n🌐 检查远程仓库...');
  
  const remotes = runGitCommand('git remote -v');
  if (!remotes.success || !remotes.output) {
    console.log('⚠️ 未配置远程仓库');
    return false;
  }
  
  console.log('📡 远程仓库信息:');
  console.log(remotes.output);
  
  const currentBranch = runGitCommand('git branch --show-current');
  if (currentBranch.success) {
    console.log(`📍 当前分支: ${currentBranch.output}`);
  }
  
  return true;
}

function main() {
  console.log('🚀 Git提交准备检查\n');
  console.log('='.repeat(50));
  
  const statusResult = checkGitStatus();
  if (!statusResult || !statusResult.success) {
    return false;
  }
  
  checkRemoteRepo();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Git状态检查完成');
  console.log('\n📋 变更摘要:');
  
  const { changes } = statusResult;
  if (changes.modified.length > 0) {
    console.log(`📝 修改文件: ${changes.modified.length} 个`);
  }
  if (changes.added.length > 0) {
    console.log(`➕ 新增文件: ${changes.added.length} 个`);
  }
  if (changes.untracked.length > 0) {
    console.log(`❓ 未跟踪文件: ${changes.untracked.length} 个`);
  }
  
  console.log('\n🎯 下一步: 执行 git add 暂存文件');
  return true;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { checkGitStatus, checkRemoteRepo };
