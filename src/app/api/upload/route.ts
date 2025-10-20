import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { file } = await request.json();
    
    if (!file) {
      return NextResponse.json(
        { error: "Missing 'file' field" },
        { status: 400 }
      );
    }

    // 解码base64文件
    const buffer = Buffer.from(file, 'base64');
    
    // 使用mammoth提取文本
    const result = await mammoth.extractRawText({ buffer });
    const extractedText = result.value;

    return NextResponse.json({
      text: extractedText,
      original_file: file
    });
    
  } catch (error: any) {
    console.error('Upload API error:', error);
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
