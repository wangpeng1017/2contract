import { NextRequest, NextResponse } from 'next/server';
import { withDocumentReadPermission } from '@/lib/document-auth-middleware';
import { documentService } from '@/lib/document-service';
import { DocumentParser, BlockType } from '@/lib/document-parser';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 获取文档结构化数据
 */
export async function GET(request: NextRequest) {
  return withDocumentReadPermission(request, async (req, user, documentId) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeContent = searchParams.get('includeContent') === 'true';
      const includeStatistics = searchParams.get('includeStatistics') === 'true';
      const includeOutline = searchParams.get('includeOutline') === 'true';
      const includeTables = searchParams.get('includeTables') === 'true';
      const includeLists = searchParams.get('includeLists') === 'true';
      const includeImages = searchParams.get('includeImages') === 'true';

      // 获取访问令牌
      const accessToken = req.cookies.get('access_token')?.value;
      if (!accessToken) {
        return NextResponse.json(
          createErrorResponse('MISSING_ACCESS_TOKEN', '缺少访问令牌'),
          { status: 401 }
        );
      }

      // 获取文档内容
      const documentContent = await documentService.getDocumentContent(documentId, accessToken);
      
      // 解析文档结构
      const structure = DocumentParser.parseDocument(documentContent.document, documentContent.blocks);

      // 根据请求参数构建响应数据
      const responseData: any = {
        documentId,
        document: structure.document,
      };

      if (includeContent) {
        responseData.blocks = structure.blocks;
      }

      if (includeStatistics) {
        responseData.statistics = structure.statistics;
      }

      if (includeOutline) {
        responseData.outline = structure.outline;
      }

      if (includeTables) {
        responseData.tables = structure.tables;
      }

      if (includeLists) {
        responseData.lists = structure.lists;
      }

      if (includeImages) {
        responseData.images = structure.images;
      }

      // 如果没有指定任何包含选项，返回基本信息
      if (!includeContent && !includeStatistics && !includeOutline && 
          !includeTables && !includeLists && !includeImages) {
        responseData.statistics = structure.statistics;
        responseData.outline = structure.outline;
      }

      return NextResponse.json(createSuccessResponse(responseData));
    } catch (error) {
      console.error('Error getting document structure:', error);
      return NextResponse.json(
        createErrorResponse('STRUCTURE_PARSE_ERROR', '解析文档结构失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 搜索文档结构化内容
 */
export async function POST(request: NextRequest) {
  return withDocumentReadPermission(request, async (req, user, documentId) => {
    try {
      const body = await req.json();
      const { 
        searchText, 
        caseSensitive = false, 
        wholeWord = false,
        includeTypes,
        excludeTypes,
        maxResults = 100
      } = body;

      if (!searchText) {
        return NextResponse.json(
          createErrorResponse('MISSING_SEARCH_TEXT', '缺少搜索文本'),
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

      // 获取文档内容
      const documentContent = await documentService.getDocumentContent(documentId, accessToken);
      
      // 解析文档结构
      const structure = DocumentParser.parseDocument(documentContent.document, documentContent.blocks);

      // 转换块类型过滤器
      const includeBlockTypes = includeTypes?.map((type: string) => 
        BlockType[type.toUpperCase() as keyof typeof BlockType]
      ).filter(Boolean);
      
      const excludeBlockTypes = excludeTypes?.map((type: string) => 
        BlockType[type.toUpperCase() as keyof typeof BlockType]
      ).filter(Boolean);

      // 执行搜索
      const searchResults = DocumentParser.searchInStructure(structure, searchText, {
        caseSensitive,
        wholeWord,
        includeTypes: includeBlockTypes,
        excludeTypes: excludeBlockTypes,
      });

      // 限制结果数量
      const limitedResults = searchResults.slice(0, maxResults);

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          searchText,
          options: {
            caseSensitive,
            wholeWord,
            includeTypes,
            excludeTypes,
          },
          results: limitedResults,
          summary: {
            totalMatches: searchResults.length,
            returnedMatches: limitedResults.length,
            blocksWithMatches: new Set(limitedResults.map(r => r.blockId)).size,
          },
        })
      );
    } catch (error) {
      console.error('Error searching document structure:', error);
      return NextResponse.json(
        createErrorResponse('STRUCTURE_SEARCH_ERROR', '搜索文档结构失败'),
        { status: 500 }
      );
    }
  });
}
