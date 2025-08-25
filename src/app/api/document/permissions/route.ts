import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getDocumentPermissionInfo } from '@/lib/document-auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 获取文档权限信息
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const documentId = searchParams.get('documentId');

      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
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

      // 获取文档权限信息
      const permissionInfo = await getDocumentPermissionInfo(documentId, accessToken);

      if (permissionInfo.error) {
        return NextResponse.json(
          createErrorResponse('PERMISSION_CHECK_FAILED', permissionInfo.error),
          { status: 500 }
        );
      }

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          permissions: {
            canRead: permissionInfo.canRead,
            canWrite: permissionInfo.canWrite,
            canComment: permissionInfo.canComment,
            canManage: permissionInfo.canManage,
          },
          rawPermissions: permissionInfo.permissions,
          document: permissionInfo.document,
        })
      );
    } catch (error) {
      console.error('Error getting document permissions:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '获取权限信息失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 批量检查多个文档的权限
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { documentIds, requiredPermission = 'read' } = body;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_IDS', '缺少文档ID列表'),
          { status: 400 }
        );
      }

      if (documentIds.length > 50) {
        return NextResponse.json(
          createErrorResponse('TOO_MANY_DOCUMENTS', '一次最多检查50个文档'),
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

      // 批量检查权限
      const results: Record<string, any> = {};
      
      const checks = documentIds.map(async (documentId: string) => {
        try {
          const permissionInfo = await getDocumentPermissionInfo(documentId, accessToken);
          results[documentId] = {
            hasAccess: permissionInfo.canRead,
            permissions: {
              canRead: permissionInfo.canRead,
              canWrite: permissionInfo.canWrite,
              canComment: permissionInfo.canComment,
              canManage: permissionInfo.canManage,
            },
            document: permissionInfo.document,
            error: permissionInfo.error,
          };
        } catch (error) {
          results[documentId] = {
            hasAccess: false,
            permissions: {
              canRead: false,
              canWrite: false,
              canComment: false,
              canManage: false,
            },
            error: '权限检查失败',
          };
        }
      });

      await Promise.all(checks);

      return NextResponse.json(
        createSuccessResponse({
          results,
          summary: {
            total: documentIds.length,
            accessible: Object.values(results).filter((r: any) => r.hasAccess).length,
            failed: Object.values(results).filter((r: any) => r.error).length,
          },
        })
      );
    } catch (error) {
      console.error('Error batch checking document permissions:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '批量权限检查失败'),
        { status: 500 }
      );
    }
  });
}
