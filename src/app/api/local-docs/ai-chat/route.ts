import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { GeminiClient } from '@/lib/ai/gemini-client';

/**
 * POST /api/local-docs/ai-chat
 * AI对话接口，支持多轮对话和上下文理解
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { messages, context, sessionId } = body;

    // 验证必填字段
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        createErrorResponse('INVALID_MESSAGES', '消息格式错误'),
        { status: 400 }
      );
    }

    // 验证消息格式
    const isValidMessages = messages.every(msg => 
      msg && typeof msg === 'object' && 
      ['user', 'assistant'].includes(msg.role) && 
      typeof msg.content === 'string'
    );

    if (!isValidMessages) {
      return NextResponse.json(
        createErrorResponse('INVALID_MESSAGE_FORMAT', '消息格式不正确'),
        { status: 400 }
      );
    }

    console.log(`[AI Chat API] 开始处理对话，会话ID: ${sessionId || 'anonymous'}`);

    // 初始化Gemini客户端
    const geminiClient = new GeminiClient();
    
    if (!geminiClient.isAvailable()) {
      return NextResponse.json(
        createErrorResponse('AI_SERVICE_UNAVAILABLE', 'AI服务当前不可用'),
        { status: 503 }
      );
    }

    // 调用AI进行对话
    const aiResponse = await geminiClient.chatCompletion(messages, context);

    if (!aiResponse.success) {
      return NextResponse.json(
        createErrorResponse('AI_CHAT_FAILED', aiResponse.error || 'AI对话失败'),
        { status: 500 }
      );
    }

    console.log(`[AI Chat API] 对话完成，会话ID: ${sessionId || 'anonymous'}`);

    return NextResponse.json(createSuccessResponse({
      message: {
        role: 'assistant',
        content: aiResponse.data.content,
        timestamp: new Date().toISOString()
      },
      sessionId: sessionId || `session_${Date.now()}`,
      usage: aiResponse.usage
    }));

  } catch (error) {
    console.error('[AI Chat API] 对话失败:', error);
    
    let errorMessage = 'AI对话失败';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'AI服务配置错误';
        statusCode = 503;
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'AI服务使用量超限，请稍后重试';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'AI响应超时，请重试';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      createErrorResponse('AI_CHAT_FAILED', errorMessage),
      { status: statusCode }
    );
  }
}
