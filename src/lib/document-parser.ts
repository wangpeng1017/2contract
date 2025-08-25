import { DocumentBlock, FeishuDocument } from '@/types';

/**
 * 文档块类型枚举
 */
export enum BlockType {
  TEXT = 'text',
  PARAGRAPH = 'paragraph',
  HEADING1 = 'heading1',
  HEADING2 = 'heading2',
  HEADING3 = 'heading3',
  HEADING4 = 'heading4',
  HEADING5 = 'heading5',
  HEADING6 = 'heading6',
  BULLET_LIST = 'bullet_list',
  ORDERED_LIST = 'ordered_list',
  LIST_ITEM = 'list_item',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  IMAGE = 'image',
  DIVIDER = 'divider',
  QUOTE = 'quote',
  CODE = 'code',
  CALLOUT = 'callout',
  EMBED = 'embed',
  FILE = 'file',
  EQUATION = 'equation',
  UNKNOWN = 'unknown'
}

/**
 * 解析后的文档块结构
 */
export interface ParsedBlock {
  id: string;
  type: BlockType;
  content: string;
  level: number;
  parent?: string;
  children: ParsedBlock[];
  metadata: {
    style?: any;
    attributes?: Record<string, any>;
    position: {
      start: number;
      end: number;
    };
  };
}

/**
 * 表格结构
 */
export interface TableStructure {
  id: string;
  rows: number;
  columns: number;
  headers: string[];
  data: string[][];
  metadata: {
    hasHeader: boolean;
    cellStyles?: any[][];
  };
}

/**
 * 列表结构
 */
export interface ListStructure {
  id: string;
  type: 'bullet' | 'ordered';
  items: Array<{
    id: string;
    content: string;
    level: number;
    children: ListStructure[];
  }>;
}

/**
 * 文档结构化数据
 */
export interface DocumentStructure {
  document: FeishuDocument;
  blocks: ParsedBlock[];
  outline: Array<{
    id: string;
    level: number;
    title: string;
    children: any[];
  }>;
  tables: TableStructure[];
  lists: ListStructure[];
  images: Array<{
    id: string;
    url?: string;
    alt?: string;
    caption?: string;
  }>;
  statistics: {
    totalBlocks: number;
    textBlocks: number;
    headings: number;
    tables: number;
    lists: number;
    images: number;
    wordCount: number;
    characterCount: number;
  };
}

/**
 * 高级文档解析器
 */
export class DocumentParser {
  /**
   * 解析文档内容为结构化数据
   */
  static parseDocument(document: FeishuDocument, blocks: DocumentBlock[]): DocumentStructure {
    const parsedBlocks = this.parseBlocks(blocks);
    const outline = this.extractOutline(parsedBlocks);
    const tables = this.extractTables(parsedBlocks);
    const lists = this.extractLists(parsedBlocks);
    const images = this.extractImages(parsedBlocks);
    const statistics = this.calculateStatistics(parsedBlocks);

    return {
      document,
      blocks: parsedBlocks,
      outline,
      tables,
      lists,
      images,
      statistics,
    };
  }

  /**
   * 解析文档块
   */
  private static parseBlocks(blocks: DocumentBlock[], level: number = 0, parent?: string): ParsedBlock[] {
    const parsedBlocks: ParsedBlock[] = [];
    let position = 0;

    blocks.forEach((block, index) => {
      const startPosition = position;
      const content = this.extractBlockContent(block);
      const endPosition = startPosition + content.length;

      const parsedBlock: ParsedBlock = {
        id: block.block_id,
        type: this.normalizeBlockType(block.block_type),
        content,
        level,
        parent,
        children: [],
        metadata: {
          style: block.text?.style,
          attributes: this.extractBlockAttributes(block),
          position: {
            start: startPosition,
            end: endPosition,
          },
        },
      };

      // 递归解析子块
      if (block.children && block.children.length > 0) {
        parsedBlock.children = this.parseBlocks(block.children, level + 1, block.block_id);
      }

      parsedBlocks.push(parsedBlock);
      position = endPosition + 1; // +1 for newline
    });

    return parsedBlocks;
  }

