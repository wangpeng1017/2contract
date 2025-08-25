import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { checkDocumentAction } from '@/lib/document-auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 检查用户是否可以执行特定的文档操作
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { documentId, action } = body;

      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
          { status: 400 }
        );
      }

      if (!action) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACTION', '缺少操作类型'),
          { status: 400 }
        );
      }

      // 验证操作类型
      const validActions = ['read', 'update', 'create_blocks', 'delete_blocks', 'share'];
      if (!validActions.includes(action)) {
        return NextResponse.json(
          createErrorResponse('INVALID_ACTION', `无效的操作类型。支持的操作: ${validActions.join(', ')}`),
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

      // 检查操作权限
      const actionResult = await checkDocumentAction(documentId, accessToken, action);

      if (actionResult.error) {
        return NextResponse.json(
          createErrorResponse(actionResult.errorCode || 'ACTION_CHECK_FAILED', actionResult.error),
          { status: 403 }
        );
      }

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          action,
          canPerform: actionResult.canPerform,
          message: actionResult.canPerform 
            ? `用户可以执行 ${action} 操作`
            : `用户无权执行 ${action} 操作`,
        })
      );
    } catch (error) {
      console.error('Error checking document action:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '操作权限检查失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 批量检查多个操作的权限
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { documentId, actions } = body;

      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
          { status: 400 }
        );
      }

      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACTIONS', '缺少操作列表'),
          { status: 400 }
        );
      }

      // 验证操作类型
      const validActions = ['read', 'update', 'create_blocks', 'delete_blocks', 'share'];
      const invalidActions = actions.filter(action => !validActions.includes(action));
      
      if (invalidActions.length > 0) {
        return NextResponse.json(
          createErrorResponse('INVALID_ACTIONS', `无效的操作类型: ${invalidActions.join(', ')}`),
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

      // 批量检查操作权限
      const results: Record<string, any> = {};

      const checks = actions.map(async (action: string) => {
        try {
          const actionResult = await checkDocumentAction(documentId, accessToken, action as 'read' | 'update' | 'create_blocks' | 'delete_blocks' | 'share');
          results[action] = {
            canPerform: actionResult.canPerform,
            error: actionResult.error,
            errorCode: actionResult.errorCode,
          };
        } catch (error) {
          results[action] = {
            canPerform: false,
            error: '权限检查失败',
            errorCode: 'ACTION_CHECK_FAILED',
          };
        }
      });

      await Promise.all(checks);

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          results,
          summary: {
            total: actions.length,
            allowed: Object.values(results).filter((r: any) => r.canPerform).length,
            denied: Object.values(results).filter((r: any) => !r.canPerform).length,
          },
        })
      );
    } catch (error) {
      console.error('Error batch checking document actions:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '批量操作权限检查失败'),
        { status: 500 }
      );
    }
  });
}
