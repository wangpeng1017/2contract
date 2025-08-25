import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-service';
import { withDocumentReadPermission } from '@/lib/document-auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 获取文档内容
 */
export async function GET(request: NextRequest) {
  return withDocumentReadPermission(request, async (req, user, documentId) => {
    try {
      // 获取访问令牌
      const accessToken = req.cookies.get('access_token')?.value;
      if (!accessToken) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACCESS_TOKEN', '缺少访问令牌'),
          { status: 401 }
        );
      }

      try {
        // 获取文档完整内容
        const documentContent = await documentService.getDocumentContent(documentId, accessToken);

        return NextResponse.json(
          createSuccessResponse({
            documentId,
            content: documentContent,
          })
        );
      } catch (error) {
        console.error('Error getting document content:', error);
        
        return NextResponse.json(
          createErrorResponse('DOCUMENT_CONTENT_ERROR', '获取文档内容失败'),
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error in document content API:', error);
      
      return NextResponse.json(
        createErrorResponse('API_ERROR', '获取文档内容时发生错误'),
        { status: 500 }
      );
    }
  });
}
