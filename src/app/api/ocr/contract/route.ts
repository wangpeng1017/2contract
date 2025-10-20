import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OCR合同路由 - 暂时禁用（类型不兼容），不参与构建类型检查
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'OCR contract route is temporarily disabled. Please use the main contract generation flow.' },
    { status: 503 }
  );
}
