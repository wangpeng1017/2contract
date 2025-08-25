import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    const userInfoCookie = request.cookies.get('user_info')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', '未授权访问'),
        { status: 401 }
      );
    }
    
    // 验证访问令牌是否有效
    const isValid = await feishuClient.validateAccessToken(accessToken);
    
    if (!isValid) {
      // 令牌无效，尝试使用刷新令牌
      const refreshToken = request.cookies.get('refresh_token')?.value;
      
      if (!refreshToken) {
        return NextResponse.json(
          createErrorResponse('TOKEN_EXPIRED', '令牌已过期'),
          { status: 401 }
        );
      }
      
      try {
        // 刷新令牌
        const tokenResponse = await feishuClient.refreshAccessToken(refreshToken);
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
            isAuthenticated: true,
          })
        );
        
        // 更新cookie
        response.cookies.set('access_token', tokenResponse.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenResponse.expires_in,
        });
        
        response.cookies.set('user_info', JSON.stringify({
          sub: userInfo.sub,
          name: userInfo.name,
          picture: userInfo.picture,
          open_id: userInfo.open_id,
          union_id: userInfo.union_id,
        }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 86400,
        });
        
        return response;
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return NextResponse.json(
          createErrorResponse('TOKEN_REFRESH_FAILED', '令牌刷新失败'),
          { status: 401 }
        );
      }
    }
    
    // 令牌有效，返回用户信息
    if (userInfoCookie) {
      try {
        const userInfo = JSON.parse(userInfoCookie);
        return NextResponse.json(
          createSuccessResponse({
            user: userInfo,
            isAuthenticated: true,
          })
        );
      } catch (parseError) {
        console.error('Error parsing user info cookie:', parseError);
      }
    }
    
    // 如果cookie中没有用户信息，重新获取
    const userInfo = await feishuClient.getUserInfo(accessToken);
    
    const response = NextResponse.json(
      createSuccessResponse({
        user: {
          sub: userInfo.sub,
          name: userInfo.name,
          picture: userInfo.picture,
          open_id: userInfo.open_id,
          union_id: userInfo.union_id,
        },
        isAuthenticated: true,
      })
    );
    
    // 更新用户信息cookie
    response.cookies.set('user_info', JSON.stringify({
      sub: userInfo.sub,
      name: userInfo.name,
      picture: userInfo.picture,
      open_id: userInfo.open_id,
      union_id: userInfo.union_id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
    });
    
    return response;
  } catch (error) {
    console.error('Error getting user info:', error);
    
    return NextResponse.json(
      createErrorResponse('USER_INFO_ERROR', '获取用户信息失败'),
      { status: 500 }
    );
  }
}
