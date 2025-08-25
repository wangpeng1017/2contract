import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { geminiOCR } from '@/lib/gemini-ocr';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * OCR文字识别和信息提取
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const formData = await req.formData();
      const file = formData.get('image') as File;
      const extractStructured = formData.get('extractStructured') === 'true';
      const language = formData.get('language') as string || 'zh-CN';

      if (!file) {
        return NextResponse.json(
          createErrorResponse('MISSING_IMAGE', '缺少图片文件'),
          { status: 400 }
        );
      }

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          createErrorResponse('INVALID_FILE_TYPE', '文件类型必须是图片'),
          { status: 400 }
        );
      }

      // 验证文件大小（限制为10MB）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          createErrorResponse('FILE_TOO_LARGE', '文件大小不能超过10MB'),
          { status: 400 }
        );
      }

      try {
        let result;
        
        if (extractStructured) {
          // 结构化信息提取
          result = await geminiOCR.extractStructuredData(file, {
            language,
            maxRetries: 2,
            timeout: 30000
          });
        } else {
          // 基础文字识别
          result = await geminiOCR.extractText(file, {
            language,
            maxRetries: 2,
            timeout: 30000
          });
        }

        // 记录使用情况（用于成本控制）
        await recordOCRUsage(user.sub, file.size, result.processingTime);

        return NextResponse.json(
          createSuccessResponse({
            result,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              processingTime: result.processingTime,
              extractedStructured: extractStructured
            }
          })
        );

      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        
        // 根据错误类型返回不同的错误信息
        if (ocrError instanceof Error) {
          if (ocrError.message.includes('API key')) {
            return NextResponse.json(
              createErrorResponse('OCR_API_KEY_ERROR', 'OCR服务配置错误'),
              { status: 500 }
            );
          }
          
          if (ocrError.message.includes('quota') || ocrError.message.includes('limit')) {
            return NextResponse.json(
              createErrorResponse('OCR_QUOTA_EXCEEDED', 'OCR服务配额已用完'),
              { status: 429 }
            );
          }
        }

        return NextResponse.json(
          createErrorResponse('OCR_PROCESSING_ERROR', 'OCR处理失败，请重试'),
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Error in OCR extract API:', error);
      
      return NextResponse.json(
        createErrorResponse('API_ERROR', 'OCR API处理错误'),
        { status: 500 }
      );
    }
  });
}

/**
 * 记录OCR使用情况
 */
async function recordOCRUsage(userId: string, fileSize: number, processingTime: number): Promise<void> {
  try {
    // TODO: 实现使用情况记录到数据库
    // 这里可以记录：
    // - 用户ID
    // - 使用时间
    // - 文件大小
    // - 处理时间
    // - 成本估算
    
    console.log(`OCR usage recorded for user ${userId}: ${fileSize} bytes, ${processingTime}ms`);
  } catch (error) {
    console.error('Error recording OCR usage:', error);
    // 不抛出错误，避免影响主要功能
  }
}
