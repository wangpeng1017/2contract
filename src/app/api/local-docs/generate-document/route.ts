import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils';
import { WordProcessor } from '@/lib/word-processor';

interface FormData {
  [key: string]: string;
}

/**
 * 生成填充数据后的Word文档
 * Phase 1 MVP实现：基本的文档生成功能
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const dataStr = formData.get('data') as string;

    if (!file) {
      return NextResponse.json(
        createErrorResponse('MISSING_FILE', '请上传模板文件'),
        { status: 400 }
      );
    }

    if (!dataStr) {
      return NextResponse.json(
        createErrorResponse('MISSING_DATA', '请提供填充数据'),
        { status: 400 }
      );
    }

    let data: FormData;
    try {
      data = JSON.parse(dataStr);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_DATA', '数据格式错误'),
        { status: 400 }
      );
    }

    console.log(`[Local Docs] 开始生成文档: ${file.name}`);
    console.log(`[Local Docs] 填充数据:`, Object.keys(data));

    // 获取模板文件buffer
    const templateBuffer = await file.arrayBuffer();

    // 清理和验证数据
    const sanitizedData = WordProcessor.sanitizeData(data);

    // 使用真实的Word处理引擎生成文档
    const result = await WordProcessor.generateDocument(templateBuffer, sanitizedData, file.name);

    console.log(`[Local Docs] 文档生成完成，大小: ${result.documentBuffer.byteLength} bytes`);

    // 返回生成的文档
    return new NextResponse(result.documentBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="generated_${file.name}"`,
        'Content-Length': result.documentBuffer.byteLength.toString(),
        'X-Generated-At': result.metadata.generatedAt,
        'X-Filled-Fields': result.metadata.filledFields.join(','),
      },
    });

  } catch (error) {
    console.error('[Local Docs] 文档生成失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'GENERATION_ERROR',
        `文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}


