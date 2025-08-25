import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseHealth, getDatabaseStats } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 检查是否在构建时
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        health: {
          status: 'build-time',
          message: 'Database check skipped during build',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取数据库健康状态
    const health = await getDatabaseHealth()
    
    // 如果数据库不健康，返回错误状态
    if (health.status !== 'healthy') {
      return NextResponse.json(
        {
          success: false,
          health,
        },
        { status: 503 }
      )
    }

    // 获取数据库统计信息
    const stats = await getDatabaseStats()

    return NextResponse.json({
      success: true,
      health,
      stats,
    })
  } catch (error) {
    console.error('数据库健康检查失败:', error)
    return NextResponse.json(
      {
        success: false,
        health: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    )
  }
}
