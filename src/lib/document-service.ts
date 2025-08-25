import { feishuClient } from './feishu';
import { FeishuDocument, DocumentContent, DocumentBlock } from '@/types';
import { parseFeishuUrl } from './utils';

/**
 * 文档服务类
 */
export class DocumentService {
  private static instance: DocumentService;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  /**
   * 验证并解析文档URL
   */
  parseDocumentUrl(url: string): {
    isValid: boolean;
    documentId: string | null;
    type: 'document' | 'sheet' | 'bitable' | 'unknown';
    domain: string | null;
    error?: string;
  } {
    try {
      const parseResult = parseFeishuUrl(url);

      if (!parseResult.isValid) {
        return {
          isValid: false,
          documentId: null,
          type: parseResult.type,
          domain: parseResult.domain,
          error: parseResult.error || '无效的飞书链接',
        };
      }

      // 目前只支持文档类型
      if (parseResult.type !== 'document') {
        return {
          isValid: false,
          documentId: parseResult.documentId,
          type: parseResult.type,
          domain: parseResult.domain,
          error: `暂不支持${parseResult.type === 'sheet' ? '表格' : parseResult.type === 'bitable' ? '多维表格' : '该类型'}文档的处理`,
        };
      }

      return {
        isValid: true,
        documentId: parseResult.documentId,
        type: parseResult.type,
        domain: parseResult.domain,
      };
    } catch (error) {
      console.error('Error parsing document URL:', error);
      return {
        isValid: false,
        documentId: null,
        type: 'unknown',
        domain: null,
        error: '解析文档链接时发生错误',
      };
    }
  }

  /**
   * 获取文档信息
   */
  async getDocumentInfo(documentId: string, accessToken: string): Promise<FeishuDocument> {
    try {
      return await feishuClient.getDocument(documentId, accessToken);
    } catch (error) {
      console.error('Error getting document info:', error);
      throw new Error('获取文档信息失败');
    }
  }

  /**
   * 获取文档完整内容
   */
  async getDocumentContent(documentId: string, accessToken: string): Promise<DocumentContent> {
    try {
      return await feishuClient.getDocumentContent(documentId, accessToken);
    } catch (error) {
      console.error('Error getting document content:', error);
      throw new Error('获取文档内容失败');
    }
  }

