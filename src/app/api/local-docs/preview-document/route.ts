import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import JSZip from 'jszip';

/**
 * POST /api/local-docs/preview-document
 * 分析生成的文档，检查占位符替换情况
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const documentFile = formData.get('document') as File;
    const originalDataStr = formData.get('originalData') as string;

    if (!documentFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_DOCUMENT', '缺少文档文件'),
        { status: 400 }
      );
    }

    if (!originalDataStr) {
      return NextResponse.json(
        createErrorResponse('MISSING_DATA', '缺少原始数据'),
        { status: 400 }
      );
    }

    console.log(`[Document Preview] 开始分析文档: ${documentFile.name}`);

    let originalData: Record<string, any>;
    try {
      originalData = JSON.parse(originalDataStr);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_DATA', '原始数据格式错误'),
        { status: 400 }
      );
    }

    // 读取文档内容
    const documentBuffer = await documentFile.arrayBuffer();
    
    // 解析Word文档
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(documentBuffer);
    
    // 获取document.xml文件
    const documentXmlFile = zipContent.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('无法找到document.xml文件，可能不是有效的Word文档');
    }

    const documentXml = await documentXmlFile.async('text');
    
    console.log('[Document Preview] 文档XML长度:', documentXml.length);

    // 分析占位符替换情况
    const analysisResult = analyzeReplacementStatus(documentXml, originalData);
    
    // 提取文档内容预览
    const contentPreview = extractContentPreview(documentXml);

    console.log(`[Document Preview] 分析完成 - 总占位符: ${analysisResult.totalPlaceholders}, 已替换: ${analysisResult.replacedCount}`);

    return NextResponse.json(
      createSuccessResponse({
        replacedFields: analysisResult.fields,
        documentSummary: {
          totalPlaceholders: analysisResult.totalPlaceholders,
          replacedCount: analysisResult.replacedCount,
          failedCount: analysisResult.failedCount,
          replacementRate: analysisResult.replacementRate
        },
        contentPreview: contentPreview.substring(0, 1000) + (contentPreview.length > 1000 ? '...' : '')
      })
    );

  } catch (error) {
    console.error('[Document Preview] 文档分析失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'PREVIEW_ANALYSIS_FAILED',
        `文档分析失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}

/**
 * 分析占位符替换状态
 */
function analyzeReplacementStatus(documentXml: string, originalData: Record<string, any>) {
  const fields: Array<{
    placeholder: string;
    originalValue: string;
    replacedValue: string;
    isReplaced: boolean;
  }> = [];

  // 检查每个原始数据字段
  for (const [key, value] of Object.entries(originalData)) {
    const placeholder = `{{${key}}}`;
    const stringValue = String(value || '');
    
    // 检查占位符是否还存在于文档中
    const placeholderExists = documentXml.includes(placeholder);
    
    // 检查替换值是否存在于文档中
    const valueExists = Boolean(stringValue && documentXml.includes(stringValue));

    fields.push({
      placeholder: key,
      originalValue: placeholder,
      replacedValue: stringValue,
      isReplaced: !placeholderExists && valueExists
    });
  }

  // 查找文档中剩余的未替换占位符
  const remainingPlaceholders = findRemainingPlaceholders(documentXml);
  
  // 添加未在原始数据中的占位符
  for (const placeholder of remainingPlaceholders) {
    const key = placeholder.replace(/[{}]/g, '');
    if (!originalData.hasOwnProperty(key)) {
      fields.push({
        placeholder: key,
        originalValue: placeholder,
        replacedValue: '',
        isReplaced: false
      });
    }
  }

  const totalPlaceholders = fields.length;
  const replacedCount = fields.filter(f => f.isReplaced).length;
  const failedCount = totalPlaceholders - replacedCount;
  const replacementRate = totalPlaceholders > 0 ? (replacedCount / totalPlaceholders) * 100 : 100;

  return {
    fields,
    totalPlaceholders,
    replacedCount,
    failedCount,
    replacementRate
  };
}

/**
 * 查找文档中剩余的占位符
 */
function findRemainingPlaceholders(documentXml: string): string[] {
  const placeholders = new Set<string>();
  
  // 匹配 {{placeholder}} 格式的占位符
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.add(match[0]);
  }
  
  return Array.from(placeholders);
}

/**
 * 提取文档内容预览
 */
function extractContentPreview(documentXml: string): string {
  try {
    // 移除XML标签，提取纯文本内容
    let content = documentXml
      .replace(/<[^>]*>/g, ' ')  // 移除所有XML标签
      .replace(/\s+/g, ' ')      // 合并多个空格
      .trim();
    
    // 清理特殊字符
    content = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    
    return content;
  } catch (error) {
    console.error('提取内容预览失败:', error);
    return '无法提取文档内容预览';
  }
}

/**
 * GET 请求 - 获取预览功能说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '文档预览分析API - 用于检查生成文档中的占位符替换情况',
      usage: {
        method: 'POST',
        contentType: 'multipart/form-data',
        parameters: {
          document: '生成的Word文档文件 (.docx)',
          originalData: '原始填充数据 (JSON字符串)'
        }
      },
      features: [
        '分析文档中的占位符替换状态',
        '统计替换成功率和失败数量',
        '提供详细的字段替换报告',
        '提取文档内容预览',
        '识别未替换的占位符'
      ]
    }
  });
}
