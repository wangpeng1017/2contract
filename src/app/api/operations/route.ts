import { NextRequest, NextResponse } from 'next/server'
import { OperationService } from '@/lib/services/operation.service'
import { verifyToken } from '@/lib/auth'
import { OperationType, OperationStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const operationType = searchParams.get('operationType') as OperationType | null
    const status = searchParams.get('status') as OperationStatus | null
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: '分页参数无效' },
        { status: 400 }
      )
    }

    // 获取用户操作历史
    const result = await OperationService.getUserOperations(user.id, {
      page,
      limit,
      operationType: operationType || undefined,
      status: status || undefined,
      startDate,
      endDate,
    })

    return NextResponse.json({
      success: true,
      data: result.operations,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('获取操作历史失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '获取操作历史失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 解析请求数据
    const body = await request.json()
    const { operationType, documentId, inputData } = body

    // 验证操作类型
    if (!operationType || !Object.values(OperationType).includes(operationType)) {
      return NextResponse.json(
        { error: '操作类型无效' },
        { status: 400 }
      )
    }

    // 获取客户端信息
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined

    // 创建操作记录
    const operation = await OperationService.createOperation({
      userId: user.id,
      documentId,
      operationType,
      inputData,
      userAgent,
      ipAddress,
    })

    return NextResponse.json({
      success: true,
      data: operation,
      message: '操作记录创建成功',
    })
  } catch (error) {
    console.error('创建操作记录失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '创建操作记录失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
