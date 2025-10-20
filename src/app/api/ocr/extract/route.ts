import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { geminiOCR } from '@/lib/gemini-ocr';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * OCR文字识别和信息提取
 */
export async function POST(request: NextRequest) {
  // 检查是否为测试模式（开发环境允许无认证测试）
  const isTestMode = process.env.NODE_ENV === 'development';

  if (isTestMode) {
    return handleOCRRequest(request, { sub: 'test-user' });
  }

  return withAuth(request, async (req, user) => {
    return handleOCRRequest(req, user);
  });
}

async function handleOCRRequest(req: NextRequest, user: any) {
    try {
      console.log('[OCR Extract] 开始处理OCR请求...');

      const formData = await req.formData();
      const file = formData.get('image') as File;
      const extractStructured = formData.get('extractStructured') === 'true';
      const language = formData.get('language') as string || 'zh-CN';

      console.log('[OCR Extract] 请求参数:', {
        hasFile: !!file,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        extractStructured,
        language,
        userId: user?.sub,
      });

      if (!file) {
        console.error('[OCR Extract] 缺少图片文件');
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
        console.log('[OCR Extract] 开始OCR处理...');

        // 将文件转换为base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        let result;

        if (extractStructured) {
          console.log('[OCR Extract] 执行结构化信息提取...');
          // 结构化信息提取 - 使用 Gemini AI（返回文本与置信度）
          result = await geminiOCR.extractText(base64Data, { language });

          // 为了保持兼容性，添加structuredData字段
          (result as any).structuredData = {
            extractedText: result.text,
            confidence: result.confidence
          };
        } else {
          console.log('[OCR Extract] 执行基础文字识别...');
          // 基础文字识别 - 使用 Gemini AI
          result = await geminiOCR.extractText(base64Data, { language });
        }

        console.log('[OCR Extract] OCR处理完成:', {
          textLength: result.text?.length || 0,
          confidence: result.confidence,
          processingTime: result.processingTime,
          hasStructuredData: !!(result as any).structuredData,
        });

        // 记录使用情况（用于成本控制）
        if (user.sub !== 'test-user') {
          await recordOCRUsage(user.sub, file.size, result.processingTime);
        }

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
        console.error('[OCR Extract] OCR处理错误:', ocrError);

        // 详细的错误信息
        const errorMessage = ocrError instanceof Error ? ocrError.message : 'Unknown error';
        const errorStack = ocrError instanceof Error ? ocrError.stack : undefined;

        console.error('[OCR Extract] 错误详情:', {
          message: errorMessage,
          stack: errorStack,
          type: typeof ocrError,
          fileName: file.name,
          fileSize: file.size,
          userId: user.sub,
        });

        // 根据错误类型返回不同的错误信息
        if (ocrError instanceof Error) {
          if (ocrError.message.includes('API key') || ocrError.message.includes('Gemini') || ocrError.message.includes('智谱AI')) {
            return NextResponse.json(
              createErrorResponse('OCR_API_KEY_ERROR', 'OCR服务配置错误，请检查 Gemini API 密钥配置'),
              { status: 500 }
            );
          }

          if (ocrError.message.includes('quota') || ocrError.message.includes('limit')) {
            return NextResponse.json(
              createErrorResponse('OCR_QUOTA_EXCEEDED', 'OCR服务配额已用完，请稍后重试'),
              { status: 429 }
            );
          }

          if (ocrError.message.includes('timeout')) {
            return NextResponse.json(
              createErrorResponse('OCR_TIMEOUT_ERROR', 'OCR处理超时，请重试或使用更小的图片'),
              { status: 408 }
            );
          }
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'OCR_PROCESSING_ERROR',
              message: 'OCR处理失败，请重试',
              details: errorMessage,
              debug: process.env.NODE_ENV === 'development' ? {
                stack: errorStack,
                type: typeof ocrError,
              } : undefined,
            },
          },
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
