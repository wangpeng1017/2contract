import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { documentService } from '@/lib/document-service';
import { TextReplaceEngine, ReplaceRule } from '@/lib/text-replace';
import { ReplaceValidator } from '@/lib/replace-validator';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 预览文本替换结果
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { 
        documentId, 
        rules, 
        options = {} 
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

        // 执行预览替换（dryRun模式）
        const previewResult = await TextReplaceEngine.smartReplace(originalText, rules, {
          ...options,
          dryRun: true, // 强制预览模式
          aiProvider: 'gemini'
        });

        // 验证预览结果
        const validation = ReplaceValidator.validateBatchResult(previewResult, rules, {
          checkIntegrity: true,
          checkConsistency: true,
          checkQuality: true,
          strictMode: false // 预览模式使用宽松验证
        });

        // 生成详细的预览信息
        const previewDetails = generatePreviewDetails(originalText, previewResult, rules);

        return NextResponse.json(
          createSuccessResponse({
            documentId,
            preview: {
              originalText: originalText.substring(0, 1000) + (originalText.length > 1000 ? '...' : ''),
              finalText: previewResult.finalText.substring(0, 1000) + (previewResult.finalText.length > 1000 ? '...' : ''),
              changes: previewDetails.changes,
              statistics: previewDetails.statistics
            },
            replaceResult: previewResult,
            validation,
            recommendations: validation.recommendations
          })
        );

      } catch (error) {
        console.error('Error in text preview:', error);
        return NextResponse.json(
          createErrorResponse('PREVIEW_ERROR', '预览文本替换失败'),
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Error in text preview API:', error);
      return NextResponse.json(
        createErrorResponse('API_ERROR', '预览API错误'),
        { status: 500 }
      );
    }
  });
}

/**
 * 生成预览详情
 */
function generatePreviewDetails(originalText: string, replaceResult: any, rules: ReplaceRule[]) {
  const changes = [];
  const statistics = {
    totalCharacters: originalText.length,
    finalCharacters: replaceResult.finalText.length,
    characterChange: replaceResult.finalText.length - originalText.length,
    totalWords: originalText.split(/\s+/).length,
    finalWords: replaceResult.finalText.split(/\s+/).length,
    wordChange: replaceResult.finalText.split(/\s+/).length - originalText.split(/\s+/).length,
    totalLines: originalText.split('\n').length,
    finalLines: replaceResult.finalText.split('\n').length,
    lineChange: replaceResult.finalText.split('\n').length - originalText.split('\n').length
  };

  // 生成变更详情
  replaceResult.results.forEach((result: any) => {
    const rule = rules.find(r => r.id === result.ruleId);
    if (!rule) return;

    if (result.success && result.matches.length > 0) {
      result.matches.forEach((match: any, index: number) => {
        changes.push({
          ruleId: result.ruleId,
          ruleName: rule.searchText,
          position: {
            start: match.start,
            end: match.end
          },
          change: {
            from: match.text,
            to: result.replaceText,
            context: match.context
          },
          preview: {
            before: match.context?.before || '',
            original: match.text,
            replacement: result.replaceText,
            after: match.context?.after || ''
          }
        });
      });
    }
  });

  // 按位置排序变更
  changes.sort((a, b) => a.position.start - b.position.start);

  return {
    changes: changes.slice(0, 50), // 限制显示前50个变更
    statistics
  };
}
