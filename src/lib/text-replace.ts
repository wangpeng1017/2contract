import { TextSearchEngine, SearchMatch, SearchOptions } from './text-search';

export interface ReplaceRule {
  id: string;
  searchText: string;
  replaceText: string;
  fieldType?: string; // 字段类型标注，如"甲方公司"、"乙方公司"等
  options?: SearchOptions & {
    enabled?: boolean;
    priority?: number;
  };
}

export interface ReplaceResult {
  ruleId: string;
  searchText: string;
  replaceText: string;
  matches: SearchMatch[];
  replacedCount: number;
  success: boolean;
  error?: string;
  executionTime: number;
}

export interface BatchReplaceResult {
  originalText: string;
  finalText: string;
  results: ReplaceResult[];
  totalReplacements: number;
  totalMatches: number;
  executionTime: number;
  success: boolean;
  errors: string[];
}

export interface ReplaceOptions {
  dryRun?: boolean; // 仅预览，不实际替换
  stopOnError?: boolean; // 遇到错误时停止
  maxReplacements?: number; // 最大替换次数
  conflictResolution?: 'first' | 'last' | 'priority' | 'skip'; // 冲突解决策略
}

/**
 * 文本替换引擎类
 */
export class TextReplaceEngine {
  /**
   * 单个规则替换
   */
  static replaceText(text: string, rule: ReplaceRule): ReplaceResult {
    const startTime = Date.now();
    const result: ReplaceResult = {
      ruleId: rule.id,
      searchText: rule.searchText,
      replaceText: rule.replaceText,
      matches: [],
      replacedCount: 0,
      success: false,
      executionTime: 0
    };

    try {
      // 检查规则是否启用
      if (rule.options?.enabled === false) {
        result.success = true;
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // 搜索匹配项
      const searchOptions = {
        ...rule.options,
        maxMatches: rule.options?.maxMatches
      };

      if (rule.options?.useRegex) {
        result.matches = TextSearchEngine.regexSearch(text, rule.searchText, searchOptions);
      } else {
        result.matches = TextSearchEngine.exactSearch(text, rule.searchText, searchOptions);
      }

      result.replacedCount = result.matches.length;
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : '替换过程中发生未知错误';
      result.success = false;
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * 批量替换
   */
  static batchReplace(text: string, rules: ReplaceRule[], options: ReplaceOptions = {}): BatchReplaceResult {
    const startTime = Date.now();
    const result: BatchReplaceResult = {
      originalText: text,
      finalText: text,
      results: [],
      totalReplacements: 0,
      totalMatches: 0,
      executionTime: 0,
      success: true,
      errors: []
    };

    try {
      // 过滤和排序规则
      const activeRules = this.prepareRules(rules, options);
      
      if (activeRules.length === 0) {
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // 检测规则冲突
      const conflicts = this.detectConflicts(text, activeRules);
      const resolvedRules = this.resolveConflicts(activeRules, conflicts, options.conflictResolution || 'first');

      let currentText = text;
      let totalReplacements = 0;

      // 执行替换
      for (const rule of resolvedRules) {
        if (options.maxReplacements && totalReplacements >= options.maxReplacements) {
          break;
        }

        const replaceResult = this.replaceText(currentText, rule);
        result.results.push(replaceResult);
        result.totalMatches += replaceResult.matches.length;

        if (!replaceResult.success) {
          result.errors.push(`规则 ${rule.id} 执行失败: ${replaceResult.error}`);
          
          if (options.stopOnError) {
            result.success = false;
            break;
          }
          continue;
        }

        // 如果不是预览模式，执行实际替换
        if (!options.dryRun && replaceResult.matches.length > 0) {
          currentText = this.applyReplacements(currentText, replaceResult.matches, rule.replaceText);
          totalReplacements += replaceResult.replacedCount;
        }
      }

      result.finalText = currentText;
      result.totalReplacements = totalReplacements;
      result.success = result.errors.length === 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量替换过程中发生未知错误';
      result.success = false;
      result.errors.push(errorMessage);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * 智能替换（使用AI辅助）
   */
  static async smartReplace(
    text: string, 
    rules: ReplaceRule[], 
    options: ReplaceOptions & { aiProvider?: 'gemini' | 'openai' } = {}
  ): Promise<BatchReplaceResult> {
    // 首先执行常规批量替换
    const basicResult = this.batchReplace(text, rules, { ...options, dryRun: true });

    // 如果有AI提供商，使用AI优化替换结果
    if (options.aiProvider && basicResult.results.some(r => r.matches.length === 0)) {
      try {
        const aiEnhancedRules = await this.enhanceRulesWithAI(text, rules, options.aiProvider);
        return this.batchReplace(text, aiEnhancedRules, options);
      } catch (error) {
        console.warn('AI增强替换失败，使用基础替换:', error);
      }
    }

    // 如果不是预览模式，执行实际替换
    if (!options.dryRun) {
      return this.batchReplace(text, rules, { ...options, dryRun: false });
    }

    return basicResult;
  }

  /**
   * 准备和排序规则
   */
  private static prepareRules(rules: ReplaceRule[], options: ReplaceOptions): ReplaceRule[] {
    return rules
      .filter(rule => rule.options?.enabled !== false)
      .sort((a, b) => {
        // 按优先级排序（数字越小优先级越高）
        const priorityA = a.options?.priority || 0;
        const priorityB = b.options?.priority || 0;
        return priorityA - priorityB;
      });
  }

  /**
   * 检测规则冲突
   */
  private static detectConflicts(text: string, rules: ReplaceRule[]): Array<{
    rule1: ReplaceRule;
    rule2: ReplaceRule;
    overlaps: Array<{ start: number; end: number }>;
  }> {
    const conflicts = [];
    
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        
        const matches1 = TextSearchEngine.exactSearch(text, rule1.searchText, rule1.options);
        const matches2 = TextSearchEngine.exactSearch(text, rule2.searchText, rule2.options);
        
        const overlaps = this.findOverlaps(matches1, matches2);
        
        if (overlaps.length > 0) {
          conflicts.push({ rule1, rule2, overlaps });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 查找重叠区域
   */
  private static findOverlaps(matches1: SearchMatch[], matches2: SearchMatch[]): Array<{ start: number; end: number }> {
    const overlaps = [];
    
    for (const match1 of matches1) {
      for (const match2 of matches2) {
        if (match1.start < match2.end && match2.start < match1.end) {
          overlaps.push({
            start: Math.max(match1.start, match2.start),
            end: Math.min(match1.end, match2.end)
          });
        }
      }
    }
    
    return overlaps;
  }

  /**
   * 解决规则冲突
   */
  private static resolveConflicts(
    rules: ReplaceRule[], 
    conflicts: any[], 
    strategy: 'first' | 'last' | 'priority' | 'skip'
  ): ReplaceRule[] {
    if (conflicts.length === 0) return rules;

    const conflictingRules = new Set();
    conflicts.forEach(conflict => {
      conflictingRules.add(conflict.rule1.id);
      conflictingRules.add(conflict.rule2.id);
    });

    switch (strategy) {
      case 'first':
        // 保留第一个遇到的规则
        return rules.filter((rule, index) => {
          if (!conflictingRules.has(rule.id)) return true;
          return !rules.slice(0, index).some(r => conflictingRules.has(r.id));
        });
        
      case 'last':
        // 保留最后一个遇到的规则
        return rules.filter((rule, index) => {
          if (!conflictingRules.has(rule.id)) return true;
          return !rules.slice(index + 1).some(r => conflictingRules.has(r.id));
        });
        
      case 'priority':
        // 按优先级保留
        return rules.filter(rule => {
          if (!conflictingRules.has(rule.id)) return true;
          const conflictingWithHigherPriority = conflicts.some(conflict => {
            const otherRule = conflict.rule1.id === rule.id ? conflict.rule2 : conflict.rule1;
            return (otherRule.options?.priority || 0) < (rule.options?.priority || 0);
          });
          return !conflictingWithHigherPriority;
        });
        
      case 'skip':
        // 跳过所有冲突的规则
        return rules.filter(rule => !conflictingRules.has(rule.id));
        
      default:
        return rules;
    }
  }

  /**
   * 应用替换到文本
   */
  private static applyReplacements(text: string, matches: SearchMatch[], replaceText: string): string {
    // 按位置倒序排序，从后往前替换，避免位置偏移
    const sortedMatches = matches.sort((a, b) => b.start - a.start);
    
    let result = text;
    for (const match of sortedMatches) {
      result = result.substring(0, match.start) + replaceText + result.substring(match.end);
    }
    
    return result;
  }

  /**
   * 使用AI增强替换规则
   */
  private static async enhanceRulesWithAI(
    text: string, 
    rules: ReplaceRule[], 
    aiProvider: 'gemini' | 'openai'
  ): Promise<ReplaceRule[]> {
    // TODO: 实现AI增强逻辑
    // 这里可以调用Gemini或OpenAI API来分析文本并优化替换规则
    console.log('AI增强功能待实现');
    return rules;
  }

  /**
   * 生成替换报告
   */
  static generateReport(result: BatchReplaceResult): string {
    const report = [];
    report.push('=== 文本替换报告 ===');
    report.push(`执行时间: ${result.executionTime}ms`);
    report.push(`总匹配数: ${result.totalMatches}`);
    report.push(`总替换数: ${result.totalReplacements}`);
    report.push(`执行状态: ${result.success ? '成功' : '失败'}`);
    
    if (result.errors.length > 0) {
      report.push('\n错误信息:');
      result.errors.forEach(error => report.push(`- ${error}`));
    }
    
    report.push('\n详细结果:');
    result.results.forEach(r => {
      report.push(`规则 ${r.ruleId}: "${r.searchText}" → "${r.replaceText}"`);
      report.push(`  匹配: ${r.matches.length}, 替换: ${r.replacedCount}, 耗时: ${r.executionTime}ms`);
      if (r.error) report.push(`  错误: ${r.error}`);
    });
    
    return report.join('\n');
  }
}
