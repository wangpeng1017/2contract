import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { TemplateManager, TemplateSearchFilter } from '@/lib/template-manager';

/**
 * GET /api/local-docs/templates
 * 获取模板列表，支持搜索和过滤
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const filter: TemplateSearchFilter = {};
    
    if (searchParams.get('category')) {
      filter.category = searchParams.get('category')!;
    }
    
    if (searchParams.get('tags')) {
      filter.tags = searchParams.get('tags')!.split(',').map(tag => tag.trim());
    }
    
    if (searchParams.get('author')) {
      filter.author = searchParams.get('author')!;
    }
    
    if (searchParams.get('sortBy')) {
      filter.sortBy = searchParams.get('sortBy') as any;
    }
    
    if (searchParams.get('sortOrder')) {
      filter.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc';
    }
    
    if (searchParams.get('minRating')) {
      filter.minRating = parseFloat(searchParams.get('minRating')!);
    }

    console.log('[Templates API] 获取模板列表，过滤条件:', filter);

    // 搜索模板
    const templates = TemplateManager.searchTemplates(filter);
    
    // 只返回元数据，不包含模板文件数据
    const templateList = templates.map(template => ({
      metadata: template.metadata,
      placeholders: template.placeholders
    }));

    console.log(`[Templates API] 找到 ${templateList.length} 个模板`);

    return NextResponse.json(createSuccessResponse({
      templates: templateList,
      total: templateList.length
    }));

  } catch (error) {
    console.error('[Templates API] 获取模板列表失败:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_TEMPLATES_FAILED', '获取模板列表失败'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/local-docs/templates
 * 保存新模板
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const author = formData.get('author') as string;
    const placeholdersJson = formData.get('placeholders') as string;
    const templateFile = formData.get('template') as File;

    // 验证必填字段
    if (!name || !category || !templateFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', '缺少必填字段'),
        { status: 400 }
      );
    }

    // 解析占位符数据
    let placeholders;
    try {
      placeholders = JSON.parse(placeholdersJson);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('INVALID_PLACEHOLDERS', '占位符数据格式错误'),
        { status: 400 }
      );
    }

    // 获取模板文件数据
    const templateData = await templateFile.arrayBuffer();

    // 解析标签
    const tagList = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    console.log(`[Templates API] 保存模板: ${name}`);

    // 保存模板
    const templateId = await TemplateManager.saveTemplate(
      name,
      description || '',
      category,
      tagList,
      placeholders,
      templateData,
      author || undefined
    );

    console.log(`[Templates API] 模板保存成功，ID: ${templateId}`);

    return NextResponse.json(createSuccessResponse({
      templateId,
      message: '模板保存成功'
    }));

  } catch (error) {
    console.error('[Templates API] 保存模板失败:', error);
    return NextResponse.json(
      createErrorResponse('SAVE_TEMPLATE_FAILED', '保存模板失败'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/local-docs/templates
 * 删除模板
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        createErrorResponse('MISSING_TEMPLATE_ID', '缺少模板ID'),
        { status: 400 }
      );
    }

    console.log(`[Templates API] 删除模板: ${templateId}`);

    const success = TemplateManager.deleteTemplate(templateId);

    if (!success) {
      return NextResponse.json(
        createErrorResponse('TEMPLATE_NOT_FOUND', '模板不存在'),
        { status: 404 }
      );
    }

    console.log(`[Templates API] 模板删除成功: ${templateId}`);

    return NextResponse.json(createSuccessResponse({
      message: '模板删除成功'
    }));

  } catch (error) {
    console.error('[Templates API] 删除模板失败:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_TEMPLATE_FAILED', '删除模板失败'),
      { status: 500 }
    );
  }
}
