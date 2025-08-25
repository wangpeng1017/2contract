#!/usr/bin/env node

/**
 * 数据库设置脚本
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function runCommand(command, description) {
  console.log(`🔄 ${description}...`)
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit'
    })
    
    console.log(`✅ ${description} 完成`)
    return { success: true }
  } catch (error) {
    console.log(`❌ ${description} 失败`)
    console.error(error.message)
    return { success: false, error: error.message }
  }
}

function checkEnvironmentVariables() {
  console.log('🔍 检查环境变量...')
  
  const requiredVars = [
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'ENCRYPTION_KEY'
  ]
  
  const missing = []
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ 缺少必需的环境变量:')
    missing.forEach(varName => {
      console.log(`   • ${varName}`)
    })
    return false
  }
  
  console.log('✅ 环境变量检查通过')
  return true
}

function checkPrismaSchema() {
  console.log('🔍 检查Prisma Schema...')
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  
  if (!fs.existsSync(schemaPath)) {
    console.log('❌ Prisma Schema文件不存在')
    return false
  }
  
  console.log('✅ Prisma Schema文件存在')
  return true
}

async function main() {
  console.log('🗄️ 数据库设置向导\n')
  console.log('='.repeat(50))
  
  // 1. 检查环境变量
  if (!checkEnvironmentVariables()) {
    console.log('\n💡 请确保在 .env.local 文件中配置了所有必需的环境变量')
    process.exit(1)
  }
  
  // 2. 检查Prisma Schema
  if (!checkPrismaSchema()) {
    console.log('\n💡 请确保 prisma/schema.prisma 文件存在')
    process.exit(1)
  }
  
  // 3. 安装Prisma依赖
  console.log('\n📦 安装Prisma依赖...')
  const installResult = runCommand('npm install @prisma/client prisma', '安装Prisma依赖')
  if (!installResult.success) {
    console.log('❌ Prisma依赖安装失败')
    process.exit(1)
  }
  
  // 4. 生成Prisma客户端
  console.log('\n🔧 生成Prisma客户端...')
  const generateResult = runCommand('npx prisma generate', '生成Prisma客户端')
  if (!generateResult.success) {
    console.log('❌ Prisma客户端生成失败')
    process.exit(1)
  }
  
  // 5. 推送数据库Schema
  console.log('\n🚀 推送数据库Schema...')
  const pushResult = runCommand('npx prisma db push', '推送数据库Schema')
  if (!pushResult.success) {
    console.log('❌ 数据库Schema推送失败')
    console.log('\n💡 可能的原因:')
    console.log('• 数据库连接配置错误')
    console.log('• 数据库服务未启动')
    console.log('• 网络连接问题')
    process.exit(1)
  }
  
  // 6. 初始化种子数据
  console.log('\n🌱 初始化种子数据...')
  const seedResult = runCommand('npm run db:seed', '初始化种子数据')
  if (!seedResult.success) {
    console.log('⚠️ 种子数据初始化失败，但数据库Schema已成功创建')
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 数据库设置完成！')
  
  console.log('\n📋 完成的任务:')
  console.log('✅ 环境变量验证')
  console.log('✅ Prisma依赖安装')
  console.log('✅ Prisma客户端生成')
  console.log('✅ 数据库Schema创建')
  if (seedResult.success) {
    console.log('✅ 种子数据初始化')
  }
  
  console.log('\n🔗 后续操作:')
  console.log('• 运行 npm run db:studio 查看数据库')
  console.log('• 运行 npm run dev 启动开发服务器')
  console.log('• 访问 /api/health/database 检查数据库健康状态')
  
  console.log('\n📚 有用的命令:')
  console.log('• npm run db:generate - 重新生成Prisma客户端')
  console.log('• npm run db:push - 推送Schema更改到数据库')
  console.log('• npm run db:studio - 打开Prisma Studio')
  console.log('• npm run db:seed - 重新运行种子数据')
}

if (require.main === module) {
  main()
}
