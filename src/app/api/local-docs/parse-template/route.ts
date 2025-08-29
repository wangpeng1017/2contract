import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { WordProcessor, PlaceholderInfo } from '@/lib/word-processor';
import { FileCacheManager } from '@/lib/file-cache-manager';

/**
 * 解析Word模板中的占位符
 * 增强版：解决文件名缓存冲突问题，确保每次上传都能正确解析最新内容
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const forceReparse = formData.get('forceReparse') === 'true';

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

    // 生成文件唯一标识符，避免文件名缓存冲突
    const fileIdentifier = await FileCacheManager.generateFileIdentifier(file, file.name);
    console.log(`[Local Docs] 文件标识符: ${fileIdentifier.uniqueName}`);

    // 获取文件buffer
    const arrayBuffer = await file.arrayBuffer();

    // 检查是否强制重新解析
    if (!forceReparse) {
      // 检查文件是否已存在于缓存中
      const cachedInfo = FileCacheManager.checkFileExists(fileIdentifier.contentHash);
      if (cachedInfo) {
        console.log(`[Local Docs] 发现相同内容的缓存文件，但仍将重新解析以确保准确性`);
        // 注意：即使发现缓存，我们仍然重新解析，因为解析逻辑可能已更新
      }
    }

    // 验证文件格式
    const isValid = await WordProcessor.validateTemplate(arrayBuffer);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse('INVALID_TEMPLATE', '无效的Word文档格式'),
        { status: 400 }
      );
    }

    // 使用唯一文件名进行解析，避免内部缓存冲突
    const documentTemplate = await WordProcessor.parseTemplate(arrayBuffer, fileIdentifier.uniqueName);

    // 将文件信息添加到缓存管理器
    FileCacheManager.addToCache(fileIdentifier);

    console.log(`[Local Docs] 解析完成，发现 ${documentTemplate.placeholders.length} 个占位符`);

    return NextResponse.json(createSuccessResponse({
      placeholders: documentTemplate.placeholders,
      templateName: fileIdentifier.originalName, // 返回原始文件名给前端
      templateSize: file.size,
      metadata: {
        ...documentTemplate.metadata,
        fileIdentifier: {
          originalName: fileIdentifier.originalName,
          uniqueName: fileIdentifier.uniqueName,
          contentHash: fileIdentifier.contentHash.substring(0, 8) + '...', // 只返回部分哈希
          timestamp: fileIdentifier.timestamp
        }
      }
    }));

  } catch (error) {
    console.error('[Local Docs] 模板解析失败:', error);

    // 确保错误信息不包含敏感的XML内容
    let errorMessage = '模板解析失败';
    if (error instanceof Error) {
      // 过滤掉可能包含XML内容的错误信息
      const message = error.message;
      if (message && !message.includes('<') && !message.includes('>') && message.length < 200) {
        errorMessage = `模板解析失败: ${message}`;
      }
    }

    return NextResponse.json(
      createErrorResponse('PARSE_ERROR', errorMessage),
      { status: 500 }
    );
  }
}


