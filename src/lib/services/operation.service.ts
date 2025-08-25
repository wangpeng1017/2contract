import { prisma } from '@/lib/prisma'
import { Operation, OperationType, OperationStatus, Prisma } from '@prisma/client'

export interface CreateOperationData {
  userId: string
  documentId?: string
  operationType: OperationType
  inputData?: any
  userAgent?: string
  ipAddress?: string
}

export interface UpdateOperationData {
  status?: OperationStatus
  outputData?: any
  errorMessage?: string
  errorCode?: string
  endTime?: Date
  duration?: number
}

export class OperationService {
  /**
   * 创建新操作记录
   */
  static async createOperation(data: CreateOperationData): Promise<Operation> {
    return await prisma.operation.create({
      data: {
        userId: data.userId,
        documentId: data.documentId,
        operationType: data.operationType,
        inputData: data.inputData,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        status: OperationStatus.PENDING,
      },
    })
  }

  /**
   * 更新操作记录
   */
  static async updateOperation(id: string, data: UpdateOperationData): Promise<Operation> {
    const updateData: Prisma.OperationUpdateInput = {
      ...data,
      updatedAt: new Date(),
    }

    // 如果设置了结束时间，计算执行时长
    if (data.endTime && !data.duration) {
      const operation = await prisma.operation.findUnique({
        where: { id },
        select: { startTime: true },
      })
      
      if (operation) {
        updateData.duration = data.endTime.getTime() - operation.startTime.getTime()
      }
    }

    return await prisma.operation.update({
      where: { id },
      data: updateData,
    })
  }

  /**
   * 标记操作为处理中
   */
  static async markAsProcessing(id: string): Promise<Operation> {
    return await this.updateOperation(id, {
      status: OperationStatus.PROCESSING,
    })
  }

  /**
   * 标记操作为完成
   */
  static async markAsCompleted(id: string, outputData?: any): Promise<Operation> {
    return await this.updateOperation(id, {
      status: OperationStatus.COMPLETED,
      outputData,
      endTime: new Date(),
    })
  }

  /**
   * 标记操作为失败
   */
  static async markAsFailed(
    id: string,
    errorMessage: string,
    errorCode?: string
  ): Promise<Operation> {
    return await this.updateOperation(id, {
      status: OperationStatus.FAILED,
      errorMessage,
      errorCode,
      endTime: new Date(),
    })
  }

  /**
   * 获取操作记录
   */
  static async getOperation(id: string): Promise<Operation | null> {
    return await prisma.operation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
            url: true,
          },
        },
        uploadedFiles: {
          select: {
            id: true,
            filename: true,
            size: true,
            ocrStatus: true,
          },
        },
      },
    })
  }

  /**
   * 获取用户的操作历史
   */
  static async getUserOperations(
    userId: string,
    options: {
      page?: number
      limit?: number
      operationType?: OperationType
      status?: OperationStatus
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const {
      page = 1,
      limit = 20,
      operationType,
      status,
      startDate,
      endDate,
    } = options

    const where: Prisma.OperationWhereInput = {
      userId,
      ...(operationType && { operationType }),
      ...(status && { status }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      },
    }

    const [operations, total] = await Promise.all([
      prisma.operation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          document: {
            select: {
              title: true,
              url: true,
            },
          },
          uploadedFiles: {
            select: {
              filename: true,
              size: true,
            },
          },
        },
      }),
      prisma.operation.count({ where }),
    ])

    return {
      operations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * 获取操作统计信息
   */
  static async getOperationStats(userId?: string) {
    const where = userId ? { userId } : {}

    const [
      totalOperations,
      completedOperations,
      failedOperations,
      processingOperations,
      operationsByType,
    ] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.count({ where: { ...where, status: OperationStatus.COMPLETED } }),
      prisma.operation.count({ where: { ...where, status: OperationStatus.FAILED } }),
      prisma.operation.count({ where: { ...where, status: OperationStatus.PROCESSING } }),
      prisma.operation.groupBy({
        by: ['operationType'],
        where,
        _count: {
          id: true,
        },
      }),
    ])

    // 计算平均执行时间
    const avgDuration = await prisma.operation.aggregate({
      where: {
        ...where,
        status: OperationStatus.COMPLETED,
        duration: { not: null },
      },
      _avg: {
        duration: true,
      },
    })

    return {
      total: totalOperations,
      completed: completedOperations,
      failed: failedOperations,
      processing: processingOperations,
      successRate: totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0,
      averageDuration: avgDuration._avg.duration || 0,
      byType: operationsByType.reduce((acc, item) => {
        acc[item.operationType] = item._count.id
        return acc
      }, {} as Record<OperationType, number>),
    }
  }

  /**
   * 获取最近的操作记录
   */
  static async getRecentOperations(limit: number = 10) {
    return await prisma.operation.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        document: {
          select: {
            title: true,
          },
        },
      },
    })
  }

  /**
   * 删除旧的操作记录
   */
  static async cleanupOldOperations(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.operation.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [OperationStatus.COMPLETED, OperationStatus.FAILED, OperationStatus.CANCELLED],
        },
      },
    })

    return result.count
  }

  /**
   * 取消操作
   */
  static async cancelOperation(id: string): Promise<Operation> {
    return await this.updateOperation(id, {
      status: OperationStatus.CANCELLED,
      endTime: new Date(),
    })
  }

  /**
   * 重试失败的操作
   */
  static async retryOperation(id: string): Promise<Operation> {
    return await this.updateOperation(id, {
      status: OperationStatus.PENDING,
      errorMessage: null,
      errorCode: null,
      endTime: null,
      duration: null,
    })
  }
}
