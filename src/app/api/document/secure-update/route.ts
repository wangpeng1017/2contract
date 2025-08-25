import { NextRequest, NextResponse } from 'next/server';
import { withDocumentWritePermission } from '@/lib/document-auth-middleware';
import { secureDocumentUpdateService } from '@/lib/secure-document-update';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 安全的文档更新API
 */
export async function POST(request: NextRequest) {
  return withDocumentWritePermission(request, async (req, user, documentId) => {
    try {
      const body = await req.json();
      const { operation, data, options = {} } = body;

      if (!operation) {
        return NextResponse.json(
          createErrorResponse('MISSING_OPERATION', '缺少操作类型'),
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

      // 提取用户和请求元数据
      const userId = user.sub || user.open_id;
      const metadata = {
        userAgent: req.headers.get('user-agent') || undefined,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        sessionId: req.cookies.get('session_id')?.value,
      };

      let result;

      switch (operation) {
        case 'text_replace':
          result = await handleTextReplace(documentId, accessToken, data, userId, metadata);
          break;

        case 'block_update':
          result = await handleBlockUpdate(documentId, accessToken, data, userId, metadata);
          break;

        case 'batch_replace':
          result = await handleBatchReplace(documentId, accessToken, data, userId, metadata);
          break;

        default:
          return NextResponse.json(
            createErrorResponse('UNSUPPORTED_OPERATION', `不支持的操作类型: ${operation}`),
            { status: 400 }
          );
      }

      if (result.success) {
        return NextResponse.json(createSuccessResponse(result));
      } else {
        return NextResponse.json(
          createErrorResponse('OPERATION_FAILED', result.error || '操作失败'),
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error in secure document update:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '安全更新操作失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 处理文本替换
 */
async function handleTextReplace(
  documentId: string,
  accessToken: string,
  data: any,
  userId: string,
  metadata: any
) {
  const { searchText, replaceText } = data;

  if (!searchText || replaceText === undefined) {
    return {
      success: false,
      error: '缺少搜索文本或替换文本',
    };
  }

  // 验证替换操作
  const validation = secureDocumentUpdateService.validateReplacement(searchText, replaceText);
  if (!validation.valid) {
    return {
      success: false,
      error: `替换验证失败: ${validation.errors.join(', ')}`,
      warnings: validation.warnings,
    };
  }

  const result = await secureDocumentUpdateService.secureTextReplace(
    documentId,
    accessToken,
    searchText,
    replaceText,
    userId,
    metadata
  );

  return {
    success: result.success,
    operation: result.operation,
    result: result.result,
    error: result.error,
    warnings: validation.warnings,
  };
}

/**
 * 处理块更新
 */
async function handleBlockUpdate(
  documentId: string,
  accessToken: string,
  data: any,
  userId: string,
  metadata: any
) {
  const { blockId, content } = data;

  if (!blockId || content === undefined) {
    return {
      success: false,
      error: '缺少块ID或内容',
    };
  }

  const result = await secureDocumentUpdateService.secureBlockUpdate(
    documentId,
    blockId,
    content,
    accessToken,
    userId,
    metadata
  );

  return {
    success: result.success,
    operation: result.operation,
    error: result.error,
  };
}

/**
 * 处理批量替换
 */
async function handleBatchReplace(
  documentId: string,
  accessToken: string,
  data: any,
  userId: string,
  metadata: any
) {
  const { replacements } = data;

  if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
    return {
      success: false,
      error: '缺少替换规则列表',
    };
  }

  if (replacements.length > 50) {
    return {
      success: false,
      error: '批量替换操作不能超过50个规则',
    };
  }

  // 验证所有替换规则
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  for (let i = 0; i < replacements.length; i++) {
    const replacement = replacements[i];
    if (!replacement.searchText || replacement.replaceText === undefined) {
      validationErrors.push(`规则 ${i + 1}: 缺少搜索文本或替换文本`);
      continue;
    }

    const validation = secureDocumentUpdateService.validateReplacement(
      replacement.searchText,
      replacement.replaceText
    );

    if (!validation.valid) {
      validationErrors.push(`规则 ${i + 1}: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      validationWarnings.push(`规则 ${i + 1}: ${validation.warnings.join(', ')}`);
    }
  }

  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `批量替换验证失败: ${validationErrors.join('; ')}`,
      warnings: validationWarnings,
    };
  }

  const result = await secureDocumentUpdateService.secureBatchReplace(
    documentId,
    accessToken,
    replacements,
    userId,
    metadata
  );

  return {
    success: result.success,
    operations: result.operations,
    results: result.results,
    summary: result.summary,
    warnings: validationWarnings,
  };
}

/**
 * 获取操作历史
 */
export async function GET(request: NextRequest) {
  return withDocumentWritePermission(request, async (req, user, documentId) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const userId = searchParams.get('userId');

      // 获取操作历史
      const history = secureDocumentUpdateService.getOperationHistory(
        documentId,
        userId || undefined,
        Math.min(limit, 100) // 最多返回100条记录
      );

      return NextResponse.json(
        createSuccessResponse({
          documentId,
          history,
          total: history.length,
        })
      );
    } catch (error) {
      console.error('Error getting operation history:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '获取操作历史失败'),
        { status: 500 }
      );
    }
  });
}
