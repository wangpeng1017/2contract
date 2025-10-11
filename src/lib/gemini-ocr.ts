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

  constructor(apiKey?: string, model: string = 'gemini-2.5-flash') {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.maxRetries = 3;
    this.timeout = 30000;

    console.log('[GeminiOCR] 初始化OCR服务...', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      model: this.model,
      nodeEnv: process.env.NODE_ENV,
      isServer: typeof window === 'undefined',
    });

    // 在构建时允许缺少API Key
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !this.apiKey) {
      console.warn('[GeminiOCR] ⚠️ Google API Key未配置，构建时跳过验证');
      this.apiKey = 'build-time-placeholder';
      return;
    }

    if (!this.apiKey) {
      console.error('[GeminiOCR] ❌ Google API Key未配置。请检查环境变量GOOGLE_API_KEY');
      throw new Error('Google API Key is required for Gemini OCR service. Please check GOOGLE_API_KEY environment variable.');
    }

    // 验证API密钥格式（跳过占位符）
    if (this.apiKey !== 'build-time-placeholder') {
      const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
      if (!apiKeyPattern.test(this.apiKey)) {
        console.error('[GeminiOCR] ❌ Google API Key格式不正确:', {
          keyLength: this.apiKey.length,
          keyPrefix: this.apiKey.substring(0, 8),
        });
        throw new Error('Invalid Google API Key format. Please check your GOOGLE_API_KEY.');
      }
    }

    console.log('[GeminiOCR] ✅ Gemini OCR服务初始化成功');
  }

  /**
   * 基础文字识别
   */
  async extractText(imageData: string | File, options: OCROptions = {}): Promise<OCRResult> {
    const startTime = Date.now();

    // 运行时检查API Key
    if (this.apiKey === 'build-time-placeholder' || !this.apiKey) {
      throw new Error('Google API Key is not configured. Please set GOOGLE_API_KEY environment variable.');
    }

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
    // 在服务器端，File对象实际上是一个包含arrayBuffer方法的对象
    try {
      const arrayBuffer = await imageData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw new Error('Failed to convert file to base64');
    }
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
        
        const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey,
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
          console.error('[GeminiOCR] API 请求失败:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: this.model,
            attempt: attempt
          });
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          console.error('[GeminiOCR] API 响应无效:', {
            data: data,
            model: this.model,
            attempt: attempt
          });
          throw new Error('No response from Gemini API');
        }

        console.log('[GeminiOCR] API 调用成功:', {
          model: this.model,
          attempt: attempt,
          candidatesCount: data.candidates?.length || 0
        });
        
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
   * 从响应中提取文本 - 自动选择最佳候选结果
   */
  private extractTextFromResponse(response: any): string {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates in response');
      }

      // 如果只有一个候选结果，直接使用
      if (response.candidates.length === 1) {
        const candidate = response.candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
          throw new Error('Invalid candidate format');
        }

        return candidate.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('\n');
      }

      // 如果有多个候选结果，自动选择最佳的一个
      console.log(`[GeminiOCR] 发现 ${response.candidates.length} 个候选结果，自动选择最佳结果`);

      const bestCandidate = this.selectBestCandidate(response.candidates);

      if (!bestCandidate || !bestCandidate.content || !bestCandidate.content.parts) {
        throw new Error('No valid candidate found');
      }

      return bestCandidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');
    } catch (error) {
      console.error('Error extracting text from response:', error);
      throw new Error('Failed to extract text from API response');
    }
  }

  /**
   * 从多个候选结果中选择最佳的一个
   */
  private selectBestCandidate(candidates: any[]): any {
    // 过滤出有效的候选结果
    const validCandidates = candidates.filter(candidate =>
      candidate &&
      candidate.content &&
      candidate.content.parts &&
      candidate.content.parts.some((part: any) => part.text && part.text.trim().length > 0)
    );

    if (validCandidates.length === 0) {
      return null;
    }

    if (validCandidates.length === 1) {
      return validCandidates[0];
    }

    // 评分标准：
    // 1. finishReason 为 'STOP' 的优先级最高
    // 2. 文本长度适中的优先级较高
    // 3. 包含更多结构化信息的优先级较高

    const scoredCandidates = validCandidates.map(candidate => {
      let score = 0;

      // 完成状态评分
      if (candidate.finishReason === 'STOP') {
        score += 100;
      } else if (candidate.finishReason === 'MAX_TOKENS') {
        score += 50;
      }

      // 文本质量评分
      const text = candidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');

      const textLength = text.length;

      // 文本长度评分（避免过短或过长）
      if (textLength > 50 && textLength < 5000) {
        score += 50;
      } else if (textLength >= 5000) {
        score += 30;
      } else if (textLength >= 20) {
        score += 20;
      }

      // 结构化内容评分
      if (text.includes('{') && text.includes('}')) {
        score += 20; // 包含JSON结构
      }
      if (text.includes('甲方') || text.includes('乙方')) {
        score += 15; // 包含合同关键词
      }
      if (text.includes('金额') || text.includes('价格') || text.includes('¥')) {
        score += 10; // 包含金额信息
      }

      return { candidate, score, textLength };
    });

    // 按评分排序，选择最高分的候选结果
    scoredCandidates.sort((a, b) => b.score - a.score);

    const bestCandidate = scoredCandidates[0];

    console.log(`[GeminiOCR] 最佳候选结果评分: ${bestCandidate.score}, 文本长度: ${bestCandidate.textLength}`);

    return bestCandidate.candidate;
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
   * 计算置信度 - 基于最佳候选结果
   */
  private calculateConfidence(response: any): number {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        return 0.1;
      }

      // 如果只有一个候选结果
      if (response.candidates.length === 1) {
        const candidate = response.candidates[0];
        return this.calculateCandidateConfidence(candidate);
      }

      // 如果有多个候选结果，基于最佳候选结果计算置信度
      const bestCandidate = this.selectBestCandidate(response.candidates);
      if (!bestCandidate) {
        return 0.2;
      }

      // 多候选结果的置信度会稍微提高，因为有多个选择
      const baseConfidence = this.calculateCandidateConfidence(bestCandidate);
      const candidateCount = response.candidates.length;

      // 候选结果越多，置信度稍微提高（最多提高0.1）
      const bonusConfidence = Math.min(0.1, candidateCount * 0.02);

      return Math.min(0.95, baseConfidence + bonusConfidence);
    } catch (error) {
      console.error('Error calculating confidence:', error);
      return 0.3;
    }
  }

  /**
   * 计算单个候选结果的置信度
   */
  private calculateCandidateConfidence(candidate: any): number {
    if (!candidate) {
      return 0.1;
    }

    let confidence = 0.5; // 基础置信度

    // 完成状态评分
    if (candidate.finishReason === 'STOP') {
      confidence += 0.3; // 正常完成
    } else if (candidate.finishReason === 'MAX_TOKENS') {
      confidence += 0.1; // 达到最大token限制
    } else {
      confidence -= 0.1; // 其他异常情况
    }

    // 内容质量评分
    if (candidate.content && candidate.content.parts) {
      const text = candidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('\n');

      const textLength = text.length;

      // 文本长度评分
      if (textLength > 100) {
        confidence += 0.1;
      }
      if (textLength > 500) {
        confidence += 0.05;
      }

      // 内容结构评分
      if (text.includes('{') && text.includes('}')) {
        confidence += 0.05; // 包含结构化数据
      }

      // 中文内容评分
      const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (chineseCharCount > 10) {
        confidence += 0.05;
      }
    }

    // 确保置信度在合理范围内
    return Math.max(0.1, Math.min(0.95, confidence));
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
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey
        },
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
 * 默认Gemini OCR服务实例（延迟初始化）
 */
let _geminiOCR: GeminiOCRService | null = null;

export const geminiOCR = new Proxy({} as GeminiOCRService, {
  get(target, prop) {
    if (!_geminiOCR) {
      _geminiOCR = createGeminiOCRService();
    }
    return (_geminiOCR as any)[prop];
  }
});
