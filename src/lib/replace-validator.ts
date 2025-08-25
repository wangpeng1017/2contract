import { BatchReplaceResult, ReplaceResult, ReplaceRule } from './text-replace';
import { TextSearchEngine } from './text-search';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 验证得分 (0-100)
  issues: ValidationIssue[];
  recommendations: string[];
  statistics: ValidationStatistics;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  ruleId?: string;
  position?: { start: number; end: number };
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationStatistics {
  totalRules: number;
  successfulRules: number;
  failedRules: number;
  totalReplacements: number;
  averageExecutionTime: number;
  textLengthChange: number;
  textLengthChangePercent: number;
}

export interface ValidationOptions {
  checkIntegrity?: boolean; // 检查文本完整性
  checkConsistency?: boolean; // 检查替换一致性
  checkQuality?: boolean; // 检查替换质量
  maxIssues?: number; // 最大问题数量
  strictMode?: boolean; // 严格模式
}

/**
 * 替换结果验证器
 */
export class ReplaceValidator {
  /**
   * 验证批量替换结果
   */
  static validateBatchResult(
    result: BatchReplaceResult,
    rules: ReplaceRule[],
    options: ValidationOptions = {}
  ): ValidationResult {
    const {
      checkIntegrity = true,
      checkConsistency = true,
      checkQuality = true,
      maxIssues = 100,
      strictMode = false
    } = options;

    const validation: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      recommendations: [],
      statistics: this.calculateStatistics(result, rules)
    };

    // 基础验证
    this.validateBasicResult(result, validation, strictMode);

    // 完整性检查
    if (checkIntegrity) {
      this.validateIntegrity(result, validation);
    }

    // 一致性检查
    if (checkConsistency) {
      this.validateConsistency(result, rules, validation);
    }

    // 质量检查
    if (checkQuality) {
      this.validateQuality(result, validation);
    }

    // 限制问题数量
    if (validation.issues.length > maxIssues) {
      validation.issues = validation.issues.slice(0, maxIssues);
      validation.issues.push({
        type: 'warning',
        code: 'MAX_ISSUES_REACHED',
        message: `问题数量超过限制，仅显示前${maxIssues}个问题`,
        severity: 'medium'
      });
    }

    // 计算最终得分和有效性
    validation.score = this.calculateScore(validation.issues);
    validation.isValid = this.determineValidity(validation.issues, strictMode);

    // 生成建议
    validation.recommendations = this.generateRecommendations(validation);

