import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-service';
import { withDocumentWritePermission } from '@/lib/document-auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 替换文档中的文本
 */
export async function POST(request: NextRequest) {
  // 检查是否为测试模式（开发环境允许无认证测试）
  const isTestMode = process.env.NODE_ENV === 'development';

  if (isTestMode) {
    return handleDocumentReplaceRequest(request, { sub: 'test-user' }, 'test-document');
  }

  return withDocumentWritePermission(request, async (req, user, documentId) => {
    return handleDocumentReplaceRequest(req, user, documentId);
  });
}

async function handleDocumentReplaceRequest(req: NextRequest, user: any, documentId: string) {
  try {
    const body = await req.json();
    const { replacements, options = {} } = body;

    if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
      return NextResponse.json(
        createErrorResponse('MISSING_REPLACEMENTS', '缺少替换规则'),
        { status: 400 }
      );
    }

      // 验证替换规则
      for (const replacement of replacements) {
        if (!replacement.searchText || replacement.replaceText === undefined) {
          return NextResponse.json(
            createErrorResponse('INVALID_REPLACEMENT', '替换规则格式不正确'),
            { status: 400 }
          );
        }
      }

      // 获取访问令牌
      const accessToken = req.cookies.get('access_token')?.value;
      if (!accessToken) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACCESS_TOKEN', '缺少访问令牌'),
          { status: 401 }
        );
      }

      try {
        // 执行批量替换
        const results = await documentService.batchReplaceTextInDocument(
          documentId,
          accessToken,
          replacements
        );

        // 统计总体结果
        const totalReplacements = results.reduce((sum, result) => sum + result.replacedCount, 0);
        const totalMatches = results.reduce((sum, result) => sum + result.totalMatches, 0);
        const successCount = results.filter(result => result.success).length;

        return NextResponse.json(
          createSuccessResponse({
            documentId,
            results,
            summary: {
              totalReplacements,
              totalMatches,
              successCount,
              failureCount: results.length - successCount,
              overallSuccess: successCount === results.length,
            },
          })
        );
      } catch (error) {
        console.error('Error replacing text in document:', error);
        
        return NextResponse.json(
          createErrorResponse('REPLACEMENT_ERROR', '替换文档内容失败'),
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[Document Replace] 处理失败:', error);

      return NextResponse.json(
        createErrorResponse(
          'REPLACE_ERROR',
          `文档替换失败: ${error instanceof Error ? error.message : '未知错误'}`
        ),
        { status: 500 }
      );
    }
}
