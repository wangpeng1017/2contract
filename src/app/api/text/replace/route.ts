import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { documentService } from '@/lib/document-service';
import { TextReplaceEngine, ReplaceRule } from '@/lib/text-replace';
import { ReplaceValidator } from '@/lib/replace-validator';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 执行文本替换
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { 
        documentId, 
        rules, 
        options = {},
        validateResult = true 
      } = body;

      if (!documentId) {
        return NextResponse.json(
          createErrorResponse('MISSING_DOCUMENT_ID', '缺少文档ID'),
          { status: 400 }
        );
      }

      if (!rules || !Array.isArray(rules) || rules.length === 0) {
        return NextResponse.json(
          createErrorResponse('MISSING_RULES', '缺少替换规则'),
          { status: 400 }
        );
      }

      // 验证替换规则格式
      const validationErrors = validateRules(rules);
      if (validationErrors.length > 0) {
        return NextResponse.json(
          createErrorResponse('INVALID_RULES', `规则格式错误: ${validationErrors.join(', ')}`),
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
        // 获取文档内容
        const documentContent = await documentService.getDocumentContent(documentId, accessToken);
        const originalText = documentService.extractAllText(documentContent.blocks);

        // 执行批量替换
        const replaceResult = await TextReplaceEngine.smartReplace(originalText, rules, {
          ...options,
          aiProvider: 'gemini' // 使用Gemini增强替换
        });

        // 验证替换结果
        let validation = null;
        if (validateResult) {
          validation = ReplaceValidator.validateBatchResult(replaceResult, rules, {
            checkIntegrity: true,
            checkConsistency: true,
            checkQuality: true,
            strictMode: options.strictMode || false
          });
        }

        // 如果不是预览模式且替换成功，更新文档
        if (!options.dryRun && replaceResult.success && replaceResult.totalReplacements > 0) {
          try {
            // 这里需要将替换后的文本重新写入文档
            // 由于飞书API的限制，我们需要逐块更新
            await updateDocumentWithReplacedText(documentId, accessToken, documentContent, replaceResult);
          } catch (updateError) {
            console.error('Error updating document:', updateError);
            return NextResponse.json(
              createErrorResponse('DOCUMENT_UPDATE_ERROR', '更新文档失败'),
              { status: 500 }
            );
          }
        }

        return NextResponse.json(
          createSuccessResponse({
            documentId,
            replaceResult,
            validation,
            report: TextReplaceEngine.generateReport(replaceResult)
          })
        );

      } catch (error) {
        console.error('Error in text replacement:', error);
        return NextResponse.json(
          createErrorResponse('REPLACEMENT_ERROR', '文本替换失败'),
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Error in text replace API:', error);
      return NextResponse.json(
        createErrorResponse('API_ERROR', '文本替换API错误'),
        { status: 500 }
      );
    }
  });
}

/**
 * 验证替换规则
 */
function validateRules(rules: any[]): string[] {
  const errors: string[] = [];

  rules.forEach((rule, index) => {
    if (!rule.id) {
      errors.push(`规则 ${index + 1}: 缺少ID`);
    }

    if (!rule.searchText || typeof rule.searchText !== 'string') {
      errors.push(`规则 ${index + 1}: 搜索文本无效`);
    }

    if (rule.replaceText === undefined || typeof rule.replaceText !== 'string') {
      errors.push(`规则 ${index + 1}: 替换文本无效`);
    }

    if (rule.searchText === rule.replaceText) {
      errors.push(`规则 ${index + 1}: 搜索文本和替换文本相同`);
    }

    // 验证正则表达式
    if (rule.options?.useRegex) {
      try {
        new RegExp(rule.searchText);
      } catch (regexError) {
        errors.push(`规则 ${index + 1}: 无效的正则表达式`);
      }
    }
  });

  return errors;
}

/**
 * 更新文档内容
 */
async function updateDocumentWithReplacedText(
  documentId: string,
  accessToken: string,
  originalContent: any,
  replaceResult: any
): Promise<void> {
  // 这是一个简化的实现
  // 实际应用中需要更复杂的逻辑来处理文档结构
  
  const textBlocks = documentService.findBlocksByType(originalContent.blocks, 'text');
  const updates = [];

  for (const block of textBlocks) {
    if (block.text?.content) {
      let updatedContent = block.text.content;
      
      // 应用所有成功的替换规则
      replaceResult.results.forEach((result: any) => {
        if (result.success && result.matches.length > 0) {
          // 简单的字符串替换（实际应用中需要更精确的位置匹配）
          updatedContent = updatedContent.replace(
            new RegExp(escapeRegExp(result.searchText), 'g'),
            result.replaceText
          );
        }
      });

      if (updatedContent !== block.text.content) {
        updates.push({
          blockId: block.block_id,
          content: {
            text: {
              content: updatedContent
            }
          }
        });
      }
    }
  }

  // 批量更新文档块
  if (updates.length > 0) {
    const { feishuClient } = await import('@/lib/feishu');
    await feishuClient.batchUpdateDocumentBlocks(documentId, updates, accessToken);
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
