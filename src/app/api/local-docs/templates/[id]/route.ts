import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';
import { TemplateManager } from '@/lib/template-manager';

/**
 * GET /api/local-docs/templates/[id]
 * 获取单个模板的详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    console.log(`[Template API] 获取模板详情: ${templateId}`);

    const template = TemplateManager.getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        createErrorResponse('TEMPLATE_NOT_FOUND', '模板不存在'),
        { status: 404 }
      );
    }

    console.log(`[Template API] 模板详情获取成功: ${template.metadata.name}`);

    return NextResponse.json(createSuccessResponse({
      metadata: template.metadata,
      placeholders: template.placeholders
    }));

  } catch (error) {
    console.error('[Template API] 获取模板详情失败:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_TEMPLATE_FAILED', '获取模板详情失败'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/local-docs/templates/[id]
 * 更新模板信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const placeholdersJson = formData.get('placeholders') as string;
    const templateFile = formData.get('template') as File | null;

    console.log(`[Template API] 更新模板: ${templateId}`);

    // 构建更新数据
    const updates: any = {};
    
    if (name) updates.name = name;
    if (description !== null) updates.description = description;
    if (category) updates.category = category;
    if (tags !== null) {
      updates.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    }

    // 解析占位符数据
    let placeholders;
    if (placeholdersJson) {
      try {
        placeholders = JSON.parse(placeholdersJson);
      } catch (error) {
        return NextResponse.json(
          createErrorResponse('INVALID_PLACEHOLDERS', '占位符数据格式错误'),
          { status: 400 }
        );
      }
    }

    // 获取新的模板文件数据
    let templateData;
    if (templateFile) {
      templateData = await templateFile.arrayBuffer();
    }

    // 更新模板
    const success = await TemplateManager.updateTemplate(
      templateId,
      updates,
      placeholders,
      templateData
    );

    if (!success) {
      return NextResponse.json(
        createErrorResponse('TEMPLATE_NOT_FOUND', '模板不存在'),
        { status: 404 }
      );
    }

    console.log(`[Template API] 模板更新成功: ${templateId}`);

    return NextResponse.json(createSuccessResponse({
      message: '模板更新成功'
    }));

  } catch (error) {
    console.error('[Template API] 更新模板失败:', error);
    return NextResponse.json(
      createErrorResponse('UPDATE_TEMPLATE_FAILED', '更新模板失败'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/local-docs/templates/[id]
 * 删除指定模板
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    console.log(`[Template API] 删除模板: ${templateId}`);

    const success = TemplateManager.deleteTemplate(templateId);

    if (!success) {
      return NextResponse.json(
        createErrorResponse('TEMPLATE_NOT_FOUND', '模板不存在'),
        { status: 404 }
      );
    }

    console.log(`[Template API] 模板删除成功: ${templateId}`);

    return NextResponse.json(createSuccessResponse({
      message: '模板删除成功'
    }));

  } catch (error) {
    console.error('[Template API] 删除模板失败:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_TEMPLATE_FAILED', '删除模板失败'),
      { status: 500 }
    );
  }
}
