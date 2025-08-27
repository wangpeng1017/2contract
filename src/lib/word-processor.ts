/**
 * Word文档处理引擎
 * 基于docx-templates和jszip实现真实的Word文档解析和生成
 */

import JSZip from 'jszip';
import { createReport } from 'docx-templates';

export interface PlaceholderInfo {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'boolean';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface DocumentTemplate {
  placeholders: PlaceholderInfo[];
  templateBuffer: ArrayBuffer;
  templateName: string;
  metadata: {
    extractedAt: string;
    fileSize: number;
    placeholderCount: number;
  };
}

export interface GenerationResult {
  documentBuffer: ArrayBuffer;
  metadata: {
    generatedAt: string;
    templateName: string;
    filledFields: string[];
    fileSize: number;
  };
}

/**
 * Word文档处理器类
 */
export class WordProcessor {
  
  /**
   * 解析Word模板，提取占位符信息
   */
  static async parseTemplate(templateBuffer: ArrayBuffer, templateName: string): Promise<DocumentTemplate> {
    try {
      console.log(`[WordProcessor] 开始解析模板: ${templateName}`);
      
      // 使用JSZip解析docx文件
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(templateBuffer);
      
      // 提取document.xml文件内容
      const documentXml = await zipContent.file('word/document.xml')?.async('text');
      
      if (!documentXml) {
        throw new Error('无法找到document.xml文件，可能不是有效的Word文档');
      }
      
      // 提取占位符
      const placeholders = this.extractPlaceholders(documentXml);
      
      console.log(`[WordProcessor] 解析完成，发现 ${placeholders.length} 个占位符`);
      
      return {
        placeholders,
        templateBuffer,
        templateName,
        metadata: {
          extractedAt: new Date().toISOString(),
          fileSize: templateBuffer.byteLength,
          placeholderCount: placeholders.length
        }
      };
      
    } catch (error) {
      console.error('[WordProcessor] 模板解析失败:', error);
      throw new Error(`模板解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 从XML内容中提取占位符
   */
  private static extractPlaceholders(xmlContent: string): PlaceholderInfo[] {
    const placeholders: PlaceholderInfo[] = [];
    const placeholderSet = new Set<string>();
    
    // 匹配 {{placeholder}} 格式的占位符
    // 考虑到Word可能会将占位符分割到多个XML节点中，我们需要更复杂的匹配
    const patterns = [
      /\{\{([^}]+)\}\}/g,  // 标准格式
      /\{([^}]+)\}/g,      // 单花括号格式
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(xmlContent)) !== null) {
        const placeholderName = match[1].trim();
        
        if (placeholderName && !placeholderSet.has(placeholderName)) {
          placeholderSet.add(placeholderName);
          
          const placeholder: PlaceholderInfo = {
            name: placeholderName,
            type: this.inferPlaceholderType(placeholderName),
            required: true, // MVP阶段默认都是必填
            description: this.generatePlaceholderDescription(placeholderName)
          };
          
          placeholders.push(placeholder);
        }
      }
    });
    
    // 如果没有找到占位符，返回一些示例占位符用于演示
    if (placeholders.length === 0) {
      console.log('[WordProcessor] 未找到占位符，返回示例占位符');
      return this.getDefaultPlaceholders();
    }
    
    return placeholders.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * 推断占位符的数据类型
   */
  private static inferPlaceholderType(name: string): PlaceholderInfo['type'] {
    const lowerName = name.toLowerCase();
    
    // 日期类型
    if (lowerName.includes('日期') || lowerName.includes('时间') || 
        lowerName.includes('date') || lowerName.includes('time')) {
      return 'date';
    }
    
    // 数字类型
    if (lowerName.includes('金额') || lowerName.includes('价格') || 
        lowerName.includes('数量') || lowerName.includes('amount') || 
        lowerName.includes('price') || lowerName.includes('count') ||
        lowerName.includes('费用') || lowerName.includes('成本')) {
      return 'number';
    }
    
    // 邮箱类型
    if (lowerName.includes('邮箱') || lowerName.includes('邮件') || 
        lowerName.includes('email') || lowerName.includes('mail')) {
      return 'email';
    }
    
    // 布尔类型
    if (lowerName.includes('是否') || lowerName.includes('启用') || 
        lowerName.includes('enable') || lowerName.includes('disable') ||
        lowerName.includes('同意') || lowerName.includes('确认')) {
      return 'boolean';
    }
    
    // 默认文本类型
    return 'text';
  }
  
  /**
   * 生成占位符描述
   */
  private static generatePlaceholderDescription(name: string): string {
    const typeDescriptions: Record<string, string> = {
      '公司': '请输入公司全称',
      '姓名': '请输入完整姓名',
      '日期': '请选择日期',
      '金额': '请输入金额（数字）',
      '电话': '请输入联系电话',
      '邮箱': '请输入邮箱地址',
      '地址': '请输入详细地址'
    };
    
    for (const [key, desc] of Object.entries(typeDescriptions)) {
      if (name.includes(key)) {
        return desc;
      }
    }
    
    return `请输入${name}`;
  }
  
  /**
   * 获取默认占位符（用于演示）
   */
  private static getDefaultPlaceholders(): PlaceholderInfo[] {
    return [
      {
        name: '甲方公司名称',
        type: 'text',
        required: true,
        description: '请输入甲方公司全称'
      },
      {
        name: '乙方公司名称',
        type: 'text',
        required: true,
        description: '请输入乙方公司全称'
      },
      {
        name: '合同金额',
        type: 'number',
        required: true,
        description: '请输入合同金额（数字）'
      },
      {
        name: '签署日期',
        type: 'date',
        required: true,
        description: '请选择合同签署日期'
      },
      {
        name: '甲方联系人',
        type: 'text',
        required: true,
        description: '请输入甲方联系人姓名'
      },
      {
        name: '乙方联系人',
        type: 'text',
        required: true,
        description: '请输入乙方联系人姓名'
      },
      {
        name: '联系邮箱',
        type: 'email',
        required: false,
        description: '请输入联系邮箱地址'
      }
    ];
  }
  
  /**
   * 生成填充数据后的Word文档
   */
  static async generateDocument(
    templateBuffer: ArrayBuffer,
    data: Record<string, any>,
    templateName: string
  ): Promise<GenerationResult> {
    try {
      console.log(`[WordProcessor] 开始生成文档: ${templateName}`);
      console.log(`[WordProcessor] 填充数据:`, Object.keys(data));
      
      // 使用docx-templates生成文档
      const documentBuffer = await createReport({
        template: new Uint8Array(templateBuffer),
        data: data,
        additionalJsContext: {
          // 添加一些辅助函数
          formatDate: (date: string) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('zh-CN');
          },
          formatNumber: (num: string | number) => {
            if (!num) return '';
            return Number(num).toLocaleString('zh-CN');
          },
          formatCurrency: (amount: string | number) => {
            if (!amount) return '';
            return `¥${Number(amount).toLocaleString('zh-CN')}`;
          }
        }
      });
      
      const filledFields = Object.keys(data).filter(key => 
        data[key] !== undefined && data[key] !== null && data[key] !== ''
      );
      
      console.log(`[WordProcessor] 文档生成完成，大小: ${documentBuffer.byteLength} bytes`);
      
      return {
        documentBuffer: documentBuffer.buffer as ArrayBuffer,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateName,
          filledFields,
          fileSize: documentBuffer.byteLength
        }
      };
      
    } catch (error) {
      console.error('[WordProcessor] 文档生成失败:', error);
      throw new Error(`文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 验证模板文件
   */
  static async validateTemplate(buffer: ArrayBuffer): Promise<boolean> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      // 检查必要的文件是否存在
      const requiredFiles = [
        'word/document.xml',
        '[Content_Types].xml',
        '_rels/.rels'
      ];
      
      for (const file of requiredFiles) {
        if (!zipContent.file(file)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[WordProcessor] 模板验证失败:', error);
      return false;
    }
  }
  
  /**
   * 清理和标准化数据
   */
  static sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // 基本的数据清理
        if (typeof value === 'string') {
          sanitized[key] = value.trim().substring(0, 1000); // 限制长度
        } else if (typeof value === 'number') {
          sanitized[key] = isNaN(value) ? 0 : value;
        } else if (typeof value === 'boolean') {
          sanitized[key] = value ? '是' : '否';
        } else {
          sanitized[key] = String(value).trim().substring(0, 1000);
        }
      }
    });
    
    return sanitized;
  }
}
