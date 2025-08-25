import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from './auth-middleware';
import { documentPermissionService, DocumentPermission } from './document-permission';
import { createErrorResponse } from './utils';

/**
 * 文档权限验证中间件
 */
export async function withDocumentPermission(
  requiredPermission: DocumentPermission,
  request: NextRequest,
  handler: (request: NextRequest, user: any, documentId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req, user) => {
    try {
      // 从请求中获取文档ID
      const documentId = await extractDocumentId(req);
      
      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
          { status: 400 }
        );
      }

      // 验证文档ID格式
      if (!documentPermissionService.validateDocumentId(documentId)) {
        return NextResponse.json(
          createErrorResponse('INVALID_DOCUMENT_ID', '无效的文档ID格式'),
          { status: 400 }
        );
      }

      // 获取访问令牌
      const accessToken = req.cookies.get('access_token')?.value;
      if (!accessToken) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACCESS_TOKEN', '缺少访问令牌'),
          { status: 401 }
        );
      }

      // 检查文档权限
      const permissionResult = await documentPermissionService.checkDocumentAccess(
        documentId,
        accessToken,
        requiredPermission
      );

      if (!permissionResult.hasPermission) {
        const errorMessage = permissionResult.errorCode 
          ? documentPermissionService.getPermissionErrorMessage(permissionResult.errorCode)
          : permissionResult.error || '权限不足';

        const statusCode = getStatusCodeFromError(permissionResult.errorCode);

        return NextResponse.json(
          createErrorResponse(permissionResult.errorCode || 'PERMISSION_DENIED', errorMessage),
          { status: statusCode }
        );
      }

      // 将文档信息添加到请求中
      if (permissionResult.document) {
        (req as any).document = permissionResult.document;
        (req as any).documentPermissions = permissionResult.permissions;
      }

      // 调用处理函数
      return await handler(req, user, documentId);
    } catch (error) {
      console.error('Document permission middleware error:', error);
      return NextResponse.json(
        createErrorResponse('PERMISSION_CHECK_ERROR', '权限验证失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 文档读取权限中间件
 */
export async function withDocumentReadPermission(
  request: NextRequest,
  handler: (request: NextRequest, user: any, documentId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return withDocumentPermission('read', request, handler);
}

/**
 * 文档写入权限中间件
 */
export async function withDocumentWritePermission(
  request: NextRequest,
  handler: (request: NextRequest, user: any, documentId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return withDocumentPermission('write', request, handler);
}

/**
 * 文档管理权限中间件
 */
export async function withDocumentManagePermission(
  request: NextRequest,
  handler: (request: NextRequest, user: any, documentId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return withDocumentPermission('manage', request, handler);
}

/**
 * 从请求中提取文档ID
 */
async function extractDocumentId(request: NextRequest): Promise<string | null> {
  const { searchParams, pathname } = new URL(request.url);
  
  // 1. 从查询参数中获取
  const documentIdFromQuery = searchParams.get('documentId');
  if (documentIdFromQuery) return documentIdFromQuery;

  // 2. 从路径参数中获取
  const pathMatch = pathname.match(/\/documents\/([^\/]+)/);
  if (pathMatch) return pathMatch[1];

  // 3. 从请求体中获取（POST/PUT请求）
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    try {
      const body = await request.json();
      if (body.documentId) return body.documentId;
    } catch (error) {
      // 忽略JSON解析错误
    }
  }

  return null;
}

/**
 * 根据错误代码获取HTTP状态码
 */
function getStatusCodeFromError(errorCode?: string): number {
  const statusCodeMap: Record<string, number> = {
    PERMISSION_DENIED: 403,
    DOCUMENT_NOT_FOUND: 404,
    INVALID_TOKEN: 401,
    DOCUMENT_ACCESS_ERROR: 400,
    PERMISSION_CHECK_FAILED: 500,
    MISSING_DOCUMENT_ID: 400,
    INVALID_DOCUMENT_ID: 400,
  };

  return statusCodeMap[errorCode || ''] || 403;
}

/**
 * 检查用户是否可以执行特定操作的辅助函数
 */
export async function checkDocumentAction(
  documentId: string,
  accessToken: string,
  action: 'read' | 'update' | 'create_blocks' | 'delete_blocks' | 'share'
): Promise<{
  canPerform: boolean;
  error?: string;
  errorCode?: string;
}> {
  try {
    const canPerform = await documentPermissionService.canPerformAction(
      documentId,
      accessToken,
      action
    );

    return { canPerform };
  } catch (error) {
    console.error('Error checking document action:', error);
    return {
      canPerform: false,
      error: '权限检查失败',
      errorCode: 'ACTION_CHECK_FAILED',
    };
  }
}

/**
 * 获取文档权限信息的辅助函数
 */
export async function getDocumentPermissionInfo(
  documentId: string,
  accessToken: string
): Promise<{
  canRead: boolean;
  canWrite: boolean;
  canComment: boolean;
  canManage: boolean;
  permissions: string[];
  document?: any;
  error?: string;
}> {
  try {
    return await documentPermissionService.getDocumentPermissions(documentId, accessToken);
  } catch (error) {
    console.error('Error getting document permissions:', error);
    return {
      canRead: false,
      canWrite: false,
      canComment: false,
      canManage: false,
      permissions: [],
      error: '获取权限信息失败',
    };
  }
}