  /**
   * 标准化块类型
   */
  private static normalizeBlockType(blockType: string): BlockType {
    const typeMap: Record<string, BlockType> = {
      text: BlockType.TEXT,
      paragraph: BlockType.PARAGRAPH,
      heading1: BlockType.HEADING1,
      heading2: BlockType.HEADING2,
      heading3: BlockType.HEADING3,
      heading4: BlockType.HEADING4,
      heading5: BlockType.HEADING5,
      heading6: BlockType.HEADING6,
      bullet_list: BlockType.BULLET_LIST,
      ordered_list: BlockType.ORDERED_LIST,
      list_item: BlockType.LIST_ITEM,
      table: BlockType.TABLE,
      table_row: BlockType.TABLE_ROW,
      table_cell: BlockType.TABLE_CELL,
      image: BlockType.IMAGE,
      divider: BlockType.DIVIDER,
      quote: BlockType.QUOTE,
      code: BlockType.CODE,
      callout: BlockType.CALLOUT,
      embed: BlockType.EMBED,
      file: BlockType.FILE,
      equation: BlockType.EQUATION,
    };

    return typeMap[blockType] || BlockType.UNKNOWN;
  }

  /**
   * 提取块内容
   */
  private static extractBlockContent(block: DocumentBlock): string {
    if (block.text?.content) {
      return block.text.content;
    }

    // 对于特殊块类型，提取相应的内容
    switch (block.block_type) {
      case 'image':
        return `[图片: ${block.block_id}]`;
      case 'table':
        return `[表格: ${block.block_id}]`;
      case 'divider':
        return '---';
      case 'file':
        return `[文件: ${block.block_id}]`;
      default:
        return '';
    }
  }

  /**
   * 提取块属性
   */
  private static extractBlockAttributes(block: DocumentBlock): Record<string, any> {
    const attributes: Record<string, any> = {};

    // 提取文本样式属性
    if (block.text?.style) {
      attributes.textStyle = block.text.style;
    }

    // 根据块类型提取特定属性
    switch (block.block_type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'heading4':
      case 'heading5':
      case 'heading6':
        attributes.headingLevel = parseInt(block.block_type.replace('heading', ''));
        break;
      case 'list_item':
        attributes.listLevel = this.calculateListLevel(block);
        break;
    }

    return attributes;
  }

  /**
   * 计算列表层级
   */
  private static calculateListLevel(block: DocumentBlock): number {
    // 这里需要根据实际的飞书API响应结构来实现
    // 暂时返回默认值
    return 1;
  }

  /**
   * 提取文档大纲
   */
  private static extractOutline(blocks: ParsedBlock[]): Array<{
    id: string;
    level: number;
    title: string;
    children: any[];
  }> {
    const outline: Array<{
      id: string;
      level: number;
      title: string;
      children: any[];
    }> = [];

    const headingTypes = [
      BlockType.HEADING1,
      BlockType.HEADING2,
      BlockType.HEADING3,
      BlockType.HEADING4,
      BlockType.HEADING5,
      BlockType.HEADING6,
    ];

    const processBlocks = (blockList: ParsedBlock[]) => {
      blockList.forEach(block => {
        if (headingTypes.includes(block.type) && block.content.trim()) {
          const level = block.metadata.attributes?.headingLevel || 1;
          outline.push({
            id: block.id,
            level,
            title: block.content,
            children: [],
          });
        }

        // 递归处理子块
        if (block.children.length > 0) {
          processBlocks(block.children);
        }
      });
    };

    processBlocks(blocks);
    return this.buildHierarchicalOutline(outline);
  }

  /**
   * 构建层级大纲
   */
  private static buildHierarchicalOutline(flatOutline: any[]): any[] {
    const result: any[] = [];
    const stack: any[] = [];

    flatOutline.forEach(item => {
      // 找到合适的父级
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(item);
      } else {
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    });

    return result;
  }

  /**
   * 提取表格结构
   */
  private static extractTables(blocks: ParsedBlock[]): TableStructure[] {
    const tables: TableStructure[] = [];

    const processBlocks = (blockList: ParsedBlock[]) => {
      blockList.forEach(block => {
        if (block.type === BlockType.TABLE) {
          const tableStructure = this.parseTableStructure(block);
          if (tableStructure) {
            tables.push(tableStructure);
          }
        }

        // 递归处理子块
        if (block.children.length > 0) {
          processBlocks(block.children);
        }
      });
    };

    processBlocks(blocks);
    return tables;
  }

