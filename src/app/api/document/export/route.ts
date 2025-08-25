import { NextRequest, NextResponse } from 'next/server';
import { withDocumentReadPermission } from '@/lib/document-auth-middleware';
import { documentService } from '@/lib/document-service';
import { DocumentParser } from '@/lib/document-parser';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 导出文档为不同格式
 */
export async function POST(request: NextRequest) {
  return withDocumentReadPermission(request, async (req, user, documentId) => {
    try {
      const body = await req.json();
      const { format, options = {} } = body;

      if (!format) {
        return NextResponse.json(
          createErrorResponse('MISSING_FORMAT', '缺少导出格式'),
          { status: 400 }
        );
      }

      const supportedFormats = ['text', 'markdown', 'json', 'csv', 'outline'];
      if (!supportedFormats.includes(format)) {
        return NextResponse.json(
          createErrorResponse('UNSUPPORTED_FORMAT', `不支持的格式。支持的格式: ${supportedFormats.join(', ')}`),
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

      let exportedContent: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case 'text':
          exportedContent = exportToText(structure, options);
          mimeType = 'text/plain';
          filename = `${structure.document.title || 'document'}.txt`;
          break;

        case 'markdown':
          exportedContent = exportToMarkdown(structure, options);
          mimeType = 'text/markdown';
          filename = `${structure.document.title || 'document'}.md`;
          break;

        case 'json':
          exportedContent = JSON.stringify(structure, null, 2);
          mimeType = 'application/json';
          filename = `${structure.document.title || 'document'}.json`;
          break;

        case 'csv':
          exportedContent = exportTablesToCSV(structure, options);
          mimeType = 'text/csv';
          filename = `${structure.document.title || 'document'}_tables.csv`;
          break;

        case 'outline':
          exportedContent = exportOutline(structure, options);
          mimeType = 'text/plain';
          filename = `${structure.document.title || 'document'}_outline.txt`;
          break;

        default:
          return NextResponse.json(
            createErrorResponse('UNSUPPORTED_FORMAT', '不支持的导出格式'),
            { status: 400 }
          );
      }

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          format,
          content: exportedContent,
          metadata: {
            filename,
            mimeType,
            size: exportedContent.length,
            exportedAt: new Date().toISOString(),
            statistics: structure.statistics,
          },
        })
      );
    } catch (error) {
      console.error('Error exporting document:', error);
      return NextResponse.json(
        createErrorResponse('EXPORT_ERROR', '导出文档失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 导出为纯文本
 */
function exportToText(structure: any, options: any): string {
  const lines: string[] = [];
  
  // 添加文档标题
  if (structure.document.title) {
    lines.push(structure.document.title);
    lines.push('='.repeat(structure.document.title.length));
    lines.push('');
  }

  // 添加统计信息
  if (options.includeStatistics) {
    lines.push('文档统计:');
    lines.push(`- 总块数: ${structure.statistics.totalBlocks}`);
    lines.push(`- 文本块: ${structure.statistics.textBlocks}`);
    lines.push(`- 标题数: ${structure.statistics.headings}`);
    lines.push(`- 表格数: ${structure.statistics.tables}`);
    lines.push(`- 列表数: ${structure.statistics.lists}`);
    lines.push(`- 图片数: ${structure.statistics.images}`);
    lines.push(`- 字数: ${structure.statistics.wordCount}`);
    lines.push('');
  }

  // 递归添加块内容
  const addBlocks = (blocks: any[], level: number = 0) => {
    blocks.forEach(block => {
      if (block.content && block.content.trim()) {
        const indent = '  '.repeat(level);
        lines.push(`${indent}${block.content}`);
      }
      
      if (block.children && block.children.length > 0) {
        addBlocks(block.children, level + 1);
      }
    });
  };

  addBlocks(structure.blocks);

  // 添加表格
  if (options.includeTables && structure.tables.length > 0) {
    lines.push('');
    lines.push('表格数据:');
    lines.push('-'.repeat(20));
    structure.tables.forEach((table: any, index: number) => {
      lines.push(`表格 ${index + 1}:`);
      lines.push(DocumentParser.tableToCSV(table));
      lines.push('');
    });
  }

  // 添加列表
  if (options.includeLists && structure.lists.length > 0) {
    lines.push('');
    lines.push('列表数据:');
    lines.push('-'.repeat(20));
    structure.lists.forEach((list: any, index: number) => {
      lines.push(`列表 ${index + 1}:`);
      lines.push(DocumentParser.listToText(list));
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * 导出为Markdown
 */
function exportToMarkdown(structure: any, options: any): string {
  const lines: string[] = [];
  
  // 添加文档标题
  if (structure.document.title) {
    lines.push(`# ${structure.document.title}`);
    lines.push('');
  }

  // 递归添加块内容
  const addBlocks = (blocks: any[], level: number = 0) => {
    blocks.forEach(block => {
      if (block.content && block.content.trim()) {
        switch (block.type) {
          case 'heading1':
            lines.push(`# ${block.content}`);
            break;
          case 'heading2':
            lines.push(`## ${block.content}`);
            break;
          case 'heading3':
            lines.push(`### ${block.content}`);
            break;
          case 'heading4':
            lines.push(`#### ${block.content}`);
            break;
          case 'heading5':
            lines.push(`##### ${block.content}`);
            break;
          case 'heading6':
            lines.push(`###### ${block.content}`);
            break;
          case 'quote':
            lines.push(`> ${block.content}`);
            break;
          case 'code':
            lines.push('```');
            lines.push(block.content);
            lines.push('```');
            break;
          default:
            lines.push(block.content);
        }
        lines.push('');
      }
      
      if (block.children && block.children.length > 0) {
        addBlocks(block.children, level + 1);
      }
    });
  };

  addBlocks(structure.blocks);

  return lines.join('\n');
}

/**
 * 导出表格为CSV
 */
function exportTablesToCSV(structure: any, options: any): string {
  if (structure.tables.length === 0) {
    return '# 文档中没有表格数据';
  }

  const csvParts: string[] = [];
  
  structure.tables.forEach((table: any, index: number) => {
    csvParts.push(`# 表格 ${index + 1}`);
    csvParts.push(DocumentParser.tableToCSV(table));
    csvParts.push('');
  });

  return csvParts.join('\n');
}

/**
 * 导出大纲
 */
function exportOutline(structure: any, options: any): string {
  const lines: string[] = [];
  
  if (structure.document.title) {
    lines.push(`文档大纲: ${structure.document.title}`);
    lines.push('='.repeat(50));
    lines.push('');
  }

  const addOutlineItems = (items: any[], level: number = 0) => {
    items.forEach(item => {
      const indent = '  '.repeat(level);
      lines.push(`${indent}${level + 1}. ${item.title}`);
      
      if (item.children && item.children.length > 0) {
        addOutlineItems(item.children, level + 1);
      }
    });
  };

  if (structure.outline.length > 0) {
    addOutlineItems(structure.outline);
  } else {
    lines.push('文档中没有标题结构');
  }

  return lines.join('\n');
}
