/**
 * Google Gemini Vision API OCR服务
 */

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  structuredData?: any;
}

export interface ContractInfo {
  甲方?: string;
  乙方?: string;
  合同金额?: string;
  合同编号?: string;
  签署日期?: string;
  生效日期?: string;
  到期日期?: string;
  联系人?: string;
  联系电话?: string;
  其他信息?: Record<string, any>;
}

export interface OCROptions {
  extractStructured?: boolean;
  language?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Gemini OCR服务类
 */
export class GeminiOCRService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxRetries: number;
  private timeout: number;

  constructor(apiKey?: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.maxRetries = 3;
    this.timeout = 30000;

    if (!this.apiKey) {
      console.error('❌ Google API Key未配置。请检查环境变量GOOGLE_API_KEY');
      throw new Error('Google API Key is required for Gemini OCR service. Please check GOOGLE_API_KEY environment variable.');
    }

    // 验证API密钥格式
    const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    if (!apiKeyPattern.test(this.apiKey)) {
      console.error('❌ Google API Key格式不正确');
      throw new Error('Invalid Google API Key format. Please check your GOOGLE_API_KEY.');
    }

    console.log('✅ Gemini OCR服务初始化成功');
  }

  /**
   * 基础文字识别
   */
  async extractText(imageData: string | File, options: OCROptions = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const base64Data = await this.prepareImageData(imageData);
      
      const prompt = this.buildTextExtractionPrompt(options.language);
      
      const response = await this.callGeminiAPI(prompt, base64Data, options);
      
      const text = this.extractTextFromResponse(response);
      
      return {
        text,
        confidence: this.calculateConfidence(response),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Gemini OCR text extraction error:', error);
      throw new Error(`OCR文字识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 智能结构化信息提取
   */
  async extractStructuredData(imageData: string | File, options: OCROptions = {}): Promise<OCRResult & { structuredData: ContractInfo }> {
    const startTime = Date.now();
    
    try {
      const base64Data = await this.prepareImageData(imageData);
      
      const prompt = this.buildStructuredExtractionPrompt();
      
      const response = await this.callGeminiAPI(prompt, base64Data, options);
      
      const text = this.extractTextFromResponse(response);
      const structuredData = this.parseStructuredData(response);
      
      return {
        text,
        confidence: this.calculateConfidence(response),
        processingTime: Date.now() - startTime,
        structuredData
      };
    } catch (error) {
      console.error('Gemini OCR structured extraction error:', error);
      throw new Error(`OCR结构化提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 智能合同信息提取
   */
  async extractContractInfo(imageData: string | File, options: OCROptions = {}): Promise<ContractInfo> {
    try {
      const result = await this.extractStructuredData(imageData, options);
      return result.structuredData;
    } catch (error) {
      console.error('Contract info extraction error:', error);
      throw error;
    }
  }

  /**
   * 批量OCR处理
   */
  async batchExtract(images: (string | File)[], options: OCROptions = {}): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const image of images) {
      try {
        const result = options.extractStructured 
          ? await this.extractStructuredData(image, options)
          : await this.extractText(image, options);
        results.push(result);
      } catch (error) {
        console.error('Batch OCR error for image:', error);
        results.push({
          text: '',
          confidence: 0,
          processingTime: 0,
          error: error instanceof Error ? error.message : '处理失败'
        } as OCRResult & { error: string });
      }
    }
    
    return results;
  }

  /**
   * 准备图片数据
   */
  private async prepareImageData(imageData: string | File): Promise<string> {
    if (typeof imageData === 'string') {
      // 如果已经是base64字符串，直接返回
      return imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    }
    
    // 如果是File对象，转换为base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageData);
    });
  }

  /**
   * 构建文字提取提示词
   */
  private buildTextExtractionPrompt(language?: string): string {
    const lang = language || 'zh-CN';
    
    return `请仔细识别这张图片中的所有文字内容，并按照以下要求输出：

1. 识别图片中的所有文字，包括标题、正文、表格、标注等
2. 保持原有的文本结构和格式
3. 如果有表格，请保持表格的行列结构
4. 主要语言：${lang === 'zh-CN' ? '中文' : '英文'}
5. 请确保识别的准确性，特别注意数字、日期、专有名词

请直接输出识别的文字内容，不要添加任何解释或说明。`;
  }

  /**
   * 构建结构化提取提示词
   */
  private buildStructuredExtractionPrompt(): string {
    return `请从这张合同或文档截图中提取关键信息，并以JSON格式返回。请仔细识别以下信息：

{
  "甲方": "甲方公司或个人名称",
  "乙方": "乙方公司或个人名称",
  "合同金额": "合同总金额（包含货币单位）",
  "合同编号": "合同编号或协议编号",
  "签署日期": "合同签署日期",
  "生效日期": "合同生效日期",
  "到期日期": "合同到期日期",
  "联系人": "主要联系人姓名",
  "联系电话": "联系电话号码",
  "其他信息": {
    "项目名称": "如果有项目名称",
    "付款方式": "付款方式说明",
    "违约责任": "违约责任条款",
    "备注": "其他重要信息"
  }
}

注意事项：
1. 如果某项信息在图片中不存在，请设置为null
2. 金额请保留原始格式（包含货币符号）
3. 日期请使用YYYY-MM-DD格式
4. 请确保提取的信息准确无误
5. 只返回JSON格式，不要添加其他说明

请仔细分析图片内容，准确提取信息：`;
  }

  /**
   * 调用Gemini API
   */
  private async callGeminiAPI(prompt: string, imageBase64: string, options: OCROptions = {}): Promise<any> {
    const maxRetries = options.maxRetries || this.maxRetries;
    const timeout = options.timeout || this.timeout;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1, // 降低随机性，提高准确性
              maxOutputTokens: 2048,
              topP: 0.8,
              topK: 40
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No response from Gemini API');
        }
        
        return data;
      } catch (error) {
        console.error(`Gemini API attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 指数退避重试
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * 从响应中提取文本
   */
  private extractTextFromResponse(response: any): string {
    try {
      const candidate = response.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error('Invalid response format');
      }
      
      return candidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');
    } catch (error) {
      console.error('Error extracting text from response:', error);
      throw new Error('Failed to extract text from API response');
    }
  }

  /**
   * 解析结构化数据
   */
  private parseStructuredData(response: any): ContractInfo {
    try {
      const text = this.extractTextFromResponse(response);
      
      // 尝试解析JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果没有找到JSON，尝试从文本中提取信息
      return this.extractInfoFromText(text);
    } catch (error) {
      console.error('Error parsing structured data:', error);
      return {};
    }
  }

  /**
   * 从文本中提取信息（备用方法）
   */
  private extractInfoFromText(text: string): ContractInfo {
    const info: ContractInfo = {};
    
    // 使用正则表达式提取常见信息
    const patterns = {
      甲方: /甲方[：:]\s*([^\n\r]+)/i,
      乙方: /乙方[：:]\s*([^\n\r]+)/i,
      合同金额: /(?:合同金额|总金额|金额)[：:]\s*([^\n\r]+)/i,
      合同编号: /(?:合同编号|协议编号|编号)[：:]\s*([^\n\r]+)/i,
      签署日期: /(?:签署日期|签订日期|日期)[：:]\s*([^\n\r]+)/i,
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        (info as any)[key] = match[1].trim();
      }
    });
    
    return info;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(response: any): number {
    try {
      const candidate = response.candidates[0];
      if (candidate && candidate.finishReason === 'STOP') {
        return 0.9; // 正常完成，高置信度
      }
      return 0.7; // 其他情况，中等置信度
    } catch (error) {
      return 0.5; // 错误情况，低置信度
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // 使用一个简单的测试请求验证API密钥
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        })
      });
      
      return response.status !== 401 && response.status !== 403;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<{ requestCount: number; estimatedCost: number }> {
    // 这里可以实现使用统计逻辑
    // 实际应用中可能需要从数据库或缓存中获取
    return {
      requestCount: 0,
      estimatedCost: 0
    };
  }
}

/**
 * 创建Gemini OCR服务实例
 */
export function createGeminiOCRService(apiKey?: string, model?: string): GeminiOCRService {
  return new GeminiOCRService(apiKey, model);
}

/**
 * 默认Gemini OCR服务实例
 */
export const geminiOCR = createGeminiOCRService();
