import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { WordProcessor, PlaceholderInfo } from '@/lib/word-processor';

/**
 * 强制重新解析Word模板，绕过任何可能的缓存
 * 专门解决模板修改后系统仍显示旧占位符的问题
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const forceReparse = formData.get('forceReparse') === 'true';
    const clearCache = formData.get('clearCache') === 'true';

    if (!file) {
      return NextResponse.json(
        createErrorResponse('MISSING_FILE', '请上传模板文件'),
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        createErrorResponse('INVALID_FILE_TYPE', '请上传.docx格式的文件'),
        { status: 400 }
      );
    }

    console.log(`[Force Reparse] 强制重新解析模板: ${file.name}`);
    console.log(`[Force Reparse] 文件大小: ${file.size} bytes`);
    console.log(`[Force Reparse] 强制解析: ${forceReparse}`);
    console.log(`[Force Reparse] 清除缓存: ${clearCache}`);

    // 获取文件buffer
    const arrayBuffer = await file.arrayBuffer();

    // 计算文件哈希用于缓存检测
    const fileHash = await calculateFileHash(arrayBuffer);
    console.log(`[Force Reparse] 文件哈希: ${fileHash}`);

    // 验证文件格式
    const isValid = await WordProcessor.validateTemplate(arrayBuffer);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse('INVALID_TEMPLATE', '无效的Word文档格式'),
        { status: 400 }
      );
    }

    // 执行详细的文档分析
    const analysisResult = await performDetailedAnalysis(arrayBuffer, file.name);

    // 强制重新解析模板（绕过任何缓存）
    const documentTemplate = await WordProcessor.parseTemplate(arrayBuffer, file.name);

    console.log(`[Force Reparse] 解析完成，发现 ${documentTemplate.placeholders.length} 个占位符`);

    // 比较分析结果和解析结果
    const comparison = compareResults(analysisResult, documentTemplate.placeholders);

    return NextResponse.json(createSuccessResponse({
      placeholders: documentTemplate.placeholders,
      templateName: documentTemplate.templateName,
      templateSize: file.size,
      fileHash: fileHash,
      metadata: {
        ...documentTemplate.metadata,
        forceReparsed: true,
        analysisTimestamp: new Date().toISOString(),
        fileHash: fileHash
      },
      analysis: analysisResult,
      comparison: comparison,
      debugInfo: {
        originalFileName: file.name,
        processedAt: new Date().toISOString(),
        forceReparse: forceReparse,
        clearCache: clearCache
      }
    }));

  } catch (error) {
    console.error('[Force Reparse] 强制解析失败:', error);

    let errorMessage = '强制解析失败';
    if (error instanceof Error) {
      const message = error.message;
      if (message && !message.includes('<') && !message.includes('>') && message.length < 200) {
        errorMessage = `强制解析失败: ${message}`;
      }
    }

    return NextResponse.json(
      createErrorResponse('FORCE_PARSE_ERROR', errorMessage),
      { status: 500 }
    );
  }
}

/**
 * 计算文件哈希
 */
async function calculateFileHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 取前16位作为短哈希
}

/**
 * 执行详细的文档分析
 */
async function performDetailedAnalysis(arrayBuffer: ArrayBuffer, fileName: string) {
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(arrayBuffer);
    
    // 提取document.xml
    const documentXml = await zipContent.file('word/document.xml')?.async('text');
    
    if (!documentXml) {
      throw new Error('无法找到document.xml文件');
    }

    // 分析XML结构
    const analysis = {
      xmlLength: documentXml.length,
      textElements: extractTextElements(documentXml),
      rawPlaceholders: findRawPlaceholders(documentXml),
      fragmentedPlaceholders: findFragmentedPlaceholders(documentXml),
      documentStructure: analyzeDocumentStructure(documentXml),
      timestamp: new Date().toISOString()
    };

    console.log(`[Force Reparse] 详细分析完成:`, {
      xmlLength: analysis.xmlLength,
      textElementsCount: analysis.textElements.length,
      rawPlaceholdersCount: analysis.rawPlaceholders.length,
      fragmentedCount: analysis.fragmentedPlaceholders.length
    });

    return analysis;

  } catch (error) {
    console.error('[Force Reparse] 详细分析失败:', error);
    return {
      error: error instanceof Error ? error.message : '分析失败',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 提取所有文本元素
 */
function extractTextElements(xmlContent: string): string[] {
  const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  return textMatches.map(match => {
    const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    return textMatch ? textMatch[1] : '';
  }).filter(text => text.length > 0);
}

/**
 * 查找原始占位符
 */
function findRawPlaceholders(xmlContent: string): Array<{type: string, content: string}> {
  const placeholders: Array<{type: string, content: string}> = [];
  
  // 合并所有文本内容
  const textElements = extractTextElements(xmlContent);
  const allText = textElements.join(' ');
  
  // 查找不同格式的占位符
  const patterns = [
    { type: '双花括号', regex: /\{\{([^}]+)\}\}/g },
    { type: '单花括号', regex: /\{([^{}]+)\}/g },
    { type: '方括号', regex: /\[([^\]]+)\]/g },
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(allText)) !== null) {
      placeholders.push({
        type: pattern.type,
        content: match[1].trim()
      });
    }
  });
  
  return placeholders;
}

