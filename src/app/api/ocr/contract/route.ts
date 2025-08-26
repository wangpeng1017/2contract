import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { geminiOCR, ContractInfo } from '@/lib/gemini-ocr';
import { TextReplaceEngine, ReplaceRule } from '@/lib/text-replace';
import { createSuccessResponse, createErrorResponse, generateRandomString } from '@/lib/utils';

/**
 * 合同信息提取并生成替换规则
 */
export async function POST(request: NextRequest) {
  // 检查是否为测试模式（开发环境允许无认证测试）
  const isTestMode = process.env.NODE_ENV === 'development';

  if (isTestMode) {
    return handleContractOCRRequest(request, { sub: 'test-user' });
  }

  return withAuth(request, async (req, user) => {
    return handleContractOCRRequest(req, user);
  });
}

async function handleContractOCRRequest(req: NextRequest, user: any) {
    try {
      const formData = await req.formData();
      const file = formData.get('image') as File;
      const generateRules = formData.get('generateRules') === 'true';
      const documentId = formData.get('documentId') as string;

      if (!file) {
        return NextResponse.json(
          createErrorResponse('MISSING_IMAGE', '缺少图片文件'),
          { status: 400 }
        );
      }

      // 验证文件
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          createErrorResponse('INVALID_FILE_TYPE', '文件类型必须是图片'),
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          createErrorResponse('FILE_TOO_LARGE', '文件大小不能超过10MB'),
          { status: 400 }
        );
      }

      try {
        // 提取合同信息
        const contractInfo = await geminiOCR.extractContractInfo(file, {
          maxRetries: 2,
          timeout: 30000
        });

        let replacementRules: ReplaceRule[] = [];
        let previewResult = null;

        // 如果需要生成替换规则
        if (generateRules && contractInfo) {
          replacementRules = generateReplacementRules(contractInfo);
          
          // 如果提供了文档ID，生成预览
          if (documentId && replacementRules.length > 0) {
            try {
              const accessToken = req.cookies.get('access_token')?.value;
              if (accessToken) {
                previewResult = await generateReplacementPreview(
                  documentId, 
                  replacementRules, 
                  accessToken
                );
              }
            } catch (previewError) {
              console.warn('Failed to generate preview:', previewError);
              // 预览失败不影响主要功能
            }
          }
        }

        // 记录使用情况
        if (user.sub !== 'test-user') {
          await recordContractExtractionUsage(user.sub, file.size, contractInfo);
        }

        return NextResponse.json(
          createSuccessResponse({
            contractInfo,
            replacementRules,
            preview: previewResult,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              extractedFields: Object.keys(contractInfo).length,
              rulesGenerated: replacementRules.length
            },
            suggestions: generateSuggestions(contractInfo)
          })
        );

      } catch (extractionError) {
        console.error('Contract extraction error:', extractionError);
        
        return NextResponse.json(
          createErrorResponse('EXTRACTION_ERROR', '合同信息提取失败，请确保图片清晰且包含合同内容'),
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Error in contract extraction API:', error);
      
      return NextResponse.json(
        createErrorResponse('API_ERROR', '合同提取API处理错误'),
        { status: 500 }
      );
    }
}

/**
 * 生成替换规则
 */
