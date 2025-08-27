/**
 * 文本替换诊断工具
 * 用于分析和调试文本替换失败的问题
 */

import { TextSearchEngine, SearchMatch } from './text-search';
import { ReplaceRule, ReplaceResult } from './text-replace';

export interface DiagnosticResult {
  ruleId: string;
  searchText: string;
  replaceText: string;
  fieldType?: string;
  
  // 搜索结果
  exactMatches: SearchMatch[];
  fuzzyMatches: SearchMatch[];
  regexMatches: SearchMatch[];
  
  // 诊断信息
  issues: DiagnosticIssue[];
  suggestions: string[];
  
  // 文本分析
  textAnalysis: {
    originalLength: number;
    searchTextLength: number;
    hasSpecialChars: boolean;
    hasWhitespace: boolean;
    encoding: string;
    lineBreaks: number;
  };
  
  // 匹配分析
  matchAnalysis: {
    exactMatchCount: number;
    fuzzyMatchCount: number;
    regexMatchCount: number;
    bestMatch?: SearchMatch;
    confidence: number;
  };
}

export interface DiagnosticIssue {
  type: 'encoding' | 'whitespace' | 'case' | 'regex' | 'special_chars' | 'length' | 'format';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

/**
 * 文本替换诊断器
 */
export class TextReplaceDiagnostics {
  
