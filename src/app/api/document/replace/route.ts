import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-service';
import { withDocumentWritePermission } from '@/lib/document-auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 替换文档中的文本
 */
export async function POST(request: NextRequest) {
  return withDocumentWritePermission(request, async (req, user, documentId) => {
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
      console.error('Error in document replace API:', error);
      
      return NextResponse.json(
        createErrorResponse('API_ERROR', '替换文档内容时发生错误'),
        { status: 500 }
      );
    }
  });
}
