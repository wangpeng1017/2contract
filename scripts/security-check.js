#!/usr/bin/env node

/**
 * 代码提交前安全检查脚本
 * 检查代码中是否包含敏感信息（API密钥、密码等）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 敏感信息检测模式
const SENSITIVE_PATTERNS = [
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Slack Bot Token',
    pattern: /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Generic API Key',
    pattern: /[aA][pP][iI][_\-]?[kK][eE][yY]\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/g,
    severity: 'HIGH'
  },
  {
    name: 'Password in Code',
    pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]{8,}['"]/g,
    severity: 'HIGH'
  },
  {
    name: 'Secret in Code',
    pattern: /[sS][eE][cC][rR][eE][tT]\s*[:=]\s*['"][^'"]{10,}['"]/g,
    severity: 'HIGH'
  },
  {
    name: 'Token in Code',
    pattern: /[tT][oO][kK][eE][nN]\s*[:=]\s*['"][^'"]{20,}['"]/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Database URL',
    pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/g,
    severity: 'HIGH'
  },
  {
    name: 'MongoDB URI',
    pattern: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/g,
    severity: 'HIGH'
  }
];

// 需要检查的文件扩展名
const CHECKED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml'];

// 排除的目录和文件
const EXCLUDED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.env.example',
  'scripts/security-check.js', // 排除自身
  'docs/API密钥安全管理指南.md' // 排除包含示例密钥的文档
];

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.checkedFiles = 0;
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      SENSITIVE_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          matches.forEach(match => {
            // 获取匹配内容的行号
            const lines = content.split('\n');
            let lineNumber = 1;
            let charCount = 0;
            
            for (const line of lines) {
              charCount += line.length + 1; // +1 for newline
              if (charCount >= content.indexOf(match)) {
                break;
              }
              lineNumber++;
            }

            this.issues.push({
              file: relativePath,
              line: lineNumber,
              type: pattern.name,
              severity: pattern.severity,
              match: match.substring(0, 20) + '...' // 只显示前20个字符
            });
          });
        }
      });

      this.checkedFiles++;
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * 递归检查目录
   */
  checkDirectory(dirPath) {
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
          this.checkDirectory(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(itemPath);
          if (CHECKED_EXTENSIONS.includes(ext)) {
            this.checkFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * 检查Git暂存区的文件
   */
  checkStagedFiles() {
    try {
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(file => file.trim() !== '');

      console.log(`🔍 检查 ${stagedFiles.length} 个暂存文件...`);

      for (const file of stagedFiles) {
        if (fs.existsSync(file)) {
          const ext = path.extname(file);
          if (CHECKED_EXTENSIONS.includes(ext)) {
            this.checkFile(file);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not get staged files, checking all files instead');
      this.checkDirectory(process.cwd());
    }
  }

  /**
   * 运行完整检查
   */
  runFullCheck() {
    console.log('🔍 执行完整代码安全检查...');
    this.checkDirectory(process.cwd());
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log(`\n📊 安全检查报告`);
    console.log(`检查文件数: ${this.checkedFiles}`);
    console.log(`发现问题数: ${this.issues.length}\n`);

    if (this.issues.length === 0) {
      console.log('✅ 未发现安全问题！');
      return true;
    }

    // 按严重程度分组
    const groupedIssues = this.issues.reduce((groups, issue) => {
      if (!groups[issue.severity]) {
        groups[issue.severity] = [];
      }
      groups[issue.severity].push(issue);
      return groups;
    }, {});

    // 显示问题
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    let hasCriticalIssues = false;

    severityOrder.forEach(severity => {
      if (groupedIssues[severity]) {
        const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : '💡';
        console.log(`${icon} ${severity} 级别问题 (${groupedIssues[severity].length}个):`);
        
        groupedIssues[severity].forEach(issue => {
          console.log(`  📁 ${issue.file}:${issue.line}`);
          console.log(`     类型: ${issue.type}`);
          console.log(`     内容: ${issue.match}`);
          console.log('');
        });

        if (severity === 'CRITICAL') {
          hasCriticalIssues = true;
        }
      }
    });

    // 提供修复建议
    console.log('🔧 修复建议:');
    console.log('1. 将敏感信息移动到环境变量文件 (.env.local)');
    console.log('2. 确保 .env*.local 已添加到 .gitignore');
    console.log('3. 使用 process.env.VARIABLE_NAME 读取环境变量');
    console.log('4. 检查是否有硬编码的密钥或密码');
    console.log('');

    return !hasCriticalIssues;
  }
}

/**
 * 检查环境变量配置
 */
function checkEnvironmentConfig() {
  console.log('🔧 检查环境变量配置...');
  
  const envExamplePath = '.env.example';
  const envLocalPath = '.env.local';
  const gitignorePath = '.gitignore';

  let configOk = true;

  // 检查 .env.example 是否存在
  if (!fs.existsSync(envExamplePath)) {
    console.log('⚠️ .env.example 文件不存在');
    configOk = false;
  } else {
    console.log('✅ .env.example 文件存在');
  }

  // 检查 .env.local 是否存在
  if (!fs.existsSync(envLocalPath)) {
    console.log('⚠️ .env.local 文件不存在');
    configOk = false;
  } else {
    console.log('✅ .env.local 文件存在');
  }

  // 检查 .gitignore 配置
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env*.local')) {
      console.log('✅ .gitignore 已正确配置环境变量文件');
    } else {
      console.log('❌ .gitignore 未正确配置环境变量文件');
      configOk = false;
    }
  } else {
    console.log('❌ .gitignore 文件不存在');
    configOk = false;
  }

  return configOk;
}

/**
 * 主函数
 */
function main() {
  console.log('🛡️ 代码安全检查工具\n');

  const args = process.argv.slice(2);
  const isPreCommit = args.includes('--pre-commit');
  const isFullCheck = args.includes('--full');

  // 检查环境配置
  const envConfigOk = checkEnvironmentConfig();
  console.log('');

  // 创建检查器实例
  const checker = new SecurityChecker();

  // 执行检查
  if (isPreCommit) {
    checker.checkStagedFiles();
  } else if (isFullCheck) {
    checker.runFullCheck();
  } else {
    // 默认检查暂存文件，如果没有则检查所有文件
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      checker.checkStagedFiles();
    } catch {
      checker.runFullCheck();
    }
  }

  // 生成报告
  const securityOk = checker.generateReport();

  // 最终结果
  if (envConfigOk && securityOk) {
    console.log('🎉 所有安全检查通过！');
    process.exit(0);
  } else {
    console.log('❌ 发现安全问题，请修复后重试');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { SecurityChecker };