  /**
   * 解析表格结构
   */
  private static parseTableStructure(tableBlock: ParsedBlock): TableStructure | null {
    const rows = tableBlock.children.filter(child => child.type === BlockType.TABLE_ROW);
    
    if (rows.length === 0) {
      return null;
    }

    const data: string[][] = [];
    let maxColumns = 0;

    rows.forEach(row => {
      const cells = row.children.filter(child => child.type === BlockType.TABLE_CELL);
      const rowData = cells.map(cell => cell.content);
      data.push(rowData);
      maxColumns = Math.max(maxColumns, rowData.length);
    });

    const hasHeader = data.length > 0;
    const headers = hasHeader ? data[0] : [];

    return {
      id: tableBlock.id,
      rows: data.length,
      columns: maxColumns,
      headers,
      data: hasHeader ? data.slice(1) : data,
      metadata: {
        hasHeader,
      },
    };
  }

  /**
   * 提取列表结构
   */
  private static extractLists(blocks: ParsedBlock[]): ListStructure[] {
    const lists: ListStructure[] = [];

    const processBlocks = (blockList: ParsedBlock[]) => {
      blockList.forEach(block => {
        if (block.type === BlockType.BULLET_LIST || block.type === BlockType.ORDERED_LIST) {
          const listStructure = this.parseListStructure(block);
          if (listStructure) {
            lists.push(listStructure);
          }
        }

        // 递归处理子块
        if (block.children.length > 0) {
          processBlocks(block.children);
        }
      });
    };

    processBlocks(blocks);
    return lists;
  }

  /**
   * 解析列表结构
   */
  private static parseListStructure(listBlock: ParsedBlock): ListStructure | null {
    const items = listBlock.children.filter(child => child.type === BlockType.LIST_ITEM);
    
    if (items.length === 0) {
      return null;
    }

    return {
      id: listBlock.id,
      type: listBlock.type === BlockType.BULLET_LIST ? 'bullet' : 'ordered',
      items: items.map(item => ({
        id: item.id,
        content: item.content,
        level: item.metadata.attributes?.listLevel || 1,
        children: [], // 可以进一步递归解析嵌套列表
      })),
    };
  }

  /**
   * 提取图片信息
   */
  private static extractImages(blocks: ParsedBlock[]): Array<{
    id: string;
    url?: string;
    alt?: string;
    caption?: string;
  }> {
    const images: Array<{
      id: string;
      url?: string;
      alt?: string;
      caption?: string;
    }> = [];

    const processBlocks = (blockList: ParsedBlock[]) => {
      blockList.forEach(block => {
        if (block.type === BlockType.IMAGE) {
          images.push({
            id: block.id,
            url: block.metadata.attributes?.url,
            alt: block.metadata.attributes?.alt,
            caption: block.content,
          });
        }

        // 递归处理子块
        if (block.children.length > 0) {
          processBlocks(block.children);
        }
      });
    };

    processBlocks(blocks);
    return images;
  }

  /**
   * 计算文档统计信息
   */
  private static calculateStatistics(blocks: ParsedBlock[]): {
    totalBlocks: number;
    textBlocks: number;
    headings: number;
    tables: number;
    lists: number;
    images: number;
    wordCount: number;
    characterCount: number;
  } {
    let totalBlocks = 0;
    let textBlocks = 0;
    let headings = 0;
    let tables = 0;
    let lists = 0;
    let images = 0;
    let wordCount = 0;
    let characterCount = 0;

    const processBlocks = (blockList: ParsedBlock[]) => {
      blockList.forEach(block => {
        totalBlocks++;

        switch (block.type) {
          case BlockType.TEXT:
          case BlockType.PARAGRAPH:
            textBlocks++;
            break;
          case BlockType.HEADING1:
          case BlockType.HEADING2:
          case BlockType.HEADING3:
          case BlockType.HEADING4:
          case BlockType.HEADING5:
          case BlockType.HEADING6:
            headings++;
            textBlocks++;
            break;
          case BlockType.TABLE:
            tables++;
            break;
          case BlockType.BULLET_LIST:
          case BlockType.ORDERED_LIST:
            lists++;
            break;
          case BlockType.IMAGE:
            images++;
            break;
        }

        // 计算文字统计
        if (block.content) {
          characterCount += block.content.length;
          wordCount += this.countWords(block.content);
        }

        // 递归处理子块
        if (block.children.length > 0) {
          processBlocks(block.children);
        }
      });
    };

    processBlocks(blocks);

    return {
      totalBlocks,
      textBlocks,
      headings,
      tables,
      lists,
      images,
      wordCount,
      characterCount,
    };
  }

  /**
   * 计算单词数
   */
  private static countWords(text: string): number {
    // 中英文混合文本的单词计算
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];

