import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const buffer = Buffer.from(template, 'base64');
    
    // 使用PizZip加载模板
    const zip = new PizZip(buffer);
    
    // 创建Docxtemplater实例
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 渲染模板
    doc.render(data);

    // 生成输出文件
    const output = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 转换为base64
    const resultBase64 = output.toString('base64');

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
