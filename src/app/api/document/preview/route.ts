import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-service';
import { withAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 预览文档替换结果
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { documentId, searchText, replaceText, options = {} } = body;

      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
          { status: 400 }
        );
      }

      if (!searchText || replaceText === undefined) {
        return NextResponse.json(
          createErrorResponse('MISSING_REPLACEMENT_DATA', '缺少替换数据'),
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

      try {
        // 预览替换结果
        const previews = await documentService.previewReplacement(
          documentId,
          accessToken,
          searchText,
          replaceText,
          {
            caseSensitive: options.caseSensitive || false,
            wholeWord: options.wholeWord || false,
          }
        );

        // 统计预览结果
        const totalMatches = previews.reduce((sum, preview) => sum + preview.matchCount, 0);

        return NextResponse.json(
          createSuccessResponse({
            documentId,
            searchText,
            replaceText,
            previews,
            summary: {
              totalMatches,
              affectedBlocks: previews.length,
            },
          })
        );
      } catch (error) {
        console.error('Error previewing replacement:', error);
        
        return NextResponse.json(
          createErrorResponse('PREVIEW_ERROR', '预览替换结果失败'),
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error in document preview API:', error);
      
      return NextResponse.json(
        createErrorResponse('API_ERROR', '预览替换结果时发生错误'),
        { status: 500 }
      );
    }
  });
}