  /**
   * 诊断单个替换规则
   */
  static diagnoseRule(text: string, rule: ReplaceRule): DiagnosticResult {
    const result: DiagnosticResult = {
      ruleId: rule.id,
      searchText: rule.searchText,
      replaceText: rule.replaceText,
      fieldType: rule.fieldType,
      exactMatches: [],
      fuzzyMatches: [],
      regexMatches: [],
      issues: [],
      suggestions: [],
      textAnalysis: this.analyzeText(text, rule.searchText),
      matchAnalysis: {
        exactMatchCount: 0,
        fuzzyMatchCount: 0,
        regexMatchCount: 0,
        confidence: 0
      }
    };

    // 执行不同类型的搜索
    try {
      // 精确搜索
      result.exactMatches = TextSearchEngine.exactSearch(text, rule.searchText, {
        caseSensitive: rule.options?.caseSensitive || false,
        wholeWord: rule.options?.wholeWord || false
      });

      // 模糊搜索
      result.fuzzyMatches = TextSearchEngine.fuzzySearch(text, rule.searchText, {
        threshold: 0.6,
        maxDistance: 3
      });

      // 正则表达式搜索（如果适用）
      if (rule.options?.useRegex) {
        result.regexMatches = TextSearchEngine.regexSearch(text, rule.searchText, {
          caseSensitive: rule.options?.caseSensitive || false
        });
      }
    } catch (error) {
      result.issues.push({
        type: 'regex',
        severity: 'high',
        message: `搜索执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestion: '检查搜索文本格式和正则表达式语法'
      });
    }

    // 更新匹配分析
    result.matchAnalysis.exactMatchCount = result.exactMatches.length;
    result.matchAnalysis.fuzzyMatchCount = result.fuzzyMatches.length;
    result.matchAnalysis.regexMatchCount = result.regexMatches.length;

    // 找到最佳匹配
    const allMatches = [...result.exactMatches, ...result.fuzzyMatches, ...result.regexMatches];
    if (allMatches.length > 0) {
      result.matchAnalysis.bestMatch = allMatches[0];
      result.matchAnalysis.confidence = result.exactMatches.length > 0 ? 1.0 : 
                                       result.fuzzyMatches.length > 0 ? 0.7 : 0.5;
    }

    // 执行问题诊断
    result.issues.push(...this.detectIssues(text, rule));
    
    // 生成建议
    result.suggestions.push(...this.generateSuggestions(result));

    return result;
  }

  /**
   * 批量诊断替换规则
   */
  static diagnoseBatch(text: string, rules: ReplaceRule[]): DiagnosticResult[] {
    return rules.map(rule => this.diagnoseRule(text, rule));
  }

  /**
   * 分析文本特征
   */
  private static analyzeText(text: string, searchText: string) {
    return {
      originalLength: text.length,
      searchTextLength: searchText.length,
      hasSpecialChars: /[^\w\s\u4e00-\u9fff]/.test(searchText),
      hasWhitespace: /\s/.test(searchText),
      encoding: this.detectEncoding(text),
      lineBreaks: (text.match(/\n/g) || []).length
    };
  }

  /**
   * 检测编码类型
   */
  private static detectEncoding(text: string): string {
    // 简单的编码检测
    if (/[\u4e00-\u9fff]/.test(text)) return 'UTF-8 (含中文)';
    if (/[^\x00-\x7F]/.test(text)) return 'UTF-8 (含非ASCII)';
    return 'ASCII';
  }

  /**
   * 检测潜在问题
   */
  private static detectIssues(text: string, rule: ReplaceRule): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    // 检查长度问题
    if (rule.searchText.length < 2) {
      issues.push({
        type: 'length',
        severity: 'medium',
        message: '搜索文本过短，可能导致误匹配',
        suggestion: '使用更具体的搜索文本或启用整词匹配'
      });
    }

    if (rule.searchText.length > 100) {
      issues.push({
        type: 'length',
        severity: 'medium',
        message: '搜索文本过长，可能难以精确匹配',
        suggestion: '考虑使用关键词或模糊匹配'
      });
    }

    // 检查特殊字符
    if (/[.*+?^${}()|[\]\\]/.test(rule.searchText) && !rule.options?.useRegex) {
      issues.push({
        type: 'special_chars',
        severity: 'high',
        message: '搜索文本包含正则表达式特殊字符',
        suggestion: '启用正则表达式模式或转义特殊字符'
      });
    }

    // 检查空白字符
    if (/^\s|\s$/.test(rule.searchText)) {
      issues.push({
        type: 'whitespace',
        severity: 'medium',
        message: '搜索文本包含前导或尾随空格',
        suggestion: '移除多余空格或使用精确匹配模式'
      });
    }

    // 检查大小写敏感性
    if (/[A-Z]/.test(rule.searchText) && !rule.options?.caseSensitive) {
      const lowerCaseMatches = TextSearchEngine.exactSearch(text, rule.searchText.toLowerCase());
      const originalMatches = TextSearchEngine.exactSearch(text, rule.searchText);
      
      if (lowerCaseMatches.length > originalMatches.length) {
        issues.push({
          type: 'case',
          severity: 'medium',
          message: '大小写不匹配可能导致遗漏',
          suggestion: '考虑启用大小写不敏感匹配'
        });
      }
    }

    // 检查格式问题
    if (rule.fieldType === 'phone' && !/^[\d\-\s\+\(\)]+$/.test(rule.searchText)) {
      issues.push({
        type: 'format',
        severity: 'medium',
        message: '电话号码格式可能不标准',
        suggestion: '使用标准的电话号码格式'
      });
    }

    if (rule.fieldType === 'amount' && !/[\d,¥￥\$\.]+/.test(rule.searchText)) {
      issues.push({
        type: 'format',
        severity: 'medium',
        message: '金额格式可能不标准',
        suggestion: '确保金额包含数字和货币符号'
      });
    }

    return issues;
  }

  /**
   * 生成改进建议
   */
  private static generateSuggestions(result: DiagnosticResult): string[] {
    const suggestions: string[] = [];

    // 基于匹配结果的建议
    if (result.matchAnalysis.exactMatchCount === 0) {
      if (result.matchAnalysis.fuzzyMatchCount > 0) {
        suggestions.push('考虑使用模糊匹配或调整搜索文本');
      } else {
        suggestions.push('搜索文本在文档中不存在，请检查文本内容');
      }
    }

    // 基于字段类型的建议
    if (result.fieldType === 'company') {
      suggestions.push('公司名称可能包含特殊格式，尝试使用部分匹配');
    }

    if (result.fieldType === 'phone') {
      suggestions.push('电话号码格式可能有变化，考虑使用正则表达式匹配');
    }

    if (result.fieldType === 'amount') {
      suggestions.push('金额可能包含不同的货币符号或格式，使用灵活的匹配模式');
    }

    // 基于文本分析的建议
    if (result.textAnalysis.hasSpecialChars) {
      suggestions.push('文本包含特殊字符，确保正确转义或使用正则表达式');
    }

    if (result.textAnalysis.hasWhitespace) {
      suggestions.push('文本包含空格，考虑使用整词匹配或处理空格变化');
    }

    return suggestions;
  }

  /**
   * 生成诊断报告
   */
  static generateReport(results: DiagnosticResult[]): string {
    const report: string[] = [];
    
    report.push('=== 文本替换诊断报告 ===\n');
    
    // 总体统计
    const totalRules = results.length;
    const successfulRules = results.filter(r => r.matchAnalysis.exactMatchCount > 0).length;
    const failedRules = totalRules - successfulRules;
    
    report.push(`总规则数: ${totalRules}`);
    report.push(`成功匹配: ${successfulRules}`);
    report.push(`匹配失败: ${failedRules}`);
    report.push(`成功率: ${((successfulRules / totalRules) * 100).toFixed(1)}%\n`);

    // 详细分析
    results.forEach((result, index) => {
      report.push(`--- 规则 ${index + 1}: ${result.fieldType || result.ruleId} ---`);
      report.push(`搜索文本: "${result.searchText}"`);
      report.push(`替换文本: "${result.replaceText}"`);
      report.push(`精确匹配: ${result.matchAnalysis.exactMatchCount}`);
      report.push(`模糊匹配: ${result.matchAnalysis.fuzzyMatchCount}`);
      report.push(`置信度: ${(result.matchAnalysis.confidence * 100).toFixed(1)}%`);
      
      if (result.issues.length > 0) {
        report.push('问题:');
        result.issues.forEach(issue => {
          report.push(`  - [${issue.severity.toUpperCase()}] ${issue.message}`);
        });
      }
      
      if (result.suggestions.length > 0) {
        report.push('建议:');
        result.suggestions.forEach(suggestion => {
          report.push(`  • ${suggestion}`);
        });
      }
      
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * 自动修复替换规则
   */
  static autoFixRules(text: string, rules: ReplaceRule[]): ReplaceRule[] {
    return rules.map(rule => {
      const diagnosis = this.diagnoseRule(text, rule);
      const fixedRule = { ...rule };

      // 自动修复常见问题
      if (diagnosis.issues.some(i => i.type === 'whitespace')) {
        fixedRule.searchText = rule.searchText.trim();
      }

      if (diagnosis.issues.some(i => i.type === 'case') && diagnosis.matchAnalysis.exactMatchCount === 0) {
        fixedRule.options = { ...rule.options, caseSensitive: false };
      }

      if (diagnosis.issues.some(i => i.type === 'special_chars')) {
        fixedRule.options = { ...rule.options, useRegex: true };
      }

      // 如果精确匹配失败但模糊匹配成功，尝试使用最佳模糊匹配
      if (diagnosis.matchAnalysis.exactMatchCount === 0 && diagnosis.matchAnalysis.fuzzyMatchCount > 0) {
        const bestFuzzyMatch = diagnosis.fuzzyMatches[0];
        if (bestFuzzyMatch) {
          fixedRule.searchText = bestFuzzyMatch.text;
        }
      }

      return fixedRule;
    });
  }
}