/**
 * 查找分割的占位符
 */
function findFragmentedPlaceholders(xmlContent: string): string[] {
  const fragmented: string[] = [];
  
  // 查找可能被分割的占位符模式
  const runPattern = /<w:r[^>]*>.*?<\/w:r>/g;
  const runs = xmlContent.match(runPattern) || [];
  
  // 检查连续的runs是否形成完整的占位符
  for (let i = 0; i < runs.length - 1; i++) {
    const currentRun = runs[i];
    const nextRuns = runs.slice(i + 1, Math.min(i + 5, runs.length)); // 检查接下来的4个runs
    
    const currentText = extractTextFromRun(currentRun);
    
    if (currentText.includes('{') && !currentText.includes('}')) {
      // 当前run包含开始括号但没有结束括号
      let combinedText = currentText;
      
      for (const nextRun of nextRuns) {
        const nextText = extractTextFromRun(nextRun);
        combinedText += nextText;
        
        if (nextText.includes('}')) {
          // 找到结束括号，检查是否形成完整占位符
          const placeholderMatch = combinedText.match(/\{([^{}]+)\}/);
          if (placeholderMatch) {
            fragmented.push(placeholderMatch[1].trim());
          }
          break;
        }
      }
    }
  }
  
  return Array.from(new Set(fragmented)); // 去重
}

/**
 * 从run中提取文本
 */
function extractTextFromRun(runXml: string): string {
  const textMatches = runXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  return textMatches.map(match => {
    const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    return textMatch ? textMatch[1] : '';
  }).join('');
}

/**
 * 分析文档结构
 */
function analyzeDocumentStructure(xmlContent: string) {
  return {
    paragraphCount: (xmlContent.match(/<w:p[^>]*>/g) || []).length,
    runCount: (xmlContent.match(/<w:r[^>]*>/g) || []).length,
    textElementCount: (xmlContent.match(/<w:t[^>]*>/g) || []).length,
    tableCount: (xmlContent.match(/<w:tbl[^>]*>/g) || []).length,
  };
}

/**
 * 比较分析结果和解析结果
 */
function compareResults(analysis: any, parsedPlaceholders: PlaceholderInfo[]) {
  const analysisPlaceholders = analysis.rawPlaceholders || [];
  const fragmentedPlaceholders = analysis.fragmentedPlaceholders || [];
  
  return {
    analysisFound: analysisPlaceholders.length,
    fragmentedFound: fragmentedPlaceholders.length,
    parserFound: parsedPlaceholders.length,
    totalExpected: analysisPlaceholders.length + fragmentedPlaceholders.length,
    matchRate: parsedPlaceholders.length / Math.max(1, analysisPlaceholders.length + fragmentedPlaceholders.length),
    missingPlaceholders: findMissingPlaceholders(analysisPlaceholders, fragmentedPlaceholders, parsedPlaceholders),
    extraPlaceholders: findExtraPlaceholders(analysisPlaceholders, fragmentedPlaceholders, parsedPlaceholders)
  };
}

/**
 * 查找缺失的占位符
 */
function findMissingPlaceholders(analysisPlaceholders: any[], fragmentedPlaceholders: string[], parsedPlaceholders: PlaceholderInfo[]): string[] {
  const allExpected = [
    ...analysisPlaceholders.map(p => p.content),
    ...fragmentedPlaceholders
  ];
  
  const parsedNames = parsedPlaceholders.map(p => p.name);
  
  return allExpected.filter(expected => !parsedNames.includes(expected));
}

/**
 * 查找额外的占位符
 */
function findExtraPlaceholders(analysisPlaceholders: any[], fragmentedPlaceholders: string[], parsedPlaceholders: PlaceholderInfo[]): string[] {
  const allExpected = [
    ...analysisPlaceholders.map(p => p.content),
    ...fragmentedPlaceholders
  ];
  
  return parsedPlaceholders
    .map(p => p.name)
    .filter(parsed => !allExpected.includes(parsed));
}
