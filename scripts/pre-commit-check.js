#!/usr/bin/env node

/**
 * Git提交前安全检查
 */

const fs = require('fs');
const path = require('path');

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'Database URL', pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/g },
  { name: 'Vercel Token', pattern: /vercel_blob_rw_[a-zA-Z0-9]+/g },
  { name: 'JWT Secret', pattern: /[a-zA-Z0-9+\/]{40,}={0,2}/g }
];

// 需要检查的文件扩展名
const CHECKED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

// 排除的文件和目录
const EXCLUDED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  '.env.local',
  '.env',
  'scripts/pre-commit-check.js',
  'docs/API密钥安全管理指南.md',
  'docs/环境变量配置完整指南.md'
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const issues = [];

    SENSITIVE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: relativePath,
            type: pattern.name,
            match: match.substring(0, 20) + '...'
          });
        });
      }
    });

    return issues;
  } catch (error) {
    return [];
  }
}

function checkDirectory(dirPath) {
  let allIssues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const relativePath = path.relative(process.cwd(), itemPath);
      
      // 检查是否在排除列表中
      if (EXCLUDED_PATHS.some(excluded => relativePath.startsWith(excluded))) {
        continue;
      }

      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        allIssues = allIssues.concat(checkDirectory(itemPath));
      } else if (stat.isFile()) {
        const ext = path.extname(itemPath);
        if (CHECKED_EXTENSIONS.includes(ext)) {
          allIssues = allIssues.concat(checkFile(itemPath));
        }
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }
  
  return allIssues;
}

function checkGitignore() {
  const gitignorePath = '.gitignore';
  if (!fs.existsSync(gitignorePath)) {
    return false;
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  return content.includes('.env*.local') && content.includes('.env');
}

function main() {
  console.log('🔒 执行Git提交前安全检查...\n');
  
  // 1. 检查.gitignore配置
  console.log('1️⃣ 检查.gitignore配置');
  if (checkGitignore()) {
    console.log('✅ .gitignore 已正确配置环境变量文件');
  } else {
    console.log('❌ .gitignore 配置不正确');
    return false;
  }
  
  // 2. 检查敏感信息
  console.log('\n2️⃣ 扫描代码中的敏感信息');
  const issues = checkDirectory('.');
  
  if (issues.length === 0) {
    console.log('✅ 未发现敏感信息泄露');
  } else {
    console.log(`❌ 发现 ${issues.length} 个潜在的敏感信息:`);
    issues.forEach(issue => {
      console.log(`  📁 ${issue.file}`);
      console.log(`     类型: ${issue.type}`);
      console.log(`     内容: ${issue.match}`);
    });
    return false;
  }
  
  // 3. 检查.env.local文件状态
  console.log('\n3️⃣ 检查环境变量文件');
  if (fs.existsSync('.env.local')) {
    console.log('✅ .env.local 文件存在（应被git忽略）');
  } else {
    console.log('⚠️ .env.local 文件不存在');
  }
  
  console.log('\n🎉 安全检查通过！可以安全提交代码。');
  return true;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };
