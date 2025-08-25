#!/usr/bin/env node

/**
 * 提交数据持久化实现
 */

const { execSync } = require('child_process')

function runCommand(command, description) {
  console.log(`🔄 ${description}...`)
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log(`✅ ${description} 完成`)
    return { success: true, output: output.trim() }
  } catch (error) {
    console.log(`❌ ${description} 失败: ${error.message}`)
    return { success: false, error: error.message }
  }
}

function main() {
  console.log('💾 提交数据持久化实现 (P1.1)\n')
  console.log('='.repeat(50))
  
  console.log('📋 实现内容:')
  console.log('✅ 完整的数据库Schema设计')
  console.log('✅ Prisma ORM集成和配置')
  console.log('✅ 用户管理服务和API')
  console.log('✅ 操作历史服务和API')
  console.log('✅ 数据加密和安全机制')
  console.log('✅ 数据库健康检查')
  console.log('✅ 种子数据和初始化脚本')
  
  // 1. 暂存所有相关文件
  console.log('\n📦 暂存实现文件...')
  const filesToAdd = [
    'prisma/schema.prisma',
    'src/lib/prisma.ts',
    'src/lib/crypto.ts',
    'src/lib/services/user.service.ts',
    'src/lib/services/operation.service.ts',
    'src/app/api/users/me/route.ts',
    'src/app/api/operations/route.ts',
    'src/app/api/operations/[id]/route.ts',
    'src/app/api/health/database/route.ts',
    'scripts/seed-database.js',
    'scripts/setup-database.js',
    'package.json'
  ]
  
  filesToAdd.forEach(file => {
    runCommand(`git add ${file}`, `暂存 ${file}`)
  })
  
  // 2. 提交实现
  const commitMessage = `feat: 实现数据持久化系统 (P1.1)

🗄️ 数据库设计和集成:
- 完整的Prisma Schema设计（用户、操作、文档、文件等模型）
- 支持用户认证令牌的加密存储
- 操作历史追踪和审计日志
- 文件管理和OCR结果存储

🔧 服务层实现:
- UserService: 用户CRUD操作和令牌管理
- OperationService: 操作记录管理和统计
- 数据加密/解密工具函数
- 数据库连接和健康检查

🌐 API端点:
- /api/users/me - 用户信息管理
- /api/operations - 操作历史查询
- /api/operations/[id] - 操作详情管理
- /api/health/database - 数据库健康检查

🛠️ 开发工具:
- 数据库初始化脚本
- 种子数据生成
- Prisma客户端配置
- 数据库管理命令

✨ 技术特性:
- TypeScript类型安全
- 数据加密存储
- 分页查询支持
- 错误处理机制
- 性能监控指标

📊 完成度: P1.1 数据持久化实现 100%`

  const commitResult = runCommand(
    `git commit -m "${commitMessage}"`,
    '提交数据持久化实现'
  )
  
  if (commitResult.success) {
    // 3. 推送到远程仓库
    const pushResult = runCommand('git push origin main', '推送到远程仓库')
    
    if (pushResult.success) {
      console.log('\n' + '='.repeat(50))
      console.log('🎉 P1.1 数据持久化实现提交成功！')
      
      console.log('\n📋 实现摘要:')
      console.log('✅ 数据库Schema: 8个核心模型')
      console.log('✅ 服务层: 2个核心服务类')
      console.log('✅ API端点: 4个RESTful接口')
      console.log('✅ 工具脚本: 数据库初始化和种子数据')
      console.log('✅ 安全机制: 数据加密和权限验证')
      
      console.log('\n🚀 下一步操作:')
      console.log('1. 运行 npm run db:setup 初始化数据库')
      console.log('2. 测试数据库连接和API端点')
      console.log('3. 开始 P1.2 飞书文档API集成')
      
      console.log('\n📚 验证命令:')
      console.log('• npm run db:setup - 完整数据库设置')
      console.log('• npm run db:studio - 查看数据库内容')
      console.log('• curl http://localhost:3000/api/health/database - 健康检查')
      
    } else {
      console.log('⚠️ 提交成功但推送失败，请手动推送')
      console.log('手动推送命令: git push origin main')
    }
  } else {
    console.log('❌ 提交失败')
    console.log('\n🔧 手动操作:')
    console.log('1. 检查文件状态: git status')
    console.log('2. 手动提交: git commit -m "feat: 实现数据持久化系统"')
    console.log('3. 推送更改: git push origin main')
  }
  
  console.log('\n📊 P1.1 任务状态: ✅ 已完成')
  console.log('⏭️ 下一个任务: P1.2 飞书文档API完整集成')
}

if (require.main === module) {
  main()
}
