import { feishuClient } from './feishu';
import { DocumentBlock, FeishuDocument } from '@/types';
import { DocumentParser } from './document-parser';

/**
 * 更新操作类型
 */
export enum UpdateOperationType {
  TEXT_REPLACE = 'text_replace',
  BLOCK_UPDATE = 'block_update',
  BLOCK_INSERT = 'block_insert',
  BLOCK_DELETE = 'block_delete',
  BATCH_REPLACE = 'batch_replace'
}

/**
 * 更新操作记录
 */
export interface UpdateOperation {
  id: string;
  type: UpdateOperationType;
  documentId: string;
  userId: string;
  timestamp: Date;
  details: {
    blockId?: string;
    originalContent?: string;
    newContent?: string;
    searchText?: string;
    replaceText?: string;
    position?: number;
  };
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
  result: {
    success: boolean;
    error?: string;
    affectedBlocks: string[];
    changeCount: number;
  };
}

/**
 * 内容验证规则
 */
export interface ContentValidationRule {
  name: string;
  pattern?: RegExp;
  maxLength?: number;
  minLength?: number;
  allowedChars?: string;
  forbiddenWords?: string[];
  customValidator?: (content: string) => { valid: boolean; error?: string };
}

/**
 * 安全文档更新服务
 */
export class SecureDocumentUpdateService {
  private static instance: SecureDocumentUpdateService;
  private operationLog: UpdateOperation[] = [];
  private validationRules: ContentValidationRule[] = [];

  private constructor() {
    this.initializeDefaultValidationRules();
  }

  static getInstance(): SecureDocumentUpdateService {
    if (!SecureDocumentUpdateService.instance) {
      SecureDocumentUpdateService.instance = new SecureDocumentUpdateService();
    }
    return SecureDocumentUpdateService.instance;
  }

