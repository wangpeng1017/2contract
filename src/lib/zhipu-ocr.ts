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

export interface ContractInfo {
  parties: {
    partyA?: string;
    partyB?: string;
  };
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
      console.log('[ZhipuOCR] 开始合同识别');
      
      // 验证输入
      if (!imageData) {
        throw new Error('图片数据不能为空');
      }

      // 构建合同识别的专用提示词
      const prompt = `请仔细分析这份合同图片，提取以下关键信息并以JSON格式返回：

{
  "parties": {
    "partyA": "甲方名称",
    "partyB": "乙方名称"
  },
  "amounts": ["金额1", "金额2"],
  "dates": ["日期1", "日期2"],
  "keyTerms": ["关键条款1", "关键条款2"],
  "fullText": "完整的合同文本内容"
}

要求：
1. 准确识别甲方、乙方信息
2. 提取所有涉及的金额数字
3. 识别重要日期（签署日期、生效日期等）
4. 提取关键条款和重要条件
5. 保持原始文本的完整性和格式`;

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
   * 解析合同响应
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

      return {
        parties: contractData.parties || {},
        amounts: Array.isArray(contractData.amounts) ? contractData.amounts : [],
        dates: Array.isArray(contractData.dates) ? contractData.dates : [],
        keyTerms: Array.isArray(contractData.keyTerms) ? contractData.keyTerms : [],
        fullText: contractData.fullText || text
      };

    } catch (error) {
      console.error('[ZhipuOCR] 解析合同响应失败:', error);
      const text = this.extractTextFromResponse(response);
      return {
        parties: {},
        amounts: [],
        dates: [],
        keyTerms: [],
        fullText: text
      };
    }
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

// 导出默认实例
export const zhipuOCR = new ZhipuOCRService();