  /**
   * 搜索文档中的文本
   */
  searchTextInDocument(blocks: DocumentBlock[], searchText: string, caseSensitive: boolean = false): Array<{
    blockId: string;
    blockType: string;
    content: string;
    matches: Array<{ start: number; end: number; text: string }>;
  }> {
    const results: Array<{
      blockId: string;
      blockType: string;
      content: string;
      matches: Array<{ start: number; end: number; text: string }>;
    }> = [];

    const search = caseSensitive ? searchText : searchText.toLowerCase();

    const searchInBlocks = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (block.text?.content) {
          const content = caseSensitive ? block.text.content : block.text.content.toLowerCase();
          const matches: Array<{ start: number; end: number; text: string }> = [];

          let index = 0;
          while (index < content.length) {
            const foundIndex = content.indexOf(search, index);
            if (foundIndex === -1) break;

            matches.push({
              start: foundIndex,
              end: foundIndex + search.length,
              text: block.text.content.substring(foundIndex, foundIndex + search.length),
            });

            index = foundIndex + 1;
          }

          if (matches.length > 0) {
            results.push({
              blockId: block.block_id,
              blockType: block.block_type,
              content: block.text.content,
              matches,
            });
          }
        }

        // 递归搜索子块
        if (block.children && block.children.length > 0) {
          searchInBlocks(block.children);
        }
      });
    };

    searchInBlocks(blocks);
    return results;
  }

  /**
   * 替换文档中的文本
   */
  async replaceTextInDocument(
    documentId: string,
    accessToken: string,
    searchText: string,
    replaceText: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      maxReplacements?: number;
    } = {}
  ): Promise<{
    success: boolean;
    replacedCount: number;
    totalMatches: number;
    error?: string;
  }> {
    try {
      const { caseSensitive = false, wholeWord = false, maxReplacements } = options;

      // 获取文档内容
      const documentContent = await this.getDocumentContent(documentId, accessToken);
      
      // 搜索需要替换的文本
      const searchResults = this.searchTextInDocument(documentContent.blocks, searchText, caseSensitive);
      
      if (searchResults.length === 0) {
        return {
          success: true,
          replacedCount: 0,
          totalMatches: 0,
        };
      }

      let totalMatches = 0;
      let replacedCount = 0;
      const updates: Array<{ blockId: string; content: any }> = [];

      // 处理每个匹配的块
      for (const result of searchResults) {
        totalMatches += result.matches.length;

        if (maxReplacements && replacedCount >= maxReplacements) {
          break;
        }

        // 执行文本替换
        let newContent = result.content;
        const search = caseSensitive ? searchText : new RegExp(this.escapeRegExp(searchText), 'gi');
        
        if (wholeWord) {
          const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(searchText)}\\b`, caseSensitive ? 'g' : 'gi');
          const matches = newContent.match(wordBoundaryRegex);
          if (matches) {
            newContent = newContent.replace(wordBoundaryRegex, replaceText);
            replacedCount += matches.length;
          }
        } else {
          if (typeof search === 'string') {
            const matches = newContent.split(search).length - 1;
            newContent = newContent.replace(new RegExp(this.escapeRegExp(search), 'g'), replaceText);
            replacedCount += matches;
          } else {
            const matches = newContent.match(search);
            if (matches) {
              newContent = newContent.replace(search, replaceText);
              replacedCount += matches.length;
            }
          }
        }

        // 准备更新内容
        updates.push({
          blockId: result.blockId,
          content: {
            text: {
              content: newContent,
            },
          },
        });

        if (maxReplacements && replacedCount >= maxReplacements) {
          break;
        }
      }

      // 批量更新文档
      if (updates.length > 0) {
        await feishuClient.batchUpdateDocumentBlocks(documentId, updates, accessToken);
      }

      return {
        success: true,
        replacedCount,
        totalMatches,
      };
    } catch (error) {
      console.error('Error replacing text in document:', error);
      return {
        success: false,
        replacedCount: 0,
        totalMatches: 0,
        error: error instanceof Error ? error.message : '替换文本时发生未知错误',
      };
    }
  }

  /**
   * 批量替换文档中的文本
   */
  async batchReplaceTextInDocument(
    documentId: string,
    accessToken: string,
    replacements: Array<{
      searchText: string;
      replaceText: string;
      caseSensitive?: boolean;
      wholeWord?: boolean;
    }>
  ): Promise<Array<{
    searchText: string;
    replaceText: string;
    success: boolean;
    replacedCount: number;
    totalMatches: number;
    error?: string;
  }>> {
    const results = [];

    for (const replacement of replacements) {
      const result = await this.replaceTextInDocument(
        documentId,
        accessToken,
        replacement.searchText,
        replacement.replaceText,
        {
          caseSensitive: replacement.caseSensitive,
          wholeWord: replacement.wholeWord,
        }
      );

      results.push({
        searchText: replacement.searchText,
        replaceText: replacement.replaceText,
        ...result,
      });
    }

    return results;
  }

  /**
   * 预览替换结果（不实际执行替换）
   */
  async previewReplacement(
    documentId: string,
    accessToken: string,
    searchText: string,
    replaceText: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
    } = {}
  ): Promise<Array<{
    blockId: string;
    blockType: string;
    originalContent: string;
    previewContent: string;
    matchCount: number;
  }>> {
    try {
      const { caseSensitive = false, wholeWord = false } = options;

      // 获取文档内容
      const documentContent = await this.getDocumentContent(documentId, accessToken);
      
      // 搜索需要替换的文本
      const searchResults = this.searchTextInDocument(documentContent.blocks, searchText, caseSensitive);
      
      const previews = searchResults.map(result => {
        let previewContent = result.content;
        
        if (wholeWord) {
          const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(searchText)}\\b`, caseSensitive ? 'g' : 'gi');
          previewContent = previewContent.replace(wordBoundaryRegex, replaceText);
        } else {
          const search = caseSensitive ? searchText : new RegExp(this.escapeRegExp(searchText), 'gi');
          previewContent = previewContent.replace(search, replaceText);
        }

        return {
          blockId: result.blockId,
          blockType: result.blockType,
          originalContent: result.content,
          previewContent,
          matchCount: result.matches.length,
        };
      });

      return previews;
    } catch (error) {
      console.error('Error previewing replacement:', error);
      throw new Error('预览替换结果失败');
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 解析文档内容结构
   */
  parseDocumentStructure(blocks: DocumentBlock[]): {
    totalBlocks: number;
    textBlocks: number;
    imageBlocks: number;
    tableBlocks: number;
    otherBlocks: number;
    structure: Array<{
      blockId: string;
      type: string;
      level: number;
      content?: string;
      children: number;
    }>;
  } {
    const structure: Array<{
      blockId: string;
      type: string;
      level: number;
      content?: string;
      children: number;
    }> = [];

    let totalBlocks = 0;
    let textBlocks = 0;
    let imageBlocks = 0;
    let tableBlocks = 0;
    let otherBlocks = 0;

    const parseBlocks = (blockList: DocumentBlock[], level: number = 0) => {
      blockList.forEach(block => {
        totalBlocks++;

        // 统计不同类型的块
        switch (block.block_type) {
          case 'text':
          case 'heading1':
          case 'heading2':
          case 'heading3':
          case 'heading4':
          case 'heading5':
          case 'heading6':
          case 'paragraph':
            textBlocks++;
            break;
          case 'image':
            imageBlocks++;
            break;
          case 'table':
            tableBlocks++;
            break;
          default:
            otherBlocks++;
        }

        // 添加到结构中
        structure.push({
          blockId: block.block_id,
          type: block.block_type,
          level,
          content: block.text?.content,
          children: block.children ? block.children.length : 0,
        });

        // 递归处理子块
        if (block.children && block.children.length > 0) {
          parseBlocks(block.children, level + 1);
        }
      });
    };

    parseBlocks(blocks);

    return {
      totalBlocks,
      textBlocks,
      imageBlocks,
      tableBlocks,
      otherBlocks,
      structure,
    };
  }

  /**
   * 提取文档中的所有文本内容
   */
  extractAllText(blocks: DocumentBlock[]): string {
    const textParts: string[] = [];

    const extractFromBlocks = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (block.text?.content) {
          textParts.push(block.text.content);
        }

        // 递归处理子块
        if (block.children && block.children.length > 0) {
          extractFromBlocks(block.children);
        }
      });
    };

    extractFromBlocks(blocks);
    return textParts.join('\n');
  }

  /**
   * 按块类型分组内容
   */
  groupBlocksByType(blocks: DocumentBlock[]): Record<string, DocumentBlock[]> {
    const groups: Record<string, DocumentBlock[]> = {};

    const groupBlocks = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (!groups[block.block_type]) {
          groups[block.block_type] = [];
        }
        groups[block.block_type].push(block);

        // 递归处理子块
        if (block.children && block.children.length > 0) {
          groupBlocks(block.children);
        }
      });
    };

    groupBlocks(blocks);
    return groups;
  }

  /**
   * 查找特定类型的块
   */
  findBlocksByType(blocks: DocumentBlock[], blockType: string): DocumentBlock[] {
    const results: DocumentBlock[] = [];

    const searchBlocks = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (block.block_type === blockType) {
          results.push(block);
        }

        // 递归搜索子块
        if (block.children && block.children.length > 0) {
          searchBlocks(block.children);
        }
      });
    };

    searchBlocks(blocks);
    return results;
  }

  /**
   * 查找包含特定文本的块
   */
  findBlocksWithText(blocks: DocumentBlock[], searchText: string, caseSensitive: boolean = false): DocumentBlock[] {
    const results: DocumentBlock[] = [];
    const search = caseSensitive ? searchText : searchText.toLowerCase();

    const searchBlocks = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (block.text?.content) {
          const content = caseSensitive ? block.text.content : block.text.content.toLowerCase();
          if (content.includes(search)) {
            results.push(block);
          }
        }

        // 递归搜索子块
        if (block.children && block.children.length > 0) {
          searchBlocks(block.children);
        }
      });
    };

    searchBlocks(blocks);
    return results;
  }

  /**
   * 获取文档大纲（标题结构）
   */
  getDocumentOutline(blocks: DocumentBlock[]): Array<{
    blockId: string;
    level: number;
    title: string;
    children: Array<any>;
  }> {
    const outline: Array<{
      blockId: string;
      level: number;
      title: string;
      children: Array<any>;
    }> = [];

    const headingTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'];

    const buildOutline = (blockList: DocumentBlock[]) => {
      blockList.forEach(block => {
        if (headingTypes.includes(block.block_type) && block.text?.content) {
          const level = parseInt(block.block_type.replace('heading', ''));
          outline.push({
            blockId: block.block_id,
            level,
            title: block.text.content,
            children: [],
          });
        }

        // 递归处理子块
        if (block.children && block.children.length > 0) {
          buildOutline(block.children);
        }
      });
    };

    buildOutline(blocks);
    return outline;
  }

  /**
   * 验证文档内容完整性
   */
  validateDocumentContent(content: DocumentContent): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      totalBlocks: number;
      emptyBlocks: number;
      textBlocks: number;
      hasTitle: boolean;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本验证
    if (!content.document) {
      errors.push('缺少文档基本信息');
    }

    if (!content.blocks || !Array.isArray(content.blocks)) {
      errors.push('缺少文档内容块');
      return {
        isValid: false,
        errors,
        warnings,
        statistics: {
          totalBlocks: 0,
          emptyBlocks: 0,
          textBlocks: 0,
          hasTitle: false,
        },
      };
    }

    // 统计信息
    const structure = this.parseDocumentStructure(content.blocks);
    const emptyBlocks = content.blocks.filter(block =>
      !block.text?.content || block.text.content.trim() === ''
    ).length;

    const hasTitle = content.blocks.some(block =>
      ['heading1', 'heading2'].includes(block.block_type) &&
      block.text?.content &&
      block.text.content.trim() !== ''
    );

    // 警告检查
    if (structure.totalBlocks === 0) {
      warnings.push('文档内容为空');
    }

    if (emptyBlocks > structure.totalBlocks * 0.3) {
      warnings.push('文档中空白内容块较多');
    }

    if (!hasTitle) {
      warnings.push('文档缺少标题');
    }

    if (structure.textBlocks === 0) {
      warnings.push('文档中没有文本内容');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalBlocks: structure.totalBlocks,
        emptyBlocks,
        textBlocks: structure.textBlocks,
        hasTitle,
      },
    };
  }
}

/**
 * 默认文档服务实例
 */
export const documentService = DocumentService.getInstance();
