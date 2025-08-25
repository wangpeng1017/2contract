import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { secureDocumentUpdateService } from '@/lib/secure-document-update';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 内容验证API
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { content, operation = 'content_validation' } = body;

      if (!content) {
        return NextResponse.json(
          createErrorResponse('MISSING_CONTENT', '缺少要验证的内容'),
          { status: 400 }
        );
      }

      let result;

      switch (operation) {
        case 'content_validation':
          result = await handleContentValidation(content);
          break;

        case 'replacement_validation':
          const { searchText, replaceText } = body;
          if (!searchText || replaceText === undefined) {
            return NextResponse.json(
              createErrorResponse('MISSING_REPLACEMENT_DATA', '缺少搜索文本或替换文本'),
              { status: 400 }
            );
          }
          result = await handleReplacementValidation(searchText, replaceText);
          break;

        case 'batch_validation':
          const { replacements } = body;
          if (!replacements || !Array.isArray(replacements)) {
            return NextResponse.json(
              createErrorResponse('MISSING_REPLACEMENTS', '缺少替换规则列表'),
              { status: 400 }
            );
          }
          result = await handleBatchValidation(replacements);
          break;

        default:
          return NextResponse.json(
            createErrorResponse('UNSUPPORTED_OPERATION', `不支持的验证操作: ${operation}`),
            { status: 400 }
          );
      }

      return NextResponse.json(createSuccessResponse(result));
    } catch (error) {
      console.error('Error in content validation:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', '内容验证失败'),
        { status: 500 }
      );
    }
  });
}

/**
 * 处理内容验证
 */
async function handleContentValidation(content: string) {
  const validation = secureDocumentUpdateService.validateContent(content);
  const sanitized = secureDocumentUpdateService.sanitizeContent(content);

  return {
    original: content,
    sanitized,
    validation: {
      valid: validation.valid,
      errors: validation.errors,
    },
    statistics: {
      originalLength: content.length,
      sanitizedLength: sanitized.length,
      charactersRemoved: content.length - sanitized.length,
    },
    recommendations: generateContentRecommendations(content, validation),
  };
}

/**
 * 处理替换验证
 */
async function handleReplacementValidation(searchText: string, replaceText: string) {
  const validation = secureDocumentUpdateService.validateReplacement(searchText, replaceText);
  const contentValidation = secureDocumentUpdateService.validateContent(replaceText);
  const sanitizedReplaceText = secureDocumentUpdateService.sanitizeContent(replaceText);

  return {
    searchText,
    replaceText,
    sanitizedReplaceText,
    validation: {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    contentValidation: {
      valid: contentValidation.valid,
      errors: contentValidation.errors,
    },
    statistics: {
      searchLength: searchText.length,
      replaceLength: replaceText.length,
      sanitizedLength: sanitizedReplaceText.length,
      lengthDifference: replaceText.length - searchText.length,
    },
    recommendations: generateReplacementRecommendations(searchText, replaceText, validation),
  };
}

/**
 * 处理批量验证
 */
async function handleBatchValidation(replacements: Array<{ searchText: string; replaceText: string }>) {
  const results = [];
  const summary = {
    total: replacements.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    totalErrors: 0,
    totalWarnings: 0,
  };

  for (let i = 0; i < replacements.length; i++) {
    const replacement = replacements[i];
    const validation = secureDocumentUpdateService.validateReplacement(
      replacement.searchText,
      replacement.replaceText
    );

    const result = {
      index: i,
      searchText: replacement.searchText,
      replaceText: replacement.replaceText,
      validation,
    };

    results.push(result);

    if (validation.valid) {
      summary.valid++;
    } else {
      summary.invalid++;
    }

    if (validation.warnings.length > 0) {
      summary.warnings++;
    }

    summary.totalErrors += validation.errors.length;
    summary.totalWarnings += validation.warnings.length;
  }

  return {
    results,
    summary,
    recommendations: generateBatchRecommendations(results, summary),
  };
}

/**
 * 生成内容建议
 */
function generateContentRecommendations(content: string, validation: any): string[] {
  const recommendations: string[] = [];

  if (!validation.valid) {
    recommendations.push('内容包含不安全的元素，建议修改后再使用');
  }

  if (content.length > 5000) {
    recommendations.push('内容较长，建议分段处理以提高处理效率');
  }

  if (content.includes('<') && content.includes('>')) {
    recommendations.push('内容包含HTML标签，已自动清理，请确认清理后的内容是否符合预期');
  }

  if (/\s{3,}/.test(content)) {
    recommendations.push('内容包含多余的空白字符，已自动清理');
  }

  return recommendations;
}

/**
 * 生成替换建议
 */
function generateReplacementRecommendations(
  searchText: string,
  replaceText: string,
  validation: any
): string[] {
  const recommendations: string[] = [];

  if (searchText.length < 3) {
    recommendations.push('搜索文本较短，建议使用更具体的搜索词以避免误替换');
  }

  if (replaceText.length > searchText.length * 5) {
    recommendations.push('替换文本明显长于搜索文本，请确认替换内容是否正确');
  }

  if (validation.warnings.length > 0) {
    recommendations.push('替换操作存在潜在风险，请仔细检查替换内容');
  }

  if (/^\s+$/.test(replaceText)) {
    recommendations.push('替换文本只包含空白字符，这将删除匹配的内容');
  }

  if (searchText === replaceText) {
    recommendations.push('搜索文本和替换文本相同，此操作不会产生任何变化');
  }

  return recommendations;
}

/**
 * 生成批量操作建议
 */
function generateBatchRecommendations(results: any[], summary: any): string[] {
  const recommendations: string[] = [];

  if (summary.invalid > 0) {
    recommendations.push(`${summary.invalid} 个替换规则验证失败，请修正后重试`);
  }

  if (summary.warnings > 0) {
    recommendations.push(`${summary.warnings} 个替换规则存在警告，建议仔细检查`);
  }

  if (summary.total > 20) {
    recommendations.push('批量操作规则较多，建议分批执行以降低风险');
  }

  const duplicateSearchTexts = new Set<string>();
  const duplicates: string[] = [];

  results.forEach(result => {
    if (duplicateSearchTexts.has(result.searchText)) {
      duplicates.push(result.searchText);
    } else {
      duplicateSearchTexts.add(result.searchText);
    }
  });

  if (duplicates.length > 0) {
    recommendations.push(`发现重复的搜索文本: ${duplicates.join(', ')}，请检查是否有冲突`);
  }

  return recommendations;
}
