import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

interface Placeholder {
  name: string;
  type: 'text' | 'date' | 'number' | 'email';
  required: boolean;
}

/**
 * 解析Word模板中的占位符
 * Phase 1 MVP实现：简单的占位符识别
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;

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

    console.log(`[Local Docs] 开始解析模板: ${file.name}, 大小: ${file.size} bytes`);

    // Phase 1 MVP: 模拟占位符解析
    // 在实际实现中，这里会使用python-docx或类似库来解析Word文档
    const placeholders = await parseTemplatePlaceholders(file);

    console.log(`[Local Docs] 解析完成，发现 ${placeholders.length} 个占位符`);

    return NextResponse.json(createSuccessResponse({
      placeholders,
      templateName: file.name,
      templateSize: file.size,
      parsedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('[Local Docs] 模板解析失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'PARSE_ERROR',
        `模板解析失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}

/**
 * 解析模板中的占位符
 * Phase 1 MVP实现：基于文件内容的简单解析
 */
async function parseTemplatePlaceholders(file: File): Promise<Placeholder[]> {
  try {
    // Phase 1 MVP: 简化实现
    // 实际实现需要使用专门的Word文档解析库
    
    // 读取文件内容（这里是简化的实现）
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 将二进制数据转换为字符串进行简单的占位符匹配
    // 注意：这是MVP的简化实现，实际应该使用专门的docx解析库
    const textContent = new TextDecoder('utf-8', { ignoreBOM: true }).decode(uint8Array);
    
    // 使用正则表达式查找占位符 {{变量名}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = placeholderRegex.exec(textContent)) !== null) {
      matches.push(match);
    }

    // 去重并创建占位符对象
    const uniquePlaceholders = new Set<string>();
    matches.forEach(match => {
      if (match[1]) {
        uniquePlaceholders.add(match[1].trim());
      }
    });

    // 转换为Placeholder对象数组
    const placeholders: Placeholder[] = Array.from(uniquePlaceholders).map(name => ({
      name,
      type: inferPlaceholderType(name),
      required: true // MVP阶段默认所有字段都是必填的
    }));

    // 如果没有找到占位符，返回一些示例占位符用于演示
    if (placeholders.length === 0) {
      console.log('[Local Docs] 未找到占位符，返回示例占位符');
      return [
        { name: '甲方公司名称', type: 'text', required: true },
        { name: '乙方公司名称', type: 'text', required: true },
        { name: '合同金额', type: 'number', required: true },
        { name: '签署日期', type: 'date', required: true },
        { name: '联系邮箱', type: 'email', required: false }
      ];
    }

    return placeholders;

  } catch (error) {
    console.error('[Local Docs] 占位符解析错误:', error);
    
    // 发生错误时返回默认占位符
    return [
      { name: '甲方公司名称', type: 'text', required: true },
      { name: '乙方公司名称', type: 'text', required: true },
      { name: '合同金额', type: 'number', required: true },
      { name: '签署日期', type: 'date', required: true }
    ];
  }
}

/**
 * 根据占位符名称推断数据类型
 */
function inferPlaceholderType(name: string): 'text' | 'date' | 'number' | 'email' {
  const lowerName = name.toLowerCase();
  
  // 日期类型
  if (lowerName.includes('日期') || lowerName.includes('时间') || 
      lowerName.includes('date') || lowerName.includes('time')) {
    return 'date';
  }
  
  // 数字类型
  if (lowerName.includes('金额') || lowerName.includes('价格') || 
      lowerName.includes('数量') || lowerName.includes('amount') || 
      lowerName.includes('price') || lowerName.includes('count')) {
    return 'number';
  }
  
  // 邮箱类型
  if (lowerName.includes('邮箱') || lowerName.includes('邮件') || 
      lowerName.includes('email') || lowerName.includes('mail')) {
    return 'email';
  }
  
  // 默认文本类型
  return 'text';
}

/**
 * 验证占位符数据
 */
function validatePlaceholder(placeholder: Placeholder): boolean {
  if (!placeholder.name || typeof placeholder.name !== 'string') {
    return false;
  }
  
  if (!['text', 'date', 'number', 'email'].includes(placeholder.type)) {
    return false;
  }
  
  if (typeof placeholder.required !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * 清理和标准化占位符名称
 */
function sanitizePlaceholderName(name: string): string {
  return name
    .trim()
    .replace(/[^\u4e00-\u9fff\w\s]/g, '') // 保留中文、字母、数字和空格
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
}
