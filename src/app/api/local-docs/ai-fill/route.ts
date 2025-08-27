import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { GeminiClient, FieldMappingRequest } from '@/lib/ai/gemini-client';

/**
 * POST /api/local-docs/ai-fill
 * 使用AI自然语言填充表单字段
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userInput, availableFields, context } = body;

    // 验证必填字段
    if (!userInput || !availableFields) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', '缺少必填字段'),
        { status: 400 }
      );
    }

    console.log(`[AI Fill API] 开始处理自然语言填充: ${userInput.substring(0, 100)}...`);

    // 初始化Gemini客户端
    const geminiClient = new GeminiClient();
    
    if (!geminiClient.isAvailable()) {
      return NextResponse.json(
        createErrorResponse('AI_SERVICE_UNAVAILABLE', 'AI服务当前不可用，请稍后重试或手动填写表单'),
        { status: 503 }
      );
    }

    // 构建字段映射请求
    const mappingRequest: FieldMappingRequest = {
      userInput,
      availableFields,
      context
    };

    // 调用AI进行字段映射
    const aiResponse = await geminiClient.extractFieldMappings(mappingRequest);

    if (!aiResponse.success) {
      return NextResponse.json(
        createErrorResponse('AI_PROCESSING_FAILED', aiResponse.error || 'AI处理失败'),
        { status: 500 }
      );
    }

    console.log(`[AI Fill API] AI填充完成，映射了 ${aiResponse.data.mappings.length} 个字段`);

    return NextResponse.json(createSuccessResponse({
      mappings: aiResponse.data.mappings,
      unmappedContent: aiResponse.data.unmappedContent,
      suggestions: aiResponse.data.suggestions,
      processingTime: Date.now()
    }));

  } catch (error) {
    console.error('[AI Fill API] AI填充失败:', error);
    
    let errorMessage = 'AI填充失败';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'AI服务配置错误';
        statusCode = 503;
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'AI服务使用量超限，请稍后重试';
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      createErrorResponse('AI_FILL_FAILED', errorMessage),
      { status: statusCode }
    );
  }
}

/**
 * GET /api/local-docs/ai-fill/status
 * 检查AI服务状态
 */
export async function GET(request: NextRequest) {
  try {
    const geminiClient = new GeminiClient();
    const isAvailable = geminiClient.isAvailable();
    
    return NextResponse.json(createSuccessResponse({
      available: isAvailable,
      service: 'Gemini AI',
      features: [
        'natural_language_filling',
        'field_mapping',
        'conversation_support'
      ],
      status: isAvailable ? 'online' : 'offline'
    }));

  } catch (error) {
    console.error('[AI Fill API] 状态检查失败:', error);
    return NextResponse.json(
      createErrorResponse('STATUS_CHECK_FAILED', '状态检查失败'),
      { status: 500 }
    );
  }
}
