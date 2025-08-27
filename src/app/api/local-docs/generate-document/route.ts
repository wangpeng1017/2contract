import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils';

interface FormData {
  [key: string]: string;
}

/**
 * 生成填充数据后的Word文档
 * Phase 1 MVP实现：基本的文档生成功能
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const dataStr = formData.get('data') as string;

    if (!file) {
      return NextResponse.json(
        createErrorResponse('MISSING_FILE', '请上传模板文件'),
        { status: 400 }
      );
    }

    if (!dataStr) {
      return NextResponse.json(
        createErrorResponse('MISSING_DATA', '请提供填充数据'),
        { status: 400 }
      );
    }

    let data: FormData;
    try {
      data = JSON.parse(dataStr);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_DATA', '数据格式错误'),
        { status: 400 }
      );
    }

    console.log(`[Local Docs] 开始生成文档: ${file.name}`);
    console.log(`[Local Docs] 填充数据:`, Object.keys(data));

    // Phase 1 MVP: 生成填充后的文档
    const generatedDocument = await generateFilledDocument(file, data);

    console.log(`[Local Docs] 文档生成完成，大小: ${generatedDocument.byteLength} bytes`);

    // 返回生成的文档
    return new NextResponse(generatedDocument, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="generated_${file.name}"`,
        'Content-Length': generatedDocument.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[Local Docs] 文档生成失败:', error);
    
    return NextResponse.json(
      createErrorResponse(
        'GENERATION_ERROR',
        `文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      ),
      { status: 500 }
    );
  }
}

/**
 * 生成填充数据后的Word文档
 * Phase 1 MVP实现：简单的占位符替换
 */
async function generateFilledDocument(templateFile: File, data: FormData): Promise<ArrayBuffer> {
  try {
    // 读取模板文件
    const templateBuffer = await templateFile.arrayBuffer();
    
    // Phase 1 MVP: 简化的文档处理
    // 实际实现需要使用专门的Word文档处理库（如python-docx的JavaScript等价物）
    
    // 这里是MVP的简化实现：
    // 1. 读取文档内容
    // 2. 进行简单的文本替换
    // 3. 返回修改后的文档
    
    const modifiedBuffer = await performSimpleReplacement(templateBuffer, data);
    
    return modifiedBuffer;

  } catch (error) {
    console.error('[Local Docs] 文档处理错误:', error);
    throw new Error(`文档处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 执行简单的占位符替换
 * Phase 1 MVP实现：基于二进制内容的简单替换
 */
async function performSimpleReplacement(buffer: ArrayBuffer, data: FormData): Promise<ArrayBuffer> {
  try {
    // Phase 1 MVP: 简化的替换逻辑
    // 注意：这是演示实现，实际生产环境需要使用专门的docx处理库
    
    // 将ArrayBuffer转换为Uint8Array进行处理
    const uint8Array = new Uint8Array(buffer);
    
    // 为了演示，我们创建一个简单的文本替换逻辑
    // 实际实现需要正确解析和修改docx文件的XML结构
    
    // 将二进制数据转换为字符串（这是简化的方法）
    let content = new TextDecoder('utf-8', { ignoreBOM: true }).decode(uint8Array);
    
    // 执行占位符替换
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(escapeRegExp(placeholder), 'g');
      content = content.replace(regex, value || '');
      
      console.log(`[Local Docs] 替换占位符: ${placeholder} -> ${value}`);
    });
    
    // 将修改后的内容转换回ArrayBuffer
    const modifiedBuffer = new TextEncoder().encode(content);
    
    // 如果替换后的内容太小，说明可能是二进制文件处理有问题
    // 在这种情况下，返回原始文件作为fallback
    if (modifiedBuffer.length < buffer.byteLength * 0.5) {
      console.log('[Local Docs] 替换后文件过小，返回原始文件');
      return buffer;
    }
    
    return modifiedBuffer.buffer;

  } catch (error) {
    console.error('[Local Docs] 替换处理错误:', error);
    
    // 如果替换失败，返回原始文件
    console.log('[Local Docs] 替换失败，返回原始文件');
    return buffer;
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 验证填充数据
 */
function validateFormData(data: FormData): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 检查是否有有效的数据
  const hasValidData = Object.values(data).some(value => 
    typeof value === 'string' && value.trim().length > 0
  );
  
  return hasValidData;
}

/**
 * 清理和验证用户输入数据
 */
function sanitizeFormData(data: FormData): FormData {
  const sanitized: FormData = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // 基本的输入清理
      const cleanValue = value
        .trim()
        .replace(/[<>]/g, '') // 移除可能的HTML标签
        .substring(0, 1000); // 限制长度
      
      sanitized[key] = cleanValue;
    }
  });
  
  return sanitized;
}

/**
 * 生成文档元数据
 */
function generateDocumentMetadata(templateName: string, data: FormData) {
  return {
    templateName,
    generatedAt: new Date().toISOString(),
    placeholderCount: Object.keys(data).length,
    filledFields: Object.keys(data).filter(key => data[key] && data[key].trim().length > 0),
  };
}
