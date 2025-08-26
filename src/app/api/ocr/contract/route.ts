import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { zhipuOCR, ContractInfo } from '@/lib/zhipu-ocr';
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
        // 将文件转换为base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // 提取合同信息 - 使用智谱AI
        const contractResult = await zhipuOCR.extractContract(base64Data, file.type);

        if (!contractResult.success) {
          throw new Error(contractResult.error || '合同信息提取失败');
        }

        const contractInfo = contractResult.contractInfo;

        let replacementRules: ReplaceRule[] = [];
        let previewResult = null;

        // 如果需要生成替换规则
        if (generateRules && contractInfo) {
          const accessToken = req.cookies.get('access_token')?.value;

          // 生成智能值替换规则
          replacementRules = await generateSmartReplacementRules(
            contractInfo,
            documentId,
            accessToken
          );

          // 如果提供了文档ID，生成预览
          if (documentId && replacementRules.length > 0 && accessToken) {
            try {
              previewResult = await generateReplacementPreview(
                documentId,
                replacementRules,
                accessToken
              );
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
 * 生成智能值替换规则
 */
async function generateSmartReplacementRules(
  contractInfo: ContractInfo,
  documentId?: string,
  accessToken?: string
): Promise<ReplaceRule[]> {
  const rules: ReplaceRule[] = [];

  // 如果有文档信息，使用智能值替换
  if (documentId && accessToken) {
    try {
      const { documentService } = await import('@/lib/document-service');
      const documentContent = await documentService.getDocumentContent(documentId, accessToken);
      const originalText = documentService.extractAllText(documentContent.blocks);

      console.log('[Contract OCR] 使用智能值替换模式');
      return generateValueReplacementRules(contractInfo, originalText);
    } catch (error) {
      console.warn('[Contract OCR] 智能值替换失败，使用传统模式:', error);
    }
  }

  // 回退到传统的模式替换
  console.log('[Contract OCR] 使用传统模式替换');
  return generatePatternReplacementRules(contractInfo);
}

/**
 * 生成值对值的替换规则（智能模式）
 */
function generateValueReplacementRules(contractInfo: ContractInfo, originalText: string): ReplaceRule[] {
  const rules: ReplaceRule[] = [];

  // 定义字段映射
  const fieldMappings = [
    {
      key: '甲方',
      ocrValue: contractInfo.parties.partyA,
      patterns: ['甲方', '第一方', '采购方', '委托方', '发包方']
    },
    {
      key: '乙方',
      ocrValue: contractInfo.parties.partyB,
      patterns: ['乙方', '第二方', '供应方', '受托方', '承包方']
    },
    {
      key: '合同金额',
      ocrValue: contractInfo.amounts[0],
      patterns: ['金额', '价格', '费用', '总价', '合同价']
    },
    {
      key: '签署日期',
      ocrValue: contractInfo.dates[0],
      patterns: ['日期', '签署', '签订', '生效']
    }
  ];

  fieldMappings.forEach(mapping => {
    if (mapping.ocrValue && mapping.ocrValue.trim()) {
      // 提取OCR识别的纯净值
      const pureOcrValue = extractPureValue(mapping.ocrValue, mapping.key);

      if (pureOcrValue) {
        // 在原文档中查找对应的值
        const originalValue = findValueInDocument(originalText, mapping.patterns, pureOcrValue);

        if (originalValue && originalValue !== pureOcrValue) {
          rules.push({
            id: `${mapping.key}_value_${generateRandomString(8)}`,
            searchText: originalValue,
            replaceText: pureOcrValue,
            options: {
              caseSensitive: false,
              wholeWord: true, // 使用整词匹配确保精确替换
              enabled: true,
              priority: 0
            }
          });

          console.log(`[Smart Replace] ${mapping.key}: "${originalValue}" → "${pureOcrValue}"`);
        }
      }
    }
  });

  return rules;
}

/**
 * 生成传统的模式替换规则（兼容模式）
 */
function generatePatternReplacementRules(contractInfo: ContractInfo): ReplaceRule[] {
  const rules: ReplaceRule[] = [];

  // 定义字段映射和搜索模式
  const fieldMappings = [
    {
      key: '甲方',
      searchPatterns: ['甲方：', '甲方:', '甲方 ', '第一方：', '第一方:'],
      value: contractInfo.parties.partyA
    },
    {
      key: '乙方',
      searchPatterns: ['乙方：', '乙方:', '乙方 ', '第二方：', '第二方:'],
      value: contractInfo.parties.partyB
    },
    {
      key: '合同金额',
      searchPatterns: ['合同金额：', '合同金额:', '总金额：', '总金额:', '金额：', '金额:'],
      value: contractInfo.amounts[0] // 取第一个金额
    },
    {
      key: '合同编号',
      searchPatterns: ['合同编号：', '合同编号:', '协议编号：', '协议编号:', '编号：', '编号:'],
      value: contractInfo.keyTerms.find(term => term.includes('编号'))?.split('：')[1] || contractInfo.keyTerms.find(term => term.includes('编号'))?.split(':')[1]
    },
    {
      key: '签署日期',
      searchPatterns: ['签署日期：', '签署日期:', '签订日期：', '签订日期:', '日期：', '日期:'],
      value: contractInfo.dates[0] // 取第一个日期
    },
    {
      key: '联系人',
      searchPatterns: ['联系人：', '联系人:', '负责人：', '负责人:'],
      value: contractInfo.keyTerms.find(term => term.includes('联系人') || term.includes('负责人'))?.split(/[：:]/)[1]
    },
    {
      key: '联系电话',
      searchPatterns: ['联系电话：', '联系电话:', '电话：', '电话:', '手机：', '手机:'],
      value: contractInfo.keyTerms.find(term => term.includes('电话') || term.includes('手机'))?.split(/[：:]/)[1]
    }
  ];

  fieldMappings.forEach(mapping => {
    if (mapping.value && mapping.value.trim()) {
      // 只为每个字段生成一条最佳的替换规则
      // 选择第一个搜索模式作为最佳模式
      const bestPattern = mapping.searchPatterns[0];

      rules.push({
        id: `${mapping.key}_${generateRandomString(8)}`,
        searchText: bestPattern,
        replaceText: `${bestPattern}${mapping.value}`,
        options: {
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: 0
        }
      });
    }
  });

  return rules;
}

/**
 * 从OCR结果中提取纯净的字段值
 */
function extractPureValue(ocrValue: string, fieldKey: string): string {
  if (!ocrValue || !ocrValue.trim()) return '';

  // 定义常见的标签前缀模式
  const labelPatterns = [
    /^甲方[：:\s]*(.+)$/,
    /^乙方[：:\s]*(.+)$/,
    /^第一方[：:\s]*(.+)$/,
    /^第二方[：:\s]*(.+)$/,
    /^采购方[：:\s]*(.+)$/,
    /^供应方[：:\s]*(.+)$/,
    /^委托方[：:\s]*(.+)$/,
    /^受托方[：:\s]*(.+)$/,
    /^发包方[：:\s]*(.+)$/,
    /^承包方[：:\s]*(.+)$/,
    /^合同金额[：:\s]*(.+)$/,
    /^总金额[：:\s]*(.+)$/,
    /^金额[：:\s]*(.+)$/,
    /^价格[：:\s]*(.+)$/,
    /^费用[：:\s]*(.+)$/,
    /^签署日期[：:\s]*(.+)$/,
    /^签订日期[：:\s]*(.+)$/,
    /^生效日期[：:\s]*(.+)$/,
    /^日期[：:\s]*(.+)$/,
    /^合同编号[：:\s]*(.+)$/,
    /^协议编号[：:\s]*(.+)$/,
    /^编号[：:\s]*(.+)$/,
    /^联系人[：:\s]*(.+)$/,
    /^负责人[：:\s]*(.+)$/,
    /^联系电话[：:\s]*(.+)$/,
    /^电话[：:\s]*(.+)$/,
    /^手机[：:\s]*(.+)$/
  ];

  // 尝试匹配并提取值
  for (const pattern of labelPatterns) {
    const match = ocrValue.match(pattern);
    if (match && match[1]) {
      const extractedValue = match[1].trim();
      console.log(`[Value Extract] ${fieldKey}: "${ocrValue}" → "${extractedValue}"`);
      return extractedValue;
    }
  }

  // 如果没有匹配到标签模式，返回原值（可能已经是纯净值）
  const cleanValue = ocrValue.trim();
  console.log(`[Value Extract] ${fieldKey}: 使用原值 "${cleanValue}"`);
  return cleanValue;
}

/**
 * 在原文档中查找对应的字段值
 */
function findValueInDocument(originalText: string, patterns: string[], ocrValue: string): string | null {
  if (!originalText || !ocrValue) return null;

  // 为每个模式创建正则表达式来查找值
  for (const pattern of patterns) {
    // 创建匹配模式，查找标签后的值
    const regexPatterns = [
      new RegExp(`${pattern}[（(]?[^）)]*[）)]?[：:\\s]*([^\\n\\r，,。.；;]+)`, 'gi'),
      new RegExp(`${pattern}[：:\\s]*([^\\n\\r，,。.；;]+)`, 'gi'),
      new RegExp(`[^\\n\\r]*${pattern}[^\\n\\r]*[：:\\s]*([^\\n\\r，,。.；;]+)`, 'gi')
    ];

    for (const regex of regexPatterns) {
      const matches = Array.from(originalText.matchAll(regex));

      for (const match of matches) {
        if (match[1]) {
          const foundValue = match[1].trim();

          // 过滤掉明显不是目标值的结果
          if (foundValue.length > 2 &&
              foundValue !== ocrValue &&
              !foundValue.includes('：') &&
              !foundValue.includes(':') &&
              foundValue.length < 100) { // 避免匹配到过长的文本

            console.log(`[Value Find] 在原文档中找到 "${pattern}" 对应的值: "${foundValue}"`);
            return foundValue;
          }
        }
      }
    }
  }

  // 如果没有找到，尝试模糊匹配
  return findValueByFuzzyMatch(originalText, ocrValue);
}

/**
 * 使用模糊匹配在文档中查找相似的值
 */
function findValueByFuzzyMatch(originalText: string, ocrValue: string): string | null {
  if (!originalText || !ocrValue || ocrValue.length < 3) return null;

  // 提取文档中所有可能的公司名称、金额、日期等
  const valuePatterns = [
    // 公司名称模式
    /([^\s\n\r]{2,}(?:公司|企业|集团|有限责任公司|股份有限公司|合作社|工厂|店|中心|机构))/g,
    // 金额模式
    /([\d,]+(?:\.\d{2})?(?:元|万元|千元|¥|￥|\$))/g,
    // 日期模式
    /(\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}[日]?)/g,
    // 编号模式
    /([A-Z0-9\-]{6,})/g
  ];

  for (const pattern of valuePatterns) {
    const matches = Array.from(originalText.matchAll(pattern));

    for (const match of matches) {
      const foundValue = match[1].trim();

      // 计算相似度
      const similarity = calculateSimilarity(foundValue, ocrValue);

      // 如果相似度较高但不完全相同，认为是匹配的
      if (similarity > 0.3 && similarity < 1.0 && foundValue !== ocrValue) {
        console.log(`[Fuzzy Match] 找到相似值: "${foundValue}" (相似度: ${similarity.toFixed(2)})`);
        return foundValue;
      }
    }
  }

  return null;
}

/**
 * 计算两个字符串的相似度
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * 计算编辑距离
 */
function getEditDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
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
  if (contractInfo.dates && contractInfo.dates.length > 0) {
    const datePattern = /^\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?$/;
    const firstDate = contractInfo.dates[0];
    if (!datePattern.test(firstDate)) {
      suggestions.push('建议确认签署日期格式是否正确');
    }
  }

  // 检查金额格式
  if (contractInfo.amounts && contractInfo.amounts.length > 0) {
    const amountPattern = /[\d,¥￥$]+(\.\d{2})?/;
    const firstAmount = contractInfo.amounts[0];
    if (!amountPattern.test(firstAmount)) {
      suggestions.push('建议确认合同金额格式是否正确');
    }
  }

  // 提供优化建议
  const totalFields = (contractInfo.parties.partyA ? 1 : 0) +
                     (contractInfo.parties.partyB ? 1 : 0) +
                     contractInfo.amounts.length +
                     contractInfo.dates.length +
                     contractInfo.keyTerms.length;

  if (totalFields < 5) {
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
