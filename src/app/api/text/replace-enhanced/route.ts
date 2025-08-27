import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { TextReplaceEngine, ReplaceRule } from '@/lib/text-replace';
import { TextReplaceDiagnostics } from '@/lib/text-replace-diagnostics';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 增强的文本替换API，包含诊断功能
 */
export async function POST(request: NextRequest) {
  // 检查是否为测试模式（开发环境允许无认证测试）
  const isTestMode = process.env.NODE_ENV === 'development';

  if (isTestMode) {
    return handleEnhancedReplaceRequest(request, { sub: 'test-user' });
  }

  return withAuth(request, async (req, user) => {
    return handleEnhancedReplaceRequest(req, user);
  });
}

async function handleEnhancedReplaceRequest(req: NextRequest, user: any) {
  try {
    const body = await req.json();
    const {
      text,
      rules,
      options = {},
      enableDiagnostics = true,
      autoFix = false
    } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        createErrorResponse('INVALID_TEXT', '文本内容不能为空'),
        { status: 400 }
      );
    }

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        createErrorResponse('INVALID_RULES', '替换规则不能为空'),
        { status: 400 }
      );
    }

      console.log(`[Enhanced Replace] 开始处理 ${rules.length} 条替换规则`);
      console.log(`[Enhanced Replace] 文本长度: ${text.length} 字符`);

      let processedRules = rules as ReplaceRule[];
      let diagnostics = null;

      // 执行诊断
      if (enableDiagnostics) {
        console.log('[Enhanced Replace] 执行诊断分析...');
        diagnostics = TextReplaceDiagnostics.diagnoseBatch(text, processedRules);
        
        // 记录诊断结果
        diagnostics.forEach((diag, index) => {
          console.log(`[Diagnostics] 规则 ${index + 1} (${diag.fieldType}): 精确匹配=${diag.matchAnalysis.exactMatchCount}, 模糊匹配=${diag.matchAnalysis.fuzzyMatchCount}`);
          
          if (diag.issues.length > 0) {
            console.log(`[Diagnostics] 发现问题:`, diag.issues.map(i => i.message));
          }
        });

        // 自动修复（如果启用）
        if (autoFix) {
          console.log('[Enhanced Replace] 执行自动修复...');
          const fixedRules = TextReplaceDiagnostics.autoFixRules(text, processedRules);
          
          // 比较修复前后的差异
          const fixedCount = fixedRules.filter((rule, index) => 
            JSON.stringify(rule) !== JSON.stringify(processedRules[index])
          ).length;
          
          if (fixedCount > 0) {
            console.log(`[Enhanced Replace] 自动修复了 ${fixedCount} 条规则`);
            processedRules = fixedRules;
            
            // 重新诊断修复后的规则
            diagnostics = TextReplaceDiagnostics.diagnoseBatch(text, processedRules);
          }
        }
      }

      // 执行替换
      console.log('[Enhanced Replace] 执行文本替换...');
      const replaceResult = TextReplaceEngine.batchReplace(text, processedRules, {
        dryRun: options.dryRun || false,
        stopOnError: options.stopOnError || false,
        maxReplacements: options.maxReplacements,
        conflictResolution: options.conflictResolution || 'first'
      });

      // 生成详细的执行报告
      const executionReport = {
        totalRules: processedRules.length,
        successfulRules: replaceResult.results.filter(r => r.success && r.replacedCount > 0).length,
        failedRules: replaceResult.results.filter(r => !r.success || r.replacedCount === 0).length,
        totalMatches: replaceResult.totalMatches,
        totalReplacements: replaceResult.totalReplacements,
        executionTime: replaceResult.executionTime,
        overallSuccess: replaceResult.success
      };

      console.log('[Enhanced Replace] 执行完成:', executionReport);

      // 分析失败原因
      const failureAnalysis = replaceResult.results
        .filter(r => !r.success || r.replacedCount === 0)
        .map(r => {
          const diag = diagnostics?.find(d => d.ruleId === r.ruleId);
          return {
            ruleId: r.ruleId,
            searchText: r.searchText,
            fieldType: diag?.fieldType,
            error: r.error,
            issues: diag?.issues || [],
            suggestions: diag?.suggestions || []
          };
        });

      // 生成改进建议
      const improvements = generateImprovementSuggestions(executionReport, failureAnalysis);

      const response = {
        // 替换结果
        originalText: replaceResult.originalText,
        finalText: replaceResult.finalText,
        results: replaceResult.results,
        
        // 执行统计
        execution: executionReport,
        
        // 诊断信息（如果启用）
        diagnostics: enableDiagnostics ? {
          enabled: true,
          autoFixApplied: autoFix,
          results: diagnostics,
          report: TextReplaceDiagnostics.generateReport(diagnostics || [])
        } : { enabled: false },
        
        // 失败分析
        failures: {
          count: failureAnalysis.length,
          details: failureAnalysis
        },
        
        // 改进建议
        improvements,
        
        // 元数据
        metadata: {
          textLength: text.length,
          rulesProcessed: processedRules.length,
          processingTime: replaceResult.executionTime,
          timestamp: new Date().toISOString()
        }
      };

      return NextResponse.json(createSuccessResponse(response));

  } catch (error) {
    console.error('[Enhanced Replace] 处理失败:', error);

    return NextResponse.json(
      createErrorResponse(
        'REPLACE_ERROR',
        `文本替换失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}

/**
 * 生成改进建议
 */
function generateImprovementSuggestions(
  execution: any, 
  failures: any[]
): string[] {
  const suggestions: string[] = [];

  // 基于成功率的建议
  const successRate = execution.totalRules > 0 ? 
    (execution.successfulRules / execution.totalRules) * 100 : 0;

  if (successRate < 50) {
    suggestions.push('替换成功率较低，建议检查搜索文本是否与文档内容匹配');
  } else if (successRate < 80) {
    suggestions.push('部分替换失败，建议使用诊断功能分析具体问题');
  }

  // 基于失败类型的建议
  const issueTypes = failures.flatMap(f => f.issues.map((i: any) => i.type));
  const issueCount = issueTypes.reduce((acc: any, type: string) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  if (issueCount.special_chars > 0) {
    suggestions.push('多个规则包含特殊字符，考虑启用正则表达式模式');
  }

  if (issueCount.case > 0) {
    suggestions.push('存在大小写匹配问题，建议启用大小写不敏感匹配');
  }

  if (issueCount.whitespace > 0) {
    suggestions.push('存在空格匹配问题，建议清理搜索文本或使用精确匹配');
  }

  if (issueCount.format > 0) {
    suggestions.push('存在格式问题，建议根据字段类型调整匹配模式');
  }

  // 基于字段类型的建议
  const fieldTypes = failures.map(f => f.fieldType).filter(Boolean);
  const uniqueFieldTypes = Array.from(new Set(fieldTypes));

  uniqueFieldTypes.forEach(fieldType => {
    switch (fieldType) {
      case 'company':
        suggestions.push('公司名称匹配失败，可能需要使用部分匹配或模糊搜索');
        break;
      case 'phone':
        suggestions.push('电话号码匹配失败，建议使用正则表达式处理格式变化');
        break;
      case 'amount':
        suggestions.push('金额匹配失败，建议处理不同的货币符号和数字格式');
        break;
      case 'date':
        suggestions.push('日期匹配失败，建议使用正则表达式处理多种日期格式');
        break;
    }
  });

  // 性能建议
  if (execution.executionTime > 5000) {
    suggestions.push('处理时间较长，考虑减少规则数量或优化搜索模式');
  }

  // 通用建议
  if (suggestions.length === 0) {
    suggestions.push('替换执行正常，如需进一步优化可启用诊断功能');
  }

  return suggestions;
}
