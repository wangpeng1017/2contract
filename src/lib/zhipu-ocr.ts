/**
 * 智谱AI GLM-4.5V OCR服务
 * 基于智谱AI官方文档实现：https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v
 */

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  metadata?: {
    imageSize?: string;
    format?: string;
    model: string;
    provider: string;
  };
  error?: string;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
}

export interface PartyInfo {
  companyName?: string;
  contact?: ContactInfo;
  legalRepresentative?: string;
  businessLicense?: string;
}

export interface VehicleInfo {
  model?: string;
  configuration?: string;
  color?: string;
  quantity?: number;
  unitPrice?: string;
  totalPrice?: string;
  vinNumbers?: string[];
}

export interface PriceDetails {
  unitPrice?: string;
  totalAmount?: string;
  taxExclusivePrice?: string;
  taxAmount?: string;
  finalTotal?: string;
  amountInWords?: string;
  currency?: string;
}

export interface ContractInfo {
  // 基本合同信息
  contractNumber?: string;
  contractType?: string;
  signDate?: string;
  effectiveDate?: string;
  expiryDate?: string;

  // 甲乙双方信息
  parties: {
    partyA?: PartyInfo;
    partyB?: PartyInfo;
  };

  // 车辆信息（支持多辆车）
  vehicles?: VehicleInfo[];

  // 价格详情
  priceDetails?: PriceDetails;

  // 兼容旧版本的字段
  amounts: string[];
  dates: string[];
  keyTerms: string[];
  fullText: string;
}

export interface ContractOCRResult {
  success: boolean;
  contractInfo: ContractInfo;
  confidence: number;
  processingTime: number;
  metadata?: {
    imageSize?: string;
    format?: string;
    model: string;
    provider: string;
  };
  error?: string;
}

/**
 * 智谱AI GLM-4.5V OCR服务类
 */
export class ZhipuOCRService {
  private apiKey: string;
  private baseUrl: string = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private model: string = 'glm-4.5v';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZHIPU_API_KEY || '';
    
