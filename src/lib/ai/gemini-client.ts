/**
 * Gemini AI客户端
 * 封装Google Gemini API调用，提供自然语言处理能力
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface FieldMappingRequest {
  userInput: string;
  availableFields: Array<{
    name: string;
    type: string;
    description?: string;
    options?: string[];
  }>;
  context?: string;
}

export interface FieldMappingResponse {
  mappings: Array<{
    fieldName: string;
    extractedValue: string;
    confidence: number;
    reasoning?: string;
  }>;
  unmappedContent?: string;
  suggestions?: string[];
}

/**
 * Gemini AI客户端类
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('[GeminiClient] GEMINI_API_KEY not found in environment variables');
      this.isConfigured = false;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      this.isConfigured = true;
      console.log('[GeminiClient] Gemini AI client initialized successfully');
    } catch (error) {
      console.error('[GeminiClient] Failed to initialize Gemini client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * 检查AI服务是否可用
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * 从自然语言中提取字段映射
   */
  async extractFieldMappings(request: FieldMappingRequest): Promise<AIResponse> {
    if (!this.isConfigured || !this.model) {
      return {
        success: false,
        error: 'AI服务未配置或不可用'
      };
    }

    try {
      console.log('[GeminiClient] 开始提取字段映射');

      const prompt = this.buildFieldMappingPrompt(request);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('[GeminiClient] AI响应:', text);

      // 解析AI响应
      const mappingResponse = this.parseFieldMappingResponse(text, request.availableFields);

      return {
        success: true,
        data: mappingResponse
      };

    } catch (error) {
      console.error('[GeminiClient] 字段映射提取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '字段映射提取失败'
      };
    }
  }

  /**
   * 构建字段映射提取的提示词
   */
  private buildFieldMappingPrompt(request: FieldMappingRequest): string {
    const fieldsDescription = request.availableFields.map(field => {
      let desc = `- ${field.name} (${field.type})`;
      if (field.description) {
        desc += `: ${field.description}`;
      }
      if (field.options && field.options.length > 0) {
        desc += ` [选项: ${field.options.join(', ')}]`;
      }
      return desc;
    }).join('\n');

    return `你是一个专业的文档处理助手，需要从用户的自然语言描述中提取信息并映射到指定的表单字段。

可用字段列表：
${fieldsDescription}

用户输入：
"${request.userInput}"

${request.context ? `上下文信息：\n${request.context}\n` : ''}

请分析用户输入，提取相关信息并映射到对应的字段。返回JSON格式的结果，包含以下结构：

{
  "mappings": [
    {
      "fieldName": "字段名称",
      "extractedValue": "提取的值",
      "confidence": 0.95,
      "reasoning": "提取理由"
    }
  ],
  "unmappedContent": "无法映射的内容",
  "suggestions": ["建议或需要澄清的问题"]
}

要求：
1. 只映射有明确信息的字段，不要猜测
2. confidence值应该反映提取的确信度（0-1之间）
3. 对于选择类型的字段，尽量匹配预定义的选项
4. 如果信息不完整或模糊，在suggestions中提出澄清问题
5. 返回有效的JSON格式，不要包含其他文本

JSON结果：`;
  }

  /**
   * 解析AI响应为字段映射结果
   */
  private parseFieldMappingResponse(aiResponse: string, availableFields: any[]): FieldMappingResponse {
    try {
      // 尝试提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI响应中未找到有效的JSON格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证和清理响应
      const mappings = (parsed.mappings || []).filter((mapping: any) => {
        // 验证字段名是否存在
        const fieldExists = availableFields.some(field => field.name === mapping.fieldName);
        if (!fieldExists) {
          console.warn(`[GeminiClient] 字段不存在: ${mapping.fieldName}`);
          return false;
        }
        
        // 验证必要属性
        return mapping.fieldName && mapping.extractedValue !== undefined && mapping.confidence;
      });

      return {
        mappings: mappings.map((mapping: any) => ({
          fieldName: mapping.fieldName,
          extractedValue: String(mapping.extractedValue),
          confidence: Math.min(Math.max(mapping.confidence, 0), 1), // 确保在0-1范围内
          reasoning: mapping.reasoning || ''
        })),
        unmappedContent: parsed.unmappedContent || '',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };

    } catch (error) {
      console.error('[GeminiClient] 解析AI响应失败:', error);
      
      // 降级处理：尝试简单的关键词匹配
      return this.fallbackFieldMapping(aiResponse, availableFields);
    }
  }

  /**
   * 降级处理：简单的关键词匹配
   */
  private fallbackFieldMapping(text: string, availableFields: any[]): FieldMappingResponse {
    const mappings: any[] = [];
    const lowerText = text.toLowerCase();

    availableFields.forEach(field => {
      const fieldNameLower = field.name.toLowerCase();
      
      // 简单的关键词匹配
      if (lowerText.includes(fieldNameLower)) {
        // 尝试提取相关值（这是一个非常简化的实现）
        const sentences = text.split(/[。！？.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(fieldNameLower)) {
            mappings.push({
              fieldName: field.name,
              extractedValue: sentence.trim(),
              confidence: 0.3, // 低置信度
              reasoning: '关键词匹配（降级处理）'
            });
            break;
          }
        }
      }
    });

    return {
      mappings,
      unmappedContent: text,
      suggestions: ['AI解析失败，请尝试更明确的描述或手动填写字段']
    };
  }

  /**
   * 智能问答对话
   */
  async chatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context?: string
  ): Promise<AIResponse> {
    if (!this.isConfigured || !this.model) {
      return {
        success: false,
        error: 'AI服务未配置或不可用'
      };
    }

    try {
      console.log('[GeminiClient] 开始对话处理');

      // 构建对话历史
      const conversationHistory = messages.map(msg =>
        `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`
      ).join('\n');

      const prompt = `你是一个专业的文档处理助手，正在帮助用户填写表单。

${context ? `当前表单上下文：\n${context}\n` : ''}

对话历史：
${conversationHistory}

请根据对话历史和上下文，提供有帮助的回复。回复应该：
1. 简洁明了
2. 针对用户的具体问题
3. 如果涉及表单填写，提供具体的建议
4. 保持友好和专业的语调

回复：`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: {
          content: text.trim()
        }
      };

    } catch (error) {
      console.error('[GeminiClient] 对话处理失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '对话处理失败'
      };
    }
  }

  /**
   * 验证和优化提取的数据
   */
  async validateAndOptimize(
    fieldName: string,
    extractedValue: string,
    fieldType: string,
    options?: string[]
  ): Promise<AIResponse> {
    if (!this.isConfigured || !this.model) {
      return {
        success: false,
        error: 'AI服务未配置或不可用'
      };
    }

    try {
      const prompt = `请验证和优化以下提取的字段值：

字段名称: ${fieldName}
字段类型: ${fieldType}
提取的值: ${extractedValue}
${options ? `可选值: ${options.join(', ')}` : ''}

请分析这个值是否合适，并提供优化建议。返回JSON格式：

{
  "isValid": true/false,
  "optimizedValue": "优化后的值",
  "confidence": 0.95,
  "issues": ["发现的问题"],
  "suggestions": ["改进建议"]
}

JSON结果：`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: parsed
        };
      }

      return {
        success: false,
        error: '无法解析验证结果'
      };

    } catch (error) {
      console.error('[GeminiClient] 验证优化失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '验证优化失败'
      };
    }
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    // 这里可以实现使用统计的逻辑
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }
}
