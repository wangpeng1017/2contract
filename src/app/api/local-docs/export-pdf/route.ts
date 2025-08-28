import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils';
import { PDFConverter, PDFConversionOptions } from '@/lib/pdf-converter';
import { encodePdfFilename } from '@/lib/filename-encoder';

/**
 * POST /api/local-docs/export-pdf
 * 将Word文档转换为PDF格式
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const templateFile = formData.get('template') as File;
    const dataJson = formData.get('data') as string;
    const optionsJson = formData.get('options') as string;

    // 验证必填字段
    if (!templateFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_TEMPLATE', '缺少模板文件'),
        { status: 400 }
      );
    }

    console.log(`[PDF Export API] 开始处理PDF导出: ${templateFile.name}`);

    // 解析表单数据
    let formDataObj = {};
    if (dataJson) {
      try {
        formDataObj = JSON.parse(dataJson);
      } catch (error) {
        return NextResponse.json(
          createErrorResponse('INVALID_DATA', '表单数据格式错误'),
          { status: 400 }
        );
      }
    }

    // 解析PDF选项
    let pdfOptions: PDFConversionOptions = PDFConverter.getDefaultOptions();
    if (optionsJson) {
      try {
        const customOptions = JSON.parse(optionsJson);
        if (PDFConverter.validateOptions(customOptions)) {
          pdfOptions = { ...pdfOptions, ...customOptions };
        }
      } catch (error) {
        console.warn('[PDF Export API] PDF选项解析失败，使用默认选项');
      }
    }

    // 如果有表单数据，先生成填充后的Word文档
    let documentBuffer: ArrayBuffer;
    
    if (Object.keys(formDataObj).length > 0) {
      console.log('[PDF Export API] 先生成填充后的Word文档');
      
      // 这里需要调用现有的文档生成逻辑
      const { WordProcessor } = await import('@/lib/word-processor');
      
      const templateBuffer = await templateFile.arrayBuffer();
      const sanitizedData = WordProcessor.sanitizeData(formDataObj);
      const result = await WordProcessor.generateDocument(templateBuffer, sanitizedData, templateFile.name);
      
      documentBuffer = result.documentBuffer;
    } else {
      // 直接使用原始模板
      documentBuffer = await templateFile.arrayBuffer();
    }

    console.log('[PDF Export API] 开始转换为PDF');

    // 转换为PDF
    const pdfResult = await PDFConverter.convertDocxToPDF(documentBuffer, pdfOptions);

    console.log(`[PDF Export API] PDF转换完成，大小: ${pdfResult.pdfBuffer.length} bytes`);

    // 处理中文文件名编码问题
    const encodedFilename = encodePdfFilename(templateFile.name);

    // 返回PDF文件
    return new NextResponse(new Uint8Array(pdfResult.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': encodedFilename.contentDisposition,
        'Content-Length': pdfResult.pdfBuffer.length.toString(),
        'X-Conversion-Time': pdfResult.metadata.conversionTime.toString(),
        'X-Original-Size': pdfResult.metadata.originalSize.toString(),
        'X-PDF-Size': pdfResult.metadata.pdfSize.toString(),
        'X-Original-Filename': encodeURIComponent(templateFile.name),
        'X-Safe-Filename': encodedFilename.safeFilename,
      },
    });

  } catch (error) {
    console.error('[PDF Export API] PDF导出失败:', error);
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'PDF导出失败';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('转换失败')) {
        errorMessage = 'PDF转换失败，请检查文档格式';
        statusCode = 400;
      } else if (error.message.includes('内存')) {
        errorMessage = 'PDF转换失败，文档过大';
        statusCode = 413;
      } else if (error.message.includes('超时')) {
        errorMessage = 'PDF转换超时，请稍后重试';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      createErrorResponse('PDF_EXPORT_FAILED', errorMessage),
      { status: statusCode }
    );
  }
}
