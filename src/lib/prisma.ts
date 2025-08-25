import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 延迟初始化 Prisma 客户端，避免构建时错误
let _prisma: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  try {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    return _prisma;
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error);
    // 在构建时返回一个模拟客户端
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return {} as PrismaClient;
    }
    throw error;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 数据库连接测试函数
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    console.log('✅ 数据库连接成功')
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    return false
  }
}

// 数据库健康检查
export async function getDatabaseHealth() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// 优雅关闭数据库连接
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ 数据库连接已关闭')
  } catch (error) {
    console.error('❌ 关闭数据库连接时出错:', error)
  }
}

// 数据库统计信息
export async function getDatabaseStats() {
  try {
    const [userCount, operationCount, documentCount, fileCount] = await Promise.all([
      prisma.user.count(),
      prisma.operation.count(),
      prisma.document.count(),
      prisma.uploadedFile.count()
    ])

    return {
      users: userCount,
      operations: operationCount,
      documents: documentCount,
      files: fileCount,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取数据库统计信息失败:', error)
    return null
  }
}
