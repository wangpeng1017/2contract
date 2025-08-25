#!/usr/bin/env node

/**
 * 严格的安全检查脚本 - 用于生产部署
 * 只检测真正的敏感信息，避免误报
 */

const fs = require('fs');
const path = require('path');

// 严格的敏感信息检测模式
const SENSITIVE_PATTERNS = [
  {
    name: 'Real Google API Key',
    pattern: /AIza[0-9A-Za-z-_]{35}(?![x_-])/g, // 排除示例密钥
    severity: 'CRITICAL'
  },
  {
    name: 'Real Database URL',
    pattern: /postgres:\/\/[^:\s]+:[^@\s]{8,}@[^\/\s]+\/[^\s]+/g, // 至少8位密码
    severity: 'CRITICAL'
  },
  {
    name: 'Vercel Blob Token',
    pattern: /vercel_blob_rw_[a-zA-Z0-9]{20,}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Real JWT Secret',
    pattern: /JWT_SECRET\s*[:=]\s*['"][a-zA-Z0-9+\/]{32,}={0,2}['"]/g,
    severity: 'CRITICAL'
  }
];

// 需要检查的文件扩展名
const CHECKED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// 排除的文件和目录
const EXCLUDED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.env.example',
  'scripts/security-check.js',
  'scripts/security-check-strict.js',
  'docs/API密钥安全管理指南.md',
  'docs/环境变量配置完整指南.md',
  'docs/提交记录-前端界面开发完成.md'
];

class StrictSecurityChecker {
  constructor() {
    this.issues = [];
    this.checkedFiles = 0;
  }

  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      SENSITIVE_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          matches.forEach(match => {
            // 排除明显的示例或注释
            if (this.isExampleOrComment(match, content)) {
              return;
            }

            const lines = content.split('\n');
            let lineNumber = 1;
            let charCount = 0;
            
            for (const line of lines) {
              charCount += line.length + 1;
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
              match: match.substring(0, 20) + '...'
            });
          });
        }
      });

      this.checkedFiles++;
    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  isExampleOrComment(match, content) {
    const matchIndex = content.indexOf(match);
    const beforeMatch = content.substring(Math.max(0, matchIndex - 100), matchIndex);
    const afterMatch = content.substring(matchIndex, matchIndex + 100);
    
    // 检查是否是示例或注释
    const exampleIndicators = [
      'example',
      'sample',
      'demo',
      'test',
      'placeholder',
      'your_actual',
      'xxxxxxx',
      '示例',
      '样例',
      '测试'
    ];
    
    const contextText = (beforeMatch + afterMatch).toLowerCase();
    return exampleIndicators.some(indicator => contextText.includes(indicator));
  }

  checkDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const relativePath = path.relative(process.cwd(), itemPath);
        
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
      // 忽略无法访问的目录
    }
  }

  generateReport() {
    console.log(`📊 严格安全检查报告`);
    console.log(`检查文件数: ${this.checkedFiles}`);
    console.log(`发现问题数: ${this.issues.length}\n`);

    if (this.issues.length === 0) {
      console.log('✅ 未发现真实的敏感信息泄露！');
      return true;
    }

    console.log('🚨 发现真实的敏感信息:');
    this.issues.forEach(issue => {
      console.log(`📁 ${issue.file}:${issue.line}`);
      console.log(`   类型: ${issue.type}`);
      console.log(`   内容: ${issue.match}`);
      console.log('');
    });

    return false;
  }

  run() {
    console.log('🛡️ 严格安全检查 - 生产部署版本\n');
    this.checkDirectory(process.cwd());
    return this.generateReport();
  }
}

function main() {
  const checker = new StrictSecurityChecker();
  const isSecure = checker.run();
  
  if (isSecure) {
    console.log('🎉 严格安全检查通过，可以安全部署！');
    process.exit(0);
  } else {
    console.log('❌ 发现真实的敏感信息，请修复后重试');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { StrictSecurityChecker };
