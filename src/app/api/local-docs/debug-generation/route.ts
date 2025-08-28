import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { WordProcessor } from '@/lib/word-processor';

/**
 * POST /api/local-docs/debug-generation
 * 调试文档生成过程，提供详细的诊断信息
 */
export async function POST(request: NextRequest) {
  try {
    const requestFormData = await request.formData();
    const templateFile = requestFormData.get('template') as File;
    const formDataStr = requestFormData.get('formData') as string;

    if (!templateFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_TEMPLATE', '缺少模板文件'),
        { status: 400 }
      );
    }

    if (!formDataStr) {
      return NextResponse.json(
        createErrorResponse('MISSING_FORM_DATA', '缺少表单数据'),
        { status: 400 }
      );
    }

    console.log(`[Debug Generation] 开始调试文档生成: ${templateFile.name}`);

    let formData: Record<string, any>;
    try {
      formData = JSON.parse(formDataStr);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_FORM_DATA', '表单数据格式错误'),
        { status: 400 }
      );
    }

    // 读取模板文件
    const templateBuffer = await templateFile.arrayBuffer();
    
    console.log('[Debug Generation] 模板文件大小:', templateBuffer.byteLength);
    console.log('[Debug Generation] 表单数据字段数:', Object.keys(formData).length);

    // 环境信息收集
    const environmentInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      templateSize: templateBuffer.byteLength,
      formDataKeys: Object.keys(formData),
      formDataSample: Object.fromEntries(
        Object.entries(formData).slice(0, 3).map(([k, v]) => [k, String(v).substring(0, 50)])
      )
    };

    console.log('[Debug Generation] 环境信息:', environmentInfo);

    // 步骤1: 解析模板
    let documentTemplate;
    try {
      documentTemplate = await WordProcessor.parseTemplate(templateBuffer, templateFile.name);
      console.log('[Debug Generation] 占位符解析成功，数量:', documentTemplate.placeholders.length);
    } catch (error) {
      console.error('[Debug Generation] 占位符解析失败:', error);
      return NextResponse.json(
        createErrorResponse('PLACEHOLDER_PARSE_ERROR', `占位符解析失败: ${error}`),
        { status: 500 }
      );
    }

    // 步骤2: 数据匹配分析
    const dataMatchAnalysis = analyzePlaceholderMatching(documentTemplate.placeholders, formData);
    console.log('[Debug Generation] 数据匹配分析:', dataMatchAnalysis);

    // 步骤3: 尝试生成文档
    let generationResult;
    let generationError = null;

    try {
      const result = await WordProcessor.generateDocument(templateBuffer, formData, templateFile.name);

      // 分析生成的文档
      const generatedAnalysis = await analyzeGeneratedDocument(result.documentBuffer, formData);
      
      generationResult = {
        success: true,
        documentSize: result.documentBuffer.byteLength,
        analysis: generatedAnalysis
      };

      console.log('[Debug Generation] 文档生成成功，大小:', result.documentBuffer.byteLength);
      
    } catch (error) {
      console.error('[Debug Generation] 文档生成失败:', error);
      generationError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      
      generationResult = {
        success: false,
        error: generationError
      };
    }

    // 返回详细的调试信息
    return NextResponse.json(
      createSuccessResponse({
        environment: environmentInfo,
        placeholders: {
          count: documentTemplate.placeholders.length,
          names: documentTemplate.placeholders.map(p => p.name),
          types: documentTemplate.placeholders.map(p => p.type)
        },
        dataMatching: dataMatchAnalysis,
        generation: generationResult,
        recommendations: generateRecommendations(dataMatchAnalysis, generationResult)
      })
    );

  } catch (error) {
    console.error('[Debug Generation] 调试过程失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'DEBUG_FAILED',
        `调试过程失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}

/**
 * 分析占位符与表单数据的匹配情况
 */
function analyzePlaceholderMatching(placeholders: any[], formData: Record<string, any>) {
  const analysis = {
    totalPlaceholders: placeholders.length,
    totalFormFields: Object.keys(formData).length,
    matched: 0,
    unmatched: [] as any[],
    extraFields: [] as any[],
    matchDetails: [] as any[]
  };

  // 检查每个占位符是否有对应的表单数据
  for (const placeholder of placeholders) {
    const hasData = formData.hasOwnProperty(placeholder.name);
    const value = formData[placeholder.name];
    
    if (hasData && value !== undefined && value !== null && value !== '') {
      analysis.matched++;
      analysis.matchDetails.push({
        name: placeholder.name,
        type: placeholder.type,
        hasData: true,
        value: String(value).substring(0, 100), // 限制长度
        valueLength: String(value).length
      });
    } else {
      analysis.unmatched.push({
        name: placeholder.name,
        type: placeholder.type,
        hasData: hasData,
        value: value
      });
      analysis.matchDetails.push({
        name: placeholder.name,
        type: placeholder.type,
        hasData: false,
        value: value
      });
    }
  }

  // 检查表单中多余的字段
  const placeholderNames = new Set(placeholders.map(p => p.name));
  for (const fieldName of Object.keys(formData)) {
    if (!placeholderNames.has(fieldName)) {
      analysis.extraFields.push({
        name: fieldName,
        value: String(formData[fieldName]).substring(0, 100)
      });
    }
  }

  return analysis;
}

/**
 * 分析生成的文档
 */
async function analyzeGeneratedDocument(documentBuffer: ArrayBuffer, originalData: Record<string, any>) {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(documentBuffer);
    
    const documentXmlFile = zipContent.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('无法找到document.xml文件');
    }

    const documentXml = await documentXmlFile.async('text');
    
    // 查找剩余的占位符
    const remainingPlaceholders = documentXml.match(/\{\{([^}]+)\}\}/g) || [];
    
    // 检查数据是否存在于文档中
    const dataPresence: Record<string, any> = {};
    for (const [key, value] of Object.entries(originalData)) {
      const stringValue = String(value);
      dataPresence[key] = {
        originalValue: stringValue,
        foundInDocument: stringValue && documentXml.includes(stringValue),
        placeholderRemaining: documentXml.includes(`{{${key}}}`)
      };
    }

    return {
      documentXmlLength: documentXml.length,
      remainingPlaceholders: remainingPlaceholders,
      remainingCount: remainingPlaceholders.length,
      dataPresence: dataPresence,
      replacementRate: calculateReplacementRate(dataPresence)
    };
    
  } catch (error) {
    console.error('[Debug Generation] 文档分析失败:', error);
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 计算替换成功率
 */
function calculateReplacementRate(dataPresence: Record<string, any>): number {
  const entries = Object.values(dataPresence);
  if (entries.length === 0) return 0;
  
  const successful = entries.filter((entry: any) => 
    entry.foundInDocument && !entry.placeholderRemaining
  ).length;
  
  return (successful / entries.length) * 100;
}

/**
 * 生成修复建议
 */
function generateRecommendations(dataMatching: any, generationResult: any): string[] {
  const recommendations = [];

  if (dataMatching.unmatched.length > 0) {
    recommendations.push(`发现 ${dataMatching.unmatched.length} 个占位符没有对应的数据，请检查表单填写`);
  }

  if (dataMatching.extraFields.length > 0) {
    recommendations.push(`发现 ${dataMatching.extraFields.length} 个多余的表单字段，可能影响处理性能`);
  }

  if (!generationResult.success) {
    recommendations.push('文档生成失败，请检查模板格式和数据完整性');
  } else if (generationResult.analysis && generationResult.analysis.replacementRate < 100) {
    recommendations.push(`字段替换成功率仅为 ${generationResult.analysis.replacementRate.toFixed(1)}%，建议检查docx-templates库版本和配置`);
  }

  if (recommendations.length === 0) {
    recommendations.push('所有检查项目正常，如仍有问题请联系技术支持');
  }

  return recommendations;
}

/**
 * GET 请求 - 获取调试功能说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '文档生成调试API - 提供详细的诊断信息',
      usage: {
        method: 'POST',
        contentType: 'multipart/form-data',
        parameters: {
          template: 'Word模板文件 (.docx)',
          formData: '表单数据 (JSON字符串)'
        }
      },
      features: [
        '环境信息收集',
        '占位符解析诊断',
        '数据匹配分析',
        '文档生成过程跟踪',
        '替换成功率计算',
        '问题诊断和修复建议'
      ]
    }
  });
}
