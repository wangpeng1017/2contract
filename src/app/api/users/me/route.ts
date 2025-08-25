import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { verifyToken } from '@/lib/auth-middleware'

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

    // 获取用户详细信息
    const userDetails = await UserService.findById(user.id)
    if (!userDetails) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取用户统计信息
    const stats = await UserService.getUserStats(user.id)

    // 返回用户信息（不包含敏感数据）
    const response = {
      id: userDetails.id,
      feishuUserId: userDetails.feishuUserId,
      name: userDetails.name,
      email: userDetails.email,
      avatarUrl: userDetails.avatarUrl,
      isActive: userDetails.isActive,
      createdAt: userDetails.createdAt,
      updatedAt: userDetails.updatedAt,
      stats,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '获取用户信息失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { name, email } = body

    // 验证输入数据
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      )
    }

    if (email && typeof email !== 'string') {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }

    // 更新用户信息
    const updatedUser = await UserService.updateUser(user.id, {
      name: name.trim(),
      email: email?.trim() || undefined,
    })

    // 返回更新后的用户信息
    const response = {
      id: updatedUser.id,
      feishuUserId: updatedUser.feishuUserId,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: '用户信息更新成功',
    })
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '更新用户信息失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 停用用户账户（软删除）
    await UserService.deactivateUser(user.id)

    return NextResponse.json({
      success: true,
      message: '用户账户已停用',
    })
  } catch (error) {
    console.error('停用用户账户失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '停用用户账户失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