    return chineseChars.length + englishWords.length;
  }

  /**
   * 在结构化文档中搜索文本
   */
  static searchInStructure(
    structure: DocumentStructure,
    searchText: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      includeTypes?: BlockType[];
      excludeTypes?: BlockType[];
    } = {}
  ): Array<{
    blockId: string;
    blockType: BlockType;
    content: string;
    matches: Array<{
      start: number;
      end: number;
      text: string;
      context: string;
    }>;
    path: string[];
  }> {
    const results: Array<{
      blockId: string;
      blockType: BlockType;
      content: string;
      matches: Array<{
        start: number;
        end: number;
        text: string;
        context: string;
      }>;
      path: string[];
    }> = [];

    const search = options.caseSensitive ? searchText : searchText.toLowerCase();

    const searchInBlocks = (blocks: ParsedBlock[], path: string[] = []) => {
      blocks.forEach(block => {
        // 检查是否应该搜索此类型的块
        if (options.includeTypes && !options.includeTypes.includes(block.type)) {
          return;
        }
        if (options.excludeTypes && options.excludeTypes.includes(block.type)) {
          return;
        }

        const content = options.caseSensitive ? block.content : block.content.toLowerCase();
        const matches: Array<{
          start: number;
          end: number;
          text: string;
          context: string;
        }> = [];

        if (options.wholeWord) {
          const regex = new RegExp(`\\b${this.escapeRegExp(search)}\\b`, 'g');
          let match;
          while ((match = regex.exec(content)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
              context: this.getContext(block.content, match.index, 50),
            });
          }
        } else {
          let index = content.indexOf(search);
          while (index !== -1) {
            matches.push({
              start: index,
              end: index + search.length,
              text: block.content.substring(index, index + search.length),
              context: this.getContext(block.content, index, 50),
            });
            index = content.indexOf(search, index + 1);
          }
        }

        if (matches.length > 0) {
          results.push({
            blockId: block.id,
            blockType: block.type,
            content: block.content,
            matches,
            path: [...path, block.id],
          });
        }

        // 递归搜索子块
        if (block.children.length > 0) {
          searchInBlocks(block.children, [...path, block.id]);
        }
      });
    };

    searchInBlocks(structure.blocks);
    return results;
  }

  /**
   * 获取文本上下文
   */
  private static getContext(text: string, position: number, contextLength: number): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }

  /**
   * 转义正则表达式特殊字符
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取块的完整路径
   */
  static getBlockPath(structure: DocumentStructure, blockId: string): string[] {
    const path: string[] = [];

    const findPath = (blocks: ParsedBlock[], currentPath: string[] = []): boolean => {
      for (const block of blocks) {
        const newPath = [...currentPath, block.id];

        if (block.id === blockId) {
          path.push(...newPath);
          return true;
        }

        if (block.children.length > 0 && findPath(block.children, newPath)) {
          return true;
        }
      }
      return false;
    };

    findPath(structure.blocks);
    return path;
  }

  /**
   * 根据路径获取块
   */
  static getBlockByPath(structure: DocumentStructure, path: string[]): ParsedBlock | null {
    if (path.length === 0) return null;

    let currentBlocks = structure.blocks;
    let currentBlock: ParsedBlock | null = null;

    for (const blockId of path) {
      currentBlock = currentBlocks.find(block => block.id === blockId) || null;
      if (!currentBlock) return null;
      currentBlocks = currentBlock.children;
    }

    return currentBlock;
  }

  /**
   * 提取表格数据为CSV格式
   */
  static tableToCSV(table: TableStructure): string {
    const rows: string[] = [];

    // 添加表头
    if (table.metadata.hasHeader && table.headers.length > 0) {
      rows.push(table.headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
    }

    // 添加数据行
    table.data.forEach(row => {
      rows.push(row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));
    });

    return rows.join('\n');
  }

  /**
   * 提取列表为纯文本
   */
  static listToText(list: ListStructure, indent: string = '  '): string {
    const lines: string[] = [];

    list.items.forEach((item, index) => {
      const prefix = list.type === 'ordered' ? `${index + 1}. ` : '• ';
      const indentation = indent.repeat(item.level - 1);
      lines.push(`${indentation}${prefix}${item.content}`);

      // 递归处理子列表
      item.children.forEach(childList => {
        lines.push(this.listToText(childList, indent));
      });
    });

    return lines.join('\n');
  }
}