    // 注意：不在构造函数中抛出错误，而是在实际调用时检查
    // 这样可以避免在构建时因为缺少 API 密钥而失败
  }

  /**
   * 检查 API 密钥是否已配置
   */
  private checkApiKey(): void {
    if (!this.apiKey) {
      throw new Error('智谱AI API密钥未配置');
    }
  }

  /**
   * 通用OCR文字识别
   */
  async extractText(imageData: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // 检查 API 密钥
      this.checkApiKey();
      
      console.log('[ZhipuOCR] 开始文字识别');
      
      // 验证输入
      if (!imageData) {
        throw new Error('图片数据不能为空');
      }

      // 构建请求
      const response = await this.callZhipuAPI(
        '请仔细识别图片中的所有文字内容，按照原始布局和格式输出。如果是表格，请保持表格结构。',
        imageData,
        mimeType
      );

      const text = this.extractTextFromResponse(response);
      const confidence = this.calculateConfidence(response, text);
      const processingTime = Date.now() - startTime;

      console.log(`[ZhipuOCR] 文字识别完成，耗时: ${processingTime}ms`);

      return {
        success: true,
        text,
        confidence,
        processingTime,
        metadata: {
          model: this.model,
          provider: 'zhipu',
          format: mimeType
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      console.error('[ZhipuOCR] 文字识别失败:', errorMessage);

      return {
        success: false,
        text: '',
        confidence: 0,
        processingTime,
        error: errorMessage,
        metadata: {
          model: this.model,
          provider: 'zhipu'
        }
      };
    }
  }

  /**
   * 合同OCR识别
   */
  async extractContract(imageData: string, mimeType: string = 'image/jpeg'): Promise<ContractOCRResult> {
    const startTime = Date.now();
    
    try {
      // 检查 API 密钥
      this.checkApiKey();
      
      console.log('[ZhipuOCR] 开始合同识别');
      
      // 验证输入
      if (!imageData) {
        throw new Error('图片数据不能为空');
      }

      // 构建合同识别的专用提示词
      const prompt = `请仔细分析这份合同图片，提取详细的合同信息并以JSON格式返回。请特别注意表格结构和详细信息的提取。

返回格式：
{
  "contractNumber": "合同编号",
  "contractType": "合同类型",
  "signDate": "签署日期",
  "effectiveDate": "生效日期",
  "parties": {
    "partyA": {
      "companyName": "甲方公司完整名称",
      "contact": {
        "name": "联系人姓名",
        "phone": "联系电话",
        "email": "邮箱地址",
        "address": "地址",
        "postalCode": "邮编"
      }
    },
    "partyB": {
      "companyName": "乙方公司完整名称",
      "contact": {
        "name": "联系人姓名",
        "phone": "联系电话",
        "email": "邮箱地址",
        "address": "地址",
        "postalCode": "邮编"
      }
    }
  },
  "vehicles": [
    {
      "model": "车型",
      "configuration": "配置",
      "color": "颜色",
      "quantity": 数量,
      "unitPrice": "单价",
      "totalPrice": "总价",
      "vinNumbers": ["车架号1", "车架号2"]
    }
  ],
  "priceDetails": {
    "unitPrice": "单价",
    "totalAmount": "总金额",
    "taxExclusivePrice": "不含税价",
    "taxAmount": "税额",
    "finalTotal": "最终总计",
    "amountInWords": "大写金额",
    "currency": "货币单位"
  },
  "amounts": ["主要金额"],
  "dates": ["主要日期"],
  "keyTerms": ["重要条款"],
  "fullText": "完整的合同文本内容"
}

识别要求：
1. 准确识别甲乙双方的完整公司名称和联系信息
2. 提取表格中的车辆信息，包括车型、配置、颜色、数量等
3. 识别价格详情，包括单价、总价、税额、不含税价等
4. 提取车架号列表（可能有多个）
5. 识别联系人姓名、电话、邮编等详细信息
6. 确保数字格式的准确性（金额、数量、电话号码等）
7. 如果某些信息不存在或不清楚，请返回null
8. 特别注意表格结构的识别和数据提取`;

      const response = await this.callZhipuAPI(prompt, imageData, mimeType);
      const contractInfo = this.parseContractResponse(response);
      const confidence = this.calculateContractConfidence(response, contractInfo);
      const processingTime = Date.now() - startTime;

      console.log(`[ZhipuOCR] 合同识别完成，耗时: ${processingTime}ms`);

      return {
        success: true,
        contractInfo,
        confidence,
        processingTime,
        metadata: {
          model: this.model,
          provider: 'zhipu',
          format: mimeType
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      console.error('[ZhipuOCR] 合同识别失败:', errorMessage);

      return {
        success: false,
        contractInfo: {
          parties: {},
          amounts: [],
          dates: [],
          keyTerms: [],
          fullText: ''
        },
        confidence: 0,
        processingTime,
        error: errorMessage,
        metadata: {
          model: this.model,
          provider: 'zhipu'
        }
      };
    }
  }

  /**
   * 调用智谱AI API
   */
  private async callZhipuAPI(prompt: string, imageData: string, mimeType: string): Promise<any> {
    // 确保图片数据格式正确
    const base64Data = imageData.startsWith('data:') 
      ? imageData.split(',')[1] 
      : imageData;

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      stream: false
    };

    console.log('[ZhipuOCR] 发送API请求');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ZhipuOCR] API请求失败:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(`智谱AI API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[ZhipuOCR] API响应成功');

    return data;
  }

  /**
   * 从响应中提取文本
   */
  private extractTextFromResponse(response: any): string {
    try {
      if (!response.choices || response.choices.length === 0) {
        throw new Error('API响应中没有choices');
      }

      const choice = response.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('API响应格式无效');
      }

      return choice.message.content.trim();
    } catch (error) {
      console.error('[ZhipuOCR] 提取文本失败:', error);
      throw new Error('无法从API响应中提取文本');
    }
  }

  /**
   * 解析合同响应 - 确保返回单一最佳结果
   */
  private parseContractResponse(response: any): ContractInfo {
    try {
      const text = this.extractTextFromResponse(response);

      // 尝试解析JSON格式的响应
      let contractData;
      try {
        // 查找JSON部分
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          contractData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('未找到JSON格式数据');
        }
      } catch (parseError) {
        console.log('[ZhipuOCR] JSON解析失败，使用文本解析');
        // 如果JSON解析失败，使用文本解析
        contractData = this.parseContractFromText(text);
      }

      // 确保返回的数据是单一最佳结果
      const optimizedData = this.optimizeContractData(contractData);

      return {
        // 基本合同信息
        contractNumber: optimizedData.contractNumber || undefined,
        contractType: optimizedData.contractType || undefined,
        signDate: optimizedData.signDate || undefined,
        effectiveDate: optimizedData.effectiveDate || undefined,
        expiryDate: optimizedData.expiryDate || undefined,

        // 甲乙双方信息
        parties: {
          partyA: optimizedData.parties?.partyA ? {
            companyName: optimizedData.parties.partyA.companyName || optimizedData.parties.partyA,
            contact: optimizedData.parties.partyA.contact || {},
            legalRepresentative: optimizedData.parties.partyA.legalRepresentative || undefined,
            businessLicense: optimizedData.parties.partyA.businessLicense || undefined
          } : {},
          partyB: optimizedData.parties?.partyB ? {
            companyName: optimizedData.parties.partyB.companyName || optimizedData.parties.partyB,
            contact: optimizedData.parties.partyB.contact || {},
            legalRepresentative: optimizedData.parties.partyB.legalRepresentative || undefined,
            businessLicense: optimizedData.parties.partyB.businessLicense || undefined
          } : {}
        },

        // 车辆信息
        vehicles: Array.isArray(optimizedData.vehicles) ? optimizedData.vehicles : [],

        // 价格详情
        priceDetails: optimizedData.priceDetails || {},

        // 兼容旧版本的字段
        amounts: Array.isArray(optimizedData.amounts) ? optimizedData.amounts.slice(0, 3) : [],
        dates: Array.isArray(optimizedData.dates) ? optimizedData.dates.slice(0, 3) : [],
        keyTerms: Array.isArray(optimizedData.keyTerms) ? optimizedData.keyTerms.slice(0, 5) : [],
        fullText: optimizedData.fullText || text
      };

    } catch (error) {
      console.error('[ZhipuOCR] 解析合同响应失败:', error);
      const text = this.extractTextFromResponse(response);
      return {
        contractNumber: undefined,
        contractType: undefined,
        signDate: undefined,
        effectiveDate: undefined,
        expiryDate: undefined,
        parties: {
          partyA: {},
          partyB: {}
        },
        vehicles: [],
        priceDetails: {},
        amounts: [],
        dates: [],
        keyTerms: [],
        fullText: text
      };
    }
  }

  /**
   * 优化合同数据，确保返回最佳的单一结果
   */
  private optimizeContractData(contractData: any): any {
    try {
      console.log('[ZhipuOCR] 开始优化合同数据:', JSON.stringify(contractData, null, 2));

      const optimized = { ...contractData };

      // 优化甲方乙方信息
      if (optimized.parties) {
        console.log('[ZhipuOCR] 优化当事方信息:', optimized.parties);

        // 确保甲方乙方信息的唯一性和准确性
        if (optimized.parties.partyA && Array.isArray(optimized.parties.partyA)) {
          optimized.parties.partyA = this.selectBestPartyName(optimized.parties.partyA);
        }
        if (optimized.parties.partyB && Array.isArray(optimized.parties.partyB)) {
          optimized.parties.partyB = this.selectBestPartyName(optimized.parties.partyB);
        }
      }

      // 优化金额信息 - 选择最重要的金额
      if (optimized.amounts && Array.isArray(optimized.amounts)) {
        console.log('[ZhipuOCR] 优化金额信息:', optimized.amounts);
        optimized.amounts = this.selectBestAmounts(optimized.amounts);
      }

      // 优化日期信息 - 选择最重要的日期
      if (optimized.dates && Array.isArray(optimized.dates)) {
        console.log('[ZhipuOCR] 优化日期信息:', optimized.dates);
        optimized.dates = this.selectBestDates(optimized.dates);
      }

      // 优化关键条款 - 选择最重要的条款
      if (optimized.keyTerms && Array.isArray(optimized.keyTerms)) {
        console.log('[ZhipuOCR] 优化关键条款:', optimized.keyTerms);
        optimized.keyTerms = this.selectBestKeyTerms(optimized.keyTerms);
      }

      console.log('[ZhipuOCR] 合同数据优化完成:', JSON.stringify(optimized, null, 2));
      return optimized;

    } catch (error) {
      console.error('[ZhipuOCR] 优化合同数据失败:', error);
      console.error('[ZhipuOCR] 原始数据:', JSON.stringify(contractData, null, 2));

      // 返回原始数据，避免完全失败
      return contractData;
    }
  }

  /**
   * 选择最佳的当事方名称
   */
  private selectBestPartyName(names: any[]): string {
    if (!names || names.length === 0) return '';

    // 过滤并转换为字符串
    const validNames = names
      .filter(name => name && typeof name === 'string' && name.trim().length > 0)
      .map(name => String(name).trim());

    if (validNames.length === 0) return '';
    if (validNames.length === 1) return validNames[0];

    // 选择最长且最完整的名称
    return validNames.sort((a, b) => b.length - a.length)[0];
  }

  /**
   * 选择最佳的金额信息
   */
  private selectBestAmounts(amounts: any[]): string[] {
    if (!amounts || amounts.length === 0) return [];

    // 过滤和排序金额，优先选择包含"合同"、"总"等关键词的金额
    const filteredAmounts = amounts
      .filter(amount => amount && typeof amount === 'string' && amount.trim().length > 0)
      .map(amount => String(amount)) // 确保是字符串类型
      .sort((a, b) => {
        // 优先级评分
        let scoreA = 0, scoreB = 0;

        if (a.includes('合同') || a.includes('总')) scoreA += 10;
        if (b.includes('合同') || b.includes('总')) scoreB += 10;

        if (a.includes('¥') || a.includes('元')) scoreA += 5;
        if (b.includes('¥') || b.includes('元')) scoreB += 5;

        return scoreB - scoreA;
      });

    return filteredAmounts.slice(0, 1); // 只返回最佳的一个金额
  }

  /**
   * 选择最佳的日期信息
   */
  private selectBestDates(dates: any[]): string[] {
    if (!dates || dates.length === 0) return [];

    // 过滤和排序日期，优先选择签署日期
    const filteredDates = dates
      .filter(date => date && typeof date === 'string' && date.trim().length > 0)
      .map(date => String(date)) // 确保是字符串类型
      .sort((a, b) => {
        // 优先级评分
        let scoreA = 0, scoreB = 0;

        if (a.includes('签署') || a.includes('签订')) scoreA += 10;
        if (b.includes('签署') || b.includes('签订')) scoreB += 10;

        if (a.includes('生效')) scoreA += 5;
        if (b.includes('生效')) scoreB += 5;

        return scoreB - scoreA;
      });

    return filteredDates.slice(0, 1); // 只返回最佳的一个日期
  }

  /**
   * 选择最佳的关键条款
   */
  private selectBestKeyTerms(keyTerms: any[]): string[] {
    if (!keyTerms || keyTerms.length === 0) return [];

    // 过滤和排序关键条款，优先选择重要的条款
    const filteredTerms = keyTerms
      .filter(term => term && typeof term === 'string' && term.trim().length > 0)
      .map(term => String(term)) // 确保是字符串类型
      .filter(term => term.length > 5) // 过滤过短的条款
      .sort((a, b) => {
        // 优先级评分
        let scoreA = 0, scoreB = 0;

        // 重要关键词加分
        const importantKeywords = ['责任', '义务', '权利', '违约', '赔偿', '期限', '条件'];
        importantKeywords.forEach(keyword => {
          if (a.includes(keyword)) scoreA += 5;
          if (b.includes(keyword)) scoreB += 5;
        });

        // 长度适中的条款优先
        if (a.length > 10 && a.length < 100) scoreA += 3;
        if (b.length > 10 && b.length < 100) scoreB += 3;

        return scoreB - scoreA;
      });

    return filteredTerms.slice(0, 3); // 最多返回3个最重要的条款
  }

  /**
   * 从文本中解析合同信息（备用方法）
   */
  private parseContractFromText(text: string): any {
    const result: any = {
      parties: {},
      amounts: [],
      dates: [],
      keyTerms: [],
      fullText: text
    };

    // 简单的文本解析逻辑
    const lines = text.split('\n');
    
    for (const line of lines) {
      // 查找甲方乙方
      if (line.includes('甲方') && !result.parties.partyA) {
        const match = line.match(/甲方[：:]\s*(.+?)(?:\s|$|乙方)/);
        if (match) result.parties.partyA = match[1].trim();
      }
      
      if (line.includes('乙方') && !result.parties.partyB) {
        const match = line.match(/乙方[：:]\s*(.+?)(?:\s|$)/);
        if (match) result.parties.partyB = match[1].trim();
      }

      // 查找金额
      const amountMatches = line.match(/[¥￥$]\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*元/g);
      if (amountMatches) {
        result.amounts.push(...amountMatches);
      }

      // 查找日期
      const dateMatches = line.match(/\d{4}[年-]\d{1,2}[月-]\d{1,2}[日]?/g);
      if (dateMatches) {
        result.dates.push(...dateMatches);
      }
    }

    return result;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(response: any, text: string): number {
    try {
      let confidence = 0.7; // 基础置信度

      // 检查响应完整性
      if (response.choices && response.choices[0] && response.choices[0].finish_reason === 'stop') {
        confidence += 0.2;
      }

      // 检查文本质量
      if (text.length > 50) {
        confidence += 0.05;
      }
      if (text.length > 200) {
        confidence += 0.05;
      }

      // 检查中文内容
      const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (chineseCharCount > 10) {
        confidence += 0.05;
      }

      return Math.min(0.95, Math.max(0.1, confidence));
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * 计算合同识别置信度
   */
  private calculateContractConfidence(response: any, contractInfo: ContractInfo): number {
    let confidence = this.calculateConfidence(response, contractInfo.fullText);

    // 根据提取的信息质量调整置信度
    if (contractInfo.parties.partyA || contractInfo.parties.partyB) {
      confidence += 0.1;
    }
    if (contractInfo.amounts.length > 0) {
      confidence += 0.05;
    }
    if (contractInfo.dates.length > 0) {
      confidence += 0.05;
    }

    return Math.min(0.95, Math.max(0.1, confidence));
  }
}

/**
 * 创建 ZhipuOCR 服务实例
 */
export function createZhipuOCRService(apiKey?: string): ZhipuOCRService {
  return new ZhipuOCRService(apiKey);
}

/**
 * 默认 ZhipuOCR 服务实例（延迟初始化）
 * 使用 Proxy 模式避免在构建时因缺少 API 密钥而失败
 */
let _zhipuOCR: ZhipuOCRService | null = null;

export const zhipuOCR = new Proxy({} as ZhipuOCRService, {
  get(target, prop) {
    if (!_zhipuOCR) {
      _zhipuOCR = createZhipuOCRService();
    }
    return (_zhipuOCR as any)[prop];
  }
});
