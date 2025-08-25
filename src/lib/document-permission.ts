import { feishuClient } from './feishu';
import { FeishuDocument } from '@/types';

/**
 * 文档权限类型
 */
export type DocumentPermission = 'read' | 'write' | 'comment' | 'manage';

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  permissions: string[];
  document?: FeishuDocument;
  error?: string;
  errorCode?: string;
}

/**
 * 文档权限验证服务
 */
export class DocumentPermissionService {
  /**
   * 检查用户对文档的访问权限
   */
  async checkDocumentAccess(
    documentId: string,
    accessToken: string,
    requiredPermission: DocumentPermission = 'read'
  ): Promise<PermissionCheckResult> {
    try {
      // 1. 首先尝试获取文档信息（基本权限检查）
      let document: FeishuDocument;
      try {
        document = await feishuClient.getDocument(documentId, accessToken);
      } catch (error) {
        console.error('Failed to get document:', error);
        return this.handleDocumentAccessError(error);
      }

      // 2. 检查具体权限
      const feishuPermission = requiredPermission === 'manage' ? 'write' : requiredPermission as 'read' | 'write' | 'comment';
      const permissionResult = await feishuClient.checkDocumentPermission(
        documentId,
        accessToken,
        feishuPermission
      );

      return {
        hasPermission: permissionResult.hasPermission,
        permissions: permissionResult.permissions,
        document,
        error: permissionResult.error,
      };
    } catch (error) {
      console.error('Error checking document access:', error);
      return {
        hasPermission: false,
        permissions: [],
        error: '权限检查失败',
        errorCode: 'PERMISSION_CHECK_FAILED',
      };
    }
  }

  /**
   * 批量检查多个文档的权限
   */
  async checkMultipleDocuments(
    documentIds: string[],
    accessToken: string,
    requiredPermission: DocumentPermission = 'read'
  ): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {};

    // 并发检查所有文档权限
    const checks = documentIds.map(async (documentId) => {
      const result = await this.checkDocumentAccess(documentId, accessToken, requiredPermission);
      results[documentId] = result;
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * 验证用户是否可以执行特定操作
   */
  async canPerformAction(
    documentId: string,
    accessToken: string,
    action: 'read' | 'update' | 'create_blocks' | 'delete_blocks' | 'share'
  ): Promise<boolean> {
    const actionPermissionMap: Record<string, DocumentPermission> = {
      read: 'read',
      update: 'write',
      create_blocks: 'write',
      delete_blocks: 'write',
      share: 'manage',
    };

    const requiredPermission = actionPermissionMap[action] || 'read';
    const result = await this.checkDocumentAccess(documentId, accessToken, requiredPermission);
    
    return result.hasPermission;
  }

  /**
   * 获取用户对文档的所有权限
   */
  async getDocumentPermissions(
    documentId: string,
    accessToken: string
  ): Promise<{
    canRead: boolean;
    canWrite: boolean;
    canComment: boolean;
    canManage: boolean;
    permissions: string[];
    document?: FeishuDocument;
  }> {
    const result = await this.checkDocumentAccess(documentId, accessToken, 'read');

    if (!result.hasPermission) {
      return {
        canRead: false,
        canWrite: false,
        canComment: false,
        canManage: false,
        permissions: [],
      };
    }

    const permissions = result.permissions;
    
    return {
      canRead: this.hasPermission(permissions, 'read'),
      canWrite: this.hasPermission(permissions, 'write'),
      canComment: this.hasPermission(permissions, 'comment'),
      canManage: this.hasPermission(permissions, 'manage'),
      permissions,
      document: result.document,
    };
  }

  /**
   * 处理文档访问错误
   */
  private handleDocumentAccessError(error: any): PermissionCheckResult {
    const errorMessage = error?.message || '';
    const errorResponse = error?.response?.data;

    // 根据错误类型返回不同的结果
    if (errorMessage.includes('permission') || errorResponse?.code === 403) {
      return {
        hasPermission: false,
        permissions: [],
        error: '没有访问该文档的权限',
        errorCode: 'PERMISSION_DENIED',
      };
    }

    if (errorMessage.includes('not found') || errorResponse?.code === 404) {
      return {
        hasPermission: false,
        permissions: [],
        error: '文档不存在或已被删除',
        errorCode: 'DOCUMENT_NOT_FOUND',
      };
    }

    if (errorMessage.includes('token') || errorResponse?.code === 401) {
      return {
        hasPermission: false,
        permissions: [],
        error: '访问令牌无效或已过期',
        errorCode: 'INVALID_TOKEN',
      };
    }

    return {
      hasPermission: false,
      permissions: [],
      error: '无法访问文档，请检查链接是否正确',
      errorCode: 'DOCUMENT_ACCESS_ERROR',
    };
  }

  /**
   * 检查是否具有指定权限
   */
  private hasPermission(permissions: string[], requiredPermission: DocumentPermission): boolean {
    const permissionHierarchy = {
      read: ['read', 'comment', 'write', 'manage'],
      comment: ['comment', 'write', 'manage'],
      write: ['write', 'manage'],
      manage: ['manage'],
    };

    const validPermissions = permissionHierarchy[requiredPermission] || [];
    return permissions.some(p => validPermissions.includes(p));
  }

  /**
   * 验证文档ID格式
   */
  validateDocumentId(documentId: string): boolean {
    // 飞书文档ID通常是特定格式的字符串
    const documentIdPattern = /^[a-zA-Z0-9_-]+$/;
    return documentIdPattern.test(documentId) && documentId.length > 10;
  }

  /**
   * 获取权限错误的用户友好消息
   */
  getPermissionErrorMessage(errorCode: string): string {
    const errorMessages = {
      PERMISSION_DENIED: '您没有访问该文档的权限，请联系文档所有者授权',
      DOCUMENT_NOT_FOUND: '文档不存在或已被删除，请检查文档链接',
      INVALID_TOKEN: '登录状态已过期，请重新登录',
      DOCUMENT_ACCESS_ERROR: '无法访问文档，请检查网络连接或稍后重试',
      PERMISSION_CHECK_FAILED: '权限验证失败，请稍后重试',
    };

    return errorMessages[errorCode as keyof typeof errorMessages] || '未知错误';
  }
}

/**
 * 默认文档权限服务实例
 */
export const documentPermissionService = new DocumentPermissionService();
