import { prisma } from '@/lib/prisma'
import { User, Prisma } from '@prisma/client'
import { encrypt, decrypt } from '@/lib/crypto'

export interface CreateUserData {
  feishuUserId: string
  name: string
  email?: string
  avatarUrl?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: Date
}

export interface UpdateUserData {
  name?: string
  email?: string
  avatarUrl?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: Date
  isActive?: boolean
}

export class UserService {
  /**
   * 创建新用户
   */
  static async createUser(data: CreateUserData): Promise<User> {
    const userData: Prisma.UserCreateInput = {
      feishuUserId: data.feishuUserId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      accessToken: data.accessToken ? encrypt(data.accessToken) : null,
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
      tokenExpiry: data.tokenExpiry,
    }

    return await prisma.user.create({
      data: userData,
    })
  }

  /**
   * 根据飞书用户ID查找用户
   */
  static async findByFeishuUserId(feishuUserId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { feishuUserId },
    })
  }

  /**
   * 根据用户ID查找用户
   */
  static async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    })
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const updateData: Prisma.UserUpdateInput = {
      ...data,
      accessToken: data.accessToken ? encrypt(data.accessToken) : undefined,
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : undefined,
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
    })
  }

  /**
   * 创建或更新用户（用于OAuth登录）
   */
  static async upsertUser(data: CreateUserData): Promise<User> {
    const userData: Prisma.UserUpsertArgs['create'] = {
      feishuUserId: data.feishuUserId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      accessToken: data.accessToken ? encrypt(data.accessToken) : null,
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
      tokenExpiry: data.tokenExpiry,
    }

    return await prisma.user.upsert({
      where: { feishuUserId: data.feishuUserId },
      create: userData,
      update: {
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        accessToken: data.accessToken ? encrypt(data.accessToken) : undefined,
        refreshToken: data.refreshToken ? encrypt(data.refreshToken) : undefined,
        tokenExpiry: data.tokenExpiry,
        isActive: true,
      },
    })
  }

  /**
   * 获取用户的解密令牌
   */
  static async getUserTokens(id: string): Promise<{
    accessToken: string | null
    refreshToken: string | null
    tokenExpiry: Date | null
  }> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
      },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return {
      accessToken: user.accessToken ? decrypt(user.accessToken) : null,
      refreshToken: user.refreshToken ? decrypt(user.refreshToken) : null,
      tokenExpiry: user.tokenExpiry,
    }
  }

  /**
   * 更新用户令牌
   */
  static async updateUserTokens(
    id: string,
    accessToken: string,
    refreshToken?: string,
    tokenExpiry?: Date
  ): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
        tokenExpiry,
      },
    })
  }

  /**
   * 删除用户令牌
   */
  static async clearUserTokens(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
      },
    })
  }

  /**
   * 停用用户
   */
  static async deactivateUser(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(id: string) {
    const [operationCount, documentCount, fileCount] = await Promise.all([
      prisma.operation.count({ where: { userId: id } }),
      prisma.document.count({ where: { userId: id } }),
      prisma.uploadedFile.count({ where: { userId: id } }),
    ])

    return {
      operationCount,
      documentCount,
      fileCount,
    }
  }

  /**
   * 获取用户的最近操作
   */
  static async getUserRecentOperations(id: string, limit: number = 10) {
    return await prisma.operation.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        document: {
          select: {
            title: true,
            url: true,
          },
        },
      },
    })
  }

  /**
   * 检查用户是否存在
   */
  static async userExists(feishuUserId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { feishuUserId },
    })
    return count > 0
  }

  /**
   * 获取活跃用户列表
   */
  static async getActiveUsers(limit: number = 50) {
    return await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }
}
