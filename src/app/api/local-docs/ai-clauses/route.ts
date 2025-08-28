import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { GeminiClient, ClauseGenerationRequest } from '@/lib/ai/gemini-client';

/**
 * POST /api/local-docs/ai-clauses
 * 使用AI生成智能法律条款
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      requirement, 
      documentType, 
      context, 
      existingClauses, 
      legalJurisdiction, 
      companyInfo 
    } = body;

    // 验证必填字段
    if (!requirement || !documentType) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', '缺少必填字段：需求描述和文档类型'),
        { status: 400 }
      );
    }

    console.log(`[AI Clauses API] 开始生成智能条款: ${requirement.substring(0, 100)}...`);

    // 初始化Gemini客户端
    const geminiClient = new GeminiClient();
    
    if (!geminiClient.isAvailable()) {
      return NextResponse.json(
        createErrorResponse('AI_SERVICE_UNAVAILABLE', 'AI服务当前不可用，请稍后重试'),
        { status: 503 }
      );
    }

    // 构建条款生成请求
    const clauseRequest: ClauseGenerationRequest = {
      requirement,
      documentType,
      context,
      existingClauses,
      legalJurisdiction: legalJurisdiction || '中华人民共和国',
      companyInfo
    };

    // 调用AI进行条款生成
    const aiResponse = await geminiClient.generateClauses(clauseRequest);

    if (!aiResponse.success) {
      return NextResponse.json(
        createErrorResponse('AI_CLAUSE_GENERATION_FAILED', aiResponse.error || 'AI条款生成失败'),
        { status: 500 }
      );
    }

    console.log(`[AI Clauses API] 条款生成完成，生成了 ${aiResponse.data.clauses.length} 个条款`);

    return NextResponse.json(createSuccessResponse({
      clauses: aiResponse.data.clauses,
      warnings: aiResponse.data.warnings,
      recommendations: aiResponse.data.recommendations,
      processingTime: Date.now(),
      metadata: {
        documentType,
        legalJurisdiction: legalJurisdiction || '中华人民共和国',
        generatedAt: new Date().toISOString()
      }
    }));

  } catch (error) {
    console.error('[AI Clauses API] 智能条款生成失败:', error);
    
    let errorMessage = '智能条款生成失败';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'AI服务配置错误';
        statusCode = 503;
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'AI服务使用量超限，请稍后重试';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'AI服务响应超时，请重试';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      createErrorResponse('AI_CLAUSE_GENERATION_FAILED', errorMessage),
      { status: statusCode }
    );
  }
}

/**
 * GET /api/local-docs/ai-clauses/templates
 * 获取常用条款模板
 */
export async function GET(request: NextRequest) {
  try {
    // 预定义的常用条款模板
    const clauseTemplates = [
      {
        id: 'confidentiality',
        title: '保密条款',
        description: '保护商业机密和敏感信息',
        category: '保密协议',
        keywords: ['保密', '商业机密', '信息安全'],
        template: '甲乙双方应对在合作过程中获得的对方商业机密和敏感信息承担保密义务...'
      },
      {
        id: 'liability',
        title: '责任条款',
        description: '明确各方责任和义务',
        category: '责任义务',
        keywords: ['责任', '义务', '违约'],
        template: '各方应按照本协议约定履行各自义务，如因违约造成损失的...'
      },
      {
        id: 'termination',
        title: '终止条款',
        description: '合同终止的条件和程序',
        category: '合同终止',
        keywords: ['终止', '解除', '到期'],
        template: '本协议在以下情况下可以终止：1. 协议期满；2. 双方协商一致...'
      },
      {
        id: 'dispute_resolution',
        title: '争议解决条款',
        description: '争议处理和法律适用',
        category: '争议解决',
        keywords: ['争议', '仲裁', '诉讼'],
        template: '因本协议引起的争议，双方应首先通过友好协商解决...'
      },
      {
        id: 'intellectual_property',
        title: '知识产权条款',
        description: '知识产权归属和保护',
        category: '知识产权',
        keywords: ['知识产权', '专利', '版权'],
        template: '各方在合作过程中产生的知识产权归属按以下原则确定...'
      },
      {
        id: 'payment',
        title: '付款条款',
        description: '付款方式和时间安排',
        category: '付款结算',
        keywords: ['付款', '结算', '发票'],
        template: '乙方应按照以下方式和时间向甲方支付费用...'
      }
    ];

    return NextResponse.json(createSuccessResponse({
      templates: clauseTemplates,
      categories: [
        '保密协议',
        '责任义务', 
        '合同终止',
        '争议解决',
        '知识产权',
        '付款结算'
      ]
    }));

  } catch (error) {
    console.error('[AI Clauses API] 获取条款模板失败:', error);
    return NextResponse.json(
      createErrorResponse('TEMPLATE_FETCH_FAILED', '获取条款模板失败'),
      { status: 500 }
    );
  }
}
