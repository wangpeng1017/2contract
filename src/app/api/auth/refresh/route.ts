import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 刷新访问令牌
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        createErrorResponse('MISSING_REFRESH_TOKEN', '缺少刷新令牌'),
        { status: 401 }
      );
    }
    
    // 使用刷新令牌获取新的访问令牌
    const tokenResponse = await feishuClient.refreshAccessToken(refreshToken);
    
    // 获取用户信息（验证新令牌是否有效）
    const userInfo = await feishuClient.getUserInfo(tokenResponse.access_token);
    
    const response = NextResponse.json(
      createSuccessResponse({
        user: {
          sub: userInfo.sub,
          name: userInfo.name,
          picture: userInfo.picture,
          open_id: userInfo.open_id,
          union_id: userInfo.union_id,
        },
        token: {
          access_token: tokenResponse.access_token,
          expires_in: tokenResponse.expires_in,
        },
      })
    );
    
    // 更新访问令牌cookie
    response.cookies.set('access_token', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.expires_in,
    });
    
    // 如果有新的刷新令牌，也更新
    if (tokenResponse.refresh_token) {
      response.cookies.set('refresh_token', tokenResponse.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30, // 30天
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    
    return NextResponse.json(
      createErrorResponse('REFRESH_TOKEN_ERROR', '刷新令牌失败'),
      { status: 500 }
    );
  }
}
