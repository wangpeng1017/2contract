import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { TemplateManager } from '@/lib/template-manager';

/**
 * GET /api/local-docs/categories
 * 获取所有模板分类
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Categories API] 获取模板分类列表');

    const categories = TemplateManager.getCategories();

    console.log(`[Categories API] 找到 ${categories.length} 个分类`);

    return NextResponse.json(createSuccessResponse({
      categories
    }));

  } catch (error) {
    console.error('[Categories API] 获取分类列表失败:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_CATEGORIES_FAILED', '获取分类列表失败'),
      { status: 500 }
    );
  }
}