    return validation;
  }

  /**
   * 验证单个替换结果
   */
  static validateSingleResult(
    result: ReplaceResult,
    rule: ReplaceRule,
    originalText: string,
    finalText: string
  ): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      recommendations: [],
      statistics: {
        totalRules: 1,
        successfulRules: result.success ? 1 : 0,
        failedRules: result.success ? 0 : 1,
        totalReplacements: result.replacedCount,
        averageExecutionTime: result.executionTime,
        textLengthChange: finalText.length - originalText.length,
        textLengthChangePercent: ((finalText.length - originalText.length) / originalText.length) * 100
      }
    };

    // 验证单个结果
    if (!result.success) {
      validation.issues.push({
        type: 'error',
        code: 'RULE_EXECUTION_FAILED',
        message: result.error || '规则执行失败',
        ruleId: result.ruleId,
        severity: 'critical'
      });
    }

    // 验证匹配数量
    if (result.success && result.matches.length === 0) {
      validation.issues.push({
        type: 'warning',
        code: 'NO_MATCHES_FOUND',
        message: '未找到匹配的文本',
        ruleId: result.ruleId,
        severity: 'medium'
      });
    }

    // 验证替换内容
    if (result.success && result.replacedCount > 0) {
      this.validateReplacementContent(rule, originalText, finalText, validation);
    }

    validation.score = this.calculateScore(validation.issues);
    validation.isValid = validation.issues.filter(i => i.type === 'error').length === 0;

    return validation;
  }

  /**
   * 基础结果验证
   */
  private static validateBasicResult(result: BatchReplaceResult, validation: ValidationResult, strictMode: boolean): void {
    // 检查执行状态
    if (!result.success) {
      validation.issues.push({
        type: 'error',
        code: 'BATCH_EXECUTION_FAILED',
        message: '批量替换执行失败',
        severity: 'critical'
      });
    }

    // 检查错误信息
    result.errors.forEach(error => {
      validation.issues.push({
        type: 'error',
        code: 'EXECUTION_ERROR',
        message: error,
        severity: 'high'
      });
    });

    // 检查执行时间
    if (result.executionTime > 10000) { // 超过10秒
      validation.issues.push({
        type: 'warning',
        code: 'SLOW_EXECUTION',
        message: `执行时间过长: ${result.executionTime}ms`,
        severity: 'medium'
      });
    }

    // 严格模式下的额外检查
    if (strictMode) {
      if (result.totalReplacements === 0) {
        validation.issues.push({
          type: 'error',
          code: 'NO_REPLACEMENTS_MADE',
          message: '未执行任何替换操作',
          severity: 'high'
        });
      }
    }
  }

  /**
   * 完整性验证
   */
  private static validateIntegrity(result: BatchReplaceResult, validation: ValidationResult): void {
    const originalLength = result.originalText.length;
    const finalLength = result.finalText.length;

    // 检查文本长度变化
    const lengthChange = Math.abs(finalLength - originalLength);
    const lengthChangePercent = (lengthChange / originalLength) * 100;

    if (lengthChangePercent > 50) {
      validation.issues.push({
        type: 'warning',
        code: 'SIGNIFICANT_LENGTH_CHANGE',
        message: `文本长度变化过大: ${lengthChangePercent.toFixed(2)}%`,
        severity: 'medium'
      });
    }

    // 检查文本结构完整性
    const originalLines = result.originalText.split('\n').length;
    const finalLines = result.finalText.split('\n').length;

    if (Math.abs(originalLines - finalLines) > originalLines * 0.1) {
      validation.issues.push({
        type: 'warning',
        code: 'LINE_STRUCTURE_CHANGED',
        message: '文本行结构发生显著变化',
        severity: 'medium'
      });
    }

    // 检查特殊字符保持
    const specialChars = /[^\w\s\u4e00-\u9fff]/g;
    const originalSpecialCount = (result.originalText.match(specialChars) || []).length;
    const finalSpecialCount = (result.finalText.match(specialChars) || []).length;

    if (Math.abs(originalSpecialCount - finalSpecialCount) > originalSpecialCount * 0.2) {
      validation.issues.push({
        type: 'info',
        code: 'SPECIAL_CHARS_CHANGED',
        message: '特殊字符数量发生变化',
        severity: 'low'
      });
    }
  }

  /**
   * 一致性验证
   */
  private static validateConsistency(
    result: BatchReplaceResult,
    rules: ReplaceRule[],
    validation: ValidationResult
  ): void {
    // 检查规则执行一致性
    result.results.forEach(ruleResult => {
      const rule = rules.find(r => r.id === ruleResult.ruleId);
      if (!rule) return;

      // 验证搜索文本是否还存在于最终文本中
      if (ruleResult.success && ruleResult.replacedCount > 0) {
        const remainingMatches = TextSearchEngine.exactSearch(
          result.finalText,
          ruleResult.searchText,
          rule.options
        );

        if (remainingMatches.length > 0) {
          validation.issues.push({
            type: 'warning',
            code: 'INCOMPLETE_REPLACEMENT',
            message: `规则 ${rule.id} 的搜索文本在最终结果中仍然存在`,
            ruleId: rule.id,
            severity: 'medium'
          });
        }
      }
    });

    // 检查替换结果的一致性
    const duplicateReplacements = this.findDuplicateReplacements(result.results);
    duplicateReplacements.forEach(duplicate => {
      validation.issues.push({
        type: 'info',
        code: 'DUPLICATE_REPLACEMENT',
        message: `发现重复的替换操作: "${duplicate.searchText}" → "${duplicate.replaceText}"`,
        severity: 'low'
      });
    });
  }

  /**
   * 质量验证
   */
  private static validateQuality(result: BatchReplaceResult, validation: ValidationResult): void {
    // 检查替换效率
    const totalMatches = result.totalMatches;
    const totalReplacements = result.totalReplacements;
    const efficiency = totalMatches > 0 ? (totalReplacements / totalMatches) * 100 : 0;

    if (efficiency < 50) {
      validation.issues.push({
        type: 'info',
        code: 'LOW_REPLACEMENT_EFFICIENCY',
        message: `替换效率较低: ${efficiency.toFixed(2)}%`,
        severity: 'low'
      });
    }

    // 检查文本质量
    this.validateTextQuality(result.originalText, result.finalText, validation);

    // 检查性能质量
    const avgExecutionTime = result.results.reduce((sum, r) => sum + r.executionTime, 0) / result.results.length;
    if (avgExecutionTime > 1000) {
      validation.issues.push({
        type: 'warning',
        code: 'SLOW_RULE_EXECUTION',
        message: `平均规则执行时间过长: ${avgExecutionTime.toFixed(2)}ms`,
        severity: 'medium'
      });
    }
  }

  /**
   * 验证文本质量
   */
  private static validateTextQuality(originalText: string, finalText: string, validation: ValidationResult): void {
    // 检查是否产生了异常的重复文本
    const repeatedPatterns = this.findRepeatedPatterns(finalText);
    if (repeatedPatterns.length > 0) {
      validation.issues.push({
        type: 'warning',
        code: 'REPEATED_PATTERNS_DETECTED',
        message: `检测到重复模式: ${repeatedPatterns.slice(0, 3).join(', ')}`,
        severity: 'medium'
      });
    }

    // 检查是否产生了异常的空白
    const excessiveWhitespace = /\s{5,}/g;
    const whitespaceMatches = finalText.match(excessiveWhitespace);
    if (whitespaceMatches && whitespaceMatches.length > 0) {
      validation.issues.push({
        type: 'info',
        code: 'EXCESSIVE_WHITESPACE',
        message: '检测到过多的空白字符',
        severity: 'low'
      });
    }
  }

  /**
   * 验证替换内容
   */
  private static validateReplacementContent(
    rule: ReplaceRule,
    originalText: string,
    finalText: string,
    validation: ValidationResult
  ): void {
    // 检查替换文本是否合理
    if (rule.replaceText.length === 0 && rule.searchText.length > 0) {
      validation.issues.push({
        type: 'info',
        code: 'TEXT_DELETION',
        message: `规则 ${rule.id} 执行了文本删除操作`,
        ruleId: rule.id,
        severity: 'low'
      });
    }

    // 检查是否产生了意外的格式变化
    if (rule.searchText.includes('\n') || rule.replaceText.includes('\n')) {
      validation.issues.push({
        type: 'info',
        code: 'LINE_BREAK_REPLACEMENT',
        message: `规则 ${rule.id} 涉及换行符的替换`,
        ruleId: rule.id,
        severity: 'low'
      });
    }
  }

  /**
   * 查找重复的替换操作
   */
  private static findDuplicateReplacements(results: ReplaceResult[]): Array<{
    searchText: string;
    replaceText: string;
    count: number;
  }> {
    const replacementMap = new Map<string, number>();
    
    results.forEach(result => {
      const key = `${result.searchText}→${result.replaceText}`;
      replacementMap.set(key, (replacementMap.get(key) || 0) + 1);
    });

    return Array.from(replacementMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => {
        const [searchText, replaceText] = key.split('→');
        return { searchText, replaceText, count };
      });
  }

  /**
   * 查找重复模式
   */
  private static findRepeatedPatterns(text: string): string[] {
    const patterns: string[] = [];
    const minPatternLength = 10;
    const maxPatternLength = 50;

    for (let len = minPatternLength; len <= maxPatternLength; len++) {
      const patternMap = new Map<string, number>();
      
      for (let i = 0; i <= text.length - len; i++) {
        const pattern = text.substring(i, i + len);
        patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
      }

      patternMap.forEach((count, pattern) => {
        if (count >= 3 && !patterns.includes(pattern)) {
          patterns.push(pattern);
        }
      });
    }

    return patterns.slice(0, 5); // 返回前5个模式
  }

  /**
   * 计算统计信息
   */
  private static calculateStatistics(result: BatchReplaceResult, rules: ReplaceRule[]): ValidationStatistics {
    const successfulRules = result.results.filter(r => r.success).length;
    const failedRules = result.results.length - successfulRules;
    const avgExecutionTime = result.results.reduce((sum, r) => sum + r.executionTime, 0) / result.results.length;

    return {
      totalRules: rules.length,
      successfulRules,
      failedRules,
      totalReplacements: result.totalReplacements,
      averageExecutionTime: avgExecutionTime,
      textLengthChange: result.finalText.length - result.originalText.length,
      textLengthChangePercent: ((result.finalText.length - result.originalText.length) / result.originalText.length) * 100
    };
  }

  /**
   * 计算验证得分
   */
  private static calculateScore(issues: ValidationIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * 确定验证有效性
   */
  private static determineValidity(issues: ValidationIssue[], strictMode: boolean): boolean {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;

    if (criticalIssues > 0) return false;
    if (strictMode && highIssues > 0) return false;

    return true;
  }

  /**
   * 生成建议
   */
  private static generateRecommendations(validation: ValidationResult): string[] {
    const recommendations = [];

    if (validation.issues.some(i => i.code === 'SLOW_EXECUTION')) {
      recommendations.push('考虑优化替换规则以提高执行效率');
    }

    if (validation.issues.some(i => i.code === 'NO_MATCHES_FOUND')) {
      recommendations.push('检查搜索文本是否正确，考虑使用模糊匹配');
    }

    if (validation.issues.some(i => i.code === 'SIGNIFICANT_LENGTH_CHANGE')) {
      recommendations.push('验证替换结果是否符合预期，文本长度变化较大');
    }

    if (validation.statistics.successfulRules < validation.statistics.totalRules) {
      recommendations.push('检查失败的规则配置，确保搜索模式正确');
    }

    if (validation.score < 80) {
      recommendations.push('建议在正式执行前使用预览模式验证替换结果');
    }

    return recommendations;
  }
}
