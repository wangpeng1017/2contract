import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 为API路由添加超时头
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // 设置超时相关头部
    response.headers.set('X-Timeout-Warning', '请求处理时间限制为30秒');
    response.headers.set('X-Max-Duration', '30');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
}