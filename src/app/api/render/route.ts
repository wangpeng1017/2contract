import { NextRequest, NextResponse } from 'next/server';
import { createReport } from 'docx-templates';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 超时包装函数
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('文档处理超时，请检查模板大小'));
    }, timeoutMs);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export async function POST(request: NextRequest) {
  try {
    const { template, data } = await request.json();
    
    if (!template || !data) {
      return NextResponse.json(
        { error: "Missing 'template' or 'data' field" },
        { status: 400 }
      );
    }

    // 解码base64模板
    const templateBuffer = Buffer.from(template, 'base64');
    
    // 使用docx-templates渲染，添加超时保护
    const output = await withTimeout(
      createReport({
        template: templateBuffer,
        data: data,
        cmdDelimiter: ['{{', '}}'],
      }),
      25000 // 25秒超时
    );

    // 转换为base64
    const resultBase64 = Buffer.from(output).toString('base64');

    return NextResponse.json({
      file: resultBase64,
      filename: 'contract_filled.docx'
    });
    
  } catch (error: any) {
    console.error('Render API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
