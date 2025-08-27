/**
 * 文本搜索和匹配算法库
 */

export interface SearchMatch {
  start: number;
  end: number;
  text: string;
  context?: {
    before: string;
    after: string;
  };
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  maxMatches?: number;
  contextLength?: number;
}

export interface FuzzySearchOptions extends SearchOptions {
  threshold?: number; // 相似度阈值 (0-1)
  maxDistance?: number; // 最大编辑距离
}

/**
 * 文本搜索引擎类
 */
export class TextSearchEngine {
  /**
   * 精确文本搜索
   */
  static exactSearch(text: string, pattern: string, options: SearchOptions = {}): SearchMatch[] {
    const {
      caseSensitive = false,
      wholeWord = false,
      maxMatches,
      contextLength = 50
    } = options;

    const matches: SearchMatch[] = [];
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

    if (wholeWord) {
      // 使用正则表达式进行全词匹配
      try {
        // 对于中文文本，使用更灵活的边界匹配
        const isChinese = /[\u4e00-\u9fff]/.test(searchPattern);
        let regex;

        if (isChinese) {
          // 中文整词匹配：前后不能是中文字符、字母或数字
          regex = new RegExp(`(?<![\\u4e00-\\u9fff\\w])${this.escapeRegExp(searchPattern)}(?![\\u4e00-\\u9fff\\w])`, caseSensitive ? 'g' : 'gi');
        } else {
          // 英文整词匹配：使用标准词边界
          regex = new RegExp(`\\b${this.escapeRegExp(searchPattern)}\\b`, caseSensitive ? 'g' : 'gi');
        }

        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            context: this.getContext(text, match.index, match[0].length, contextLength)
          });

          if (maxMatches && matches.length >= maxMatches) break;
        }
      } catch (error) {
        console.warn('Whole word regex failed, falling back to exact search:', error);
        // 如果正则表达式失败，回退到精确搜索
        return this.exactSearch(text, pattern, { ...options, wholeWord: false });
      }
    } else {
      // 简单字符串搜索
      let startIndex = 0;
      
      while (startIndex < searchText.length) {
        const index = searchText.indexOf(searchPattern, startIndex);
        if (index === -1) break;

        matches.push({
          start: index,
          end: index + pattern.length,
          text: text.substring(index, index + pattern.length),
          context: this.getContext(text, index, pattern.length, contextLength)
        });

        startIndex = index + 1;
        if (maxMatches && matches.length >= maxMatches) break;
      }
    }

    return matches;
  }

  /**
   * 正则表达式搜索
   */
  static regexSearch(text: string, pattern: string, options: SearchOptions = {}): SearchMatch[] {
    const {
      caseSensitive = false,
      maxMatches,
      contextLength = 50
    } = options;

    const matches: SearchMatch[] = [];
    
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          context: this.getContext(text, match.index, match[0].length, contextLength)
        });

        if (maxMatches && matches.length >= maxMatches) break;
        
        // 防止无限循环
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } catch (error) {
      console.error('Regex search error:', error);
      throw new Error('无效的正则表达式');
    }

    return matches;
  }

  /**
   * 模糊搜索（基于编辑距离）
   */
  static fuzzySearch(text: string, pattern: string, options: FuzzySearchOptions = {}): SearchMatch[] {
    const {
      caseSensitive = false,
      threshold = 0.6,
      maxDistance = 3,
      maxMatches,
      contextLength = 50
    } = options;

    const matches: SearchMatch[] = [];
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

    // 使用滑动窗口进行模糊匹配
    const windowSize = Math.max(pattern.length, Math.floor(pattern.length * 1.5));
    
    for (let i = 0; i <= text.length - pattern.length; i++) {
      const window = searchText.substring(i, i + windowSize);
      const similarity = this.calculateSimilarity(searchPattern, window);
      
      if (similarity >= threshold) {
        const distance = this.levenshteinDistance(searchPattern, window);
        
        if (distance <= maxDistance) {
          matches.push({
            start: i,
            end: i + windowSize,
            text: text.substring(i, i + windowSize),
            context: this.getContext(text, i, windowSize, contextLength)
          });

          if (maxMatches && matches.length >= maxMatches) break;
        }
      }
    }

    return matches;
  }

  /**
   * 多模式搜索（同时搜索多个模式）
   */
  static multiPatternSearch(text: string, patterns: string[], options: SearchOptions = {}): Map<string, SearchMatch[]> {
    const results = new Map<string, SearchMatch[]>();

    patterns.forEach(pattern => {
      if (options.useRegex) {
        results.set(pattern, this.regexSearch(text, pattern, options));
      } else {
        results.set(pattern, this.exactSearch(text, pattern, options));
      }
    });

    return results;
  }

  /**
   * 智能搜索（结合精确和模糊搜索）
   */
  static smartSearch(text: string, pattern: string, options: FuzzySearchOptions = {}): SearchMatch[] {
    // 首先尝试精确搜索
    const exactMatches = this.exactSearch(text, pattern, options);
    
    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // 如果没有精确匹配，尝试模糊搜索
    return this.fuzzySearch(text, pattern, options);
  }

  /**
   * 计算两个字符串的相似度（Jaro-Winkler算法）
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // 找到匹配的字符
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // 计算转置
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler修正
    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * 计算编辑距离（Levenshtein距离）
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // 删除
          matrix[j - 1][i] + 1,     // 插入
          matrix[j - 1][i - 1] + indicator  // 替换
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 获取匹配文本的上下文
   */
  private static getContext(text: string, start: number, length: number, contextLength: number): {
    before: string;
    after: string;
  } {
    const beforeStart = Math.max(0, start - contextLength);
    const afterEnd = Math.min(text.length, start + length + contextLength);

    return {
      before: text.substring(beforeStart, start),
      after: text.substring(start + length, afterEnd)
    };
  }

  /**
   * 转义正则表达式特殊字符
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 高亮显示搜索结果
   */
  static highlightMatches(text: string, matches: SearchMatch[], highlightClass: string = 'highlight'): string {
    if (matches.length === 0) return text;

    // 按位置排序
    const sortedMatches = matches.sort((a, b) => a.start - b.start);
    let result = '';
    let lastEnd = 0;

    sortedMatches.forEach(match => {
      // 添加匹配前的文本
      result += text.substring(lastEnd, match.start);
      // 添加高亮的匹配文本
      result += `<span class="${highlightClass}">${match.text}</span>`;
      lastEnd = match.end;
    });

    // 添加最后的文本
    result += text.substring(lastEnd);
    return result;
  }
}
