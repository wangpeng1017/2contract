#!/usr/bin/env node

/**
 * 数据库种子数据脚本
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedSystemConfigs() {
  console.log('🌱 创建系统配置...')
  
  const configs = [
    {
      key: 'app_name',
      value: '飞书合同内容更新助手',
      type: 'string',
      category: 'general',
      description: '应用名称',
      isPublic: true,
    },
    {
      key: 'app_version',
      value: '1.0.0',
      type: 'string',
      category: 'general',
      description: '应用版本',
      isPublic: true,
    },
    {
      key: 'max_file_size',
      value: '10485760', // 10MB
      type: 'number',
      category: 'upload',
      description: '最大文件上传大小（字节）',
      isPublic: true,
    },
    {
      key: 'allowed_file_types',
      value: JSON.stringify(['image/jpeg', 'image/png', 'image/webp']),
      type: 'json',
      category: 'upload',
      description: '允许的文件类型',
      isPublic: true,
    },
    {
      key: 'ocr_timeout',
      value: '30000', // 30秒
      type: 'number',
      category: 'ocr',
      description: 'OCR处理超时时间（毫秒）',
      isPublic: false,
    },
    {
      key: 'operation_retention_days',
      value: '90',
      type: 'number',
      category: 'cleanup',
      description: '操作记录保留天数',
      isPublic: false,
    },
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    })
  }

  console.log('✅ 系统配置创建完成')
}

async function seedReplacementRules() {
  console.log('🌱 创建默认替换规则...')
  
  const defaultRules = [
    {
      name: '甲方公司名称',
      description: '替换合同中的甲方公司名称',
      searchText: '【甲方公司】',
      replaceText: '',
      caseSensitive: false,
      wholeWord: true,
      priority: 10,
      isSystem: true,
      isActive: true,
    },
    {
      name: '乙方公司名称',
      description: '替换合同中的乙方公司名称',
      searchText: '【乙方公司】',
      replaceText: '',
      caseSensitive: false,
      wholeWord: true,
      priority: 10,
      isSystem: true,
      isActive: true,
    },
    {
      name: '合同金额',
      description: '替换合同中的金额',
      searchText: '【合同金额】',
      replaceText: '',
      caseSensitive: false,
      wholeWord: true,
      priority: 5,
      isSystem: true,
      isActive: true,
    },
    {
      name: '签约日期',
      description: '替换合同中的签约日期',
      searchText: '【签约日期】',
      replaceText: '',
      caseSensitive: false,
      wholeWord: true,
      priority: 5,
      isSystem: true,
      isActive: true,
    },
    {
      name: '生效日期',
      description: '替换合同中的生效日期',
      searchText: '【生效日期】',
      replaceText: '',
      caseSensitive: false,
      wholeWord: true,
      priority: 5,
      isSystem: true,
      isActive: true,
    },
  ]

  for (const rule of defaultRules) {
    await prisma.replacementRule.upsert({
      where: { 
        name: rule.name,
      },
      update: rule,
      create: rule,
    })
  }

  console.log('✅ 默认替换规则创建完成')
}

async function main() {
  console.log('🚀 开始数据库种子数据初始化\n')
  
  try {
    await seedSystemConfigs()
    await seedReplacementRules()
    
    console.log('\n🎉 数据库种子数据初始化完成！')
    
    // 显示统计信息
    const stats = await prisma.$transaction([
      prisma.systemConfig.count(),
      prisma.replacementRule.count(),
    ])
    
    console.log('\n📊 数据统计:')
    console.log(`• 系统配置: ${stats[0]} 条`)
    console.log(`• 替换规则: ${stats[1]} 条`)
    
  } catch (error) {
    console.error('❌ 数据库种子数据初始化失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