  /**
   * 初始化默认验证规则
   */
  private initializeDefaultValidationRules(): void {
    this.validationRules = [
      {
        name: 'max_length',
        maxLength: 10000,
        customValidator: (content: string) => {
          if (content.length > 10000) {
            return { valid: false, error: '内容长度不能超过10000字符' };
          }
          return { valid: true };
        }
      },
      {
        name: 'no_script_tags',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        customValidator: (content: string) => {
          if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
            return { valid: false, error: '内容不能包含脚本标签' };
          }
          return { valid: true };
        }
      },
      {
        name: 'no_malicious_urls',
        pattern: /(javascript:|data:|vbscript:)/gi,
        customValidator: (content: string) => {
          if (/(javascript:|data:|vbscript:)/gi.test(content)) {
            return { valid: false, error: '内容不能包含恶意链接' };
          }
          return { valid: true };
        }
      },
      {
        name: 'forbidden_words',
        forbiddenWords: ['<script>', '</script>', 'javascript:', 'eval(', 'document.cookie'],
        customValidator: (content: string) => {
          const forbiddenWords = ['<script>', '</script>', 'javascript:', 'eval(', 'document.cookie'];
          const lowerContent = content.toLowerCase();
          const foundWord = forbiddenWords.find(word => lowerContent.includes(word.toLowerCase()));
          if (foundWord) {
            return { valid: false, error: `内容不能包含禁用词汇: ${foundWord}` };
          }
          return { valid: true };
        }
      }
    ];
  }

  /**
   * 验证内容安全性
   */
  validateContent(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      if (rule.customValidator) {
        const result = rule.customValidator(content);
        if (!result.valid && result.error) {
          errors.push(result.error);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 过滤和清理内容
   */
  sanitizeContent(content: string): string {
    let sanitized = content;

    // 移除潜在的恶意标签
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

    // 移除危险的属性
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');

    // 清理多余的空白字符
    sanitized = sanitized.trim();
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * 安全的文本替换
   */
  async secureTextReplace(
    documentId: string,
    accessToken: string,
    searchText: string,
    replaceText: string,
    userId: string,
    metadata: { userAgent?: string; ipAddress?: string; sessionId?: string } = {}
  ): Promise<{
    success: boolean;
    operation: UpdateOperation;
    result?: any;
    error?: string;
  }> {
    const operationId = this.generateOperationId();
    const operation: UpdateOperation = {
      id: operationId,
      type: UpdateOperationType.TEXT_REPLACE,
      documentId,
      userId,
      timestamp: new Date(),
      details: {
        searchText,
        replaceText,
      },
      metadata,
      result: {
        success: false,
        affectedBlocks: [],
        changeCount: 0,
      },
    };

    try {
      // 1. 验证替换文本的安全性
      const validation = this.validateContent(replaceText);
      if (!validation.valid) {
        operation.result.error = `内容验证失败: ${validation.errors.join(', ')}`;
        this.logOperation(operation);
        return {
          success: false,
          operation,
          error: operation.result.error,
        };
      }

      // 2. 清理替换文本
      const sanitizedReplaceText = this.sanitizeContent(replaceText);

      // 3. 获取文档内容进行预检查
      const documentContent = await feishuClient.getDocumentContent(documentId, accessToken);
      const structure = DocumentParser.parseDocument(documentContent.document, documentContent.blocks);

      // 4. 搜索匹配项
      const searchResults = DocumentParser.searchInStructure(structure, searchText, {
        caseSensitive: false,
        wholeWord: false,
      });

      if (searchResults.length === 0) {
        operation.result.error = '未找到匹配的文本';
        this.logOperation(operation);
        return {
          success: false,
          operation,
          error: operation.result.error,
        };
      }

      // 5. 检查替换影响范围
      if (searchResults.length > 100) {
        operation.result.error = '匹配项过多，为安全起见请缩小搜索范围';
        this.logOperation(operation);
        return {
          success: false,
          operation,
          error: operation.result.error,
        };
      }

      // 6. 执行替换操作
      const updates: Array<{ blockId: string; content: any }> = [];
      
      for (const result of searchResults) {
        const block = DocumentParser.getBlockByPath(structure, result.path);
        if (block) {
          const newContent = block.content.replace(new RegExp(this.escapeRegExp(searchText), 'g'), sanitizedReplaceText);
          updates.push({
            blockId: result.blockId,
            content: {
              text: {
                content: newContent,
              },
            },
          });
          operation.result.affectedBlocks.push(result.blockId);
        }
      }

      // 7. 批量更新文档
      await feishuClient.batchUpdateDocumentBlocks(documentId, updates, accessToken);

      operation.result.success = true;
      operation.result.changeCount = updates.length;
      this.logOperation(operation);

      return {
        success: true,
        operation,
        result: {
          affectedBlocks: operation.result.affectedBlocks,
          changeCount: operation.result.changeCount,
          replacements: updates.length,
        },
      };
    } catch (error) {
      console.error('Secure text replace error:', error);
      operation.result.error = error instanceof Error ? error.message : '未知错误';
      this.logOperation(operation);

      return {
        success: false,
        operation,
        error: operation.result.error,
      };
    }
  }

  /**
   * 安全的块内容更新
   */
  async secureBlockUpdate(
    documentId: string,
    blockId: string,
    newContent: string,
    accessToken: string,
    userId: string,
    metadata: { userAgent?: string; ipAddress?: string; sessionId?: string } = {}
  ): Promise<{
    success: boolean;
    operation: UpdateOperation;
    error?: string;
  }> {
    const operationId = this.generateOperationId();
    const operation: UpdateOperation = {
      id: operationId,
      type: UpdateOperationType.BLOCK_UPDATE,
      documentId,
      userId,
      timestamp: new Date(),
      details: {
        blockId,
        newContent,
      },
      metadata,
      result: {
        success: false,
        affectedBlocks: [blockId],
        changeCount: 0,
      },
    };

    try {
      // 1. 验证内容安全性
      const validation = this.validateContent(newContent);
      if (!validation.valid) {
        operation.result.error = `内容验证失败: ${validation.errors.join(', ')}`;
        this.logOperation(operation);
        return {
          success: false,
          operation,
          error: operation.result.error,
        };
      }

      // 2. 清理内容
      const sanitizedContent = this.sanitizeContent(newContent);

      // 3. 获取原始内容用于备份
      const documentContent = await feishuClient.getDocumentContent(documentId, accessToken);
      const originalBlock = documentContent.blocks.find(block => block.block_id === blockId);
      
      if (originalBlock) {
        operation.details.originalContent = originalBlock.text?.content || '';
      }

      // 4. 更新块内容
      await feishuClient.updateDocumentBlock(
        documentId,
        blockId,
        {
          text: {
            content: sanitizedContent,
          },
        },
        accessToken
      );

      operation.result.success = true;
      operation.result.changeCount = 1;
      this.logOperation(operation);

      return {
        success: true,
        operation,
      };
    } catch (error) {
      console.error('Secure block update error:', error);
      operation.result.error = error instanceof Error ? error.message : '未知错误';
      this.logOperation(operation);

      return {
        success: false,
        operation,
        error: operation.result.error,
      };
    }
  }

  /**
   * 记录操作日志
   */
  private logOperation(operation: UpdateOperation): void {
    this.operationLog.push(operation);
    
    // 保持日志大小在合理范围内
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-500);
    }

    // 在生产环境中，这里应该将日志写入数据库
    console.log(`[DOCUMENT_UPDATE] ${operation.type} - ${operation.result.success ? 'SUCCESS' : 'FAILED'}`, {
      operationId: operation.id,
      documentId: operation.documentId,
      userId: operation.userId,
      error: operation.result.error,
    });
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(documentId?: string, userId?: string, limit: number = 50): UpdateOperation[] {
    let filtered = this.operationLog;

    if (documentId) {
      filtered = filtered.filter(op => op.documentId === documentId);
    }

    if (userId) {
      filtered = filtered.filter(op => op.userId === userId);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 添加自定义验证规则
   */
  addValidationRule(rule: ContentValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 移除验证规则
   */
  removeValidationRule(ruleName: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.name !== ruleName);
  }

  /**
   * 批量安全替换
   */
  async secureBatchReplace(
  documentId: string,
  accessToken: string,
  replacements: Array<{ searchText: string; replaceText: string }>,
  userId: string,
  metadata: { userAgent?: string; ipAddress?: string; sessionId?: string } = {}
): Promise<{
  success: boolean;
  operations: UpdateOperation[];
  results: Array<{ success: boolean; error?: string }>;
  summary: {
    totalOperations: number;
    successCount: number;
    failureCount: number;
    totalChanges: number;
  };
}> {
  const operations: UpdateOperation[] = [];
  const results: Array<{ success: boolean; error?: string }> = [];
  let totalChanges = 0;

  for (const replacement of replacements) {
    const result = await this.secureTextReplace(
      documentId,
      accessToken,
      replacement.searchText,
      replacement.replaceText,
      userId,
      metadata
    );

    operations.push(result.operation);
    results.push({
      success: result.success,
      error: result.error,
    });

    if (result.success && result.result) {
      totalChanges += result.result.changeCount;
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount === replacements.length,
    operations,
    results,
    summary: {
      totalOperations: replacements.length,
      successCount,
      failureCount: replacements.length - successCount,
      totalChanges,
    },
  };
}

  /**
   * 验证替换操作的安全性
   */
  validateReplacement(searchText: string, replaceText: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证搜索文本
  if (!searchText || searchText.trim().length === 0) {
    errors.push('搜索文本不能为空');
  }

  if (searchText.length > 1000) {
    errors.push('搜索文本长度不能超过1000字符');
  }

  // 验证替换文本
  const contentValidation = this.validateContent(replaceText);
  if (!contentValidation.valid) {
    errors.push(...contentValidation.errors);
  }

  // 检查潜在的危险替换
  if (searchText.length < 3) {
    warnings.push('搜索文本过短，可能会产生意外的替换结果');
  }

  if (replaceText.length > searchText.length * 10) {
    warnings.push('替换文本明显长于搜索文本，请确认是否正确');
  }

  // 检查是否包含敏感操作
  const sensitivePatterns = [
    /删除|delete|remove/i,
    /清空|clear|empty/i,
    /重置|reset/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(replaceText)) {
      warnings.push('替换文本包含敏感操作词汇，请谨慎操作');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
}

/**
 * 默认安全文档更新服务实例
 */
export const secureDocumentUpdateService = SecureDocumentUpdateService.getInstance();
