import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { WordProcessor, PlaceholderInfo } from '@/lib/word-processor';

/**
 * 解析Word模板中的占位符
 * Phase 1 MVP实现：简单的占位符识别
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;

    if (!file) {
      return NextResponse.json(
        createErrorResponse('MISSING_FILE', '请上传模板文件'),
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        createErrorResponse('INVALID_FILE_TYPE', '请上传.docx格式的文件'),
        { status: 400 }
      );
    }

    console.log(`[Local Docs] 开始解析模板: ${file.name}, 大小: ${file.size} bytes`);

    // 获取文件buffer
    const arrayBuffer = await file.arrayBuffer();

    // 验证文件格式
    const isValid = await WordProcessor.validateTemplate(arrayBuffer);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse('INVALID_TEMPLATE', '无效的Word文档格式'),
        { status: 400 }
      );
    }

    // 使用真实的Word处理引擎解析模板
    const documentTemplate = await WordProcessor.parseTemplate(arrayBuffer, file.name);

    console.log(`[Local Docs] 解析完成，发现 ${documentTemplate.placeholders.length} 个占位符`);

    return NextResponse.json(createSuccessResponse({
      placeholders: documentTemplate.placeholders,
      templateName: documentTemplate.templateName,
      templateSize: file.size,
      metadata: documentTemplate.metadata
    }));

  } catch (error) {
    console.error('[Local Docs] 模板解析失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'PARSE_ERROR',
        `模板解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}


