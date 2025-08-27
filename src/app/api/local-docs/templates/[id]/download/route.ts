import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils';
import { TemplateManager } from '@/lib/template-manager';

/**
 * GET /api/local-docs/templates/[id]/download
 * 下载模板文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    console.log(`[Template Download API] 下载模板: ${templateId}`);

    const template = TemplateManager.getTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        createErrorResponse('TEMPLATE_NOT_FOUND', '模板不存在'),
        { status: 404 }
      );
    }

    // 记录下载统计
    TemplateManager.recordTemplateUsage(templateId, 0, true);

    console.log(`[Template Download API] 模板下载成功: ${template.metadata.name}`);

    // 返回模板文件
    return new NextResponse(template.templateData, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(template.metadata.name)}.docx"`,
        'Content-Length': template.templateData.byteLength.toString(),
        'X-Template-Id': templateId,
        'X-Template-Name': template.metadata.name,
        'X-Template-Version': template.metadata.version,
      },
    });

  } catch (error) {
    console.error('[Template Download API] 下载模板失败:', error);
    return NextResponse.json(
      createErrorResponse('DOWNLOAD_TEMPLATE_FAILED', '下载模板失败'),
      { status: 500 }
    );
  }
}
