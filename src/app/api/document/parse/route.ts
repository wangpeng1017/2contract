import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-service';
import { withAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 解析文档链接
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { documentUrl } = body;

      if (!documentUrl) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_URL', '缺少文档链接'),
          { status: 400 }
        );
      }

      // 解析文档URL
      const parseResult = documentService.parseDocumentUrl(documentUrl);

      if (!parseResult.isValid) {
        return NextResponse.json(
          createErrorResponse('INVALID_DOCUMENT_URL', parseResult.error || '无效的文档链接'),
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
        // 获取文档信息
        const documentInfo = await documentService.getDocumentInfo(parseResult.documentId!, accessToken);

        return NextResponse.json(
          createSuccessResponse({
            documentId: parseResult.documentId,
            document: documentInfo,
            isValid: true,
          })
        );
      } catch (error) {
        console.error('Error getting document info:', error);
        
        // 检查是否是权限问题
        if (error instanceof Error && error.message.includes('permission')) {
          return NextResponse.json(
            createErrorResponse('DOCUMENT_PERMISSION_DENIED', '没有访问该文档的权限'),
            { status: 403 }
          );
        }

        return NextResponse.json(
          createErrorResponse('DOCUMENT_ACCESS_ERROR', '无法访问该文档，请检查链接是否正确或是否有访问权限'),
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error parsing document:', error);
      
      return NextResponse.json(
        createErrorResponse('PARSE_ERROR', '解析文档时发生错误'),
        { status: 500 }
      );
    }
  });
}
