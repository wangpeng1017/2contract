import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/utils';

/**
 * 用户登出
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      createSuccessResponse({ message: '登出成功' })
    );
    
    // 清除所有认证相关的cookie
    response.cookies.delete('user_info');
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('oauth_state');
    
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    
    // 即使出错也要清除cookie
    const response = NextResponse.json(
      createSuccessResponse({ message: '登出成功' })
    );
    
    response.cookies.delete('user_info');
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('oauth_state');
    
    return response;
  }
}