function generateReplacementRules(contractInfo: ContractInfo): ReplaceRule[] {
  const rules: ReplaceRule[] = [];
  
  // 定义字段映射和搜索模式
  const fieldMappings = [
    {
      key: '甲方',
      searchPatterns: ['甲方：', '甲方:', '甲方 ', '第一方：', '第一方:'],
      value: contractInfo.甲方
    },
    {
      key: '乙方', 
      searchPatterns: ['乙方：', '乙方:', '乙方 ', '第二方：', '第二方:'],
      value: contractInfo.乙方
    },
    {
      key: '合同金额',
      searchPatterns: ['合同金额：', '合同金额:', '总金额：', '总金额:', '金额：', '金额:'],
      value: contractInfo.合同金额
    },
    {
      key: '合同编号',
      searchPatterns: ['合同编号：', '合同编号:', '协议编号：', '协议编号:', '编号：', '编号:'],
      value: contractInfo.合同编号
    },
    {
      key: '签署日期',
      searchPatterns: ['签署日期：', '签署日期:', '签订日期：', '签订日期:', '日期：', '日期:'],
      value: contractInfo.签署日期
    },
    {
      key: '联系人',
      searchPatterns: ['联系人：', '联系人:', '负责人：', '负责人:'],
      value: contractInfo.联系人
    },
    {
      key: '联系电话',
      searchPatterns: ['联系电话：', '联系电话:', '电话：', '电话:', '手机：', '手机:'],
      value: contractInfo.联系电话
    }
  ];

  fieldMappings.forEach(mapping => {
    if (mapping.value && mapping.value.trim()) {
      // 为每个字段生成多个可能的搜索模式
      mapping.searchPatterns.forEach((pattern, index) => {
        rules.push({
          id: `${mapping.key}_${index}_${generateRandomString(8)}`,
          searchText: pattern,
          replaceText: `${pattern}${mapping.value}`,
          options: {
            caseSensitive: false,
            wholeWord: false,
            enabled: true,
            priority: index // 第一个模式优先级最高
          }
        });
      });

      // 添加一个通用的值替换规则
      rules.push({
        id: `${mapping.key}_value_${generateRandomString(8)}`,
        searchText: `[${mapping.key}]`,
        replaceText: mapping.value,
        options: {
          caseSensitive: false,
          wholeWord: true,
          enabled: true,
          priority: 0
        }
      });
    }
  });

  return rules;
}

/**
 * 生成替换预览
 */
async function generateReplacementPreview(
  documentId: string, 
  rules: ReplaceRule[], 
  accessToken: string
): Promise<any> {
  try {
    const { documentService } = await import('@/lib/document-service');
    
    // 获取文档内容
    const documentContent = await documentService.getDocumentContent(documentId, accessToken);
    const originalText = documentService.extractAllText(documentContent.blocks);

    // 执行预览替换
    const previewResult = await TextReplaceEngine.batchReplace(originalText, rules, {
      dryRun: true,
      maxReplacements: 50
    });

    return {
      originalLength: originalText.length,
      finalLength: previewResult.finalText.length,
      totalMatches: previewResult.totalMatches,
      totalReplacements: previewResult.totalReplacements,
      successfulRules: previewResult.results.filter(r => r.success).length,
      preview: previewResult.finalText.substring(0, 500) + (previewResult.finalText.length > 500 ? '...' : '')
    };
  } catch (error) {
    console.error('Preview generation error:', error);
    throw error;
  }
}

/**
 * 生成建议
 */
function generateSuggestions(contractInfo: ContractInfo): string[] {
  const suggestions: string[] = [];
  
  // 检查提取的信息完整性
  const requiredFields = ['甲方', '乙方', '合同金额'];
  const missingFields = requiredFields.filter(field => !contractInfo[field as keyof ContractInfo]);
  
  if (missingFields.length > 0) {
    suggestions.push(`建议检查图片中是否包含以下信息：${missingFields.join('、')}`);
  }

  // 检查日期格式
  if (contractInfo.签署日期) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(contractInfo.签署日期)) {
      suggestions.push('建议确认签署日期格式是否正确（YYYY-MM-DD）');
    }
  }

  // 检查金额格式
  if (contractInfo.合同金额) {
    const amountPattern = /[\d,]+(\.\d{2})?/;
    if (!amountPattern.test(contractInfo.合同金额)) {
      suggestions.push('建议确认合同金额格式是否正确');
    }
  }

  // 提供优化建议
  if (Object.keys(contractInfo).length < 5) {
    suggestions.push('如果图片中包含更多信息，建议使用更清晰的图片重新识别');
  }

  if (suggestions.length === 0) {
    suggestions.push('信息提取完成，可以直接使用生成的替换规则');
  }

  return suggestions;
}

/**
 * 记录合同提取使用情况
 */
async function recordContractExtractionUsage(
  userId: string, 
  fileSize: number, 
  contractInfo: ContractInfo
): Promise<void> {
  try {
    // TODO: 实现使用情况记录
    const extractedFields = Object.keys(contractInfo).length;
    console.log(`Contract extraction for user ${userId}: ${extractedFields} fields extracted from ${fileSize} bytes`);
  } catch (error) {
    console.error('Error recording contract extraction usage:', error);
  }
}
