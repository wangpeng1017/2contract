import { NextRequest, NextResponse } from 'next/server'
import { OperationService } from '@/lib/services/operation.service'
import { verifyToken } from '@/lib/auth-middleware'
import { OperationStatus } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 获取操作记录
    const operation = await OperationService.getOperation(params.id)
    if (!operation) {
      return NextResponse.json(
        { error: '操作记录不存在' },
        { status: 404 }
      )
    }

    // 验证操作记录所有权
    if (operation.userId !== user.id) {
      return NextResponse.json(
        { error: '无权访问此操作记录' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: operation,
    })
  } catch (error) {
    console.error('获取操作记录失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '获取操作记录失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 获取操作记录
    const operation = await OperationService.getOperation(params.id)
    if (!operation) {
      return NextResponse.json(
        { error: '操作记录不存在' },
        { status: 404 }
      )
    }

    // 验证操作记录所有权
    if (operation.userId !== user.id) {
      return NextResponse.json(
        { error: '无权修改此操作记录' },
        { status: 403 }
      )
    }

    // 解析请求数据
    const body = await request.json()
    const { status, outputData, errorMessage, errorCode } = body

    // 验证状态
    if (status && !Object.values(OperationStatus).includes(status)) {
      return NextResponse.json(
        { error: '操作状态无效' },
        { status: 400 }
      )
    }

    // 更新操作记录
    const updatedOperation = await OperationService.updateOperation(params.id, {
      status,
      outputData,
      errorMessage,
      errorCode,
      endTime: status === OperationStatus.COMPLETED || 
               status === OperationStatus.FAILED || 
               status === OperationStatus.CANCELLED 
               ? new Date() 
               : undefined,
    })

    return NextResponse.json({
      success: true,
      data: updatedOperation,
      message: '操作记录更新成功',
    })
  } catch (error) {
    console.error('更新操作记录失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '更新操作记录失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 获取操作记录
    const operation = await OperationService.getOperation(params.id)
    if (!operation) {
      return NextResponse.json(
        { error: '操作记录不存在' },
        { status: 404 }
      )
    }

    // 验证操作记录所有权
    if (operation.userId !== user.id) {
      return NextResponse.json(
        { error: '无权删除此操作记录' },
        { status: 403 }
      )
    }

    // 只能取消未完成的操作
    if (operation.status === OperationStatus.PROCESSING) {
      await OperationService.cancelOperation(params.id)
      return NextResponse.json({
        success: true,
        message: '操作已取消',
      })
    } else {
      return NextResponse.json(
        { error: '只能取消正在处理中的操作' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('取消操作失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '取消操作失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
