/**
 * 模板诊断API
 * 用于诊断模板占位符和数据匹配问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { WordProcessor } from '@/lib/word-processor';
import { createErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    console.log('[Template Diagnosis] 开始模板诊断');

    const formData = await request.formData();
    const templateFile = formData.get('template') as File;
    const dataString = formData.get('data') as string;

    if (!templateFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_TEMPLATE', '缺少模板文件'),
        { status: 400 }
      );
    }

    if (!dataString) {
      return NextResponse.json(
        createErrorResponse('MISSING_DATA', '缺少填充数据'),
        { status: 400 }
      );
    }

    // 解析数据
    let data: Record<string, any>;
    try {
      data = JSON.parse(dataString);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_DATA_FORMAT', '数据格式无效'),
        { status: 400 }
      );
    }

    // 读取模板文件
    const templateBuffer = await templateFile.arrayBuffer();
    
    console.log(`[Template Diagnosis] 模板文件: ${templateFile.name}, 大小: ${templateBuffer.byteLength} bytes`);
    console.log(`[Template Diagnosis] 数据字段: ${Object.keys(data).length} 个`);

    // 执行诊断
    const diagnosis = await WordProcessor.diagnoseTemplatePlaceholders(
      templateBuffer,
      data,
      templateFile.name
    );

    // 生成诊断报告
    const report = {
      templateInfo: {
        name: templateFile.name,
        size: templateBuffer.byteLength,
        placeholderCount: diagnosis.templatePlaceholders.length
      },
      dataInfo: {
        keyCount: diagnosis.dataKeys.length,
        keys: diagnosis.dataKeys
      },
      matchingAnalysis: {
        totalPlaceholders: diagnosis.templatePlaceholders.length,
        totalDataKeys: diagnosis.dataKeys.length,
        matchedCount: diagnosis.matchedKeys.length,
        unmatchedTemplateCount: diagnosis.unmatchedTemplateKeys.length,
        unmatchedDataCount: diagnosis.unmatchedDataKeys.length,
        matchingRate: diagnosis.templatePlaceholders.length > 0 
          ? (diagnosis.matchedKeys.length / diagnosis.templatePlaceholders.length * 100).toFixed(1) + '%'
          : '0%'
      },
      details: {
        templatePlaceholders: diagnosis.templatePlaceholders,
        dataKeys: diagnosis.dataKeys,
        matchedKeys: diagnosis.matchedKeys,
        unmatchedTemplateKeys: diagnosis.unmatchedTemplateKeys,
        unmatchedDataKeys: diagnosis.unmatchedDataKeys
      },
      recommendations: generateRecommendations(diagnosis),
      xmlSample: diagnosis.xmlContent.substring(0, 1000) + '...' // 提供XML样本用于调试
    };

    console.log(`[Template Diagnosis] 诊断完成:`);
    console.log(`  - 模板占位符: ${diagnosis.templatePlaceholders.length} 个`);
    console.log(`  - 数据键名: ${diagnosis.dataKeys.length} 个`);
    console.log(`  - 匹配成功: ${diagnosis.matchedKeys.length} 个`);
    console.log(`  - 匹配率: ${report.matchingAnalysis.matchingRate}`);

    return NextResponse.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('[Template Diagnosis] 诊断失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '模板诊断失败';
    
    return NextResponse.json(
      createErrorResponse('DIAGNOSIS_FAILED', errorMessage),
      { status: 500 }
    );
  }
}

/**
 * 生成诊断建议
 */
function generateRecommendations(diagnosis: {
  templatePlaceholders: string[];
  dataKeys: string[];
  matchedKeys: string[];
  unmatchedTemplateKeys: string[];
  unmatchedDataKeys: string[];
}): string[] {
  const recommendations: string[] = [];

  // 匹配率分析
  const matchingRate = diagnosis.templatePlaceholders.length > 0 
    ? diagnosis.matchedKeys.length / diagnosis.templatePlaceholders.length 
    : 0;

  if (matchingRate === 1) {
    recommendations.push('✅ 完美匹配！所有模板占位符都有对应的数据。');
  } else if (matchingRate >= 0.8) {
    recommendations.push('✅ 匹配良好，大部分占位符都有对应数据。');
  } else if (matchingRate >= 0.5) {
    recommendations.push('⚠️ 匹配一般，建议检查未匹配的占位符。');
  } else {
    recommendations.push('❌ 匹配较差，需要重点检查占位符和数据键名。');
  }

  // 未匹配的模板占位符
  if (diagnosis.unmatchedTemplateKeys.length > 0) {
    recommendations.push(`📝 模板中有 ${diagnosis.unmatchedTemplateKeys.length} 个占位符未找到对应数据：${diagnosis.unmatchedTemplateKeys.slice(0, 3).join(', ')}${diagnosis.unmatchedTemplateKeys.length > 3 ? '...' : ''}`);
    recommendations.push('💡 建议：检查数据字段名是否与模板占位符完全一致（包括中文字符、空格等）。');
  }

  // 未匹配的数据键
  if (diagnosis.unmatchedDataKeys.length > 0) {
    recommendations.push(`📊 数据中有 ${diagnosis.unmatchedDataKeys.length} 个字段在模板中未找到对应占位符：${diagnosis.unmatchedDataKeys.slice(0, 3).join(', ')}${diagnosis.unmatchedDataKeys.length > 3 ? '...' : ''}`);
    recommendations.push('💡 建议：这些数据字段可能不会在生成的文档中显示。');
  }

  // 常见问题提示
  if (matchingRate < 0.8) {
    recommendations.push('🔧 常见解决方案：');
    recommendations.push('  • 检查模板中占位符格式是否为 {{字段名}}');
    recommendations.push('  • 确认中文字符、空格、标点符号完全一致');
    recommendations.push('  • 检查Word模板是否将占位符分割到多个文本框中');
    recommendations.push('  • 验证数据字段名的大小写是否正确');
  }

  return recommendations;
}

/**
 * GET 请求 - 获取诊断功能说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '模板诊断API - 用于分析模板占位符和数据匹配问题',
      usage: {
        method: 'POST',
        contentType: 'multipart/form-data',
        parameters: {
          template: 'Word模板文件 (.docx)',
          data: '填充数据 (JSON字符串)'
        }
      },
      features: [
        '提取模板中的所有占位符',
        '分析数据键名与占位符的匹配情况',
        '生成详细的诊断报告和建议',
        '处理被XML节点分割的占位符',
        '提供智能的键名映射建议'
      ]
    }
  });
}
