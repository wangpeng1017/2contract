import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { geminiOCR } from '@/lib/gemini-ocr';
import { TextReplaceEngine, ReplaceRule } from '@/lib/text-replace';
import { ContractValidator } from '@/lib/contract-validators';
import { createSuccessResponse, createErrorResponse, generateRandomString } from '@/lib/utils';

// 合同信息类型（与 zhipu-ocr 兼容）
interface ContractInfo {
  contractNumber?: string;
  contractType?: string;
  signDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  parties: {
    partyA?: any;
    partyB?: any;
  };
  vehicles?: any[];
  priceDetails?: any;
  amounts: string[];
  dates: string[];
  keyTerms: string[];
  fullText: string;
}

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
      const createNewDocument = formData.get('createNewDocument') === 'true';

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

        // 提取合同信息 - 使用 Gemini AI OCR
        const contractInfo = await geminiOCR.extractContractInfo(base64Data);

        // 验证提取的合同信息
        console.log('[Contract OCR] 开始验证合同信息');
        const validationResult = ContractValidator.validateContractInfo(contractInfo);

        if (!validationResult.isValid) {
          console.warn('[Contract OCR] 合同信息验证失败:', validationResult.errors);
        }

        if (validationResult.warnings.length > 0) {
          console.warn('[Contract OCR] 合同信息验证警告:', validationResult.warnings);
        }

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

          // 如果请求创建新文档
          if (createNewDocument && accessToken && replacementRules.length > 0) {
            try {
              const newDocumentResult = await createDocumentWithReplacements(
                documentId,
                replacementRules,
                accessToken,
                contractInfo
              );

              return NextResponse.json({
                success: true,
                data: {
                  contractInfo,
                  replacementRules,
                  previewResult,
                  newDocument: newDocumentResult
                }
              });
            } catch (createError) {
              console.warn('Failed to create new document:', createError);
              // 创建新文档失败不影响主要功能，继续返回替换规则
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
            validation: {
              isValid: validationResult.isValid,
              errors: validationResult.errors,
              warnings: validationResult.warnings
            },
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              extractedFields: countExtractedFields(contractInfo),
              rulesGenerated: replacementRules.length,
              hasVehicleInfo: !!(contractInfo.vehicles && contractInfo.vehicles.length > 0),
              hasContactInfo: !!(contractInfo.parties.partyA?.contact || contractInfo.parties.partyB?.contact),
              hasPriceDetails: !!contractInfo.priceDetails
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

  console.log('[Smart Replace] 开始生成智能值替换规则');
  console.log('[Smart Replace] 原文档内容长度:', originalText.length);
  console.log('[Smart Replace] 合同信息:', JSON.stringify(contractInfo, null, 2));

  // 定义字段映射，包含更多的匹配模式
  const fieldMappings = [
    // 基本甲乙双方信息
    {
      key: '甲方公司',
      displayName: '甲方公司',
      ocrValue: contractInfo.parties.partyA?.companyName || contractInfo.parties.partyA,
      patterns: ['甲方', '第一方', '采购方', '委托方', '发包方', '买方', '发包人'],
      valueType: 'company'
    },
    {
      key: '乙方公司',
      displayName: '乙方公司',
      ocrValue: contractInfo.parties.partyB?.companyName || contractInfo.parties.partyB,
      patterns: ['乙方', '第二方', '供应方', '受托方', '承包方', '卖方', '承包人'],
      valueType: 'company'
    },

    // 联系人信息
    {
      key: '甲方联系人',
      displayName: '甲方联系人',
      ocrValue: contractInfo.parties.partyA?.contact?.name,
      patterns: ['甲方联系人', '甲方负责人', '联系人'],
      valueType: 'contact'
    },
    {
      key: '甲方电话',
      displayName: '甲方电话',
      ocrValue: contractInfo.parties.partyA?.contact?.phone,
      patterns: ['甲方电话', '甲方联系电话', '电话'],
      valueType: 'phone'
    },
    {
      key: '乙方联系人',
      displayName: '乙方联系人',
      ocrValue: contractInfo.parties.partyB?.contact?.name,
      patterns: ['乙方联系人', '乙方负责人', '联系人'],
      valueType: 'contact'
    },
    {
      key: '乙方电话',
      displayName: '乙方电话',
      ocrValue: contractInfo.parties.partyB?.contact?.phone,
      patterns: ['乙方电话', '乙方联系电话', '电话'],
      valueType: 'phone'
    },

    // 车辆信息
    {
      key: '车型',
      displayName: '车型',
      ocrValue: contractInfo.vehicles?.[0]?.model,
      patterns: ['车型', '车辆型号', '型号'],
      valueType: 'vehicle'
    },
    {
      key: '配置',
      displayName: '配置',
      ocrValue: contractInfo.vehicles?.[0]?.configuration,
      patterns: ['配置', '车辆配置', '规格'],
      valueType: 'vehicle'
    },
    {
      key: '颜色',
      displayName: '颜色',
      ocrValue: contractInfo.vehicles?.[0]?.color,
      patterns: ['颜色', '外观', '车身颜色'],
      valueType: 'vehicle'
    },
    {
      key: '数量',
      displayName: '数量',
      ocrValue: contractInfo.vehicles?.[0]?.quantity?.toString(),
      patterns: ['数量', '台数', '辆数'],
      valueType: 'number'
    },

    // 价格信息
    {
      key: '单价',
      displayName: '单价',
      ocrValue: contractInfo.priceDetails?.unitPrice || contractInfo.vehicles?.[0]?.unitPrice,
      patterns: ['单价', '单车价格', '每台价格'],
      valueType: 'amount'
    },
    {
      key: '总金额',
      displayName: '总金额',
      ocrValue: contractInfo.priceDetails?.totalAmount || contractInfo.amounts[0],
      patterns: ['总金额', '总价', '合同金额', '车款总计'],
      valueType: 'amount'
    },
    {
      key: '不含税价',
      displayName: '不含税价',
      ocrValue: contractInfo.priceDetails?.taxExclusivePrice,
      patterns: ['不含税价', '税前价格', '未税价'],
      valueType: 'amount'
    },
    {
      key: '税额',
      displayName: '税额',
      ocrValue: contractInfo.priceDetails?.taxAmount,
      patterns: ['税额', '税费', '增值税'],
      valueType: 'amount'
    },
    {
      key: '大写金额',
      displayName: '大写金额',
      ocrValue: contractInfo.priceDetails?.amountInWords,
      patterns: ['大写金额', '金额大写', '人民币大写'],
      valueType: 'text'
    },

    // 基本合同信息
    {
      key: '合同编号',
      displayName: '合同编号',
      ocrValue: contractInfo.contractNumber,
      patterns: ['合同编号', '协议编号', '编号'],
      valueType: 'text'
    },
    {
      key: '签署日期',
      displayName: '签署日期',
      ocrValue: contractInfo.signDate || contractInfo.dates[0],
      patterns: ['签署日期', '签订日期', '生效日期', '日期'],
      valueType: 'date'
    }
  ];

  fieldMappings.forEach(mapping => {
    if (mapping.ocrValue && typeof mapping.ocrValue === 'string' && mapping.ocrValue.trim()) {
      console.log(`[Smart Replace] 处理字段: ${mapping.key} (${mapping.displayName})`);

      // 提取OCR识别的纯净值
      const pureOcrValue = extractPureValue(mapping.ocrValue, mapping.key);
      console.log(`[Smart Replace] 提取的纯净值: "${pureOcrValue}"`);

      if (pureOcrValue) {
        // 在原文档中查找对应的值
        const originalValue = findValueInDocument(originalText, mapping.patterns, pureOcrValue, mapping.valueType);
        console.log(`[Smart Replace] 在原文档中找到的值: "${originalValue}"`);

        if (originalValue) {
          // 检查是否需要替换（即使值相同，也可能需要格式化或标准化）
          const needsReplacement = originalValue !== pureOcrValue ||
                                   shouldForceReplacement(originalValue, pureOcrValue, mapping.valueType);

          if (needsReplacement) {
            const rule = {
              id: `${mapping.key}_value_${generateRandomString(8)}`,
              searchText: originalValue,
              replaceText: pureOcrValue,
              fieldType: mapping.displayName, // 添加字段类型标注
              options: {
                caseSensitive: false,
                wholeWord: shouldUseWholeWord(originalValue, mapping.valueType), // 动态决定是否使用整词匹配
                enabled: true,
                priority: 0
              }
            };

            rules.push(rule);
            console.log(`[Smart Replace] 生成替换规则: ${mapping.displayName} - "${originalValue}" → "${pureOcrValue}"`);
          } else {
            console.log(`[Smart Replace] 跳过: ${mapping.displayName} 的值相同且无需格式化`);
          }
        } else {
          console.log(`[Smart Replace] 警告: 未在原文档中找到 ${mapping.displayName} 对应的值`);

          // 尝试直接使用OCR值进行替换（适用于新增字段）
          if (shouldCreateDirectRule(pureOcrValue, mapping.valueType)) {
            const rule = {
              id: `${mapping.key}_direct_${generateRandomString(8)}`,
              searchText: `${mapping.patterns[0]}：`, // 使用第一个模式作为搜索目标
              replaceText: `${mapping.patterns[0]}：${pureOcrValue}`,
              fieldType: mapping.displayName,
              options: {
                caseSensitive: false,
                wholeWord: false,
                enabled: true,
                priority: 1 // 较低优先级
              }
            };

            rules.push(rule);
            console.log(`[Smart Replace] 生成直接替换规则: ${mapping.displayName} - "${rule.searchText}" → "${rule.replaceText}"`);
          }
        }
      } else {
        console.log(`[Smart Replace] 警告: 无法从OCR结果中提取 ${mapping.displayName} 的纯净值`);
      }
    } else {
      console.log(`[Smart Replace] 跳过: ${mapping.displayName} 的OCR值为空`);
    }
  });

  // 特殊处理车架号（可能有多个）
  if (contractInfo.vehicles && contractInfo.vehicles.length > 0) {
    contractInfo.vehicles.forEach((vehicle, vehicleIndex) => {
      if (vehicle.vinNumbers && Array.isArray(vehicle.vinNumbers)) {
        vehicle.vinNumbers.forEach((vin, vinIndex) => {
          if (vin && vin.trim()) {
            console.log(`[Smart Replace] 处理车架号 ${vehicleIndex + 1}-${vinIndex + 1}: ${vin}`);

            // 查找原文档中的车架号
            const vinPatterns = ['车架号', 'VIN', '车辆识别代号', '底盘号'];
            const originalVin = findValueInDocument(originalText, vinPatterns, vin, 'vin');

            if (originalVin && originalVin !== vin) {
              const rule = {
                id: `车架号_${vehicleIndex}_${vinIndex}_${generateRandomString(8)}`,
                searchText: originalVin,
                replaceText: vin,
                fieldType: `车架号 ${vehicleIndex + 1}-${vinIndex + 1}`,
                options: {
                  caseSensitive: false,
                  wholeWord: true,
                  enabled: true,
                  priority: 0
                }
              };

              rules.push(rule);
              console.log(`[Smart Replace] 生成车架号替换规则: "${originalVin}" → "${vin}"`);
            }
          }
        });
      }
    });
  }

  console.log(`[Smart Replace] 共生成 ${rules.length} 条替换规则`);
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
      value: typeof contractInfo.parties.partyA === 'string' ? contractInfo.parties.partyA : contractInfo.parties.partyA?.companyName
    },
    {
      key: '乙方',
      searchPatterns: ['乙方：', '乙方:', '乙方 ', '第二方：', '第二方:'],
      value: typeof contractInfo.parties.partyB === 'string' ? contractInfo.parties.partyB : contractInfo.parties.partyB?.companyName
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
    if (mapping.value && typeof mapping.value === 'string' && mapping.value.trim()) {
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

  console.log(`[Value Extract] 开始提取字段 ${fieldKey} 的值: "${ocrValue}"`);

  // 定义更全面的标签前缀模式，支持各种格式变体
  const labelPatterns = [
    // 甲方相关
    /^甲方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^第一方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^采购方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^委托方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^发包方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^买方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,

    // 乙方相关
    /^乙方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^第二方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^供应方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^受托方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^承包方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,
    /^卖方[（(]?[^）)]*[）)]?[：:\s]*(.+)$/i,

    // 金额相关
    /^合同金额[：:\s]*(.+)$/i,
    /^总金额[：:\s]*(.+)$/i,
    /^合同总价[：:\s]*(.+)$/i,
    /^金额[：:\s]*(.+)$/i,
    /^价格[：:\s]*(.+)$/i,
    /^费用[：:\s]*(.+)$/i,
    /^总价[：:\s]*(.+)$/i,

    // 日期相关
    /^签署日期[：:\s]*(.+)$/i,
    /^签订日期[：:\s]*(.+)$/i,
    /^生效日期[：:\s]*(.+)$/i,
    /^日期[：:\s]*(.+)$/i,

    // 编号相关
    /^合同编号[：:\s]*(.+)$/i,
    /^协议编号[：:\s]*(.+)$/i,
    /^编号[：:\s]*(.+)$/i,

    // 联系信息
    /^联系人[：:\s]*(.+)$/i,
    /^负责人[：:\s]*(.+)$/i,
    /^联系电话[：:\s]*(.+)$/i,
    /^电话[：:\s]*(.+)$/i,
    /^手机[：:\s]*(.+)$/i,

    // 通用模式 - 任何标签后跟冒号或空格
    /^[^：:]*[：:\s]+(.+)$/
  ];

  // 尝试匹配并提取值
  for (const pattern of labelPatterns) {
    const match = ocrValue.match(pattern);
    if (match && match[1]) {
      let extractedValue = match[1].trim();

      // 进一步清理提取的值
      extractedValue = cleanExtractedValue(extractedValue);

      if (extractedValue && extractedValue.length > 0) {
        console.log(`[Value Extract] ${fieldKey}: 成功提取 "${ocrValue}" → "${extractedValue}"`);
        return extractedValue;
      }
    }
  }

  // 如果没有匹配到标签模式，尝试智能清理原值
  const cleanValue = cleanExtractedValue(ocrValue.trim());
  console.log(`[Value Extract] ${fieldKey}: 使用清理后的原值 "${cleanValue}"`);
  return cleanValue;
}

/**
 * 清理提取的值，去除多余的符号和空白
 */
function cleanExtractedValue(value: string): string {
  if (!value) return '';

  // 去除首尾空白
  let cleaned = value.trim();

  // 去除常见的尾部符号
  cleaned = cleaned.replace(/[，,。.；;！!？?]*$/, '');

  // 去除多余的空白字符
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 去除首尾的引号
  cleaned = cleaned.replace(/^["'「『]|["'」』]$/g, '');

  return cleaned.trim();
}

/**
 * 在原文档中查找对应的字段值
 */
function findValueInDocument(originalText: string, patterns: string[], ocrValue: string, valueType?: string): string | null {
  if (!originalText || !ocrValue) return null;

  console.log(`[Value Find] 开始在原文档中查找值，模式: [${patterns.join(', ')}], OCR值: "${ocrValue}", 类型: ${valueType}`);

  // 为每个模式创建更精确的正则表达式来查找值
  for (const pattern of patterns) {
    console.log(`[Value Find] 尝试模式: "${pattern}"`);

    // 创建多层次的匹配模式，从精确到宽松
    const regexPatterns = [
      // 精确匹配：模式 + 可选括号 + 冒号/空格 + 值
      new RegExp(`${escapeRegExp(pattern)}[（(]?[^）)]*[）)]?[：:\\s]*([^\\n\\r，,。.；;！!？?]+)`, 'gi'),
      // 中等匹配：包含模式的行中的值
      new RegExp(`[^\\n\\r]*${escapeRegExp(pattern)}[^\\n\\r]*[：:\\s]+([^\\n\\r，,。.；;！!？?]+)`, 'gi'),
      // 宽松匹配：模式附近的值
      new RegExp(`${escapeRegExp(pattern)}[^\\n\\r]{0,20}([^\\n\\r，,。.；;！!？?]{3,})`, 'gi')
    ];

    for (let i = 0; i < regexPatterns.length; i++) {
      const regex = regexPatterns[i];
      const matches = Array.from(originalText.matchAll(regex));

      console.log(`[Value Find] 模式 ${i + 1} 找到 ${matches.length} 个匹配`);

      for (const match of matches) {
        if (match[1]) {
          let foundValue = match[1].trim();
          foundValue = cleanExtractedValue(foundValue);

          console.log(`[Value Find] 候选值: "${foundValue}"`);

          // 验证找到的值是否合理
          if (isValidFieldValue(foundValue, ocrValue, valueType)) {
            console.log(`[Value Find] ✅ 在原文档中找到 "${pattern}" 对应的值: "${foundValue}"`);
            return foundValue;
          } else {
            console.log(`[Value Find] ❌ 候选值不符合要求: "${foundValue}"`);
          }
        }
      }
    }
  }

  console.log(`[Value Find] 精确匹配失败，尝试模糊匹配`);
  // 如果没有找到，尝试模糊匹配
  return findValueByFuzzyMatch(originalText, ocrValue, valueType);
}

/**
 * 验证找到的字段值是否合理
 */
function isValidFieldValue(foundValue: string, ocrValue: string, valueType?: string): boolean {
  if (!foundValue || foundValue.length < 2) return false;

  // 基本过滤条件
  // 注意：不再过滤相同值，因为可能需要格式化或标准化
  if (foundValue.includes('：') || foundValue.includes(':')) return false; // 包含标签符号
  if (foundValue.length > 200) return false; // 过长的文本

  // 根据值类型进行特定验证
  switch (valueType) {
    case 'company':
      // 公司名称验证
      return foundValue.length >= 3 &&
             foundValue.length <= 100 &&
             !/^[0-9\s]+$/.test(foundValue) && // 不能只是数字
             !foundValue.includes('年') && // 不包含日期标识
             !foundValue.includes('月') &&
             !foundValue.includes('日');

    case 'amount':
      // 金额验证
      return foundValue.length >= 1 &&
             foundValue.length <= 50 &&
             (/[0-9]/.test(foundValue) || // 包含数字
              foundValue.includes('万') ||
              foundValue.includes('元') ||
              foundValue.includes('¥') ||
              foundValue.includes('$'));

    case 'date':
      // 日期验证
      return foundValue.length >= 4 &&
             foundValue.length <= 30 &&
             (/[0-9]/.test(foundValue) && // 包含数字
              (foundValue.includes('年') ||
               foundValue.includes('月') ||
               foundValue.includes('日') ||
               foundValue.includes('-') ||
               foundValue.includes('/') ||
               foundValue.includes('.')));

    default:
      // 通用验证
      return foundValue.length >= 2 && foundValue.length <= 100;
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 使用模糊匹配在文档中查找相似的值
 */
function findValueByFuzzyMatch(originalText: string, ocrValue: string, valueType?: string): string | null {
  if (!originalText || !ocrValue || ocrValue.length < 3) return null;

  console.log(`[Fuzzy Match] 开始模糊匹配，OCR值: "${ocrValue}", 类型: ${valueType}`);

  // 根据值类型定义不同的匹配模式
  let valuePatterns: RegExp[] = [];

  switch (valueType) {
    case 'company':
      valuePatterns = [
        // 公司名称模式 - 更全面的匹配
        /([^\s\n\r，,。.；;]{3,}(?:公司|企业|集团|有限责任公司|股份有限公司|合作社|工厂|店|中心|机构|厂|所|院|部|局|委|会))/g,
        // 包含地名的公司
        /([^\s\n\r，,。.；;]{2,}(?:市|省|县|区|镇|村)[^\s\n\r，,。.；;]{2,}(?:公司|企业|集团))/g,
        // 简单的组织名称
        /([^\s\n\r，,。.；;]{4,20})/g
      ];
      break;

    case 'amount':
      valuePatterns = [
        // 金额模式 - 各种格式
        /([\d,]+(?:\.\d{1,2})?(?:元|万元|千元|亿元|¥|￥|\$|USD|RMB))/g,
        // 中文数字金额
        /([一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億]+(?:元|万|千|百))/g,
        // 纯数字
        /([\d,]+(?:\.\d{1,2})?)/g
      ];
      break;

    case 'date':
      valuePatterns = [
        // 日期模式 - 各种格式
        /(\d{4}[年\-\/\.]\d{1,2}[月\-\/\.]\d{1,2}[日]?)/g,
        /(\d{1,2}[月\-\/\.]\d{1,2}[日\-\/\.]\d{4}[年]?)/g,
        /(\d{4}\-\d{1,2}\-\d{1,2})/g,
        /(\d{1,2}\/\d{1,2}\/\d{4})/g
      ];
      break;

    default:
      // 通用模式
      valuePatterns = [
        /([^\s\n\r，,。.；;]{3,50})/g
      ];
  }

  const candidates: Array<{value: string, similarity: number}> = [];

  for (const pattern of valuePatterns) {
    const matches = Array.from(originalText.matchAll(pattern));

    for (const match of matches) {
      let foundValue = match[1].trim();
      foundValue = cleanExtractedValue(foundValue);

      if (foundValue && foundValue.length >= 2) {
        // 计算相似度
        const similarity = calculateSimilarity(foundValue, ocrValue);

        // 如果相似度较高但不完全相同，认为是候选
        if (similarity > 0.2 && similarity < 1.0 && foundValue !== ocrValue) {
          candidates.push({ value: foundValue, similarity });
        }
      }
    }
  }

  // 按相似度排序，选择最佳候选
  candidates.sort((a, b) => b.similarity - a.similarity);

  if (candidates.length > 0) {
    const bestCandidate = candidates[0];

    // 进一步验证最佳候选
    if (isValidFieldValue(bestCandidate.value, ocrValue, valueType)) {
      console.log(`[Fuzzy Match] ✅ 找到最佳相似值: "${bestCandidate.value}" (相似度: ${bestCandidate.similarity.toFixed(2)})`);
      return bestCandidate.value;
    }
  }

  console.log(`[Fuzzy Match] ❌ 未找到合适的相似值`);
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
 * 创建新文档并应用替换规则
 */
async function createDocumentWithReplacements(
  originalDocumentId: string,
  replacementRules: ReplaceRule[],
  accessToken: string,
  contractInfo: ContractInfo
): Promise<any> {
  try {
    console.log('[Create Document] 开始创建新文档并应用替换规则');

    const { documentService } = await import('@/lib/document-service');
    const { feishuClient } = await import('@/lib/feishu');

    // 1. 获取原文档内容
    const originalContent = await documentService.getDocumentContent(originalDocumentId, accessToken);
    const originalText = documentService.extractAllText(originalContent.blocks);

    console.log('[Create Document] 原文档内容长度:', originalText.length);

    // 2. 应用替换规则到文本
    let updatedText = originalText;
    const appliedRules: Array<{rule: ReplaceRule, success: boolean}> = [];

    for (const rule of replacementRules) {
      try {
        const beforeLength = updatedText.length;
        const regex = new RegExp(escapeRegExp(rule.searchText), rule.options?.caseSensitive ? 'g' : 'gi');
        const matches = updatedText.match(regex);

        if (matches && matches.length > 0) {
          updatedText = updatedText.replace(regex, rule.replaceText);
          appliedRules.push({ rule, success: true });
          console.log(`[Create Document] ✅ 应用规则: ${rule.fieldType || rule.id} - "${rule.searchText}" → "${rule.replaceText}"`);
        } else {
          appliedRules.push({ rule, success: false });
          console.log(`[Create Document] ❌ 规则未匹配: ${rule.fieldType || rule.id} - "${rule.searchText}"`);
        }
      } catch (error) {
        appliedRules.push({ rule, success: false });
        console.error(`[Create Document] 规则应用失败: ${rule.id}`, error);
      }
    }

    // 3. 生成更新摘要
    const timestamp = new Date().toLocaleString('zh-CN');
    const summary = generateReplacementSummary(appliedRules, contractInfo);

    // 4. 返回更新后的内容和摘要（暂时不创建新文档，直接返回内容）
    console.log('[Create Document] 文本替换完成，返回更新内容');

    console.log('[Create Document] 文本替换完成');

    return {
      originalDocumentId: originalDocumentId,
      updatedText: updatedText,
      appliedRules: appliedRules.filter(r => r.success).length,
      totalRules: replacementRules.length,
      summary: summary,
      timestamp: timestamp
    };

  } catch (error) {
    console.error('[Create Document] 创建文档失败:', error);
    throw new Error(`创建新文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}



/**
 * 生成替换摘要
 */
function generateReplacementSummary(
  appliedRules: Array<{rule: ReplaceRule, success: boolean}>,
  contractInfo: ContractInfo
): string {
  const successfulRules = appliedRules.filter(r => r.success);
  const summary: string[] = [];

  summary.push(`成功应用 ${successfulRules.length} 条替换规则:`);

  successfulRules.forEach(({ rule }) => {
    const fieldType = rule.fieldType || '未知字段';
    summary.push(`• ${fieldType}: "${rule.searchText}" → "${rule.replaceText}"`);
  });

  if (appliedRules.length > successfulRules.length) {
    const failedCount = appliedRules.length - successfulRules.length;
    summary.push(`\n注意: ${failedCount} 条规则未能成功应用`);
  }

  return summary.join('\n');
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
 * 判断是否应该强制替换（即使值相同）
 */
function shouldForceReplacement(originalValue: string, ocrValue: string, valueType?: string): boolean {
  // 检查格式差异
  if (originalValue.trim() !== ocrValue.trim()) return true;

  // 检查特殊字符差异
  const cleanOriginal = originalValue.replace(/[\s\-\(\)]/g, '');
  const cleanOcr = ocrValue.replace(/[\s\-\(\)]/g, '');
  if (cleanOriginal !== cleanOcr) return true;

  // 根据字段类型检查特定格式要求
  switch (valueType) {
    case 'phone':
      // 电话号码标准化
      return normalizePhone(originalValue) !== normalizePhone(ocrValue);
    case 'amount':
      // 金额格式标准化
      return normalizeAmount(originalValue) !== normalizeAmount(ocrValue);
    default:
      return false;
  }
}

/**
 * 判断是否应该使用整词匹配
 */
function shouldUseWholeWord(searchText: string, valueType?: string): boolean {
  // 对于包含中文的文本，整词匹配可能不适用
  if (/[\u4e00-\u9fff]/.test(searchText)) {
    return false;
  }

  // 对于短文本或特殊字符，不使用整词匹配
  if (searchText.length < 3 || /[^\w\s]/.test(searchText)) {
    return false;
  }

  // 根据字段类型决定
  switch (valueType) {
    case 'company':
    case 'contact':
      return false; // 公司名称和联系人可能包含特殊格式
    case 'phone':
    case 'amount':
      return true; // 电话和金额适合整词匹配
    default:
      return false;
  }
}

/**
 * 判断是否应该创建直接替换规则
 */
function shouldCreateDirectRule(ocrValue: string, valueType?: string): boolean {
  if (!ocrValue || ocrValue.length < 2) return false;

  // 只为重要字段创建直接规则
  switch (valueType) {
    case 'company':
    case 'contact':
    case 'phone':
    case 'amount':
      return true;
    default:
      return false;
  }
}

/**
 * 标准化电话号码
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * 标准化金额
 */
function normalizeAmount(amount: string): string {
  return amount.replace(/[,\s]/g, '').replace(/[¥￥\$]/g, '');
}

/**
 * 计算提取的字段数量
 */
function countExtractedFields(contractInfo: ContractInfo): number {
  let count = 0;

  // 基本信息
  if (contractInfo.contractNumber) count++;
  if (contractInfo.signDate) count++;

  // 甲方信息
  if (contractInfo.parties.partyA?.companyName) count++;
  if (contractInfo.parties.partyA?.contact?.name) count++;
  if (contractInfo.parties.partyA?.contact?.phone) count++;

  // 乙方信息
  if (contractInfo.parties.partyB?.companyName) count++;
  if (contractInfo.parties.partyB?.contact?.name) count++;
  if (contractInfo.parties.partyB?.contact?.phone) count++;

  // 车辆信息
  if (contractInfo.vehicles && contractInfo.vehicles.length > 0) {
    contractInfo.vehicles.forEach(vehicle => {
      if (vehicle.model) count++;
      if (vehicle.configuration) count++;
      if (vehicle.color) count++;
      if (vehicle.quantity) count++;
      if (vehicle.vinNumbers && vehicle.vinNumbers.length > 0) count += vehicle.vinNumbers.length;
    });
  }

  // 价格信息
  if (contractInfo.priceDetails?.totalAmount) count++;
  if (contractInfo.priceDetails?.unitPrice) count++;
  if (contractInfo.priceDetails?.taxAmount) count++;
  if (contractInfo.priceDetails?.amountInWords) count++;

  return count;
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
    const extractedFields = countExtractedFields(contractInfo);
    console.log(`Contract extraction for user ${userId}: ${extractedFields} fields extracted from ${fileSize} bytes`);
  } catch (error) {
    console.error('Error recording contract extraction usage:', error);
  }
}
